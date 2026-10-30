import { adminAtivo, origemConfiavel, sessaoAdminValida } from '@/server/admin';
import { alterarEvento, conferirNome, criarEvento, listarEventos } from '@/server/eventos';

// Sempre fresca: os totais de cada evento mudam a cada partida.
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

/** Lista os eventos, com quantas partidas cada um ja contou. */
export async function GET(request: Request) {
    const recusa = await autorizar(request, false);

    if (recusa) {
        return recusa;
    }

    try {
        return Response.json({ eventos: await listarEventos() }, { headers: SEM_CACHE });
    } catch (erro) {
        console.error('Falha ao listar os eventos:', erro);

        return Response.json({ erro: 'Não foi possível carregar os eventos agora.' }, { status: 503, headers: SEM_CACHE });
    }
}

/** Cria um evento. Corpo: { nome }. Ele nasce ligado, com um endereco proprio gerado do nome. */
export async function POST(request: Request) {
    const recusa = await autorizar(request, true);

    if (recusa) {
        return recusa;
    }

    const corpo = (await request.json().catch(() => null)) as { nome?: unknown } | null;
    const nome = conferirNome(corpo?.nome);

    if (!nome.ok) {
        return Response.json({ erro: nome.erro }, { status: 422, headers: SEM_CACHE });
    }

    try {
        return Response.json({ evento: await criarEvento(nome.nome) }, { status: 201, headers: SEM_CACHE });
    } catch (erro) {
        console.error('Falha ao criar o evento:', erro);

        return Response.json({ erro: 'Não foi possível criar o evento agora. Tente de novo em instantes.' }, { status: 503, headers: SEM_CACHE });
    }
}

/** Liga, desliga ou renomeia um evento. Corpo: { id, ativo? , nome? }. O endereco nao muda (links e QR codes ja impressos continuam valendo). */
export async function PATCH(request: Request) {
    const recusa = await autorizar(request, true);

    if (recusa) {
        return recusa;
    }

    const corpo = (await request.json().catch(() => null)) as { id?: unknown; ativo?: unknown; nome?: unknown } | null;

    if (typeof corpo?.id !== 'number' || !Number.isInteger(corpo.id) || corpo.id <= 0) {
        return Response.json({ erro: 'Evento inválido.' }, { status: 422, headers: SEM_CACHE });
    }

    const campos: { ativo?: boolean; nome?: string } = {};

    if (corpo.ativo !== undefined) {
        if (typeof corpo.ativo !== 'boolean') {
            return Response.json({ erro: 'Valor inválido para ligar ou desligar.' }, { status: 422, headers: SEM_CACHE });
        }

        campos.ativo = corpo.ativo;
    }

    if (corpo.nome !== undefined) {
        const nome = conferirNome(corpo.nome);

        if (!nome.ok) {
            return Response.json({ erro: nome.erro }, { status: 422, headers: SEM_CACHE });
        }

        campos.nome = nome.nome;
    }

    try {
        const evento = await alterarEvento(corpo.id, campos);

        return evento
            ? Response.json({ evento }, { headers: SEM_CACHE })
            : Response.json({ erro: 'Evento não encontrado.' }, { status: 404, headers: SEM_CACHE });
    } catch (erro) {
        console.error('Falha ao atualizar o evento:', erro);

        return Response.json({ erro: 'Não foi possível gravar agora. Tente de novo em instantes.' }, { status: 503, headers: SEM_CACHE });
    }
}
