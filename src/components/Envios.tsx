'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { linkWhatsapp, mascararWhatsapp, normalizarWhatsapp, problemaNoWhatsapp } from '@/lib/whatsapp';
import type { EnvioAnonimo, EnvioCadastrado, ListaDeEnvios } from '@/server/envios';

const ATUALIZAR_A_CADA_MS = 8000;

type Filtro = 'pendentes' | 'enviados' | 'todos';
type Aviso = { tipo: 'ok' | 'erro'; texto: string; link?: string };

const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function tempo(restanteMs: number): string {
    const total = Math.max(0, Math.ceil(restanteMs / 1000));

    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Tela da equipe para enviar os resultados pelo WhatsApp: quem se cadastrou (nome e telefone ja guardados) e quem jogou
 * sem cadastro (so um ID; o resultado some em 5 minutos). O envio abre a conversa com a mensagem pronta: quem aperta
 * "enviar" no WhatsApp e a equipe.
 */
export default function Envios({ inicial }: { inicial: ListaDeEnvios }) {
    const [lista, setLista] = useState(inicial);
    // Diferenca entre o relogio do servidor e o deste computador, para a contagem dos anonimos nao depender da hora daqui.
    const [diferenca, setDiferenca] = useState<number | null>(null);
    const [agora, setAgora] = useState<number | null>(null);
    const [aviso, setAviso] = useState<Aviso | null>(null);
    const [filtro, setFiltro] = useState<Filtro>('pendentes');
    const [busca, setBusca] = useState('');
    const [numeros, setNumeros] = useState<Record<string, string>>({});
    const [ocupado, setOcupado] = useState<number | null>(null);

    const carregar = useCallback(async () => {
        try {
            const resposta = await fetch('/api/admin/envios', { cache: 'no-store' });

            if (resposta.status === 401) {
                setAviso({ tipo: 'erro', texto: 'Sua sessão terminou. Recarregue a página e entre de novo.' });

                return;
            }

            if (!resposta.ok) {
                setAviso({ tipo: 'erro', texto: 'Não foi possível atualizar a lista agora.' });

                return;
            }

            const dados = (await resposta.json()) as ListaDeEnvios;
            setLista(dados);
            setDiferenca(dados.agora - Date.now());
            setAviso((atual) => (atual?.tipo === 'erro' && !atual.link ? null : atual));
        } catch {
            setAviso({ tipo: 'erro', texto: 'Sem conexão. A lista será atualizada quando voltar.' });
        }
    }, []);

    // Atualiza a lista de tempos em tempos e conta o tempo dos anonimos a cada segundo.
    useEffect(() => {
        setDiferenca(inicial.agora - Date.now());
        setAgora(Date.now());
        const relogio = setInterval(() => setAgora(Date.now()), 1000);
        const busca = setInterval(carregar, ATUALIZAR_A_CADA_MS);

        return () => {
            clearInterval(relogio);
            clearInterval(busca);
        };
    }, [carregar, inicial.agora]);

    const agoraServidor = agora !== null && diferenca !== null ? agora + diferenca : null;
    const restante = (a: EnvioAnonimo) => (agoraServidor === null ? lista.prazoAnonimoMs : a.expiraEm - agoraServidor);
    const anonimos = lista.anonimos.filter((a) => restante(a) > 0);

    const cadastrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();

        return lista.cadastrados.filter((c) => {
            if (filtro === 'pendentes' && c.enviadoEm !== null) {
                return false;
            }

            if (filtro === 'enviados' && c.enviadoEm === null) {
                return false;
            }

            return termo === '' || c.nome.toLowerCase().includes(termo);
        });
    }, [lista.cadastrados, filtro, busca]);

    const pendentes = lista.cadastrados.filter((c) => c.enviadoEm === null).length;

    async function chamar(metodo: 'POST' | 'DELETE', corpo?: unknown, consulta = ''): Promise<boolean> {
        try {
            const resposta = await fetch(`/api/admin/envios${consulta}`, {
                method: metodo,
                headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
                body: corpo ? JSON.stringify(corpo) : undefined,
            });
            const dados = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                setAviso({ tipo: 'erro', texto: resposta.status === 401 ? 'Sua sessão terminou. Recarregue a página e entre de novo.' : (dados?.erro ?? 'Não foi possível concluir.') });

                return false;
            }

            return true;
        } catch {
            setAviso({ tipo: 'erro', texto: 'Sem conexão. Tente de novo.' });

            return false;
        }
    }

    /** Abre o WhatsApp na conversa com a mensagem pronta; se o navegador bloquear a aba, o aviso traz o link. */
    function abrirWhatsapp(numero: string, mensagem: string): boolean {
        const url = linkWhatsapp(numero, mensagem);
        const janela = window.open(url, '_blank', 'noopener');

        if (!janela) {
            setAviso({ tipo: 'erro', texto: 'O navegador bloqueou a nova aba.', link: url });

            return false;
        }

        return true;
    }

    async function enviar(item: EnvioCadastrado | EnvioAnonimo, informado: string, cadastrado: boolean) {
        const numero = normalizarWhatsapp(informado);

        if (!numero) {
            setAviso({ tipo: 'erro', texto: problemaNoWhatsapp(informado) ?? 'Número inválido.' });

            return;
        }

        setAviso(null);
        // Abre antes de qualquer espera: assim o navegador entende que foi o clique e nao bloqueia a aba.
        abrirWhatsapp(numero, item.mensagem);
        setOcupado(item.id);

        // Numero corrigido de quem se cadastrou: grava a correcao. O de anonimo nunca e gravado.
        if (cadastrado && numero !== (item as EnvioCadastrado).whatsapp) {
            await chamar('POST', { acao: 'whatsapp', id: item.id, whatsapp: numero });
        }

        await chamar('POST', { acao: 'enviado', id: item.id, enviado: true });
        setOcupado(null);
        await carregar();
    }

    async function desfazer(id: number) {
        setOcupado(id);
        await chamar('POST', { acao: 'enviado', id, enviado: false });
        setOcupado(null);
        await carregar();
    }

    async function descartar(id: number) {
        if (!window.confirm('Descartar este resultado? Ele será apagado agora e não poderá ser enviado depois.')) {
            return;
        }

        setOcupado(id);
        await chamar('DELETE', undefined, `?id=${id}`);
        setOcupado(null);
        await carregar();
    }

    async function sair() {
        await fetch('/api/admin/sair', { method: 'POST' }).catch(() => undefined);
        window.location.reload();
    }

    const numeroDe = (chave: string, padrao: string) => numeros[chave] ?? padrao;
    const definirNumero = (chave: string, valor: string) => setNumeros((atual) => ({ ...atual, [chave]: mascararWhatsapp(valor) }));

    return (
        <div className="admin envios">
            <div className="admin-topo">
                <h1>Envio de resultados</h1>
                <p>
                    <a href="/admin">Gerenciamento</a>
                    {' · '}
                    <button type="button" className="admin-link" onClick={carregar}>Atualizar agora</button>
                    {' · '}
                    <button type="button" className="admin-link" onClick={sair}>Sair</button>
                </p>
            </div>

            {aviso && (
                <p className={`envios-aviso ${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>
                    {aviso.texto}{' '}
                    {aviso.link && <a href={aviso.link} target="_blank" rel="noopener noreferrer">Toque aqui para abrir o WhatsApp</a>}
                </p>
            )}

            <section className="admin-secao" aria-labelledby="secao-anonimos">
                <h2 id="secao-anonimos">Sem cadastro: pelo ID <span className="envios-contagem">{anonimos.length}</span></h2>
                <p>
                    Quem jogou sem informar nome e telefone vê um ID no fim do jogo. Se a pessoa quiser receber o resultado, digite o número dela aqui:
                    o número não é guardado. Cada resultado é apagado sozinho em {Math.round(lista.prazoAnonimoMs / 60000)} minutos.
                </p>

                {anonimos.length === 0 ? (
                    <p className="envios-vazio">Nenhum resultado sem cadastro no momento.</p>
                ) : (
                    <ul className="envios-lista">
                        {anonimos.map((a) => {
                            const restanteMs = restante(a);
                            const pct = Math.max(0, Math.min(100, (restanteMs / lista.prazoAnonimoMs) * 100));
                            const chave = `a${a.id}`;

                            return (
                                <li className="envio envio--anonimo" key={a.id}>
                                    <div
                                        className={`envio-prazo${restanteMs <= 60000 ? ' acabando' : ''}`}
                                        role="progressbar"
                                        aria-label={`Tempo até o resultado ${a.idExibicao} ser apagado`}
                                        aria-valuemin={0}
                                        aria-valuemax={Math.round(lista.prazoAnonimoMs / 1000)}
                                        aria-valuenow={Math.max(0, Math.ceil(restanteMs / 1000))}
                                    >
                                        <span style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="envio-corpo">
                                        <div className="envio-id">
                                            <strong>{a.idExibicao}</strong>
                                            <span>{a.animal}</span>
                                        </div>
                                        <p className="envio-tempo">
                                            {agoraServidor === null ? 'Calculando…' : <>Apaga em <b>{tempo(restanteMs)}</b></>}
                                            {a.enviadoEm !== null && <span className="envio-selo">Enviado às {hora(a.enviadoEm)}</span>}
                                        </p>
                                        <div className="envio-acoes">
                                            <input
                                                type="tel"
                                                inputMode="numeric"
                                                autoComplete="off"
                                                placeholder="(65) 99999-9999"
                                                aria-label={`WhatsApp de quem tem o ID ${a.idExibicao}`}
                                                value={numeroDe(chave, '')}
                                                onChange={(e) => definirNumero(chave, e.target.value)}
                                            />
                                            <button type="button" className="botao botao--whatsapp" disabled={ocupado === a.id} onClick={() => enviar(a, numeroDe(chave, ''), false)}>
                                                Enviar pelo WhatsApp
                                            </button>
                                            <button type="button" className="botao botao--discreto" disabled={ocupado === a.id} onClick={() => descartar(a.id)}>
                                                Descartar resultado
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section className="admin-secao" aria-labelledby="secao-cadastrados">
                <h2 id="secao-cadastrados">Com cadastro <span className="envios-contagem">{pendentes} a enviar</span></h2>
                <p>Quem informou nome e WhatsApp no início. O número pode ser corrigido antes de enviar.</p>

                <div className="envios-filtros">
                    <div role="group" aria-label="Mostrar">
                        {(['pendentes', 'enviados', 'todos'] as Filtro[]).map((f) => (
                            <button type="button" key={f} className={`envios-aba${filtro === f ? ' ativa' : ''}`} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
                                {f === 'pendentes' ? 'A enviar' : f === 'enviados' ? 'Enviados' : 'Todos'}
                            </button>
                        ))}
                    </div>
                    <input type="search" placeholder="Buscar pelo nome" aria-label="Buscar pelo nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
                </div>

                {cadastrados.length === 0 ? (
                    <p className="envios-vazio">{lista.cadastrados.length === 0 ? 'Ninguém com cadastro terminou o jogo ainda.' : 'Nenhum resultado neste filtro.'}</p>
                ) : (
                    <ul className="envios-lista">
                        {cadastrados.map((c) => {
                            const chave = `c${c.id}`;

                            return (
                                <li className="envio" key={c.id}>
                                    <div className="envio-corpo">
                                        <div className="envio-id">
                                            <strong>{c.nome}</strong>
                                            <span>{c.animal} · terminou às {hora(c.criadoEm)}</span>
                                        </div>
                                        <p className="envio-tempo">
                                            {c.enviadoEm !== null
                                                ? <span className="envio-selo">Enviado às {hora(c.enviadoEm)}</span>
                                                : <span className="envio-selo pendente">A enviar</span>}
                                        </p>
                                        <div className="envio-acoes">
                                            <input
                                                type="tel"
                                                inputMode="numeric"
                                                autoComplete="off"
                                                aria-label={`WhatsApp de ${c.nome}`}
                                                value={numeroDe(chave, mascararWhatsapp(c.whatsapp))}
                                                onChange={(e) => definirNumero(chave, e.target.value)}
                                            />
                                            <button type="button" className="botao botao--whatsapp" disabled={ocupado === c.id} onClick={() => enviar(c, numeroDe(chave, mascararWhatsapp(c.whatsapp)), true)}>
                                                {c.enviadoEm !== null ? 'Enviar de novo' : 'Enviar pelo WhatsApp'}
                                            </button>
                                            {c.enviadoEm !== null && (
                                                <button type="button" className="botao botao--discreto" disabled={ocupado === c.id} onClick={() => desfazer(c.id)}>
                                                    Desfazer “enviado”
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}
