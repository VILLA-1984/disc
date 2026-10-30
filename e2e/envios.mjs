/**
 * Teste de ponta a ponta da tela de envio dos resultados (/whatsapp): acesso por usuario e senha, lista de quem se
 * cadastrou e de quem jogou sem cadastro (ID, barra de tempo), envio pelo wa.me, correcao do numero, "enviado",
 * descartar e a garantia de que o numero digitado para um anonimo nunca e gravado. As partidas sao jogadas pela API
 * (rapido); o navegador so abre a tela da equipe. Requer o servidor em RUA_URL (padrao http://127.0.0.1:3100) com
 * USER_AREA_ADM e PASS_AREA_ADM no .env e, de preferencia, RUA_DADOS temporario e RUA_BANCO_LOCAL=1.
 *
 * Uso: node e2e/envios.mjs [pasta_das_capturas]
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { criarCiclo } from '../src/jogo/ciclo.js';

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

const usuario = env.USER_AREA_ADM;
const senha = env.PASS_AREA_ADM;
assert.ok(usuario && senha, 'defina USER_AREA_ADM e PASS_AREA_ADM no .env');

const json = (rota, corpo, cabecalhos = {}) => fetch(base + rota, { method: 'POST', headers: { 'Content-Type': 'application/json', ...cabecalhos }, body: JSON.stringify(corpo) });

/** Joga uma partida inteira pela API: pega uma de cada tres palavras e conclui. Devolve a resposta de /api/concluir. */
async function jogarPelaApi(corpoIniciar) {
    const iniciada = await (await json('/api/iniciar', corpoIniciar)).json();
    assert.ok(iniciada.ciclo, `a partida devia vir em ciclo: ${JSON.stringify(iniciada).slice(0, 120)}`);
    const escolhas = [];

    iniciada.ciclo.etapas.forEach((ordens, stage) => {
        const etapa = criarCiclo(ordens, iniciada.ciclo.escolher);
        let i = 0;

        for (let id = etapa.proximo(); id !== null; id = etapa.proximo()) {
            const take = i++ % 3 === 0;
            etapa.registrar(take);
            escolhas.push({ stage, take, ms: 400 });
        }
    });

    const resposta = await json('/api/concluir', { token: iniciada.token, escolhas });
    assert.equal(resposta.status, 200, 'concluir a partida');

    return { ...(await resposta.json()), token: iniciada.token };
}

// ------------------------------------------------------------------ acesso
const aberta = ['GET', 'POST', 'DELETE'];

for (const metodo of aberta) {
    const r = await fetch(`${base}/api/admin/envios${metodo === 'DELETE' ? '?id=1' : ''}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: metodo === 'POST' ? JSON.stringify({ acao: 'enviado', id: 1 }) : undefined,
    });
    assert.equal(r.status, 401, `${metodo} sem sessao e recusado`);
}

assert.equal((await fetch(`${base}/api/admin/envios`, { headers: { Cookie: 'rua_admin=9999999999999.falsa' } })).status, 401, 'cookie falso nao vale');
const redirecionado = await fetch(`${base}/whatsaap`, { redirect: 'manual' });
assert.ok([307, 308].includes(redirecionado.status) && redirecionado.headers.get('location')?.endsWith('/whatsapp'), 'o erro de digitacao /whatsaap leva a /whatsapp');
console.log('acesso: sem sessao e cookie falso recusados; /whatsaap redireciona.');

// ------------------------------------------------------------------ partidas
// Nome unico por rodada: o banco do servidor de teste guarda as rodadas anteriores.
const nomeJoana = `Joana ${Date.now().toString(36)}`;
const joana = await jogarPelaApi({ nome: nomeJoana, whatsapp: '(65) 99999-1111' });
const anonimoA = await jogarPelaApi({ anonimo: true });
const anonimoB = await jogarPelaApi({ anonimo: true });

assert.equal(joana.envio.idExibicao, null, 'quem se cadastrou nao precisa de ID');
assert.match(anonimoA.envio.idExibicao, /^[A-HJKMNP-Z]{3}-[2-9]{3}$/);
assert.notEqual(anonimoA.envio.idExibicao, anonimoB.envio.idExibicao);
assert.ok(anonimoA.envio.restanteMs > 290000 && anonimoA.envio.restanteMs <= 300000, `prazo de 5 minutos (veio ${anonimoA.envio.restanteMs} ms)`);

// concluir de novo a mesma partida devolve o mesmo ID (sem duplicar nem renovar o prazo)
const repetida = await (await json('/api/concluir', { token: anonimoA.token, escolhas: [] })).status;
assert.equal(repetida, 422, 'escolhas vazias nao concluem');
console.log(`partidas: Joana (cadastrada), ${anonimoA.envio.idExibicao} e ${anonimoB.envio.idExibicao} (sem cadastro).`);

// ------------------------------------------------------------------ a tela
const navegador = await chromium.launch({ channel: 'msedge', headless: true });
const contexto = await navegador.newContext({ viewport: { width: 1180, height: 1000 } });
const pagina = await contexto.newPage();
const erros = [];
pagina.on('pageerror', (e) => erros.push(e.message));
pagina.on('dialog', (d) => d.accept());
await pagina.addInitScript(() => {
    window.__abertos = [];
    window.open = (url) => { window.__abertos.push(url); return {}; };
});

await pagina.goto(`${base}/whatsapp`);
await pagina.locator('#senha-admin').waitFor();
await pagina.fill('#usuario-admin', usuario);
await pagina.fill('#senha-admin', 'errada');
await pagina.getByRole('button', { name: 'Entrar' }).click();
await pagina.getByText('Usuário ou senha incorretos.').waitFor({ timeout: 10000 });
await pagina.fill('#senha-admin', senha);
await pagina.getByRole('button', { name: 'Entrar' }).click();
await pagina.getByRole('heading', { name: 'Envio de resultados' }).waitFor({ timeout: 15000 });

// Anonimos: ID, animal, barra de tempo no alto do cartao e contagem regressiva.
const cartaoA = pagina.locator('.envio--anonimo', { hasText: anonimoA.envio.idExibicao });
await cartaoA.waitFor();
assert.ok(await pagina.locator('.envio--anonimo').count() >= 2, 'os dois anonimos aparecem (pode haver outros, de rodadas anteriores ainda dentro do prazo)');
const barra = cartaoA.locator('[role="progressbar"]');
const restante = Number(await barra.getAttribute('aria-valuenow'));
assert.ok(restante > 240 && restante <= 300, `a barra devia mostrar cerca de 5 minutos (mostra ${restante} s)`);
assert.equal(await barra.getAttribute('aria-valuemax'), '300');
assert.ok((await cartaoA.locator('.envio-prazo').boundingBox()).y < (await cartaoA.locator('.envio-id').boundingBox()).y, 'a barra fica por cima do cartao');
assert.match(await cartaoA.locator('.envio-tempo').textContent(), /Apaga em [3-4]:\d{2}/);
const larguraAntes = await cartaoA.locator('.envio-prazo span').evaluate((el) => el.getBoundingClientRect().width);
await pagina.waitForTimeout(3500);
const larguraDepois = await cartaoA.locator('.envio-prazo span').evaluate((el) => el.getBoundingClientRect().width);
assert.ok(larguraDepois < larguraAntes, 'a barra diminui com o tempo');

// Cadastrada: nome, numero ja preenchido, a enviar.
const cartaoJ = pagina.locator('.envio', { hasText: nomeJoana });
assert.equal(await cartaoJ.getByLabel(`WhatsApp de ${nomeJoana}`).inputValue(), '(65) 99999-1111');
await pagina.screenshot({ path: join(pasta, 'envios-1-lista.png'), fullPage: true });

// Enviar para a cadastrada: abre o wa.me com o nome na mensagem e marca como enviado.
await cartaoJ.getByRole('button', { name: 'Enviar pelo WhatsApp' }).click();
await pagina.waitForFunction(() => window.__abertos.length === 1);
let abertos = await pagina.evaluate(() => window.__abertos);
assert.match(abertos[0], /^https:\/\/wa\.me\/5565999991111\?text=/);
assert.match(decodeURIComponent(abertos[0].split('?text=')[1]), /^Olá, Joana!/);
await cartaoJ.waitFor({ state: 'detached', timeout: 15000 }); // saiu de "A enviar"
await pagina.getByRole('button', { name: 'Enviados' }).click();
const enviadaJ = pagina.locator('.envio', { hasText: nomeJoana });
await enviadaJ.getByText(/Enviado às/).waitFor();

// Desfazer volta para "A enviar".
await enviadaJ.getByRole('button', { name: /Desfazer/ }).click();
await enviadaJ.waitFor({ state: 'detached', timeout: 15000 }); // saiu de "Enviados"
await pagina.getByRole('button', { name: 'A enviar' }).click();
await cartaoJ.waitFor();

// Numero corrigido: o wa.me usa o numero novo e o cadastro e atualizado.
await cartaoJ.getByLabel(`WhatsApp de ${nomeJoana}`).fill('65988887777');
await cartaoJ.getByRole('button', { name: 'Enviar pelo WhatsApp' }).click();
await pagina.waitForFunction(() => window.__abertos.length === 2);
abertos = await pagina.evaluate(() => window.__abertos);
assert.match(abertos[1], /^https:\/\/wa\.me\/5565988887777\?text=/);

const sessao = (await contexto.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
const lerLista = async () => (await fetch(`${base}/api/admin/envios`, { headers: { Cookie: sessao } })).json();
assert.equal((await lerLista()).cadastrados.find((c) => c.nome === nomeJoana).whatsapp, '65988887777', 'numero corrigido gravado');

// Depois de enviada, ela sai de "A enviar": volta a aparecer em "Todos".
await pagina.getByRole('button', { name: 'Todos' }).click();

// Numero invalido: nao abre nada e explica.
await cartaoJ.getByLabel(`WhatsApp de ${nomeJoana}`).fill('659');
await cartaoJ.getByRole('button', { name: /Enviar/ }).click();
await pagina.getByText(/incompleto/).waitFor();
assert.equal((await pagina.evaluate(() => window.__abertos)).length, 2, 'numero invalido nao abre o WhatsApp');

// Anonimo: sem numero nao envia; com numero abre o wa.me sem nome e marca como enviado.
await cartaoA.getByRole('button', { name: 'Enviar pelo WhatsApp' }).click();
await pagina.getByText('Informe o número do WhatsApp.').waitFor();
await cartaoA.getByLabel(`WhatsApp de quem tem o ID ${anonimoA.envio.idExibicao}`).fill('65977776666');
await cartaoA.getByRole('button', { name: 'Enviar pelo WhatsApp' }).click();
await pagina.waitForFunction(() => window.__abertos.length === 3);
abertos = await pagina.evaluate(() => window.__abertos);
assert.match(abertos[2], /^https:\/\/wa\.me\/5565977776666\?text=/);
assert.match(decodeURIComponent(abertos[2].split('?text=')[1]), /^Olá! Este é o seu resultado/);
await cartaoA.getByText(/Enviado às/).waitFor();

// O numero digitado para o anonimo nunca e gravado: nao aparece em nenhuma resposta da API.
const texto = JSON.stringify(await lerLista());
assert.ok(!texto.includes('65977776666'), 'o numero do anonimo nao pode estar guardado');
assert.ok(!texto.includes('77776666'));

// Descartar o outro anonimo apaga na hora.
const cartaoB = pagina.locator('.envio--anonimo', { hasText: anonimoB.envio.idExibicao });
await cartaoB.getByRole('button', { name: 'Descartar resultado' }).click();
await cartaoB.waitFor({ state: 'detached', timeout: 15000 });
assert.ok(!(await lerLista()).anonimos.some((a) => a.idExibicao === anonimoB.envio.idExibicao), 'descartado some da lista da equipe');
assert.equal((await json('/api/admin/envios', { acao: 'enviado', id: 999999 }, { Cookie: sessao })).status, 404, 'resultado que nao existe mais');
await pagina.screenshot({ path: join(pasta, 'envios-2-depois.png'), fullPage: true });

// Cadastrado nao se descarta pela rota de anonimos.
const idJoana = (await lerLista()).cadastrados.find((c) => c.nome === nomeJoana).id;
await fetch(`${base}/api/admin/envios?id=${idJoana}`, { method: 'DELETE', headers: { Cookie: sessao } });
assert.ok((await lerLista()).cadastrados.some((c) => c.nome === nomeJoana), 'o resultado de quem se cadastrou nao e descartado');

// No celular a lista cabe na tela, sem rolagem lateral.
const celular = await (await navegador.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await celular.context().addCookies((await contexto.cookies()));
await celular.goto(`${base}/whatsapp`);
await celular.getByRole('heading', { name: 'Envio de resultados' }).waitFor();
assert.ok(await celular.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sem rolagem lateral no celular');
await celular.screenshot({ path: join(pasta, 'envios-3-celular.png'), fullPage: true });

// Sair
await pagina.getByRole('button', { name: 'Sair' }).click();
await pagina.locator('#senha-admin').waitFor({ timeout: 15000 });

assert.deepEqual(erros, [], `erros no navegador: ${erros.join(' | ')}`);
await navegador.close();
console.log('OK: acesso, lista com ID e barra de tempo, envio pelo wa.me, correcao do numero, enviado/desfazer, descartar e numero de anonimo nunca gravado.');
