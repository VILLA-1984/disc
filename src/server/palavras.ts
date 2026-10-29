import lista from './palavras.json';
import type { Palavra } from './gameRound';

/**
 * Lista de palavras com o fator DISC de cada uma. Fica so no servidor: o fator e a chave da pontuacao
 * e nunca vai para o navegador.
 *
 * ATENCAO: e a lista rascunho do sistema (conjunto 2), ainda nao validada por profissional com formacao
 * em DISC. Revise palavra por palavra antes de usar com candidato real.
 */
export const PALAVRAS: Palavra[] = lista as Palavra[];

export const PALAVRA_POR_ID = new Map(PALAVRAS.map((p) => [p.id, p]));
