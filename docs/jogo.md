# Jogo: efeitos e desempenho

O front do jogo fica em `src/jogo/` (JavaScript puro com three.js). Esta página reúne o que o jogo faz além da lógica da partida: efeitos, som e proteções de desempenho. Boa parte desse código é **compartilhada com o projeto Laravel**; veja o quadro no fim.

## Desempenho

| Recurso | Onde | Como funciona |
|---|---|---|
| Resolução limitada | `game3d.js` | A pixel ratio do renderizador nunca passa de 2. |
| Qualidade adaptativa | `game3d.js` (`quadro`) | Janelas de 2 s. Duas seguidas abaixo de ~38 fps baixam a pixel ratio em 25% (mínimo 1). **Só desce**, nunca volta. Os 3 primeiros segundos são ignorados, porque os modelos ainda estão entrando. |
| Partículas reaproveitadas | `game3d.js` (`soltarParticula`) | A fumaça e a poeira do turbo reutilizam as malhas e os materiais em vez de criar novos (limite de 36 ao mesmo tempo). |
| Pré-carregamento dos modelos | `cenarios.js` (`precarregarModeloDoMeio`) | O glTF do meio começa a baixar na tela de escolha do cenário, para entrar na cena sem trocar no meio da corrida. |
| Painel de desempenho | `desempenho.js` | Com `?fps=1` na URL: fps, chamadas de desenho, triângulos, geometrias e texturas. |

## Robustez

- **Contexto WebGL perdido.** Se o aparelho tomar o contexto (comum em celular fraco), o jogo para de desenhar, mostra um aviso e volta sozinho quando o navegador devolve o contexto (`webglcontextlost` e `webglcontextrestored`).
- **Aba oculta.** O `AudioContext` é suspenso e retomado ao voltar (`audio.js`), e o relógio do jogo recomeça, para não haver salto de tempo.
- **Modelos glTF.** Se um modelo não carregar, o veículo feito em código continua valendo (`?modelos=0` na URL força esse modo, para comparação).

## Movimento e câmera

- No turbo, o campo de visão abre e a câmera treme de forma **suave** (senoides de períodos diferentes, não sorteio a cada quadro).
- Ao escolher uma palavra, o campo de visão dá um pulso curto e volta.
- Na passagem para a etapa 2, um clarão (`.rua-transicao`) se dissolve sobre a cena.
- O mundo curvo, o tremor, o pulso, o clarão, a vibração e o confete **não acontecem** com `prefers-reduced-motion` (ou com o botão "Reduzir efeitos" no relatório).

## Som

Tudo é sintetizado com a Web Audio API, sem arquivos de áudio. O botão de som no canto da tela liga e desliga, e a escolha fica salva no navegador.

A música de fundo tem **um clima por cenário** (`ESTILOS_MUSICA` em `audio.js`): andamento, timbre, oitava e baixo próprios para rua, rio, céu, neve, trilhos e espaço. A música de abertura é a da rua e troca quando o cenário é escolhido.

## Feedback ao jogador

- **Vibração** (`navigator.vibrate`) de 25 ms ao escolher e um padrão curto ao concluir, só onde o aparelho tem suporte.
- **Confete** (`confete.js`) na revelação do animal, nas cores dele. É um canvas que se apaga sozinho depois de cerca de 2,8 s.

## O que é compartilhado com o Laravel

O mesmo front existe em `resources/js/word-street/` do projeto Laravel. Ao mudar o jogo, a mudança vai para os dois.

| Arquivo | Regra |
|---|---|
| `audio.js`, `report.js`, `game3d.js`, `confete.js`, `modelos.js`, `espaco.js`, `cenarios.js`, `avatars.js`, `ciclo.js`, `desempenho.js` | Idênticos: pode copiar o arquivo inteiro. |
| `entrada.js`, `animals.js`, `rua.css` | **Divergem** entre os projetos: **não copie**; aplique a mudança à mão nos dois. |

!!! warning
    Copiar `entrada.js` ou `rua.css` do Next por cima do Laravel quebra o jogo de lá (imports, textos configuráveis e CSS diferentes). Já aconteceu uma vez.

## Ainda não feito

- Mapeamento de tons (*tone mapping*) para melhorar o contraste dos cenários.
- Controle de volume (hoje só existe o mudo).
- Compressão dos modelos glTF (Draco ou meshopt). Hoje somam cerca de 600 KB, então não é urgente.
