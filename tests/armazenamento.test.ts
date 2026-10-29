import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

let pasta: string;

beforeAll(() => {
    pasta = mkdtempSync(path.join(tmpdir(), 'rua-'));
    process.env.RUA_DADOS = pasta;
    delete process.env.RUA_SEGREDO;
    delete process.env.RUA_BANCO;
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
});

afterAll(() => {
    try {
        rmSync(pasta, { recursive: true, force: true });
    } catch {
        // No Windows o SQLite segura o arquivo aberto ate o processo terminar; a pasta e temporaria.
    }
});

describe('banco sqlite embutido', () => {
    it('grava o participante e corrige so o WhatsApp', async () => {
        const { atualizarWhatsapp, buscarParticipante, criarParticipante, modoDoBanco } = await import('../src/server/db');

        expect(modoDoBanco()).toBe('sqlite');

        const id = await criarParticipante('Maria da Silva', '65999991234');

        expect(await buscarParticipante(id)).toMatchObject({ nome: 'Maria da Silva', whatsapp: '65999991234' });
        expect(await atualizarWhatsapp(id, '65988887777')).toBe(true);
        expect(await buscarParticipante(id)).toMatchObject({ nome: 'Maria da Silva', whatsapp: '65988887777' });
        expect(await atualizarWhatsapp(9999, '65988887777')).toBe(false);
    });
});

describe('banco turso (libSQL)', () => {
    // O libSQL tambem abre arquivos locais (file:), entao da para provar o caminho do Turso sem rede.
    it('grava e corrige como o sqlite local', async () => {
        vi.resetModules();
        process.env.TURSO_DATABASE_URL = `file:${path.join(pasta, 'turso.db').replaceAll('\\', '/')}`;

        try {
            const { atualizarWhatsapp, buscarParticipante, criarParticipante, modoDoBanco } = await import('../src/server/db');

            expect(modoDoBanco()).toBe('turso');

            const primeiro = await criarParticipante('João Souza', '65999990001');
            const segundo = await criarParticipante('Ana Lima', '65999990002');

            expect(segundo).toBe(primeiro + 1);
            expect(await buscarParticipante(primeiro)).toMatchObject({ nome: 'João Souza', whatsapp: '65999990001' });
            expect(await atualizarWhatsapp(primeiro, '65988880001')).toBe(true);
            expect(await buscarParticipante(primeiro)).toMatchObject({ whatsapp: '65988880001' });
            expect(await buscarParticipante(segundo)).toMatchObject({ whatsapp: '65999990002' });
            expect(await atualizarWhatsapp(9999, '65988887777')).toBe(false);
            expect(await buscarParticipante(9999)).toBeUndefined();
        } finally {
            delete process.env.TURSO_DATABASE_URL;
            vi.resetModules();
        }
    });
});

describe('token assinado', () => {
    const rodada = [[{ top: 1, bottom: 13 }], [{ top: 2, bottom: 14 }]];

    it('volta a carga quando valido', async () => {
        const { assinar, verificar } = await import('../src/server/token');

        expect(verificar(assinar(7, rodada))).toMatchObject({ p: 7, r: rodada });
    });

    it('recusa adulterado, expirado e lixo', async () => {
        const { assinar, verificar } = await import('../src/server/token');
        const token = assinar(7, rodada);
        const [corpo, assinatura] = token.split('.');
        const outraCarga = Buffer.from(JSON.stringify({ p: 8, r: rodada, e: Date.now() + 1e6 })).toString('base64url');

        expect(verificar(`${outraCarga}.${assinatura}`)).toBeNull();
        expect(verificar(`${corpo}.xx`)).toBeNull();
        expect(verificar(assinar(7, rodada, Date.now() - 7 * 3600 * 1000))).toBeNull();
        expect(verificar('lixo')).toBeNull();
        expect(verificar(undefined)).toBeNull();
    });
});
