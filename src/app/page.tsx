import Partida from '@/components/Partida';
import QrAbertura from '@/components/QrAbertura';
import { carregarConfiguracao } from '@/server/configuracao';
import { logoEmUso } from '@/server/logo';
import { montarTotais } from '@/server/totais';

// A configuracao vem da area de gerenciamento e vale na hora: nada de pagina guardada em cache.
export const dynamic = 'force-dynamic';

export default async function Pagina() {
    const [config, logo] = await Promise.all([carregarConfiguracao(), logoEmUso()]);
    // O ranking da tela inicial vem pronto do servidor; se o banco falhar, a tela abre sem ele.
    const totais = config.mostrarTotaisInicio ? await montarTotais().catch(() => null) : null;

    return (
        <main className="pagina">
            <Partida qr={<QrAbertura />} config={config} logo={logo} totaisInicio={totais} />
        </main>
    );
}
