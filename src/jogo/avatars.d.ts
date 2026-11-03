export type EspecificacaoAvatar = {
    id: string;
    nome: string;
    mobilidade?: string;
    [chave: string]: unknown;
};

export const AVATARES: EspecificacaoAvatar[];

export function gerarRetratos(specs: EspecificacaoAvatar[], opcoes?: { largura?: number; altura?: number }): Map<string, string>;
