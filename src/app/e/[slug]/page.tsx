import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PaginaInicial from '@/components/PaginaInicial';
import { buscarEvento } from '@/server/eventos';

// O evento pode ser ligado e desligado a qualquer hora: nada de pagina guardada em cache.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const evento = await buscarEvento((await params).slug).catch(() => null);

    return { title: evento ? `${evento.nome} · Teste de Perfil DISC` : 'Teste de Perfil DISC' };
}

/** Tela inicial de um evento: quem joga por aqui entra no ranking dele. */
export default async function PaginaDoEvento({ params }: Props) {
    const { slug } = await params;
    const evento = await buscarEvento(slug).catch(() => null);

    if (!evento) {
        notFound();
    }

    if (!evento.ativo) {
        return (
            <main className="pagina">
                <section className="painel" aria-labelledby="titulo-evento-desligado">
                    <h2 id="titulo-evento-desligado">{evento.nome}</h2>
                    <p>Este evento não está recebendo participantes agora. Procure a equipe para saber quando o teste estará disponível.</p>
                </section>
            </main>
        );
    }

    return <PaginaInicial evento={evento} />;
}
