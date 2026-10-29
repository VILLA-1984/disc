import { ANIMAIS as DADOS, resolverAnimais as resolver } from './animais-dados.js';
import { SILHUETAS } from './animais-silhuetas.js';

export { FATOR_ANIMAL, ORDEM_FATORES } from './animais-dados.js';

/** Animais com a silhueta (path SVG, viewBox 512) para o relatorio do jogo. */
export const ANIMAIS = Object.fromEntries(
    Object.entries(DADOS).map(([chave, animal]) => [chave, { ...animal, svgPath: SILHUETAS[chave] ?? '' }]),
);

/** Mesmas regras do relatorio normal, devolvendo os animais ja com a silhueta. */
export function resolverAnimais(percentuais) {
    return resolver(percentuais, ANIMAIS);
}
