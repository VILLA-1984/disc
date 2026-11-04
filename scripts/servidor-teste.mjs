/**
 * Servidor de teste isolado: sobe o jogo na porta 3100 (ou na de `RUA_PORTA`) com o banco SQLite local, numa pasta
 * temporaria, ignorando o Turso do `.env`. Os roteiros de `e2e/` criam eventos e salvam configuracoes; use sempre este
 * servidor com eles, para nao gravar no banco de producao. Precisa de `npm run build` antes.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const pasta = mkdtempSync(path.join(tmpdir(), 'rua-teste-'));
const porta = process.env.RUA_PORTA ?? '3100';

console.log(`Servidor de teste em http://127.0.0.1:${porta} com banco local em ${pasta} (o Turso do .env nao e usado).`);

const filho = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', porta], {
    stdio: 'inherit',
    env: { ...process.env, RUA_BANCO_LOCAL: '1', RUA_DADOS: pasta, TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '' },
});

filho.on('exit', (codigo) => process.exit(codigo ?? 0));
