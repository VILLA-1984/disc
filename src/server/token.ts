import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Rodada } from './gameRound';

/**
 * Token assinado que carrega a rodada: assim o servidor nao precisa guardar nada alem do nome e do
 * WhatsApp. O navegador nao consegue trocar a rodada nem o participante sem invalidar a assinatura.
 */

export type Carga = { p: number; r: Rodada; e: number };

const VALIDADE_MS = 6 * 60 * 60 * 1000;

export function pastaDeDados(): string {
    return process.env.RUA_DADOS ?? path.join(process.cwd(), 'data');
}

let segredoEmCache: Buffer | null = null;

function segredo(): Buffer {
    if (segredoEmCache) {
        return segredoEmCache;
    }

    if (process.env.RUA_SEGREDO) {
        segredoEmCache = Buffer.from(process.env.RUA_SEGREDO, 'utf8');

        return segredoEmCache;
    }

    // Sem variavel de ambiente, gera um segredo e o mantem em data/.segredo (nao versionado).
    const arquivo = path.join(pastaDeDados(), '.segredo');

    if (!existsSync(arquivo)) {
        mkdirSync(pastaDeDados(), { recursive: true });
        writeFileSync(arquivo, randomBytes(32).toString('hex'), { mode: 0o600 });
    }

    segredoEmCache = Buffer.from(readFileSync(arquivo, 'utf8').trim(), 'utf8');

    return segredoEmCache;
}

function assinatura(corpo: string): Buffer {
    return createHmac('sha256', segredo()).update(corpo).digest();
}

export function assinar(participanteId: number, rodada: Rodada, agora = Date.now()): string {
    const carga: Carga = { p: participanteId, r: rodada, e: agora + VALIDADE_MS };
    const corpo = Buffer.from(JSON.stringify(carga), 'utf8').toString('base64url');

    return `${corpo}.${assinatura(corpo).toString('base64url')}`;
}

export function verificar(token: unknown, agora = Date.now()): Carga | null {
    if (typeof token !== 'string') {
        return null;
    }

    const [corpo, recebida, resto] = token.split('.');

    if (!corpo || !recebida || resto !== undefined) {
        return null;
    }

    const esperada = assinatura(corpo);
    const informada = Buffer.from(recebida, 'base64url');

    if (informada.length !== esperada.length || !timingSafeEqual(informada, esperada)) {
        return null;
    }

    try {
        const carga = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8')) as Carga;

        return Number.isInteger(carga.p) && Array.isArray(carga.r) && carga.e > agora ? carga : null;
    } catch {
        return null;
    }
}
