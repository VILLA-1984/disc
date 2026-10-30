import Partida from '@/components/Partida';
import QrAbertura from '@/components/QrAbertura';
import { carregarConfiguracao } from '@/server/configuracao';
import type { Evento } from '@/server/eventos';
import { logoEmUso } from '@/server/logo';
import { montarTotais } from '@/server/totais';

/**
 * Tela inicial do jogo, a mesma da raiz e dos eventos. Num evento, o ranking mostrado e o do evento e o QR code leva ao
 * endereco dele; na raiz, vale o ranking das partidas sem evento.
 */
export default async function PaginaInicial({ evento = null }: { evento?: Evento | null }) {
    const [config, logo] = await Promise.all([carregarConfiguracao(), logoEmUso()]);
    // O ranking da tela inicial vem pronto do servidor; se o banco falhar, a tela abre sem ele.
    const totais = config.mostrarTotaisInicio ? await montarTotais(evento?.id ?? null).catch(() => null) : null;

    return (
        <main className="pagina">
            <Partida
                qr={<QrAbertura caminho={evento ? `/e/${evento.slug}` : ''} />}
                config={config}
                logo={logo}
                totaisInicio={totais}
                evento={evento ? { slug: evento.slug, nome: evento.nome } : null}
            />
        </main>
    );
}
