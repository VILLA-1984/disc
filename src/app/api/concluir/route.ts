import { resolverCiclo } from '@/server/ciclo';
import { RodadaInvalida, resolverEscolhas } from '@/server/gameRound';
import { PALAVRAS } from '@/server/palavras';
import { resumir } from '@/server/pontuacao';
import { verificar } from '@/server/token';

/** Confere as escolhas contra a partida assinada e devolve a pontuacao. Nada do resultado e gravado. */
export async function POST(request: Request) {
    const corpo = (await request.json().catch(() => null)) as { token?: unknown; escolhas?: unknown } | null;
    const carga = verificar(corpo?.token);

    if (!carga) {
        return Response.json({ erro: 'Não foi possível validar esta partida. Recarregue a página e comece de novo.' }, { status: 401 });
    }

    try {
        if (carga.c) {
            // A pontuacao usa so as palavras escolhidas (pegas + as que entraram sozinhas no fim).
            const etapas = resolverCiclo(carga.c, corpo?.escolhas);

            return Response.json({
                natural: resumir(etapas[0].escolhidas, PALAVRAS),
                adaptado: resumir(etapas[1].escolhidas, PALAVRAS),
                ciclo: etapas.map((e) => ({ automaticas: e.automaticas, voltas: e.voltas })),
            });
        }

        const resolvidas = resolverEscolhas(carga.r!, corpo?.escolhas);
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
