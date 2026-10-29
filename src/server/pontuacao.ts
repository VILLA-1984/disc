import { FATORES, type Fator, type Palavra } from './gameRound';

/** Percentual por fator a partir dos codigos escolhidos (porte de AdjectiveScoringService::percentages). */
export function percentuais(codigos: Fator[]): Record<Fator, number> {
    const resultado = { D: 0, I: 0, S: 0, C: 0 } as Record<Fator, number>;

    if (codigos.length === 0) {
        return resultado;
    }

    for (const fator of FATORES) {
        const quantos = codigos.filter((c) => c === fator).length;
        resultado[fator] = Math.round((quantos / codigos.length) * 10000) / 100;
    }

    return resultado;
}

export function resumir(idsEscolhidos: number[], palavras: Palavra[]) {
    const porId = new Map(palavras.map((p) => [p.id, p.code]));
    const codigos = idsEscolhidos.map((id) => porId.get(id) as Fator);

    return { percentual: percentuais(codigos), total: codigos.length };
}
