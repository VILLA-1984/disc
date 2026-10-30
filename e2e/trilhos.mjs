/**
 * Teste de ponta a ponta do cenario dos trilhos: para cada meio (locomotiva e draisina) abre o jogo dentro de um evento,
 * escolhe os trilhos e o meio, comeca a etapa, faz 3 escolhas e salva uma captura (e uma da vista lateral da locomotiva).
 * Requer o servidor em RUA_URL (padrao http://127.0.0.1:3100) com USER_AREA_ADM e PASS_AREA_ADM no .env.
 * RUA_QUERY acrescenta uma query a URL (ex.: '?fps=1' ou '?modelos=0').
 *
 * Uso: node e2e/trilhos.mjs [pasta_das_capturas] [avatar]
 */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { eventoDeTeste } from './comum.mjs';

const base = process.env.RUA_URL ?? 'http://127.0.0.1:3100';
const pasta = process.argv[2] ?? 'e2e/capturas';
const avatarPedido = process.argv[3] ?? 'ana';
mkdirSync(pasta, { recursive: true });

const evento = await eventoDeTeste(base, 'Trilhos E2E');
const url = `${base}/e/${evento.slug}${process.env.RUA_QUERY ?? ''}`;
const navegador = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const erros = [];

async function nosTrilhos(meio, { vista = '3d' } = {}) {
    const contexto = await navegador.newContext({ viewport: { width: 1180, height: 860 } });
    const pagina = await contexto.newPage();
    pagina.on('pageerror', (e) => erros.push(`${meio}: ${e.message}`));
    pagina.on('console', (m) => m.type() === 'error' && erros.push(`${meio}: ${m.text()}`));

    await pagina.goto(url);
    await pagina.check('#receber-nao');
    await pagina.getByRole('button', { name: 'Começar a jogar' }).click();
    const cartao = pagina.locator('#cartao.aberto');
    await cartao.waitFor({ timeout: 30000 });
    await pagina.click('#cartao-botao');
    await cartao.waitFor();

    await pagina.click(`.avatar-op[data-id="${avatarPedido}"]`);
    await pagina.check('input[name="cenario"][value="trilhos"]');
    await pagina.check(`input[name="meio"][value="${meio}"]`);
    await pagina.check(`input[name="vista"][value="${vista}"]`);
    await pagina.click('#cartao-botao');
    await cartao.waitFor({ timeout: 30000 });
    await pagina.click('#cartao-botao');
    await pagina.waitForFunction(() => !document.querySelector('#botao-cima').disabled, null, { timeout: 90000 });
    await pagina.waitForTimeout(1500);

    return pagina;
}

for (const meio of (process.env.RUA_MEIOS ?? 'locomotiva,draisina').split(',')) {
    const pagina = await nosTrilhos(meio);
    await pagina.screenshot({ path: join(pasta, `trilhos-${meio}.png`) });

    for (let i = 0; i < 3; i++) {
        const cima = await pagina.evaluate(() => document.querySelector('#botao-cima strong').textContent.trim());
        await pagina.click(cima === 'Deixar passar' ? '#botao-baixo' : '#botao-cima');
        await pagina.waitForFunction(() => document.querySelector('#botao-cima').disabled, null, { timeout: 10000 });
        await pagina.waitForFunction(() => !document.querySelector('#botao-cima').disabled || document.querySelector('#cartao.aberto'), null, { timeout: 60000 });
    }

    await pagina.context().close();
    console.log(`trilhos / ${meio}: primeiro portao e 3 escolhas OK.`);
}

if (!process.env.RUA_MEIOS) {
    const lateral = await nosTrilhos('locomotiva', { vista: 'lateral' });
    await lateral.screenshot({ path: join(pasta, 'trilhos-locomotiva-lateral.png') });
    await lateral.context().close();
}

assert.deepEqual(erros, [], `erros no navegador: ${erros.join(' | ')}`);
await navegador.close();
console.log('OK: os trilhos abrem com locomotiva e draisina, sem erros.');
