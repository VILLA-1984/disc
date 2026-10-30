/**
 * Utilidades dos testes de ponta a ponta. O jogo so abre dentro de um evento, entao cada teste cria o seu evento de
 * teste (pela API da equipe) e joga nele. Usa USER_AREA_ADM e PASS_AREA_ADM do .env.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criarCiclo } from '../src/jogo/ciclo.js';

export function lerEnv() {
    const env = {};

    for (const linha of readFileSync('.env', 'utf8').split(/\r?\n/)) {
        const achado = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);

        if (achado) {
            env[achado[1]] = achado[2].replace(/^["']|["']$/g, '');
        }
    }

    return env;
}

/** Entra como equipe pela API e devolve o cookie de sessao ("rua_admin=..."). */
export async function entrarComoEquipe(base) {
    const env = lerEnv();
    assert.ok(env.USER_AREA_ADM && env.PASS_AREA_ADM, 'defina USER_AREA_ADM e PASS_AREA_ADM no .env');

    const resposta = await fetch(`${base}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: env.USER_AREA_ADM, senha: env.PASS_AREA_ADM }),
    });
    assert.equal(resposta.status, 200, 'login da equipe pela API');

    return (resposta.headers.get('set-cookie') ?? '').split(';')[0];
}

/** Cria um evento (ligado) e devolve { id, slug, nome, cookie }. Por padrao o nome leva um sufixo unico; com { exato: true }, nao. */
export async function eventoDeTeste(base, prefixo = 'Teste E2E', { exato = false } = {}) {
    const cookie = await entrarComoEquipe(base);
    const resposta = await fetch(`${base}/api/admin/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ nome: exato ? prefixo : `${prefixo} ${Date.now().toString(36)}` }),
    });
    assert.equal(resposta.status, 201, 'criar o evento de teste');

    return { ...(await resposta.json()).evento, cookie };
}

/**
 * Joga uma partida inteira pela API (sem navegador) e conclui: pega uma palavra a cada tres, a partir de `deslocamento`
 * (0, 1 ou 2), o que muda o resultado. Devolve a resposta de /api/concluir.
 */
export async function jogarPelaApi(base, corpoIniciar, deslocamento = 0) {
    const json = (rota, corpo) => fetch(base + rota, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    const iniciada = await (await json('/api/iniciar', corpoIniciar)).json();
    assert.ok(iniciada.ciclo, `a partida devia vir em ciclo: ${JSON.stringify(iniciada).slice(0, 120)}`);
    const escolhas = [];

    iniciada.ciclo.etapas.forEach((ordens, stage) => {
        const etapa = criarCiclo(ordens, iniciada.ciclo.escolher);
        let i = 0;

        for (let id = etapa.proximo(); id !== null; id = etapa.proximo()) {
            const take = (i++ + deslocamento) % 3 === 0;
            etapa.registrar(take);
            escolhas.push({ stage, take, ms: 400 });
        }
    });

    const concluida = await json('/api/concluir', { token: iniciada.token, escolhas });
    assert.equal(concluida.status, 200, 'concluir a partida');

    return concluida.json();
}
