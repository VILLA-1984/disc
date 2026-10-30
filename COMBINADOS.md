# Combinados e configurações — Teste de Perfil DISC (Rua das Palavras)

Documento de referência do projeto **Next.js** (`C:\LENTAO\dotnetsite\diskrh\rua-das-palavras`): o que combinamos, como o
sistema está configurado e como trabalhar nele. Para o passo a passo de uso, veja `README.md` e o manual em `/manual`.

> **Este arquivo nunca leva senhas, tokens ou segredos.** Aqui só aparecem os *nomes* das variáveis de ambiente. Os valores
> ficam no `.env` local (fora do git) e no painel da Vercel.

Atualizado em 30/10/2026.

---

## 1. Onde as coisas estão

| O quê | Onde |
|---|---|
| Produção | https://rua-das-palavras.vercel.app |
| Código | https://github.com/VILLA-1984/disc.git, branch `main` (repositório **só do Next**) |
| Hospedagem | Vercel, projeto `rua-das-palavras` (publica sozinha a cada push na `main`) |
| Banco em produção | Turso (libSQL) |
| Banco na feira / local | SQLite embutido (`node:sqlite`), em `data/participantes.db` |
| Projeto irmão | `C:\LENTAO\dotnetsite\diskrh\disc` (Laravel), com o mesmo jogo em `resources/js/word-street/` |

---

## 2. Combinados de trabalho

1. **Toda melhoria do jogo vai para os dois projetos**: primeiro o Next.js (commit, push e deploy na Vercel), depois o
   Laravel (copiar o front compartilhado, `npm run build` e deploy por `scripts/deploy_ftp.py`).
   - Fica **só no Next**: cadastro opcional, ranking e telão, eventos, painel e área da equipe (`/admin`), envio de resultados
     (`/whatsapp`), logo, Turso e Vercel.
   - O front do jogo é o mesmo nos dois (`game3d.js`, `cenarios.js`, `espaco.js`, `rua.css`, `avatars.js`, `audio.js`,
     `report.js`, `ciclo.js`); só `entrada.js` e `animals.js` divergem.
2. **Só PowerShell** neste computador. Nunca reiniciar o Apache compartilhado.
3. **Nunca expor segredos** (senha da equipe, token do Turso, `RUA_SEGREDO`) em arquivos versionados, mensagens ou capturas.
4. **Testar antes de publicar**: testes de unidade, o teste de ponta a ponta da tela mexida, e *olhar* as capturas. Só então
   commit e push.
5. **Commit** em português, explicando o porquê, com a linha `Co-Authored-By` ao final.
6. **Manual sempre em dia**: quando uma tela ou um texto mudar, atualizar `src/app/manual/page.tsx` e regerar os prints
   (`node e2e/capturar-manual.mjs`).
7. **Combinado vale depois da confirmação**: mudança que apaga ou substitui algo que já funciona (por exemplo, trocar a logo
   em produção) é dita antes ou logo depois, nunca em silêncio.

### Princípios do teste

- O resultado é uma **leitura lúdica, não um diagnóstico**, baseada no DISC de quatro fatores (D, I, S, C).
- **Não se comparam pessoas** entre si: os percentuais mostram a proporção dentro de cada pessoa.
- A pontuação usa **só as palavras escolhidas**; o fator de cada palavra nunca sai do servidor.
- A lista de palavras ainda é rascunho, sem validação de profissional com formação em DISC.

### Privacidade (decidido)

- **As palavras escolhidas nunca são gravadas.** Guarda-se só um **resumo** do resultado (porcentagens por fator, natural e
  adaptado) para a equipe enviar.
- **Cadastro é opcional.** Quem se cadastra deixa nome e WhatsApp; quem não se cadastra não deixa dado pessoal.
- **Sem cadastro:** o jogador vê um ID (`ABC-123`) e o resultado é **apagado em 5 minutos**. O número que a equipe digita para
  enviar a um anônimo **nunca é gravado**.
- O ranking guarda só um código aleatório da partida, o evento e o animal. Nada identifica ninguém.
- É dado pessoal (LGPD): defina quem acessa o banco e por quanto tempo ele é mantido.

---

## 3. Regras decididas

### Eventos
- **O jogo nunca abre solto: toda partida pertence a um evento.** `POST /api/iniciar` sem evento responde 422; evento que não
  existe, 404; evento desligado, 409.
- A raiz `/` **não abre jogo**: só mostra a escolha entre os eventos ligados.
- Cada evento tem **endereço próprio** (`/e/<slug>`, gerado do nome; repetido ganha `-2`, `-3`), **QR code**, **ranking
  próprio**, **telão** e pode ser **ligado e desligado**. Renomear não muda o endereço.
- As partidas feitas antes dos eventos continuam contadas como "sem evento" (só histórico).
- O botão "Próxima pessoa" volta à abertura **do próprio evento**.

### Telão (`/e/<slug>/telao`, sem login)
- Ranking do evento em tela cheia, QR code do evento e, **de tempos em tempos, um animal em destaque com animação** (tubarão,
  águia, gato e lobo). Resultado novo ganha a tela na hora ("Mais um Gato!").
- `?intervalo=<segundos>` (5 a 300, padrão 20). Respeita `prefers-reduced-motion`.

### Envio dos resultados (`/whatsapp`)
- **Quem envia é a equipe**, não o jogador. O WhatsApp não permite envio automático sem a API paga da Meta: o botão abre a
  conversa com a mensagem pronta (`wa.me`) e a equipe toca em Enviar.
- **Com cadastro:** lista com número corrigível, abas A enviar / Enviados / Todos, busca, desfazer "enviado".
- **Sem cadastro:** cartão por ID com **barra de tempo por cima** (5 minutos), e botão **Descartar resultado**.
- O prazo é aplicado no servidor (resultado vencido nunca é devolvido; é apagado na próxima gravação ou consulta).

### Ranking na tela inicial
- Total geral no alto e, por animal, ícone, nome e quantidade, do maior para o menor (atualiza a cada 30 s). Liga e desliga
  nas configurações.

### Logo
- Opções fixas (`public/logo`): Genérica, Quatro animais, Senac e Fecomércio Sesc (horizontal e vertical), Senac, Senac
  branca (sobre faixa azul-marinho), mais **uma imagem enviada** e "Sem logo".
- Só PNG, JPEG ou WebP de até 1 MB, conferidos pelos bytes (**SVG é recusado de propósito**). "Voltar ao padrão" não mexe na
  logo.

### Cenários e meios
Rua · Rio (barco, veleiro, caiaque, moto aquática, boia de pato, nado) · Céu (avião, jato, helicóptero, asa delta, parapente)
· Neve (esqui, sit-ski, trenó) · Trilhos (locomotiva, draisina) · **Espaço** (nave, foguete, disco voador, astronauta).
O cenário é **só visual**: portões, ciclo, pontuação e relatório são os mesmos. Moto e táxi não vão para os cenários com
veículo; quem usa cadeira vai sem os apoios nos meios que pedem isso.

### Modo das placas
- **Uma palavra e "Deixar passar"** (ciclo, padrão): as palavras deixadas voltam em até 6 voltas; pega-se um número fixo por
  etapa (12 no padrão). Se o que resta é exatamente o que falta, entra sozinho.
- **Duas palavras, uma em cada placa** (escolha forçada): "palavras por etapa" vira "portões por etapa" (6 a 24).

---

## 4. Configurações

### Variáveis de ambiente
| Variável | Para quê |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Banco Turso (modo da Vercel). Sem elas, usa o SQLite local. |
| `RUA_SEGREDO` | Assina o token da partida e a sessão da equipe. **Obrigatória na Vercel** (não há disco gravável). |
| `USER_AREA_ADM`, `PASS_AREA_ADM` | Usuário e senha da equipe (`/admin`, `/eventos`, `/whatsapp`). **Sem as duas, a área fica desativada.** |
| `RUA_URL_PUBLICA` | Endereço real, usado nos QR codes quando está hospedado na internet. |
| `RUA_BANCO_LOCAL=1` | Força o SQLite local mesmo com as variáveis do Turso no `.env` (servidor da feira e testes). |
| `RUA_DADOS`, `RUA_BANCO` | Pasta de dados e arquivo do SQLite local (úteis nos testes, com pasta temporária). |
| `RUA_ESCOLHER`, `RUA_MODO` | Só o ponto de partida de "palavras por etapa" e do modo das placas, antes de alguém salvar em `/admin/jogo`. |
| `RUA_PALAVRAS` | Opcional: usa um conjunto menor de palavras. |

**Definidas na Vercel (produção):** `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `RUA_SEGREDO`, `USER_AREA_ADM`,
`PASS_AREA_ADM` (as sensíveis ficam ocultas). Para cadastrar outra: `npx vercel env add NOME production --sensitive`.

### Opções em `/admin/jogo` (valem na hora, para as próximas partidas)
- **Logo**: escolher entre as fixas, a enviada ou nenhuma.
- **Cenários e meios** liberados (a tela recusa combinações impossíveis) e **avatares** liberados.
- **O que aparece na tela**: total geral e ranking na tela inicial, painel de totais dentro do jogo, lista por perfil dentro do
  jogo, minimapa e barra de progresso.
- **Placas dos portões** (uma palavra + "Deixar passar", ou duas palavras) e **palavras (ou portões) por etapa**
  (6 a 36; 6 a 24 no modo de duas palavras; padrão 12).
- **Títulos e textos de explicação** editáveis, com "Restaurar o original" e "Mostrar", separados por modo das placas.

---

## 5. Mapa do sistema

### Telas
| Endereço | O que é | Acesso |
|---|---|---|
| `/` | Escolha do evento (só os ligados) | público |
| `/e/<slug>` | Jogo do evento (cadastro, partida, fim) | público |
| `/e/<slug>/telao` | Telão do evento | público |
| `/manual` | Manual de uso | público |
| `/admin` | Painel da equipe (resumo, áreas, links dos eventos ligados) | equipe |
| `/admin/jogo` | Configurações do jogo | equipe |
| `/eventos` | Criar, ligar/desligar e renomear eventos; links e QR codes | equipe |
| `/whatsapp` | Envio dos resultados (`/whatsaap` redireciona) | equipe |

A **navbar** da equipe (`src/components/NavAdmin.tsx`) tem Início, Configurações, Eventos, Envio de resultados, Abrir o jogo,
Manual e Sair, com menu sanduíche até 1100 px. A sessão da equipe vale 8 horas e é a mesma em todas as telas.

### APIs
Públicas: `POST /api/iniciar`, `POST /api/concluir`, `GET /api/totais[?evento=<slug>]`, `GET /api/logo`.
Só com a sessão da equipe: `POST /api/admin/login|sair|config|logo`, `GET/POST/PATCH /api/admin/eventos`,
`GET/POST/DELETE /api/admin/envios`.

### Banco (tabelas)
`participantes` · `partidas_contadas` (com `evento_id`) · `configuracoes` (chaves `jogo`, `logo`, `logo_escolha`) ·
`resultados_envio` · `eventos`. Um banco antigo ganha as colunas novas sozinho, sem perder dados.

---

## 6. Como rodar e testar

```powershell
$env:Path = 'C:\LENTAO\node;' + $env:Path          # Node 24
npm test                                            # testes de unidade
npx tsc --noEmit                                    # tipos
npm run build; npm start                            # produção local
npm run feira                                       # estande: porta 3000, aberta à rede
```

**Teste de ponta a ponta** (servidor no ar em `http://127.0.0.1:3100`, de preferência com banco temporário):

```powershell
$env:RUA_DADOS = "$env:TEMP\rua-teste"; $env:RUA_BANCO_LOCAL = '1'
npx next start -p 3100
node e2e/admin.mjs      # configurações, logo, ranking, modo das placas
node e2e/envios.mjs     # /whatsapp
node e2e/eventos.mjs    # eventos e telão
node e2e/navegacao.mjs  # painel e navbar (desktop e celular)
node e2e/espaco.mjs     # cenário do espaço
node e2e/partida.mjs [pasta] [3d|lateral] [anonimo]   # partida completa (~10 min, WebGL por software)
node e2e/capturar-manual.mjs                          # regera os prints do manual
```

Os testes precisam de `USER_AREA_ADM` e `PASS_AREA_ADM` no `.env` e criam o próprio evento de teste (`e2e/comum.mjs`).
Cuidado: com `RUA_BANCO_LOCAL=1` definido no ambiente, os testes de unidade do modo Turso não se confundem (eles limpam a
variável), mas rode o servidor de teste em outra sessão para não misturar.

---

## 7. Publicar

1. `npm test` e `npx tsc --noEmit` sem erro; rodar o e2e da tela mexida.
2. `git add` dos arquivos da mudança (nunca `.env`, `data/` nem `.vercel/`), `git commit`, `git push origin main`.
3. A Vercel publica sozinha (cerca de 20 segundos). Conferir: `npx vercel ls --yes` (status `Ready`) e abrir a rota alterada.
4. Banco novo ou coluna nova: a migração roda sozinha na primeira abertura (conferido no Turso).
5. Depois, levar a melhoria do **jogo** para o Laravel (combinado 1).

---

## 8. Pendências e ideias combinadas

- [ ] **Publicar o cenário do espaço no Laravel (PANDORA).** O código já está no Laravel (commit `1d5672f`, branch
      `feature/rua-das-palavras`), com os testes JS e PHP do jogo e o build do Vite passando. Falta só o deploy em produção:
      `python scripts/deploy_ftp.py --skip-manual-update 27ba94e 1d5672f` (envia também `public/build`). O deploy em produção
      pede a liberação do usuário.
- [ ] Imagem da tela do **ID** (jogador sem cadastro) no manual.
- [ ] Filtrar a lista de `/whatsapp` por evento.
- [ ] Imagens do manual: regerar sempre que uma tela mudar.
- [ ] Regra "todas as palavras aparecem antes de repetir" na 1ª volta: hoje vale só se a pessoa não completar as pegas antes
      (corrigir exige a mesma mudança no PHP, `App\Services\WordCycle`).
