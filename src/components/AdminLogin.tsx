'use client';

import { useState } from 'react';

/** Entrada da area de gerenciamento: uma senha unica (RUA_ADMIN_SENHA). */
export default function AdminLogin() {
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
                body: JSON.stringify({ senha }),
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
            <h2 id="titulo-admin-login">Gerenciamento</h2>
            <p>Digite a senha para configurar o teste.</p>

            <form onSubmit={entrar}>
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

                <button className="botao" type="submit" disabled={entrando || senha.length === 0}>
                    {entrando ? 'Entrando…' : 'Entrar'}
                </button>
            </form>
        </section>
    );
}
