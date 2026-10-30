import Partida from '@/components/Partida';
import QrAbertura from '@/components/QrAbertura';
import { carregarConfiguracao } from '@/server/configuracao';
import type { Evento } from '@/server/eventos';
import { logoEmUso } from '@/server/logo';
import { montarTotais } from '@/server/totais';

/**
 * Tela inicial do jogo de um evento: o ranking mostrado e o do evento e o QR code leva ao endereco dele. O jogo so abre
 * por aqui (a raiz so oferece a escolha do evento).
 */
export default async function PaginaInicial({ evento }: { evento: Evento }) {
    const [config, logo] = await Promise.all([carregarConfiguracao(), logoEmUso()]);
    // O ranking da tela inicial vem pronto do servidor; se o banco falhar, a tela abre sem ele.
    const totais = config.mostrarTotaisInicio ? await montarTotais(evento.id).catch(() => null) : null;

    return (
        <main className="pagina">
            <Partida
                qr={<QrAbertura caminho={`/e/${evento.slug}`} />}
                config={config}
                logo={logo}
                totaisInicio={totais}
                evento={{ slug: evento.slug, nome: evento.nome }}
            />
        </main>
    );
}
