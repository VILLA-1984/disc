import { describe, expect, it } from 'vitest';
import { linkWhatsapp, mascararWhatsapp, normalizarWhatsapp, problemaNoWhatsapp } from '../src/lib/whatsapp';
import { montarMensagem } from '../src/lib/mensagem';

describe('normalizarWhatsapp', () => {
    it('aceita celular com DDD, com ou sem mascara e com +55', () => {
        expect(normalizarWhatsapp('(65) 99999-1234')).toBe('65999991234');
        expect(normalizarWhatsapp('65999991234')).toBe('65999991234');
        expect(normalizarWhatsapp('+55 65 99999-1234')).toBe('65999991234');
    });

    it('recusa numero incompleto, sem o 9 ou com DDD invalido', () => {
        expect(normalizarWhatsapp('6599999123')).toBeNull();
        expect(normalizarWhatsapp('(65) 89999-1234')).toBeNull();
        expect(normalizarWhatsapp('(05) 99999-1234')).toBeNull();
        expect(normalizarWhatsapp('')).toBeNull();
    });
});

describe('problemaNoWhatsapp', () => {
    it('explica o que falta', () => {
        expect(problemaNoWhatsapp('')).toContain('Informe');
        expect(problemaNoWhatsapp('6599991234')).toContain('Faltou o 9');
        expect(problemaNoWhatsapp('65999')).toContain('incompleto');
        expect(problemaNoWhatsapp('65999991234')).toBeNull();
    });
});

describe('mascararWhatsapp / linkWhatsapp', () => {
    it('mascara enquanto digita', () => {
        expect(mascararWhatsapp('6')).toBe('(6');
        expect(mascararWhatsapp('65999')).toBe('(65) 999');
        expect(mascararWhatsapp('65999991234')).toBe('(65) 99999-1234');
        expect(mascararWhatsapp('659999912349999')).toBe('(65) 99999-1234');
    });

    it('monta o link com a mensagem codificada', () => {
        expect(linkWhatsapp('65999991234', 'Olá, tudo bem?\nOk')).toBe('https://wa.me/5565999991234?text=Ol%C3%A1%2C%20tudo%20bem%3F%0AOk');
    });
});

describe('montarMensagem', () => {
    const resumo = (percentual: Record<string, number>) => ({ percentual, total: 12 });

    it('cita o animal e as proporcoes', () => {
        const texto = montarMensagem('Maria da Silva', resumo({ D: 60, I: 20, S: 10, C: 10 }), resumo({ D: 10, I: 10, S: 60, C: 20 }));

        expect(texto).toContain('Olá, Maria!');
        expect(texto).toContain('Seu animal: Tubarão');
        expect(texto).toContain('Como você é: D 60% · I 20% · S 10% · C 10%');
        expect(texto).toContain('o seu lado Gato fala mais alto');
    });

    it('trata o perfil equilibrado', () => {
        const texto = montarMensagem('Ana', resumo({ D: 25, I: 25, S: 25, C: 25 }), resumo({ D: 25, I: 25, S: 25, C: 25 }));

        expect(texto).toContain('equilibrado');
        expect(texto).not.toContain('Seu animal');
    });
});
