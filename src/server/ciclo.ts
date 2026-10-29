/**
 * Ciclo de palavras da Rua das Palavras ("uma por vez"): o servidor sorteia a ordem das palavras em cada volta
 * e, no fim, refaz a partida a partir das decisoes (pegou / deixou passar) para conferir e pontuar.
 * As regras do ciclo estao em src/jogo/ciclo.js, o mesmo arquivo que o navegador usa.
 *
 * O navegador recebe so ids e textos, nunca o fator DISC.
 */
import { randomInt } from 'node:crypto';
import { simular } from '../jogo/ciclo.js';
import { FATORES, RodadaInvalida, type Fator, type Palavra, type Sorteador } from './gameRound';

export type RodadaCiclo = {
    escolher: number;
    /** etapas[etapa][volta] = ids na ordem em que podem aparecer naquela volta. */
    etapas: number[][][];
};

export const ESCOLHER_MIN = 12;
export const ESCOLHER_PADRAO = 24;
export const VOLTAS = 6;
export const ETAPAS = 2;

const sorteadorPadrao: Sorteador = () => randomInt(0, 1_000_000_000) / 1_000_000_000;

function embaralhar<T>(lista: T[], sorteio: Sorteador): T[] {
    const copia = [...lista];

    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(sorteio() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }

    return copia;
}

/** Quantas palavras a pessoa escolhe por etapa, respeitando os limites. */
export function escolherPorEtapa(totalDePalavras: number, configurado?: number | null): number {
    return Math.max(ESCOLHER_MIN, Math.min(totalDePalavras - ESCOLHER_MIN, configurado ?? ESCOLHER_PADRAO));
}

/**
 * Uma volta: palavras em blocos com uma de cada fator (quando a lista e equilibrada), blocos e palavras
 * embaralhados. Assim nenhum fator aparece todo no comeco ou todo no fim.
 */
function ordemDaVolta(palavras: Palavra[], sorteio: Sorteador): number[] {
    const porFator = FATORES.map((fator) => embaralhar(palavras.filter((p) => p.code === fator).map((p) => p.id), sorteio));
    const equilibrada = porFator.every((ids) => ids.length === porFator[0].length) && porFator[0].length > 0;

    if (!equilibrada) {
        return embaralhar(palavras.map((p) => p.id), sorteio);
    }

    const blocos = porFator[0].map((_, i) => embaralhar(porFator.map((ids) => ids[i]), sorteio));

    return embaralhar(blocos, sorteio).flat();
}

export function montarCiclo(palavras: Palavra[], escolher: number, sorteio: Sorteador = sorteadorPadrao): RodadaCiclo {
    const fatoresPresentes = new Set<Fator>(palavras.map((p) => p.code));

    if (fatoresPresentes.size < FATORES.length || palavras.length < escolher + ESCOLHER_MIN) {
        throw new RodadaInvalida('Palavras insuficientes para montar o ciclo.');
    }

    return {
        escolher,
        etapas: Array.from({ length: ETAPAS }, () => Array.from({ length: VOLTAS }, () => ordemDaVolta(palavras, sorteio))),
    };
}

export type EtapaResolvida = { escolhidas: number[]; automaticas: number; voltas: number };

/**
 * Refaz cada etapa com as decisoes devolvidas pelo navegador (itens {stage, take}, na ordem) e devolve
 * as palavras escolhidas. Lanca RodadaInvalida se algo nao bater com o ciclo assinado.
 */
export function resolverCiclo(rodada: RodadaCiclo, escolhas: unknown): EtapaResolvida[] {
    if (!Array.isArray(escolhas)) {
        throw new RodadaInvalida('Resposta do jogo em formato inválido.');
    }

    const decisoes: boolean[][] = rodada.etapas.map(() => []);

    for (const escolha of escolhas) {
        const { stage, take } = (escolha ?? {}) as Record<string, unknown>;

        if (!Number.isInteger(stage) || typeof take !== 'boolean' || !decisoes[stage as number]) {
            throw new RodadaInvalida('Resposta do jogo em formato inválido.');
        }

        decisoes[stage as number].push(take);
    }

    return rodada.etapas.map((ordens, etapa) => {
        try {
            const estado = simular(ordens, rodada.escolher, decisoes[etapa]);

            return {
                escolhidas: estado.escolhidas,
                automaticas: estado.automaticas.length,
                voltas: estado.apresentacoes.at(-1)?.volta ?? 1,
            };
        } catch (erro) {
            throw new RodadaInvalida((erro as Error).message);
        }
    });
}
