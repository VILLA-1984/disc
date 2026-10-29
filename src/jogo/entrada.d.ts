export type EtapasDoJogo = { cima: { id: number; word: string }; baixo: { id: number; word: string } }[][];

export type ApiDoJogo<Resposta> = {
    etapas: EtapasDoJogo;
    concluir: (escolhas: unknown[]) => Promise<Resposta>;
    aoFinalizar: (resposta: Resposta) => void;
};

export function montar<Resposta>(raiz: HTMLElement, api: ApiDoJogo<Resposta>): { destruir: () => void };
