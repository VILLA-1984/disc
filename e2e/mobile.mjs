/**
 * Partida completa em um celular emulado (toque, tela estreita): confere que nenhuma tela passa da largura
 * do aparelho, joga tocando nos botoes e salva prints para olhar. Requer o servidor em RUA_URL
 * (padrao http://127.0.0.1:3100), de preferencia com RUA_DADOS apontando para uma pasta temporaria.
 *
 * Uso: node e2e/mobile.mjs [pasta_dos_prints] [retrato|paisagem]
 */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.RUA_URL ?? 'http://127.0.0.1:3100';
const pasta = process.argv[2] ?? 'e2e/capturas-mobile';
const paisagem = process.argv[3] === 'paisagem';
mkdirSync(pasta, { recursive: true });

const viewport = paisagem ? { width: 844, height: 390 } : { width: 390, height: 844 };
const navegador = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const contexto = await navegador.newContext({
    viewport,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const pagina = await contexto.newPage();
const erros = [];
pagina.on('pageerror', (e) => erros.push(e.message));
pagina.on('console', (m) => m.type() === 'error' && erros.push(`${m.text()} ${m.location().url ?? ''}`));
await pagina.addInitScript(() => { window.open = () => ({}); });

async function tela(nome) {
    await pagina.waitForTimeout(700);
    const medidas = await pagina.evaluate(() => ({ pagina: document.documentElement.scrollWidth, janela: window.innerWidth }));
    await pagina.screenshot({ path: join(pasta, `${nome}.png`) });
    assert.ok(medidas.pagina <= medidas.janela + 1, `${nome}: a pagina passa da largura do celular (${medidas.pagina} > ${medidas.janela})`);
    console.log('ok', nome);
}

await pagina.goto(base);
await pagina.getByRole('heading', { name: 'Rua das Palavras' }).waitFor();
await tela('m-0-abertura');

await pagina.fill('#nome', 'Maria da Silva');
await pagina.fill('#whatsapp', '65999990000');
await pagina.getByRole('button', { name: 'Continuar' }).tap();

const cartao = pagina.locator('#cartao.aberto');
await cartao.waitFor({ timeout: 30000 });
await tela('m-1-apresentacao');
await pagina.tap('#cartao-botao');

await cartao.waitFor();
await tela('m-2-avatar');
await pagina.locator('#cartao-botao').scrollIntoViewIfNeeded();
assert.ok(await pagina.locator('#cartao-botao').isVisible(), 'o botao Comecar precisa ficar alcancavel no avatar');
await pagina.tap('#cartao-botao');

await cartao.waitFor({ timeout: 30000 });
await tela('m-3-etapa');
await pagina.tap('#cartao-botao');

for (let etapa = 0; etapa < 2; etapa++) {
    for (let i = 0; i < 12; i++) {
        await pagina.waitForFunction(() => !document.querySelector('#botao-cima').disabled, null, { timeout: 60000 });

        if (etapa === 0 && i === 1) {
            await tela('m-4-portao');
        }

        await pagina.tap(i % 2 === 0 ? '#botao-cima' : '#botao-baixo');
        await pagina.waitForFunction(() => document.querySelector('#botao-cima').disabled, null, { timeout: 10000 });
    }

    await cartao.waitFor({ timeout: 40000 });

    if (etapa === 0) {
        await tela('m-5-etapa-concluida');
        await pagina.tap('#cartao-botao');
        await cartao.waitFor({ timeout: 30000 });
        await pagina.tap('#cartao-botao');
    }
}

await pagina.tap('#cartao-botao'); // Descobrir meu animal
await pagina.locator('.rel').waitFor({ timeout: 45000 });
await pagina.waitForTimeout(9000);
await tela('m-6-resultado');

await pagina.locator('[data-acao="rejogar"]').scrollIntoViewIfNeeded();
await tela('m-7-resultado-fim');
await pagina.locator('[data-acao="rejogar"]').tap();

await pagina.getByRole('heading', { name: 'Enviar o resultado' }).waitFor();
await tela('m-8-envio');

assert.deepEqual(erros, [], `erros no navegador: ${erros.join(' | ')}`);
await navegador.close();
console.log(`OK (${paisagem ? 'paisagem' : 'retrato'}): partida completa no celular emulado, sem erros e sem rolagem lateral.`);
