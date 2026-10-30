import { normalizarWhatsapp, problemaNoWhatsapp } from '@/lib/whatsapp';
import { adminAtivo, origemConfiavel, sessaoAdminValida } from '@/server/admin';
import { corrigirWhatsapp, descartarAnonimo, listarEnvios, marcarEnviado } from '@/server/envios';

// Sempre fresca: a lista muda a cada partida concluida e o tempo dos anonimos corre.
export const dynamic = 'force-dynamic';

const SEM_CACHE = { 'Cache-Control': 'no-store' };

/** So a equipe (sessao do administrador) entra. Pedidos que alteram algo tambem conferem a origem. */
async function autorizar(request: Request, altera: boolean): Promise<Response | null> {
    if (!adminAtivo() || !(await sessaoAdminValida())) {
        return Response.json({ erro: 'Entre para continuar.' }, { status: 401, headers: SEM_CACHE });
    }

    if (altera && !origemConfiavel(request)) {
        return Response.json({ erro: 'Pedido recusado.' }, { status: 403, headers: SEM_CACHE });
    }

    return null;
}

const idValido = (valor: unknown): valor is number => typeof valor === 'number' && Number.isInteger(valor) && valor > 0;

/** Lista os resultados: quem se cadastrou e os anonimos que ainda estao dentro do prazo. */
export async function GET(request: Request) {
    const recusa = await autorizar(request, false);

    if (recusa) {
        return recusa;
    }

    try {
        return Response.json(await listarEnvios(), { headers: SEM_CACHE });
    } catch (erro) {
        console.error('Falha ao listar os envios:', erro);

        return Response.json({ erro: 'Não foi possível carregar a lista agora.' }, { status: 503, headers: SEM_CACHE });
    }
}

/**
 * Corpo: { acao: 'enviado', id, enviado } marca ou desmarca como enviado;
 * { acao: 'whatsapp', id, whatsapp } corrige o numero de quem se cadastrou.
 */
export async function POST(request: Request) {
    const recusa = await autorizar(request, true);

    if (recusa) {
        return recusa;
    }

    const corpo = (await request.json().catch(() => null)) as { acao?: unknown; id?: unknown; enviado?: unknown; whatsapp?: unknown } | null;

    if (!idValido(corpo?.id)) {
        return Response.json({ erro: 'Resultado inválido.' }, { status: 422, headers: SEM_CACHE });
    }

    try {
        if (corpo.acao === 'enviado') {
            const ok = await marcarEnviado(corpo.id, corpo.enviado !== false);

            return ok
                ? Response.json({ ok: true }, { headers: SEM_CACHE })
                : Response.json({ erro: 'Este resultado não existe mais (pode ter passado do prazo).' }, { status: 404, headers: SEM_CACHE });
        }

        if (corpo.acao === 'whatsapp') {
            const informado = typeof corpo.whatsapp === 'string' ? corpo.whatsapp : '';
            const numero = normalizarWhatsapp(informado);

            if (!numero) {
                return Response.json({ erro: problemaNoWhatsapp(informado) }, { status: 422, headers: SEM_CACHE });
            }

            return (await corrigirWhatsapp(corpo.id, numero))
                ? Response.json({ whatsapp: numero }, { headers: SEM_CACHE })
                : Response.json({ erro: 'Cadastro não encontrado.' }, { status: 404, headers: SEM_CACHE });
        }

        return Response.json({ erro: 'Ação desconhecida.' }, { status: 422, headers: SEM_CACHE });
    } catch (erro) {
        console.error('Falha ao atualizar o envio:', erro);

        return Response.json({ erro: 'Não foi possível gravar agora. Tente de novo em instantes.' }, { status: 503, headers: SEM_CACHE });
    }
}

/** Descarta o resultado de quem jogou sem cadastro: /api/admin/envios?id=123. */
export async function DELETE(request: Request) {
    const recusa = await autorizar(request, true);

    if (recusa) {
        return recusa;
    }

    const id = Number(new URL(request.url).searchParams.get('id'));

    if (!idValido(id)) {
        return Response.json({ erro: 'Resultado inválido.' }, { status: 422, headers: SEM_CACHE });
    }

    try {
        // Se ja nao existe (passou do prazo ou outra pessoa descartou), o resultado e o mesmo: nao esta mais la.
        await descartarAnonimo(id);

        return Response.json({ ok: true }, { headers: SEM_CACHE });
    } catch (erro) {
        console.error('Falha ao descartar o resultado:', erro);

        return Response.json({ erro: 'Não foi possível descartar agora. Tente de novo em instantes.' }, { status: 503, headers: SEM_CACHE });
    }
}
