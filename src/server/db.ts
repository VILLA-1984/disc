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

/**
 * Eventos em que o teste e aplicado. Cada evento tem o proprio ranking (as partidas contadas guardam o evento) e pode
 * ser ligado ou desligado. Sem dados pessoais.
 */
const CRIAR_TABELA_EVENTOS = `
    CREATE TABLE IF NOT EXISTS eventos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        nome TEXT NOT NULL,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL
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

/**
 * Resultados guardados para a equipe enviar pelo WhatsApp (tela /whatsapp). So o resumo por fator (percentuais), sem as
 * palavras escolhidas. Quem se cadastrou tem o resultado ligado ao cadastro; quem jogou sem cadastro recebe um ID curto
 * e o resultado some sozinho (expira_em), sem nome nem telefone. Datas em milissegundos (epoch).
 */
const CRIAR_TABELA_RESULTADOS = `
    CREATE TABLE IF NOT EXISTS resultados_envio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT NOT NULL UNIQUE,
        participante_id INTEGER,
        id_exibicao TEXT UNIQUE,
        resumo TEXT NOT NULL,
        criado_em INTEGER NOT NULL,
        expira_em INTEGER,
        enviado_em INTEGER
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
        await armazenamento.escrever(CRIAR_TABELA_RESULTADOS, []);
        await armazenamento.escrever(CRIAR_TABELA_EVENTOS, []);

        // Bancos criados antes dos eventos: acrescenta a coluna do evento (partidas antigas ficam "sem evento").
        const colunas = await armazenamento.ler('PRAGMA table_info(partidas_contadas)', []);

        if (!colunas.some((coluna) => coluna.name === 'evento_id')) {
            await armazenamento.escrever('ALTER TABLE partidas_contadas ADD COLUMN evento_id INTEGER', []);
        }

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
export async function registrarPartida(codigo: string, animal: string, eventoId: number | null = null): Promise<boolean> {
    const { alteradas } = await (await abrir()).escrever(
        'INSERT OR IGNORE INTO partidas_contadas (codigo, animal, evento_id) VALUES (?, ?, ?)',
        [codigo, animal, eventoId as number],
    );

    return alteradas > 0;
}

/**
 * Quantas partidas foram concluidas e quantas deram cada animal (chave do animal -> total), de um evento ou, com
 * null, das partidas feitas sem evento (inclui todas as de antes dos eventos existirem).
 */
export async function lerTotais(eventoId: number | null = null): Promise<{ total: number; porAnimal: Record<string, number> }> {
    const linhas = eventoId === null
        ? await (await abrir()).ler('SELECT animal, COUNT(*) AS n FROM partidas_contadas WHERE evento_id IS NULL GROUP BY animal', [])
        : await (await abrir()).ler('SELECT animal, COUNT(*) AS n FROM partidas_contadas WHERE evento_id = ? GROUP BY animal', [eventoId]);
    const porAnimal: Record<string, number> = {};
    let total = 0;

    for (const linha of linhas) {
        const n = Number(linha.n);
        porAnimal[String(linha.animal)] = n;
        total += n;
    }

    return { total, porAnimal };
}

// ------------------------------------------------------------------ resultados para envio

export type LinhaResultado = {
    id: number;
    codigo: string;
    participante_id: number | null;
    id_exibicao: string | null;
    resumo: string;
    criado_em: number;
    expira_em: number | null;
    enviado_em: number | null;
    /** Do cadastro (so quando o resultado e de quem se cadastrou). */
    nome: string | null;
    whatsapp: string | null;
};

const COLUNAS_RESULTADO = `
    r.id, r.codigo, r.participante_id, r.id_exibicao, r.resumo, r.criado_em, r.expira_em, r.enviado_em,
    p.nome AS nome, p.whatsapp AS whatsapp
`;

const paraResultado = (linha: Linha): LinhaResultado => ({
    id: Number(linha.id),
    codigo: String(linha.codigo),
    participante_id: linha.participante_id === null ? null : Number(linha.participante_id),
    id_exibicao: linha.id_exibicao === null ? null : String(linha.id_exibicao),
    resumo: String(linha.resumo),
    criado_em: Number(linha.criado_em),
    expira_em: linha.expira_em === null ? null : Number(linha.expira_em),
    enviado_em: linha.enviado_em === null ? null : Number(linha.enviado_em),
    nome: linha.nome === null || linha.nome === undefined ? null : String(linha.nome),
    whatsapp: linha.whatsapp === null || linha.whatsapp === undefined ? null : String(linha.whatsapp),
});

export async function resultadoPorCodigo(codigo: string): Promise<LinhaResultado | undefined> {
    const [linha] = await (await abrir()).ler(
        `SELECT ${COLUNAS_RESULTADO} FROM resultados_envio r LEFT JOIN participantes p ON p.id = r.participante_id WHERE r.codigo = ?`,
        [codigo],
    );

    return linha ? paraResultado(linha) : undefined;
}

export async function resultadoPorId(id: number): Promise<LinhaResultado | undefined> {
    const [linha] = await (await abrir()).ler(
        `SELECT ${COLUNAS_RESULTADO} FROM resultados_envio r LEFT JOIN participantes p ON p.id = r.participante_id WHERE r.id = ?`,
        [id],
    );

    return linha ? paraResultado(linha) : undefined;
}

/** Grava o resultado. Falha (lanca erro) se o codigo da partida ou o ID de exibicao ja existirem: quem chama decide o que fazer. */
export async function inserirResultado(r: {
    codigo: string;
    participanteId: number | null;
    idExibicao: string | null;
    resumo: string;
    criadoEm: number;
    expiraEm: number | null;
}): Promise<void> {
    await (await abrir()).escrever(
        'INSERT INTO resultados_envio (codigo, participante_id, id_exibicao, resumo, criado_em, expira_em) VALUES (?, ?, ?, ?, ?, ?)',
        [r.codigo, r.participanteId as number, r.idExibicao as string, r.resumo, r.criadoEm, r.expiraEm as number],
    );
}

/** Apaga de verdade os resultados anonimos que ja passaram do prazo. Devolve quantos foram apagados. */
export async function apagarResultadosExpirados(agora: number): Promise<number> {
    const { alteradas } = await (await abrir()).escrever('DELETE FROM resultados_envio WHERE expira_em IS NOT NULL AND expira_em <= ?', [agora]);

    return alteradas;
}

/** Os resultados que ainda valem (cadastrados e anonimos dentro do prazo), do mais recente para o mais antigo. */
export async function listarResultados(agora: number): Promise<LinhaResultado[]> {
    const linhas = await (await abrir()).ler(
        `SELECT ${COLUNAS_RESULTADO} FROM resultados_envio r LEFT JOIN participantes p ON p.id = r.participante_id
         WHERE r.expira_em IS NULL OR r.expira_em > ? ORDER BY r.criado_em DESC, r.id DESC`,
        [agora],
    );

    return linhas.map(paraResultado);
}

/** Marca (ou, com null, desmarca) o resultado como enviado. Anonimo fora do prazo nao conta: ja nao existe. */
export async function marcarResultadoEnviado(id: number, enviadoEm: number | null, agora: number): Promise<boolean> {
    const { alteradas } = await (await abrir()).escrever(
        'UPDATE resultados_envio SET enviado_em = ? WHERE id = ? AND (expira_em IS NULL OR expira_em > ?)',
        [enviadoEm as number, id, agora],
    );

    return alteradas > 0;
}

/** Descarta o resultado de quem jogou sem cadastro. Resultado de cadastrado nao se descarta por aqui. */
export async function descartarResultadoAnonimo(id: number): Promise<boolean> {
    const { alteradas } = await (await abrir()).escrever('DELETE FROM resultados_envio WHERE id = ? AND participante_id IS NULL', [id]);

    return alteradas > 0;
}

// ------------------------------------------------------------------ eventos

export type LinhaEvento = { id: number; slug: string; nome: string; ativo: boolean; criado_em: number; total: number };

const paraEvento = (linha: Linha): LinhaEvento => ({
    id: Number(linha.id),
    slug: String(linha.slug),
    nome: String(linha.nome),
    ativo: Number(linha.ativo) === 1,
    criado_em: Number(linha.criado_em),
    total: Number(linha.total ?? 0),
});

const SELECT_EVENTO = `
    SELECT e.id, e.slug, e.nome, e.ativo, e.criado_em, COUNT(p.codigo) AS total
    FROM eventos e LEFT JOIN partidas_contadas p ON p.evento_id = e.id
`;

/** Falha (lanca erro) se o slug ja existir: quem chama escolhe outro. */
export async function inserirEvento(slug: string, nome: string, criadoEm: number): Promise<number> {
    const { id } = await (await abrir()).escrever('INSERT INTO eventos (slug, nome, ativo, criado_em) VALUES (?, ?, 1, ?)', [slug, nome, criadoEm]);

    return id;
}

/** Todos os eventos, do mais recente para o mais antigo, com quantas partidas cada um ja contou. */
export async function listarEventosComTotal(): Promise<LinhaEvento[]> {
    const linhas = await (await abrir()).ler(`${SELECT_EVENTO} GROUP BY e.id ORDER BY e.criado_em DESC, e.id DESC`, []);

    return linhas.map(paraEvento);
}

export async function eventoPorSlug(slug: string): Promise<LinhaEvento | undefined> {
    const [linha] = await (await abrir()).ler(`${SELECT_EVENTO} WHERE e.slug = ? GROUP BY e.id`, [slug]);

    return linha ? paraEvento(linha) : undefined;
}

export async function eventoPorId(id: number): Promise<LinhaEvento | undefined> {
    const [linha] = await (await abrir()).ler(`${SELECT_EVENTO} WHERE e.id = ? GROUP BY e.id`, [id]);

    return linha ? paraEvento(linha) : undefined;
}

export async function atualizarEvento(id: number, campos: { nome?: string; ativo?: boolean }): Promise<boolean> {
    const partes: string[] = [];
    const valores: (string | number)[] = [];

    if (campos.nome !== undefined) {
        partes.push('nome = ?');
        valores.push(campos.nome);
    }

    if (campos.ativo !== undefined) {
        partes.push('ativo = ?');
        valores.push(campos.ativo ? 1 : 0);
    }

    if (partes.length === 0) {
        return (await eventoPorId(id)) !== undefined;
    }

    const { alteradas } = await (await abrir()).escrever(`UPDATE eventos SET ${partes.join(', ')} WHERE id = ?`, [...valores, id]);

    return alteradas > 0;
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
