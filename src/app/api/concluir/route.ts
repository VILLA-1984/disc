import { RodadaInvalida, resolverEscolhas } from '@/server/gameRound';
import { PALAVRAS } from '@/server/palavras';
import { resumir } from '@/server/pontuacao';
import { verificar } from '@/server/token';

/** Confere as escolhas contra a rodada assinada e devolve a pontuacao. Nada do resultado e gravado. */
export async function POST(request: Request) {
    const corpo = (await request.json().catch(() => null)) as { token?: unknown; escolhas?: unknown } | null;
    const carga = verificar(corpo?.token);

    if (!carga) {
        return Response.json({ erro: 'Não foi possível validar esta partida. Recarregue a página e comece de novo.' }, { status: 401 });
    }

    try {
        const resolvidas = resolverEscolhas(carga.r, corpo?.escolhas);
        const idsPorEtapa = [0, 1].map((etapa) => resolvidas.filter((r) => r.etapa === etapa).map((r) => r.escolhida));

        return Response.json({
            natural: resumir(idsPorEtapa[0], PALAVRAS),
            adaptado: resumir(idsPorEtapa[1], PALAVRAS),
        });
    } catch (erro) {
        if (erro instanceof RodadaInvalida) {
            return Response.json({ erro: erro.message }, { status: 422 });
        }

        throw erro;
    }
}
