import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LOGO_MAX_BYTES, conferirLogo, tipoPelosBytes } from '../src/server/logo';

let pasta: string;

beforeAll(() => {
    pasta = mkdtempSync(path.join(tmpdir(), 'rua-logo-'));
    process.env.RUA_DADOS = pasta;
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

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);

describe('conferencia da logo', () => {
    it('reconhece PNG, JPEG e WebP pelos bytes', () => {
        expect(tipoPelosBytes(PNG)).toBe('image/png');
        expect(tipoPelosBytes(JPEG)).toBe('image/jpeg');
        expect(tipoPelosBytes(WEBP)).toBe('image/webp');
    });

    it('recusa SVG, GIF e qualquer coisa que nao seja imagem aceita, mesmo com nome de imagem', () => {
        const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        const gif = new TextEncoder().encode('GIF89a......');

        for (const bytes of [svg, gif, new TextEncoder().encode('<html>')]) {
            const r = conferirLogo(bytes);

            expect(r.ok).toBe(false);
            expect(!r.ok && r.erro).toMatch(/PNG, JPEG ou WebP/);
        }
    });

    it('recusa arquivo vazio e arquivo grande demais', () => {
        expect(conferirLogo(new Uint8Array(0)).ok).toBe(false);

        const grande = new Uint8Array(LOGO_MAX_BYTES + 1);
        grande.set(PNG);

        const r = conferirLogo(grande);

        expect(r.ok).toBe(false);
        expect(!r.ok && r.erro).toMatch(/1 MB/);
        expect(conferirLogo(PNG).ok).toBe(true);
    });
});

describe('gravacao da logo', () => {
    it('sem logo devolve null; salva, troca (muda a versao) e remove', async () => {
        const { lerLogo, removerLogo, salvarLogo, versaoDaLogo } = await import('../src/server/logo');

        expect(await lerLogo()).toBeNull();
        expect(await versaoDaLogo()).toBeNull();

        const v1 = await salvarLogo('image/png', PNG);
        const lida = await lerLogo();

        expect(lida?.tipo).toBe('image/png');
        expect([...(lida?.bytes ?? [])]).toEqual([...PNG]);
        expect(lida?.versao).toBe(v1);

        await new Promise((resolver) => setTimeout(resolver, 5));
        const v2 = await salvarLogo('image/jpeg', JPEG);

        expect(v2).toBeGreaterThan(v1);
        expect((await lerLogo())?.tipo).toBe('image/jpeg');

        await removerLogo();
        expect(await lerLogo()).toBeNull();
    });

    it('conteudo salvo invalido nao derruba: vira "sem logo"', async () => {
        const { lerLogo } = await import('../src/server/logo');
        const { gravarConfiguracao } = await import('../src/server/db');

        await gravarConfiguracao('logo', '{"tipo":"image/svg+xml","dados":"PHN2Zz4=","versao":1}');
        expect(await lerLogo()).toBeNull();

        await gravarConfiguracao('logo', 'isto nao e json');
        expect(await lerLogo()).toBeNull();
    });
});
