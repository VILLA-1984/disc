import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { pastaDeDados } from './token';

/**
 * Cadastro de quem joga: SO o nome e o WhatsApp (o resultado do teste nao e gravado).
 *
 * Dois modos, escolhidos pelas variaveis de ambiente:
 *  - Turso (libSQL), quando TURSO_DATABASE_URL existe: e o modo do Vercel, que nao tem disco permanente. Tambem
 *    aceita `file:caminho.db`, usado nos testes.
 *  - SQLite embutido (node:sqlite), sem dependencia externa: e o modo da feira, rodando no proprio computador,
 *    em data/participantes.db.
 *
 * As funcoes sao assincronas nos dois modos, para quem chama nao precisar saber qual esta em uso.
 */

type Linha = Record<string, unknown>;
type Armazenamento = {
    escrever(sql: string, valores: (string | number)[]): Promise<{ id: number; alteradas: number }>;
    ler(sql: string, valores: (string | number)[]): Promise<Linha[]>;
};

export type Participante = { id: number; nome: string; whatsapp: string; criado_em: string; atualizado_em: string };

const CRIAR_TABELA = `
    CREATE TABLE IF NOT EXISTS participantes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        whatsapp TEXT NOT NULL,
        criado_em TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
    )
`;

/**
 * URL do Turso, ou undefined para usar o SQLite local. RUA_BANCO_LOCAL=1 forca o SQLite local mesmo com as
 * variaveis do Turso no .env: serve ao servidor da feira, que nao deve depender da internet.
 */
function urlDoTurso(): string | undefined {
    if (process.env.RUA_BANCO_LOCAL === '1') {
        return undefined;
    }

    return process.env.TURSO_DATABASE_URL?.trim() || undefined;
}

/**
 * Contador de partidas concluidas, SEM dados pessoais: so um codigo aleatorio da partida (para ela nunca contar
 * duas vezes) e o animal do resultado. Os totais saem de uma contagem desta tabela, entao nao ha o que atualizar.
 */
const CRIAR_TABELA_PARTIDAS = `
    CREATE TABLE IF NOT EXISTS partidas_contadas (
        codigo TEXT PRIMARY KEY,
        animal TEXT NOT NULL
    )
`;

/** Configuracao do jogo (area de gerenciamento): uma linha por chave, com o valor em JSON. Sem dados pessoais. */
const CRIAR_TABELA_CONFIGURACOES = `
    CREATE TABLE IF NOT EXISTS configuracoes (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
    )
`;

/** Turso (libSQL). O cliente e carregado so quando e preciso, para o modo local nao depender dele. */
async function abrirTurso(url: string, token: string | undefined): Promise<Armazenamento> {
    const { createClient } = await import('@libsql/client');
    const cliente = createClient({ url, authToken: token || undefined });

    return {
        async escrever(sql, valores) {
            const resultado = await cliente.execute({ sql, args: valores });

            return { id: Number(resultado.lastInsertRowid ?? 0), alteradas: resultado.rowsAffected };
        },
        async ler(sql, valores) {
            const resultado = await cliente.execute({ sql, args: valores });

            return resultado.rows.map((linha) => ({ ...linha }));
        },
    };
}

/** SQLite embutido do Node (node:sqlite). process.getBuiltinModule evita que o bundler tente resolver o modulo. */
function abrirLocal(): Armazenamento {
    type Banco = {
        exec(sql: string): void;
        prepare(sql: string): {
            run(...valores: unknown[]): { lastInsertRowid: number | bigint; changes: number | bigint };
            all(...valores: unknown[]): Linha[];
        };
    };
    const sqlite = process.getBuiltinModule('node:sqlite') as unknown as { DatabaseSync: new (arquivo: string) => Banco };

    mkdirSync(pastaDeDados(), { recursive: true });
    const banco = new sqlite.DatabaseSync(process.env.RUA_BANCO ?? path.join(pastaDeDados(), 'participantes.db'));

    return {
        async escrever(sql, valores) {
            const { lastInsertRowid, changes } = banco.prepare(sql).run(...valores);

            return { id: Number(lastInsertRowid), alteradas: Number(changes) };
        },
        async ler(sql, valores) {
            return banco.prepare(sql).all(...valores);
        },
    };
}

let abertura: Promise<Armazenamento> | null = null;

/** Abre o armazenamento uma unica vez por processo (a promessa e guardada, entao chamadas juntas nao abrem duas vezes). */
function abrir(): Promise<Armazenamento> {
    abertura ??= (async () => {
        const url = urlDoTurso();
        const armazenamento = url ? await abrirTurso(url, process.env.TURSO_AUTH_TOKEN?.trim()) : abrirLocal();
        await armazenamento.escrever(CRIAR_TABELA, []);
        await armazenamento.escrever(CRIAR_TABELA_PARTIDAS, []);
        await armazenamento.escrever(CRIAR_TABELA_CONFIGURACOES, []);

        return armazenamento;
    })().catch((erro) => {
        abertura = null; // deixa tentar de novo na proxima chamada (por exemplo, apos corrigir a variavel)
        throw erro;
    });

    return abertura;
}

/** Qual banco esta em uso (para o log e o README): "turso" ou "sqlite". */
export function modoDoBanco(): 'turso' | 'sqlite' {
    return urlDoTurso() ? 'turso' : 'sqlite';
}

export async function criarParticipante(nome: string, whatsapp: string): Promise<number> {
    const agora = new Date().toISOString();
    const { id } = await (await abrir()).escrever(
        'INSERT INTO participantes (nome, whatsapp, criado_em, atualizado_em) VALUES (?, ?, ?, ?)',
        [nome, whatsapp, agora, agora],
    );

    return id;
}

export async function atualizarWhatsapp(id: number, whatsapp: string): Promise<boolean> {
    const { alteradas } = await (await abrir()).escrever(
        'UPDATE participantes SET whatsapp = ?, atualizado_em = ? WHERE id = ?',
        [whatsapp, new Date().toISOString(), id],
    );

    return alteradas > 0;
}

/**
 * Conta uma partida concluida (com ou sem cadastro). O codigo vem do token da partida, entao reenviar o mesmo
 * resultado nao conta de novo. Devolve true quando foi contada agora.
 */
export async function registrarPartida(codigo: string, animal: string): Promise<boolean> {
    const { alteradas } = await (await abrir()).escrever('INSERT OR IGNORE INTO partidas_contadas (codigo, animal) VALUES (?, ?)', [codigo, animal]);

    return alteradas > 0;
}

/** Quantas partidas foram concluidas e quantas deram cada animal (chave do animal -> total). */
export async function lerTotais(): Promise<{ total: number; porAnimal: Record<string, number> }> {
    const linhas = await (await abrir()).ler('SELECT animal, COUNT(*) AS n FROM partidas_contadas GROUP BY animal', []);
    const porAnimal: Record<string, number> = {};
    let total = 0;

    for (const linha of linhas) {
        const n = Number(linha.n);
        porAnimal[String(linha.animal)] = n;
        total += n;
    }

    return { total, porAnimal };
}

/** Valor (JSON em texto) de uma configuracao, ou null quando nunca foi gravada. */
export async function lerConfiguracao(chave: string): Promise<string | null> {
    const [linha] = await (await abrir()).ler('SELECT valor FROM configuracoes WHERE chave = ?', [chave]);

    return linha ? String(linha.valor) : null;
}

/** Grava (ou, com null, apaga) uma configuracao. */
export async function gravarConfiguracao(chave: string, valor: string | null): Promise<void> {
    const armazenamento = await abrir();

    if (valor === null) {
        await armazenamento.escrever('DELETE FROM configuracoes WHERE chave = ?', [chave]);

        return;
    }

    await armazenamento.escrever(
        'INSERT INTO configuracoes (chave, valor, atualizado_em) VALUES (?, ?, ?) '
        + 'ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, atualizado_em = excluded.atualizado_em',
        [chave, valor, new Date().toISOString()],
    );
}

export async function buscarParticipante(id: number): Promise<Participante | undefined> {
    const [linha] = await (await abrir()).ler('SELECT * FROM participantes WHERE id = ?', [id]);

    return linha as Participante | undefined;
}
