/**
 * Regras do ciclo de palavras (modo "uma por vez"): as palavras passam uma de cada vez, a pessoa PEGA ou
 * DEIXA PASSAR, as pegas saem do jogo e as deixadas voltam na volta seguinte, ate completar o total pedido.
 *
 * Sao funcoes puras, sem DOM, e valem igual nos dois lados: o navegador usa para decidir qual palavra vem
 * agora; o servidor usa para refazer a partida a partir das decisoes e conferir o resultado. O servidor
 * (PHP, no sistema DISC) tem uma copia fiel destas regras: se mudar uma, mude a outra.
 *
 * Regras:
 *  - `ordens` traz, para cada volta, a ordem em que as palavras podem aparecer (todas as palavras em cada volta).
 *    Numa volta so aparecem as que ainda nao foram pegas.
 *  - O ciclo acaba quando a pessoa completa `escolher` palavras.
 *  - Se as palavras que restam forem exatamente as que faltam, elas entram sozinhas (nao ha mais o que escolher)
 *    e ficam marcadas como automaticas.
 *  - Se as voltas previstas acabarem e ainda faltar, entram as primeiras que restam, tambem como automaticas.
 *  - A pontuacao usa so as palavras escolhidas (pegas + automaticas): nenhum peso e dado a volta em que
 *    a palavra foi pega.
 */

export function criarCiclo(ordens, escolher) {
    const restantes = new Set(ordens[0]);
    const pegas = [];
    const automaticas = [];
    const apresentacoes = [];
    let volta = 0;
    let posicao = 0;
    let encerrado = false;
    let atual = null;

    const falta = () => escolher - pegas.length;

    function encerrar() {
        encerrado = true;
        const faltam = falta();

        if (faltam > 0) {
            const ordem = ordens[Math.min(volta, ordens.length - 1)].filter((id) => restantes.has(id));

            for (const id of ordem.slice(0, faltam)) {
                automaticas.push(id);
                restantes.delete(id);
            }
        }
    }

    function avancar() {
        while (!encerrado) {
            if (falta() <= 0 || restantes.size <= falta() || volta >= ordens.length) {
                encerrar();

                return null;
            }

            if (posicao >= ordens[volta].length) {
                volta++;
                posicao = 0;
                continue;
            }

            const id = ordens[volta][posicao];

            if (!restantes.has(id)) {
                posicao++;
                continue;
            }

            return id;
        }

        return null;
    }

    return {
        /** Proxima palavra a apresentar, ou null quando o ciclo terminou. */
        proximo() {
            if (atual === null && !encerrado) {
                atual = avancar();
            }

            return atual;
        },
        /** Registra a decisao sobre a palavra que esta na vez (true = pegou, false = deixou passar). */
        registrar(pegou) {
            const id = this.proximo();

            if (id === null) {
                throw new Error('Não há palavra para decidir.');
            }

            apresentacoes.push({ id, volta: volta + 1, pegou: Boolean(pegou) });

            if (pegou) {
                pegas.push(id);
                restantes.delete(id);
            }

            posicao++;
            atual = null;
        },
        estado() {
            return {
                pegas: [...pegas],
                automaticas: [...automaticas],
                escolhidas: [...pegas, ...automaticas],
                apresentacoes: [...apresentacoes],
                volta: volta + 1,
                faltam: Math.max(0, falta() - automaticas.length),
                encerrado,
            };
        },
    };
}

/** Refaz o ciclo a partir das decisoes (booleanos, na ordem em que foram tomadas). Lanca erro se nao baterem. */
export function simular(ordens, escolher, decisoes) {
    const ciclo = criarCiclo(ordens, escolher);

    for (const decisao of decisoes) {
        if (typeof decisao !== 'boolean') {
            throw new Error('Decisão em formato inválido.');
        }

        if (ciclo.proximo() === null) {
            throw new Error('Há decisões a mais para esta etapa.');
        }

        ciclo.registrar(decisao);
    }

    if (ciclo.proximo() !== null) {
        throw new Error('Faltam decisões: complete a etapa.');
    }

    return ciclo.estado();
}
