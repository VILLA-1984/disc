import { resolverAnimais } from '../jogo/animais-dados.js';

export type Resumo = { percentual: Record<string, number>; total: number };

const FATORES = ['D', 'I', 'S', 'C'] as const;

function linhaPercentuais(percentual: Record<string, number>): string {
    return FATORES.map((f) => `${f} ${Math.round(percentual[f] ?? 0)}%`).join(' · ');
}

/** Texto enviado pelo WhatsApp: o animal e as proporcoes, no mesmo tom do relatorio do jogo. */
export function montarMensagem(nome: string, natural: Resumo, adaptado: Resumo): string {
    const primeiroNome = nome.trim().split(/\s+/)[0] ?? '';
    const nat = resolverAnimais(natural.percentual);
    const adp = resolverAnimais(adaptado.percentual);
    const saudacao = primeiroNome ? `Olá, ${primeiroNome}!` : 'Olá!'; // quem joga sem cadastro pode nao ter informado o nome
    const linhas: string[] = [`${saudacao} Este é o seu resultado na Rua das Palavras (SENAC-MT).`, ''];

    if (nat.principal) {
        linhas.push(`Seu animal: ${nat.principal.nome}. ${nat.principal.slogan}`);

        if (nat.secundario) {
            linhas.push(`Com traços de ${nat.secundario.nome}.`);
        }

        linhas.push(nat.principal.resumo, '', `Superpoder: ${nat.principal.forte}`, `Para ficar de olho: ${nat.principal.atencao}`);
    } else {
        linhas.push('Seu resultado ficou equilibrado entre os quatro animais, sem um estilo predominante.');
    }

    linhas.push('', `Como você é: ${linhaPercentuais(natural.percentual)}`);
    linhas.push(`Como esperam de você: ${linhaPercentuais(adaptado.percentual)}`);

    if (nat.principal && adp.principal && nat.principal.chave !== adp.principal.chave) {
        linhas.push('', `No trabalho, o seu lado ${adp.principal.nome} fala mais alto.`);
    }

    linhas.push('', 'É uma leitura lúdica das suas escolhas, não um diagnóstico: mostra tendências do momento.');

    return linhas.join('\n');
}
