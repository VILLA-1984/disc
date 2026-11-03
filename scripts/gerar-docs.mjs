// Gera a documentacao tecnica (MkDocs) em docs-site/, que a rota /docs serve so para a equipe.
// A pasta docs-site/ e versionada, para o build da Vercel nao precisar de Python. Rode depois de mexer em docs/ ou mkdocs.yml.
import { spawnSync } from 'node:child_process';

const comandos = [['mkdocs', 'build', '--strict'], ['python', '-m', 'mkdocs', 'build', '--strict']];

for (const [programa, ...args] of comandos) {
    const r = spawnSync(programa, args, { stdio: 'inherit', shell: process.platform === 'win32' });

    if (r.status === 0) {
        process.exit(0);
    }
}

console.error('Nao foi possivel rodar o MkDocs. Instale com: pip install -r requirements-docs.txt');
process.exit(1);
