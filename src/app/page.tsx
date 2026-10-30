import PaginaInicial from '@/components/PaginaInicial';

// A configuracao vem da area de gerenciamento e vale na hora: nada de pagina guardada em cache.
export const dynamic = 'force-dynamic';

export default async function Pagina() {
    return <PaginaInicial />;
}
