/**
 * Montagem e conferencia dos portoes da Rua das Palavras (porte de App\Services\GameRound do sistema).
 *
 * Em cada portao a pessoa ve DUAS palavras e escolhe UMA. As duas sao sempre de fatores DISC diferentes
 * e os portoes se distribuem de forma equilibrada entre as seis combinacoes. Cada palavra aparece no
 * maximo uma vez por etapa e a etapa 2 nunca repete um par da etapa 1.
 *
 * O servidor monta tudo: o navegador so recebe id e texto (nunca o fator) e devolve o lado escolhido.
 */
import { randomInt } from 'node:crypto';

export type Fator = 'D' | 'I' | 'S' | 'C';
export type Palavra = { id: number; word: string; code: Fator };
export type Portao = { top: number; bottom: number };
export type Rodada = Portao[][];
export type Sorteador = () => number;

export const FATORES: Fator[] = ['D', 'I', 'S', 'C'];

const COMBINACOES: [Fator, Fator][] = [
    ['D', 'I'], ['D', 'S'], ['D', 'C'],
    ['I', 'S'], ['I', 'C'], ['S', 'C'],
];

export const PORTOES_MIN = 6;
export const PORTOES_MAX = 24;
export const PORTOES_PADRAO = 12;

export class RodadaInvalida extends Error {}

const sorteadorPadrao: Sorteador = () => randomInt(0, 1_000_000_000) / 1_000_000_000;

export function chaveDoPar(a: number, b: number): string {
    return `${Math.min(a, b)}|${Math.max(a, b)}`;
}

function embaralhar<T>(lista: T[], sorteio: Sorteador): T[] {
    const copia = [...lista];

    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(sorteio() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }

    return copia;
}

function montarEtapa(palavras: Palavra[], portoes: number, sorteio: Sorteador, proibidos: Set<string>): Portao[] {
    const disponiveis = {} as Record<Fator, number[]>;

    for (const fator of FATORES) {
        disponiveis[fator] = embaralhar(palavras.filter((p) => p.code === fator).map((p) => p.id), sorteio);
    }

    // Distribui os portoes de forma equilibrada entre as seis combinacoes.
    const sequencia: [Fator, Fator][] = [];
    let volta: [Fator, Fator][] = embaralhar(COMBINACOES, sorteio);

    while (sequencia.length < portoes) {
        if (volta.length === 0) {
            volta = embaralhar(COMBINACOES, sorteio);
        }

        sequencia.push(volta.shift() as [Fator, Fator]);
    }

    const resultado: Portao[] = [];

    for (const [fatorA, fatorB] of sequencia) {
        let achado: [number, number] | null = null;

        busca: for (let i = 0; i < disponiveis[fatorA].length; i++) {
            for (let j = 0; j < disponiveis[fatorB].length; j++) {
                if (!proibidos.has(chaveDoPar(disponiveis[fatorA][i], disponiveis[fatorB][j]))) {
                    achado = [i, j];
                    break busca;
                }
            }
        }

        if (achado === null) {
            throw new RodadaInvalida(`Palavras insuficientes para montar ${portoes} portões por etapa (faltou par ${fatorA}${fatorB}).`);
        }

        const [i, j] = achado;
        const idA = disponiveis[fatorA][i];
        const idB = disponiveis[fatorB][j];
        disponiveis[fatorA].splice(i, 1);
        disponiveis[fatorB].splice(j, 1);

        // Sorteia qual palavra fica em cima.
        resultado.push(sorteio() < 0.5 ? { top: idA, bottom: idB } : { top: idB, bottom: idA });
    }

    return embaralhar(resultado, sorteio);
}

export function montarRodada(palavras: Palavra[], portoes: number, etapas = 2, sorteio: Sorteador = sorteadorPadrao): Rodada {
    const usados = new Set<string>();
    const rodada: Rodada = [];

    for (let etapa = 0; etapa < etapas; etapa++) {
        const portoesDaEtapa = montarEtapa(palavras, portoes, sorteio, usados);

        for (const portao of portoesDaEtapa) {
            usados.add(chaveDoPar(portao.top, portao.bottom));
        }

        rodada.push(portoesDaEtapa);
    }

    return rodada;
}

export type EscolhaResolvida = { etapa: number; posicao: number; escolhida: number; deixada: number };

/**
 * Confere o que o navegador devolveu contra o que foi apresentado. Cada item tem stage, gate (posicao)
 * e side ('top' ou 'bottom'); exige exatamente uma escolha por portao.
 */
export function resolverEscolhas(rodada: Rodada, escolhas: unknown): EscolhaResolvida[] {
    if (!Array.isArray(escolhas)) {
        throw new RodadaInvalida('Resposta do jogo em formato inválido.');
    }

    const porPortao = new Map<string, 'top' | 'bottom'>();

    for (const escolha of escolhas) {
        const { stage, gate, side } = (escolha ?? {}) as Record<string, unknown>;

        if (!Number.isInteger(stage) || !Number.isInteger(gate) || (side !== 'top' && side !== 'bottom')) {
            throw new RodadaInvalida('Resposta do jogo em formato inválido.');
        }

        if (!rodada[stage as number]?.[gate as number]) {
            throw new RodadaInvalida('A resposta aponta para um portão que não existe.');
        }

        const chave = `${stage}:${gate}`;

        if (porPortao.has(chave)) {
            throw new RodadaInvalida('Há mais de uma escolha para o mesmo portão.');
        }

        porPortao.set(chave, side);
    }

    const resolvidas: EscolhaResolvida[] = [];

    rodada.forEach((portoes, etapa) => {
        portoes.forEach((portao, posicao) => {
            const lado = porPortao.get(`${etapa}:${posicao}`);

            if (!lado) {
                throw new RodadaInvalida('Faltam escolhas: complete todos os portões.');
            }

            const outro = lado === 'top' ? 'bottom' : 'top';
            resolvidas.push({ etapa, posicao, escolhida: portao[lado], deixada: portao[outro] });
        });
    });

    return resolvidas;
}

/** Quantos portoes por etapa, respeitando os limites. */
export function portoesPorEtapa(configurado?: number | null): number {
    return Math.max(PORTOES_MIN, Math.min(PORTOES_MAX, configurado ?? PORTOES_PADRAO));
}
