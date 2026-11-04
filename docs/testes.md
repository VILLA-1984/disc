# Testes

## Unidade (Vitest)

```powershell
npm test
```

Ficam em `tests/` e cobrem: sorteio e rodada (`gameRound`), ciclo, armazenamento e migração do banco, configuração, eventos, envios, totais, logo, endereço e mensagem de WhatsApp.

## Ponta a ponta (Playwright)

Com o servidor no ar em `RUA_URL` (padrão `http://127.0.0.1:3100`). **Suba o servidor com `npm run teste:servidor`** (depois de `npm run build`): ele usa um banco SQLite temporário e ignora o Turso do `.env`. Os roteiros criam eventos e salvam configurações, e com `npm start` comum eles gravariam no banco de produção.

```powershell
node e2e/partida.mjs [pasta] [3d|lateral]
```

Há roteiros por área em `e2e/`: `admin`, `envios`, `eventos`, `navegacao`, `mobile`, `rio`, `trilhos`, `espaco`. As capturas vão para `e2e/capturas/` (fora do git) e devem ser **olhadas**, não só executadas.

## Painel de desempenho

O parâmetro `?fps=1` na URL do jogo mostra o painel de FPS, útil para testar modelos glTF e cenários pesados.
