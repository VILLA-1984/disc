/**
 * Teste de ponta a ponta da area de gerenciamento (/admin): acesso por senha, salvar a configuracao, e conferir
 * no jogo que ela vale (cenarios e avatares liberados, minimapa, barra de progresso, ranking, palavras por etapa e
 * textos). Requer o servidor em RUA_URL (padrao http://127.0.0.1:3100) com RUA_ADMIN_SENHA no .env e, de
 * preferencia, RUA_DADOS apontando para uma pasta temporaria e RUA_BANCO_LOCAL=1 (nao grava no Turso).
 *
 * Uso: node e2e/admin.mjs [pasta_das_capturas]
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

const senha = env.RUA_ADMIN_SENHA;
assert.ok(senha, 'defina RUA_ADMIN_SENHA no .env');

const chamar = (rota, corpo, cookie) => fetch(base + rota, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(corpo),
});

// ------------------------------------------------------------------ acesso (sem navegador)
assert.equal((await chamar('/api/admin/config', { restaurar: true })).status, 401, 'sem sessao nao grava');
assert.equal((await chamar('/api/admin/config', { restaurar: true }, 'rua_admin=9999999999999.falsa')).status, 401, 'cookie falso nao vale');
assert.equal((await chamar('/api/admin/login', { senha: 'senha errada' })).status, 401, 'senha errada');
const entrou = await chamar('/api/admin/login', { senha });
assert.equal(entrou.status, 200, 'senha certa');
const cookie = entrou.headers.get('set-cookie') ?? '';
assert.match(cookie, /rua_admin=/);
assert.match(cookie, /HttpOnly/i, 'o cookie de sessao nao pode ser lido por scripts');
const origemFalsa = await fetch(`${base}/api/admin/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie.split(';')[0], Origin: 'https://site-malicioso.example' },
    body: JSON.stringify({ restaurar: true }),
});
assert.equal(origemFalsa.status, 403, 'pedido de outro site e recusado mesmo com o cookie');
console.log('acesso: sem sessao, cookie falso, senha errada e origem falsa recusados; senha certa entra.');

// ------------------------------------------------------------------ gerenciamento (navegador)
const navegador = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const erros = [];
const novaPagina = async (viewport = { width: 1180, height: 900 }) => {
    const pagina = await (await navegador.newContext({ viewport })).newPage();
    pagina.on('pageerror', (e) => erros.push(e.message));
    pagina.on('dialog', (d) => d.accept());

    return pagina;
};

const admin = await novaPagina();
await admin.goto(`${base}/admin`);
await admin.locator('#senha-admin').waitFor();
await admin.fill('#senha-admin', 'errada');
await admin.getByRole('button', { name: 'Entrar' }).click();
await admin.getByText('Senha incorreta.').waitFor({ timeout: 10000 });
await admin.fill('#senha-admin', senha);
await admin.getByRole('button', { name: 'Entrar' }).click();
await admin.getByRole('heading', { name: 'Gerenciamento do teste' }).waitFor({ timeout: 15000 });
await admin.screenshot({ path: join(pasta, 'admin-1-padrao.png'), fullPage: true });

assert.equal(await admin.locator('#palavras-por-etapa').inputValue(), '12', 'comeca em 12 palavras por etapa');
assert.ok(await admin.getByRole('button', { name: 'Salvar' }).isDisabled(), 'sem alteracoes, nao ha o que salvar');

// Combinacao impossivel: sem nenhum avatar, o botao fica bloqueado e o aviso aparece.
await admin.getByRole('button', { name: 'Desmarcar todos' }).click();
await admin.getByText('Libere pelo menos um avatar.').first().waitFor();
assert.ok(await admin.getByRole('button', { name: 'Salvar' }).isDisabled(), 'sem avatares nao salva');

// Mais um caso impossivel: so quem usa cadeira, mas o rio liberado com o barco... o barco aceita cadeira; entao use moto no rio.
await admin.getByRole('checkbox', { name: /^Rafa/ }).check(); // Rafa e de moto
await admin.getByText(/Nenhum avatar liberado pode/).first().waitFor();
assert.ok(await admin.getByRole('button', { name: 'Salvar' }).isDisabled(), 'avatar de moto sozinho nao serve para barco');

// Configuracao valida: Ana (anda) e Gabriel (cadeira), so Rua e Rio, sem Ceu, Neve e Trilhos.
await admin.getByRole('checkbox', { name: /^Rafa/ }).uncheck();
await admin.getByRole('checkbox', { name: /^Ana/ }).check();
await admin.getByRole('checkbox', { name: /^Gabriel/ }).check();

for (const nome of [/^Céu/, /^Neve/, /^Trilhos/]) {
    await admin.getByRole('checkbox', { name: nome }).uncheck();
}

await admin.getByRole('checkbox', { name: /^Minimapa/ }).uncheck();
await admin.getByRole('checkbox', { name: /^Barra de progresso/ }).uncheck();
await admin.getByRole('checkbox', { name: /^Lista por perfil/ }).uncheck();
await admin.locator('#palavras-por-etapa').fill('8');
await admin.getByRole('textbox', { name: 'Título do teste', exact: true }).fill('Teste de Perfil Comportamental');
await admin.locator('.admin-texto', { hasText: 'Texto do fim do jogo' }).getByRole('checkbox').uncheck();

await admin.getByRole('button', { name: 'Salvar' }).click();
await admin.getByText(/Configuração salva/).waitFor({ timeout: 15000 });
await admin.screenshot({ path: join(pasta, 'admin-2-salvo.png'), fullPage: true });

// A configuracao foi para o banco: recarregar a tela mostra o que foi salvo.
await admin.reload();
await admin.getByRole('heading', { name: 'Gerenciamento do teste' }).waitFor();
assert.equal(await admin.locator('#palavras-por-etapa').inputValue(), '8');
assert.equal(await admin.getByRole('checkbox', { name: /^Minimapa/ }).isChecked(), false);
assert.equal(await admin.getByRole('checkbox', { name: /^Neve/ }).isChecked(), false);
assert.equal(await admin.getByRole('textbox', { name: 'Título do teste', exact: true }).inputValue(), 'Teste de Perfil Comportamental');
console.log('gerenciamento: avisos de combinacao impossivel, salvar e recarregar OK.');

// ------------------------------------------------------------------ o jogo obedece
const jogador = await novaPagina({ width: 1180, height: 900 });
await jogador.goto(base);
await jogador.getByRole('heading', { name: 'Teste de Perfil Comportamental' }).waitFor();
await jogador.check('#receber-nao');
await jogador.click('button[type=submit]');

const cartao = jogador.locator('#cartao.aberto');
await cartao.waitFor({ timeout: 30000 });
assert.equal((await jogador.textContent('#cartao-titulo')).trim(), 'Teste de Perfil Comportamental', 'o titulo editado vale no cartao de abertura');
assert.match(await jogador.textContent('#cartao-corpo'), /pega 8 das 48 palavras/, 'as palavras por etapa aparecem no texto de abertura');
await jogador.click('#cartao-botao'); // Vamos la
await cartao.waitFor();

assert.equal(await jogador.locator('.avatar-op').count(), 2, 'so Ana e Gabriel aparecem');
assert.equal(await jogador.locator('input[name="cenario"]').count(), 2, 'so Rua e Rio aparecem');
assert.equal(await jogador.locator('input[name="cenario"][value="neve"]').count(), 0);
assert.equal(await jogador.locator('input[name="cenario"][value="ar"]').count(), 0);
await jogador.screenshot({ path: join(pasta, 'admin-3-jogo-avatares.png') });

await jogador.check('input[name="cenario"][value="rio"]');
assert.ok(await jogador.locator('.meios').isVisible(), 'o rio tem varios meios liberados');
await jogador.click('#cartao-botao'); // Comecar
await cartao.waitFor({ timeout: 30000 });
assert.match(await jogador.textContent('#cartao-corpo'), /pegar 8 palavras no total/, 'a regra mostra 8 palavras');
await jogador.click('#cartao-botao');
await jogador.waitForFunction(() => !document.querySelector('#botao-cima').disabled, null, { timeout: 90000 });
await jogador.waitForTimeout(800);

assert.ok(await jogador.evaluate(() => document.querySelector('.rua-app').hasAttribute('data-sem-minimapa')), 'minimapa marcado como escondido');
assert.equal(await jogador.evaluate(() => getComputedStyle(document.querySelector('.rua-mapa')).display), 'none', 'minimapa escondido');
assert.equal(await jogador.evaluate(() => getComputedStyle(document.querySelector('.rua-hud-barra')).display), 'none', 'barra de progresso escondida');
assert.equal(await jogador.locator('.rua-totais li').count(), 0, 'sem a lista por perfil');
assert.ok(await jogador.locator('.rua-totais').isVisible(), 'o painel de totais (so o total) continua');
await jogador.screenshot({ path: join(pasta, 'admin-4-jogo-sem-mapa.png') });

const partida = await (await chamar('/api/iniciar', { anonimo: true })).json();
assert.equal(partida.ciclo.escolher, 8, 'o servidor sorteia a partida com 8 palavras por etapa');
console.log('jogo: titulo, avatares, cenarios, minimapa, barra, ranking e 8 palavras por etapa obedecem a configuracao.');

// ------------------------------------------------------------------ voltar ao padrao
await admin.getByRole('button', { name: 'Voltar ao padrão' }).click();
await admin.getByText('Tudo voltou ao padrão de fábrica.').waitFor({ timeout: 15000 });
assert.equal(await admin.locator('#palavras-por-etapa').inputValue(), '12');

const outro = await novaPagina();
await outro.goto(base);
await outro.getByRole('heading', { name: 'Teste de Perfil DISC' }).waitFor();
assert.equal((await (await chamar('/api/iniciar', { anonimo: true })).json()).ciclo.escolher, 12, 'de volta a 12 palavras por etapa');

// ------------------------------------------------------------------ sair
await admin.getByRole('button', { name: 'Sair' }).click();
await admin.locator('#senha-admin').waitFor({ timeout: 15000 }); // a pagina recarrega e pede a senha de novo
assert.equal(await admin.getByRole('heading', { name: 'Gerenciamento do teste' }).count(), 0, 'depois de sair, o formulario some');
assert.equal((await chamar('/api/admin/config', { restaurar: true })).status, 401, 'e a gravacao volta a ser recusada');

assert.deepEqual(erros, [], `erros no navegador: ${erros.join(' | ')}`);
await navegador.close();
console.log('OK: acesso por senha, gerenciamento, o jogo obedece a configuracao, voltar ao padrao e sair.');
