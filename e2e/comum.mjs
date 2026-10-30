/**
 * Utilidades dos testes de ponta a ponta. O jogo so abre dentro de um evento, entao cada teste cria o seu evento de
 * teste (pela API da equipe) e joga nele. Usa USER_AREA_ADM e PASS_AREA_ADM do .env.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

/** Cria um evento (ligado) com nome unico e devolve { id, slug, nome, cookie }. */
export async function eventoDeTeste(base, prefixo = 'Teste E2E') {
    const cookie = await entrarComoEquipe(base);
    const resposta = await fetch(`${base}/api/admin/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ nome: `${prefixo} ${Date.now().toString(36)}` }),
    });
    assert.equal(resposta.status, 201, 'criar o evento de teste');

    return { ...(await resposta.json()).evento, cookie };
}
