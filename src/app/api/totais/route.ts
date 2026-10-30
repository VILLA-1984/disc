import { montarTotais } from '@/server/totais';

// Sempre fresco: o painel do jogo mostra quantas pessoas ja jogaram.
export const dynamic = 'force-dynamic';

/**
 * Totais publicos do painel: quantas partidas foram concluidas e quantas deram cada animal. Sao so contadores,
 * sem nome, telefone ou qualquer dado que identifique alguem.
 */
export async function GET() {
    try {
        return Response.json(await montarTotais(), { headers: { 'Cache-Control': 'no-store' } });
    } catch (erro) {
        console.error('Falha ao ler os totais:', erro);

        return Response.json({ erro: 'Totais indisponíveis.' }, { status: 503 });
    }
}
