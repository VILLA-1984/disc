import { normalizarWhatsapp, problemaNoWhatsapp } from '@/lib/whatsapp';
import { atualizarWhatsapp } from '@/server/db';
import { verificar } from '@/server/token';

/** Corrige o WhatsApp no fim do jogo; o token da partida prova quem esta corrigindo. */
export async function POST(request: Request) {
    const corpo = (await request.json().catch(() => null)) as { token?: unknown; whatsapp?: unknown } | null;
    const carga = verificar(corpo?.token);

    if (!carga) {
        return Response.json({ erro: 'Esta partida expirou. Recarregue a página.' }, { status: 401 });
    }

    const informado = typeof corpo?.whatsapp === 'string' ? corpo.whatsapp : '';
    const whatsapp = normalizarWhatsapp(informado);

    if (!whatsapp) {
        return Response.json({ erro: problemaNoWhatsapp(informado) }, { status: 422 });
    }

    if (!(await atualizarWhatsapp(carga.p, whatsapp))) {
        return Response.json({ erro: 'Cadastro não encontrado.' }, { status: 404 });
    }

    return Response.json({ whatsapp });
}
