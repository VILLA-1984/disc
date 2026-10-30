import type { Metadata } from 'next';
import AdminLogin from '@/components/AdminLogin';
import Eventos from '@/components/Eventos';
import { adminAtivo, sessaoAdminValida } from '@/server/admin';
import { enderecoAtual } from '@/server/enderecoAtual';
import { listarEventos } from '@/server/eventos';

// Sempre fresca (os totais mudam a cada partida) e fora dos buscadores.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
    title: 'Eventos · Teste de Perfil DISC',
    robots: { index: false, follow: false },
};

/** Tela da equipe para criar os eventos, ligar e desligar cada um e pegar o link, o telao e o QR code. */
export default async function PaginaEventos() {
    if (!adminAtivo()) {
        return (
            <main className="pagina">
                <section className="painel" aria-labelledby="titulo-eventos-desativado">
                    <h2 id="titulo-eventos-desativado">Eventos desativados</h2>
                    <p>Para usar esta área, defina as variáveis de ambiente <code>USER_AREA_ADM</code> e <code>PASS_AREA_ADM</code> com o usuário e a senha de acesso e publique de novo.</p>
                </section>
            </main>
        );
    }

    if (!(await sessaoAdminValida())) {
        return (
            <main className="pagina">
                <AdminLogin titulo="Eventos" texto="Digite o usuário e a senha para gerenciar os eventos." />
            </main>
        );
    }

    let eventos;

    try {
        eventos = await listarEventos();
    } catch (erro) {
        console.error('Falha ao listar os eventos:', erro);

        return (
            <main className="pagina">
                <section className="painel" aria-labelledby="titulo-eventos-erro">
                    <h2 id="titulo-eventos-erro">Lista indisponível</h2>
                    <p>Não foi possível carregar os eventos agora. Recarregue a página em instantes.</p>
                </section>
            </main>
        );
    }

    const endereco = await enderecoAtual();

    return (
        <main className="pagina">
            <Eventos inicial={eventos} base={endereco?.url ?? ''} />
        </main>
    );
}
