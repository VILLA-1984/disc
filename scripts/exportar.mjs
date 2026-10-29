// Exporta nome e WhatsApp de quem jogou para CSV (stdout). Uso: npm run exportar > participantes.csv
// Le do Turso quando TURSO_DATABASE_URL esta definida (no terminal ou em .env); senao, do SQLite local.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Carrega o .env (o Node nao o le sozinho em scripts); variaveis ja definidas no terminal tem prioridade.
if (existsSync('.env')) {
    for (const linha of readFileSync('.env', 'utf8').split(/\r?\n/)) {
        const achado = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);

        if (achado && process.env[achado[1]] === undefined) {
            process.env[achado[1]] = achado[2].replace(/^["']|["']$/g, '');
        }
    }
}

const consulta = 'SELECT id, nome, whatsapp, criado_em, atualizado_em FROM participantes ORDER BY id';
const url = process.env.TURSO_DATABASE_URL?.trim();
let linhas;

if (url) {
    const { createClient } = await import('@libsql/client');
    const cliente = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined });

    try {
        linhas = (await cliente.execute(consulta)).rows;
    } catch (erro) {
        console.error(`Não foi possível ler o Turso: ${erro.message}`);
        process.exit(1);
    }
} else {
    const arquivo = process.env.RUA_BANCO ?? path.join(process.env.RUA_DADOS ?? path.join(process.cwd(), 'data'), 'participantes.db');

    if (!existsSync(arquivo)) {
        console.error(`Banco não encontrado em ${arquivo}. Ninguém jogou ainda.`);
        process.exit(1);
    }

    const { DatabaseSync } = await import('node:sqlite');
    linhas = new DatabaseSync(arquivo).prepare(consulta).all();
}

const aspas = (valor) => `"${String(valor).replaceAll('"', '""')}"`;

console.log('id,nome,whatsapp,criado_em,atualizado_em');

for (const l of linhas) {
    console.log([l.id, aspas(l.nome), l.whatsapp, l.criado_em, l.atualizado_em].join(','));
}
