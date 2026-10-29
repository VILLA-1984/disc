import { normalizarWhatsapp, problemaNoWhatsapp } from '@/lib/whatsapp';
import { escolherPorEtapa, montarCiclo } from '@/server/ciclo';
import { criarParticipante } from '@/server/db';
import { montarRodada, portoesPorEtapa, RodadaInvalida } from '@/server/gameRound';
import { PALAVRA_POR_ID, PALAVRAS } from '@/server/palavras';
import { assinar } from '@/server/token';

/**
 * Cadastra nome e WhatsApp, monta a partida no servidor e devolve so id e texto das palavras.
 * Modo padrao: ciclo (uma palavra por vez; RUA_MODO=pares volta aos portoes com duas palavras).
 */
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

    const emPares = process.env.RUA_MODO === 'pares';
    let rodada;
    let ciclo;

    try {
        if (emPares) {
            rodada = montarRodada(PALAVRAS, portoesPorEtapa(Number(process.env.RUA_PORTOES) || null));
        } else {
            ciclo = montarCiclo(PALAVRAS, escolherPorEtapa(PALAVRAS.length, Number(process.env.RUA_ESCOLHER) || null));
        }
    } catch (erro) {
        if (erro instanceof RodadaInvalida) {
            return Response.json({ erro: 'O teste ainda não está pronto. Avise o responsável.' }, { status: 503 });
        }

        throw erro;
    }

    let participanteId: number;

    try {
        participanteId = await criarParticipante(nome, whatsapp);
    } catch (erro) {
        // Banco indisponivel (por exemplo, Turso fora do ar ou token errado): nao deixa a pessoa sem saber o que houve.
        console.error('Falha ao gravar o cadastro:', erro);

        return Response.json({ erro: 'Não foi possível gravar o seu cadastro agora. Tente de novo em instantes.' }, { status: 503 });
    }

    if (ciclo) {
        const palavras = Object.fromEntries(PALAVRAS.map((p) => [p.id, p.word]));

        return Response.json({ token: assinar(participanteId, ciclo), ciclo: { ...ciclo, palavras } });
    }

    const palavra = (id: number) => ({ id, word: PALAVRA_POR_ID.get(id)!.word });
    const etapas = rodada!.map((portoes) => portoes.map((p) => ({ cima: palavra(p.top), baixo: palavra(p.bottom) })));

    return Response.json({ token: assinar(participanteId, rodada!), etapas });
}
