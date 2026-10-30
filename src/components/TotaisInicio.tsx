'use client';

import { useEffect, useState } from 'react';
import { ANIMAIS } from '@/jogo/animals.js';
import type { Totais } from '@/server/totais';

const ANIMAIS_POR_CHAVE = ANIMAIS as Record<string, { svgPath: string }>;

/** Perfil equilibrado nao tem animal: uma balanca simples, na cor cinza do ranking. */
export function IconeEquilibrado({ cor }: { cor: string }) {
    return (
        <svg viewBox="0 0 512 512" aria-hidden="true" fill={cor}>
            <path d="M232 64h48v36h112v40H280v236h104v40H128v-40h104V140H120v-40h112z" />
            <path d="M56 300l56-136 56 136c0 31-25 52-56 52s-56-21-56-52zm288 0l56-136 56 136c0 31-25 52-56 52s-56-21-56-52z" />
        </svg>
    );
}

/**
 * Ranking na tela inicial: o total geral no alto e, embaixo, cada perfil com o icone, o nome e a quantidade, do que
 * tem mais pessoas para o que tem menos. Atualiza sozinho de tempos em tempos.
 */
export default function TotaisInicio({ inicial, evento }: { inicial: Totais; evento?: string }) {
    const [dados, setDados] = useState(inicial);

    useEffect(() => {
        const temporizador = setInterval(async () => {
            try {
                const resposta = await fetch(evento ? `/api/totais?evento=${encodeURIComponent(evento)}` : '/api/totais', { cache: 'no-store' });

                if (resposta.ok) {
                    setDados((await resposta.json()) as Totais);
                }
            } catch {
                // sem conexao: segue mostrando os ultimos numeros
            }
        }, 30000);

        return () => clearInterval(temporizador);
    }, [evento]);

    // Ordena do maior para o menor; empate mantem a ordem recebida (D, I, S, C, equilibrado).
    const ranking = [...dados.animais].sort((a, b) => b.total - a.total);

    return (
        <section className="totais-inicio" aria-label="Ranking dos perfis">
            <p className="totais-inicio-geral">
                <span>Total geral</span>
                <strong>{dados.total}</strong>
            </p>

            <ol className="totais-inicio-lista">
                {ranking.map((animal) => (
                    <li key={animal.chave}>
                        {animal.chave === 'equilibrado' || !ANIMAIS_POR_CHAVE[animal.chave] ? (
                            <IconeEquilibrado cor={animal.cor} />
                        ) : (
                            <svg viewBox="0 0 512 512" aria-hidden="true" fill={animal.cor}><path d={ANIMAIS_POR_CHAVE[animal.chave].svgPath} /></svg>
                        )}
                        <span className="totais-inicio-nome">{animal.nome}</span>
                        <b>{animal.total}</b>
                    </li>
                ))}
            </ol>
        </section>
    );
}
