import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { verificarSessaoAdmin } from './token';

/** Acesso a area de gerenciamento (/admin): usuario e senha do super admin (USER_AREA_ADM e PASS_AREA_ADM) e um cookie assinado. */

export const COOKIE_ADMIN = 'rua_admin';
export const DURACAO_COOKIE_ADMIN = 8 * 60 * 60; // segundos

/** Sem usuario e senha definidos a area fica desativada (ninguem entra), em vez de abrir sem senha. */
export function adminAtivo(): boolean {
    return Boolean(process.env.USER_AREA_ADM?.trim() && process.env.PASS_AREA_ADM?.trim());
}

function iguais(informado: string, certo: string): boolean {
    // Pelos hashes, que tem sempre o mesmo tamanho, para a comparacao levar o mesmo tempo.
    return timingSafeEqual(createHash('sha256').update(informado).digest(), createHash('sha256').update(certo).digest());
}

/** Confere usuario e senha em tempo constante; os dois sao sempre comparados, para nao revelar qual errou. */
export function credenciaisConferem(usuario: string, senha: string): boolean {
    const usuarioCerto = process.env.USER_AREA_ADM?.trim();
    const senhaCerta = process.env.PASS_AREA_ADM?.trim();

    if (!usuarioCerto || !senhaCerta) {
        return false;
    }

    const usuarioOk = iguais(usuario.trim(), usuarioCerto);
    const senhaOk = iguais(senha, senhaCerta);

    return usuarioOk && senhaOk;
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
