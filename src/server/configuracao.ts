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
    avatares: { id: string; nome: string; mobilidade: string }[];
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
        avatares: AVATARES.map((a) => ({ id: a.id, nome: a.nome, mobilidade: a.mobilidade ?? 'anda' })),
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

/** Configuracao de fabrica: tudo liberado, tudo visivel, 12 palavras por etapa e os textos originais. */
export function configuracaoPadrao(): Configuracao {
    const doAmbiente = Number(process.env.RUA_ESCOLHER);
    const palavras = Number.isInteger(doAmbiente) && doAmbiente >= LIMITES.palavrasMin && doAmbiente <= LIMITES.palavrasMax
        ? doAmbiente
        : LIMITES.palavrasPadrao;

    return {
        avatares: [...ID_AVATARES],
        cenarios: [...CHAVES_CENARIOS],
        meios: [...CHAVES_MEIOS],
        mostrarTotais: true,
        mostrarRanking: true,
        mostrarMinimapa: true,
        mostrarProgresso: true,
        palavrasPorEtapa: palavras,
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

    const palavras = bruta.palavrasPorEtapa;

    if (typeof palavras !== 'number' || !Number.isInteger(palavras) || palavras < LIMITES.palavrasMin || palavras > LIMITES.palavrasMax) {
        return { ok: false, erro: `Palavras por etapa: informe um número inteiro entre ${LIMITES.palavrasMin} e ${LIMITES.palavrasMax}.` };
    }

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
            cenarios,
            meios,
            mostrarTotais: booleano(bruta.mostrarTotais, padrao.mostrarTotais),
            mostrarRanking: booleano(bruta.mostrarRanking, padrao.mostrarRanking),
            mostrarMinimapa: booleano(bruta.mostrarMinimapa, padrao.mostrarMinimapa),
            mostrarProgresso: booleano(bruta.mostrarProgresso, padrao.mostrarProgresso),
            palavrasPorEtapa: palavras,
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
