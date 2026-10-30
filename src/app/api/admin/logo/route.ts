import { adminAtivo, origemConfiavel, sessaoAdminValida } from '@/server/admin';
import { conferirLogo, removerLogo, salvarLogo } from '@/server/logo';

/** Envia (POST, multipart com o campo "arquivo") ou remove (DELETE) a logo. So com a sessao do administrador. */
async function autorizar(request: Request): Promise<Response | null> {
    if (!adminAtivo() || !(await sessaoAdminValida())) {
        return Response.json({ erro: 'Entre na área de gerenciamento para continuar.' }, { status: 401 });
    }

    if (!origemConfiavel(request)) {
        return Response.json({ erro: 'Pedido recusado.' }, { status: 403 });
    }

    return null;
}

export async function POST(request: Request) {
    const recusa = await autorizar(request);

    if (recusa) {
        return recusa;
    }

    const formulario = await request.formData().catch(() => null);
    const arquivo = formulario?.get('arquivo');

    if (!(arquivo instanceof File)) {
        return Response.json({ erro: 'Escolha uma imagem para enviar.' }, { status: 422 });
    }

    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const conferencia = conferirLogo(bytes);

    if (!conferencia.ok) {
        return Response.json({ erro: conferencia.erro }, { status: 422 });
    }

    try {
        return Response.json({ versao: await salvarLogo(conferencia.tipo, bytes) });
    } catch (erro) {
        console.error('Falha ao gravar a logo:', erro);

        return Response.json({ erro: 'Não foi possível gravar a logo agora. Tente de novo em instantes.' }, { status: 503 });
    }
}

export async function DELETE(request: Request) {
    const recusa = await autorizar(request);

    if (recusa) {
        return recusa;
    }

    try {
        await removerLogo();

        return Response.json({ ok: true });
    } catch (erro) {
        console.error('Falha ao remover a logo:', erro);

        return Response.json({ erro: 'Não foi possível remover a logo agora. Tente de novo em instantes.' }, { status: 503 });
    }
}
