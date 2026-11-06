import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { autenticarProjeto, configuracaoAgente, enviarMensagem, receberMensagens } from '../src/server/copilot';
import { reservarUsoAgente } from '../src/server/db';

const pasta = mkdtempSync(path.join(tmpdir(), 'copilot-api-'));
const chaveA = 'a'.repeat(64);
const chaveB = 'b'.repeat(64);

beforeEach(() => {
    vi.stubEnv('COPILOT_DIRECT_LINE_SECRET', 'segredo-microsoft-ficticio');
    vi.stubEnv('COPILOT_DIRECT_LINE_URL', 'https://directline.botframework.com/v3/directline');
    vi.stubEnv('COPILOT_SESSAO_SEGREDO', 'c'.repeat(64));
    vi.stubEnv('AGENTE_CHAVES', JSON.stringify({ projetoA: chaveA, projetoB: chaveB }));
    vi.stubEnv('AGENTE_LIMITE_MINUTO', '60');
    vi.stubEnv('RUA_DADOS', pasta);
    vi.stubEnv('RUA_BANCO_LOCAL', '1');
    vi.stubEnv('RUA_BANCO', path.join(pasta, 'limites.db'));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
afterAll(() => {
    try { rmSync(pasta, { recursive: true }); } catch { /* SQLite pode manter o arquivo aberto no Windows. */ }
});

function transporte() {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/conversations')) return Response.json({ conversationId: 'conversa1', token: 'token-microsoft-ficticio', expires_in: 3600 });
        if (init?.method === 'POST') return Response.json({ id: 'atividade-enviada' });
        return Response.json({ activities: [{ type: 'message', id: 'resposta1', from: { id: 'bot', role: 'bot' }, text: 'Codigo da API' }], watermark: 'marca1' });
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

describe('API compartilhada do Copilot', () => {
    it('recusa configuracao incompleta, destinos externos e chaves duplicadas', () => {
        vi.stubEnv('COPILOT_DIRECT_LINE_SECRET', '');
        expect(() => configuracaoAgente()).toThrow();
        vi.stubEnv('COPILOT_DIRECT_LINE_SECRET', 'ficticio');
        vi.stubEnv('COPILOT_DIRECT_LINE_URL', 'https://exemplo.com/v3/directline');
        expect(() => configuracaoAgente()).toThrow();
        vi.stubEnv('COPILOT_DIRECT_LINE_URL', 'https://directline.botframework.com/v3/directline');
        vi.stubEnv('AGENTE_CHAVES', JSON.stringify({ a: chaveA, b: chaveA }));
        expect(() => configuracaoAgente()).toThrow();
    });

    it('identifica o projeto pela chave e recusa credenciais ausentes ou incorretas', () => {
        const config = configuracaoAgente();
        const request = (chave?: string) => new Request('https://exemplo.com/api/agente', { headers: chave ? { Authorization: `Bearer ${chave}` } : {} });
        expect(autenticarProjeto(request(chaveB), config)).toBe('projetoB');
        expect(() => autenticarProjeto(request(), config)).toThrow();
        expect(() => autenticarProjeto(request('x'.repeat(64)), config)).toThrow();
    });

    it('oculta token e conversa e impede reutilizacao de sessao por outro projeto ou adulteracao', async () => {
        const fetchMock = transporte();
        const config = configuracaoAgente();
        const enviada = await enviarMensagem(config, 'projetoA', 'Gere uma API');
        expect(enviada.sessao).not.toContain('token-microsoft');
        const decodificada = Buffer.from(enviada.sessao, 'base64url').toString('utf8');
        expect(decodificada).not.toContain('token-microsoft');
        expect(decodificada).not.toContain('conversa1');
        fetchMock.mockClear();
        await expect(receberMensagens(config, 'projetoB', enviada.sessao)).rejects.toMatchObject({ status: 400 });
        const bytes = Buffer.from(enviada.sessao, 'base64url');
        bytes[30] ^= 1;
        await expect(receberMensagens(config, 'projetoA', bytes.toString('base64url'))).rejects.toMatchObject({ status: 400 });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('avanca o watermark, preserva-o quando ausente e nao devolve eco do usuario', async () => {
        const fetchMock = transporte();
        const config = configuracaoAgente();
        const enviada = await enviarMensagem(config, 'projetoA', 'Mensagem');
        const recebida = await receberMensagens(config, 'projetoA', enviada.sessao);
        expect(recebida.resposta).toBe('Codigo da API');
        fetchMock.mockResolvedValueOnce(Response.json({ activities: [{ type: 'message', from: { id: 'usuario', role: 'user' }, text: 'Mensagem' }], watermark: null }));
        const vazia = await receberMensagens(config, 'projetoA', recebida.sessao);
        expect(vazia.mensagens).toEqual([]);
        await receberMensagens(config, 'projetoA', vazia.sessao);
        expect(fetchMock.mock.calls.at(-1)?.[0]).toContain('watermark=marca1');
    });

    it('nao repete um envio com resultado incerto nem expoe o erro do provedor', async () => {
        const fetchMock = transporte();
        fetchMock.mockRejectedValueOnce(new Error('credencial confidencial'));
        await expect(enviarMensagem(configuracaoAgente(), 'projetoA', 'Mensagem')).rejects.toMatchObject({ status: 502 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('aplica limite atomico por projeto com chamadas concorrentes e renova a janela', async () => {
        const agora = 120_000;
        const resultados = await Promise.all(Array.from({ length: 20 }, () => reservarUsoAgente('teste-quota', 10, agora)));
        expect(resultados.filter(Boolean)).toHaveLength(10);
        expect(await reservarUsoAgente('outro-projeto', 10, agora)).toBe(true);
        expect(await reservarUsoAgente('teste-quota', 10, agora + 60_000)).toBe(true);
    });
});
