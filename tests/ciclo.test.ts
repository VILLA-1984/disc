import { describe, expect, it } from 'vitest';
import { criarCiclo, simular } from '../src/jogo/ciclo.js';
import { escolherPorEtapa, montarCiclo, resolverCiclo, sortearPalavras, tamanhoDoPool, VOLTAS } from '../src/server/ciclo';
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
        const rodada = montarCiclo(PALAVRAS, 24, semente(s));
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
        expect(escolherPorEtapa(48)).toBe(14); // padrao: 14 por etapa (eram 24)
        expect(escolherPorEtapa(48, 24)).toBe(24);
        expect(escolherPorEtapa(14, 1)).toBe(3);
        expect(escolherPorEtapa(14, 90)).toBe(11);
        expect(tamanhoDoPool(48)).toBe(48); // padrao: a lista toda
        expect(tamanhoDoPool(48, 3)).toBe(8);
        expect(tamanhoDoPool(48, 99)).toBe(48);
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

describe('padrao: 14 escolhidas por etapa, de 48 palavras', () => {
    const rodada = montarCiclo(PALAVRAS, escolherPorEtapa(tamanhoDoPool(PALAVRAS.length)), semente(5), tamanhoDoPool(PALAVRAS.length));

    it('monta 14 por etapa com a lista toda', () => {
        expect(rodada.escolher).toBe(14);
        expect(new Set(rodada.etapas[0][0]).size).toBe(48);
    });

    it('cada etapa fecha com exatamente 14 palavras escolhidas e a pessoa passa por bem menos palavras que antes', () => {
        const escolhas: { stage: number; take: boolean }[] = [];
        const apresentadas: number[] = [];

        rodada.etapas.forEach((ordens, stage) => {
            const { decisoes, estado } = jogar(ordens, 14, (i) => i % 3 === 0);

            decisoes.forEach((take) => escolhas.push({ stage, take }));
            apresentadas.push(estado.apresentacoes.length);
            expect(estado.escolhidas).toHaveLength(14);
            expect(new Set(estado.escolhidas).size).toBe(14);
        });

        expect(resolverCiclo(rodada, escolhas).map((e) => e.escolhidas.length)).toEqual([14, 14]);
        expect(Math.max(...apresentadas)).toBeLessThanOrEqual(48); // pegando 1 de cada 3, nem chega a dar a volta toda
    });

    it('a pontuacao tem 14 palavras por etapa: percentuais em passos de 7%', () => {
        const dominantes = new Set(PALAVRAS.filter((p) => p.code === 'D').map((p) => p.id));
        const { estado } = jogar(rodada.etapas[0], 14, (_, id) => dominantes.has(id));
        const resumo = resumir(estado.escolhidas, PALAVRAS);

        expect(resumo.total).toBe(14);
        expect(resumo.percentual.D).toBeGreaterThanOrEqual(Math.max(...Object.values(resumo.percentual)));
    });
});

describe('conjunto reduzido de palavras (opcional: RUA_PALAVRAS=14 e RUA_ESCOLHER=7)', () => {
    const porId = new Map(PALAVRAS.map((p) => [p.id, p]));

    it.each([1, 2, 3, 4, 5, 6])('sorteia 14 palavras distintas, 4, 4, 3 e 3 entre os fatores (semente %i)', (s) => {
        const pool = sortearPalavras(PALAVRAS, 14, semente(s));
        const contagem = ['D', 'I', 'S', 'C'].map((f) => pool.filter((p) => p.code === f).length).sort();

        expect(pool).toHaveLength(14);
        expect(new Set(pool.map((p) => p.id)).size).toBe(14);
        expect(contagem).toEqual([3, 3, 4, 4]);
    });

    it('os fatores que levam uma palavra a mais mudam de partida para partida', () => {
        const comQuatro = new Set<string>();

        for (let s = 1; s <= 40; s++) {
            const pool = sortearPalavras(PALAVRAS, 14, semente(s));

            for (const f of ['D', 'I', 'S', 'C']) {
                if (pool.filter((p) => p.code === f).length === 4) {
                    comQuatro.add(f);
                }
            }
        }

        expect([...comQuatro].sort()).toEqual(['C', 'D', 'I', 'S']); // nenhum fator tem vantagem fixa
    });

    it('as mesmas 14 palavras valem nas duas etapas e em todas as voltas', () => {
        const rodada = montarCiclo(PALAVRAS, 7, semente(9), 14);
        const conjunto = [...rodada.etapas[0][0]].sort((a, b) => a - b);

        expect(rodada.escolher).toBe(7);
        expect(conjunto).toHaveLength(14);

        for (const etapa of rodada.etapas) {
            for (const volta of etapa) {
                expect([...volta].sort((a, b) => a - b)).toEqual(conjunto);
            }
        }
    });

    it('a primeira volta mostra as 14 palavras antes de qualquer repeticao, e a pessoa escolhe 7 em cada etapa', () => {
        const rodada = montarCiclo(PALAVRAS, 7, semente(3), 14);
        const escolhas: { stage: number; take: boolean }[] = [];
        let apresentadasNaEtapa1 = 0;

        rodada.etapas.forEach((ordens, stage) => {
            const { decisoes, estado } = jogar(ordens, 7, (i) => i % 3 === 0);

            decisoes.forEach((take) => escolhas.push({ stage, take }));
            expect(estado.escolhidas).toHaveLength(7);
            expect(new Set(estado.escolhidas).size).toBe(7);
            expect(new Set(estado.apresentacoes.filter((a) => a.volta === 1).map((a) => a.id)).size).toBe(14);

            if (stage === 0) {
                apresentadasNaEtapa1 = estado.apresentacoes.length;
            }
        });

        const etapas = resolverCiclo(rodada, escolhas);

        expect(etapas.map((e) => e.escolhidas.length)).toEqual([7, 7]);
        expect(apresentadasNaEtapa1).toBeLessThan(48); // bem menos passagens que as 48 palavras da versao completa
    });

    it('a pontuacao continua saindo so das palavras escolhidas e identifica o perfil dominante', () => {
        const rodada = montarCiclo(PALAVRAS, 7, semente(21), 14);
        const dominantes = new Set(PALAVRAS.filter((p) => p.code === 'D').map((p) => p.id));
        const { estado } = jogar(rodada.etapas[0], 7, (_, id) => dominantes.has(id));
        const resumo = resumir(estado.escolhidas, PALAVRAS);

        expect(resumo.total).toBe(7);
        // Pegou todas as palavras D que apareceram (3 ou 4): D tem de ser o fator mais alto.
        const maior = Math.max(...Object.values(resumo.percentual));

        expect(resumo.percentual.D).toBe(maior);
        expect(estado.escolhidas.every((id) => porId.has(id))).toBe(true);
    });

    it('recusa pedir mais palavras de um fator do que a lista tem', () => {
        const poucas = PALAVRAS.filter((p) => p.code !== 'C' || p.id % 12 === 0); // so 1 palavra C

        expect(() => sortearPalavras(poucas, 14, semente(1))).toThrow(RodadaInvalida);
    });
});