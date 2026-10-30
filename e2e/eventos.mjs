/**
 * Teste de ponta a ponta dos eventos: acesso por usuario e senha, criar, ligar/desligar e renomear um evento, o
 * ranking proprio de cada evento (separado do "sem evento"), a pagina do jogo do evento (/e/<slug>) e o telao
 * (/e/<slug>/telao) com as animacoes dos animais. As partidas sao jogadas pela API (rapido). Requer o servidor em
 * RUA_URL (padrao http://127.0.0.1:3100) com USER_AREA_ADM e PASS_AREA_ADM no .env e, de preferencia, RUA_DADOS
 * temporario e RUA_BANCO_LOCAL=1.
 *
 * Uso: node e2e/eventos.mjs [pasta_das_capturas]
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

const json = (rota, corpo, cabecalhos = {}, metodo = 'POST') => fetch(base + rota, { method: metodo, headers: { 'Content-Type': 'application/json', ...cabecalhos }, body: JSON.stringify(corpo) });
const totais = async (slug) => (await fetch(`${base}/api/totais${slug ? `?evento=${slug}` : ''}`)).json();

/** Joga uma partida inteira pela API (uma de cada tres palavras) e conclui. */
async function jogarPelaApi(corpoIniciar) {
    const resposta = await json('/api/iniciar', corpoIniciar);

    if (resposta.status !== 200) {
        return { status: resposta.status, corpo: await resposta.json() };
    }

    const iniciada = await resposta.json();
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

    const concluida = await json('/api/concluir', { token: iniciada.token, escolhas });
    assert.equal(concluida.status, 200, 'concluir a partida');

    return { status: 200, corpo: await concluida.json() };
}

// ------------------------------------------------------------------ acesso
assert.equal((await fetch(`${base}/api/admin/eventos`)).status, 401, 'GET sem sessao');
assert.equal((await json('/api/admin/eventos', { nome: 'Invasor' })).status, 401, 'POST sem sessao');
assert.equal((await json('/api/admin/eventos', { id: 1, ativo: false }, {}, 'PATCH')).status, 401, 'PATCH sem sessao');
assert.equal((await fetch(`${base}/api/admin/eventos`, { headers: { Cookie: 'rua_admin=9999999999999.falsa' } })).status, 401, 'cookie falso');
assert.equal((await fetch(`${base}/e/nao-existe`)).status, 404, 'evento que nao existe');
assert.equal((await fetch(`${base}/e/nao-existe/telao`)).status, 404, 'telao de evento que nao existe');
assert.equal((await fetch(`${base}/api/totais?evento=nao-existe`)).status, 404, 'totais de evento que nao existe');
assert.equal((await json('/api/iniciar', { anonimo: true, evento: 'nao-existe' })).status, 404, 'iniciar em evento que nao existe');
assert.equal((await json('/api/iniciar', { anonimo: true, evento: '../admin' })).status, 404, 'endereco malicioso');
console.log('acesso: sem sessao e cookie falso recusados; evento inexistente da 404.');

// ------------------------------------------------------------------ tela de gerenciamento
const navegador = await chromium.launch({ channel: 'msedge', headless: true });
const contexto = await navegador.newContext({ viewport: { width: 1180, height: 900 } });
const pagina = await contexto.newPage();
const erros = [];
pagina.on('pageerror', (e) => erros.push(e.message));
await pagina.addInitScript(() => { window.__copiado = null; });

await pagina.goto(`${base}/eventos`);
await pagina.locator('#senha-admin').waitFor();
await pagina.fill('#usuario-admin', usuario);
await pagina.fill('#senha-admin', senha);
await pagina.getByRole('button', { name: 'Entrar' }).click();
await pagina.getByRole('heading', { name: 'Eventos', exact: true }).waitFor({ timeout: 15000 });

// Criar
const nomeEvento = `Feira E2E ${Date.now().toString(36)}`;
assert.ok(await pagina.getByRole('button', { name: 'Criar evento' }).isDisabled(), 'sem nome nao cria');
await pagina.getByLabel('Nome do evento').fill(nomeEvento);
await pagina.getByRole('button', { name: 'Criar evento' }).click();
await pagina.getByText(/criado e ligado/).waitFor({ timeout: 15000 });
const primeiro = pagina.locator('.evento', { hasText: nomeEvento });
await primeiro.waitFor();
await primeiro.getByText('Ligado', { exact: true }).waitFor();
const jogoUrl = await primeiro.locator('.evento-links a').nth(0).textContent();
const telaoUrl = await primeiro.locator('.evento-links a').nth(1).textContent();
const slug = new URL(jogoUrl).pathname.replace('/e/', '');
assert.match(slug, /^feira-e2e-[a-z0-9]+$/, 'o endereco sai do nome');
assert.equal(new URL(telaoUrl).pathname, `/e/${slug}/telao`);
// Daqui em diante o cartao e achado pelo endereco (outro evento ganha o mesmo nome mais abaixo).
const cartao = pagina.locator('.evento').filter({ has: pagina.locator(`.evento-links a[href$="/e/${slug}"]`) });
await cartao.locator('.evento-qr svg').waitFor();
await pagina.screenshot({ path: join(pasta, 'eventos-1-lista.png'), fullPage: true });

// Nome repetido ganha outro endereco (nao sobrescreve)
await pagina.getByLabel('Nome do evento').fill(nomeEvento);
await pagina.getByRole('button', { name: 'Criar evento' }).click();
await pagina.locator('.evento', { hasText: nomeEvento }).nth(1).waitFor();
assert.equal(await pagina.locator('.evento', { hasText: nomeEvento }).count(), 2);
const slugs = await pagina.locator('.evento', { hasText: nomeEvento }).locator('.evento-links > div:first-child a').allTextContents();
assert.equal(new Set(slugs).size, 2, 'dois enderecos diferentes');
assert.ok(slugs.some((s) => s.endsWith(`/${slug}-2`)), 'o segundo ganha -2');

// ------------------------------------------------------------------ desligar e ligar
await cartao.getByRole('button', { name: 'Desligar evento' }).click();
await cartao.getByText('Desligado', { exact: true }).waitFor({ timeout: 15000 });
const fechado = await jogarPelaApi({ anonimo: true, evento: slug });
assert.equal(fechado.status, 409, 'evento desligado nao recebe partidas');
assert.match(fechado.corpo.erro, /não está recebendo participantes/);

const paginaFechada = await (await contexto.newPage()).goto(`${base}/e/${slug}`);
assert.equal(paginaFechada.status(), 200);
await cartao.getByRole('button', { name: 'Ligar evento' }).click();
await cartao.getByText('Ligado', { exact: true }).waitFor({ timeout: 15000 });

// ------------------------------------------------------------------ ranking proprio de cada evento
const semEventoAntes = (await totais()).total;
const eventoAntes = (await totais(slug)).total;
assert.equal(eventoAntes, 0, 'evento novo comeca do zero');

const noEvento = await jogarPelaApi({ anonimo: true, evento: slug });
assert.equal(noEvento.status, 200);
assert.equal((await totais(slug)).total, 1, 'a partida contou no evento');
assert.equal((await totais()).total, semEventoAntes, 'e nao contou no "sem evento"');

const semEvento = await jogarPelaApi({ anonimo: true });
assert.equal(semEvento.status, 200);
assert.equal((await totais()).total, semEventoAntes + 1, 'partida sem evento conta no geral');
assert.equal((await totais(slug)).total, 1, 'e nao no evento');

// o resultado de quem jogou no evento continua indo para a equipe enviar
assert.match(noEvento.corpo.envio.idExibicao, /^[A-HJKMNP-Z]{3}-[2-9]{3}$/);

// A lista mostra o total do evento (atualiza sozinha; "Atualizar agora" forca)
await pagina.getByRole('button', { name: 'Atualizar agora' }).click();
await cartao.getByText('partida', { exact: false }).first().waitFor();
await pagina.waitForFunction((n) => [...document.querySelectorAll('.evento')].some((c) => c.textContent.includes(n) && /(?<!\d)1 partida(?!s)/.test(c.textContent)), nomeEvento, { timeout: 15000 });

// ------------------------------------------------------------------ renomear
await cartao.getByRole('button', { name: 'Renomear' }).click();
await cartao.getByLabel(`Novo nome de ${nomeEvento}`).fill(`${nomeEvento} (renomeado)`);
await cartao.getByRole('button', { name: 'Salvar nome' }).click();
await pagina.getByText(/Nome atualizado/).waitFor({ timeout: 15000 });
await pagina.locator('.evento', { hasText: `${nomeEvento} (renomeado)` }).waitFor();
assert.equal((await pagina.locator('.evento', { hasText: `${nomeEvento} (renomeado)` }).locator('.evento-links a').first().textContent()), jogoUrl, 'o endereco nao muda ao renomear');

// ------------------------------------------------------------------ pagina do jogo do evento
const jogo = await contexto.newPage();
await jogo.goto(`${base}/e/${slug}`);
await jogo.locator('.evento-rotulo').waitFor();
assert.match(await jogo.textContent('.evento-rotulo'), /Feira E2E .* \(renomeado\)/);
await jogo.locator('.totais-inicio').waitFor();
assert.match(await jogo.textContent('.totais-inicio-geral'), /Total geral\s*1/, 'o ranking da tela inicial e o do evento');
assert.match(await jogo.getAttribute('.qr-codigo', 'aria-label'), new RegExp(`/e/${slug}$`), 'o QR code leva ao evento');
await jogo.screenshot({ path: join(pasta, 'eventos-2-jogo-do-evento.png') });

const inicio = await contexto.newPage();
await inicio.goto(base);
await inicio.locator('.totais-inicio').waitFor();
assert.equal(await inicio.locator('.evento-rotulo').count(), 0, 'a raiz nao e de nenhum evento');
assert.match(await inicio.textContent('.totais-inicio-geral'), new RegExp(`Total geral\\s*${semEventoAntes + 1}`), 'a raiz mostra o ranking sem evento');

// ------------------------------------------------------------------ telao
const telao = await (await navegador.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
telao.on('pageerror', (e) => erros.push(e.message));
await telao.goto(`${base}/e/${slug}/telao?intervalo=5`);
await telao.locator('.telao-ranking li').first().waitFor();
assert.equal(await telao.locator('.telao-ranking li').count(), 5, 'quatro animais e o equilibrado');
assert.match(await telao.textContent('.telao-evento'), /Feira E2E .* \(renomeado\)/);
assert.match(await telao.textContent('.telao-geral'), /Total geral\s*1/);
await telao.screenshot({ path: join(pasta, 'eventos-3-telao-ranking.png') });

// De tempos em tempos, um animal ganha a tela (intervalo de 5 s): o primeiro da ordem e o tubarao.
const destaque = telao.locator('.telao-destaque');
await destaque.waitFor({ timeout: 15000 });
assert.ok(await destaque.evaluate((el) => el.classList.contains('telao-destaque--tubarao')), 'o ciclo comeca pelo tubarao');
assert.match(await destaque.textContent(), /Tubarão/);
assert.match(await destaque.textContent(), /Nhac!/);
await telao.waitForTimeout(2800);
await telao.screenshot({ path: join(pasta, 'eventos-4-telao-tubarao.png') });
const posicaoNaCena = await destaque.locator('.telao-animal').evaluate((el) => el.getBoundingClientRect().x);
await telao.waitForTimeout(700);
const animado = await destaque.locator('.telao-animal').evaluate((el) => getComputedStyle(el).animationName);
assert.match(animado, /tubarao/, 'o tubarao tem a sua propria animacao');
assert.ok(posicaoNaCena > 0, 'o animal esta dentro da tela');

// Cada animal tem a sua cena: espera passar pelos quatro (ordem D, I, S, C)
const vistos = new Set(['tubarao']);
const limite = Date.now() + 70000;

while (vistos.size < 4 && Date.now() < limite) {
    const classe = await telao.locator('.telao-destaque').first().getAttribute('class').catch(() => null);
    const achou = classe?.match(/telao-destaque--(\w+)/)?.[1];

    if (achou && !vistos.has(achou)) {
        vistos.add(achou);
        await telao.waitForTimeout(3200);
        await telao.screenshot({ path: join(pasta, `eventos-5-telao-${achou}.png`) });
    }

    await telao.waitForTimeout(400);
}

assert.deepEqual([...vistos].sort(), ['aguia', 'gato', 'lobo', 'tubarao'], 'os quatro animais passam pela tela');

// Resultado novo: o animal dele ganha a tela na hora (depois do destaque que estiver no ar)
const novo = await jogarPelaApi({ anonimo: true, evento: slug });
const animalNovo = novo.corpo.natural && novo.corpo.natural.percentual;
assert.ok(animalNovo, 'partida nova concluida');
await telao.waitForFunction(() => /Resultado novo!/.test(document.querySelector('.telao-destaque')?.textContent ?? ''), null, { timeout: 40000 });
assert.match(await telao.textContent('.telao-destaque h2'), /^Mais (um|uma) /);
await telao.waitForTimeout(2500);
await telao.screenshot({ path: join(pasta, 'eventos-6-telao-resultado-novo.png') });
assert.match(await telao.textContent('.telao-geral'), /Total geral\s*2/, 'o total do telao sobe sozinho');

// ?intervalo fora dos limites volta a valores aceitaveis e movimento reduzido nao quebra
const calmo = await (await navegador.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' })).newPage();
await calmo.goto(`${base}/e/${slug}/telao?intervalo=1`); // minimo: 5 s
await calmo.locator('.telao-destaque').waitFor({ timeout: 15000 });
assert.equal(await calmo.locator('.telao-animal').evaluate((el) => getComputedStyle(el).animationName), 'none', 'movimento reduzido: sem animacao');

// Evento desligado: o telao continua mostrando o ranking, sem o QR code
await cartao.getByRole('button', { name: 'Desligar evento' }).click().catch(() => undefined);
await pagina.locator('.evento', { hasText: `${nomeEvento} (renomeado)` }).getByText('Desligado', { exact: true }).waitFor({ timeout: 15000 });
const desligado = await contexto.newPage();
await desligado.goto(`${base}/e/${slug}/telao`);
await desligado.locator('.telao-ranking li').first().waitFor();
assert.match(await desligado.textContent('.telao-sub'), /evento desligado/);
assert.equal(await desligado.locator('.telao-lateral').count(), 0, 'evento desligado nao oferece QR code');

// Sair
await pagina.getByRole('button', { name: 'Sair' }).click();
await pagina.locator('#senha-admin').waitFor({ timeout: 15000 });

assert.deepEqual(erros, [], `erros no navegador: ${erros.join(' | ')}`);
await navegador.close();
console.log('OK: eventos (criar, ligar/desligar, renomear), ranking proprio de cada evento, pagina do jogo do evento e telao com as animacoes.');
