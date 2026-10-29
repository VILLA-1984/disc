import { normalizarWhatsapp, problemaNoWhatsapp } from '@/lib/whatsapp';
import { atualizarWhatsapp, criarParticipante } from '@/server/db';
import { assinar, verificar } from '@/server/token';

/**
 * Corrige o WhatsApp no fim do jogo; o token da partida prova quem esta corrigindo.
 *
 * Partida sem cadastro (id 0): se a pessoa decidiu receber o resultado, informa o nome junto com o numero, o
 * cadastro e criado agora e a resposta traz um token novo, com o id do cadastro, para as correcoes seguintes.
 */
export async function POST(request: Request) {
    const corpo = (await request.json().catch(() => null)) as { token?: unknown; whatsapp?: unknown; nome?: unknown } | null;
    const carga = verificar(corpo?.token);

    if (!carga) {
        return Response.json({ erro: 'Esta partida expirou. Recarregue a página.' }, { status: 401 });
    }

    const informado = typeof corpo?.whatsapp === 'string' ? corpo.whatsapp : '';
    const whatsapp = normalizarWhatsapp(informado);

    if (!whatsapp) {
        return Response.json({ erro: problemaNoWhatsapp(informado) }, { status: 422 });
    }

    if (carga.p === 0) {
        const nome = typeof corpo?.nome === 'string' ? corpo.nome.trim().replace(/\s+/g, ' ') : '';

        if (nome.length < 2 || nome.length > 80) {
            return Response.json({ erro: 'Informe o seu nome (entre 2 e 80 letras).' }, { status: 422 });
        }

        try {
            const id = await criarParticipante(nome, whatsapp);

            return Response.json({ whatsapp, token: assinar(id, (carga.c ?? carga.r)!) });
        } catch (erro) {
            console.error('Falha ao gravar o cadastro:', erro);

            return Response.json({ erro: 'Não foi possível gravar o seu cadastro agora. Tente de novo em instantes.' }, { status: 503 });
        }
    }

    if (!(await atualizarWhatsapp(carga.p, whatsapp))) {
        return Response.json({ erro: 'Cadastro não encontrado.' }, { status: 404 });
    }

    return Response.json({ whatsapp });
}
