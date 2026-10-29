import { ANIMAIS } from '@/jogo/animais-dados.js';
import { lerTotais } from '@/server/db';

// Sempre fresco: o painel do jogo mostra quantas pessoas ja jogaram.
export const dynamic = 'force-dynamic';

/**
 * Totais publicos do painel: quantas partidas foram concluidas e quantas deram cada animal. Sao so contadores,
 * sem nome, telefone ou qualquer dado que identifique alguem.
 */
export async function GET() {
    try {
        const { total, porAnimal } = await lerTotais();
        const animais = Object.values(ANIMAIS).map((a) => ({ chave: a.chave, nome: a.nome, cor: a.cor, total: porAnimal[a.chave] ?? 0 }));
        animais.push({ chave: 'equilibrado', nome: 'Equilibrado', cor: '#8a97a8', total: porAnimal.equilibrado ?? 0 });

        return Response.json({ total, animais }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (erro) {
        console.error('Falha ao ler os totais:', erro);

        return Response.json({ erro: 'Totais indisponíveis.' }, { status: 503 });
    }
}
