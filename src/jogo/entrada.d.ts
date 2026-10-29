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
    concluir: (escolhas: unknown[]) => Promise<Resposta>;
    aoFinalizar: (resposta: Resposta) => void;
};

export function montar<Resposta>(raiz: HTMLElement, api: ApiDoJogo<Resposta>): { destruir: () => void };
