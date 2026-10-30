'use client';

import { useRef, useState } from 'react';

type Mensagem = { tipo: 'ok' | 'erro'; texto: string };

const MAX_BYTES = 1024 * 1024;
const ACEITOS = 'image/png,image/jpeg,image/webp';

/** Gerenciamento da logo: enviar, trocar e remover. Cada acao vale na hora (nao depende do botao Salvar da tela). */
export default function AdminLogo({ versaoInicial }: { versaoInicial: number | null }) {
    const [versao, setVersao] = useState<number | null>(versaoInicial);
    const [ocupado, setOcupado] = useState(false);
    const [mensagem, setMensagem] = useState<Mensagem | null>(null);
    const campo = useRef<HTMLInputElement>(null);

    async function enviar(arquivo: File) {
        // Confere o tamanho antes de subir; o servidor confere tudo de novo (tamanho e formato pelos bytes).
        if (arquivo.size > MAX_BYTES) {
            setMensagem({ tipo: 'erro', texto: 'A logo passa de 1 MB. Reduza o tamanho da imagem e escolha de novo.' });

            return;
        }

        setOcupado(true);
        setMensagem(null);

        try {
            const formulario = new FormData();
            formulario.append('arquivo', arquivo);
            const resposta = await fetch('/api/admin/logo', { method: 'POST', body: formulario });
            const dados = await resposta.json().catch(() => ({}));

            if (resposta.status === 401) {
                setMensagem({ tipo: 'erro', texto: 'Sua sessão terminou. Recarregue a página e entre de novo.' });
            } else if (!resposta.ok) {
                setMensagem({ tipo: 'erro', texto: dados?.erro ?? 'Não foi possível enviar a logo.' });
            } else {
                setVersao(dados.versao as number);
                setMensagem({ tipo: 'ok', texto: 'Logo atualizada. Já aparece para quem abrir o jogo.' });
            }
        } catch {
            setMensagem({ tipo: 'erro', texto: 'Sem conexão. Tente de novo.' });
        } finally {
            setOcupado(false);

            if (campo.current) {
                campo.current.value = ''; // permite escolher o mesmo arquivo de novo
            }
        }
    }

    async function remover() {
        if (!window.confirm('Remover a logo? A tela inicial volta a ficar sem imagem.')) {
            return;
        }

        setOcupado(true);
        setMensagem(null);

        try {
            const resposta = await fetch('/api/admin/logo', { method: 'DELETE' });
            const dados = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                setMensagem({ tipo: 'erro', texto: resposta.status === 401 ? 'Sua sessão terminou. Recarregue a página e entre de novo.' : (dados?.erro ?? 'Não foi possível remover a logo.') });
            } else {
                setVersao(null);
                setMensagem({ tipo: 'ok', texto: 'Logo removida.' });
            }
        } catch {
            setMensagem({ tipo: 'erro', texto: 'Sem conexão. Tente de novo.' });
        } finally {
            setOcupado(false);
        }
    }

    return (
        <section className="admin-secao" aria-labelledby="secao-logo">
            <h2 id="secao-logo">Logo</h2>
            <p>Aparece no alto da tela inicial e, menor, no cabeçalho do jogo. Use PNG, JPEG ou WebP de até 1 MB; fundo transparente (PNG ou WebP) fica melhor.</p>

            <div className="admin-logo">
                <div className="admin-logo-previa">
                    {versao ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/logo?v=${versao}`} alt="Logo atual" />
                    ) : (
                        <span>Nenhuma logo enviada</span>
                    )}
                </div>

                <div className="admin-logo-acoes">
                    <input ref={campo} id="arquivo-logo" type="file" accept={ACEITOS} hidden onChange={(e) => { const arquivo = e.target.files?.[0]; if (arquivo) { void enviar(arquivo); } }} />
                    <button type="button" className="botao" disabled={ocupado} onClick={() => campo.current?.click()}>
                        {ocupado ? 'Enviando…' : versao ? 'Trocar a logo' : 'Enviar a logo'}
                    </button>
                    {versao && (
                        <button type="button" className="admin-link" disabled={ocupado} onClick={remover}>Remover a logo</button>
                    )}
                </div>
            </div>

            {mensagem && (
                <p className={`admin-aviso-logo ${mensagem.tipo}`} role={mensagem.tipo === 'erro' ? 'alert' : 'status'}>{mensagem.texto}</p>
            )}
            <p className="admin-nota-logo">“Voltar ao padrão” não remove a logo.</p>
        </section>
    );
}
