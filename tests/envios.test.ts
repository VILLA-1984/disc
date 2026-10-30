import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let pasta: string;

beforeAll(() => {
    pasta = mkdtempSync(path.join(tmpdir(), 'rua-envios-'));
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

const resumo = (D: number, I: number, S: number, C: number) => ({
    natural: { percentual: { D, I, S, C }, total: 14 },
    adaptado: { percentual: { D: C, I: S, S: I, C: D }, total: 14 },
});

const T0 = 1_800_000_000_000;
const CINCO_MIN = 5 * 60 * 1000;

describe('ID de quem joga sem cadastro', () => {
    it('tem o formato ABC-123, sem as letras e digitos que se confundem', async () => {
        const { gerarIdExibicao } = await import('../src/server/envios');

        for (let i = 0; i < 300; i++) {
            expect(gerarIdExibicao()).toMatch(/^[A-HJKMNP-Z]{3}-[2-9]{3}$/);
        }
    });
});

describe('guardar o resultado', () => {
    it('anonimo: ganha ID, nao guarda nada pessoal e expira em 5 minutos', async () => {
        const { guardarResultado } = await import('../src/server/envios');
        const { resultadoPorCodigo } = await import('../src/server/db');

        const guardado = await guardarResultado('anon-1', 0, resumo(50, 20, 15, 15), T0);

        expect(guardado.idExibicao).toMatch(/^[A-HJKMNP-Z]{3}-[2-9]{3}$/);
        expect(guardado.restanteMs).toBe(CINCO_MIN);

        const linha = await resultadoPorCodigo('anon-1');

        expect(linha?.participante_id).toBeNull();
        expect(linha?.nome).toBeNull();
        expect(linha?.whatsapp).toBeNull();
        expect(linha?.expira_em).toBe(T0 + CINCO_MIN);
    });

    it('concluir duas vezes a mesma partida devolve o mesmo ID, sem duplicar', async () => {
        const { guardarResultado } = await import('../src/server/envios');

        const primeiro = await guardarResultado('anon-2', 0, resumo(10, 60, 15, 15), T0);
        const segundo = await guardarResultado('anon-2', 0, resumo(10, 60, 15, 15), T0 + 60_000);

        expect(segundo.idExibicao).toBe(primeiro.idExibicao);
        expect(segundo.restanteMs).toBe(CINCO_MIN - 60_000); // o prazo nao recomeca
    });

    it('cadastrado: fica ligado ao cadastro, sem ID e sem prazo', async () => {
        const { criarParticipante } = await import('../src/server/db');
        const { guardarResultado } = await import('../src/server/envios');
        const { resultadoPorCodigo } = await import('../src/server/db');

        const id = await criarParticipante('Ana Souza', '65999990000');
        const guardado = await guardarResultado('cad-1', id, resumo(20, 20, 50, 10), T0);

        expect(guardado).toEqual({ idExibicao: null, restanteMs: null });
        expect((await resultadoPorCodigo('cad-1'))?.participante_id).toBe(id);
    });
});

describe('lista da tela /whatsapp', () => {
    it('separa cadastrados e anonimos e monta a mensagem de cada um', async () => {
        const { listarEnvios } = await import('../src/server/envios');
        const lista = await listarEnvios(T0 + 1000);

        expect(lista.prazoAnonimoMs).toBe(CINCO_MIN);
        expect(lista.cadastrados.map((c) => c.nome)).toEqual(['Ana Souza']);
        expect(lista.cadastrados[0].whatsapp).toBe('65999990000');
        expect(lista.cadastrados[0].animal).toBe('Gato');
        expect(lista.cadastrados[0].mensagem.startsWith('Olá, Ana!')).toBe(true);
        expect(lista.cadastrados[0].enviadoEm).toBeNull();

        expect(lista.anonimos).toHaveLength(2);
        expect(lista.anonimos.map((a) => a.animal).sort()).toEqual(['Tubarão', 'Águia']);
        expect(lista.anonimos.every((a) => a.mensagem.startsWith('Olá! Este é o seu resultado'))).toBe(true);
        expect(lista.anonimos.every((a) => a.expiraEm === T0 + CINCO_MIN || a.expiraEm === T0 + CINCO_MIN)).toBe(true);
        // a lista nao leva o resumo bruto nem o codigo da partida
        expect(JSON.stringify(lista)).not.toContain('anon-1');
    });

    it('marca e desmarca como enviado', async () => {
        const { listarEnvios, marcarEnviado } = await import('../src/server/envios');
        const [ana] = (await listarEnvios(T0)).cadastrados;

        expect(await marcarEnviado(ana.id, true, T0 + 5000)).toBe(true);
        expect((await listarEnvios(T0 + 6000)).cadastrados[0].enviadoEm).toBe(T0 + 5000);

        expect(await marcarEnviado(ana.id, false, T0 + 7000)).toBe(true);
        expect((await listarEnvios(T0 + 8000)).cadastrados[0].enviadoEm).toBeNull();
    });

    it('corrige o numero de quem se cadastrou; anonimo nao tem numero', async () => {
        const { corrigirWhatsapp, listarEnvios } = await import('../src/server/envios');
        const lista = await listarEnvios(T0);

        expect(await corrigirWhatsapp(lista.cadastrados[0].id, '65988887777')).toBe(true);
        expect((await listarEnvios(T0)).cadastrados[0].whatsapp).toBe('65988887777');
        expect(await corrigirWhatsapp(lista.anonimos[0].id, '65988887777')).toBe(false);
    });

    it('descartar vale so para anonimo e apaga na hora', async () => {
        const { descartarAnonimo, listarEnvios } = await import('../src/server/envios');
        const { resultadoPorCodigo } = await import('../src/server/db');
        const lista = await listarEnvios(T0);

        expect(await descartarAnonimo(lista.cadastrados[0].id)).toBe(false); // cadastrado nao se descarta
        expect((await listarEnvios(T0)).cadastrados).toHaveLength(1);

        // o mais recente vem primeiro: aqui, anon-2
        expect(await descartarAnonimo(lista.anonimos[0].id)).toBe(true);
        expect((await listarEnvios(T0)).anonimos).toHaveLength(1);
        expect(await resultadoPorCodigo('anon-2')).toBeUndefined();
        expect(await resultadoPorCodigo('anon-1')).toBeDefined();
    });

    it('depois dos 5 minutos o anonimo some da lista e e apagado do banco; o cadastrado fica', async () => {
        const { listarEnvios, marcarEnviado } = await import('../src/server/envios');
        const { resultadoPorCodigo } = await import('../src/server/db');
        const [restante] = (await listarEnvios(T0)).anonimos;

        // no ultimo instante ainda vale; um milissegundo depois, nao
        expect((await listarEnvios(T0 + CINCO_MIN - 1)).anonimos).toHaveLength(1);
        expect(await marcarEnviado(restante.id, true, T0 + CINCO_MIN)).toBe(false); // vencido: nao da para marcar

        const depois = await listarEnvios(T0 + CINCO_MIN + 1);

        expect(depois.anonimos).toHaveLength(0);
        expect(depois.cadastrados).toHaveLength(1);
        expect(await resultadoPorCodigo('anon-1')).toBeUndefined();
        expect(await resultadoPorCodigo('cad-1')).toBeDefined();
    });

    it('um novo resultado tambem limpa os vencidos (nao ha rotina agendada)', async () => {
        const { guardarResultado } = await import('../src/server/envios');
        const { resultadoPorCodigo } = await import('../src/server/db');

        await guardarResultado('anon-velho', 0, resumo(40, 20, 20, 20), T0);
        await guardarResultado('anon-novo', 0, resumo(40, 20, 20, 20), T0 + CINCO_MIN + 10);

        expect(await resultadoPorCodigo('anon-velho')).toBeUndefined();
        expect(await resultadoPorCodigo('anon-novo')).toBeDefined();
    });
});
