/**
 * Copia o Babylon.js (UMD) de node_modules para public/vendor/babylon/, de onde o jogo o carrega (game3d-babylon.js),
 * sem depender de CDN. Roda no postinstall e antes do build. Se o pacote nao estiver instalado, so avisa: o jogo
 * ainda tenta o CDN e, por fim, cai no three.js.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'public', 'vendor', 'babylon');
const arquivos = [
    ['node_modules/babylonjs/babylon.js', 'babylon.js'],
    ['node_modules/babylonjs-loaders/babylonjs.loaders.min.js', 'babylonjs.loaders.min.js'],
];

mkdirSync(destino, { recursive: true });

for (const [origem, nome] of arquivos) {
    const de = join(raiz, origem);

    if (!existsSync(de)) {
        console.warn(`copiar-babylon: ${origem} nao encontrado (rode npm install); o jogo usara o CDN.`);
        continue;
    }

    copyFileSync(de, join(destino, nome));
}
