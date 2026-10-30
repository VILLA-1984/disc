import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let pasta: string;

/**
 * Um banco criado antes dos eventos existirem (partidas_contadas sem a coluna evento_id) precisa continuar
 * funcionando: a coluna e acrescentada ao abrir e as partidas antigas contam como "sem evento".
 */
beforeAll(() => {
    pasta = mkdtempSync(path.join(tmpdir(), 'rua-migracao-'));
    const arquivo = path.join(pasta, 'antigo.db');
    const sqlite = process.getBuiltinModule('node:sqlite') as unknown as {
        DatabaseSync: new (arquivo: string) => { exec(sql: string): void; close(): void };
    };
    const banco = new sqlite.DatabaseSync(arquivo);
    banco.exec('CREATE TABLE partidas_contadas (codigo TEXT PRIMARY KEY, animal TEXT NOT NULL)');
    banco.exec("INSERT INTO partidas_contadas (codigo, animal) VALUES ('velha-1', 'gato'), ('velha-2', 'lobo'), ('velha-3', 'lobo')");
    banco.close();

    process.env.RUA_DADOS = pasta;
    process.env.RUA_BANCO = arquivo;
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

describe('banco de antes dos eventos', () => {
    it('abre, mantem as partidas antigas como "sem evento" e aceita partidas de eventos', async () => {
        const { registrarPartida } = await import('../src/server/db');
        const { criarEvento } = await import('../src/server/eventos');
        const { montarTotais } = await import('../src/server/totais');

        const antes = await montarTotais(null);

        expect(antes.total).toBe(3);
        expect(Object.fromEntries(antes.animais.map((a) => [a.chave, a.total]))).toMatchObject({ gato: 1, lobo: 2 });

        const evento = await criarEvento('Primeiro evento');
        await registrarPartida('nova-1', 'tubarao', evento.id);

        expect((await montarTotais(evento.id)).total).toBe(1);
        expect((await montarTotais(null)).total).toBe(3); // as antigas nao foram para o evento
    });

    it('abrir o banco de novo nao tenta criar a coluna outra vez', async () => {
        const { lerTotais } = await import('../src/server/db');

        await expect(lerTotais(null)).resolves.toMatchObject({ total: 3 });
    });
});
