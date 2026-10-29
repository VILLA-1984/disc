export type EstadoDoCiclo = {
    pegas: number[];
    automaticas: number[];
    escolhidas: number[];
    apresentacoes: { id: number; volta: number; pegou: boolean }[];
    volta: number;
    faltam: number;
    encerrado: boolean;
};

export type Ciclo = {
    proximo: () => number | null;
    registrar: (pegou: boolean) => void;
    estado: () => EstadoDoCiclo;
};

export function criarCiclo(ordens: number[][], escolher: number): Ciclo;
export function simular(ordens: number[][], escolher: number, decisoes: unknown[]): EstadoDoCiclo;
