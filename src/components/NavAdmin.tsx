'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IcConfig, IcEventos, IcInicio, IcJogo, IcManual, IcResultados, IcSair } from './IconesEquipe';

type Item = { href: string; rotulo: string; icone: React.ReactNode; novaAba?: boolean };

/** Todas as telas e links do sistema, na ordem em que a equipe costuma usar. */
const ITENS: Item[] = [
    { href: '/admin', rotulo: 'Início', icone: <IcInicio /> },
    { href: '/admin/jogo', rotulo: 'Configurações', icone: <IcConfig /> },
    { href: '/eventos', rotulo: 'Eventos', icone: <IcEventos /> },
    { href: '/whatsapp', rotulo: 'Envio de resultados', icone: <IcResultados /> },
    { href: '/', rotulo: 'Abrir o jogo', icone: <IcJogo />, novaAba: true },
    { href: '/manual', rotulo: 'Manual', icone: <IcManual />, novaAba: true },
];

/**
 * Barra de navegacao das telas da equipe (painel, configuracoes, eventos e envio de resultados): os links em formato de
 * botao, a tela atual em destaque e, no celular, um menu sanduiche. "Sair" encerra a sessao em todas elas.
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
                <Link className="nav-marca" href="/admin" aria-label="Teste de Perfil DISC: painel da equipe">
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
                        <IcSair />
                        <span>Sair</span>
                    </button>
                </nav>
            </div>
        </header>
    );
}
