import { describe, expect, it } from 'vitest';
import { enderecoDoJogo, ipDaRede } from '../src/server/endereco';

describe('enderecoDoJogo', () => {
    it('troca localhost pelo IP da rede, mantendo a porta', () => {
        expect(enderecoDoJogo({ host: 'localhost:3000', ip: '192.168.0.20' })).toEqual({ url: 'http://192.168.0.20:3000', redeLocal: true });
        expect(enderecoDoJogo({ host: '127.0.0.1:3100', ip: '10.1.2.3' })).toEqual({ url: 'http://10.1.2.3:3100', redeLocal: true });
    });

    it('sem IP de rede, nao ha QR util para localhost', () => {
        expect(enderecoDoJogo({ host: 'localhost:3000', ip: null })).toBeNull();
    });

    it('usa o proprio endereco quando ja e alcancavel de fora', () => {
        expect(enderecoDoJogo({ host: '192.168.0.20:3000', ip: '192.168.0.99' })).toEqual({ url: 'http://192.168.0.20:3000', redeLocal: true });
        expect(enderecoDoJogo({ host: 'jogo.exemplo.com.br', protocolo: 'https', ip: '192.168.0.99' })).toEqual({ url: 'https://jogo.exemplo.com.br', redeLocal: false });
    });

    it('o endereco publico configurado tem prioridade', () => {
        expect(enderecoDoJogo({ publica: 'https://feira.exemplo.com/', host: 'localhost:3000', ip: '192.168.0.20' })).toEqual({ url: 'https://feira.exemplo.com', redeLocal: false });
        expect(enderecoDoJogo({ publica: 'nao-e-url', host: 'localhost:3000', ip: '192.168.0.20' })).toBeNull();
    });

    it('recusa host malformado (cabecalho forjado)', () => {
        expect(enderecoDoJogo({ host: 'a b"><script>', ip: '192.168.0.20' })).toBeNull();
        expect(enderecoDoJogo({ host: null, ip: '192.168.0.20' })).toBeNull();
    });
});

describe('ipDaRede', () => {
    const iface = (address: string, internal = false) => ({ address, family: 'IPv4' as const, internal, netmask: '', mac: '', cidr: null });

    it('prefere faixa privada e ignora loopback e 169.254', () => {
        expect(ipDaRede({ lo: [iface('127.0.0.1', true)], a: [iface('169.254.1.1')], b: [iface('203.0.113.9')], c: [iface('192.168.1.5')] })).toBe('192.168.1.5');
        expect(ipDaRede({ lo: [iface('127.0.0.1', true)] })).toBeNull();
    });
});
