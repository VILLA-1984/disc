import { cookies } from 'next/headers';
import { COOKIE_ADMIN, origemConfiavel } from '@/server/admin';

/** Sai da area de gerenciamento (apaga o cookie). */
export async function POST(request: Request) {
    if (!origemConfiavel(request)) {
        return Response.json({ erro: 'Pedido recusado.' }, { status: 403 });
    }

    (await cookies()).delete(COOKIE_ADMIN);

    return Response.json({ ok: true });
}
