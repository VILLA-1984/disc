'use client';

import { useEffect, useRef, useState } from 'react';
import { ANIMAIS } from '@/jogo/animals.js';
import type { LogoEmUso } from '@/lib/logos';
import type { Totais } from '@/server/totais';
import { IconeEquilibrado } from './TotaisInicio';

type Ficha = { chave: string; nome: string; artigo: string; cor: string; slogan: string; svgPath: string };
const FICHAS = ANIMAIS as unknown as Record<string, Ficha>;

/** Os quatro animais do ciclo de animacoes, na ordem D, I, S, C. */
const ORDEM = ['tubarao', 'aguia', 'gato', 'lobo'];
const SOM: Record<string, string> = { tubarao: 'Nhac!', aguia: 'Iiiih!', gato: 'Miau!', lobo: 'Auuuu!' };

const DURACAO_MS = 8000;
const ATUALIZAR_MS = 5000;

type Destaque = { id: number; chave: string; motivo: 'ciclo' | 'novo' };

type Props = {
    evento: { slug: string; nome: string; ativo: boolean };
    inicial: Totais;
    logo: LogoEmUso | null;
    /** De quanto em quanto tempo um animal ganha a tela, em segundos. */
    intervaloSeg: number;
    qr?: React.ReactNode;
};

/**
 * Tela do telao de um evento: o ranking do evento em tela cheia e, de tempos em tempos, um animal em destaque com
 * animacao (um de cada vez, na ordem). Quando chega um resultado novo, o animal dele ganha a tela na hora.
 */
export default function Telao({ evento, inicial, logo, intervaloSeg, qr }: Props) {
    const [dados, setDados] = useState(inicial);
    const [destaque, setDestaque] = useState<Destaque | null>(null);
    const [fila, setFila] = useState<Destaque[]>([]);
    const anterior = useRef(inicial);
    const proximoId = useRef(0);
    const proximoDoCiclo = useRef(0);

    // Atualiza o ranking e, quando o total de um animal sobe, poe o animal dele no inicio da fila.
    useEffect(() => {
        let vivo = true;

        const temporizador = setInterval(async () => {
            try {
                const resposta = await fetch(`/api/totais?evento=${encodeURIComponent(evento.slug)}`, { cache: 'no-store' });

                if (!resposta.ok || !vivo) {
                    return;
                }

                const novo = (await resposta.json()) as Totais;
                const antes = anterior.current;
                anterior.current = novo;
                setDados(novo);

                const novos = novo.animais
                    .filter((a) => FICHAS[a.chave] && a.total > (antes.animais.find((x) => x.chave === a.chave)?.total ?? 0))
                    .map((a): Destaque => ({ id: ++proximoId.current, chave: a.chave, motivo: 'novo' }));

                if (novos.length > 0) {
                    setFila((atual) => [...novos, ...atual]);
                }
            } catch {
                // sem conexao: segue mostrando o ultimo ranking
            }
        }, ATUALIZAR_MS);

        return () => {
            vivo = false;
            clearInterval(temporizador);
        };
    }, [evento.slug]);

    // De tempos em tempos, o proximo animal da ordem entra na fila.
    useEffect(() => {
        const temporizador = setInterval(() => {
            const chave = ORDEM[proximoDoCiclo.current++ % ORDEM.length];
            setFila((atual) => (atual.length >= 4 ? atual : [...atual, { id: ++proximoId.current, chave, motivo: 'ciclo' }]));
        }, intervaloSeg * 1000);

        return () => clearInterval(temporizador);
    }, [intervaloSeg]);

    // Um destaque por vez: quando a tela esta livre, o primeiro da fila entra; depois da duracao, sai.
    useEffect(() => {
        if (destaque === null && fila.length > 0) {
            setDestaque(fila[0]);
            setFila((atual) => atual.slice(1));
        }
    }, [destaque, fila]);

    useEffect(() => {
        if (destaque === null) {
            return;
        }

        const temporizador = setTimeout(() => setDestaque(null), DURACAO_MS);

        return () => clearTimeout(temporizador);
    }, [destaque]);

    const maximo = Math.max(1, ...dados.animais.map((a) => a.total));
    const ranking = [...dados.animais].sort((a, b) => b.total - a.total);
    // Posicao com empate: quem tem o mesmo total divide o lugar.
    const posicaoDe = (total: number) => 1 + dados.animais.filter((a) => a.total > total).length;

    const ficha = destaque ? FICHAS[destaque.chave] : null;
    const doDestaque = destaque ? dados.animais.find((a) => a.chave === destaque.chave) : null;
    const quantos = doDestaque?.total ?? 0;

    async function telaCheia() {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await document.documentElement.requestFullscreen();
            }
        } catch {
            // o navegador nao permitiu: F11 faz o mesmo
        }
    }

    return (
        <div className="telao">
            <header className="telao-topo">
                {logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={`telao-logo${logo.escuro ? ' logo-sobre-escuro' : ''}`} src={logo.src} alt="" />
                )}
                <div className="telao-titulo">
                    <p className="telao-evento">{evento.nome}</p>
                    <p className="telao-sub">Teste de Perfil DISC{evento.ativo ? '' : ' · evento desligado'}</p>
                </div>
                <p className="telao-geral">
                    <span>Total geral</span>
                    <strong key={dados.total}>{dados.total}</strong>
                </p>
            </header>

            <div className="telao-corpo">
                <ol className="telao-ranking" aria-label="Ranking dos perfis neste evento">
                    {ranking.map((animal) => (
                        <li key={animal.chave} style={{ '--cor': animal.cor } as React.CSSProperties}>
                            <span className="telao-pos">{animal.total > 0 ? `${posicaoDe(animal.total)}º` : '–'}</span>
                            {FICHAS[animal.chave] ? (
                                <svg className="telao-icone" viewBox="0 0 512 512" aria-hidden="true" fill={animal.cor}><path d={FICHAS[animal.chave].svgPath} /></svg>
                            ) : (
                                <span className="telao-icone"><IconeEquilibrado cor={animal.cor} /></span>
                            )}
                            <div className="telao-linha">
                                <span className="telao-nome">{animal.nome}</span>
                                <span className="telao-barra"><i style={{ width: `${(animal.total / maximo) * 100}%` }} /></span>
                            </div>
                            <b className="telao-num" key={animal.total}>{animal.total}</b>
                        </li>
                    ))}
                </ol>

                {qr && <div className="telao-lateral">{qr}</div>}
            </div>

            <button type="button" className="telao-tela-cheia" onClick={telaCheia}>Tela cheia</button>

            {destaque && ficha && (
                <div
                    className={`telao-destaque telao-destaque--${destaque.chave}`}
                    key={destaque.id}
                    role="status"
                    aria-live="polite"
                    style={{ '--cor': ficha.cor, '--duracao': `${DURACAO_MS}ms` } as React.CSSProperties}
                >
                    <div className="telao-cena" aria-hidden="true">
                        {destaque.chave === 'lobo' && <span className="telao-lua" />}
                        {destaque.chave === 'tubarao' && (
                            <>
                                <span className="telao-onda telao-onda--a" />
                                <span className="telao-onda telao-onda--b" />
                            </>
                        )}
                        {destaque.chave === 'aguia' && (
                            <>
                                <span className="telao-nuvem telao-nuvem--a" />
                                <span className="telao-nuvem telao-nuvem--b" />
                            </>
                        )}
                        <svg className="telao-animal" viewBox="0 0 512 512" fill={ficha.cor}><path d={ficha.svgPath} /></svg>
                        <span className="telao-som">{SOM[destaque.chave]}</span>
                    </div>

                    <div className="telao-destaque-texto">
                        <p className="telao-destaque-motivo">{destaque.motivo === 'novo' ? 'Resultado novo!' : 'Perfil'}</p>
                        <h2>{destaque.motivo === 'novo' ? `Mais ${ficha.artigo} ${ficha.nome}!` : ficha.nome}</h2>
                        <p className="telao-destaque-frase">{ficha.slogan}</p>
                        <p className="telao-destaque-num">
                            <b>{quantos}</b> {quantos === 1 ? 'pessoa tem' : 'pessoas têm'} o perfil {ficha.nome} neste evento
                            {quantos > 0 && posicaoDe(quantos) === 1 ? ' · 1º lugar' : ''}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
