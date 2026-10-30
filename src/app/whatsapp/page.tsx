import type { Metadata } from 'next';
import AdminLogin from '@/components/AdminLogin';
import Envios from '@/components/Envios';
import { adminAtivo, sessaoAdminValida } from '@/server/admin';
import { listarEnvios } from '@/server/envios';

// Sempre fresca (a lista muda a cada partida e o tempo dos anonimos corre) e fora dos buscadores.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
    title: 'Envio de resultados · Teste de Perfil DISC',
    robots: { index: false, follow: false },
};

/** Tela da equipe para enviar os resultados pelo WhatsApp. Mesmo usuario e senha do gerenciamento. */
export default async function PaginaWhatsapp() {
    if (!adminAtivo()) {
        return (
            <main className="pagina">
                <section className="painel" aria-labelledby="titulo-envios-desativado">
                    <h2 id="titulo-envios-desativado">Envio de resultados desativado</h2>
                    <p>Para usar esta área, defina as variáveis de ambiente <code>USER_AREA_ADM</code> e <code>PASS_AREA_ADM</code> com o usuário e a senha de acesso e publique de novo.</p>
                </section>
            </main>
        );
    }

    if (!(await sessaoAdminValida())) {
        return (
            <main className="pagina">
                <AdminLogin titulo="Envio de resultados" texto="Digite o usuário e a senha para enviar os resultados." />
            </main>
        );
    }

    let inicial;

    try {
        inicial = await listarEnvios();
    } catch (erro) {
        console.error('Falha ao listar os envios:', erro);

        return (
            <main className="pagina">
                <section className="painel" aria-labelledby="titulo-envios-erro">
                    <h2 id="titulo-envios-erro">Lista indisponível</h2>
                    <p>Não foi possível carregar os resultados agora. Recarregue a página em instantes.</p>
                </section>
            </main>
        );
    }

    return (
        <main className="pagina">
            <Envios inicial={inicial} />
        </main>
    );
}
