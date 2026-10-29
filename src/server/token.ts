import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { RodadaCiclo } from './ciclo';
import type { Rodada } from './gameRound';

/**
 * Token assinado que carrega a rodada: assim o servidor nao precisa guardar nada alem do nome e do
 * WhatsApp. O navegador nao consegue trocar a rodada nem o participante sem invalidar a assinatura.
 */

/** r = portoes em pares; c = ciclo de palavras (uma por vez). Cada partida tem so um dos dois. */
export type Carga = { p: number; r?: Rodada; c?: RodadaCiclo; e: number };

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
        try {
            mkdirSync(pastaDeDados(), { recursive: true });
            writeFileSync(arquivo, randomBytes(32).toString('hex'), { mode: 0o600 });
        } catch {
            // Hospedagem sem disco gravavel (Vercel): um segredo por instancia nao serve, porque o token de uma
            // partida precisa ser aceito por qualquer instancia. Tem de vir da variavel de ambiente.
            throw new Error('Defina a variável de ambiente RUA_SEGREDO: não há disco gravável para gerar o segredo de assinatura.');
        }
    }

    segredoEmCache = Buffer.from(readFileSync(arquivo, 'utf8').trim(), 'utf8');

    return segredoEmCache;
}

function assinatura(corpo: string): Buffer {
    return createHmac('sha256', segredo()).update(corpo).digest();
}

export function assinar(participanteId: number, rodada: Rodada | RodadaCiclo, agora = Date.now()): string {
    const carga: Carga = Array.isArray(rodada)
        ? { p: participanteId, r: rodada, e: agora + VALIDADE_MS }
        : { p: participanteId, c: rodada, e: agora + VALIDADE_MS };
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

        const temRodada = Array.isArray(carga.r) || Array.isArray(carga.c?.etapas);

        return Number.isInteger(carga.p) && temRodada && carga.e > agora ? carga : null;
    } catch {
        return null;
    }
}
