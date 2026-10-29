import { normalizarWhatsapp, problemaNoWhatsapp } from '@/lib/whatsapp';
import { criarParticipante } from '@/server/db';
import { montarRodada, portoesPorEtapa, RodadaInvalida } from '@/server/gameRound';
import { PALAVRA_POR_ID, PALAVRAS } from '@/server/palavras';
import { assinar } from '@/server/token';

/** Cadastra nome e WhatsApp, monta os portoes no servidor e devolve so id e texto das palavras. */
export async function POST(request: Request) {
    const corpo = (await request.json().catch(() => null)) as { nome?: unknown; whatsapp?: unknown } | null;
    const nome = typeof corpo?.nome === 'string' ? corpo.nome.trim().replace(/\s+/g, ' ') : '';
    const whatsappInformado = typeof corpo?.whatsapp === 'string' ? corpo.whatsapp : '';

    if (nome.length < 2 || nome.length > 80) {
        return Response.json({ erro: 'Informe o seu nome (entre 2 e 80 letras).' }, { status: 422 });
    }

    const whatsapp = normalizarWhatsapp(whatsappInformado);

    if (!whatsapp) {
        return Response.json({ erro: problemaNoWhatsapp(whatsappInformado) }, { status: 422 });
    }

    let rodada;

    try {
        rodada = montarRodada(PALAVRAS, portoesPorEtapa(Number(process.env.RUA_PORTOES) || null));
    } catch (erro) {
        if (erro instanceof RodadaInvalida) {
            return Response.json({ erro: 'O teste ainda não está pronto. Avise o responsável.' }, { status: 503 });
        }

        throw erro;
    }

    const participanteId = criarParticipante(nome, whatsapp);

    const palavra = (id: number) => ({ id, word: PALAVRA_POR_ID.get(id)!.word });
    const etapas = rodada.map((portoes) => portoes.map((p) => ({ cima: palavra(p.top), baixo: palavra(p.bottom) })));

    return Response.json({ token: assinar(participanteId, rodada), etapas });
}
