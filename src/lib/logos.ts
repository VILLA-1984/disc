/**
 * Logos disponiveis na area de gerenciamento: as fixas (arquivos em public/logo, versionados com o projeto), a
 * enviada por quem administra e "sem logo". Codigo puro, serve ao servidor e a tela de gerenciamento.
 */

export type LogoFixa = {
    id: string;
    nome: string;
    descricao: string;
    /** Arquivo em public/logo. */
    arquivo: string;
    /** Logo clara, feita para fundo escuro: na tela ela vem sobre uma faixa azul-marinho. */
    fundoEscuro?: boolean;
};

export const LOGOS_FIXAS: LogoFixa[] = [
    { id: 'generica', nome: 'Genérica', descricao: 'Os quatro quadrados do DISC, igual ao ícone da aba do navegador', arquivo: 'logo-generica.png' },
    { id: 'quatro-animais', nome: 'Quatro animais', descricao: 'Tubarão, águia, gato e lobo lado a lado, nas cores do DISC', arquivo: 'logo-quatro-animais.png' },
    { id: 'senac-colorido', nome: 'Senac e Fecomércio Sesc', descricao: 'Horizontal, colorida', arquivo: 'senac100-colorido.png' },
    { id: 'senac', nome: 'Senac', descricao: 'Só a marca, colorida', arquivo: 'senac-01.png' },
    { id: 'senac-vertical', nome: 'Senac e Fecomércio Sesc (vertical)', descricao: 'Vertical, colorida', arquivo: 'image.png' },
    { id: 'senac-branco', nome: 'Senac (branca)', descricao: 'Para fundo escuro: aparece sobre uma faixa azul-marinho', arquivo: 'LOGO-SENAC_BRANCO.png', fundoEscuro: true },
];

/** Uma logo fixa (pelo id), a enviada ou nenhuma. */
export type EscolhaLogo = string;

export const ESCOLHA_PADRAO = 'generica';
export const ESCOLHA_ENVIADA = 'enviada';
export const ESCOLHA_NENHUMA = 'nenhuma';

export function logoFixa(id: string): LogoFixa | undefined {
    return LOGOS_FIXAS.find((l) => l.id === id);
}

export function escolhaValida(valor: unknown): valor is EscolhaLogo {
    return typeof valor === 'string' && (valor === ESCOLHA_ENVIADA || valor === ESCOLHA_NENHUMA || logoFixa(valor) !== undefined);
}

/** A logo que a tela mostra: endereco da imagem e se precisa de fundo escuro. */
export type LogoEmUso = { src: string; escuro: boolean };

export function enderecoDaFixa(logo: LogoFixa): string {
    return `/logo/${logo.arquivo}`;
}

export function enderecoDaEnviada(versao: number): string {
    return `/api/logo?v=${versao}`;
}
