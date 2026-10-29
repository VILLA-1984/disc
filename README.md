# Rua das Palavras

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

## O que fica salvo

Só **nome e WhatsApp** (SQLite embutido em `data/participantes.db`, criado sozinho) e as datas de cadastro e
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

## Configuração (variáveis de ambiente, todas opcionais)

| Variável | Para quê |
|---|---|
| `RUA_SEGREDO` | Segredo da assinatura do token. Sem ela, é gerado em `data/.segredo`. Em produção com mais de uma instância, defina a mesma em todas. |
| `RUA_DADOS` | Pasta dos dados (padrão `./data`). |
| `RUA_BANCO` | Caminho do arquivo SQLite (padrão `<RUA_DADOS>/participantes.db`). |
| `RUA_PORTOES` | Portões por etapa, de 6 a 24 (padrão 12). |
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
