# Pontuação e ciclo de palavras

## Regra de pontuação

A pontuação usa **só as palavras escolhidas**, sem peso pela volta em que foram pegas. Para cada etapa, `percentuais()` em `src/server/pontuacao.ts` conta quantas palavras de cada fator (D, I, S, C) foram escolhidas e devolve a proporção **dentro da própria pessoa**. Pessoas não são comparadas entre si.

O resultado é uma **leitura lúdica, não um diagnóstico**.

## Ciclo de palavras ("uma por vez")

Em cada etapa passam as 48 palavras, uma por portão, e a pessoa **pega** ou **deixa passar**. As pegas saem do jogo; as deixadas voltam na volta seguinte, até completar o número de palavras por etapa (padrão 12, configurável de 6 a 36).

- A primeira volta mostra **todas** as palavras antes de qualquer repetição.
- Cada volta traz blocos com uma palavra de cada fator, para nenhum fator ficar todo no começo ou no fim.
- Se as palavras que restam forem exatamente as que faltam, entram sozinhas (marcadas como **automáticas**).
- Se as 6 voltas (`VOLTAS`) acabarem e ainda faltar, entram as primeiras que restam.
- As duas etapas (`ETAPAS = 2`) usam as mesmas palavras.

### Funções principais (`src/server/ciclo.ts`)

| Função | O que faz |
|---|---|
| `sortearPalavras` | Sorteia o conjunto da partida, repartido entre os quatro fatores. |
| `montarCiclo` | Monta as voltas de cada etapa (`RodadaCiclo`). |
| `resolverCiclo` | Refaz a partida a partir das decisões e devolve `{ escolhidas, automaticas, voltas }` por etapa. |

As regras puras estão em `src/jogo/ciclo.js`, **o mesmo arquivo** usado pelo navegador.

## Modo pares (`gameRound.ts`)

Em cada portão a pessoa vê duas palavras de fatores diferentes e escolhe uma. Os portões se distribuem de forma equilibrada entre as seis combinações de fatores; cada palavra aparece no máximo uma vez por etapa e a etapa 2 nunca repete um par da etapa 1. Portões por etapa: de 6 a 24 (padrão 12).

## Lista de palavras

`src/server/palavras.json`: 48 palavras, 12 por fator, formato `{ "id": 1, "word": "Decidido", "code": "D" }`. É uma lista **rascunho, ainda não validada por profissional com formação em DISC**. São necessárias pelo menos 12 palavras por fator para 12 portões por etapa.

## Animais

| Fator | Animal |
|---|---|
| D | Tubarão |
| I | Águia |
| S | Gato |
| C | Lobo |

Quando nenhum fator se destaca, o resultado é **Equilibrado**.
