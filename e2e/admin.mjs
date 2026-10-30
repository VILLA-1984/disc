/**
 * Teste de ponta a ponta das configuracoes do jogo (/admin/jogo): acesso por senha, salvar a configuracao, e conferir
 * no jogo que ela vale (cenarios e avatares liberados, minimapa, barra de progresso, ranking, palavras por etapa e
 * textos). Requer o servidor em RUA_URL (padrao http://127.0.0.1:3100) com USER_AREA_ADM e PASS_AREA_ADM no .env e, de
 * preferencia, RUA_DADOS apontando para uma pasta temporaria e RUA_BANCO_LOCAL=1 (nao grava no Turso).
 *
 * Uso: node e2e/admin.mjs [pasta_das_capturas]
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import zlib from 'node:zlib';
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

const usuario = env.USER_AREA_ADM;
const senha = env.PASS_AREA_ADM;
assert.ok(usuario && senha, 'defina USER_AREA_ADM e PASS_AREA_ADM no .env');

const chamar = (rota, corpo, cookie) => fetch(base + rota, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(corpo),
});

// ------------------------------------------------------------------ acesso (sem navegador)
assert.equal((await chamar('/api/admin/config', { restaurar: true })).status, 401, 'sem sessao nao grava');
assert.equal((await chamar('/api/admin/config', { restaurar: true }, 'rua_admin=9999999999999.falsa')).status, 401, 'cookie falso nao vale');
assert.equal((await chamar('/api/admin/login', { usuario, senha: 'senha errada' })).status, 401, 'senha errada');
assert.equal((await chamar('/api/admin/login', { usuario: 'outro', senha })).status, 401, 'usuario errado com a senha certa');
const entrou = await chamar('/api/admin/login', { usuario, senha });
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

// O jogo so abre dentro de um evento: este teste cria o seu e joga nele.
const criadoEvento = await fetch(`${base}/api/admin/eventos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie.split(';')[0] },
    body: JSON.stringify({ nome: `Admin E2E ${Date.now().toString(36)}` }),
});
assert.equal(criadoEvento.status, 201, 'criar o evento de teste');
const slugEvento = (await criadoEvento.json()).evento.slug;
const urlEvento = `${base}/e/${slugEvento}`;

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
await admin.goto(`${base}/admin/jogo`);
await admin.locator('#senha-admin').waitFor();
await admin.fill('#usuario-admin', usuario);
await admin.fill('#senha-admin', 'errada');
await admin.getByRole('button', { name: 'Entrar' }).click();
await admin.getByText('Usuário ou senha incorretos.').waitFor({ timeout: 10000 });
await admin.fill('#senha-admin', senha);
await admin.getByRole('button', { name: 'Entrar' }).click();
await admin.getByRole('heading', { name: 'Configurações do jogo' }).waitFor({ timeout: 15000 });
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

for (const nome of [/^Céu/, /^Neve/, /^Trilhos/, /^Espaço/]) {
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
await admin.getByRole('heading', { name: 'Configurações do jogo' }).waitFor();
assert.equal(await admin.locator('#palavras-por-etapa').inputValue(), '8');
assert.equal(await admin.getByRole('checkbox', { name: /^Minimapa/ }).isChecked(), false);
assert.equal(await admin.getByRole('checkbox', { name: /^Neve/ }).isChecked(), false);
assert.equal(await admin.getByRole('textbox', { name: 'Título do teste', exact: true }).inputValue(), 'Teste de Perfil Comportamental');
console.log('gerenciamento: avisos de combinacao impossivel, salvar e recarregar OK.');

// ------------------------------------------------------------------ o jogo obedece
const jogador = await novaPagina({ width: 1180, height: 900 });
await jogador.goto(urlEvento);
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

const partida = await (await chamar('/api/iniciar', { anonimo: true, evento: slugEvento })).json();
assert.equal(partida.ciclo.escolher, 8, 'o servidor sorteia a partida com 8 palavras por etapa');
console.log('jogo: titulo, avatares, cenarios, minimapa, barra, ranking e 8 palavras por etapa obedecem a configuracao.');

// ------------------------------------------------------------------ modo das placas (duas palavras por portao)
const sessao = cookie.split(';')[0];
const atual = await (await fetch(`${base}/api/admin/config`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: sessao }, body: JSON.stringify({ restaurar: true }) })).json();
const emPares = await chamar('/api/admin/config', { config: { ...atual.config, modoPlacas: 'pares', palavrasPorEtapa: 9 } }, sessao);
assert.equal(emPares.status, 200, 'salva o modo de duas palavras');
const rodada = await (await chamar('/api/iniciar', { anonimo: true, evento: slugEvento })).json();
assert.equal(rodada.ciclo, undefined, 'no modo de duas palavras nao ha ciclo');
assert.equal(rodada.etapas.length, 2);
assert.equal(rodada.etapas[0].length, 9, '9 portoes por etapa');
assert.notEqual(rodada.etapas[0][0].cima.id, rodada.etapas[0][0].baixo.id, 'cada placa traz uma palavra diferente');
assert.equal((await chamar('/api/admin/config', { config: { ...atual.config, modoPlacas: 'pares', palavrasPorEtapa: 30 } }, sessao)).status, 422, 'portoes acima do maximo sao recusados');
console.log('modo das placas: duas palavras por portao (9 portoes) e limite maximo OK.');

// A tela de gerenciamento mostra o modo salvo, com os textos e o limite do modo.
await admin.reload();
await admin.getByRole('heading', { name: 'Configurações do jogo' }).waitFor();
assert.ok(await admin.getByRole('radio', { name: /Duas palavras, uma em cada placa/ }).isChecked(), 'o modo salvo aparece marcado');
assert.equal(await admin.locator('#palavras-por-etapa').getAttribute('max'), '24', 'duas palavras por portao: maximo 24');
assert.equal(await admin.getByText('Explicação do jogo (duas palavras por portão)').count(), 1, 'so os textos do modo de duas palavras');
assert.equal(await admin.getByText('Regra de quantas palavras pegar').count(), 0);
await admin.getByRole('radio', { name: /Uma palavra e “Deixar passar”/ }).check();
assert.equal(await admin.locator('#palavras-por-etapa').getAttribute('max'), '36');
assert.equal(await admin.getByText('Regra de quantas palavras pegar').count(), 1, 'os textos do ciclo voltam');

// No jogo, o cartao de abertura usa o texto do modo de duas palavras.
const placas = await novaPagina();
await placas.goto(urlEvento);
await placas.check('#receber-nao');
await placas.click('button[type=submit]');
await placas.locator('#cartao.aberto').waitFor({ timeout: 30000 });
assert.match(await placas.textContent('#cartao-corpo'), /aparecem duas palavras/, 'abertura do modo de duas palavras');
assert.match(await placas.textContent('#cartao-corpo'), /passar pelos portões desta etapa|completar todos os portões/);

// ------------------------------------------------------------------ logo
// PNG de teste (faixa azul 240x72) montado na hora, sem depender de arquivo no disco.
function pngFaixa(largura, altura, [r, g, b]) {
    const linhas = Buffer.alloc((largura * 3 + 1) * altura);

    for (let y = 0; y < altura; y++) {
        const inicio = y * (largura * 3 + 1);

        for (let x = 0; x < largura; x++) {
            linhas.set([r, g, b], inicio + 1 + x * 3);
        }
    }

    const bloco = (tipo, dados) => {
        const cabeca = Buffer.alloc(4);
        cabeca.writeUInt32BE(dados.length);
        const corpo = Buffer.concat([Buffer.from(tipo), dados]);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(zlib.crc32(corpo));

        return Buffer.concat([cabeca, corpo, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(largura, 0);
    ihdr.writeUInt32BE(altura, 4);
    ihdr.set([8, 2, 0, 0, 0], 8);

    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), bloco('IHDR', ihdr), bloco('IDAT', zlib.deflateSync(linhas)), bloco('IEND', Buffer.alloc(0))]);
}

const enviarLogo = (conteudo, nome, cookieSessao) => {
    const form = new FormData();
    form.append('arquivo', new Blob([conteudo]), nome);

    return fetch(`${base}/api/admin/logo`, { method: 'POST', headers: cookieSessao ? { Cookie: cookieSessao } : {}, body: form });
};

assert.equal((await fetch(`${base}/api/logo`)).status, 404, 'sem logo enviada, a imagem nao existe');
assert.equal((await enviarLogo(pngFaixa(8, 8, [0, 0, 0]), 'logo.png')).status, 401, 'sem sessao nao envia logo');
assert.equal((await fetch(`${base}/api/admin/logo`, { method: 'DELETE' })).status, 401, 'sem sessao nao remove logo');
const escolherLogo = (escolha, cookieSessao) => fetch(`${base}/api/admin/logo`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(cookieSessao ? { Cookie: cookieSessao } : {}) }, body: JSON.stringify({ escolha }) });
assert.equal((await escolherLogo('senac')).status, 401, 'sem sessao nao escolhe logo');
assert.equal((await escolherLogo('inventada', sessao)).status, 422, 'logo desconhecida e recusada');
assert.equal((await escolherLogo('enviada', sessao)).status, 422, 'escolher a enviada sem ter enviado nenhuma e recusado');
const svg = await enviarLogo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'logo.png', sessao);
assert.equal(svg.status, 422, 'SVG e recusado, mesmo com nome de PNG');
assert.equal((await enviarLogo(Buffer.alloc(1024 * 1024 + 1, 1), 'grande.png', sessao)).status, 422, 'arquivo grande demais e recusado');

// Pela tela: enviar, ver a previa e a tela inicial, trocar e remover.
await admin.reload();
await admin.getByRole('heading', { name: 'Configurações do jogo' }).waitFor();
assert.ok(await admin.getByRole('radio', { name: /^Genérica/ }).isChecked(), 'comeca na logo generica');
assert.equal(await admin.getByRole('radio', { name: /^Enviada por você/ }).count(), 0, 'sem imagem enviada, nao ha a opcao enviada');

for (const nome of [/^Quatro animais/, /^Senac e Fecomércio Sesc Horizontal/, /^Senac Só a marca/, /^Senac e Fecomércio Sesc \(vertical\)/, /^Senac \(branca\)/, /^Sem logo/]) {
    assert.equal(await admin.getByRole('radio', { name: nome }).count(), 1, `opcao ${nome}`);
}

// As logos fixas carregam de verdade (arquivos em public/logo).
for (const arquivo of ['logo-generica.png', 'logo-quatro-animais.png', 'senac100-colorido.png', 'senac-01.png', 'image.png', 'LOGO-SENAC_BRANCO.png']) {
    assert.equal((await fetch(`${base}/logo/${arquivo}`)).status, 200, `logo fixa ${arquivo}`);
}

const padrao = await novaPagina({ width: 1180, height: 900 });
await padrao.goto(base);
await padrao.locator('img.logo-abertura').waitFor();
assert.match(await padrao.getAttribute('img.logo-abertura', 'src'), /\/logo\/logo-generica\.png$/, 'a tela inicial comeca com a logo generica');

await admin.setInputFiles('#arquivo-logo', { name: 'logo.png', mimeType: 'image/png', buffer: pngFaixa(240, 72, [13, 71, 161]) });
await admin.getByText(/Imagem enviada e já em uso/).waitFor({ timeout: 15000 });
assert.ok(await admin.getByRole('radio', { name: /^Enviada por você/ }).isChecked(), 'a imagem enviada passa a ser a logo em uso');
await admin.locator('section[aria-labelledby="secao-logo"]').screenshot({ path: join(pasta, 'admin-5-logo.png') });

const resposta = await fetch(`${base}/api/logo`);
assert.equal(resposta.status, 200);
assert.equal(resposta.headers.get('content-type'), 'image/png');
assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff');
assert.match(resposta.headers.get('content-security-policy') ?? '', /sandbox/);

const inicio = await novaPagina({ width: 1180, height: 900 });
await inicio.goto(base);
await inicio.locator('img.logo-abertura').waitFor();
assert.ok(await inicio.evaluate(() => document.querySelector('img.logo-abertura').naturalWidth === 240), 'a logo enviada carrega na tela inicial');
await inicio.screenshot({ path: join(pasta, 'logo-1-inicio-desktop.png') });
const celular = await novaPagina({ width: 390, height: 800 });
await celular.goto(base);
await celular.locator('img.logo-abertura').waitFor();
await celular.screenshot({ path: join(pasta, 'logo-2-inicio-celular.png') });

await admin.setInputFiles('#arquivo-logo', { name: 'outra.png', mimeType: 'image/png', buffer: pngFaixa(120, 40, [239, 108, 0]) });
await admin.getByText(/Imagem enviada e já em uso/).waitFor({ timeout: 15000 });
await inicio.reload();
await inicio.locator('img.logo-abertura').waitFor();
assert.ok(await inicio.evaluate(() => document.querySelector('img.logo-abertura').naturalWidth === 120), 'a logo trocada aparece (sem ficar a antiga em cache)');

// Escolher uma logo fixa pelo painel vale na hora; a branca vem sobre a faixa azul-marinho.
await admin.getByRole('radio', { name: /^Senac \(branca\)/ }).click();
await admin.getByText(/Logo atualizada/).waitFor({ timeout: 15000 });
await inicio.reload();
await inicio.locator('img.logo-abertura.logo-sobre-escuro').waitFor();
assert.match(await inicio.getAttribute('img.logo-abertura', 'src'), /LOGO-SENAC_BRANCO\.png$/);
await inicio.screenshot({ path: join(pasta, 'logo-3-branca-sobre-escuro.png') });

await admin.getByRole('radio', { name: /^Quatro animais/ }).click();
await admin.getByText(/Logo atualizada/).waitFor({ timeout: 15000 });
await inicio.reload();
await inicio.locator('img.logo-abertura').waitFor();
assert.match(await inicio.getAttribute('img.logo-abertura', 'src'), /logo-quatro-animais\.png$/);
await inicio.screenshot({ path: join(pasta, 'logo-4-quatro-animais.png') });

await admin.getByRole('radio', { name: /^Senac e Fecomércio Sesc Horizontal/ }).click();
await admin.getByText(/Logo atualizada/).waitFor({ timeout: 15000 });
await inicio.reload();
await inicio.locator('img.logo-abertura').waitFor();
assert.equal(await inicio.locator('img.logo-sobre-escuro').count(), 0, 'logo colorida nao leva a faixa escura');
assert.match(await inicio.getAttribute('img.logo-abertura', 'src'), /senac100-colorido\.png$/);

await admin.getByRole('radio', { name: /^Sem logo/ }).click();
await admin.getByText(/Logo atualizada/).waitFor({ timeout: 15000 });
await inicio.reload();
await inicio.getByRole('heading', { name: 'Teste de Perfil DISC' }).waitFor();
assert.equal(await inicio.locator('img.logo-abertura').count(), 0, 'sem logo, a tela inicial fica sem imagem');

// Apagar a imagem enviada tambem apaga a rota e, se ela estava em uso, volta para a generica.
await admin.getByRole('radio', { name: /^Enviada por você/ }).click();
await admin.getByText(/Logo atualizada/).waitFor({ timeout: 15000 });
await admin.getByRole('button', { name: 'Apagar a imagem enviada' }).click();
await admin.getByText('Imagem apagada.').waitFor({ timeout: 15000 });
assert.equal((await fetch(`${base}/api/logo`)).status, 404, 'depois de apagar, a imagem enviada some');
assert.ok(await admin.getByRole('radio', { name: /^Genérica/ }).isChecked(), 'a escolha volta para a generica');
await inicio.reload();
await inicio.locator('img.logo-abertura').waitFor();
assert.match(await inicio.getAttribute('img.logo-abertura', 'src'), /logo-generica\.png$/);
console.log('logo: logos fixas, envio, formatos e tamanho recusados, troca, remocao e tela inicial OK.');

// ------------------------------------------------------------------ ranking na tela inicial
const ranking = await novaPagina({ width: 1180, height: 900 });
await ranking.goto(urlEvento);
await ranking.locator('.totais-inicio').waitFor();
assert.match(await ranking.textContent('.totais-inicio-geral'), /Total geral\s*\d+/, 'o total geral fica no alto');
assert.deepEqual(
    (await ranking.locator('.totais-inicio-nome').allTextContents()).sort(),
    ['Equilibrado', 'Gato', 'Lobo', 'Tubarão', 'Águia'].sort(),
    'um item por perfil, com o nome do animal',
);
assert.equal(await ranking.locator('.totais-inicio-lista li svg').count(), 5, 'cada perfil tem o seu icone');
// nome antes do total, em cada item
assert.ok(await ranking.evaluate(() => [...document.querySelectorAll('.totais-inicio-lista li')].every((li) => li.children[1].className === 'totais-inicio-nome' && li.children[2].tagName === 'B')));
await ranking.screenshot({ path: join(pasta, 'ranking-1-inicio-desktop.png') });

const rankingCelular = await novaPagina({ width: 390, height: 900 });
await rankingCelular.goto(urlEvento);
await rankingCelular.locator('.totais-inicio').waitFor();
await rankingCelular.screenshot({ path: join(pasta, 'ranking-2-inicio-celular.png'), fullPage: true });

// Desligar no gerenciamento tira o ranking da tela inicial (o painel do jogo e uma opcao a parte).
const cfg = (await (await fetch(`${base}/api/admin/config`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: sessao }, body: JSON.stringify({ restaurar: true }) })).json()).config;
assert.equal(cfg.mostrarTotaisInicio, true, 'de fabrica o ranking aparece');
assert.equal((await chamar('/api/admin/config', { config: { ...cfg, mostrarTotaisInicio: false } }, sessao)).status, 200);
await ranking.reload();
await ranking.getByRole('heading', { name: 'Teste de Perfil DISC' }).waitFor();
assert.equal(await ranking.locator('.totais-inicio').count(), 0, 'com o ranking desligado, nada aparece');
assert.equal((await chamar('/api/admin/config', { config: { ...cfg, mostrarTotaisInicio: true } }, sessao)).status, 200);
await ranking.reload();
await ranking.locator('.totais-inicio').waitFor();
console.log('ranking na tela inicial: total geral, nome e icone por animal, ligar e desligar OK.');

// ------------------------------------------------------------------ voltar ao padrao
await admin.getByRole('button', { name: 'Voltar ao padrão' }).click();
await admin.getByText('Tudo voltou ao padrão de fábrica.').waitFor({ timeout: 15000 });
assert.equal(await admin.locator('#palavras-por-etapa').inputValue(), '12');

const outro = await novaPagina();
await outro.goto(base);
await outro.getByRole('heading', { name: 'Teste de Perfil DISC' }).waitFor();
assert.equal((await (await chamar('/api/iniciar', { anonimo: true, evento: slugEvento })).json()).ciclo.escolher, 12, 'de volta a 12 palavras por etapa');

// ------------------------------------------------------------------ sair
await admin.getByRole('button', { name: 'Sair' }).click();
await admin.locator('#senha-admin').waitFor({ timeout: 15000 }); // a pagina recarrega e pede a senha de novo
assert.equal(await admin.getByRole('heading', { name: 'Configurações do jogo', level: 1 }).count(), 0, 'depois de sair, o formulario some');
assert.equal((await chamar('/api/admin/config', { restaurar: true })).status, 401, 'e a gravacao volta a ser recusada');

assert.deepEqual(erros, [], `erros no navegador: ${erros.join(' | ')}`);
await navegador.close();
console.log('OK: acesso por senha, gerenciamento, o jogo obedece a configuracao, voltar ao padrao e sair.');
