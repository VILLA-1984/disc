import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export class ErroAgente extends Error {
    constructor(public status: number, mensagem: string) { super(mensagem); }
}

type Configuracao = { base: string; segredo: string; sessao: Buffer; chaves: Record<string, string>; limite: number };
type Sessao = { projeto: string; conversa: string; usuario: string; token: string; expira: number; watermark?: string };
type Atividade = { id?: string; type?: string; text?: string; from?: { id?: string; role?: string }; attachments?: unknown[] };
export type MensagemAgente = { id: string; texto: string; anexos: unknown[] };

export function configuracaoAgente(): Configuracao {
    try {
        const segredo = process.env.COPILOT_DIRECT_LINE_SECRET?.trim() ?? '';
        const sessao = process.env.COPILOT_SESSAO_SEGREDO ?? '';
        const chaves: unknown = JSON.parse(process.env.AGENTE_CHAVES ?? '{}');
        const base = (process.env.COPILOT_DIRECT_LINE_URL ?? 'https://directline.botframework.com/v3/directline').replace(/\/$/, '');
        const url = new URL(base);
        const limite = Number(process.env.AGENTE_LIMITE_MINUTO ?? 60);
        if (!segredo || !/^[a-f0-9]{64}$/i.test(sessao)
            || !chaves || typeof chaves !== 'object' || Array.isArray(chaves)
            || !Object.keys(chaves).length || Object.entries(chaves).some(([id, chave]) =>
                !/^[a-zA-Z0-9_-]{1,64}$/.test(id) || typeof chave !== 'string' || !/^[a-zA-Z0-9_-]{32,512}$/.test(chave))
            || new Set(Object.values(chaves)).size !== Object.values(chaves).length
            || url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash
            || !/^(?:[a-z0-9-]+\.)?directline\.botframework\.com$/.test(url.hostname)
            || url.pathname !== '/v3/directline' || !Number.isInteger(limite) || limite < 1 || limite > 1000) {
            throw new Error('Configuracao invalida');
        }
        return { base, segredo, sessao: Buffer.from(sessao, 'hex'), chaves: chaves as Record<string, string>, limite };
    } catch {
        throw new ErroAgente(503, 'A integracao do agente nao esta configurada no servidor.');
    }
}

export function autenticarProjeto(request: Request, config: Configuracao): string {
    const authorization = request.headers.get('authorization') ?? '';
    const match = /^Bearer ([^\s]{32,512})$/.exec(authorization);
    const recebido = createHash('sha256').update(match?.[1] ?? '').digest();
    let projeto: string | undefined;
    for (const [id, chave] of Object.entries(config.chaves)) {
        if (timingSafeEqual(recebido, createHash('sha256').update(chave).digest()) && match) projeto = id;
    }
    if (!projeto) throw new ErroAgente(401, 'Chave de API ausente ou invalida.');
    return projeto;
}

// O cliente recebe apenas uma sessao opaca: o token da Microsoft permanece criptografado.
function selar(sessao: Sessao, config: Configuracao): string {
    const iv = randomBytes(12);
    const cifra = createCipheriv('aes-256-gcm', config.sessao, iv);
    cifra.setAAD(Buffer.from('copilot-sessao-v1'));
    const conteudo = Buffer.concat([cifra.update(JSON.stringify(sessao), 'utf8'), cifra.final()]);
    return Buffer.concat([iv, cifra.getAuthTag(), conteudo]).toString('base64url');
}

function abrirSessao(valor: unknown, projeto: string, config: Configuracao): Sessao {
    try {
        if (typeof valor !== 'string' || valor.length < 40 || valor.length > 8192 || !/^[\w-]+$/.test(valor)) throw new Error();
        const bytes = Buffer.from(valor, 'base64url');
        const cifra = createDecipheriv('aes-256-gcm', config.sessao, bytes.subarray(0, 12));
        cifra.setAAD(Buffer.from('copilot-sessao-v1'));
        cifra.setAuthTag(bytes.subarray(12, 28));
        const sessao = JSON.parse(Buffer.concat([cifra.update(bytes.subarray(28)), cifra.final()]).toString('utf8')) as Sessao;
        if (sessao.projeto !== projeto || typeof sessao.conversa !== 'string' || typeof sessao.usuario !== 'string'
            || typeof sessao.token !== 'string' || !Number.isFinite(sessao.expira)
            || (sessao.watermark !== undefined && typeof sessao.watermark !== 'string')) throw new Error();
        if (sessao.expira <= Date.now()) throw new ErroAgente(410, 'Sessao expirada. Inicie uma nova conversa.');
        return sessao;
    } catch (erro) {
        if (erro instanceof ErroAgente) throw erro;
        throw new ErroAgente(400, 'Sessao invalida ou pertencente a outro projeto.');
    }
}

async function directLine<T>(config: Configuracao, caminho: string, token: string, method = 'GET', body?: unknown): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`${config.base}${caminho}`, {
            method, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000),
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
    } catch {
        throw new ErroAgente(502, 'Nao foi possivel confirmar a operacao no Copilot Studio.');
    }
    if (!response.ok) {
        if (response.status === 429) throw new ErroAgente(503, 'O Copilot Studio atingiu seu limite de uso. Tente mais tarde.');
        throw new ErroAgente(502, 'O Copilot Studio recusou a operacao. Confira publicacao, capacidade e credenciais.');
    }
    try { return await response.json() as T; }
    catch { throw new ErroAgente(502, 'O Copilot Studio retornou uma resposta inesperada.'); }
}

type Conversa = { conversationId: string; token: string; expires_in: number };
function atualizarToken(sessao: Sessao, dados: Conversa) {
    if (typeof dados.token !== 'string' || !dados.token || !Number.isFinite(dados.expires_in) || dados.expires_in <= 30) {
        throw new ErroAgente(502, 'O Copilot Studio nao retornou uma sessao valida.');
    }
    sessao.token = dados.token;
    sessao.expira = Date.now() + (dados.expires_in - 30) * 1000;
}

async function recuperar(valor: unknown, projeto: string, config: Configuracao): Promise<Sessao> {
    const sessao = abrirSessao(valor, projeto, config);
    if (sessao.expira - Date.now() < 300_000) {
        atualizarToken(sessao, await directLine<Conversa>(config, '/tokens/refresh', sessao.token, 'POST'));
    }
    return sessao;
}

export async function enviarMensagem(config: Configuracao, projeto: string, mensagem: string, valorSessao?: unknown) {
    let sessao: Sessao;
    if (valorSessao === undefined) {
        const conversa = await directLine<Conversa>(config, '/conversations', config.segredo, 'POST');
        if (typeof conversa.conversationId !== 'string' || !conversa.conversationId) throw new ErroAgente(502, 'Conversa nao iniciada.');
        sessao = { projeto, conversa: conversa.conversationId, usuario: `dl_${randomUUID()}`, token: '', expira: 0 };
        atualizarToken(sessao, conversa);
    } else {
        sessao = await recuperar(valorSessao, projeto, config);
    }
    // Nenhum retry automatico: repetir este POST pode gerar duas mensagens e duas cobrancas.
    const enviada = await directLine<{ id: string }>(config, `/conversations/${encodeURIComponent(sessao.conversa)}/activities`, sessao.token, 'POST', {
        type: 'message', from: { id: sessao.usuario }, text: mensagem, locale: 'pt-BR', textFormat: 'plain',
    });
    if (typeof enviada.id !== 'string') throw new ErroAgente(502, 'Envio sem confirmacao. Nao reenvie automaticamente.');
    return { estado: 'aguardando', envioId: enviada.id, sessao: selar(sessao, config), consultarAposSegundos: 2 };
}

export async function receberMensagens(config: Configuracao, projeto: string, valorSessao: unknown) {
    const sessao = await recuperar(valorSessao, projeto, config);
    const query = sessao.watermark === undefined ? '' : `?watermark=${encodeURIComponent(sessao.watermark)}`;
    const dados = await directLine<{ activities: Atividade[]; watermark?: string | null }>(config,
        `/conversations/${encodeURIComponent(sessao.conversa)}/activities${query}`, sessao.token);
    if (!Array.isArray(dados.activities)) throw new ErroAgente(502, 'Formato de atividades inesperado.');
    const mensagens: MensagemAgente[] = dados.activities
        .filter((a) => a.type === 'message' && a.from?.id && a.from.id !== sessao.usuario && a.from.role !== 'user')
        .map((a) => ({ id: a.id ?? '', texto: typeof a.text === 'string' ? a.text : '', anexos: a.attachments ?? [] }))
        .filter((a) => a.texto || a.anexos.length);
    if (typeof dados.watermark === 'string') sessao.watermark = dados.watermark;
    return {
        estado: mensagens.length ? 'mensagens_recebidas' : 'aguardando',
        resposta: mensagens.map((m) => m.texto).filter(Boolean).join('\n\n'), mensagens,
        sessao: selar(sessao, config), consultarAposSegundos: 2,
    };
}
