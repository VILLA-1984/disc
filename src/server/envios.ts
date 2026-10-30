import { randomInt } from 'node:crypto';
import { montarMensagem, type Resumo } from '../lib/mensagem';
import { resolverAnimais } from '../jogo/animais-dados.js';
import {
    apagarResultadosExpirados,
    descartarResultadoAnonimo,
    inserirResultado,
    listarResultados,
    marcarResultadoEnviado,
    atualizarWhatsapp,
    resultadoPorCodigo,
    resultadoPorId,
    type LinhaResultado,
} from './db';

/**
 * Resultados para a equipe enviar pelo WhatsApp (tela /whatsapp).
 *
 * Quem se cadastrou: o resultado fica ligado ao cadastro. Quem jogou sem cadastro: o jogo mostra um ID curto e o
 * resultado e apagado sozinho depois de 5 minutos, sem nome nem telefone (o numero que a equipe digitar para enviar
 * so serve para abrir a conversa e nunca e gravado).
 */

export const TEMPO_ANONIMO_MS = 5 * 60 * 1000;

/**
 * ID de exibicao, no formato ABC-123: tres letras e tres digitos, faceis de ditar em voz alta e de digitar. Ficam de fora
 * 0, 1, I, L e O, que se confundem entre si.
 */
export function gerarIdExibicao(): string {
    const letras = 'ABCDEFGHJKMNPQRSTUVWXYZ';
    const digitos = '23456789';
    const pegar = (alfabeto: string, n: number) => Array.from({ length: n }, () => alfabeto[randomInt(alfabeto.length)]).join('');

    return `${pegar(letras, 3)}-${pegar(digitos, 3)}`;
}

export type ResumoGravado = { natural: Resumo; adaptado: Resumo };
/** idExibicao e restanteMs so existem para quem jogou sem cadastro. */
export type ResultadoGuardado = { idExibicao: string | null; restanteMs: number | null };

const restante = (expiraEm: number | null, agora: number) => (expiraEm === null ? null : Math.max(0, expiraEm - agora));

/**
 * Guarda o resultado de uma partida concluida. O codigo da partida (do token) torna a chamada idempotente: concluir
 * duas vezes a mesma partida devolve o mesmo ID, sem duplicar.
 */
export async function guardarResultado(
    codigo: string,
    participanteId: number,
    resumo: ResumoGravado,
    agora = Date.now(),
): Promise<ResultadoGuardado> {
    const anonimo = participanteId === 0;

    await apagarResultadosExpirados(agora); // aproveita a chamada para limpar o que venceu (nao ha rotina agendada)

    const existente = await resultadoPorCodigo(codigo);

    if (existente) {
        return { idExibicao: existente.id_exibicao, restanteMs: restante(existente.expira_em, agora) };
    }

    const expiraEm = anonimo ? agora + TEMPO_ANONIMO_MS : null;
    let ultimoErro: unknown;

    // O ID e sorteado: se der conflito com outro ID ainda valido (raro), sorteia de novo.
    for (let tentativa = 0; tentativa < 8; tentativa++) {
        const idExibicao = anonimo ? gerarIdExibicao() : null;

        try {
            await inserirResultado({
                codigo,
                participanteId: anonimo ? null : participanteId,
                idExibicao,
                resumo: JSON.stringify(resumo),
                criadoEm: agora,
                expiraEm,
            });

            return { idExibicao, restanteMs: restante(expiraEm, agora) };
        } catch (erro) {
            ultimoErro = erro;
            const jaGravado = await resultadoPorCodigo(codigo); // duas chamadas juntas da mesma partida

            if (jaGravado) {
                return { idExibicao: jaGravado.id_exibicao, restanteMs: restante(jaGravado.expira_em, agora) };
            }
        }
    }

    throw ultimoErro;
}

// ------------------------------------------------------------------ a lista da tela /whatsapp

export type EnvioCadastrado = {
    id: number;
    nome: string;
    whatsapp: string;
    animal: string;
    criadoEm: number;
    enviadoEm: number | null;
    mensagem: string;
};

export type EnvioAnonimo = {
    id: number;
    idExibicao: string;
    animal: string;
    criadoEm: number;
    expiraEm: number;
    enviadoEm: number | null;
    mensagem: string;
};

export type ListaDeEnvios = {
    /** Hora do servidor, para a tela contar o tempo que falta sem depender do relogio do computador da equipe. */
    agora: number;
    prazoAnonimoMs: number;
    cadastrados: EnvioCadastrado[];
    anonimos: EnvioAnonimo[];
};

function animalDe(resumo: ResumoGravado): string {
    return resolverAnimais(resumo.natural.percentual).principal?.nome ?? 'Equilibrado';
}

function lerResumo(linha: LinhaResultado): ResumoGravado | null {
    try {
        const resumo = JSON.parse(linha.resumo) as ResumoGravado;

        return resumo?.natural?.percentual && resumo?.adaptado?.percentual ? resumo : null;
    } catch {
        return null;
    }
}

export async function listarEnvios(agora = Date.now()): Promise<ListaDeEnvios> {
    await apagarResultadosExpirados(agora);

    const cadastrados: EnvioCadastrado[] = [];
    const anonimos: EnvioAnonimo[] = [];

    for (const linha of await listarResultados(agora)) {
        const resumo = lerResumo(linha);

        if (!resumo) {
            continue;
        }

        if (linha.participante_id === null) {
            if (linha.id_exibicao && linha.expira_em !== null) {
                anonimos.push({
                    id: linha.id,
                    idExibicao: linha.id_exibicao,
                    animal: animalDe(resumo),
                    criadoEm: linha.criado_em,
                    expiraEm: linha.expira_em,
                    enviadoEm: linha.enviado_em,
                    mensagem: montarMensagem('', resumo.natural, resumo.adaptado),
                });
            }

            continue;
        }

        if (linha.nome && linha.whatsapp) {
            cadastrados.push({
                id: linha.id,
                nome: linha.nome,
                whatsapp: linha.whatsapp,
                animal: animalDe(resumo),
                criadoEm: linha.criado_em,
                enviadoEm: linha.enviado_em,
                mensagem: montarMensagem(linha.nome, resumo.natural, resumo.adaptado),
            });
        }
    }

    return { agora, prazoAnonimoMs: TEMPO_ANONIMO_MS, cadastrados, anonimos };
}

export async function marcarEnviado(id: number, enviado: boolean, agora = Date.now()): Promise<boolean> {
    return marcarResultadoEnviado(id, enviado ? agora : null, agora);
}

/** Corrige o numero de quem se cadastrou (a equipe ve o erro na hora de enviar). Anonimo nao tem numero guardado. */
export async function corrigirWhatsapp(id: number, whatsapp: string): Promise<boolean> {
    const resultado = await resultadoPorId(id);

    if (!resultado || resultado.participante_id === null) {
        return false;
    }

    return atualizarWhatsapp(resultado.participante_id, whatsapp);
}

export async function descartarAnonimo(id: number): Promise<boolean> {
    return descartarResultadoAnonimo(id);
}
