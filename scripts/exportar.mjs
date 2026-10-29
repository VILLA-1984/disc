// Exporta nome e WhatsApp de quem jogou para CSV (stdout). Uso: npm run exportar > participantes.csv
import { existsSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const arquivo = process.env.RUA_BANCO ?? path.join(process.env.RUA_DADOS ?? path.join(process.cwd(), 'data'), 'participantes.db');

if (!existsSync(arquivo)) {
    console.error(`Banco não encontrado em ${arquivo}. Ninguém jogou ainda.`);
    process.exit(1);
}

const aspas = (valor) => `"${String(valor).replaceAll('"', '""')}"`;
const linhas = new DatabaseSync(arquivo).prepare('SELECT id, nome, whatsapp, criado_em, atualizado_em FROM participantes ORDER BY id').all();

console.log('id,nome,whatsapp,criado_em,atualizado_em');

for (const l of linhas) {
    console.log([l.id, aspas(l.nome), l.whatsapp, l.criado_em, l.atualizado_em].join(','));
}
