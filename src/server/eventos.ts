import { atualizarEvento, eventoPorId, eventoPorSlug, inserirEvento, listarEventosComTotal, type LinhaEvento } from './db';

/**
 * Eventos em que o teste e aplicado. Cada evento tem o seu endereco (/e/<slug>), o seu telao (/e/<slug>/telao) e o seu
 * ranking, e pode ser ligado ou desligado: evento desligado nao recebe novas partidas (o ranking continua visivel).
 */

export type Evento = { id: number; slug: string; nome: string; ativo: boolean; criadoEm: number; total: number };

export const NOME_MIN = 2;
export const NOME_MAX = 80;
const SLUG_MAX = 40;
const SLUG_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const paraEvento = (linha: LinhaEvento): Evento => ({
    id: linha.id,
    slug: linha.slug,
    nome: linha.nome,
    ativo: linha.ativo,
    criadoEm: linha.criado_em,
    total: linha.total,
});

/** O que vai no endereco, a partir do nome: "Feira de Tecnologia 2026!" vira "feira-de-tecnologia-2026". */
export function slugDe(nome: string): string {
    const slug = nome
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, SLUG_MAX)
        .replace(/-+$/g, '');

    return slug || 'evento';
}

export function slugValido(valor: unknown): valor is string {
    return typeof valor === 'string' && valor.length <= SLUG_MAX && SLUG_VALIDO.test(valor);
}

/** Aceita o nome, aparado e sem espacos repetidos; devolve o erro em portugues ou o nome limpo. */
export function conferirNome(entrada: unknown): { ok: true; nome: string } | { ok: false; erro: string } {
    const nome = typeof entrada === 'string' ? entrada.trim().replace(/\s+/g, ' ') : '';

    if (nome.length < NOME_MIN || nome.length > NOME_MAX) {
        return { ok: false, erro: `Informe o nome do evento (de ${NOME_MIN} a ${NOME_MAX} letras).` };
    }

    return { ok: true, nome };
}

/** Cria o evento, ligado, com um endereco proprio (se o nome ja existir, o endereco ganha -2, -3...). */
export async function criarEvento(nome: string, agora = Date.now()): Promise<Evento> {
    const base = slugDe(nome);
    let ultimoErro: unknown;

    for (let tentativa = 1; tentativa <= 50; tentativa++) {
        const sufixo = tentativa === 1 ? '' : `-${tentativa}`;
        const slug = `${base.slice(0, SLUG_MAX - sufixo.length)}${sufixo}`.replace(/-+$/g, '');

        if (await eventoPorSlug(slug)) {
            continue;
        }

        try {
            const id = await inserirEvento(slug, nome, agora);
            const criado = await eventoPorId(id);

            if (criado) {
                return paraEvento(criado);
            }
        } catch (erro) {
            ultimoErro = erro; // outro pedido criou o mesmo endereco ao mesmo tempo: tenta o proximo
        }
    }

    throw ultimoErro ?? new Error('Não foi possível criar o endereço do evento.');
}

export async function listarEventos(): Promise<Evento[]> {
    return (await listarEventosComTotal()).map(paraEvento);
}

export async function buscarEvento(slug: string): Promise<Evento | null> {
    if (!slugValido(slug)) {
        return null;
    }

    const linha = await eventoPorSlug(slug);

    return linha ? paraEvento(linha) : null;
}

export async function alterarEvento(id: number, campos: { nome?: string; ativo?: boolean }): Promise<Evento | null> {
    if (!(await atualizarEvento(id, campos))) {
        return null;
    }

    const linha = await eventoPorId(id);

    return linha ? paraEvento(linha) : null;
}

export type SituacaoDoEvento = { situacao: 'ok'; evento: Evento } | { situacao: 'inativo'; evento: Evento } | { situacao: 'inexistente' };

/** Para quem vai jogar: o evento existe e esta ligado? */
export async function eventoParaJogar(slug: unknown): Promise<SituacaoDoEvento> {
    const evento = typeof slug === 'string' ? await buscarEvento(slug) : null;

    if (!evento) {
        return { situacao: 'inexistente' };
    }

    return { situacao: evento.ativo ? 'ok' : 'inativo', evento };
}
