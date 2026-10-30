export type RegraDeAcesso = {
    nome: string;
    descricao: string;
    motivo: string;
    aceita: (mobilidade: string) => boolean;
    [chave: string]: unknown;
};

export const CENARIOS: Record<string, RegraDeAcesso>;
export const MEIOS: Record<string, RegraDeAcesso & { cenario: string }>;
