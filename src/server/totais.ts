import { ANIMAIS } from '../jogo/animais-dados.js';
import { lerTotais } from './db';

/** Um perfil no ranking: o animal (ou "equilibrado"), a cor e quantas pessoas ja ficaram com ele. */
export type TotalDoAnimal = { chave: string; nome: string; cor: string; total: number };
export type Totais = { total: number; animais: TotalDoAnimal[] };

/**
 * Totais publicos de um evento (ou, com null, das partidas sem evento): quantas partidas foram concluidas e quantas deram
 * cada animal, na ordem D, I, S, C e equilibrado (quem mostra e que ordena). Sao so contadores, sem nome, telefone ou qualquer dado que identifique alguem.
 */
export async function montarTotais(eventoId: number | null = null): Promise<Totais> {
    const { total, porAnimal } = await lerTotais(eventoId);
    const animais: TotalDoAnimal[] = Object.values(ANIMAIS).map((a) => ({ chave: a.chave, nome: a.nome, cor: a.cor, total: porAnimal[a.chave] ?? 0 }));
    animais.push({ chave: 'equilibrado', nome: 'Equilibrado', cor: '#8a97a8', total: porAnimal.equilibrado ?? 0 });

    return { total, animais };
}
