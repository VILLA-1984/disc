/**
 * Teste de ponta a ponta: cadastro (com numero errado), partida completa, relatorio do animal, fim do jogo (a equipe
 * envia o resultado) e conferencia da lista de envios. Requer o servidor com USER_AREA_ADM e PASS_AREA_ADM no .env, em RUA_URL (padrao http://127.0.0.1:3100).
 * Uso: node e2e/partida.mjs [pasta_das_capturas] [3d|lateral]
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.RUA_URL ?? 'http://127.0.0.1:3100';
const pasta = process.argv[2] ?? 'e2e/capturas';
const modo = process.argv[3] === 'lateral' ? 'lateral' : '3d';
// Quarto argumento "anonimo": joga sem cadastro e confere o ID do fim do jogo (em vez do cadastro da Maria).
const anonimo = process.argv[4] === 'anonimo';
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

if (anonimo) {
    await pagina.check('#receber-nao');
    await pagina.getByRole('button', { name: 'Começar a jogar' }).click();
} else {
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
}

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
        const escolher = Number(process.env.RUA_ESCOLHER) || 12;
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
assert.match(await botaoFinal.textContent(), /Continuar/);
await botaoFinal.click();

// ------------------------------------------------------------------ fim do jogo: a equipe envia, nao o jogador
await pagina.getByRole('heading', { name: anonimo ? 'Quer receber o resultado?' : 'Resultado pronto' }).waitFor();
await pagina.screenshot({ path: join(pasta, 'e2e-2-fim.png') });
if (!anonimo) assert.match(await pagina.textContent('#titulo-envio ~ p'), /Obrigado, Maria! A equipe vai enviar o seu resultado para o WhatsApp \(65\) 9••••-0000\./);
assert.equal(await pagina.locator('#whatsapp-final').count(), 0, 'o jogador nao envia mais pela propria tela');
assert.equal((await pagina.evaluate(() => window.__abertos)).length, 0, 'o jogo nao abre o WhatsApp sozinho');

let idMostrado = null;

if (anonimo) {
    idMostrado = (await pagina.textContent('.id-resultado-codigo')).trim();
    assert.match(idMostrado, /^[A-HJKMNP-Z]{3}-[2-9]{3}$/, 'o jogador sem cadastro ve o ID');
    assert.match(await pagina.textContent('.id-resultado-prazo'), /O resultado é apagado em \d:\d{2}\./);
    assert.equal(await pagina.locator('.resumo-animal').count(), 1);
    await pagina.screenshot({ path: join(pasta, 'e2e-3-fim-anonimo.png') });
}

// O resultado ficou guardado para a equipe, ligado ao cadastro, e a mensagem sai com o nome.
const env = {};

for (const linha of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const achado = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);

    if (achado) {
        env[achado[1]] = achado[2].replace(/^["']|["']$/g, '');
    }
}

const entrou = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: env.USER_AREA_ADM, senha: env.PASS_AREA_ADM }) });
assert.equal(entrou.status, 200, 'login da equipe');
const lista = await (await fetch(`${base}/api/admin/envios`, { headers: { Cookie: (entrou.headers.get('set-cookie') ?? '').split(';')[0] } })).json();
if (anonimo) {
    const dele = lista.anonimos.find((a) => a.idExibicao === idMostrado);
    assert.ok(dele, 'o ID mostrado ao jogador devia estar na lista da equipe');
    assert.match(dele.mensagem, /^Olá! Este é o seu resultado/);
    assert.ok(dele.expiraEm - lista.agora <= lista.prazoAnonimoMs && dele.expiraEm > lista.agora, 'dentro do prazo de 5 minutos');
    assert.ok(!('nome' in dele) && !('whatsapp' in dele), 'o resultado sem cadastro nao leva nome nem telefone');
} else {
    const maria = lista.cadastrados.find((c) => c.nome === 'Maria da Silva');
    assert.ok(maria, 'o resultado da Maria devia estar na lista da equipe');
    assert.equal(maria.whatsapp, '65999990000');
    assert.match(maria.mensagem, /^Olá, Maria!/);
    assert.match(maria.mensagem, /Como você é: D \d+% · I \d+% · S \d+% · C \d+%/);
}

// A partida concluida foi contada uma unica vez: +1 no total e +1 em exatamente um animal.
const totais1 = await (await fetch(`${base}/api/totais`)).json();
assert.equal(totais1.total, totais0.total + 1, 'o total devia subir 1');
const mudaram = totais1.animais.filter((a, i) => a.total !== totais0.animais[i].total);
assert.equal(mudaram.length, 1, 'so um animal devia mudar');
assert.equal(mudaram[0].total, totais0.animais.find((a) => a.chave === mudaram[0].chave).total + 1);

assert.deepEqual(erros, [], `erros no navegador: ${erros.join(' | ')}`);
await navegador.close();
console.log(`OK (${modo}): ${anonimo ? 'sem cadastro' : 'cadastro validado'}, partida completa, "${titulo}", resultado guardado para a equipe.`);
