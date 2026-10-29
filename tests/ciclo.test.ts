import { describe, expect, it } from 'vitest';
import { criarCiclo, simular } from '../src/jogo/ciclo.js';
import { ESCOLHER_PADRAO, escolherPorEtapa, montarCiclo, resolverCiclo, VOLTAS } from '../src/server/ciclo';
import { RodadaInvalida } from '../src/server/gameRound';
import { PALAVRAS } from '../src/server/palavras';
import { percentuais, resumir } from '../src/server/pontuacao';

function semente(valor: number) {
    let s = valor;

    return () => {
        s |= 0;
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Joga uma etapa: decide(i, id) diz se a pessoa pega a i-esima palavra apresentada. */
function jogar(ordens: number[][], escolher: number, decide: (i: number, id: number) => boolean) {
    const ciclo = criarCiclo(ordens, escolher);
    const decisoes: boolean[] = [];
    let id = ciclo.proximo();

    while (id !== null) {
        const pegou = decide(decisoes.length, id);
        decisoes.push(pegou);
        ciclo.registrar(pegou);
        id = ciclo.proximo();
    }

    return { decisoes, estado: ciclo.estado() };
}

describe('montarCiclo', () => {
    it.each([1, 2, 3])('cada volta traz as 48 palavras uma vez e balanceia os fatores em blocos (semente %i)', (s) => {
        const rodada = montarCiclo(PALAVRAS, ESCOLHER_PADRAO, semente(s));
        const todas = PALAVRAS.map((p) => p.id).sort((a, b) => a - b);
        const codigo = new Map(PALAVRAS.map((p) => [p.id, p.code]));

        expect(rodada.etapas).toHaveLength(2);

        for (const etapa of rodada.etapas) {
            expect(etapa).toHaveLength(VOLTAS);

            for (const volta of etapa) {
                expect([...volta].sort((a, b) => a - b)).toEqual(todas);

                for (let i = 0; i < volta.length; i += 4) {
                    expect(new Set(volta.slice(i, i + 4).map((id) => codigo.get(id))).size).toBe(4);
                }
            }
        }
    });

    it('limita quantas palavras se escolhe', () => {
        expect(escolherPorEtapa(48)).toBe(24);
        expect(escolherPorEtapa(48, 4)).toBe(12);
        expect(escolherPorEtapa(48, 90)).toBe(36);
    });

    it('recusa lista sem os quatro fatores', () => {
        expect(() => montarCiclo(PALAVRAS.filter((p) => p.code !== 'C'), 12)).toThrow(RodadaInvalida);
    });
});

describe('ciclo de palavras', () => {
    const rodada = montarCiclo(PALAVRAS, 24, semente(7));
    const ordens = rodada.etapas[0];

    it('mostra todas as 48 palavras na primeira volta antes de qualquer repeticao', () => {
        const { estado } = jogar(ordens, 24, (i) => i % 3 === 0); // pega 1 de cada 3
        const primeira = estado.apresentacoes.filter((a) => a.volta === 1).map((a) => a.id);

        expect(new Set(primeira).size).toBe(48);
        expect(estado.apresentacoes.some((a) => a.volta === 2)).toBe(true);
    });

    it('so repete palavras que foram deixadas passar e nunca uma ja pega', () => {
        const { estado } = jogar(ordens, 24, (i) => i % 3 === 0);
        const pegas = new Set<number>();

        for (const a of estado.apresentacoes) {
            expect(pegas.has(a.id)).toBe(false);

            if (a.pegou) {
                pegas.add(a.id);
            }
        }
    });

    it('termina com exatamente 24 escolhidas, todas distintas', () => {
        for (const regra of [(i: number) => i % 3 === 0, (i: number) => i % 2 === 0, () => true]) {
            const { estado } = jogar(ordens, 24, regra);

            expect(estado.escolhidas).toHaveLength(24);
            expect(new Set(estado.escolhidas).size).toBe(24);
        }
    });

    it('quem pega tudo termina na primeira volta, sem palavras automaticas', () => {
        const { estado } = jogar(ordens, 24, () => true);

        expect(estado.automaticas).toHaveLength(0);
        expect(estado.apresentacoes).toHaveLength(24);
        expect(estado.volta).toBe(1);
    });

    it('as palavras que restam entram sozinhas quando sao exatamente as que faltam', () => {
        // Deixa passar tudo ate sobrarem so 24 palavras no jogo: pega as 24 primeiras e o resto precisa entrar.
        const { estado } = jogar(ordens, 24, (i) => i >= 24 && i < 24 + 24);

        expect(estado.escolhidas).toHaveLength(24);
        expect(new Set(estado.escolhidas).size).toBe(24);
    });

    it('quem nao pega nada nunca fica preso: entram as primeiras palavras da ultima volta', () => {
        const { estado } = jogar(ordens, 24, () => false);

        expect(estado.pegas).toHaveLength(0);
        expect(estado.automaticas).toHaveLength(24);
        expect(estado.escolhidas).toHaveLength(24);
        expect(estado.apresentacoes).toHaveLength(48 * VOLTAS);
    });

    it('a simulacao do servidor reproduz o que o navegador viu', () => {
        const { decisoes, estado } = jogar(ordens, 24, (i) => i % 4 === 1);

        expect(simular(ordens, 24, decisoes)).toEqual(estado);
    });

    it('a simulacao recusa decisoes a mais ou a menos', () => {
        const { decisoes } = jogar(ordens, 24, (i) => i % 3 === 0);

        expect(() => simular(ordens, 24, [...decisoes, true])).toThrow();
        expect(() => simular(ordens, 24, decisoes.slice(0, -1))).toThrow();
        expect(() => simular(ordens, 24, ['sim'])).toThrow();
    });
});

describe('resolverCiclo e pontuacao', () => {
    const rodada = montarCiclo(PALAVRAS, 24, semente(11));

    function partida(regra: (i: number) => boolean) {
        const escolhas: { stage: number; take: boolean }[] = [];

        rodada.etapas.forEach((ordens, stage) => {
            jogar(ordens, 24, regra).decisoes.forEach((take) => escolhas.push({ stage, take }));
        });

        return escolhas;
    }

    it('devolve 24 palavras escolhidas por etapa', () => {
        const etapas = resolverCiclo(rodada, partida((i) => i % 3 === 0));

        expect(etapas).toHaveLength(2);

        for (const etapa of etapas) {
            expect(etapa.escolhidas).toHaveLength(24);
            expect(etapa.voltas).toBeGreaterThan(1);
        }
    });

    it('a pontuacao vem so das palavras escolhidas: quem pega so D tem D alto', () => {
        const dominantes = new Set(PALAVRAS.filter((p) => p.code === 'D').map((p) => p.id));
        const ordens = rodada.etapas[0];
        const { estado } = jogar(ordens, 24, (_, id) => dominantes.has(id));
        const resumo = resumir(estado.escolhidas, PALAVRAS);

        expect(resumo.total).toBe(24);
        // As 12 palavras D, mais 12 completadas sem escolha propria: D precisa ter 50%.
        expect(resumo.percentual.D).toBe(50);
        expect(percentuais(estado.escolhidas.map((id) => PALAVRAS.find((p) => p.id === id)!.code)).D).toBe(50);
    });

    it('recusa decisoes que nao batem com o ciclo assinado', () => {
        const escolhas = partida((i) => i % 3 === 0);

        expect(() => resolverCiclo(rodada, escolhas.slice(0, -1))).toThrow(RodadaInvalida);
        expect(() => resolverCiclo(rodada, [...escolhas, { stage: 0, take: true }])).toThrow(RodadaInvalida);
        expect(() => resolverCiclo(rodada, [{ stage: 5, take: true }])).toThrow(RodadaInvalida);
        expect(() => resolverCiclo(rodada, [{ stage: 0, take: 'sim' }])).toThrow(RodadaInvalida);
        expect(() => resolverCiclo(rodada, 'x')).toThrow(RodadaInvalida);
    });
});
