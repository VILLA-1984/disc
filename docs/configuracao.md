# Configuração

Todas as variáveis são opcionais, exceto as indicadas para a Vercel. Modelo em `.env.example`; o `.env` fica fora do git.

| Variável | Para quê |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Banco no Turso (obrigatórias na Vercel). Sem elas, usa o SQLite local. |
| `RUA_BANCO_LOCAL` | `1` força o SQLite local mesmo com as variáveis do Turso. |
| `RUA_SEGREDO` | Segredo da assinatura do token. Sem ela, é gerado em `data/.segredo`. Com mais de uma instância, use o mesmo valor em todas. |
| `RUA_DADOS` | Pasta dos dados (padrão `./data`). |
| `RUA_BANCO` | Caminho do arquivo SQLite (padrão `<RUA_DADOS>/participantes.db`). |
| `USER_AREA_ADM`, `PASS_AREA_ADM` | Usuário e senha da equipe. **Sem os dois, a área fica desativada.** |
| `RUA_URL_PUBLICA` | Endereço público do jogo, usado no QR code. Sem ela, usa o IP do computador na rede. |
| `RUA_ESCOLHER` | Valor inicial de "palavras por etapa" enquanto nada foi salvo (padrão 12). |
| `RUA_PALAVRAS` | Quantas palavras entram na partida (8 a 48; padrão: todas). |
| `RUA_MODO` | `pares` = duas palavras por portão como valor inicial; sem valor, ciclo. |
| `RUA_PORTOES` | **Não é mais usada**; vem de `/admin/jogo`. |

!!! danger "Segredos"
    Nunca versione nem exponha a senha da equipe, o token do Turso ou `RUA_SEGREDO`.

## Configuração pelo painel (`/admin/jogo`)

Salva no banco e vale para a instalação onde foi feita (feira e Vercel **não** compartilham):

- Logo; cenários e meios liberados; avatares liberados (combinações impossíveis são recusadas).
- **Avatares:** cada um aparece no painel com o **ícone** (o mesmo da tela de escolha) e um campo para **trocar o nome** mostrado na escolha (até 24 caracteres; em branco mantém o original). Os nomes trocados ficam em `nomesAvatares` (id → nome) na configuração; os blocos Humanos e Cartun aparecem marcados com a origem.
- Ranking, minimapa, barra de progresso e painel de totais.
- Palavras por etapa (6 a 36, padrão 15) e modo das placas (ciclo ou pares; padrão pares).
- **Força do turbo** (1 a 3 vezes a velocidade normal, padrão 2,5): quanto mais rápido o avatar chega ao próximo portão enquanto se segura acelerar. Com 1 o turbo não acelera. Parâmetro de teste: `?turbo=2.5` na URL.
- **Treino antes do jogo** (liga e desliga, desligado por padrão): ao ligar, a pessoa faz um treino de 8 portões (duas etapas de 4) com palavras de exemplo, e só depois o jogo valendo. Textos editáveis em "Títulos e textos". Parâmetro de teste: `?treino=1` liga e `?treino=0` desliga, qualquer que seja o painel.
- Animais na corrida (liga e desliga, ligados por padrão) e de quantas em quantas palavras pegas eles aparecem (3 a 8, padrão 3) e por quantos segundos ficam na tela (2 a 8, padrão 4,5).
- Títulos e textos de explicação (15 itens).

A validação é feita no servidor (`src/server/configuracao.ts`). Se o que está salvo ficar inválido, o jogo usa o padrão de fábrica em vez de quebrar. "Voltar ao padrão" apaga o que foi salvo (a logo não é afetada).
