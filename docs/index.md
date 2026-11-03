# Teste de Perfil DISC · Documentação técnica

Jogo de escolhas do teste comportamental DISC do SENAC-MT (projeto **Rua das Palavras**), feito em **Next.js** com cenas em **three.js**. A pessoa percorre um cenário, escolhe palavras em cada portão e descobre o seu animal; a equipe envia o resultado pelo WhatsApp.

Esta documentação é para quem **desenvolve e opera** o sistema. Para quem joga ou aplica o teste, veja o manual em `/manual` dentro da própria ferramenta.

| Item | Valor |
|---|---|
| Produção | <https://rua-das-palavras.vercel.app> |
| Repositório | <https://github.com/VILLA-1984/disc> |
| Hospedagem | Vercel (publica sozinha a cada push na `main`) |
| Banco em produção | Turso (libSQL) |
| Banco na feira / local | SQLite embutido (`node:sqlite`), em `data/participantes.db` |
| Requisito | Node 24 ou superior |

## Mapa da documentação

- [Arquitetura](arquitetura.md): módulos, pastas e decisões de projeto.
- [Fluxo da partida](partida.md): do cadastro ao resultado, passo a passo.
- [Pontuação e ciclo de palavras](pontuacao.md): como o servidor monta e confere a partida.
- [API](api.md): rotas públicas e da equipe.
- [Dados e privacidade](dados.md): o que é gravado, onde e por quanto tempo.
- [Configuração](configuracao.md): variáveis de ambiente e painel.
- [Deploy e operação](deploy.md): Vercel, Turso e modo feira.
- [Testes](testes.md): unidade e ponta a ponta.
- [Metodologia DISC e referências](disc.md): base teórica e limites.

## Rodar localmente

```powershell
npm install
npm run dev            # http://localhost:3000
npm run build; npm start
npm test
```

## Esta documentação

Feita com [MkDocs](https://www.mkdocs.org/) e servida em `/docs`, **só para a equipe** (mesmo usuário e senha de `/admin`). Para ler e editar localmente:

```powershell
pip install -r requirements-docs.txt
mkdocs serve           # http://127.0.0.1:8000
npm run docs           # regenera docs-site/ (versionada)
```
