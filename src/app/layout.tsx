import type { Metadata, Viewport } from 'next';
import './globals.css';
import '../jogo/rua.css';

export const metadata: Metadata = {
    title: 'Rua das Palavras',
    description: 'Jogo de escolhas do teste comportamental DISC do SENAC-MT.',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR">
            <body>{children}</body>
        </html>
    );
}
