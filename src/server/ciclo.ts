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

export const ESCOLHER_MIN = 3;
/** Palavras que a pessoa escolhe em cada etapa (RUA_ESCOLHER muda). Antes eram 24; 14 deixa o jogo bem mais curto. */
export const ESCOLHER_PADRAO = 14;
export const POOL_MIN = 8;
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

/**
 * Quantas palavras entram na partida, respeitando os limites. Por padrao, a lista toda; RUA_PALAVRAS menor sorteia
 * esse tanto de palavras (equilibradas entre os fatores) para cada pessoa.
 */
export function tamanhoDoPool(totalDePalavras: number, configurado?: number | null): number {
    return Math.max(POOL_MIN, Math.min(totalDePalavras, configurado ?? totalDePalavras));
}

/** Quantas palavras a pessoa escolhe por etapa (padrao 14), sempre deixando de fora pelo menos algumas do conjunto. */
export function escolherPorEtapa(tamanhoPool: number, configurado?: number | null): number {
    return Math.max(ESCOLHER_MIN, Math.min(tamanhoPool - ESCOLHER_MIN, configurado ?? ESCOLHER_PADRAO));
}

/**
 * Sorteia as palavras da partida: `quantidade` palavras repartidas o mais igualmente possivel entre os quatro
 * fatores (14 = 4, 4, 3 e 3). Os fatores que levam uma palavra a mais sao sorteados a cada partida, para nenhum
 * fator ter vantagem fixa, e as palavras sao sorteadas dentro de cada fator.
 */
export function sortearPalavras(palavras: Palavra[], quantidade: number, sorteio: Sorteador = sorteadorPadrao): Palavra[] {
    const base = Math.floor(quantidade / FATORES.length);
    const comExtra = new Set(embaralhar(FATORES, sorteio).slice(0, quantidade % FATORES.length));

    return FATORES.flatMap((fator) => {
        const doFator = embaralhar(palavras.filter((p) => p.code === fator), sorteio);
        const quantas = base + (comExtra.has(fator) ? 1 : 0);

        if (doFator.length < quantas) {
            throw new RodadaInvalida(`Palavras insuficientes do fator ${fator} para montar o jogo.`);
        }

        return doFator.slice(0, quantas);
    });
}

/**
 * Uma volta: palavras em blocos com uma de cada fator (o ultimo bloco leva so os fatores que ainda tem palavra,
 * como no 4, 4, 3 e 3 de 14 palavras), blocos e palavras embaralhados. Assim nenhum fator aparece todo no comeco
 * ou todo no fim.
 */
function ordemDaVolta(palavras: Palavra[], sorteio: Sorteador): number[] {
    const porFator = FATORES.map((fator) => embaralhar(palavras.filter((p) => p.code === fator).map((p) => p.id), sorteio));
    const maior = Math.max(...porFator.map((ids) => ids.length));
    const blocos = Array.from({ length: maior }, (_, i) => embaralhar(porFator.filter((ids) => i < ids.length).map((ids) => ids[i]), sorteio));

    return embaralhar(blocos, sorteio).flat();
}

/**
 * Monta a partida: sorteia as palavras (`tamanhoPool`; sem informar, usa a lista toda) e, para cada etapa, a ordem
 * em que elas podem aparecer em cada volta. As duas etapas usam as mesmas palavras.
 */
export function montarCiclo(palavras: Palavra[], escolher: number, sorteio: Sorteador = sorteadorPadrao, tamanhoPool = palavras.length): RodadaCiclo {
    const fatoresPresentes = new Set<Fator>(palavras.map((p) => p.code));

    if (fatoresPresentes.size < FATORES.length) {
        throw new RodadaInvalida('Palavras insuficientes para montar o ciclo.');
    }

    const pool = tamanhoPool >= palavras.length ? palavras : sortearPalavras(palavras, tamanhoPool, sorteio);

    if (pool.length < escolher + ESCOLHER_MIN) {
        throw new RodadaInvalida('Palavras insuficientes para montar o ciclo.');
    }

    return {
        escolher,
        etapas: Array.from({ length: ETAPAS }, () => Array.from({ length: VOLTAS }, () => ordemDaVolta(pool, sorteio))),
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
