/**
 * Os quatro animais do relatorio: mesmo mapeamento e mesmos textos do relatorio normal
 * (App\Services\AnimalProfileMapper). Aqui so se acrescenta a camada ludica do jogo (frase do
 * animal e "no time"). Sem dependencias do navegador, para poder ser testado no Node.
 *
 * O animal e uma releitura do DISC, nao outro instrumento: sai dos mesmos percentuais por fator.
 */

export const FATOR_ANIMAL = { D: 'tubarao', I: 'aguia', S: 'gato', C: 'lobo' };

export const ANIMAIS = {
    tubarao: {
        chave: 'tubarao', nome: 'Tubarão', artigo: 'um', fator: 'D', cor: '#e34948',
        resumo: 'Focado em resultados, competitivo e rápido na tomada de decisões.',
        forte: 'Decide sob pressão e não perde tempo com rodeios. Puxa a execução quando o grupo trava.',
        atencao: 'A pressa pode atropelar quem precisa de mais contexto, e a objetividade às vezes soa dura.',
        slogan: 'Foco no alvo, sem desviar.',
        emTime: 'No time, você é quem faz a ideia virar entrega.',
    },
    aguia: {
        chave: 'aguia', nome: 'Águia', artigo: 'uma', fator: 'I', cor: '#eda100',
        resumo: 'Criativo, visionário e inovador; gosta de liberdade e de ideias novas.',
        forte: 'Enxerga longe e entusiasma o grupo em torno de uma ideia. Traz caminhos que ninguém tinha visto.',
        atencao: 'Pode se dispersar entre projetos e deixar o detalhe da execução para trás.',
        slogan: 'Do alto, a vista é outra.',
        emTime: 'No time, você é quem faz todo mundo enxergar mais longe.',
    },
    gato: {
        chave: 'gato', nome: 'Gato', artigo: 'um', fator: 'S', cor: '#008300',
        resumo: 'Comunicativo, colaborativo, busca harmonia e bom relacionamento.',
        forte: 'Sustenta o clima do time e escuta antes de julgar. As pessoas confiam nele.',
        atencao: 'Evita o confronto necessário e pode adiar a conversa difícil para preservar a harmonia.',
        slogan: 'Presença calma que une a turma.',
        emTime: 'No time, você é a cola que mantém todo mundo junto.',
    },
    lobo: {
        chave: 'lobo', nome: 'Lobo', artigo: 'um', fator: 'C', cor: '#2a78d6',
        resumo: 'Organizado, planejador, analítico e orientado a processos.',
        forte: 'Antecipa o que pode dar errado e mantém o padrão. O trabalho dele não precisa ser refeito.',
        atencao: 'Pode travar diante de dados incompletos e ter pouca tolerância ao improviso.',
        slogan: 'A matilha anda melhor com um bom plano.',
        emTime: 'No time, você é quem garante que o plano funcione.',
    },
};

export const ORDEM_FATORES = ['D', 'I', 'S', 'C'];

/** Diferenca maxima, em pontos percentuais, para mostrar o segundo animal (igual ao AnimalProfileMapper). */
export const MARGEM_SECUNDARIO = 10;

/** Fatores muito proximos entre si: sem estilo predominante (igual ao ResultInsights::isEqualized). */
export const MARGEM_EQUALIZADO = 6;

/**
 * Animal principal e secundario a partir dos percentuais por fator, com as mesmas regras do relatorio:
 * perfil equalizado nao aponta animal; o segundo so aparece quando esta a menos de 10 pontos do primeiro.
 *
 * @param {Record<string, number>} percentuais
 * @param {Record<string, object>} [animais] tabela de animais (padrao: ANIMAIS; a pagina passa a com as silhuetas)
 */
export function resolverAnimais(percentuais, animais = ANIMAIS) {
    const valores = ORDEM_FATORES.map((f) => ({ fator: f, valor: percentuais[f] ?? 0 }));
    const soma = valores.reduce((total, v) => total + v.valor, 0);
    const maximo = Math.max(...valores.map((v) => v.valor));
    const minimo = Math.min(...valores.map((v) => v.valor));

    if (soma <= 0) {
        return { principal: null, secundario: null, equalizado: false };
    }

    if (maximo - minimo <= MARGEM_EQUALIZADO) {
        return { principal: null, secundario: null, equalizado: true };
    }

    // Ordena do maior para o menor; empate mantem a ordem D, I, S, C.
    const ordenados = [...valores].sort((a, b) => b.valor - a.valor);
    const principal = animais[FATOR_ANIMAL[ordenados[0].fator]];
    const secundario = ordenados[0].valor - ordenados[1].valor < MARGEM_SECUNDARIO
        ? animais[FATOR_ANIMAL[ordenados[1].fator]]
        : null;

    return { principal, secundario, equalizado: false };
}
