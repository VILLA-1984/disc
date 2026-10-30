import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracaoPadrao, validar } from '../src/server/configuracao';

let pasta: string;

beforeAll(() => {
    pasta = mkdtempSync(path.join(tmpdir(), 'rua-totais-'));
    process.env.RUA_DADOS = pasta;
    delete process.env.RUA_BANCO;
    delete process.env.RUA_BANCO_LOCAL; // forcaria o sqlite local e esconderia o modo turso
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
});

afterAll(() => {
    try {
        rmSync(pasta, { recursive: true, force: true });
    } catch {
        // No Windows o SQLite segura o arquivo aberto ate o processo terminar; a pasta e temporaria.
    }
});

describe('totais do ranking', () => {
    it('sem partidas: total zero e os cinco perfis na ordem D, I, S, C e equilibrado', async () => {
        const { montarTotais } = await import('../src/server/totais');
        const totais = await montarTotais();

        expect(totais.total).toBe(0);
        expect(totais.animais.map((a) => a.chave)).toEqual(['tubarao', 'aguia', 'gato', 'lobo', 'equilibrado']);
        expect(totais.animais.map((a) => a.nome)).toEqual(['Tubarão', 'Águia', 'Gato', 'Lobo', 'Equilibrado']);
        expect(totais.animais.every((a) => a.total === 0)).toBe(true);
    });

    it('conta cada partida uma vez e soma o total geral', async () => {
        const { registrarPartida } = await import('../src/server/db');
        const { montarTotais } = await import('../src/server/totais');

        await registrarPartida('a1', 'lobo');
        await registrarPartida('a2', 'lobo');
        await registrarPartida('a3', 'gato');
        await registrarPartida('a4', 'equilibrado');
        expect(await registrarPartida('a1', 'lobo')).toBe(false); // o mesmo codigo nao conta duas vezes

        const totais = await montarTotais();
        const por = Object.fromEntries(totais.animais.map((a) => [a.chave, a.total]));

        expect(totais.total).toBe(4);
        expect(por).toEqual({ tubarao: 0, aguia: 0, gato: 1, lobo: 2, equilibrado: 1 });
        // o total geral e a soma dos perfis
        expect(totais.animais.reduce((soma, a) => soma + a.total, 0)).toBe(totais.total);
    });
});

describe('ranking na tela inicial (configuracao)', () => {
    it('vem ligado de fabrica e aceita desligar; valor invalido volta ao padrao', () => {
        expect(configuracaoPadrao().mostrarTotaisInicio).toBe(true);

        const base = { ...configuracaoPadrao() };
        const desligado = validar({ ...base, mostrarTotaisInicio: false });

        expect(desligado.ok && desligado.config.mostrarTotaisInicio).toBe(false);

        const invalido = validar({ ...base, mostrarTotaisInicio: 'nao' });

        expect(invalido.ok && invalido.config.mostrarTotaisInicio).toBe(true);

        // configuracao salva antes desta opcao existir (sem o campo): continua valendo, com o ranking ligado
        const { mostrarTotaisInicio: _omitido, ...antiga } = base;
        const r = validar(antiga);

        expect(r.ok && r.config.mostrarTotaisInicio).toBe(true);
    });
});
