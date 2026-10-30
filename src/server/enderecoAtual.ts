import { headers } from 'next/headers';
import { enderecoDoJogo, ipDaRede, type Endereco } from './endereco';

/**
 * Endereco publico do jogo, a partir do pedido atual: o que links e QR codes devem usar. Em hospedagem de verdade vale
 * RUA_URL_PUBLICA; no computador do estande, o IP da rede local no lugar de "localhost" (o celular nao abriria localhost).
 */
export async function enderecoAtual(): Promise<Endereco | null> {
    const cabecalhos = await headers();

    return enderecoDoJogo({
        publica: process.env.RUA_URL_PUBLICA,
        host: cabecalhos.get('x-forwarded-host') ?? cabecalhos.get('host'),
        protocolo: cabecalhos.get('x-forwarded-proto'),
        ip: ipDaRede(),
    });
}
