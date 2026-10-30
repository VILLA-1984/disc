import { gravarConfiguracao, lerConfiguracao } from './db';

/**
 * Logo exibida na tela inicial, enviada na area de gerenciamento. Fica no mesmo banco da configuracao (a Vercel nao
 * tem disco gravavel), numa linha propria, e nunca contem dados pessoais. So PNG, JPEG e WebP: SVG pode carregar
 * scripts e nao e aceito.
 */

const CHAVE = 'logo';

export const LOGO_MAX_BYTES = 1024 * 1024;
export const TIPOS_LOGO = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type TipoLogo = (typeof TIPOS_LOGO)[number];

export type Logo = { tipo: TipoLogo; bytes: Buffer; versao: number };

/** Descobre o tipo pelos primeiros bytes do arquivo (o nome e o tipo informado pelo navegador nao valem). */
export function tipoPelosBytes(bytes: Uint8Array): TipoLogo | null {
    const inicio = (...assinatura: number[]) => assinatura.every((b, i) => bytes[i] === b);

    if (inicio(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
        return 'image/png';
    }

    if (inicio(0xff, 0xd8, 0xff)) {
        return 'image/jpeg';
    }

    // WebP: "RIFF" + 4 bytes de tamanho + "WEBP"
    if (inicio(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
        return 'image/webp';
    }

    return null;
}

export type Conferencia = { ok: true; tipo: TipoLogo } | { ok: false; erro: string };

export function conferirLogo(bytes: Uint8Array): Conferencia {
    if (bytes.length === 0) {
        return { ok: false, erro: 'O arquivo está vazio.' };
    }

    if (bytes.length > LOGO_MAX_BYTES) {
        return { ok: false, erro: 'A logo passa de 1 MB. Reduza o tamanho da imagem e envie de novo.' };
    }

    const tipo = tipoPelosBytes(bytes);

    if (!tipo) {
        return { ok: false, erro: 'Formato não aceito. Envie uma imagem PNG, JPEG ou WebP.' };
    }

    return { ok: true, tipo };
}

/** A logo em uso, ou null quando nenhuma foi enviada (ou o que esta salvo nao e legivel). */
export async function lerLogo(): Promise<Logo | null> {
    try {
        const salvo = await lerConfiguracao(CHAVE);

        if (salvo === null) {
            return null;
        }

        const { tipo, dados, versao } = JSON.parse(salvo) as { tipo: unknown; dados: unknown; versao: unknown };

        if (!TIPOS_LOGO.includes(tipo as TipoLogo) || typeof dados !== 'string' || typeof versao !== 'number') {
            return null;
        }

        return { tipo: tipo as TipoLogo, bytes: Buffer.from(dados, 'base64'), versao };
    } catch (erro) {
        // Nunca derruba a tela inicial por causa da logo.
        console.error('Falha ao ler a logo:', erro);

        return null;
    }
}

/** So a versao (para montar o endereco da imagem sem carregar os bytes na pagina). */
export async function versaoDaLogo(): Promise<number | null> {
    return (await lerLogo())?.versao ?? null;
}

export async function salvarLogo(tipo: TipoLogo, bytes: Uint8Array): Promise<number> {
    const versao = Date.now();

    await gravarConfiguracao(CHAVE, JSON.stringify({ tipo, dados: Buffer.from(bytes).toString('base64'), versao }));

    return versao;
}

export async function removerLogo(): Promise<void> {
    await gravarConfiguracao(CHAVE, null);
}
