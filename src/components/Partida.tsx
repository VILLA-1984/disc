'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { resolverAnimais } from '@/jogo/animais-dados.js';
import { montarMensagem, type Resumo } from '@/lib/mensagem';
import { linkWhatsapp, mascararWhatsapp, normalizarWhatsapp, problemaNoWhatsapp } from '@/lib/whatsapp';

type Fase = 'cadastro' | 'jogo' | 'envio';
type Etapas = { cima: { id: number; word: string }; baixo: { id: number; word: string } }[][];
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

export default function Partida() {
    const [fase, setFase] = useState<Fase>('cadastro');
    const [nome, setNome] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [erroNome, setErroNome] = useState<string | null>(null);
    const [erroWhatsapp, setErroWhatsapp] = useState<string | null>(null);
    const [erroGeral, setErroGeral] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [etapas, setEtapas] = useState<Etapas | null>(null);
    const [resultado, setResultado] = useState<Resultado | null>(null);

    const token = useRef('');
    const raizJogo = useRef<HTMLDivElement>(null);

    async function comecar(evento: React.FormEvent) {
        evento.preventDefault();
        setErroGeral(null);

        const nomeLimpo = nome.trim();
        const problemaNome = nomeLimpo.length < 2 ? 'Informe o seu nome.' : null;
        const problemaZap = problemaNoWhatsapp(whatsapp);
        setErroNome(problemaNome);
        setErroWhatsapp(problemaZap);

        if (problemaNome || problemaZap) {
            return;
        }

        setEnviando(true);

        try {
            const dados = await chamar<{ token: string; etapas: Etapas }>('/api/iniciar', { nome: nomeLimpo, whatsapp });
            token.current = dados.token;
            setEtapas(dados.etapas);
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
        if (fase !== 'jogo' || !etapas || !raizJogo.current) {
            return;
        }

        let cancelado = false;
        let instancia: { destruir: () => void } | null = null;

        import('../jogo/entrada.js').then(({ montar }) => {
            if (cancelado || !raizJogo.current) {
                return;
            }

            instancia = montar(raizJogo.current, {
                etapas,
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
    }, [fase, etapas, concluir]);

    return (
        <>
            {fase === 'cadastro' && (
                <section className="painel" aria-labelledby="titulo-cadastro">
                    <h2 id="titulo-cadastro">Rua das Palavras</h2>
                    <p>Antes de começar, diga quem está jogando. No fim, você recebe o seu resultado pelo WhatsApp.</p>

                    <form onSubmit={comecar} noValidate>
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

                        <p className="aviso-dados">Guardamos só o seu nome e o seu WhatsApp, para enviar o resultado. As suas escolhas no jogo não ficam gravadas.</p>

                        {erroGeral && <p className="erro-geral" role="alert">{erroGeral}</p>}

                        <button className="botao" type="submit" disabled={enviando}>
                            {enviando ? 'Preparando o jogo…' : 'Continuar'}
                        </button>
                    </form>
                </section>
            )}

            {fase === 'jogo' && (
                <>
                    <div className="cabecalho">
                        <h1>Rua das Palavras</h1>
                        <span>{nome.trim().split(/\s+/)[0]}</span>
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
}: {
    nome: string;
    whatsappInicial: string;
    resultado: Resultado;
    token: string;
}) {
    const [whatsapp, setWhatsapp] = useState(whatsappInicial);
    const [salvo, setSalvo] = useState(normalizarWhatsapp(whatsappInicial));
    const [erro, setErro] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [link, setLink] = useState<string | null>(null);
    const [ocupado, setOcupado] = useState(false);

    const mensagem = montarMensagem(nome, resultado.natural, resultado.adaptado);
    const animal = resolverAnimais(resultado.natural.percentual).principal;

    async function enviar() {
        setErro(null);
        setAviso(null);

        const numero = normalizarWhatsapp(whatsapp);

        if (!numero) {
            setErro(problemaNoWhatsapp(whatsapp));

            return;
        }

        setOcupado(true);

        try {
            // Numero corrigido no final: grava a correcao antes de abrir o WhatsApp.
            if (numero !== salvo) {
                await chamar('/api/whatsapp', { token, whatsapp: numero });
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
        try {
            await navigator.clipboard.writeText(mensagem);
            setAviso('Mensagem copiada.');
        } catch {
            setErro('Não foi possível copiar. Selecione e copie o texto manualmente.');
        }
    }

    return (
        <section className="painel" aria-labelledby="titulo-envio">
            <h2 id="titulo-envio">Enviar o resultado</h2>
            <p>Confira o número de WhatsApp de {nome.split(/\s+/)[0]}. Se estiver errado, corrija aqui antes de enviar.</p>

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
            </div>

            {link && (
                <p className="aviso-dados" style={{ marginTop: 14 }}>
                    O WhatsApp não abriu? <a href={link} target="_blank" rel="noopener noreferrer">Toque aqui para abrir</a>.
                </p>
            )}
        </section>
    );
}
