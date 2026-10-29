export type Fator = 'D' | 'I' | 'S' | 'C';

export type Animal = {
    chave: string;
    nome: string;
    artigo: string;
    fator: Fator;
    cor: string;
    resumo: string;
    forte: string;
    atencao: string;
    slogan: string;
    emTime: string;
};

export const FATOR_ANIMAL: Record<Fator, string>;
export const ANIMAIS: Record<string, Animal>;
export const ORDEM_FATORES: Fator[];
export const MARGEM_SECUNDARIO: number;
export const MARGEM_EQUALIZADO: number;

export function resolverAnimais(
    percentuais: Record<string, number>,
    animais?: Record<string, Animal>,
): { principal: Animal | null; secundario: Animal | null; equalizado: boolean };
