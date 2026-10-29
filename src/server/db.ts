import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { pastaDeDados } from './token';

/**
 * Banco SQLite embutido (modulo nativo node:sqlite, sem dependencia externa). Guarda SO o nome e o
 * WhatsApp de quem joga: o resultado do teste nao e gravado.
 *
 * process.getBuiltinModule evita que o bundler tente resolver o modulo.
 */

type Banco = {
    exec(sql: string): void;
    prepare(sql: string): {
        run(...valores: unknown[]): { lastInsertRowid: number | bigint; changes: number | bigint };
        get(...valores: unknown[]): Record<string, unknown> | undefined;
        all(...valores: unknown[]): Record<string, unknown>[];
    };
};

export type Participante = { id: number; nome: string; whatsapp: string; criado_em: string; atualizado_em: string };

let banco: Banco | null = null;

function abrir(): Banco {
    if (banco) {
        return banco;
    }

    const sqlite = process.getBuiltinModule('node:sqlite') as unknown as { DatabaseSync: new (arquivo: string) => Banco };

    mkdirSync(pastaDeDados(), { recursive: true });
    banco = new sqlite.DatabaseSync(process.env.RUA_BANCO ?? path.join(pastaDeDados(), 'participantes.db'));
    banco.exec(`
        CREATE TABLE IF NOT EXISTS participantes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            whatsapp TEXT NOT NULL,
            criado_em TEXT NOT NULL,
            atualizado_em TEXT NOT NULL
        )
    `);

    return banco;
}

export function criarParticipante(nome: string, whatsapp: string): number {
    const agora = new Date().toISOString();
    const { lastInsertRowid } = abrir()
        .prepare('INSERT INTO participantes (nome, whatsapp, criado_em, atualizado_em) VALUES (?, ?, ?, ?)')
        .run(nome, whatsapp, agora, agora);

    return Number(lastInsertRowid);
}

export function atualizarWhatsapp(id: number, whatsapp: string): boolean {
    const { changes } = abrir()
        .prepare('UPDATE participantes SET whatsapp = ?, atualizado_em = ? WHERE id = ?')
        .run(whatsapp, new Date().toISOString(), id);

    return Number(changes) > 0;
}

export function buscarParticipante(id: number): Participante | undefined {
    return abrir().prepare('SELECT * FROM participantes WHERE id = ?').get(id) as Participante | undefined;
}
