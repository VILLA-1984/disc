import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { enderecoDoJogo, ipDaRede } from '@/server/endereco';

/** QR code da tela de abertura: quem escaneia joga no proprio celular. So aparece em telas largas. */
export default async function QrAbertura() {
    const cabecalhos = await headers();
    const endereco = enderecoDoJogo({
        publica: process.env.RUA_URL_PUBLICA,
        host: cabecalhos.get('x-forwarded-host') ?? cabecalhos.get('host'),
        protocolo: cabecalhos.get('x-forwarded-proto'),
        ip: ipDaRede(),
    });

    if (!endereco) {
        return null;
    }

    // O SVG e gerado aqui, a partir do endereco: so contem formas, nenhum texto de entrada.
    const svg = await QRCode.toString(endereco.url, {
        type: 'svg',
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0d2b4e', light: '#ffffff' },
    });

    return (
        <aside className="qr-abertura" aria-labelledby="qr-titulo">
            <h2 id="qr-titulo">Jogue no seu celular</h2>
            <p>Aponte a câmera do celular para o QR code.</p>
            <div className="qr-codigo" role="img" aria-label={`QR code que abre ${endereco.url}`} dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="qr-endereco">{endereco.url}</p>
            {endereco.redeLocal && <p className="qr-aviso">O celular precisa estar na mesma rede Wi-Fi deste computador.</p>}
        </aside>
    );
}
