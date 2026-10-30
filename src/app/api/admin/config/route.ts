import { adminAtivo, origemConfiavel, sessaoAdminValida } from '@/server/admin';
import { restaurarConfiguracao, salvarConfiguracao, validar } from '@/server/configuracao';

/**
 * Grava a configuracao do jogo (so com a sessao do administrador). Corpo: { config } para salvar ou
 * { restaurar: true } para voltar ao padrao de fabrica. A validacao e feita aqui, nunca so na tela.
 */
export async function POST(request: Request) {
    if (!adminAtivo() || !(await sessaoAdminValida())) {
        return Response.json({ erro: 'Entre na área de gerenciamento para continuar.' }, { status: 401 });
    }

    if (!origemConfiavel(request)) {
        return Response.json({ erro: 'Pedido recusado.' }, { status: 403 });
    }

    const corpo = (await request.json().catch(() => null)) as { config?: unknown; restaurar?: unknown } | null;

    try {
        if (corpo?.restaurar === true) {
            return Response.json({ config: await restaurarConfiguracao() });
        }

        const resultado = validar(corpo?.config);

        if (!resultado.ok) {
            return Response.json({ erro: resultado.erro }, { status: 422 });
        }

        await salvarConfiguracao(resultado.config);

        return Response.json({ config: resultado.config });
    } catch (erro) {
        console.error('Falha ao gravar a configuração:', erro);

        return Response.json({ erro: 'Não foi possível gravar agora. Tente de novo em instantes.' }, { status: 503 });
    }
}
