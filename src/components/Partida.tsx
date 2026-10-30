'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { resolverAnimais } from '@/jogo/animais-dados.js';
import { textoDe, type Configuracao } from '@/lib/configuracao';
import type { LogoEmUso } from '@/lib/logos';
import type { Resumo } from '@/lib/mensagem';
import { mascararWhatsapp, normalizarWhatsapp, problemaNoWhatsapp } from '@/lib/whatsapp';
import type { Totais } from '@/server/totais';
import TotaisInicio from './TotaisInicio';

type Fase = 'cadastro' | 'jogo' | 'envio';
type Etapas = { cima: { id: number; word: string }; baixo: { id: number; word: string } }[][];
type Ciclo = { escolher: number; etapas: number[][][]; palavras: Record<number, string> };
type Resultado = { natural: Resumo; adaptado: Resumo; envio?: { idExibicao: string | null; restanteMs: number | null } | null };

async function chamar<T>(rota: string, corpo: unknown): Promise<T> {
    const resposta = await fetch(rota, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
    });
    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(dados?.erro ?? 'Não foi possível concluir. Tente de novo.');
    }

    return dados as T;
}

/** Logo escolhida na area de gerenciamento. Logo clara (para fundo escuro) vem sobre uma faixa azul-marinho. */
function Logo({ logo, alt, className }: { logo: LogoEmUso | null | undefined; alt: string; className: string }) {
    if (!logo) {
        return null;
    }

    // eslint-disable-next-line @next/next/no-img-element
    return <img className={`${className}${logo.escuro ? ' logo-sobre-escuro' : ''}`} src={logo.src} alt={alt} />;
}

export default function Partida({ qr, config, logo, totaisInicio }: { qr?: React.ReactNode; config: Configuracao; logo?: LogoEmUso | null; totaisInicio?: Totais | null }) {
    // Titulos e explicacoes editaveis na area de gerenciamento (/admin).
    const titulo = textoDe(config.textos, 'titulo_geral');
    const introducao = textoDe(config.textos, 'cadastro_intro');
    const perguntaReceber = textoDe(config.textos, 'cadastro_pergunta');

    const [fase, setFase] = useState<Fase>('cadastro');
    const [nome, setNome] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [erroNome, setErroNome] = useState<string | null>(null);
    const [erroWhatsapp, setErroWhatsapp] = useState<string | null>(null);
    const [erroGeral, setErroGeral] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [etapas, setEtapas] = useState<Etapas | null>(null);
    const [ciclo, setCiclo] = useState<Ciclo | null>(null);
    const [resultado, setResultado] = useState<Resultado | null>(null);
    // Receber o resultado pelo WhatsApp e opcional: null = ainda nao escolheu, true = informa nome e WhatsApp,
    // false = so quer jogar (nada pessoal e pedido nem guardado).
    const [querReceber, setQuerReceber] = useState<boolean | null>(null);
    const [anonimo, setAnonimo] = useState(false);

    const token = useRef('');
    const raizJogo = useRef<HTMLDivElement>(null);

    async function comecar(evento: React.FormEvent) {
        evento.preventDefault();
        setErroGeral(null);

        if (querReceber === null) {
            setErroGeral('Escolha se quer receber o resultado pelo WhatsApp.');

            return;
        }

        const nomeLimpo = nome.trim();

        if (querReceber) {
            const problemaNome = nomeLimpo.length < 2 ? 'Informe o seu nome.' : null;
            const problemaZap = problemaNoWhatsapp(whatsapp);
            setErroNome(problemaNome);
            setErroWhatsapp(problemaZap);

            if (problemaNome || problemaZap) {
                return;
            }
        }

        setEnviando(true);

        try {
            const dados = await chamar<{ token: string; etapas?: Etapas; ciclo?: Ciclo }>(
                '/api/iniciar',
                querReceber ? { nome: nomeLimpo, whatsapp } : { anonimo: true },
            );
            setAnonimo(!querReceber);
            token.current = dados.token;
            setEtapas(dados.etapas ?? null);
            setCiclo(dados.ciclo ?? null);
            setFase('jogo');
        } catch (erro) {
            setErroGeral((erro as Error).message);
        } finally {
            setEnviando(false);
        }
    }

    const concluir = useCallback(
        (escolhas: unknown[]) => chamar<Resultado>('/api/concluir', { token: token.current, escolhas }),
        [],
    );

    // O jogo (three.js) desenha e controla tudo no navegador; so e baixado quando a fase do jogo comeca.
    useEffect(() => {
        if (fase !== 'jogo' || !(etapas || ciclo) || !raizJogo.current) {
            return;
        }

        let cancelado = false;
        let instancia: { destruir: () => void } | null = null;

        import('../jogo/entrada.js').then(({ montar }) => {
            if (cancelado || !raizJogo.current) {
                return;
            }

            instancia = montar(raizJogo.current, {
                etapas: etapas ?? undefined,
                ciclo,
                config,
                // O painel de totais so e oferecido ao jogo quando a area de gerenciamento o deixa visivel.
                totais: config.mostrarTotais ? () => fetch('/api/totais', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)) : undefined,
                concluir,
                aoFinalizar: (resposta: Resultado) => {
                    setResultado(resposta);
                    setFase('envio');
                },
            });
        });

        return () => {
            cancelado = true;
            instancia?.destruir();
        };
    }, [fase, etapas, ciclo, concluir, config]);

    return (
        <>
            {fase === 'cadastro' && (
                <div className="abertura">
                <Logo logo={logo} alt={titulo} className="logo-abertura" />
                <section className="painel" aria-labelledby="titulo-cadastro">
                    <h2 id="titulo-cadastro">{titulo}</h2>
                    {introducao && <p>{introducao}</p>}

                    <form onSubmit={comecar} noValidate>
                        <fieldset className="escolha-recebimento">
                            <legend>{perguntaReceber}</legend>

                            <label className={querReceber === true ? 'opcao marcada' : 'opcao'}>
                                <input
                                    id="receber-sim"
                                    type="radio"
                                    name="receber"
                                    checked={querReceber === true}
                                    onChange={() => { setQuerReceber(true); setErroGeral(null); }}
                                />
                                <span>
                                    <strong>Sim, quero receber</strong>
                                    <small>Informe o seu nome e o seu WhatsApp. O resultado chega no fim do jogo.</small>
                                </span>
                            </label>

                            <label className={querReceber === false ? 'opcao marcada' : 'opcao'}>
                                <input
                                    id="receber-nao"
                                    type="radio"
                                    name="receber"
                                    checked={querReceber === false}
                                    onChange={() => { setQuerReceber(false); setErroGeral(null); setErroNome(null); setErroWhatsapp(null); }}
                                />
                                <span>
                                    <strong>Não, só quero jogar</strong>
                                    <small>Não pedimos nem guardamos nome ou telefone. Você vê o resultado na tela.</small>
                                </span>
                            </label>
                        </fieldset>

                        {querReceber === true && (
                            <>
                                <div className="campo">
                                    <label htmlFor="nome">Nome</label>
                                    <input
                                        id="nome"
                                        name="nome"
                                        autoComplete="name"
                                        value={nome}
                                        maxLength={80}
                                        aria-invalid={erroNome ? true : undefined}
                                        onChange={(e) => setNome(e.target.value)}
                                    />
                                    {erroNome && <span className="erro-campo" role="alert">{erroNome}</span>}
                                </div>

                                <div className="campo">
                                    <label htmlFor="whatsapp">WhatsApp</label>
                                    <input
                                        id="whatsapp"
                                        name="whatsapp"
                                        type="tel"
                                        inputMode="numeric"
                                        autoComplete="tel-national"
                                        placeholder="(65) 99999-9999"
                                        value={whatsapp}
                                        aria-invalid={erroWhatsapp ? true : undefined}
                                        onChange={(e) => setWhatsapp(mascararWhatsapp(e.target.value))}
                                    />
                                    {erroWhatsapp ? <span className="erro-campo" role="alert">{erroWhatsapp}</span> : <small>DDD + número com 9 dígitos. Você poderá corrigir no final.</small>}
                                </div>
                            </>
                        )}

                        {querReceber !== null && (
                            <p className="aviso-dados">
                                {querReceber
                                    ? 'Guardamos só o seu nome e o seu WhatsApp, para enviar o resultado. As suas escolhas no jogo não ficam gravadas. O painel do jogo conta só quantas pessoas jogaram e quantas deram cada animal, sem identificar ninguém.'
                                    : 'Sem cadastro: não guardamos nome nem telefone, e as suas escolhas no jogo também não ficam gravadas. No fim você ainda pode pedir o resultado pelo WhatsApp. O painel do jogo conta só quantas pessoas jogaram e quantas deram cada animal, sem identificar ninguém.'}
                            </p>
                        )}

                        {erroGeral && <p className="erro-geral" role="alert">{erroGeral}</p>}

                        <button className="botao" type="submit" disabled={enviando || querReceber === null}>
                            {enviando ? 'Preparando o jogo…' : (querReceber === false ? 'Começar a jogar' : 'Continuar')}
                        </button>
                    </form>

                    <p className="link-manual">
                        Primeira vez? <Link href="/manual">Veja o manual de uso</Link>.
                    </p>
                </section>
                {qr}
                {totaisInicio && <TotaisInicio inicial={totaisInicio} />}
                </div>
            )}

            {fase === 'jogo' && (
                <>
                    <div className="cabecalho">
                        <Logo logo={logo} alt="" className="logo-cabecalho" />
                        <h1>{titulo}</h1>
                        <span>{anonimo ? '' : nome.trim().split(/\s+/)[0]}</span>
                    </div>
                    <div className="rua-app" ref={raizJogo} />
                </>
            )}

            {fase === 'envio' && resultado && (
                <FimDoJogo nome={nome.trim()} whatsapp={whatsapp} resultado={resultado} anonimo={anonimo} />
            )}
        </>
    );
}

/** Numero do cadastro sem mostrar tudo: so o DDD e os quatro ultimos digitos. */
function numeroEscondido(whatsapp: string): string {
    const digitos = normalizarWhatsapp(whatsapp);

    return digitos ? `(${digitos.slice(0, 2)}) 9••••-${digitos.slice(7)}` : '';
}

function tempoRestante(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));

    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Fim do jogo: o animal e o que acontece com o resultado. Quem se cadastrou recebe o resultado pela equipe (tela
 * /whatsapp); quem jogou sem cadastro ve um ID para informar a equipe, e o resultado e apagado em poucos minutos.
 */
function FimDoJogo({ nome, whatsapp, resultado, anonimo }: { nome: string; whatsapp: string; resultado: Resultado; anonimo: boolean }) {
    const animal = resolverAnimais(resultado.natural.percentual).principal;
    const envio = resultado.envio ?? null;
    const [fim] = useState(() => (envio?.restanteMs != null ? Date.now() + envio.restanteMs : null));
    const [agora, setAgora] = useState(() => Date.now());

    useEffect(() => {
        if (fim === null) {
            return;
        }

        const relogio = setInterval(() => setAgora(Date.now()), 1000);

        return () => clearInterval(relogio);
    }, [fim]);

    const restante = fim === null ? null : Math.max(0, fim - agora);

    return (
        <section className="painel" aria-labelledby="titulo-envio">
            <h2 id="titulo-envio">{anonimo ? 'Quer receber o resultado?' : 'Resultado pronto'}</h2>

            {animal ? (
                <div className="resumo-animal">
                    <strong>{animal.nome}</strong>
                    <span>{animal.slogan}</span>
                </div>
            ) : (
                <div className="resumo-animal">
                    <strong>Perfil equilibrado</strong>
                    <span>Os quatro animais aparecem em proporção parecida.</span>
                </div>
            )}

            {anonimo ? (
                envio?.idExibicao ? (
                    <div className="id-resultado">
                        <p>
                            Se quiser receber o resultado pelo WhatsApp, informe este ID à equipe
                            {restante !== null && restante > 0 ? ' agora' : ''}. Se não quiser, é só seguir: o resultado é apagado sozinho e não tem nome nem telefone.
                        </p>
                        <p className="id-resultado-codigo" aria-label={`Seu ID é ${envio.idExibicao.split('').join(' ')}`}>{envio.idExibicao}</p>
                        <p className="id-resultado-prazo" role="timer">
                            {restante === null
                                ? ''
                                : restante > 0
                                    ? <>O resultado é apagado em <b>{tempoRestante(restante)}</b>.</>
                                    : 'O tempo acabou: o resultado foi apagado.'}
                        </p>
                    </div>
                ) : (
                    <p className="aviso-dados">Não foi possível gerar o ID agora, então o envio do resultado não está disponível. Nada seu foi guardado.</p>
                )
            ) : envio ? (
                <p>
                    Obrigado, {nome.split(/\s+/)[0]}! A equipe vai enviar o seu resultado para o WhatsApp {numeroEscondido(whatsapp)}.
                </p>
            ) : (
                <p className="aviso-dados">Não foi possível guardar o seu resultado para o envio. Avise a equipe.</p>
            )}

            <div className="botoes">
                <button className="botao botao--discreto" type="button" onClick={() => window.location.assign('/')}>
                    Próxima pessoa
                </button>
            </div>
        </section>
    );
}
