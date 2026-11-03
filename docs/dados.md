# Dados e privacidade

Os dados de quem se cadastra são **pessoais (LGPD)**.

## O que é gravado

| Dado | Quando | Onde |
|---|---|---|
| Nome e WhatsApp | Só de quem escolhe receber o resultado | Tabela de participantes |
| Resumo do resultado (porcentagens por fator, natural e adaptado) | Ao concluir | Ligado ao cadastro; para anônimos, só com um ID |
| Código aleatório da partida, evento e animal | Ao concluir | `partidas_contadas` |
| Configuração do jogo (sem dados pessoais) | Ao salvar em `/admin/jogo` | `configuracoes` (uma linha JSON) |
| Eventos | Ao criar | Tabela de eventos |
| Logo | Ao enviar | Mesmo banco, linha própria |

## O que **nunca** é gravado

- **As palavras escolhidas.** Só o resumo.
- O número de WhatsApp digitado pela equipe para enviar a um anônimo (serve só para abrir a conversa).
- Qualquer dado que identifique alguém no ranking.

## Anônimos

Quem joga sem cadastro recebe um ID (`ABC-123`) e o resultado é **apagado em 5 minutos** (`TEMPO_ANONIMO_MS`). O prazo é aplicado no servidor: o resultado vencido nunca é devolvido e é apagado na próxima gravação ou consulta, pois **não há rotina agendada** (a Vercel não tem).

## Bancos

- **Turso (libSQL):** quando `TURSO_DATABASE_URL` existe. Modo da Vercel. Dados em serviço de nuvem fora do Brasil, na região indicada na URL.
- **SQLite embutido:** `data/participantes.db`, criado sozinho. Modo da feira. `RUA_BANCO_LOCAL=1` força este modo.

`data/` não é versionada. Faça backup se os cadastros importarem. Exportar: `npm run exportar > participantes.csv`.

!!! warning
    Defina quem acessa o banco e por quanto tempo os cadastros são mantidos.

## Migração

O banco ganha colunas novas sozinho (por exemplo `evento_id`), sem perder dados. Partidas antigas, de antes dos eventos, contam como "sem evento".
