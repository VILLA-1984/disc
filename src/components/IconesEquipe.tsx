/**
 * Icones das telas da equipe (navbar e painel). Sem estado, entao servem a componentes do servidor e do navegador.
 * Tracos simples, na cor do texto (currentColor).
 */

type Props = { tamanho?: number };

function Base({ tamanho = 18, children }: Props & { children: React.ReactNode }) {
    return (
        <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {children}
        </svg>
    );
}

export const IcInicio = (p: Props) => (
    <Base {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></Base>
);

export const IcConfig = (p: Props) => (
    <Base {...p}><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></Base>
);

export const IcEventos = (p: Props) => (
    <Base {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Base>
);

export const IcResultados = (p: Props) => (
    <Base {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></Base>
);

export const IcJogo = (p: Props) => (
    <Base {...p}><path d="M8 5l11 7-11 7z" /></Base>
);

export const IcManual = (p: Props) => (
    <Base {...p}><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h10" /></Base>
);

export const IcTelao = (p: Props) => (
    <Base {...p}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></Base>
);

export const IcSair = (p: Props) => (
    <Base {...p}><path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" /></Base>
);
