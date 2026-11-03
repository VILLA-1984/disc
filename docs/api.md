# API

Todas as rotas ficam em `src/app/api/`.

## Públicas

| Método e rota | Função | Respostas notáveis |
|---|---|---|
| `POST /api/iniciar` | Inicia a partida e devolve palavras (id e texto) e o token. | 409 evento desligado · 422 sem evento · 404 evento inexistente |
| `POST /api/concluir` | Confere as escolhas, pontua, conta e guarda o resumo. | Rejeita token inválido ou vencido |
| `GET /api/totais?evento=<slug>` | `{ total, animais: [{ chave, nome, cor, total }] }`. Sem cache, só contadores. | |
| `GET /api/logo` | Imagem da logo atual. Com `?v=<versão>` é cacheada por um ano; sem, não. | 404 sem logo |

## Da equipe (exigem a sessão do `/admin`)

| Método e rota | Função |
|---|---|
| `POST /api/admin/login` | Entrar. Cookie assinado `rua_admin`, válido por 8 horas. |
| `POST /api/admin/sair` | Encerrar a sessão. |
| `POST /api/admin/config` | Corpo `{ config }` salva; `{ restaurar: true }` volta ao padrão. Validação no servidor (422 se inválida). |
| `GET /api/admin/eventos` | Lista os eventos. |
| `POST /api/admin/eventos` | Cria um evento. |
| `PATCH /api/admin/eventos` | Renomeia, liga ou desliga. |
| `GET /api/admin/envios` | Lista os resultados a enviar. |
| `POST /api/admin/envios` | Corpo com `acao`: `enviado` (marca ou desfaz) ou `whatsapp` (corrige o número). |
| `DELETE /api/admin/envios` | Descarta um resultado anônimo. |
| `POST /api/admin/logo` | Envia uma logo. |
| `PUT /api/admin/logo` | Escolhe qual logo fica em uso (`{ escolha }`). |
| `DELETE /api/admin/logo` | Remove a logo enviada. |

## Segurança das rotas da equipe

- Login por usuário e senha do super admin (`USER_AREA_ADM`, `PASS_AREA_ADM`). **Sem as duas variáveis, a área fica desativada.** Sem sessão: 401.
- A comparação de credenciais é em tempo constante e as duas são sempre conferidas, para não revelar qual errou.
- `origemConfiavel()` confere a origem do pedido nas escritas (403 se não confere).
- O cookie é assinado com HMAC; `ehHttps()` decide o atributo `Secure`.
- Logo: o formato é conferido pelos **bytes** do arquivo, e SVG é recusado por poder carregar scripts. A resposta de `GET /api/logo` leva `Content-Security-Policy: default-src 'none'; sandbox`.
