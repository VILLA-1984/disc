import type { Metadata, Viewport } from 'next';
import './globals.css';
import '../jogo/rua.css';

export const metadata: Metadata = {
    title: 'Teste de Perfil DISC',
    description: 'Teste de perfil comportamental DISC do SENAC-MT, em formato de jogo.',
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
