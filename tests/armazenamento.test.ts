import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let pasta: string;

beforeAll(() => {
    pasta = mkdtempSync(path.join(tmpdir(), 'rua-'));
    process.env.RUA_DADOS = pasta;
    delete process.env.RUA_SEGREDO;
    delete process.env.RUA_BANCO;
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
        const { atualizarWhatsapp, buscarParticipante, criarParticipante } = await import('../src/server/db');

        const id = criarParticipante('Maria da Silva', '65999991234');

        expect(buscarParticipante(id)).toMatchObject({ nome: 'Maria da Silva', whatsapp: '65999991234' });
        expect(atualizarWhatsapp(id, '65988887777')).toBe(true);
        expect(buscarParticipante(id)).toMatchObject({ nome: 'Maria da Silva', whatsapp: '65988887777' });
        expect(atualizarWhatsapp(9999, '65988887777')).toBe(false);
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
