import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { verificarSessaoAdmin } from './token';

/** Acesso a area de gerenciamento (/admin): uma senha unica, definida em RUA_ADMIN_SENHA, e um cookie assinado. */

export const COOKIE_ADMIN = 'rua_admin';
export const DURACAO_COOKIE_ADMIN = 8 * 60 * 60; // segundos

/** Sem RUA_ADMIN_SENHA a area fica desativada (ninguem entra), em vez de abrir sem senha. */
export function adminAtivo(): boolean {
    return Boolean(process.env.RUA_ADMIN_SENHA?.trim());
}

/** Compara as senhas em tempo constante (pelos hashes, que tem sempre o mesmo tamanho). */
export function senhaConfere(informada: string): boolean {
    const certa = process.env.RUA_ADMIN_SENHA?.trim();

    if (!certa) {
        return false;
    }

    const a = createHash('sha256').update(informada).digest();
    const b = createHash('sha256').update(certa).digest();

    return timingSafeEqual(a, b);
}

export async function sessaoAdminValida(): Promise<boolean> {
    return verificarSessaoAdmin((await cookies()).get(COOKIE_ADMIN)?.value);
}

/** Pedidos de gravacao so valem se vierem do proprio site (confere o Origin, quando o navegador o envia). */
export function origemConfiavel(request: Request): boolean {
    const origem = request.headers.get('origin');

    if (!origem) {
        return true; // chamadas sem navegador (testes, curl) nao trazem Origin; o cookie assinado continua sendo exigido
    }

    try {
        return new URL(origem).host === request.headers.get('host');
    } catch {
        return false;
    }
}

/** O cookie so e marcado como Secure em https (no servidor da feira, em http, ele precisa funcionar). */
export function ehHttps(request: Request): boolean {
    return request.headers.get('x-forwarded-proto') === 'https' || new URL(request.url).protocol === 'https:';
}
