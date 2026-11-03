import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { adminAtivo, sessaoAdminValida } from '@/server/admin';

/**
 * Documentacao tecnica (MkDocs), so para a equipe: serve os arquivos de docs-site/ (gerados por `npm run docs`) depois de
 * conferir a sessao da area de gerenciamento, o mesmo usuario e senha de /admin. Sem sessao, vai para o login.
 */
const RAIZ = path.join(process.cwd(), 'docs-site');

// Atalho fixo de volta ao painel, colocado em cada pagina HTML na hora de servir (o site do MkDocs nao precisa ser regerado).
const LINK_PAINEL = '<a href="/admin" style="position:fixed;right:12px;bottom:12px;z-index:9999;padding:8px 14px;font:600 14px/1 system-ui,sans-serif;color:#fff;background:#0d2b4e;border-radius:999px;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.3)">← Painel da equipe</a>';

const TIPOS: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
};

export async function GET(request: Request, { params }: { params: Promise<{ caminho?: string[] }> }) {
    if (!adminAtivo() || !(await sessaoAdminValida())) {
        return Response.redirect(new URL('/admin?voltar=/docs', request.url), 303);
    }

    const { caminho = [] } = await params;

    // Os links do MkDocs sao relativos: a pagina inicial precisa de um nome de arquivo para eles resolverem em /docs/.
    if (caminho.length === 0) {
        return Response.redirect(new URL('/docs/index.html', request.url), 307);
    }

    if (caminho.some((parte) => parte === '' || parte === '.' || parte === '..' || parte.includes('\\') || parte.includes('\0'))) {
        return new Response('Não encontrado.', { status: 404 });
    }

    const arquivo = path.join(RAIZ, ...caminho);

    if (!arquivo.startsWith(RAIZ + path.sep)) {
        return new Response('Não encontrado.', { status: 404 });
    }

    try {
        const bytes = await readFile(arquivo);
        const html = path.extname(arquivo).toLowerCase() === '.html';
        const corpo = html ? Buffer.from(bytes.toString('utf8').replace('</body>', `${LINK_PAINEL}</body>`), 'utf8') : bytes;

        return new Response(new Uint8Array(corpo), {
            headers: {
                'Content-Type': TIPOS[path.extname(arquivo).toLowerCase()] ?? 'application/octet-stream',
                'Cache-Control': 'private, no-store',
                'X-Robots-Tag': 'noindex, nofollow',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch {
        return new Response('Não encontrado.', { status: 404 });
    }
}
