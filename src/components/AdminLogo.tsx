'use client';

import { useRef, useState } from 'react';
import { ESCOLHA_ENVIADA, ESCOLHA_NENHUMA, LOGOS_FIXAS, enderecoDaEnviada, enderecoDaFixa } from '@/lib/logos';

type Mensagem = { tipo: 'ok' | 'erro'; texto: string };

const MAX_BYTES = 1024 * 1024;
const ACEITOS = 'image/png,image/jpeg,image/webp';
const SESSAO_ACABOU = 'Sua sessão terminou. Recarregue a página e entre de novo.';

type Opcao = { id: string; nome: string; descricao: string; src: string | null; escuro?: boolean };

/**
 * Gerenciamento da logo: escolher entre as logos fixas, a enviada ou nenhuma, e enviar uma imagem nova. Cada acao vale
 * na hora (nao depende do botao Salvar da tela).
 */
export default function AdminLogo({ escolhaInicial, versaoInicial }: { escolhaInicial: string; versaoInicial: number | null }) {
    const [escolha, setEscolha] = useState(escolhaInicial);
    const [versao, setVersao] = useState<number | null>(versaoInicial);
    const [ocupado, setOcupado] = useState(false);
    const [mensagem, setMensagem] = useState<Mensagem | null>(null);
    const campo = useRef<HTMLInputElement>(null);

    const opcoes: Opcao[] = [
        ...LOGOS_FIXAS.map((l) => ({ id: l.id, nome: l.nome, descricao: l.descricao, src: enderecoDaFixa(l), escuro: l.fundoEscuro })),
        ...(versao ? [{ id: ESCOLHA_ENVIADA, nome: 'Enviada por você', descricao: 'A última imagem que você enviou', src: enderecoDaEnviada(versao) }] : []),
        { id: ESCOLHA_NENHUMA, nome: 'Sem logo', descricao: 'A tela inicial fica sem imagem', src: null },
    ];

    async function chamar(metodo: 'PUT' | 'POST' | 'DELETE', corpo?: BodyInit, cabecalhos?: HeadersInit) {
        setOcupado(true);
        setMensagem(null);

        try {
            const resposta = await fetch('/api/admin/logo', { method: metodo, body: corpo, headers: cabecalhos });
            const dados = await resposta.json().catch(() => ({}));

            if (resposta.status === 401) {
                setMensagem({ tipo: 'erro', texto: SESSAO_ACABOU });

                return null;
            }

            if (!resposta.ok) {
                setMensagem({ tipo: 'erro', texto: dados?.erro ?? 'Não foi possível concluir.' });

                return null;
            }

            return dados as Record<string, unknown>;
        } catch {
            setMensagem({ tipo: 'erro', texto: 'Sem conexão. Tente de novo.' });

            return null;
        } finally {
            setOcupado(false);
        }
    }

    async function escolher(id: string) {
        if (id === escolha || ocupado) {
            return;
        }

        const dados = await chamar('PUT', JSON.stringify({ escolha: id }), { 'Content-Type': 'application/json' });

        if (dados) {
            setEscolha(id);
            setMensagem({ tipo: 'ok', texto: 'Logo atualizada. Já vale para quem abrir o jogo.' });
        }
    }

    async function enviar(arquivo: File) {
        // Confere o tamanho antes de subir; o servidor confere tudo de novo (tamanho e formato pelos bytes).
        if (arquivo.size > MAX_BYTES) {
            setMensagem({ tipo: 'erro', texto: 'A logo passa de 1 MB. Reduza o tamanho da imagem e escolha de novo.' });

            return;
        }

        const formulario = new FormData();
        formulario.append('arquivo', arquivo);
        const dados = await chamar('POST', formulario);

        if (campo.current) {
            campo.current.value = ''; // permite escolher o mesmo arquivo de novo
        }

        if (dados) {
            setVersao(dados.versao as number);
            setEscolha(ESCOLHA_ENVIADA);
            setMensagem({ tipo: 'ok', texto: 'Imagem enviada e já em uso. Já vale para quem abrir o jogo.' });
        }
    }

    async function removerEnviada() {
        if (!window.confirm('Apagar a imagem que você enviou? Se ela estiver em uso, a tela volta para a logo genérica.')) {
            return;
        }

        const dados = await chamar('DELETE');

        if (dados) {
            setVersao(null);

            if (escolha === ESCOLHA_ENVIADA) {
                setEscolha('generica');
            }

            setMensagem({ tipo: 'ok', texto: 'Imagem apagada.' });
        }
    }

    return (
        <section className="admin-secao" aria-labelledby="secao-logo">
            <h2 id="secao-logo">Logo</h2>
            <p>Escolha a logo que aparece no alto da tela inicial e, menor, no cabeçalho do jogo. Vale na hora, sem precisar salvar.</p>

            <div className="admin-grade admin-logos" role="radiogroup" aria-labelledby="secao-logo">
                {opcoes.map((opcao) => (
                    <label className={`admin-opcao admin-logo-opcao${escolha === opcao.id ? ' marcada' : ''}${ocupado ? ' desabilitada' : ''}`} key={opcao.id}>
                        <input type="radio" name="logo" checked={escolha === opcao.id} disabled={ocupado} onChange={() => escolher(opcao.id)} />
                        <span>
                            <span className={`admin-logo-previa${opcao.escuro ? ' escuro' : ''}`}>
                                {opcao.src ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={opcao.src} alt="" />
                                ) : (
                                    <em aria-hidden="true">sem imagem</em>
                                )}
                            </span>
                            <strong>{opcao.nome}</strong>
                            <small>{opcao.descricao}</small>
                        </span>
                    </label>
                ))}
            </div>

            <div className="admin-logo-acoes">
                <input ref={campo} id="arquivo-logo" type="file" accept={ACEITOS} hidden onChange={(e) => { const arquivo = e.target.files?.[0]; if (arquivo) { void enviar(arquivo); } }} />
                <button type="button" className="botao" disabled={ocupado} onClick={() => campo.current?.click()}>
                    {ocupado ? 'Aguarde…' : versao ? 'Enviar outra imagem' : 'Enviar uma nova logo'}
                </button>
                {versao && (
                    <button type="button" className="admin-link" disabled={ocupado} onClick={removerEnviada}>Apagar a imagem enviada</button>
                )}
            </div>
            <p className="admin-nota-logo">PNG, JPEG ou WebP de até 1 MB; fundo transparente (PNG ou WebP) fica melhor. A imagem enviada passa a ser a logo em uso. “Voltar ao padrão” não mexe na logo.</p>

            {mensagem && (
                <p className={`admin-aviso-logo ${mensagem.tipo}`} role={mensagem.tipo === 'erro' ? 'alert' : 'status'}>{mensagem.texto}</p>
            )}
        </section>
    );
}
