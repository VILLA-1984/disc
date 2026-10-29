import os from 'node:os';

/**
 * Endereco que o celular precisa abrir para jogar, usado no QR code da tela de abertura.
 *
 * Quando o computador do estande abre o jogo por "localhost", o QR com localhost nao serviria ao celular
 * (localhost seria o proprio celular). Nesse caso troca-se pelo IP do computador na rede local. Em
 * hospedagem de verdade, defina RUA_URL_PUBLICA e o QR usa exatamente esse endereco.
 */

export type Endereco = { url: string; redeLocal: boolean };

const HOST_VALIDO = /^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)*|\[[0-9a-f:]+\])(?::\d{1,5})?$/i;
const HOSTS_LOCAIS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);
const IP_PRIVADO = /^(?:192\.168\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.)/;

type Interfaces = ReturnType<typeof os.networkInterfaces>;

/** IPv4 do computador na rede local (prefere faixas privadas; ignora 169.254, que e sem rede). */
export function ipDaRede(interfaces: Interfaces = os.networkInterfaces()): string | null {
    const enderecos: string[] = [];

    for (const lista of Object.values(interfaces)) {
        for (const item of lista ?? []) {
            if (item.family === 'IPv4' && !item.internal && !item.address.startsWith('169.254.')) {
                enderecos.push(item.address);
            }
        }
    }

    return enderecos.find((ip) => IP_PRIVADO.test(ip)) ?? enderecos[0] ?? null;
}

export function enderecoDoJogo({
    publica,
    host,
    protocolo,
    ip,
}: {
    publica?: string | null;
    host?: string | null;
    protocolo?: string | null;
    ip?: string | null;
}): Endereco | null {
    const fixo = publica?.trim().replace(/\/+$/, '');

    if (fixo) {
        return /^https?:\/\/[^\s]+$/i.test(fixo) ? { url: fixo, redeLocal: false } : null;
    }

    if (!host || !HOST_VALIDO.test(host)) {
        return null;
    }

    const esquema = protocolo === 'https' ? 'https' : 'http';
    const porta = host.match(/:(\d{1,5})$/)?.[0] ?? '';
    const nome = host.slice(0, host.length - porta.length).toLowerCase();

    if (HOSTS_LOCAIS.has(nome)) {
        return ip ? { url: `${esquema}://${ip}${porta}`, redeLocal: true } : null;
    }

    return { url: `${esquema}://${host}`, redeLocal: IP_PRIVADO.test(nome) };
}
