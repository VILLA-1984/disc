import { resolverAnimais } from '@/jogo/animais-dados.js';
import { resolverCiclo } from '@/server/ciclo';
import { registrarPartida } from '@/server/db';
import { guardarResultado } from '@/server/envios';
import { RodadaInvalida, resolverEscolhas } from '@/server/gameRound';
import { PALAVRAS } from '@/server/palavras';
import { resumir } from '@/server/pontuacao';
import { verificar } from '@/server/token';

/**
 * Conta a partida concluida no painel de totais: so o animal do resultado e um codigo aleatorio da partida, sem
 * nome nem telefone. Uma falha aqui nunca pode estragar o resultado de quem jogou.
 */
async function contar(codigo: string | undefined, natural: { percentual: Record<string, number> }) {
    if (!codigo) {
        return; // token antigo, de antes do contador
    }

    try {
        await registrarPartida(codigo, resolverAnimais(natural.percentual).principal?.chave ?? 'equilibrado');
    } catch (erro) {
        console.error('Falha ao contar a partida:', erro);
    }
}

/**
 * Guarda o resumo (so os percentuais por fator) para a equipe enviar pelo WhatsApp na tela /whatsapp. Quem jogou sem
 * cadastro recebe um ID e o resultado some em 5 minutos. Uma falha aqui nunca estraga o resultado de quem jogou: sem
 * o ID, a tela do jogo explica que o envio nao ficou disponivel.
 */
async function guardar(
    carga: { p: number; n?: string },
    natural: { percentual: Record<string, number>; total: number },
    adaptado: { percentual: Record<string, number>; total: number },
) {
    if (!carga.n) {
        return null; // token antigo, de antes desta tela
    }

    try {
        return await guardarResultado(carga.n, carga.p, { natural, adaptado });
    } catch (erro) {
        console.error('Falha ao guardar o resultado para envio:', erro);

        return null;
    }
}

/** Confere as escolhas contra a partida assinada e devolve a pontuacao e os dados do envio. */
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
            const natural = resumir(etapas[0].escolhidas, PALAVRAS);
            const adaptado = resumir(etapas[1].escolhidas, PALAVRAS);
            await contar(carga.n, natural);

            return Response.json({
                natural,
                adaptado,
                ciclo: etapas.map((e) => ({ automaticas: e.automaticas, voltas: e.voltas })),
                envio: await guardar(carga, natural, adaptado),
            });
        }

        const resolvidas = resolverEscolhas(carga.r!, corpo?.escolhas);
        const idsPorEtapa = [0, 1].map((etapa) => resolvidas.filter((r) => r.etapa === etapa).map((r) => r.escolhida));
        const natural = resumir(idsPorEtapa[0], PALAVRAS);
        const adaptado = resumir(idsPorEtapa[1], PALAVRAS);
        await contar(carga.n, natural);

        return Response.json({ natural, adaptado, envio: await guardar(carga, natural, adaptado) });
    } catch (erro) {
        if (erro instanceof RodadaInvalida) {
            return Response.json({ erro: erro.message }, { status: 422 });
        }

        throw erro;
    }
}
