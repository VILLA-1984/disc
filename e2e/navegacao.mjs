/**
 * Teste de ponta a ponta da navbar das telas da equipe (/admin, /eventos e /whatsapp): todos os links em formato de
 * botao, a tela atual em destaque, navegar entre as telas, "Sair", e o menu sanduiche no celular (abrir, fechar com Esc,
 * fechar com toque fora, fechar ao navegar, barra fixa no alto). Requer o servidor em RUA_URL (padrao
 * http://127.0.0.1:3100) com USER_AREA_ADM e PASS_AREA_ADM no .env.
 *
 * Uso: node e2e/navegacao.mjs [pasta_das_capturas]
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.RUA_URL ?? 'http://127.0.0.1:3100';
const pasta = process.argv[2] ?? 'e2e/capturas';
mkdirSync(pasta, { recursive: true });

const env = {};

for (const linha of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const achado = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);

    if (achado) {
        env[achado[1]] = achado[2].replace(/^["']|["']$/g, '');
    }
}

assert.ok(env.USER_AREA_ADM && env.PASS_AREA_ADM, 'defina USER_AREA_ADM e PASS_AREA_ADM no .env');

const navegador = await chromium.launch({ channel: 'msedge', headless: true });
const contexto = await navegador.newContext({ viewport: { width: 1180, height: 800 } });
const pagina = await contexto.newPage();
const erros = [];
pagina.on('pageerror', (e) => erros.push(e.message));

const menu = (p) => p.getByRole('navigation', { name: 'Menu da equipe' });
const link = (p, nome) => menu(p).getByRole('link', { name: nome, exact: true });

// Sem entrar, nao ha navbar (so o login).
await pagina.goto(`${base}/admin`);
await pagina.locator('#senha-admin').waitFor();
assert.equal(await pagina.locator('.nav-admin').count(), 0, 'sem login, sem navbar');

await pagina.fill('#usuario-admin', env.USER_AREA_ADM);
await pagina.fill('#senha-admin', env.PASS_AREA_ADM);
await pagina.getByRole('button', { name: 'Entrar' }).click();
await pagina.getByRole('heading', { name: 'Gerenciamento do teste' }).waitFor({ timeout: 15000 });

// ------------------------------------------------------------------ computador
for (const nome of ['Gerenciamento', 'Eventos', 'Envio de resultados', 'Abrir o jogo', 'Manual']) {
    assert.ok(await link(pagina, nome).isVisible(), `link "${nome}" visivel`);
}

assert.ok(await menu(pagina).getByRole('button', { name: 'Sair' }).isVisible(), 'botao Sair visivel');
assert.ok(!(await pagina.getByRole('button', { name: 'Abrir o menu' }).isVisible()), 'no computador nao ha menu sanduiche');
assert.equal(await link(pagina, 'Gerenciamento').getAttribute('aria-current'), 'page', 'a tela atual fica marcada');
assert.equal(await link(pagina, 'Eventos').getAttribute('aria-current'), null);
assert.ok(await link(pagina, 'Gerenciamento').evaluate((el) => el.classList.contains('atual')));

// O jogo e o manual abrem em outra aba, sem tirar a equipe da tela.
for (const [nome, href] of [['Abrir o jogo', '/'], ['Manual', '/manual']]) {
    assert.equal(await link(pagina, nome).getAttribute('href'), href);
    assert.equal(await link(pagina, nome).getAttribute('target'), '_blank');
    assert.match(await link(pagina, nome).getAttribute('rel'), /noopener/);
}

// Barra fixa no alto (acompanha a rolagem)
await pagina.evaluate(() => window.scrollTo(0, 1200));
await pagina.waitForTimeout(200);
assert.ok(Math.abs((await pagina.locator('.nav-admin').boundingBox()).y) < 1, 'a navbar acompanha a rolagem');
await pagina.evaluate(() => window.scrollTo(0, 0));
await pagina.screenshot({ path: join(pasta, 'nav-1-desktop-admin.png') });

// Navegar entre as telas pelos botoes
await link(pagina, 'Eventos').click();
await pagina.getByRole('heading', { name: 'Eventos', exact: true }).waitFor({ timeout: 15000 });
assert.equal(await link(pagina, 'Eventos').getAttribute('aria-current'), 'page');
assert.equal(await link(pagina, 'Gerenciamento').getAttribute('aria-current'), null, 'so a tela atual fica marcada');
await pagina.screenshot({ path: join(pasta, 'nav-2-desktop-eventos.png') });

await link(pagina, 'Envio de resultados').click();
await pagina.getByRole('heading', { name: 'Envio de resultados', level: 1 }).waitFor({ timeout: 15000 });
assert.equal(await link(pagina, 'Envio de resultados').getAttribute('aria-current'), 'page');
assert.equal(new URL(pagina.url()).pathname, '/whatsapp');

await link(pagina, 'Gerenciamento').click();
await pagina.getByRole('heading', { name: 'Gerenciamento do teste' }).waitFor({ timeout: 15000 });
assert.equal(new URL(pagina.url()).pathname, '/admin');
console.log('computador: links em botoes, tela atual marcada, navegacao entre as tres telas e barra fixa OK.');

// ------------------------------------------------------------------ celular (menu sanduiche)
const celular = await (await navegador.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await celular.context().addCookies(await contexto.cookies());
celular.on('pageerror', (e) => erros.push(e.message));
await celular.goto(`${base}/eventos`);
await celular.getByRole('heading', { name: 'Eventos', exact: true }).waitFor();

const sanduiche = celular.getByRole('button', { name: 'Abrir o menu' });
assert.ok(await sanduiche.isVisible(), 'no celular ha o menu sanduiche');
assert.equal(await sanduiche.getAttribute('aria-expanded'), 'false');
assert.ok(!(await link(celular, 'Gerenciamento').isVisible()), 'fechado, os links ficam escondidos');
assert.ok(await celular.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sem rolagem lateral');
await celular.screenshot({ path: join(pasta, 'nav-3-celular-fechado.png') });

// abrir
await sanduiche.click();
await celular.getByRole('button', { name: 'Fechar o menu' }).waitFor();
assert.equal(await celular.getByRole('button', { name: 'Fechar o menu' }).getAttribute('aria-expanded'), 'true');

for (const nome of ['Gerenciamento', 'Eventos', 'Envio de resultados', 'Abrir o jogo', 'Manual']) {
    assert.ok(await link(celular, nome).isVisible(), `aberto, "${nome}" aparece`);
}

assert.ok(await menu(celular).getByRole('button', { name: 'Sair' }).isVisible());
assert.equal(await link(celular, 'Eventos').getAttribute('aria-current'), 'page');
await celular.screenshot({ path: join(pasta, 'nav-4-celular-aberto.png') });

// cada botao ocupa a largura toda e e grande o bastante para o toque
const caixa = await link(celular, 'Gerenciamento').boundingBox();
assert.ok(caixa.height >= 44, `botao com altura de toque (${caixa.height}px)`);
assert.ok(caixa.width > 300, 'botao na largura do menu');

// fechar com Esc
await celular.keyboard.press('Escape');
await celular.getByRole('button', { name: 'Abrir o menu' }).waitFor();
assert.ok(!(await link(celular, 'Gerenciamento').isVisible()), 'Esc fecha o menu');

// fechar com toque fora
await celular.getByRole('button', { name: 'Abrir o menu' }).click();
await link(celular, 'Manual').waitFor();
await celular.mouse.click(200, 700);
await celular.getByRole('button', { name: 'Abrir o menu' }).waitFor();
assert.ok(!(await link(celular, 'Manual').isVisible()), 'toque fora fecha o menu');

// navegar fecha o menu e a barra continua no alto depois de rolar
await celular.getByRole('button', { name: 'Abrir o menu' }).click();
await link(celular, 'Gerenciamento').click();
await celular.getByRole('heading', { name: 'Gerenciamento do teste' }).waitFor({ timeout: 15000 });
await celular.getByRole('button', { name: 'Abrir o menu' }).waitFor();
assert.ok(!(await link(celular, 'Eventos').isVisible()), 'ao navegar o menu fecha');
assert.equal(new URL(celular.url()).pathname, '/admin', 'a pagina e a nova');
await celular.evaluate(() => window.scrollTo(0, 1500));
await celular.waitForTimeout(200);
assert.ok(Math.abs((await celular.locator('.nav-admin').boundingBox()).y) < 1, 'no celular a barra tambem fica no alto');
await celular.getByRole('button', { name: 'Abrir o menu' }).click();
await celular.screenshot({ path: join(pasta, 'nav-5-celular-rolado.png') });
console.log('celular: menu sanduiche abre, fecha com Esc, com toque fora e ao navegar; barra fixa; botoes de toque.');

// ------------------------------------------------------------------ sair
await menu(pagina).getByRole('button', { name: 'Sair' }).click();
await pagina.locator('#senha-admin').waitFor({ timeout: 15000 });
assert.equal(await pagina.locator('.nav-admin').count(), 0, 'depois de sair, a navbar some');

assert.deepEqual(erros, [], `erros no navegador: ${erros.join(' | ')}`);
await navegador.close();
console.log('OK: navbar em botoes, tela atual em destaque, navegacao entre as telas, Sair e menu sanduiche no celular.');
