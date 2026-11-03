# Deploy e operação

## Vercel (produção)

Projeto `rua-das-palavras`, ligado a `VILLA-1984/disc`, branch `main`. **Cada push na `main` publica sozinho**; outras branches e pull requests ganham endereço de pré-visualização.

1. Em **Settings → Environment Variables**, cadastre `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `RUA_SEGREDO`, `USER_AREA_ADM` e `PASS_AREA_ADM`. Opcional: `RUA_URL_PUBLICA`. **Não** defina `RUA_BANCO_LOCAL`.
2. Faça novo deploy depois de cadastrar as variáveis.
3. Confira jogando uma partida e rodando `npm run exportar`.

O `next.config.mjs` mantém `@libsql/client` e `libsql` fora do pacote do servidor (`serverExternalPackages`), por trazerem binários nativos.

## Antes de publicar

1. `npm run build`
2. `npm test`
3. O teste de ponta a ponta da tela mexida (`e2e/`), olhando as capturas.
4. Commit em português explicando o porquê, depois push.

## Modo feira (estande)

```powershell
npm run feira   # compila e sobe na porta 3000, acessível na rede (-H 0.0.0.0)
```

Crie o evento em `/eventos` e abra `/e/<evento>` no computador do estande. O QR code usa o IP do computador na rede. Celular e computador precisam estar na **mesma rede Wi-Fi**, e o Windows precisa permitir o Node.js na rede privada. Redes de eventos costumam isolar aparelhos: teste antes ou leve um roteador próprio.

## Manual de uso

Fica em `/manual` (`src/app/manual/page.tsx`); os prints, em `public/manual/`. Quando uma tela mudar, regenere os prints:

```powershell
# com o servidor no ar e RUA_DADOS apontando para uma pasta temporária
node e2e/capturar-manual.mjs
```

## Esta documentação

Os arquivos ficam em `docs/` e a configuração em `mkdocs.yml`. `mkdocs build` gera a pasta `site/` (não versionada), que pode ser publicada em qualquer hospedagem estática.
