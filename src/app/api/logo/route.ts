import { lerLogo } from '@/server/logo';

// A logo muda na area de gerenciamento: nada de resposta guardada pelo Next.
export const dynamic = 'force-dynamic';

/**
 * Entrega a logo. O endereco leva ?v=<versao>, que muda a cada envio, entao o navegador pode guardar a imagem por
 * muito tempo sem mostrar uma logo velha depois de uma troca. Sem a versao no endereco, a imagem nunca fica guardada.
 */
export async function GET(request: Request) {
    const logo = await lerLogo();

    if (!logo) {
        return new Response(null, { status: 404 });
    }

    return new Response(new Uint8Array(logo.bytes), {
        headers: {
            'Content-Type': logo.tipo,
            'Cache-Control': new URL(request.url).searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'no-store',
            'X-Content-Type-Options': 'nosniff',
            // Mesmo que alguem abra a imagem direto no navegador, nada nela roda.
            'Content-Security-Policy': "default-src 'none'; sandbox",
        },
    });
}
