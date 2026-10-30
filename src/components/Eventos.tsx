'use client';

import QRCode from 'qrcode';
import { useCallback, useEffect, useState } from 'react';
import type { Evento } from '@/server/eventos';

const ATUALIZAR_A_CADA_MS = 10000;

type Aviso = { tipo: 'ok' | 'erro'; texto: string };

const dataCurta = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** QR code do endereco do jogo do evento, gerado no navegador (so formas, nenhum texto de entrada no SVG). */
function QrDoEvento({ url, nome }: { url: string; nome: string }) {
    const [svg, setSvg] = useState('');

    useEffect(() => {
        let cancelado = false;

        QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0d2b4e', light: '#ffffff' } })
            .then((resultado) => { if (!cancelado) { setSvg(resultado); } })
            .catch(() => undefined);

        return () => { cancelado = true; };
    }, [url]);

    return <div className="evento-qr" role="img" aria-label={`QR code do evento ${nome}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/**
 * Gerenciamento dos eventos: criar, ligar e desligar, renomear e pegar o link, o telao e o QR code de cada um. Evento
 * desligado nao recebe novas partidas; o ranking dele continua visivel.
 */
export default function Eventos({ inicial, base }: { inicial: Evento[]; base: string }) {
    const [eventos, setEventos] = useState(inicial);
    const [nomeNovo, setNomeNovo] = useState('');
    const [ocupado, setOcupado] = useState<number | 'novo' | null>(null);
    const [aviso, setAviso] = useState<Aviso | null>(null);
    const [edicao, setEdicao] = useState<Record<number, string>>({});

    // Endereco absoluto: o do servidor (IP da rede local, ou RUA_URL_PUBLICA); na falta dele, o do navegador.
    const [origem, setOrigem] = useState(base);

    useEffect(() => {
        if (!base) {
            setOrigem(window.location.origin);
        }
    }, [base]);

    const carregar = useCallback(async () => {
        try {
            const resposta = await fetch('/api/admin/eventos', { cache: 'no-store' });

            if (resposta.ok) {
                setEventos(((await resposta.json()) as { eventos: Evento[] }).eventos);
            }
        } catch {
            // sem conexao: segue mostrando a ultima lista
        }
    }, []);

    useEffect(() => {
        const temporizador = setInterval(carregar, ATUALIZAR_A_CADA_MS);

        return () => clearInterval(temporizador);
    }, [carregar]);

    async function chamar(metodo: 'POST' | 'PATCH', corpo: unknown): Promise<{ evento: Evento } | null> {
        try {
            const resposta = await fetch('/api/admin/eventos', { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
            const dados = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                setAviso({ tipo: 'erro', texto: resposta.status === 401 ? 'Sua sessão terminou. Recarregue a página e entre de novo.' : (dados?.erro ?? 'Não foi possível concluir.') });

                return null;
            }

            return dados as { evento: Evento };
        } catch {
            setAviso({ tipo: 'erro', texto: 'Sem conexão. Tente de novo.' });

            return null;
        }
    }

    async function criar(submissao: React.FormEvent) {
        submissao.preventDefault();
        setAviso(null);
        setOcupado('novo');
        const resposta = await chamar('POST', { nome: nomeNovo });
        setOcupado(null);

        if (resposta) {
            setNomeNovo('');
            setAviso({ tipo: 'ok', texto: `Evento “${resposta.evento.nome}” criado e ligado.` });
            await carregar();
        }
    }

    async function alternar(evento: Evento) {
        setAviso(null);
        setOcupado(evento.id);
        const resposta = await chamar('PATCH', { id: evento.id, ativo: !evento.ativo });
        setOcupado(null);

        if (resposta) {
            setAviso({ tipo: 'ok', texto: resposta.evento.ativo ? `“${evento.nome}” ligado: já recebe participantes.` : `“${evento.nome}” desligado: não recebe novas partidas.` });
            await carregar();
        }
    }

    async function renomear(evento: Evento) {
        const novo = edicao[evento.id];

        if (novo === undefined) {
            return;
        }

        setAviso(null);
        setOcupado(evento.id);
        const resposta = await chamar('PATCH', { id: evento.id, nome: novo });
        setOcupado(null);

        if (resposta) {
            setEdicao(({ [evento.id]: _descartado, ...resto }) => resto);
            setAviso({ tipo: 'ok', texto: 'Nome atualizado. Os links e QR codes continuam os mesmos.' });
            await carregar();
        }
    }

    async function copiar(texto: string) {
        try {
            await navigator.clipboard.writeText(texto);
            setAviso({ tipo: 'ok', texto: 'Link copiado.' });
        } catch {
            setAviso({ tipo: 'erro', texto: 'Não foi possível copiar. Selecione o link e copie.' });
        }
    }

    const ligados = eventos.filter((e) => e.ativo).length;

    return (
        <div className="admin eventos">
            <div className="admin-topo">
                <h1>Eventos</h1>
                <p>
                    <button type="button" className="admin-link" onClick={carregar}>Atualizar agora</button>
                </p>
            </div>

            {aviso && <p className={`envios-aviso ${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>{aviso.texto}</p>}

            <section className="admin-secao" aria-labelledby="secao-novo-evento">
                <h2 id="secao-novo-evento">Novo evento</h2>
                <p>Cada evento tem o seu próprio ranking, o seu link com QR code e a sua tela de telão. Ele nasce ligado.</p>

                <form className="evento-novo" onSubmit={criar}>
                    <input
                        id="nome-evento"
                        type="text"
                        maxLength={80}
                        placeholder="Ex.: Feira de Tecnologia 2026"
                        aria-label="Nome do evento"
                        value={nomeNovo}
                        onChange={(e) => setNomeNovo(e.target.value)}
                    />
                    <button type="submit" className="botao" disabled={ocupado === 'novo' || nomeNovo.trim().length < 2}>
                        {ocupado === 'novo' ? 'Criando…' : 'Criar evento'}
                    </button>
                </form>
            </section>

            <section className="admin-secao" aria-labelledby="secao-lista-eventos">
                <h2 id="secao-lista-eventos">Seus eventos <span className="envios-contagem">{ligados} ligado{ligados === 1 ? '' : 's'} de {eventos.length}</span></h2>
                <p>Evento desligado não recebe novas partidas (quem abrir o link vê um aviso), mas o ranking dele continua no telão.</p>

                {eventos.length === 0 ? (
                    <p className="envios-vazio">Nenhum evento ainda. Crie o primeiro acima.</p>
                ) : (
                    <ul className="envios-lista">
                        {eventos.map((evento) => {
                            const jogo = `${origem}/e/${evento.slug}`;
                            const telao = `${origem}/e/${evento.slug}/telao`;
                            const editando = edicao[evento.id] !== undefined;

                            return (
                                <li className={`evento${evento.ativo ? '' : ' desligado'}`} key={evento.id}>
                                    <div className="evento-corpo">
                                        <div className="evento-topo">
                                            {editando ? (
                                                <input
                                                    type="text"
                                                    maxLength={80}
                                                    aria-label={`Novo nome de ${evento.nome}`}
                                                    value={edicao[evento.id]}
                                                    onChange={(e) => setEdicao((atual) => ({ ...atual, [evento.id]: e.target.value }))}
                                                />
                                            ) : (
                                                <strong>{evento.nome}</strong>
                                            )}
                                            <span className={`envio-selo${evento.ativo ? '' : ' pendente'}`}>{evento.ativo ? 'Ligado' : 'Desligado'}</span>
                                        </div>
                                        <p className="envio-tempo">
                                            <span><b>{evento.total}</b> {evento.total === 1 ? 'partida' : 'partidas'}</span>
                                            <span>criado em {dataCurta(evento.criadoEm)}</span>
                                        </p>

                                        <dl className="evento-links">
                                            <div>
                                                <dt>Jogo</dt>
                                                <dd><a href={jogo} target="_blank" rel="noopener noreferrer">{jogo}</a></dd>
                                                <dd><button type="button" className="admin-link" onClick={() => copiar(jogo)}>Copiar link</button></dd>
                                            </div>
                                            <div>
                                                <dt>Telão</dt>
                                                <dd><a href={telao} target="_blank" rel="noopener noreferrer">{telao}</a></dd>
                                                <dd><button type="button" className="admin-link" onClick={() => copiar(telao)}>Copiar link</button></dd>
                                            </div>
                                        </dl>

                                        <div className="envio-acoes">
                                            <button type="button" className={`botao ${evento.ativo ? 'botao--secundario' : 'botao--whatsapp'}`} disabled={ocupado === evento.id} onClick={() => alternar(evento)}>
                                                {evento.ativo ? 'Desligar evento' : 'Ligar evento'}
                                            </button>
                                            {editando ? (
                                                <>
                                                    <button type="button" className="botao" disabled={ocupado === evento.id} onClick={() => renomear(evento)}>Salvar nome</button>
                                                    <button type="button" className="botao botao--discreto" onClick={() => setEdicao(({ [evento.id]: _descartado, ...resto }) => resto)}>Cancelar</button>
                                                </>
                                            ) : (
                                                <button type="button" className="botao botao--discreto" onClick={() => setEdicao((atual) => ({ ...atual, [evento.id]: evento.nome }))}>Renomear</button>
                                            )}
                                        </div>
                                    </div>
                                    <QrDoEvento url={jogo} nome={evento.nome} />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}
