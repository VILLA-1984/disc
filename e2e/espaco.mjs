/**
 * Teste de ponta a ponta do cenario do espaco: para cada meio (nave, foguete, disco voador e astronauta) abre o jogo
 * dentro de um evento, escolhe o espaco e o meio, comeca a etapa e confere o primeiro portao (clima "Espaco", sem erros
 * no navegador), salvando uma captura de cada. Tambem confere a vista lateral e o "reduzir movimento". Requer o servidor
 * em RUA_URL (padrao http://127.0.0.1:3100) com USER_AREA_ADM e PASS_AREA_ADM no .env.
 *
 * Uso: node e2e/espaco.mjs [pasta_das_capturas] [avatar]
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

const evento = await eventoDeTeste(base, 'Espaco E2E');
const url = `${base}/e/${evento.slug}`;
const navegador = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const erros = [];

/** Abre uma partida no espaco com o meio pedido e devolve a pagina parada no primeiro portao. */
async function noEspaco(meio, { vista = '3d', reduzir = false, avatar = avatarPedido } = {}) {
    const contexto = await navegador.newContext({ viewport: { width: 1180, height: 860 }, reducedMotion: reduzir ? 'reduce' : 'no-preference' });
    const pagina = await contexto.newPage();
    pagina.on('pageerror', (e) => erros.push(`${meio}: ${e.message}`));
    pagina.on('console', (m) => m.type() === 'error' && erros.push(`${meio}: ${m.text()}`));

    await pagina.goto(url);
    await pagina.check('#receber-nao');
    await pagina.getByRole('button', { name: 'Começar a jogar' }).click();
    const cartao = pagina.locator('#cartao.aberto');
    await cartao.waitFor({ timeout: 30000 });
    await pagina.click('#cartao-botao'); // Vamos la
    await cartao.waitFor();

    await pagina.click(`.avatar-op[data-id="${avatar}"]`);
    await pagina.check('input[name="cenario"][value="espaco"]');
    await pagina.check(`input[name="meio"][value="${meio}"]`);
    await pagina.check(`input[name="vista"][value="${vista}"]`);
    await pagina.click('#cartao-botao'); // Comecar (avatar)
    await cartao.waitFor({ timeout: 30000 });

    assert.match(await pagina.textContent('#cartao-corpo'), /palavras|portões|Deixar passar/, 'cartao da etapa 1');
    await pagina.click('#cartao-botao'); // Comecar a decolar
    await pagina.waitForFunction(() => !document.querySelector('#botao-cima').disabled, null, { timeout: 90000 });
    await pagina.waitForTimeout(1200);

    return pagina;
}

const meios = ['nave', 'foguete', 'disco-voador', 'astronauta'];

for (const meio of meios) {
    const pagina = await noEspaco(meio);

    // clima fixo do espaco no HUD e nenhuma chuva/vento
    const clima = await pagina.textContent('.rua-hud-clima');
    assert.match(clima, /Espaço/, `${meio}: o clima do HUD e "Espaço"`);

    // o botao de comecar usa o texto do meio
    await pagina.screenshot({ path: join(pasta, `espaco-${meio}.png`) });

    // dois portoes depois o clima segue o mesmo (nao muda a cada 4 portoes como na rua)
    for (let i = 0; i < 5; i++) {
        const [cima, baixo] = await pagina.evaluate(() => [document.querySelector('#botao-cima strong').textContent.trim(), document.querySelector('#botao-baixo strong').textContent.trim()]);
        await pagina.click(cima === 'Deixar passar' ? '#botao-baixo' : '#botao-cima');
        await pagina.waitForFunction(() => document.querySelector('#botao-cima').disabled, null, { timeout: 10000 });
        await pagina.waitForFunction(() => !document.querySelector('#botao-cima').disabled || document.querySelector('#cartao.aberto'), null, { timeout: 60000 });
    }

    assert.match(await pagina.textContent('.rua-hud-clima'), /Espaço/, `${meio}: o clima nao muda no espaco`);
    await pagina.context().close();
    console.log(`espaco / ${meio}: primeiro portao, clima fixo e 5 escolhas OK.`);
}

// Vista lateral e "reduzir movimento" (sem riscos de estrelas, rochas e cometas) tambem abrem
const lateral = await noEspaco('nave', { vista: 'lateral' });
await lateral.screenshot({ path: join(pasta, 'espaco-nave-lateral.png') });
await lateral.context().close();

// Quem usa cadeira de rodas vai ao espaco, sem os apoios (a cadeira fica na base): na nave e como astronauta
for (const meio of ['nave', 'astronauta']) {
    const cadeirante = await noEspaco(meio, { avatar: 'gabriel' });
    await cadeirante.screenshot({ path: join(pasta, `espaco-${meio}-cadeira.png`) });
    await cadeirante.context().close();
}

const calmo = await noEspaco('foguete', { reduzir: true });
await calmo.screenshot({ path: join(pasta, 'espaco-foguete-reduzido.png') });
await calmo.context().close();

// Quem usa cadeira vai ao espaco (sem os apoios); moto e taxi nao aparecem como opcao no espaco
const escolha = await (await navegador.newContext({ viewport: { width: 1180, height: 860 } })).newPage();
await escolha.goto(url);
await escolha.check('#receber-nao');
await escolha.getByRole('button', { name: 'Começar a jogar' }).click();
await escolha.locator('#cartao.aberto').waitFor({ timeout: 30000 });
await escolha.click('#cartao-botao');
await escolha.locator('#cartao.aberto').waitFor();
await escolha.check('input[name="cenario"][value="espaco"]');
await escolha.waitForTimeout(500);
const bloqueados = await escolha.locator('.avatar-op:disabled').count();
assert.ok(bloqueados >= 3, `moto (2) e taxi (1) ficam apagados no espaco (${bloqueados} apagados)`);
assert.ok(await escolha.locator('.avatar-op[data-id="gabriel"]').isEnabled(), 'quem usa cadeira de rodas pode ir ao espaco');
assert.equal(await escolha.locator('input[name="meio"]').count(), 4, 'quatro meios no espaco');
await escolha.screenshot({ path: join(pasta, 'espaco-escolha.png') });

assert.deepEqual(erros, [], `erros no navegador: ${erros.join(' | ')}`);
await navegador.close();
console.log('OK: o espaco abre com os quatro meios, na vista 3D, lateral e com movimento reduzido, sem erros.');
