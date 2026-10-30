export type EspecificacaoAvatar = {
    id: string;
    nome: string;
    mobilidade?: string;
    [chave: string]: unknown;
};

export const AVATARES: EspecificacaoAvatar[];
