import type { Metadata } from 'next';
import Admin from '@/components/Admin';
import AdminLogin from '@/components/AdminLogin';
import { TEXTOS } from '@/lib/configuracao';
import { adminAtivo, sessaoAdminValida } from '@/server/admin';
import { carregarConfiguracao, montarCatalogo } from '@/server/configuracao';
import { versaoDaLogo } from '@/server/logo';

// Sempre fresca (a sessao e a configuracao mudam) e fora dos buscadores.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
    title: 'Gerenciamento · Teste de Perfil DISC',
    robots: { index: false, follow: false },
};

export default async function PaginaAdmin() {
    if (!adminAtivo()) {
        return (
            <main className="pagina">
                <section className="painel" aria-labelledby="titulo-admin-desativado">
                    <h2 id="titulo-admin-desativado">Gerenciamento desativado</h2>
                    <p>Para usar esta área, defina as variáveis de ambiente <code>USER_AREA_ADM</code> e <code>PASS_AREA_ADM</code> com o usuário e a senha de acesso e publique de novo.</p>
                </section>
            </main>
        );
    }

    if (!(await sessaoAdminValida())) {
        return (
            <main className="pagina">
                <AdminLogin />
            </main>
        );
    }

    return (
        <main className="pagina">
            <Admin configInicial={await carregarConfiguracao()} catalogo={montarCatalogo()} textos={TEXTOS} logoInicial={await versaoDaLogo()} />
        </main>
    );
}
