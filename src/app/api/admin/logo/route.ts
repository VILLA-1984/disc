import { adminAtivo, origemConfiavel, sessaoAdminValida } from '@/server/admin';
import { ESCOLHA_ENVIADA, escolhaValida } from '@/lib/logos';
import { conferirLogo, lerLogo, removerLogo, salvarEscolha, salvarLogo } from '@/server/logo';

/**
 * Gerencia a logo, so com a sessao do administrador: POST envia uma imagem nova (multipart, campo "arquivo") e ja a
 * usa; PUT escolhe qual logo fica em uso (JSON { escolha }: o id de uma fixa, "enviada" ou "nenhuma"); DELETE apaga a
 * imagem enviada.
 */
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
        return Response.json({ versao: await salvarLogo(conferencia.tipo, bytes), escolha: ESCOLHA_ENVIADA });
    } catch (erro) {
        console.error('Falha ao gravar a logo:', erro);

        return Response.json({ erro: 'Não foi possível gravar a logo agora. Tente de novo em instantes.' }, { status: 503 });
    }
}

export async function PUT(request: Request) {
    const recusa = await autorizar(request);

    if (recusa) {
        return recusa;
    }

    const corpo = (await request.json().catch(() => null)) as { escolha?: unknown } | null;

    if (!escolhaValida(corpo?.escolha)) {
        return Response.json({ erro: 'Logo desconhecida.' }, { status: 422 });
    }

    try {
        if (corpo.escolha === ESCOLHA_ENVIADA && !(await lerLogo())) {
            return Response.json({ erro: 'Nenhuma imagem foi enviada ainda. Envie uma logo primeiro.' }, { status: 422 });
        }

        await salvarEscolha(corpo.escolha);

        return Response.json({ escolha: corpo.escolha });
    } catch (erro) {
        console.error('Falha ao gravar a escolha da logo:', erro);

        return Response.json({ erro: 'Não foi possível gravar agora. Tente de novo em instantes.' }, { status: 503 });
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
