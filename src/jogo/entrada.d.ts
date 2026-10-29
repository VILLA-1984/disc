export type EtapasDoJogo = { cima: { id: number; word: string }; baixo: { id: number; word: string } }[][];

/** Modo "uma palavra por vez": ordens[etapa][volta] = ids na ordem em que podem aparecer. */
export type CicloDoJogo = {
    escolher: number;
    etapas: number[][][];
    palavras: Record<number, string>;
};

export type ApiDoJogo<Resposta> = {
    etapas?: EtapasDoJogo;
    ciclo?: CicloDoJogo | null;
    /** Painel de totais (so o Next.js): quantas pessoas ja jogaram e quantas deram cada animal. */
    totais?: () => Promise<{ total: number; animais: { chave: string; nome: string; cor: string; total: number }[] } | null>;
    concluir: (escolhas: unknown[]) => Promise<Resposta>;
    aoFinalizar: (resposta: Resposta) => void;
};

export function montar<Resposta>(raiz: HTMLElement, api: ApiDoJogo<Resposta>): { destruir: () => void };
