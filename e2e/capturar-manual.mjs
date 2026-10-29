/**
 * Joga uma partida completa e salva os prints usados no manual (public/manual). Rode de novo sempre que
 * uma tela mudar, para o manual nao ficar desatualizado. Requer o servidor em RUA_URL
 * (padrao http://127.0.0.1:3100), de preferencia com RUA_DADOS apontando para uma pasta temporaria:
 * a partida cria um cadastro de teste.
 *
 * Uso: node e2e/capturar-manual.mjs [pasta_de_saida]
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

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

const painel = pagina.locator('.painel');
const jogo = pagina.locator('.rua-app');
const cartao = pagina.locator('#cartao.aberto');

// 1. Cadastro e erro de numero
await pagina.goto(base);
await painel.waitFor();
await foto('01-cadastro', 'png')(painel);

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
await foto('04-avatar')(jogo);
await pagina.click('#cartao-botao');

await cartao.waitFor({ timeout: 30000 });
await foto('05-etapa')(jogo);
await pagina.click('#cartao-botao');

for (let etapa = 0; etapa < 2; etapa++) {
    for (let i = 0; i < 12; i++) {
        await pagina.waitForFunction(() => !document.querySelector('#botao-cima').disabled, null, { timeout: 60000 });

        if (etapa === 0 && i === 1) {
            await foto('06-portao')(jogo);
        }

        await pagina.click(i % 2 === 0 ? '#botao-cima' : '#botao-baixo');
        await pagina.waitForFunction(() => document.querySelector('#botao-cima').disabled, null, { timeout: 10000 });
    }

    await cartao.waitFor({ timeout: 40000 });

    if (etapa === 0) {
        await foto('07-etapa-concluida')(jogo);
        await pagina.click('#cartao-botao');
        await cartao.waitFor({ timeout: 30000 });
        await pagina.click('#cartao-botao');
    }
}

// 3. Resultado e envio
await pagina.click('#cartao-botao'); // Descobrir meu animal
await pagina.locator('.rel').waitFor({ timeout: 45000 });
await pagina.waitForTimeout(9000);
await foto('08-resultado')(jogo);

await pagina.locator('[data-acao="rejogar"]').click();
await pagina.getByRole('heading', { name: 'Enviar o resultado' }).waitFor();
await foto('09-enviar', 'png')(painel);

await pagina.fill('#whatsapp-final', '65988887777');
await pagina.getByRole('button', { name: 'Enviar pelo WhatsApp' }).click();
await pagina.getByText('Número atualizado.').waitFor();
await foto('10-numero-corrigido', 'png')(painel);

await navegador.close();
console.log('Prints do manual salvos em', pasta);
