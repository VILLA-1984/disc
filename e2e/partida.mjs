/**
 * Teste de ponta a ponta: cadastro (com numero errado), partida completa, relatorio do animal, correcao
 * do WhatsApp no fim e link do wa.me. Requer o servidor em RUA_URL (padrao http://127.0.0.1:3100).
 * Uso: node e2e/partida.mjs [pasta_das_capturas] [3d|lateral]
 */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.RUA_URL ?? 'http://127.0.0.1:3100';
const pasta = process.argv[2] ?? 'e2e/capturas';
const modo = process.argv[3] === 'lateral' ? 'lateral' : '3d';
mkdirSync(pasta, { recursive: true });

const navegador = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
const pagina = await contexto.newPage();
const erros = [];
pagina.on('pageerror', (e) => erros.push(e.message));
pagina.on('console', (m) => m.type() === 'error' && erros.push(`${m.text()} ${m.location().url ?? ''}`));

// Registra as chamadas a window.open (o wa.me abriria outra aba).
await pagina.addInitScript(() => {
    window.__abertos = [];
    window.open = (url) => { window.__abertos.push(url); return {}; };
});

// Totais do painel antes da partida (para conferir, no fim, que esta partida foi contada uma vez).
const totais0 = await (await fetch(`${base}/api/totais`)).json();

// ------------------------------------------------------------------ cadastro
await pagina.goto(base);
await pagina.getByRole('heading', { name: 'Teste de Perfil DISC' }).waitFor();
await pagina.screenshot({ path: join(pasta, 'e2e-0-cadastro.png') });

// Receber o resultado e opcional: o botao so libera depois de escolher, e os campos so aparecem com o "Sim".
assert.ok(await pagina.getByRole('button', { name: 'Continuar' }).isDisabled(), 'devia exigir a escolha antes de continuar');
assert.equal(await pagina.locator('#nome').count(), 0, 'os campos so aparecem depois de escolher "Sim"');
await pagina.check('#receber-sim');
await pagina.getByRole('button', { name: 'Continuar' }).click();
assert.ok(await pagina.getByText('Informe o seu nome.').isVisible(), 'devia exigir o nome');
assert.ok(await pagina.getByText('Informe o número do WhatsApp.').isVisible(), 'devia exigir o WhatsApp');

await pagina.fill('#nome', 'Maria da Silva');
await pagina.fill('#whatsapp', '6599991234'); // falta um digito
assert.equal(await pagina.inputValue('#whatsapp'), '(65) 99991-234', 'mascara');
await pagina.getByRole('button', { name: 'Continuar' }).click();
assert.ok(await pagina.getByText(/Faltou o 9/).isVisible(), 'devia explicar o digito faltando');

// Numero ERRADO mas valido (sera corrigido no final).
await pagina.fill('#whatsapp', '65999990000');
assert.equal(await pagina.inputValue('#whatsapp'), '(65) 99999-0000');
await pagina.getByRole('button', { name: 'Continuar' }).click();

// ---------------------------------------------------------------------- jogo
const cartao = pagina.locator('#cartao.aberto');
await cartao.waitFor({ timeout: 30000 });
assert.match(await pagina.textContent('#cartao-titulo'), /Teste de Perfil DISC/);

// Painel de totais no canto do jogo: o total e uma linha por animal.
await pagina.locator('.rua-totais').waitFor({ timeout: 15000 });
assert.match(await pagina.textContent('.rua-totais'), /Já jogaram/);
assert.equal(await pagina.locator('.rua-totais li').count(), 5, 'quatro animais e o equilibrado');
await pagina.screenshot({ path: join(pasta, `e2e-painel-totais-${modo}.png`) });

await pagina.click('#cartao-botao'); // Vamos la
await cartao.waitFor();
await pagina.check(`input[name="vista"][value="${modo}"]`);
await pagina.click('#cartao-botao'); // Comecar (avatar)

const PASSAR = 'Deixar passar';
let emCiclo = false;

for (let etapa = 0; etapa < 2; etapa++) {
    await cartao.waitFor({ timeout: 30000 });
    await pagina.click('#cartao-botao'); // Comecar a correr

    // Joga ate o cartao de fim de etapa abrir. Modo ciclo: pega 1 de cada 3 palavras (obriga a dar voltas);
    // modo pares: alterna cima e baixo.
    let apresentadas = 0;
    let pegas = 0;

    for (;;) {
        await pagina.waitForFunction(
            () => !document.querySelector('#botao-cima').disabled || document.querySelector('#cartao.aberto'),
            null,
            { timeout: 60000 },
        );

        if (await pagina.locator('#cartao.aberto').count()) {
            break;
        }

        const [cima, baixo] = await pagina.evaluate(() => [
            document.querySelector('#botao-cima strong').textContent.trim(),
            document.querySelector('#botao-baixo strong').textContent.trim(),
        ]);
        let alvo;

        if (cima === PASSAR || baixo === PASSAR) {
            emCiclo = true;
            const pegar = apresentadas % 3 === 0;
            const botaoDaPalavra = cima === PASSAR ? '#botao-baixo' : '#botao-cima';
            const botaoDeixar = cima === PASSAR ? '#botao-cima' : '#botao-baixo';
            alvo = pegar ? botaoDaPalavra : botaoDeixar;
            pegas += pegar ? 1 : 0;

            if (apresentadas === 0 && etapa === 0) {
                assert.ok(await pagina.locator('.rua-mapa.visivel').isVisible(), 'o minimapa devia aparecer');
                await pagina.screenshot({ path: join(pasta, `e2e-minimapa-${modo}.png`) });
            }
        } else {
            alvo = apresentadas % 2 === 0 ? '#botao-cima' : '#botao-baixo';
        }

        await pagina.click(alvo);
        await pagina.waitForFunction(() => document.querySelector('#botao-cima').disabled, null, { timeout: 10000 });
        apresentadas++;
    }

    if (emCiclo) {
        const escolher = Number(process.env.RUA_ESCOLHER) || 14;
        assert.equal(pegas, escolher, `devia pegar ${escolher} palavras por etapa (pegou ${pegas})`);
        // Pegando 1 de cada 3, as 14 saem antes de a primeira volta de 48 terminar: a etapa fica bem mais curta que antes.
        assert.ok(apresentadas < 48, `devia terminar antes de passar as 48 palavras (apresentadas: ${apresentadas})`);
    } else {
        assert.equal(apresentadas, 12);
    }

    await cartao.waitFor({ timeout: 40000 });

    if (etapa === 0) {
        await pagina.click('#cartao-botao'); // Continuar para a etapa 2
    }
}

assert.match(await pagina.textContent('#cartao-sobretitulo'), /Fim da jornada/);
await pagina.click('#cartao-botao'); // Descobrir meu animal
await pagina.locator('.rel').waitFor({ timeout: 45000 });
await pagina.waitForTimeout(9000);
await pagina.screenshot({ path: join(pasta, `e2e-1-relatorio-${modo}.png`) });

const titulo = (await pagina.textContent('#rel-titulo')).trim();
assert.match(titulo, /^(Você é (um|uma) (Tubarão|Águia|Gato|Lobo)|Os quatro animais vivem em você)$/);

const botaoFinal = pagina.locator('[data-acao="rejogar"]');
assert.match(await botaoFinal.textContent(), /WhatsApp/);
await botaoFinal.click();

// ------------------------------------------------------------------ WhatsApp
await pagina.getByRole('heading', { name: 'Enviar o resultado' }).waitFor();
assert.equal(await pagina.inputValue('#whatsapp-final'), '(65) 99999-0000', 'devia trazer o numero digitado no inicio');

// Corrige o numero errado e envia.
await pagina.fill('#whatsapp-final', '65988887777');
await pagina.getByRole('button', { name: 'Enviar pelo WhatsApp' }).click();
try {
    await pagina.getByText('Número atualizado.').waitFor({ timeout: 15000 });
} catch (erroEspera) {
    // Diagnostico: mostra o que a tela exibia em vez do aviso (mensagem de erro, botao ocupado, etc.).
    await pagina.screenshot({ path: join(pasta, 'e2e-falha-envio.png') });
    console.log('TELA NO MOMENTO DA FALHA:', JSON.stringify({
        erro: await pagina.locator('.erro-geral').allTextContents(),
        aviso: await pagina.locator('.ok-geral').allTextContents(),
        botao: await pagina.getByRole('button', { name: /WhatsApp|Abrindo/ }).first().textContent(),
        erros,
    }));
    throw erroEspera;
}
await pagina.screenshot({ path: join(pasta, 'e2e-2-envio.png') });

const abertos = await pagina.evaluate(() => window.__abertos);
assert.equal(abertos.length, 1, 'devia abrir o WhatsApp uma vez');
assert.match(abertos[0], /^https:\/\/wa\.me\/5565988887777\?text=/, 'o link devia usar o numero corrigido');
const texto = decodeURIComponent(abertos[0].split('?text=')[1]);
assert.match(texto, /^Olá, Maria!/);
assert.match(texto, /Como você é: D \d+% · I \d+% · S \d+% · C \d+%/);

// Numero invalido no fim: nao envia.
await pagina.fill('#whatsapp-final', '659');
await pagina.getByRole('button', { name: 'Enviar pelo WhatsApp' }).click();
assert.ok(await pagina.getByText(/incompleto/).isVisible());
assert.equal((await pagina.evaluate(() => window.__abertos)).length, 1, 'numero invalido nao pode abrir o WhatsApp');

// A partida concluida foi contada uma unica vez: +1 no total e +1 em exatamente um animal.
const totais1 = await (await fetch(`${base}/api/totais`)).json();
assert.equal(totais1.total, totais0.total + 1, 'o total devia subir 1');
const mudaram = totais1.animais.filter((a, i) => a.total !== totais0.animais[i].total);
assert.equal(mudaram.length, 1, 'so um animal devia mudar');
assert.equal(mudaram[0].total, totais0.animais.find((a) => a.chave === mudaram[0].chave).total + 1);

assert.deepEqual(erros, [], `erros no navegador: ${erros.join(' | ')}`);
await navegador.close();
console.log(`OK (${modo}): cadastro validado, partida completa, "${titulo}", numero corrigido e wa.me gerado.`);
