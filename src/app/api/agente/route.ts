import { autenticarProjeto, configuracaoAgente, enviarMensagem, ErroAgente, receberMensagens } from '@/server/copilot';
import { reservarUsoAgente } from '@/server/db';

export const maxDuration = 60;
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

async function autorizar(request: Request) {
    const config = configuracaoAgente();
    const projeto = autenticarProjeto(request, config);
    if (!await reservarUsoAgente(projeto, config.limite)) {
        throw new ErroAgente(429, 'Limite por projeto atingido. Aguarde a proxima janela de um minuto.');
    }
    return { config, projeto };
}

function falha(erro: unknown) {
    const status = erro instanceof ErroAgente ? erro.status : 503;
    const mensagem = erro instanceof ErroAgente ? erro.message : 'A integracao esta temporariamente indisponivel.';
    return Response.json({ erro: mensagem }, { status, headers: {
        ...headers, ...(status === 429 ? { 'Retry-After': String(60 - Math.floor(Date.now() / 1000) % 60) } : {}),
    } });
}

async function corpoLimitado(request: Request): Promise<Record<string, unknown>> {
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        throw new ErroAgente(415, 'Use Content-Type: application/json.');
    }
    const reader = request.body?.getReader();
    if (!reader) throw new ErroAgente(400, 'Informe um objeto JSON.');
    let tamanho = 0;
    const blocos: Uint8Array[] = [];
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            tamanho += value.byteLength;
            if (tamanho > 65_536) { await reader.cancel(); throw new ErroAgente(413, 'Corpo excede 64 KiB.'); }
            blocos.push(value);
        }
        const corpo: unknown = JSON.parse(Buffer.concat(blocos).toString('utf8'));
        if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) throw new Error();
        return corpo as Record<string, unknown>;
    } catch (erro) {
        if (erro instanceof ErroAgente) throw erro;
        throw new ErroAgente(400, 'Informe um objeto JSON valido.');
    } finally { reader.releaseLock(); }
}

/** Envia uma mensagem. O recebimento e assincrono para nao perder respostas demoradas. */
export async function POST(request: Request) {
    try {
        const { config, projeto } = await autorizar(request);
        const corpo = await corpoLimitado(request);
        if (typeof corpo.mensagem !== 'string' || !corpo.mensagem.trim() || corpo.mensagem.length > 8000) {
            throw new ErroAgente(422, 'Informe mensagem com 1 a 8000 caracteres.');
        }
        const resultado = await enviarMensagem(config, projeto, corpo.mensagem.trim(), corpo.sessao);
        return Response.json(resultado, { status: 202, headers: { ...headers, 'Retry-After': '2' } });
    } catch (erro) { return falha(erro); }
}

/** A sessao vai no cabecalho para nao aparecer em URLs e logs de acesso. */
export async function GET(request: Request) {
    try {
        const { config, projeto } = await autorizar(request);
        const resultado = await receberMensagens(config, projeto, request.headers.get('x-agente-sessao'));
        const status = resultado.mensagens.length ? 200 : 202;
        return Response.json(resultado, { status, headers: { ...headers, 'Retry-After': '2' } });
    } catch (erro) { return falha(erro); }
}
