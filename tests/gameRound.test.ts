import { describe, expect, it } from 'vitest';
import { chaveDoPar, montarRodada, portoesPorEtapa, resolverEscolhas, RodadaInvalida, type Palavra } from '../src/server/gameRound';
import { PALAVRAS } from '../src/server/palavras';
import { percentuais, resumir } from '../src/server/pontuacao';

/** Sorteador deterministico (mulberry32) para os testes. */
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

const porId = new Map(PALAVRAS.map((p) => [p.id, p]));

describe('lista de palavras', () => {
    it('tem 12 palavras por fator', () => {
        for (const fator of ['D', 'I', 'S', 'C']) {
            expect(PALAVRAS.filter((p) => p.code === fator)).toHaveLength(12);
        }
    });
});

describe('montarRodada', () => {
    it.each([1, 2, 3, 4, 5])('monta pares de fatores diferentes e sem palavra repetida na etapa (semente %i)', (s) => {
        const rodada = montarRodada(PALAVRAS, 12, 2, semente(s));

        expect(rodada).toHaveLength(2);

        for (const etapa of rodada) {
            expect(etapa).toHaveLength(12);
            const ids = etapa.flatMap((p) => [p.top, p.bottom]);

            expect(new Set(ids).size).toBe(ids.length);

            for (const portao of etapa) {
                expect(porId.get(portao.top)!.code).not.toBe(porId.get(portao.bottom)!.code);
            }
        }
    });

    it('equilibra as seis combinacoes quando os portoes sao multiplos de 6', () => {
        const [etapa] = montarRodada(PALAVRAS, 12, 2, semente(7));
        const contagem = new Map<string, number>();

        for (const { top, bottom } of etapa) {
            const chave = [porId.get(top)!.code, porId.get(bottom)!.code].sort().join('');
            contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
        }

        expect(contagem.size).toBe(6);
        expect([...contagem.values()]).toEqual([2, 2, 2, 2, 2, 2]);
    });

    it('a etapa 2 nao repete par da etapa 1', () => {
        const [primeira, segunda] = montarRodada(PALAVRAS, 12, 2, semente(11));
        const usados = new Set(primeira.map((p) => chaveDoPar(p.top, p.bottom)));

        for (const portao of segunda) {
            expect(usados.has(chaveDoPar(portao.top, portao.bottom))).toBe(false);
        }
    });

    it('recusa quando faltam palavras', () => {
        const poucas: Palavra[] = PALAVRAS.filter((p) => p.id % 12 < 3);

        expect(() => montarRodada(poucas, 12, 2, semente(1))).toThrow(RodadaInvalida);
    });

    it('respeita os limites de portoes', () => {
        expect(portoesPorEtapa(null)).toBe(12);
        expect(portoesPorEtapa(2)).toBe(6);
        expect(portoesPorEtapa(99)).toBe(24);
    });
});

describe('resolverEscolhas', () => {
    const rodada = montarRodada(PALAVRAS, 6, 2, semente(3));
    const completas = rodada.flatMap((etapa, stage) => etapa.map((_, gate) => ({ stage, gate, side: 'top' as const })));

    it('resolve uma escolha por portao', () => {
        const resolvidas = resolverEscolhas(rodada, completas);

        expect(resolvidas).toHaveLength(12);
        expect(resolvidas[0].escolhida).toBe(rodada[0][0].top);
        expect(resolvidas[0].deixada).toBe(rodada[0][0].bottom);
    });

    it('recusa escolha faltando, duplicada, fora da rodada ou mal formada', () => {
        expect(() => resolverEscolhas(rodada, completas.slice(1))).toThrow('Faltam escolhas');
        expect(() => resolverEscolhas(rodada, [...completas, completas[0]])).toThrow('mais de uma escolha');
        expect(() => resolverEscolhas(rodada, [...completas, { stage: 0, gate: 99, side: 'top' }])).toThrow('não existe');
        expect(() => resolverEscolhas(rodada, [{ stage: 0, gate: 0, side: 'meio' }])).toThrow('formato inválido');
        expect(() => resolverEscolhas(rodada, 'x')).toThrow('formato inválido');
    });
});

describe('pontuacao', () => {
    it('calcula o percentual por fator', () => {
        expect(percentuais(['D', 'D', 'I', 'C'])).toEqual({ D: 50, I: 25, S: 0, C: 25 });
        expect(percentuais([])).toEqual({ D: 0, I: 0, S: 0, C: 0 });
    });

    it('resume os ids escolhidos pelo fator da palavra', () => {
        const ids = PALAVRAS.filter((p) => p.code === 'S').slice(0, 4).map((p) => p.id);

        expect(resumir(ids, PALAVRAS)).toEqual({ percentual: { D: 0, I: 0, S: 100, C: 0 }, total: 4 });
    });
});
