/**
 * Gera public/logo/logo-quatro-animais.png: os quatro animais do teste (tubarao, aguia, gato e lobo) lado a lado, nas cores
 * do DISC, com fundo transparente. Usa as mesmas silhuetas do relatorio do jogo.
 *
 * Uso: node scripts/gerar-logo-animais.mjs
 */
import { chromium } from 'playwright-core';
import { ANIMAIS, ORDEM_FATORES, FATOR_ANIMAL } from '../src/jogo/animals.js';

const LADO = 256; // cada animal
const FOLGA = 40; // entre animais
const largura = LADO * 4 + FOLGA * 3;

const animais = ORDEM_FATORES.map((fator) => ANIMAIS[FATOR_ANIMAL[fator]]).map((a, i) => (
    `<svg x="${i * (LADO + FOLGA)}" y="0" width="${LADO}" height="${LADO}" viewBox="0 0 512 512" fill="${a.cor}"><path d="${a.svgPath}"/></svg>`
));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${LADO}" viewBox="0 0 ${largura} ${LADO}">${animais.join('')}</svg>`;

const navegador = await chromium.launch({ channel: 'msedge', headless: true });
const pagina = await (await navegador.newContext({ viewport: { width: largura, height: LADO } })).newPage();
await pagina.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await pagina.screenshot({ path: 'public/logo/logo-quatro-animais.png', omitBackground: true });
await navegador.close();
console.log(`public/logo/logo-quatro-animais.png (${largura}x${LADO})`);
