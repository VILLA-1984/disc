import QRCode from 'qrcode';
import { enderecoAtual } from '@/server/enderecoAtual';

/**
 * QR code da tela de abertura: quem escaneia joga no proprio celular. So aparece em telas largas. `caminho` leva ao
 * endereco de um evento (/e/<slug>); sem ele, abre a tela inicial.
 */
export default async function QrAbertura({ caminho = '', titulo = 'Jogue no seu celular' }: { caminho?: string; titulo?: string }) {
    const endereco = await enderecoAtual();

    if (!endereco) {
        return null;
    }

    // O SVG e gerado aqui, a partir do endereco: so contem formas, nenhum texto de entrada.
    const url = `${endereco.url}${caminho}`;
    const svg = await QRCode.toString(url, {
        type: 'svg',
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0d2b4e', light: '#ffffff' },
    });

    return (
        <aside className="qr-abertura" aria-labelledby="qr-titulo">
            <h2 id="qr-titulo">{titulo}</h2>
            <p>Aponte a câmera do celular para o QR code.</p>
            <div className="qr-codigo" role="img" aria-label={`QR code que abre ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="qr-endereco">{url}</p>
            {endereco.redeLocal && <p className="qr-aviso">O celular precisa estar na mesma rede Wi-Fi deste computador.</p>}
        </aside>
    );
}
