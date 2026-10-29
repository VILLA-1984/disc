/**
 * Numero de WhatsApp brasileiro: DDD + celular de 9 digitos (11 digitos no total).
 * Usado no navegador (mascara e validacao) e no servidor (validacao antes de gravar).
 */

export function somenteDigitos(valor: string): string {
    return valor.replace(/\D/g, '');
}

/** Devolve os 11 digitos nacionais (DDD + 9 + 8), ou null se o numero nao servir para o WhatsApp. */
export function normalizarWhatsapp(valor: string): string | null {
    let digitos = somenteDigitos(valor);

    // Aceita o codigo do pais digitado: +55 65 99999-9999.
    if (digitos.length === 13 && digitos.startsWith('55')) {
        digitos = digitos.slice(2);
    }

    if (digitos.length !== 11) {
        return null;
    }

    const ddd = Number(digitos.slice(0, 2));

    if (ddd < 11 || digitos[2] !== '9') {
        return null;
    }

    return digitos;
}

/** Explica o que falta no numero digitado, ou null quando esta valido. */
export function problemaNoWhatsapp(valor: string): string | null {
    if (normalizarWhatsapp(valor) !== null) {
        return null;
    }

    const digitos = somenteDigitos(valor);

    if (digitos.length === 0) {
        return 'Informe o número do WhatsApp.';
    }

    if (digitos.length === 10) {
        return 'Faltou o 9 do celular. Use DDD + 9 dígitos, por exemplo (65) 99999-9999.';
    }

    if (digitos.length < 11) {
        return 'Número incompleto. Use DDD + 9 dígitos, por exemplo (65) 99999-9999.';
    }

    return 'Número inválido. Confira o DDD e os dígitos.';
}

/** Mascara enquanto a pessoa digita: (65) 99999-9999. */
export function mascararWhatsapp(valor: string): string {
    const digitos = somenteDigitos(valor).slice(0, 11);

    if (digitos.length <= 2) {
        return digitos.length ? `(${digitos}` : '';
    }

    if (digitos.length <= 7) {
        return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
    }

    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

/** Link que abre o WhatsApp ja na conversa com o numero, com a mensagem pronta para enviar. */
export function linkWhatsapp(numeroNacional: string, mensagem: string): string {
    return `https://wa.me/55${numeroNacional}?text=${encodeURIComponent(mensagem)}`;
}
