import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { conferirNome, slugDe, slugValido } from '../src/server/eventos';

let pasta: string;

beforeAll(() => {
    pasta = mkdtempSync(path.join(tmpdir(), 'rua-eventos-'));
    process.env.RUA_DADOS = pasta;
    process.env.RUA_SEGREDO = 'segredo-de-teste-dos-eventos';
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

describe('endereco do evento', () => {
    it.each([
        ['Feira de Tecnologia 2026', 'feira-de-tecnologia-2026'],
        ['  Semana   da Inovação!  ', 'semana-da-inovacao'],
        ['Ação & Reação — SENAC/MT', 'acao-reacao-senac-mt'],
        ['***', 'evento'],
        ['A'.repeat(100), 'a'.repeat(40)],
    ])('"%s" vira "%s"', (nome, esperado) => {
        expect(slugDe(nome)).toBe(esperado);
    });

    it('so aceita enderecos no formato certo', () => {
        expect(slugValido('feira-2026')).toBe(true);
        for (const ruim of ['Feira', 'feira_2026', '-feira', 'feira-', 'fe ira', '', 'a'.repeat(41), '../admin', null, 7]) {
            expect(slugValido(ruim)).toBe(false);
        }
    });

    it('confere o nome: aparado, sem espacos repetidos, de 2 a 80 letras', () => {
        expect(conferirNome('  Feira   Tech ')).toEqual({ ok: true, nome: 'Feira Tech' });
        expect(conferirNome('A').ok).toBe(false);
        expect(conferirNome('   ').ok).toBe(false);
        expect(conferirNome('x'.repeat(81)).ok).toBe(false);
        expect(conferirNome(42).ok).toBe(false);
    });
});

describe('criar, ligar e desligar eventos', () => {
    it('cria ligado, com endereco proprio; nomes iguais ganham -2, -3', async () => {
        const { criarEvento, listarEventos } = await import('../src/server/eventos');

        const a = await criarEvento('Feira de Tecnologia', 1000);
        const b = await criarEvento('Feira de Tecnologia', 2000);
        const c = await criarEvento('Feira de Tecnologia', 3000);

        expect([a.slug, b.slug, c.slug]).toEqual(['feira-de-tecnologia', 'feira-de-tecnologia-2', 'feira-de-tecnologia-3']);
        expect(a).toMatchObject({ nome: 'Feira de Tecnologia', ativo: true, total: 0 });

        // do mais recente para o mais antigo
        expect((await listarEventos()).map((e) => e.slug)).toEqual(['feira-de-tecnologia-3', 'feira-de-tecnologia-2', 'feira-de-tecnologia']);
    });

    it('liga, desliga e renomeia sem mudar o endereco', async () => {
        const { alterarEvento, buscarEvento, criarEvento } = await import('../src/server/eventos');
        const evento = await criarEvento('Semana da Inovação', 5000);

        expect((await alterarEvento(evento.id, { ativo: false }))?.ativo).toBe(false);
        expect((await buscarEvento(evento.slug))?.ativo).toBe(false);
        expect((await alterarEvento(evento.id, { ativo: true }))?.ativo).toBe(true);

        const renomeado = await alterarEvento(evento.id, { nome: 'Semana da Inovação 2026' });

        expect(renomeado).toMatchObject({ nome: 'Semana da Inovação 2026', slug: 'semana-da-inovacao' });
        expect(await alterarEvento(999999, { ativo: false })).toBeNull();
    });

    it('quem vai jogar so entra em evento que existe e esta ligado', async () => {
        const { alterarEvento, criarEvento, eventoParaJogar } = await import('../src/server/eventos');
        const evento = await criarEvento('Evento de Teste', 6000);

        expect((await eventoParaJogar(evento.slug)).situacao).toBe('ok');

        await alterarEvento(evento.id, { ativo: false });
        expect((await eventoParaJogar(evento.slug)).situacao).toBe('inativo');

        expect((await eventoParaJogar('nao-existe')).situacao).toBe('inexistente');
        expect((await eventoParaJogar('../admin')).situacao).toBe('inexistente');
        expect((await eventoParaJogar(undefined)).situacao).toBe('inexistente');
    });
});

describe('ranking de cada evento', () => {
    it('cada evento conta so as suas partidas; as sem evento ficam a parte', async () => {
        const { registrarPartida } = await import('../src/server/db');
        const { criarEvento, listarEventos } = await import('../src/server/eventos');
        const { montarTotais } = await import('../src/server/totais');

        const feira = await criarEvento('Feira do Ranking', 7000);
        const semana = await criarEvento('Semana do Ranking', 8000);

        await registrarPartida('r-sem-1', 'gato'); // sem evento
        await registrarPartida('r-feira-1', 'lobo', feira.id);
        await registrarPartida('r-feira-2', 'lobo', feira.id);
        await registrarPartida('r-feira-3', 'tubarao', feira.id);
        await registrarPartida('r-semana-1', 'aguia', semana.id);

        const porChave = (t: { animais: { chave: string; total: number }[] }) => Object.fromEntries(t.animais.map((a) => [a.chave, a.total]));

        const daFeira = await montarTotais(feira.id);
        expect(daFeira.total).toBe(3);
        expect(porChave(daFeira)).toEqual({ tubarao: 1, aguia: 0, gato: 0, lobo: 2, equilibrado: 0 });

        const daSemana = await montarTotais(semana.id);
        expect(daSemana.total).toBe(1);
        expect(porChave(daSemana)).toMatchObject({ aguia: 1, lobo: 0 });

        // "sem evento" nao inclui as partidas dos eventos
        const semEvento = await montarTotais(null);
        expect(porChave(semEvento).gato).toBe(1);
        expect(porChave(semEvento).lobo).toBe(0);
        expect(await montarTotais()).toEqual(semEvento);

        // a lista do gerenciamento mostra o total de cada evento
        const lista = await listarEventos();
        expect(lista.find((e) => e.id === feira.id)?.total).toBe(3);
        expect(lista.find((e) => e.id === semana.id)?.total).toBe(1);
    });

    it('a mesma partida nao conta duas vezes, nem em outro evento', async () => {
        const { registrarPartida } = await import('../src/server/db');
        const { criarEvento } = await import('../src/server/eventos');
        const { montarTotais } = await import('../src/server/totais');
        const a = await criarEvento('Evento A repetida', 9000);
        const b = await criarEvento('Evento B repetida', 9100);

        expect(await registrarPartida('repetida', 'gato', a.id)).toBe(true);
        expect(await registrarPartida('repetida', 'gato', b.id)).toBe(false);
        expect((await montarTotais(a.id)).total).toBe(1);
        expect((await montarTotais(b.id)).total).toBe(0);
    });
});

describe('token da partida', () => {
    const rodada = [[{ top: 1, bottom: 2 }]];

    it('leva o evento, e sem evento nao tem o campo', async () => {
        const { assinar, verificar } = await import('../src/server/token');

        expect(verificar(assinar(0, rodada, Date.now(), 42))).toMatchObject({ p: 0, v: 42 });
        expect(verificar(assinar(0, rodada))?.v).toBeUndefined();
        expect(verificar(assinar(0, rodada, Date.now(), null))?.v).toBeUndefined();
    });

    it('o evento nao pode ser trocado: alterar o token invalida a assinatura', async () => {
        const { assinar, verificar } = await import('../src/server/token');
        const token = assinar(0, rodada, Date.now(), 42);
        const [corpo, assinatura] = token.split('.');
        const carga = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8'));
        const adulterado = Buffer.from(JSON.stringify({ ...carga, v: 7 }), 'utf8').toString('base64url');

        expect(verificar(`${adulterado}.${assinatura}`)).toBeNull();
    });
});
