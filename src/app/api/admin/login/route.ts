import { cookies } from 'next/headers';
import { COOKIE_ADMIN, DURACAO_COOKIE_ADMIN, adminAtivo, ehHttps, origemConfiavel, senhaConfere } from '@/server/admin';
import { assinarSessaoAdmin } from '@/server/token';

/** Entra na area de gerenciamento com a senha de RUA_ADMIN_SENHA. */
export async function POST(request: Request) {
    if (!adminAtivo()) {
        return Response.json({ erro: 'A área de gerenciamento está desativada: defina RUA_ADMIN_SENHA.' }, { status: 503 });
    }

    if (!origemConfiavel(request)) {
        return Response.json({ erro: 'Pedido recusado.' }, { status: 403 });
    }

    const corpo = (await request.json().catch(() => null)) as { senha?: unknown } | null;

    if (typeof corpo?.senha !== 'string' || !senhaConfere(corpo.senha)) {
        // Uma pausa em cada erro atrapalha quem tenta adivinhar a senha.
        await new Promise((resolver) => setTimeout(resolver, 800));

        return Response.json({ erro: 'Senha incorreta.' }, { status: 401 });
    }

    (await cookies()).set(COOKIE_ADMIN, assinarSessaoAdmin(), {
        httpOnly: true,
        sameSite: 'lax',
        secure: ehHttps(request),
        path: '/',
        maxAge: DURACAO_COOKIE_ADMIN,
    });

    return Response.json({ ok: true });
}
