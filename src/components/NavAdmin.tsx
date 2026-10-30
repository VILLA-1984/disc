'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Item = { href: string; rotulo: string; icone: React.ReactNode; novaAba?: boolean };

const Icone = ({ children }: { children: React.ReactNode }) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

/** Todas as telas e links do sistema, na ordem em que a equipe costuma usar. */
const ITENS: Item[] = [
    {
        href: '/admin',
        rotulo: 'Gerenciamento',
        icone: <Icone><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></Icone>,
    },
    {
        href: '/eventos',
        rotulo: 'Eventos',
        icone: <Icone><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Icone>,
    },
    {
        href: '/whatsapp',
        rotulo: 'Envio de resultados',
        icone: <Icone><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></Icone>,
    },
    {
        href: '/',
        rotulo: 'Abrir o jogo',
        novaAba: true,
        icone: <Icone><path d="M8 5l11 7-11 7z" /></Icone>,
    },
    {
        href: '/manual',
        rotulo: 'Manual',
        novaAba: true,
        icone: <Icone><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h10" /></Icone>,
    },
];

/**
 * Barra de navegacao das telas da equipe (gerenciamento, eventos e envio de resultados): os links em formato de botao,
 * a tela atual em destaque e, no celular, um menu sanduiche. "Sair" encerra a sessao nas tres telas.
 */
export default function NavAdmin() {
    const caminho = usePathname();
    const [aberto, setAberto] = useState(false);
    const raiz = useRef<HTMLElement>(null);

    // Trocar de tela fecha o menu.
    useEffect(() => {
        setAberto(false);
    }, [caminho]);

    // Com o menu aberto: Esc ou um toque fora dele fecham.
    useEffect(() => {
        if (!aberto) {
            return;
        }

        const aoTeclar = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') {
                setAberto(false);
            }
        };
        const aoClicar = (evento: MouseEvent) => {
            if (raiz.current && !raiz.current.contains(evento.target as Node)) {
                setAberto(false);
            }
        };

        document.addEventListener('keydown', aoTeclar);
        document.addEventListener('mousedown', aoClicar);

        return () => {
            document.removeEventListener('keydown', aoTeclar);
            document.removeEventListener('mousedown', aoClicar);
        };
    }, [aberto]);

    async function sair() {
        await fetch('/api/admin/sair', { method: 'POST' }).catch(() => undefined);
        window.location.reload();
    }

    return (
        <header className="nav-admin" ref={raiz}>
            <div className="nav-admin-barra">
                <Link className="nav-marca" href="/admin" aria-label="Teste de Perfil DISC: área da equipe">
                    <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
                        <rect width="64" height="64" rx="14" fill="#fff" fillOpacity="0.12" />
                        <rect x="10" y="10" width="20" height="20" rx="4" fill="#e34948" />
                        <rect x="34" y="10" width="20" height="20" rx="4" fill="#eda100" />
                        <rect x="10" y="34" width="20" height="20" rx="4" fill="#008300" />
                        <rect x="34" y="34" width="20" height="20" rx="4" fill="#2a78d6" />
                    </svg>
                    <span>Teste de Perfil DISC <small>Equipe</small></span>
                </Link>

                <button
                    type="button"
                    className={`nav-menu${aberto ? ' aberto' : ''}`}
                    aria-expanded={aberto}
                    aria-controls="nav-links"
                    aria-label={aberto ? 'Fechar o menu' : 'Abrir o menu'}
                    onClick={() => setAberto((atual) => !atual)}
                >
                    <span aria-hidden="true" />
                    <span aria-hidden="true" />
                    <span aria-hidden="true" />
                </button>

                <nav id="nav-links" className={`nav-links${aberto ? ' aberto' : ''}`} aria-label="Menu da equipe">
                    {ITENS.map((item) => {
                        const atual = !item.novaAba && caminho === item.href;
                        const classe = `nav-botao${atual ? ' atual' : ''}`;

                        return item.novaAba ? (
                            <a className={classe} href={item.href} target="_blank" rel="noopener noreferrer" key={item.href}>
                                {item.icone}
                                <span>{item.rotulo}</span>
                            </a>
                        ) : (
                            <Link className={classe} href={item.href} aria-current={atual ? 'page' : undefined} key={item.href}>
                                {item.icone}
                                <span>{item.rotulo}</span>
                            </Link>
                        );
                    })}

                    <button type="button" className="nav-botao nav-botao--sair" onClick={sair}>
                        <Icone><path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" /></Icone>
                        <span>Sair</span>
                    </button>
                </nav>
            </div>
        </header>
    );
}
