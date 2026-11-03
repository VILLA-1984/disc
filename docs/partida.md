# Fluxo da partida

```
1. Abertura do evento  ──►  2. POST /api/iniciar  ──►  3. Jogo (2 etapas)  ──►  4. POST /api/concluir
   /e/<slug>                  valida, monta portões,      escolhas no navegador      confere, pontua, conta,
                              devolve token               (token guardado)           guarda o resumo
```

## 1. Abertura

Toda partida pertence a um **evento**. A raiz `/` só oferece a escolha do evento; o link e o QR code de cada evento levam direto a `/e/<slug>`. A pessoa escolhe se quer receber o resultado pelo WhatsApp.

## 2. `POST /api/iniciar`

- Com cadastro: valida nome e WhatsApp e grava o participante.
- Sem cadastro: corpo `{ anonimo: true }`; o token leva participante `0`.
- Sem evento responde **422**; evento inexistente, **404**; evento desligado, **409**.
- Monta os portões no servidor e devolve **só id e texto** das palavras, mais o **token assinado** com a rodada, o evento e o participante.

## 3. Jogo

São duas etapas com as mesmas palavras e perguntas diferentes (natural × adaptado). O modo das placas vem da configuração:

- **Ciclo** (padrão): uma palavra por portão, a pessoa pega ou deixa passar. Veja [Pontuação e ciclo](pontuacao.md).
- **Pares**: duas palavras por portão, uma em cada placa (escolha forçada).

## 4. `POST /api/concluir`

1. Verifica a assinatura e a validade do token (6 horas).
2. Refaz a partida a partir das decisões e confere com a rodada assinada.
3. Calcula os percentuais por fator e resolve o animal.
4. Conta a partida em `partidas_contadas` (o código aleatório `n` do token impede contar duas vezes). Falha do contador **não** atrapalha o resultado.
5. Guarda o **resumo** (porcentagens, sem as palavras) para a equipe enviar.

Quem se cadastrou vê que a equipe enviará ao WhatsApp informado (só DDD e 4 últimos dígitos aparecem). Quem jogou sem cadastro recebe um **ID** (`ABC-123`) e tem 5 minutos. **O jogador não envia nada pelo próprio celular.**

## Telão

`/e/<slug>/telao` é uma página pública só de exibição: ranking do evento e QR code, atualizando a cada 5 segundos, com um animal ganhando a tela de tempos em tempos (`?intervalo=<5 a 300>`, padrão 20).
