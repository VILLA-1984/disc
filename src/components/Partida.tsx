'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { resolverAnimais } from '@/jogo/animais-dados.js';
import { montarMensagem, type Resumo } from '@/lib/mensagem';
import { linkWhatsapp, mascararWhatsapp, normalizarWhatsapp, problemaNoWhatsapp } from '@/lib/whatsapp';

type Fase = 'cadastro' | 'jogo' | 'envio';
type Etapas = { cima: { id: number; word: string }; baixo: { id: number; word: string } }[][];
type Ciclo = { escolher: number; etapas: number[][][]; palavras: Record<number, string> };
type Resultado = { natural: Resumo; adaptado: Resumo };

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

/** Copia o texto; em endereco http (rede local do estande) o navegador bloqueia a area de transferencia, entao ha um plano B. */
async function copiarTexto(texto: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(texto);

        return true;
    } catch {
        const campo = document.createElement('textarea');
        campo.value = texto;
        campo.setAttribute('readonly', '');
        campo.style.position = 'fixed';
        campo.style.opacity = '0';
        document.body.appendChild(campo);
        campo.select();

        try {
            return document.execCommand('copy');
        } catch {
            return false;
        } finally {
            campo.remove();
        }
    }
}

export default function Partida({ qr }: { qr?: React.ReactNode }) {
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
    }, [fase, etapas, ciclo, concluir]);

    return (
        <>
            {fase === 'cadastro' && (
                <div className="abertura">
                <section className="painel" aria-labelledby="titulo-cadastro">
                    <h2 id="titulo-cadastro">Rua das Palavras</h2>
                    <p>Você descobre o seu animal no fim do jogo. Se quiser, também pode receber o resultado pelo WhatsApp: é opcional.</p>

                    <form onSubmit={comecar} noValidate>
                        <fieldset className="escolha-recebimento">
                            <legend>Quer receber o seu resultado pelo WhatsApp?</legend>

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
                                    ? 'Guardamos só o seu nome e o seu WhatsApp, para enviar o resultado. As suas escolhas no jogo não ficam gravadas.'
                                    : 'Sem cadastro: não guardamos nome nem telefone, e as suas escolhas no jogo também não ficam gravadas. No fim você ainda pode pedir o resultado pelo WhatsApp.'}
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
                </div>
            )}

            {fase === 'jogo' && (
                <>
                    <div className="cabecalho">
                        <h1>Rua das Palavras</h1>
                        <span>{anonimo ? '' : nome.trim().split(/\s+/)[0]}</span>
                    </div>
                    <div className="rua-app" ref={raizJogo} />
                </>
            )}

            {fase === 'envio' && resultado && (
                <EnvioWhatsApp
                    nome={nome.trim()}
                    whatsappInicial={whatsapp}
                    resultado={resultado}
                    token={token.current}
                    anonimo={anonimo}
                />
            )}
        </>
    );
}

function EnvioWhatsApp({
    nome,
    whatsappInicial,
    resultado,
    token,
    anonimo,
}: {
    nome: string;
    whatsappInicial: string;
    resultado: Resultado;
    token: string;
    anonimo: boolean;
}) {
    const [whatsapp, setWhatsapp] = useState(whatsappInicial);
    const [salvo, setSalvo] = useState(normalizarWhatsapp(whatsappInicial));
    const [erro, setErro] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [link, setLink] = useState<string | null>(null);
    const [ocupado, setOcupado] = useState(false);
    // Quem jogou sem cadastro pode pedir o resultado agora: informa o nome aqui, e o cadastro nasce no envio.
    const [nomeInformado, setNomeInformado] = useState(nome);
    const [cadastrado, setCadastrado] = useState(!anonimo);
    const [tokenAtual, setTokenAtual] = useState(token);

    const mensagem = montarMensagem(nomeInformado, resultado.natural, resultado.adaptado);
    const animal = resolverAnimais(resultado.natural.percentual).principal;

    async function enviar() {
        setErro(null);
        setAviso(null);

        const numero = normalizarWhatsapp(whatsapp);

        if (!cadastrado && nomeInformado.trim().length < 2) {
            setErro('Informe o seu nome para receber o resultado.');

            return;
        }

        if (!numero) {
            setErro(problemaNoWhatsapp(whatsapp));

            return;
        }

        setOcupado(true);

        try {
            if (!cadastrado) {
                // Primeiro pedido de quem jogou sem cadastro: cria o cadastro e troca o token pelo do cadastro novo.
                const novo = await chamar<{ token: string }>('/api/whatsapp', { token: tokenAtual, whatsapp: numero, nome: nomeInformado.trim() });
                setTokenAtual(novo.token);
                setCadastrado(true);
                setSalvo(numero);
            } else if (numero !== salvo) {
                // Numero corrigido no final: grava a correcao antes de abrir o WhatsApp.
                await chamar('/api/whatsapp', { token: tokenAtual, whatsapp: numero });
                setSalvo(numero);
                setAviso('Número atualizado.');
            }

            const url = linkWhatsapp(numero, mensagem);
            setLink(url);

            // Se o navegador bloquear a nova aba, o link visivel abaixo faz o mesmo.
            window.open(url, '_blank', 'noopener');
        } catch (e) {
            setErro((e as Error).message);
        } finally {
            setOcupado(false);
        }
    }

    async function copiar() {
        if (await copiarTexto(mensagem)) {
            setErro(null);
            setAviso('Mensagem copiada.');
        } else {
            setErro('Não foi possível copiar. Use o botão de enviar pelo WhatsApp.');
        }
    }

    return (
        <section className="painel" aria-labelledby="titulo-envio">
            <h2 id="titulo-envio">{anonimo && !cadastrado ? 'Quer receber o resultado?' : 'Enviar o resultado'}</h2>
            {anonimo && !cadastrado ? (
                <p>
                    Você já viu o seu animal na tela. Se quiser receber o resultado pelo WhatsApp, informe o seu nome e o seu número.
                    É opcional: se preferir, é só seguir para a próxima pessoa, e nada seu fica guardado.
                </p>
            ) : (
                <p>Confira o número de WhatsApp de {nomeInformado.trim().split(/\s+/)[0]}. Se estiver errado, corrija aqui antes de enviar.</p>
            )}

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

            {anonimo && !cadastrado && (
                <div className="campo">
                    <label htmlFor="nome-final">Nome</label>
                    <input
                        id="nome-final"
                        autoComplete="name"
                        value={nomeInformado}
                        maxLength={80}
                        onChange={(e) => { setNomeInformado(e.target.value); setErro(null); }}
                    />
                </div>
            )}

            <div className="campo">
                <label htmlFor="whatsapp-final">WhatsApp</label>
                <input
                    id="whatsapp-final"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="(65) 99999-9999"
                    value={whatsapp}
                    aria-invalid={erro ? true : undefined}
                    onChange={(e) => {
                        setWhatsapp(mascararWhatsapp(e.target.value));
                        setErro(null);
                        setAviso(null);
                    }}
                />
            </div>

            {erro && <p className="erro-geral" role="alert">{erro}</p>}
            {aviso && <p className="ok-geral" role="status">{aviso}</p>}

            <div className="botoes">
                <button className="botao botao--whatsapp" type="button" onClick={enviar} disabled={ocupado}>
                    {ocupado ? 'Abrindo…' : 'Enviar pelo WhatsApp'}
                </button>
                <button className="botao botao--secundario" type="button" onClick={copiar}>
                    Copiar a mensagem
                </button>
                <button className="botao botao--discreto" type="button" onClick={() => window.location.assign('/')}>
                    {anonimo && !cadastrado ? 'Não, obrigado · próxima pessoa' : 'Próxima pessoa'}
                </button>
            </div>

            {link && (
                <p className="aviso-dados" style={{ marginTop: 14 }}>
                    O WhatsApp não abriu? <a href={link} target="_blank" rel="noopener noreferrer">Toque aqui para abrir</a>.
                </p>
            )}
        </section>
    );
}
