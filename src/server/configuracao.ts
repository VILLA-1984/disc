import { AVATARES } from '../jogo/avatars.js';
import { CENARIOS, MEIOS } from '../jogo/cenarios.js';
import { LIMITES, TEXTOS, definicaoDoTexto, type ChaveTexto, type Configuracao, type TextoPersonalizado } from '../lib/configuracao';
import { gravarConfiguracao, lerConfiguracao } from './db';

/**
 * Configuracao do jogo editada na area de gerenciamento: carregar, validar e salvar. Fica no mesmo banco dos cadastros
 * (SQLite local ou Turso), numa linha so, e nunca contem dados pessoais.
 */

const CHAVE = 'jogo';

export type Catalogo = {
    avatares: { id: string; nome: string; mobilidade: string; grupo: string | null; retrato: string | null; rotulo: string | null }[];
    cenarios: { chave: string; nome: string; descricao: string; temMeios: boolean; avatares: string[] }[];
    meios: { chave: string; cenario: string; nome: string; descricao: string; avatares: string[] }[];
};

const ID_AVATARES = AVATARES.map((a) => a.id);
const CHAVES_CENARIOS = Object.keys(CENARIOS);
const CHAVES_MEIOS = Object.keys(MEIOS);
const mobilidadeDe = (id: string) => AVATARES.find((a) => a.id === id)?.mobilidade ?? 'anda';

/** Avatares (ids) que um cenario ou meio aceita, pela mobilidade de cada um. */
const compativeis = (aceita: (mobilidade: string) => boolean) => ID_AVATARES.filter((id) => aceita(mobilidadeDe(id)));

/** Tudo o que existe no jogo, para a tela de gerenciamento listar e avisar de combinacoes impossiveis. */
export function montarCatalogo(): Catalogo {
    return {
        avatares: AVATARES.map((a) => ({ id: a.id, nome: a.nome, mobilidade: a.mobilidade ?? 'anda', grupo: (a.grupo as string | undefined) ?? null, retrato: (a.retrato as string | undefined) ?? null, rotulo: (a.rotulo as string | undefined) ?? null })),
        cenarios: CHAVES_CENARIOS.map((chave) => ({
            chave,
            nome: CENARIOS[chave].nome,
            descricao: CENARIOS[chave].descricao,
            temMeios: CHAVES_MEIOS.some((m) => MEIOS[m].cenario === chave),
            avatares: compativeis(CENARIOS[chave].aceita),
        })),
        meios: CHAVES_MEIOS.map((chave) => ({
            chave,
            cenario: MEIOS[chave].cenario,
            nome: MEIOS[chave].nome,
            descricao: MEIOS[chave].descricao,
            avatares: compativeis(MEIOS[chave].aceita),
        })),
    };
}

/**
 * Avatares liberados na configuracao de fabrica: os de formas simples e o bloco Cartun inteiro (com a cadeira de rodas).
 * O humano 3D (Ana) fica de fora; quem quiser o marca no painel.
 */
const AVATARES_DE_FABRICA = [
    'ana',
    'bruno',
    'carla',
    'davi',
    'elisa',
    'fatima',
    'gabriel',
    'haru',
    'iara',
    'joao',
    'rafa',
    'beto',
    'lucio',
    'maya',
    'nair',
    'cartun-mari',
    'cartun-bia',
    'cartun-clara',
    'cartun-dora',
    'cartun-eva',
    'cartun-fabi',
    'cartun-nando',
    'cartun-caio',
    'cartun-dario',
    'cartun-eder',
    'cartun-gil',
    'cartun-hugo',
    'cartun-fabi-cadeira',
];

/** Nomes trocados na configuracao de fabrica (id -> nome na escolha de avatar). */
const NOMES_DE_FABRICA: Record<string, string> = { 'cartun-eva': 'Leidy' };

/**
 * Configuracao de fabrica ("Voltar ao padrao"): copia da configuracao que a equipe deixou aplicada em 03/11/2026 -
 * 15 palavras por etapa, duas palavras por portao, turbo 2,5, animais na corrida ligados (a cada 3 palavras, 4,5 s na tela),
 * todos os cenarios e meios, os avatares acima e o texto da tela inicial ajustado (em TEXTOS).
 */
export function configuracaoPadrao(): Configuracao {
    const doAmbiente = Number(process.env.RUA_ESCOLHER);
    const palavras = Number.isInteger(doAmbiente) && doAmbiente >= LIMITES.palavrasMin && doAmbiente <= LIMITES.palavrasMax
        ? doAmbiente
        : LIMITES.palavrasPadrao;

    return {
        avatares: ID_AVATARES.filter((id) => AVATARES_DE_FABRICA.includes(id)),
        nomesAvatares: { ...NOMES_DE_FABRICA },
        cenarios: [...CHAVES_CENARIOS],
        meios: [...CHAVES_MEIOS],
        mostrarTotais: true,
        mostrarRanking: true,
        mostrarTotaisInicio: true,
        mostrarMinimapa: true,
        mostrarProgresso: true,
        modoPlacas: process.env.RUA_MODO === 'ciclo' ? 'ciclo' : 'pares',
        palavrasPorEtapa: palavras,
        turboForca: LIMITES.turboPadrao,
        animaisNaCorrida: true,
        animaisACada: LIMITES.animaisACadaPadrao,
        animaisDuracao: LIMITES.animaisDuracaoPadrao,
        demoInicial: false,
        reacoes: true,
        textos: {},
    };
}

/** Mantem so os ids conhecidos, sem repetir e na ordem do catalogo. */
function filtrar(valor: unknown, conhecidos: string[]): string[] {
    const escolhidos = new Set(Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : []);

    return conhecidos.filter((id) => escolhidos.has(id));
}

function booleano(valor: unknown, padrao: boolean): boolean {
    return typeof valor === 'boolean' ? valor : padrao;
}

export type Validacao = { ok: true; config: Configuracao } | { ok: false; erro: string };

/** Confere e normaliza uma configuracao vinda da tela (ou do banco). Devolve a mensagem do primeiro problema. */
export function validar(entrada: unknown): Validacao {
    if (typeof entrada !== 'object' || entrada === null) {
        return { ok: false, erro: 'Configuração em formato inválido.' };
    }

    const bruta = entrada as Record<string, unknown>;
    const padrao = configuracaoPadrao();
    const avatares = filtrar(bruta.avatares, ID_AVATARES);
    const cenarios = filtrar(bruta.cenarios, CHAVES_CENARIOS);
    const nomesAvatares: Record<string, string> = {};

    if (typeof bruta.nomesAvatares === 'object' && bruta.nomesAvatares !== null) {
        for (const [id, valor] of Object.entries(bruta.nomesAvatares as Record<string, unknown>)) {
            const nome = typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim().slice(0, LIMITES.nomeAvatarMax) : '';

            if (ID_AVATARES.includes(id) && nome !== '') {
                nomesAvatares[id] = nome;
            }
        }
    }
    const meios = filtrar(bruta.meios, CHAVES_MEIOS);

    if (avatares.length === 0) {
        return { ok: false, erro: 'Libere pelo menos um avatar.' };
    }

    if (cenarios.length === 0) {
        return { ok: false, erro: 'Libere pelo menos um cenário.' };
    }

    for (const chave of cenarios) {
        const meiosDoCenario = CHAVES_MEIOS.filter((m) => MEIOS[m].cenario === chave);

        if (meiosDoCenario.length === 0) {
            if (!avatares.some((id) => CENARIOS[chave].aceita(mobilidadeDe(id)))) {
                return { ok: false, erro: `O cenário "${CENARIOS[chave].nome}" não tem nenhum avatar liberado que possa ir nele.` };
            }

            continue;
        }

        const liberados = meiosDoCenario.filter((m) => meios.includes(m));

        if (liberados.length === 0) {
            return { ok: false, erro: `O cenário "${CENARIOS[chave].nome}" não tem nenhum meio liberado. Libere um meio ou desmarque o cenário.` };
        }

        for (const m of liberados) {
            if (!avatares.some((id) => MEIOS[m].aceita(mobilidadeDe(id)))) {
                return {
                    ok: false,
                    erro: `O meio "${MEIOS[m].nome}" (cenário ${CENARIOS[chave].nome}) não tem nenhum avatar liberado que possa usá-lo. Libere um avatar compatível ou desmarque o meio.`,
                };
            }
        }
    }

    // Sem o campo (configuracao salva antes desta opcao existir), vale o modo de fabrica.
    const modoPlacas = bruta.modoPlacas === undefined ? padrao.modoPlacas : bruta.modoPlacas;

    if (modoPlacas !== 'ciclo' && modoPlacas !== 'pares') {
        return { ok: false, erro: 'Placas dos portões: escolha uma palavra com "Deixar passar" ou duas palavras.' };
    }

    const palavras = bruta.palavrasPorEtapa;
    const maximo = modoPlacas === 'pares' ? LIMITES.portoesMax : LIMITES.palavrasMax;

    if (typeof palavras !== 'number' || !Number.isInteger(palavras) || palavras < LIMITES.palavrasMin || palavras > maximo) {
        return {
            ok: false,
            erro: modoPlacas === 'pares'
                ? `Portões por etapa: informe um número inteiro entre ${LIMITES.palavrasMin} e ${LIMITES.portoesMax}.`
                : `Palavras por etapa: informe um número inteiro entre ${LIMITES.palavrasMin} e ${LIMITES.palavrasMax}.`,
        };
    }

    // Sem o campo (configuracao salva antes desta opcao existir), vale o de fabrica.
    const turboBruto = bruta.turboForca === undefined ? padrao.turboForca : bruta.turboForca;

    if (typeof turboBruto !== 'number' || !Number.isFinite(turboBruto) || turboBruto < LIMITES.turboMin || turboBruto > LIMITES.turboMax) {
        return { ok: false, erro: `Turbo: a força deve ficar entre ${LIMITES.turboMin} e ${LIMITES.turboMax} (1 é sem turbo).` };
    }

    const turboForca = Math.round(turboBruto * 10) / 10;

    // Sem o campo (configuracao salva antes desta opcao existir), valem os de fabrica.
    const animaisACada = bruta.animaisACada === undefined ? padrao.animaisACada : bruta.animaisACada;

    if (typeof animaisACada !== 'number' || !Number.isInteger(animaisACada) || animaisACada < LIMITES.animaisACadaMin || animaisACada > LIMITES.animaisACadaMax) {
        return { ok: false, erro: `Animais na corrida: informe de quantas em quantas palavras (um número inteiro entre ${LIMITES.animaisACadaMin} e ${LIMITES.animaisACadaMax}).` };
    }

    const duracaoBruta = bruta.animaisDuracao === undefined ? padrao.animaisDuracao : bruta.animaisDuracao;

    if (typeof duracaoBruta !== 'number' || !Number.isFinite(duracaoBruta) || duracaoBruta < LIMITES.animaisDuracaoMin || duracaoBruta > LIMITES.animaisDuracaoMax) {
        return { ok: false, erro: `Animais na corrida: o tempo na tela deve ficar entre ${LIMITES.animaisDuracaoMin} e ${LIMITES.animaisDuracaoMax} segundos.` };
    }

    // Uma casa decimal basta (3,6 s) e evita valores como 3,6000001 salvos no banco.
    const animaisDuracao = Math.round(duracaoBruta * 10) / 10;

    const textos: Configuracao['textos'] = {};
    const brutos = typeof bruta.textos === 'object' && bruta.textos !== null ? (bruta.textos as Record<string, unknown>) : {};

    for (const [chave, valor] of Object.entries(brutos)) {
        const definicao = definicaoDoTexto(chave);

        if (!definicao || typeof valor !== 'object' || valor === null) {
            continue;
        }

        const { texto, mostrar } = valor as Record<string, unknown>;
        const personalizado: TextoPersonalizado = {};

        if (typeof texto === 'string' && texto.trim() !== '') {
            if (texto.trim().length > LIMITES.textoMax) {
                return { ok: false, erro: `O texto "${definicao.rotulo}" passa de ${LIMITES.textoMax} caracteres.` };
            }

            personalizado.texto = texto.trim();
        }

        if (definicao.podeOcultar && mostrar === false) {
            personalizado.mostrar = false;
        }

        if (personalizado.texto !== undefined || personalizado.mostrar !== undefined) {
            textos[chave as ChaveTexto] = personalizado;
        }
    }

    return {
        ok: true,
        config: {
            avatares,
            nomesAvatares,
            cenarios,
            meios,
            mostrarTotais: booleano(bruta.mostrarTotais, padrao.mostrarTotais),
            mostrarRanking: booleano(bruta.mostrarRanking, padrao.mostrarRanking),
            mostrarTotaisInicio: booleano(bruta.mostrarTotaisInicio, padrao.mostrarTotaisInicio),
            mostrarMinimapa: booleano(bruta.mostrarMinimapa, padrao.mostrarMinimapa),
            mostrarProgresso: booleano(bruta.mostrarProgresso, padrao.mostrarProgresso),
            modoPlacas,
            palavrasPorEtapa: palavras,
            turboForca,
            animaisNaCorrida: booleano(bruta.animaisNaCorrida, padrao.animaisNaCorrida),
            animaisACada,
            animaisDuracao,
            demoInicial: booleano(bruta.demoInicial, padrao.demoInicial),
            reacoes: booleano(bruta.reacoes, padrao.reacoes),
            textos,
        },
    };
}

/**
 * Configuracao em vigor: a salva na area de gerenciamento ou a de fabrica. Nunca derruba o jogo: se o banco falhar
 * ou o que esta salvo ficar invalido (por exemplo, depois de o catalogo mudar), usa a de fabrica.
 */
export async function carregarConfiguracao(): Promise<Configuracao> {
    try {
        const salvo = await lerConfiguracao(CHAVE);

        if (salvo === null) {
            return configuracaoPadrao();
        }

        const resultado = validar(JSON.parse(salvo));

        if (resultado.ok) {
            return resultado.config;
        }

        console.warn('Configuração salva inválida; usando a de fábrica:', resultado.erro);
    } catch (erro) {
        console.error('Falha ao ler a configuração; usando a de fábrica:', erro);
    }

    return configuracaoPadrao();
}

export async function salvarConfiguracao(config: Configuracao): Promise<void> {
    await gravarConfiguracao(CHAVE, JSON.stringify(config));
}

/** Volta tudo ao padrao de fabrica (apaga o que estava salvo). */
export async function restaurarConfiguracao(): Promise<Configuracao> {
    await gravarConfiguracao(CHAVE, null);

    return configuracaoPadrao();
}

export { TEXTOS };
