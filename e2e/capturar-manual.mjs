/**
 * Joga uma partida completa e salva os prints usados no manual (public/manual). Rode de novo sempre que
 * uma tela mudar, para o manual nao ficar desatualizado. Cria um evento de teste (com USER_AREA_ADM e
 * PASS_AREA_ADM do .env) e joga algumas partidas pela API antes, para o ranking da abertura aparecer com numeros.
 * Requer o servidor em RUA_URL (padrao http://127.0.0.1:3100), de preferencia com RUA_DADOS apontando para uma
 * pasta temporaria e RUA_BANCO_LOCAL=1: a captura cria cadastros e partidas de teste.
 *
 * Uso: node e2e/capturar-manual.mjs [pasta_de_saida]
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { eventoDeTeste, jogarPelaApi } from './comum.mjs';

const base = process.env.RUA_URL ?? 'http://127.0.0.1:3100';
const pasta = process.argv[2] ?? 'public/manual';
mkdirSync(pasta, { recursive: true });

const navegador = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const pagina = await (await navegador.newContext({ viewport: { width: 1180, height: 860 } })).newPage();

// Nao abre o WhatsApp de verdade durante a captura.
await pagina.addInitScript(() => { window.open = () => ({}); });

const foto = (nome, tipo = 'jpeg') => async (alvo) => {
    await pagina.waitForTimeout(700);
    await alvo.screenshot({ path: join(pasta, `${nome}.${tipo === 'jpeg' ? 'jpg' : 'png'}`), type: tipo, ...(tipo === 'jpeg' ? { quality: 82 } : {}) });
    console.log('salvo', nome);
};

const PASSAR = 'Deixar passar';
const painel = pagina.locator('.painel');
const jogo = pagina.locator('.rua-app');
const cartao = pagina.locator('#cartao.aberto');

// 1. Abertura (com o QR code), cadastro e erro de numero
const evento = await eventoDeTeste(base, 'Feira de Tecnologia', { exato: true });
const urlEvento = `${base}/e/${evento.slug}`;

// Algumas partidas antes, para o ranking da abertura aparecer com numeros (sem cadastro: nada pessoal).
for (let i = 0; i < 9; i++) {
    await jogarPelaApi(base, { anonimo: true, evento: evento.slug }, i % 3);
}

await pagina.goto(urlEvento);
await painel.waitFor();
await pagina.locator('.qr-abertura').waitFor();
await foto('00-abertura')(pagina.locator('.abertura'));
await pagina.check('#receber-sim');
await foto('01-cadastro', 'png')(painel); // com "Sim": aparecem nome e WhatsApp
await pagina.fill('#nome', 'Maria da Silva');
await pagina.fill('#whatsapp', '6599991234');
await pagina.getByRole('button', { name: 'Continuar' }).click();
await pagina.getByText(/Faltou o 9/).waitFor();
await foto('02-numero-incompleto', 'png')(painel);

await pagina.fill('#whatsapp', '65999990000');
await pagina.getByRole('button', { name: 'Continuar' }).click();

// 2. Apresentacao, avatar e etapas
await cartao.waitFor({ timeout: 30000 });
await foto('03-apresentacao')(jogo);
await pagina.click('#cartao-botao');

await cartao.waitFor();
// O cartao do avatar com o Rio marcado mostra tambem "Como voce quer ir?"; depois volta para a Rua.
await pagina.check('input[name="cenario"][value="rio"]');

// A area do jogo tem altura fixa e o cartao rola dentro dela: para o print mostrar o cartao inteiro (avatares,
// cenarios, "Como voce quer ir?" e a vista), a altura e liberada so durante a captura.
const alturaDoCartao = await pagina.locator('.cartao-conteudo').evaluate((el) => el.scrollHeight);
await pagina.evaluate((altura) => {
    for (const seletor of ['.rua-app', '#palco']) {
        const el = document.querySelector(seletor);
        el.style.height = `${altura}px`;
        el.style.maxHeight = 'none';
    }
}, alturaDoCartao + 60);
await foto('04-avatar')(jogo);
await pagina.evaluate(() => {
    for (const seletor of ['.rua-app', '#palco']) {
        const el = document.querySelector(seletor);
        el.style.height = '';
        el.style.maxHeight = '';
    }
});
await pagina.check('input[name="cenario"][value="rua"]');
await pagina.click('#cartao-botao');

// Duas etapas: pega uma palavra a cada tres e deixa passar as outras, ate a etapa fechar.
for (let etapa = 0; etapa < 2; etapa++) {
    await cartao.waitFor({ timeout: 30000 });

    if (etapa === 0) {
        await foto('05-etapa')(jogo);
    }

    await pagina.click('#cartao-botao'); // Comecar a correr

    let apresentadas = 0;

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
        const botaoDaPalavra = cima === PASSAR ? '#botao-baixo' : '#botao-cima';
        const botaoDeixar = cima === PASSAR ? '#botao-cima' : '#botao-baixo';

        if (etapa === 0 && apresentadas === 1) {
            await foto('06-portao')(jogo);
        }

        await pagina.click(apresentadas % 3 === 0 ? botaoDaPalavra : botaoDeixar);
        await pagina.waitForFunction(() => document.querySelector('#botao-cima').disabled, null, { timeout: 10000 });
        apresentadas++;
    }

    await cartao.waitFor({ timeout: 40000 });

    if (etapa === 0) {
        await foto('07-etapa-concluida')(jogo);
        await pagina.click('#cartao-botao'); // Continuar para a etapa 2
    }
}

// 3. Resultado e envio
await pagina.click('#cartao-botao'); // Descobrir meu animal
await pagina.locator('.rel').waitFor({ timeout: 45000 });
await pagina.waitForTimeout(9000);
await foto('08-resultado')(jogo);

await pagina.locator('[data-acao="rejogar"]').click();
await pagina.getByRole('heading', { name: 'Resultado pronto' }).waitFor();
await foto('09-enviar', 'png')(painel);

// 4. No celular (emulado): tela do jogo em pe, com os botoes de lado e o de acelerar
const celular = await (await navegador.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1.5,
    isMobile: true,
    hasTouch: true,
})).newPage();
await celular.addInitScript(() => { window.open = () => ({}); });
await celular.goto(urlEvento);
await celular.check('#receber-sim');
await celular.fill('#nome', 'Maria da Silva');
await celular.fill('#whatsapp', '65999990000');
await celular.getByRole('button', { name: 'Continuar' }).tap();

const cartaoCelular = celular.locator('#cartao.aberto');
await cartaoCelular.waitFor({ timeout: 30000 });
await celular.tap('#cartao-botao'); // Vamos la
await cartaoCelular.waitFor();
await celular.tap('#cartao-botao'); // Comecar (avatar)
await cartaoCelular.waitFor({ timeout: 30000 });
await celular.tap('#cartao-botao'); // Comecar a correr
await celular.waitForFunction(() => !document.querySelector('#botao-cima').disabled, null, { timeout: 60000 });
await celular.waitForTimeout(700);
await celular.screenshot({ path: join(pasta, '11-celular-portao.jpg'), type: 'jpeg', quality: 80 });
console.log('salvo 11-celular-portao');

await navegador.close();
console.log('Prints do manual salvos em', pasta);
