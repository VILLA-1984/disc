# Teste de Perfil DISC (Rua das Palavras)

Jogo de escolhas do teste DISC do SENAC-MT, como projeto independente (Next.js). A pessoa informa nome e
WhatsApp, joga as duas etapas, vê o animal do resultado e envia o resultado pelo WhatsApp.

Nasceu do formato "jogo" do sistema DISC (`../disc`): mesma lista de palavras, mesma pontuação e mesmo front
(three.js). A diferença é que aqui o servidor é Next.js e **nada do teste é gravado**.

## Como rodar

```powershell
$env:Path = 'C:\LENTAO\node;' + $env:Path   # Node 24 ou superior (usa o node:sqlite embutido)
npm install
npm run dev          # desenvolvimento em http://localhost:3000
npm run build; npm start   # produção
npm test             # testes de unidade (sorteio, pontuação, WhatsApp, banco, token)
```

Teste de ponta a ponta (com o servidor no ar em `RUA_URL`, padrão `http://127.0.0.1:3100`):
`node e2e/partida.mjs [pasta] [3d|lateral]`.

## Manual de uso

O manual fica dentro da própria ferramenta, em `/manual` (há um link na tela inicial), com passo a passo para quem
joga, orientações para quem aplica e dúvidas frequentes. Os prints ficam em `public/manual/` e são gerados por
uma partida automática: **quando uma tela mudar, regere os prints** para o manual não ficar desatualizado.

```powershell
# com o servidor no ar (npm start -- -p 3100) e RUA_DADOS apontando para uma pasta temporária
node e2e/capturar-manual.mjs
```

O texto do manual está em `src/app/manual/page.tsx`.

## Estande / feira (QR code para jogar no celular)

```powershell
npm run feira   # compila e sobe na porta 3000, acessível a outros aparelhos da rede (-H 0.0.0.0)
```

Abra `http://localhost:3000` no computador do estande. A tela de abertura mostra um **QR code** (só em tela
larga) com o endereço do computador na rede, por exemplo `http://192.168.0.20:3000`; quem escaneia joga no
próprio celular. Celular e computador precisam estar na **mesma rede Wi-Fi**, e o Windows precisa permitir o
Node.js na rede privada (o aviso do firewall aparece na primeira execução). Redes de eventos costumam isolar os
aparelhos entre si: teste antes com um celular, ou leve um roteador próprio.

- `RUA_URL_PUBLICA`: se o jogo estiver hospedado na internet, o QR code usa exatamente este endereço.
- O botão "Próxima pessoa", na tela final, volta à abertura para o próximo participante.
- O endereço é calculado a cada abertura da página: se a rede mudar, recarregue a página para gerar outro QR.

## Painel de totais

No canto inferior esquerdo do jogo há um painel com **quantas pessoas já terminaram o jogo** e **quantas deram cada animal**
(Tubarão, Águia, Gato, Lobo ou Equilibrado; no celular, só o total). Ele atualiza ao abrir o jogo e a cada 30 segundos.

- Conta toda partida concluída, com ou sem cadastro. Os totais saem da tabela `partidas_contadas` (`codigo`, `animal`): para
  cada partida guarda **só um código aleatório** (o `n` do token, que impede contar a mesma partida duas vezes) e o animal do
  resultado. Nada identifica a pessoa. O animal é o mesmo do relatório (`resolverAnimais`).
- `/api/concluir` conta a partida; uma falha do contador nunca atrapalha o resultado de quem jogou. `GET /api/totais` devolve
  `{ total, animais: [{ chave, nome, cor, total }] }` (público, sem cache).
- Só o Next.js tem o painel: o `entrada.js` o desenha quando recebe `api.totais`; o Laravel não passa essa função.

## Cadastro opcional

Na abertura a pessoa escolhe se quer receber o resultado pelo WhatsApp: **"Sim"** pede nome e WhatsApp (guardados no
Turso ou no SQLite); **"Não, só quero jogar"** não pede nem guarda nada. Quem joga sem cadastro (`/api/iniciar` com
`{ anonimo: true }`, token com id 0) pode, na tela final, informar nome e número: `/api/whatsapp` cria o cadastro nessa
hora e devolve um token novo com o id do cadastro, usado nas correções seguintes. Sem cadastro, nenhuma linha vai ao banco.

## Como a partida funciona: ciclo de palavras

Modo padrão ("uma por vez"): em cada etapa passam as 48 palavras, uma por portão, e a pessoa **pega** a palavra
ou **deixa passar**. As pegas saem do jogo; as deixadas voltam na volta seguinte, até completar 14 por etapa (eram 24; o jogo ficou bem mais curto)
(`RUA_ESCOLHER`, de 12 a `palavras − 12`). As duas etapas usam as mesmas palavras, com perguntas diferentes
(natural × adaptado).

- A primeira volta mostra **todas** as palavras antes de qualquer repetição; cada volta traz blocos com uma palavra
  de cada fator, para nenhum fator ficar todo no começo ou no fim.
- Se as palavras que restam forem exatamente as que faltam, entram sozinhas (marcadas como automáticas). Se as 6
  voltas previstas acabarem e ainda faltar, entram as primeiras que restam.
- **A pontuação usa só as palavras escolhidas**, sem peso pela volta em que foram pegas.
- As regras estão em `src/jogo/ciclo.js`, o **mesmo arquivo** usado pelo navegador (para saber qual palavra vem agora)
  e pelo servidor (que refaz a partida a partir das decisões e confere). O servidor DISC em PHP tem uma cópia
  dessas regras: mudou uma, mude a outra.
- `RUA_MODO=pares` volta ao formato antigo, com duas palavras por portão.
- O minimapa (largada, chegada e posição) fica no canto superior direito do jogo.

## Cenários

Na tela do avatar a pessoa escolhe onde correr (`src/jogo/cenarios.js`) e, quando o cenário tem mais de um meio, "Como
você quer ir?":

- **Rua** (padrão).
- **Rio**: barco a motor, veleiro, caiaque, moto aquática, boia de pato ou nado, de colete salva-vidas, com peixes que pulam. Em caiaque, moto aquática, boia, nado, asa delta e parapente o avatar vai sem cadeira, bengala ou andador (ficam na margem); a moto aquática também aceita quem já é de moto.
- **Céu**: avião, jato, helicóptero, asa delta ou parapente, com nuvens, montanhas ao longe e pássaros.
- **Neve**: esqui (em pé, com bastões), sit-ski (sentado, para quem usa cadeira de rodas) ou trenó, com pinheiros nevados e nevasca. Moto, táxi e cadeira de corrida não vão para a neve.
- **Trilhos**: locomotiva a vapor (com fumaça) ou draisina (carrinho de ferrovia de bombear, com os braços na alavanca), numa ferrovia de três vias: o avatar anda na do meio e passa para as laterais nas escolhas. Moto e táxi não andam sobre trilhos.

O cenário e o meio são só visuais; portões, ciclo de palavras e pontuação não mudam. `avatarCabe(spec, cenario, meio)` decide
quais avatares entram a partir do campo `mobilidade` (no rio e no céu, moto e táxi ficam de fora). Novos cenários entram em
`CENARIOS` (textos e regra), os meios em `MEIOS`, e ganham um construtor da cena e do veículo em `cenarios.js`.

## O que fica salvo

Só **nome e WhatsApp**, num de dois lugares: no **Turso** (nuvem; modo do Vercel) quando `TURSO_DATABASE_URL` está
definida, ou no **SQLite embutido** em `data/participantes.db`, criado sozinho (modo da feira, no próprio computador;
`RUA_BANCO_LOCAL=1` força este mesmo com as variáveis do Turso no `.env`). Guarda também as datas de cadastro e
de correção. As escolhas e o resultado do jogo **não são gravados**: o resultado aparece na tela e vai na
mensagem do WhatsApp.

- `npm run exportar > participantes.csv` exporta os cadastros.
- `data/` não é versionada (`.gitignore`). Faça backup dessa pasta se os cadastros importarem.
- Os dados são pessoais (LGPD): a tela de cadastro avisa o que é guardado. Defina quem acessa o arquivo e por
  quanto tempo ele é mantido.

## Como funciona

1. `POST /api/iniciar`: valida nome e WhatsApp, grava o cadastro, **monta os portões no servidor** e devolve só
   id e texto das palavras. O fator DISC de cada palavra nunca sai do servidor.
2. A rodada volta ao navegador dentro de um **token assinado** (HMAC), então não é preciso guardar a partida no
   servidor. O token vale 6 horas.
3. `POST /api/concluir`: confere as escolhas contra a rodada assinada e devolve a pontuação.
4. No fim, a pessoa confere o número. Se corrigir, `POST /api/whatsapp` atualiza o cadastro e o botão abre
   `https://wa.me/55<número>?text=<mensagem>`.

O WhatsApp é aberto na conta de quem está usando o aparelho, com a conversa e a mensagem prontas: quem clica em
Enviar é a pessoa (não há API de envio automático).

## Deploy no Vercel (GitHub + Turso)

**Em produção:** https://rua-das-palavras.vercel.app (projeto `rua-das-palavras` no Vercel, ligado ao repositório
`VILLA-1984/disc`, branch `main`). Cada push na `main` publica sozinho.

O Vercel não tem disco permanente, então lá o cadastro vai para o **Turso** e o segredo de assinatura vem de variável de ambiente.

1. Versione o projeto num repositório do GitHub (o `.env` fica fora do git; só o `.env.example` vai).
2. No Vercel: **Add New → Project → Import Git Repository** e escolha o repositório. O Next.js é detectado sozinho
   (build `next build`). A partir daí, **cada push na branch principal publica sozinho**, e as outras branches e pull
   requests ganham um endereço de pré-visualização.
3. Em **Settings → Environment Variables**, cadastre os mesmos valores do seu `.env` local:
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` e `RUA_SEGREDO` (o mesmo valor em todos os ambientes). Opcional:
   `RUA_URL_PUBLICA` com o endereço do site, para o QR code. **Não** defina `RUA_BANCO_LOCAL`.
4. Faça um novo deploy depois de cadastrar as variáveis. Para conferir, jogue uma partida e rode `npm run exportar`
   (lê do Turso quando as variáveis estão no `.env`).

Os dados são pessoais (LGPD) e ficam num serviço de nuvem fora do Brasil (o banco do Turso está na região indicada na
URL). Defina quem acessa o banco e por quanto tempo os cadastros são mantidos.

## Configuração (variáveis de ambiente, todas opcionais)

| Variável | Para quê |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Banco dos cadastros no Turso (obrigatórias no Vercel). Sem elas, usa o SQLite local. |
| `RUA_BANCO_LOCAL` | `1` força o SQLite local mesmo com as variáveis do Turso (servidor da feira, sem depender da internet). |
| `RUA_SEGREDO` | Segredo da assinatura do token. Sem ela, é gerado em `data/.segredo`. Em produção com mais de uma instância, defina a mesma em todas. |
| `RUA_DADOS` | Pasta dos dados (padrão `./data`). |
| `RUA_BANCO` | Caminho do arquivo SQLite (padrão `<RUA_DADOS>/participantes.db`). |
| `RUA_ESCOLHER` | Palavras que a pessoa pega por etapa no modo ciclo (padrão 14; de 3 a conjunto − 3). |
| `RUA_PALAVRAS` | Quantas palavras entram na partida (padrão: a lista toda, 48; de 8 a 48). Menor que a lista: sorteia esse tanto por pessoa, repartido entre os quatro fatores (14 = 4, 4, 3 e 3), as mesmas nas duas etapas. |
| `RUA_MODO` | `pares` usa o formato antigo de duas palavras por portão; sem valor, usa o ciclo. |
| `RUA_PORTOES` | Só no modo `pares`: portões por etapa, de 6 a 24 (padrão 12). |
| `RUA_URL_PUBLICA` | Endereço público do jogo, usado no QR code (ex.: `https://jogo.exemplo.com.br`). Sem ela, o QR usa o IP do computador na rede. |

## Atenção: lista de palavras

`src/server/palavras.json` é a lista **rascunho** do sistema (48 palavras, 12 por fator), ainda **não validada
por profissional com formação em DISC**. Revise palavra por palavra antes de usar com candidato real. O formato
é `[{ "id": 1, "word": "Decidido", "code": "D" }, ...]`; precisa de pelo menos 12 palavras por fator para 12
portões por etapa.

## Estrutura

- `src/jogo/`: o jogo (three.js), copiado do sistema DISC. `entrada.js` é o ponto de entrada; recebe os portões e
  as funções `concluir` e `aoFinalizar`.
- `src/server/`: sorteio dos portões (`gameRound.ts`), pontuação, token, banco e lista de palavras.
- `src/lib/`: regras do número de WhatsApp e texto da mensagem (usadas no navegador e no servidor).
- `src/app/`: páginas e rotas da API. `src/components/Partida.tsx` conduz cadastro, jogo e envio.

Os animais do relatório usam ícones do Game Icons (game-icons.net), licença CC BY 3.0: mantenha o crédito.
