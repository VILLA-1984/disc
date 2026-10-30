import Partida from '@/components/Partida';
import QrAbertura from '@/components/QrAbertura';
import { carregarConfiguracao } from '@/server/configuracao';

// A configuracao vem da area de gerenciamento e vale na hora: nada de pagina guardada em cache.
export const dynamic = 'force-dynamic';

export default async function Pagina() {
    const config = await carregarConfiguracao();

    return (
        <main className="pagina">
            <Partida qr={<QrAbertura />} config={config} />
        </main>
    );
}
