import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QrAbertura from '@/components/QrAbertura';
import Telao from '@/components/Telao';
import { buscarEvento } from '@/server/eventos';
import { logoEmUso } from '@/server/logo';
import { montarTotais } from '@/server/totais';

// O ranking muda a cada partida: nada de pagina guardada em cache.
export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ intervalo?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const evento = await buscarEvento((await params).slug).catch(() => null);

    return { title: evento ? `${evento.nome} · Telão` : 'Telão', robots: { index: false, follow: false } };
}

const INTERVALO_PADRAO = 20;
const INTERVALO_MIN = 5;
const INTERVALO_MAX = 300;

/**
 * Telao de um evento: pagina so de exibicao (sem login), com o ranking do evento e as animacoes dos animais. Os
 * numeros sao so contadores, sem dado pessoal. `?intervalo=<segundos>` muda de quanto em quanto tempo um animal ganha a
 * tela (de 5 a 300; padrao 20).
 */
export default async function PaginaTelao({ params, searchParams }: Props) {
    const { slug } = await params;
    const evento = await buscarEvento(slug).catch(() => null);

    if (!evento) {
        notFound();
    }

    const [inicial, logo] = await Promise.all([montarTotais(evento.id), logoEmUso()]);
    const pedido = Number((await searchParams).intervalo);
    const intervaloSeg = Number.isFinite(pedido) && pedido > 0 ? Math.min(INTERVALO_MAX, Math.max(INTERVALO_MIN, Math.round(pedido))) : INTERVALO_PADRAO;

    return (
        <Telao
            evento={{ slug: evento.slug, nome: evento.nome, ativo: evento.ativo }}
            inicial={inicial}
            logo={logo}
            intervaloSeg={intervaloSeg}
            qr={evento.ativo ? <QrAbertura caminho={`/e/${evento.slug}`} titulo="Jogue agora" /> : null}
        />
    );
}
