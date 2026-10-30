import { buscarEvento } from '@/server/eventos';
import { montarTotais } from '@/server/totais';

// Sempre fresco: o ranking do jogo, da tela inicial e do telao mostra quantas pessoas ja jogaram.
export const dynamic = 'force-dynamic';

const SEM_CACHE = { 'Cache-Control': 'no-store' };

/**
 * Totais publicos do ranking: quantas partidas foram concluidas e quantas deram cada animal. Sao so contadores,
 * sem nome, telefone ou qualquer dado que identifique alguem. `?evento=<slug>` traz o ranking de um evento; sem o
 * parametro, o das partidas feitas sem evento.
 */
export async function GET(request: Request) {
    try {
        const slug = new URL(request.url).searchParams.get('evento');
        let eventoId: number | null = null;

        if (slug !== null) {
            const evento = await buscarEvento(slug);

            if (!evento) {
                return Response.json({ erro: 'Evento não encontrado.' }, { status: 404, headers: SEM_CACHE });
            }

            eventoId = evento.id;
        }

        return Response.json(await montarTotais(eventoId), { headers: SEM_CACHE });
    } catch (erro) {
        console.error('Falha ao ler os totais:', erro);

        return Response.json({ erro: 'Totais indisponíveis.' }, { status: 503, headers: SEM_CACHE });
    }
}
