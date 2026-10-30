/**
 * Configuracao do jogo, editada na area de gerenciamento (/admin). Este arquivo e puro (sem acesso a banco nem ao
 * catalogo de avatares), entao serve igual ao servidor, a pagina de gerenciamento e ao navegador do jogo.
 */

/** Textos e titulos que a area de gerenciamento deixa editar. */
export type ChaveTexto =
    | 'titulo_geral'
    | 'cadastro_intro'
    | 'cadastro_pergunta'
    | 'abertura_texto'
    | 'avatar_titulo'
    | 'avatar_texto'
    | 'etapa1_titulo'
    | 'etapa1_texto'
    | 'etapa2_titulo'
    | 'etapa2_texto'
    | 'regra_texto'
    | 'etapa_concluida_titulo'
    | 'etapa_concluida_texto'
    | 'fim_titulo'
    | 'fim_texto';

export type TextoDefinicao = {
    chave: ChaveTexto;
    rotulo: string;
    /** Em que tela da partida aparece (para quem edita saber o que esta mudando). */
    onde: string;
    padrao: string;
    /** Textos de explicacao podem ser escondidos; titulos nao (ficariam vazios). */
    podeOcultar: boolean;
    /** Marcadores aceitos no texto, no formato {nome}. */
    variaveis?: { nome: string; descricao: string }[];
    /** Texto longo (varias linhas) ou linha curta. */
    longo: boolean;
};

export const TEXTOS: TextoDefinicao[] = [
    { chave: 'titulo_geral', rotulo: 'Título do teste', onde: 'Tela inicial, cabeçalho do jogo e cartão de abertura', padrao: 'Teste de Perfil DISC', podeOcultar: false, longo: false },
    { chave: 'cadastro_intro', rotulo: 'Explicação da tela inicial', onde: 'Tela inicial, abaixo do título', padrao: 'Você descobre o seu animal no fim do jogo. Se quiser, também pode receber o resultado pelo WhatsApp: é opcional.', podeOcultar: true, longo: true },
    { chave: 'cadastro_pergunta', rotulo: 'Pergunta sobre receber o resultado', onde: 'Tela inicial, acima das duas opções', padrao: 'Quer receber o seu resultado pelo WhatsApp?', podeOcultar: false, longo: false },
    {
        chave: 'abertura_texto',
        rotulo: 'Explicação do jogo',
        onde: 'Primeiro cartão do jogo',
        padrao: 'Você vai percorrer um cenário em duas etapas. Em cada portão aparece uma palavra de um lado e "Deixar passar" do outro: pegue a palavra se ela combina com você. Em cada etapa você pega {n} das {total} palavras, e as que você deixar passar voltam mais tarde. Não há resposta certa ou errada, e no fim você descobre o seu animal.',
        podeOcultar: true,
        longo: true,
        variaveis: [{ nome: 'n', descricao: 'palavras por etapa' }, { nome: 'total', descricao: 'palavras do teste' }],
    },
    { chave: 'avatar_titulo', rotulo: 'Título da escolha de avatar', onde: 'Cartão de avatar', padrao: 'Escolha o seu avatar', podeOcultar: false, longo: false },
    { chave: 'avatar_texto', rotulo: 'Explicação da escolha de avatar', onde: 'Cartão de avatar', padrao: 'Escolha quem vai participar. Todos os avatares jogam do mesmo jeito; o nome é só um apelido.', podeOcultar: true, longo: true },
    { chave: 'etapa1_titulo', rotulo: 'Título da etapa 1', onde: 'Cartão de início da etapa 1', padrao: 'Como você é', podeOcultar: false, longo: false },
    { chave: 'etapa1_texto', rotulo: 'Explicação da etapa 1', onde: 'Cartão de início da etapa 1', padrao: 'Pense em como você é naturalmente, no dia a dia. As palavras vêm uma por vez: PEGUE as que mais combinam com você e deixe passar as outras.', podeOcultar: true, longo: true },
    { chave: 'etapa2_titulo', rotulo: 'Título da etapa 2', onde: 'Cartão de início da etapa 2', padrao: 'Como esperam de você', podeOcultar: false, longo: false },
    { chave: 'etapa2_texto', rotulo: 'Explicação da etapa 2', onde: 'Cartão de início da etapa 2', padrao: 'Agora pense em como você acredita que esperam que você seja no trabalho. As palavras vêm uma por vez: PEGUE as que mais combinam com essa expectativa e deixe passar as outras.', podeOcultar: true, longo: true },
    {
        chave: 'regra_texto',
        rotulo: 'Regra de quantas palavras pegar',
        onde: 'Cartão de início de cada etapa',
        padrao: 'Você precisa pegar {n} palavras no total. As que você deixar passar voltam mais tarde, até você completar as {n}.',
        podeOcultar: true,
        longo: true,
        variaveis: [{ nome: 'n', descricao: 'palavras por etapa' }],
    },
    { chave: 'etapa_concluida_titulo', rotulo: 'Título ao terminar a etapa 1', onde: 'Cartão entre as etapas', padrao: 'Muito bem!', podeOcultar: false, longo: false },
    {
        chave: 'etapa_concluida_texto',
        rotulo: 'Texto ao terminar a etapa 1',
        onde: 'Cartão entre as etapas',
        padrao: 'Você completou as {n} palavras desta etapa. Agora vem a etapa {proxima}, com as mesmas palavras, mas outra pergunta.',
        podeOcultar: true,
        longo: true,
        variaveis: [{ nome: 'n', descricao: 'palavras por etapa' }, { nome: 'proxima', descricao: 'número da próxima etapa' }],
    },
    {
        chave: 'fim_titulo',
        rotulo: 'Título do fim do jogo',
        onde: 'Cartão antes de descobrir o animal',
        padrao: 'Você chegou ao fim {fim}!',
        podeOcultar: false,
        longo: false,
        variaveis: [{ nome: 'fim', descricao: 'o lugar onde termina, como "da rua" ou "do rio"' }],
    },
    { chave: 'fim_texto', rotulo: 'Texto do fim do jogo', onde: 'Cartão antes de descobrir o animal', padrao: 'Suas escolhas viram um animal. Quer descobrir qual é o seu?', podeOcultar: true, longo: true },
];

export type TextoPersonalizado = { texto?: string; mostrar?: boolean };

export type Configuracao = {
    /** Avatares liberados (ids). */
    avatares: string[];
    /** Cenarios liberados (chaves: rua, rio, ar, neve, trilhos). */
    cenarios: string[];
    /** Meios de locomocao liberados (chaves: barco, veleiro, aviao, ...). */
    meios: string[];
    /** Painel com quantas pessoas ja jogaram. */
    mostrarTotais: boolean;
    /** Lista por perfil (animal), em ordem de quantidade, dentro do painel de totais. */
    mostrarRanking: boolean;
    mostrarMinimapa: boolean;
    mostrarProgresso: boolean;
    /** Quantas palavras a pessoa marca em cada etapa. */
    palavrasPorEtapa: number;
    textos: Partial<Record<ChaveTexto, TextoPersonalizado>>;
};

export const LIMITES = {
    palavrasMin: 6,
    palavrasMax: 36,
    palavrasPadrao: 12,
    textoMax: 600,
};

const POR_CHAVE = new Map(TEXTOS.map((t) => [t.chave, t]));

export function definicaoDoTexto(chave: string): TextoDefinicao | undefined {
    return POR_CHAVE.get(chave as ChaveTexto);
}

/** Troca os marcadores {nome} pelos valores; marcadores desconhecidos ficam como estao. */
export function interpolar(texto: string, variaveis: Record<string, string | number> = {}): string {
    return texto.replace(/\{(\w+)\}/g, (inteiro, nome: string) => (nome in variaveis ? String(variaveis[nome]) : inteiro));
}

/**
 * Texto efetivo de um titulo ou explicacao: o editado na area de gerenciamento ou o padrao, com os marcadores
 * trocados. Devolve texto simples (nao HTML) e vazio quando a explicacao foi escondida.
 */
export function textoDe(
    textos: Configuracao['textos'] | undefined,
    chave: ChaveTexto,
    variaveis: Record<string, string | number> = {},
): string {
    const definicao = POR_CHAVE.get(chave);

    if (!definicao) {
        return '';
    }

    const personalizado = textos?.[chave];

    if (definicao.podeOcultar && personalizado?.mostrar === false) {
        return '';
    }

    const texto = personalizado?.texto?.trim() ? personalizado.texto.trim() : definicao.padrao;

    return interpolar(texto, variaveis);
}

export function escaparHtml(texto: string): string {
    return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** Texto simples para HTML seguro: escapa tudo e transforma quebras de linha em <br>. */
export function paraHtml(texto: string): string {
    return escaparHtml(texto).replace(/\r?\n/g, '<br>');
}
