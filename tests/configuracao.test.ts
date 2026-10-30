import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { LIMITES, TEXTOS, interpolar, paraHtml, textoDe } from '../src/lib/configuracao';
import { configuracaoPadrao, montarCatalogo, validar } from '../src/server/configuracao';

let pasta: string;

beforeAll(() => {
    pasta = mkdtempSync(path.join(tmpdir(), 'rua-config-'));
    process.env.RUA_DADOS = pasta;
    delete process.env.RUA_SEGREDO;
    delete process.env.RUA_BANCO;
    delete process.env.RUA_ESCOLHER;
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

describe('configuracao de fabrica', () => {
    it('libera tudo, mostra tudo e comeca em 12 palavras por etapa', () => {
        const padrao = configuracaoPadrao();
        const catalogo = montarCatalogo();

        expect(padrao.palavrasPorEtapa).toBe(12);
        expect(padrao.avatares).toHaveLength(catalogo.avatares.length);
        expect(padrao.cenarios).toEqual(catalogo.cenarios.map((c) => c.chave));
        expect(padrao.meios).toEqual(catalogo.meios.map((m) => m.chave));
        expect([padrao.mostrarTotais, padrao.mostrarRanking, padrao.mostrarMinimapa, padrao.mostrarProgresso]).toEqual([true, true, true, true]);
        expect(padrao.textos).toEqual({});
    });

    it('a configuracao de fabrica passa na validacao', () => {
        expect(validar(configuracaoPadrao()).ok).toBe(true);
    });

    it('o catalogo traz os cenarios do jogo e os avatares compativeis de cada meio', () => {
        const catalogo = montarCatalogo();

        expect(catalogo.cenarios.map((c) => c.chave)).toEqual(['rua', 'rio', 'ar', 'neve', 'trilhos']);
        expect(catalogo.cenarios.find((c) => c.chave === 'rua')?.temMeios).toBe(false);
        expect(catalogo.cenarios.find((c) => c.chave === 'rio')?.temMeios).toBe(true);

        // Moto aquatica: so quem anda, usa bengala ou ja e de moto. Sit-ski: so cadeira de rodas.
        const mobilidade = (id: string) => catalogo.avatares.find((a) => a.id === id)?.mobilidade;
        const motoAquatica = catalogo.meios.find((m) => m.chave === 'moto-aquatica')!;
        const sitSki = catalogo.meios.find((m) => m.chave === 'sit-ski')!;

        expect(motoAquatica.avatares.every((id) => ['anda', 'bengala', 'moto'].includes(mobilidade(id) ?? ''))).toBe(true);
        expect(sitSki.avatares.every((id) => mobilidade(id) === 'cadeira')).toBe(true);
        expect(sitSki.avatares.length).toBeGreaterThan(0);
    });
});

describe('validacao', () => {
    const base = () => ({ ...configuracaoPadrao() });
    const recusa = (entrada: unknown) => {
        const r = validar(entrada);

        expect(r.ok).toBe(false);

        return r.ok ? '' : r.erro;
    };

    it('recusa o que nao e uma configuracao', () => {
        expect(recusa(null)).toMatch(/inválid/);
        expect(recusa('texto')).toMatch(/inválid/);
    });

    it('exige pelo menos um avatar e um cenario', () => {
        expect(recusa({ ...base(), avatares: [] })).toMatch(/avatar/);
        expect(recusa({ ...base(), cenarios: [] })).toMatch(/cenário/);
        expect(recusa({ ...base(), avatares: ['inexistente'] })).toMatch(/avatar/); // ids desconhecidos sao descartados
    });

    it('um cenario liberado precisa de pelo menos um meio liberado', () => {
        const meios = base().meios.filter((m) => !['barco', 'veleiro', 'caiaque', 'moto-aquatica', 'boia-pato', 'nado'].includes(m));

        expect(recusa({ ...base(), meios })).toMatch(/Rio.*nenhum meio/);

        // Desmarcando o cenario junto, passa.
        expect(validar({ ...base(), meios, cenarios: base().cenarios.filter((c) => c !== 'rio') }).ok).toBe(true);
    });

    it('um meio liberado precisa de um avatar compativel', () => {
        const catalogo = montarCatalogo();
        const so = catalogo.avatares.filter((a) => a.mobilidade === 'moto').map((a) => a.id); // so quem e de moto
        const semBarco = { ...base(), avatares: so, cenarios: ['rio'], meios: ['barco'] };

        expect(recusa(semBarco)).toMatch(/Barco a motor.*nenhum avatar/);
        expect(validar({ ...semBarco, meios: ['moto-aquatica'] }).ok).toBe(true); // quem e de moto pilota moto aquatica
    });

    it('um cenario sem meios (rua) tambem precisa de um avatar que possa ir', () => {
        const r = validar({ ...base(), cenarios: ['rua'], avatares: ['ana'] });

        expect(r.ok).toBe(true);
    });

    it.each([5, 37, 12.5, '12', Number.NaN, null])('recusa palavras por etapa invalidas (%s)', (valor) => {
        expect(recusa({ ...base(), palavrasPorEtapa: valor })).toMatch(/Palavras por etapa/);
    });

    it.each([LIMITES.palavrasMin, 12, LIMITES.palavrasMax])('aceita palavras por etapa dentro do limite (%i)', (valor) => {
        const r = validar({ ...base(), palavrasPorEtapa: valor });

        expect(r.ok && r.config.palavrasPorEtapa).toBe(valor);
    });

    it('guarda so textos conhecidos, aparados, e esconde so as explicacoes', () => {
        const r = validar({
            ...base(),
            textos: {
                titulo_geral: { texto: '  Meu teste  ', mostrar: false }, // titulo nao pode ser escondido
                fim_texto: { mostrar: false },
                etapa1_texto: { texto: '   ' }, // vazio: volta ao padrao
                inventado: { texto: 'nao existe' },
            },
        });

        expect(r.ok).toBe(true);

        if (r.ok) {
            expect(r.config.textos).toEqual({ titulo_geral: { texto: 'Meu teste' }, fim_texto: { mostrar: false } });
        }
    });

    it('recusa texto acima do limite', () => {
        expect(recusa({ ...base(), textos: { fim_texto: { texto: 'a'.repeat(LIMITES.textoMax + 1) } } })).toMatch(/passa de 600/);
    });

    it('usa RUA_ESCOLHER como ponto de partida quando for valido', () => {
        process.env.RUA_ESCOLHER = '20';

        try {
            expect(configuracaoPadrao().palavrasPorEtapa).toBe(20);
            process.env.RUA_ESCOLHER = '99';
            expect(configuracaoPadrao().palavrasPorEtapa).toBe(12);
        } finally {
            delete process.env.RUA_ESCOLHER;
        }
    });
});

describe('textos do jogo', () => {
    it('tem um padrao para cada texto, e so as explicacoes podem ser escondidas', () => {
        expect(new Set(TEXTOS.map((t) => t.chave)).size).toBe(TEXTOS.length);

        for (const t of TEXTOS) {
            expect(t.padrao.length).toBeGreaterThan(0);
        }

        expect(TEXTOS.filter((t) => /_titulo$|titulo_geral|cadastro_pergunta/.test(t.chave)).every((t) => !t.podeOcultar)).toBe(true);
    });

    it('troca os marcadores e deixa os desconhecidos como estao', () => {
        expect(interpolar('Pegue {n} de {total} ({x})', { n: 12, total: 48 })).toBe('Pegue 12 de 48 ({x})');
        expect(textoDe({}, 'regra_texto', { n: 12 })).toBe('Você precisa pegar 12 palavras no total. As que você deixar passar voltam mais tarde, até você completar as 12.');
    });

    it('usa o texto editado, o padrao quando nao ha edicao, e vazio quando a explicacao e escondida', () => {
        expect(textoDe({ titulo_geral: { texto: 'Meu teste' } }, 'titulo_geral')).toBe('Meu teste');
        expect(textoDe({}, 'titulo_geral')).toBe('Teste de Perfil DISC');
        expect(textoDe({ fim_texto: { mostrar: false } }, 'fim_texto')).toBe('');
        expect(textoDe({ titulo_geral: { mostrar: false } }, 'titulo_geral')).toBe('Teste de Perfil DISC'); // titulo nunca some
    });

    it('escapa HTML e converte quebras de linha (texto editado vai para o cartao do jogo)', () => {
        expect(paraHtml('<b>oi</b> & "tchau"\nlinha 2')).toBe('&lt;b&gt;oi&lt;/b&gt; &amp; &quot;tchau&quot;<br>linha 2');
    });
});

describe('gravacao da configuracao', () => {
    async function ciclo() {
        const { carregarConfiguracao, restaurarConfiguracao, salvarConfiguracao } = await import('../src/server/configuracao');
        const { gravarConfiguracao } = await import('../src/server/db');

        expect((await carregarConfiguracao()).palavrasPorEtapa).toBe(12); // nada salvo: fabrica

        const nova = { ...configuracaoPadrao(), palavrasPorEtapa: 14, mostrarMinimapa: false, cenarios: ['rua', 'rio'], textos: { titulo_geral: { texto: 'Meu teste' } } };
        await salvarConfiguracao(nova);

        const lida = await carregarConfiguracao();

        expect(lida.palavrasPorEtapa).toBe(14);
        expect(lida.mostrarMinimapa).toBe(false);
        expect(lida.cenarios).toEqual(['rua', 'rio']);
        expect(lida.textos.titulo_geral?.texto).toBe('Meu teste');

        // Salvar de novo substitui (nao duplica).
        await salvarConfiguracao({ ...nova, palavrasPorEtapa: 16 });
        expect((await carregarConfiguracao()).palavrasPorEtapa).toBe(16);

        // Configuracao salva que ficou invalida (ou ilegivel) nunca derruba o jogo: volta a fabrica.
        await gravarConfiguracao('jogo', '{"avatares":[],"palavrasPorEtapa":12}');
        expect((await carregarConfiguracao()).avatares.length).toBeGreaterThan(1);
        await gravarConfiguracao('jogo', 'isto nao e json');
        expect((await carregarConfiguracao()).palavrasPorEtapa).toBe(12);

        // Restaurar apaga o que estava salvo.
        await salvarConfiguracao(nova);
        expect((await restaurarConfiguracao()).palavrasPorEtapa).toBe(12);
        expect((await carregarConfiguracao()).mostrarMinimapa).toBe(true);
    }

    it('salva, le, substitui e restaura (sqlite local)', async () => {
        vi.resetModules();
        await ciclo();
    });

    it('faz o mesmo no turso (libSQL)', async () => {
        vi.resetModules();
        process.env.TURSO_DATABASE_URL = `file:${path.join(pasta, 'turso-config.db').replaceAll('\\', '/')}`;

        try {
            await ciclo();
        } finally {
            delete process.env.TURSO_DATABASE_URL;
            vi.resetModules();
        }
    });
});

describe('sessao da area de gerenciamento', () => {
    it('vale por 8 horas e recusa adulterado, expirado e lixo', async () => {
        vi.resetModules();
        const { assinarSessaoAdmin, assinar, verificarSessaoAdmin } = await import('../src/server/token');
        const agora = Date.now();
        const sessao = assinarSessaoAdmin(agora);
        const [expira, assinatura] = sessao.split('.');

        expect(verificarSessaoAdmin(sessao, agora + 60_000)).toBe(true);
        expect(verificarSessaoAdmin(sessao, agora + 9 * 3600 * 1000)).toBe(false); // passou das 8 horas
        expect(verificarSessaoAdmin(`${Number(expira) + 10_000_000}.${assinatura}`, agora)).toBe(false); // data trocada
        expect(verificarSessaoAdmin(`${expira}.xx`, agora)).toBe(false);
        expect(verificarSessaoAdmin('lixo', agora)).toBe(false);
        expect(verificarSessaoAdmin(undefined, agora)).toBe(false);
        expect(verificarSessaoAdmin(null, agora)).toBe(false);

        // Um token de partida nao serve como sessao de administrador.
        expect(verificarSessaoAdmin(assinar(7, [[{ top: 1, bottom: 2 }]]), agora)).toBe(false);
    });
});
