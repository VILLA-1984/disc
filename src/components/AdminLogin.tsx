'use client';

import { useState } from 'react';

/** Entrada da area de gerenciamento: usuario e senha do super admin. */
export default function AdminLogin({ titulo = 'Gerenciamento', texto = 'Digite o usuário e a senha para configurar o teste.' }: { titulo?: string; texto?: string }) {
    const [usuario, setUsuario] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState<string | null>(null);
    const [entrando, setEntrando] = useState(false);

    async function entrar(evento: React.FormEvent) {
        evento.preventDefault();
        setErro(null);
        setEntrando(true);

        try {
            const resposta = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, senha }),
            });
            const dados = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                setErro(dados?.erro ?? 'Não foi possível entrar.');

                return;
            }

            window.location.reload();
        } catch {
            setErro('Sem conexão. Tente de novo.');
        } finally {
            setEntrando(false);
        }
    }

    return (
        <section className="painel admin-login" aria-labelledby="titulo-admin-login">
            <h2 id="titulo-admin-login">{titulo}</h2>
            <p>{texto}</p>

            <form onSubmit={entrar}>
                <div className="campo">
                    <label htmlFor="usuario-admin">Usuário</label>
                    <input
                        id="usuario-admin"
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                    />
                </div>

                <div className="campo">
                    <label htmlFor="senha-admin">Senha</label>
                    <input
                        id="senha-admin"
                        type="password"
                        autoComplete="current-password"
                        value={senha}
                        aria-invalid={erro ? true : undefined}
                        onChange={(e) => setSenha(e.target.value)}
                    />
                    {erro && <span className="erro-campo" role="alert">{erro}</span>}
                </div>

                <button className="botao" type="submit" disabled={entrando || usuario.trim().length === 0 || senha.length === 0}>
                    {entrando ? 'Entrando…' : 'Entrar'}
                </button>
            </form>
        </section>
    );
}
