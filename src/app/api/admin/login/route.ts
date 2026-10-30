import { cookies } from 'next/headers';
import { COOKIE_ADMIN, DURACAO_COOKIE_ADMIN, adminAtivo, credenciaisConferem, ehHttps, origemConfiavel } from '@/server/admin';
import { assinarSessaoAdmin } from '@/server/token';

/** Entra na area de gerenciamento com o usuario e a senha de USER_AREA_ADM / PASS_AREA_ADM. */
export async function POST(request: Request) {
    if (!adminAtivo()) {
        return Response.json({ erro: 'A área de gerenciamento está desativada: defina USER_AREA_ADM e PASS_AREA_ADM.' }, { status: 503 });
    }

    if (!origemConfiavel(request)) {
        return Response.json({ erro: 'Pedido recusado.' }, { status: 403 });
    }

    const corpo = (await request.json().catch(() => null)) as { usuario?: unknown; senha?: unknown } | null;

    if (typeof corpo?.usuario !== 'string' || typeof corpo?.senha !== 'string' || !credenciaisConferem(corpo.usuario, corpo.senha)) {
        // Uma pausa em cada erro atrapalha quem tenta adivinhar o acesso.
        await new Promise((resolver) => setTimeout(resolver, 800));

        return Response.json({ erro: 'Usuário ou senha incorretos.' }, { status: 401 });
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
