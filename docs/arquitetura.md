# Arquitetura

## Visão geral

```
Navegador (three.js)                 Servidor Next.js                    Banco
────────────────────                 ────────────────                    ─────
src/jogo/*.js   ── fetch ──────────► src/app/api/*  (route handlers)
src/components  ◄── token assinado ─ src/server/*   (regras e dados) ──► Turso (nuvem)
                                                                       └► SQLite (feira)
```

O servidor **não guarda a partida**: a rodada sorteada viaja no navegador dentro de um **token assinado (HMAC)**. Ao concluir, o servidor refaz a partida a partir das decisões e confere contra o token.

## Pastas

| Pasta | Conteúdo |
|---|---|
| `src/app/` | Páginas e rotas (App Router): `/`, `/e/[slug]`, `/e/[slug]/telao`, `/admin`, `/admin/jogo`, `/eventos`, `/whatsapp`, `/manual`, `/disc` e `api/*`. |
| `src/components/` | Componentes React das telas (partida, telão, painel da equipe, navbar etc.). |
| `src/jogo/` | Front do jogo em JavaScript: cena 3D (`game3d.js`), cenários (`cenarios.js`, `espaco.js`), modelos glTF (`modelos.js`), avatares, áudio, relatório e o ciclo de palavras (`ciclo.js`). |
| `src/server/` | Regras e acesso a dados, só no servidor. |
| `tests/` | Testes de unidade (Vitest). |
| `e2e/` | Testes de ponta a ponta e captura dos prints do manual (Playwright). |
| `scripts/` | `exportar.mjs` (CSV dos cadastros) e utilitários. |
| `public/` | Imagens do manual, modelos 3D e sons. |

## Módulos do servidor (`src/server/`)

| Arquivo | Responsabilidade |
|---|---|
| `palavras.ts` / `palavras.json` | Lista de 48 palavras com o fator DISC de cada uma. **Nunca sai do servidor.** |
| `gameRound.ts` | Modo "pares": duas palavras por portão, de fatores diferentes. |
| `ciclo.ts` | Modo "ciclo" (uma palavra por vez): sorteio das voltas e conferência. |
| `pontuacao.ts` | Percentual por fator a partir das palavras escolhidas. |
| `token.ts` | Assinatura e verificação do token da partida e do cookie da equipe. |
| `db.ts` | Acesso ao banco nos dois modos (Turso e SQLite), sempre assíncrono. |
| `eventos.ts` | Eventos: slug, ligar e desligar, contagem. |
| `envios.ts` | Resultados para a equipe enviar; prazo de 5 minutos para anônimos. |
| `totais.ts` | Contadores públicos do ranking. |
| `configuracao.ts` | Configuração editável do jogo: validar, salvar, restaurar. |
| `logo.ts` | Logo enviada pela equipe (PNG, JPEG ou WebP, até 1 MB). |
| `admin.ts` | Login da equipe e cookie de sessão. |
| `endereco.ts` / `enderecoAtual.ts` | Endereço do jogo para o QR code. |

## Decisões de projeto

- **Código compartilhado navegador/servidor.** `src/jogo/ciclo.js` é usado pelos dois: o navegador sabe qual palavra vem agora, o servidor refaz a partida e confere. Existe uma cópia dessas regras no projeto irmão em Laravel: mudou uma, mude a outra.
- **O fator DISC nunca vai ao navegador.** O cliente só recebe `id` e texto das palavras.
- **Sem estado de partida no servidor.** Token assinado, válido por 6 horas.
- **Dois bancos, uma interface.** Turso na Vercel (sem disco permanente) e SQLite na feira (sem depender da internet).
- **Cenário é só visual.** Cenário e meio de locomoção não alteram portões, ciclo nem pontuação.
- **Sem envio automático por WhatsApp.** Só a API paga da Meta permitiria; hoje a equipe toca em Enviar (`https://wa.me/55<número>?text=<mensagem>`).

## Projeto irmão (Laravel)

O mesmo jogo existe em Laravel. O front compartilhado (`game3d.js`, `cenarios.js`, `espaco.js`, `rua.css`, `avatars.js`, `audio.js`, `report.js`, `ciclo.js`) é o mesmo nos dois; só `entrada.js` e `animals.js` divergem. Ficam **só no Next**: cadastro opcional, ranking e telão, eventos, painel da equipe, envio de resultados, logo, Turso e Vercel.
