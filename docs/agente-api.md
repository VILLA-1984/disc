# API compartilhada do agente

O agente **Gerador de APIs REST** gera texto e codigo. Para executar uma acao em um sistema externo, e necessario adicionar uma ferramenta/conector ao agente e definir as permissoes dessa acao. Esta integracao nao executa o codigo gerado.

A API pode ser chamada pelo backend de qualquer projeto, em qualquer linguagem, por HTTP. O endereco pode ser o deste servidor ou de uma instalacao separada. Os projetos clientes nao precisam usar Next.js nem receber o segredo da Microsoft. Cada projeto tem sua chave; a sessao de um projeto nao funciona com a chave de outro.

## Servidor e credenciais

Os valores reais ficam no `.env`, ignorado pelo Git. `.env.example` documenta somente os nomes:

| Variavel | Funcao |
|---|---|
| `COPILOT_DIRECT_LINE_SECRET` | Segredo do canal Direct Line, exclusivo do servidor central. |
| `COPILOT_DIRECT_LINE_URL` | Base HTTPS do Direct Line, padrao `https://directline.botframework.com/v3/directline`. |
| `COPILOT_SESSAO_SEGREDO` | Chave aleatoria de 32 bytes em hexadecimal, para AES-256-GCM. Troca invalida sessoes existentes. |
| `AGENTE_CHAVES` | Objeto JSON `{"projeto":"chave-aleatoria-com-pelo-menos-32-caracteres"}`. |
| `AGENTE_LIMITE_MINUTO` | Limite de requisicoes por projeto/minuto, contando POST e GET. Padrao 60. |

Para criar a chave de outro projeto, execute `node scripts/agente-chave.mjs meu-outro-projeto`. Ela sera acrescentada ao `.env`, sem imprimir o segredo. Copie **apenas a chave desse projeto** para o `.env` do backend cliente, por exemplo em `AGENTE_API_KEY`. Use `AGENTE_API_URL` no cliente para guardar o endereco completo `/api/agente` do servidor central. Reinicie o servidor depois de mudar as variaveis.

Em producao, configure as mesmas variaveis no ambiente da hospedagem. No Vercel, o `.env` local nao e enviado: cadastre as variaveis no projeto e use Turso conforme a configuracao existente, para o limite ser compartilhado. Localmente o contador usa SQLite. O limite e uma janela fixa de um minuto, nao uma cota financeira ou garantia de isolamento de custos. Revogue uma chave removendo seu projeto de `AGENTE_CHAVES` e reiniciando/republicando o servidor.

No Copilot Studio, o login individual fica desativado e **Exigir acesso seguro** fica habilitado no canal Web/Direct Line. Esse ajuste pode levar ate duas horas para propagar. Nunca distribua o segredo Direct Line aos projetos clientes. Nao use prefixo `NEXT_PUBLIC_` nem coloque chaves no JavaScript publico. A API nao libera CORS: aplicativos web a chamam pelo proprio backend, onde a chave permanece protegida. Aplicativos distribuidos tambem devem usar um backend, pois chaves embutidas no executavel podem ser extraidas.

## Enviar: POST /api/agente

Cabecalhos:

```http
Authorization: Bearer CHAVE_DO_PROJETO
Content-Type: application/json
```

```json
{ "mensagem": "Gere uma API REST de produtos em TypeScript" }
```

Resposta HTTP **202**: o envio foi aceito e a resposta sera recebida por consulta. `sessao` e um valor opaco, criptografado, que deve ser tratado como credencial temporaria.

```json
{
  "estado": "aguardando",
  "envioId": "identificador-do-envio",
  "sessao": "sessao-opaca",
  "consultarAposSegundos": 2
}
```

## Receber: GET /api/agente

Use a mesma chave e envie `X-Agente-Sessao: sessao-opaca`. Nao coloque a sessao na URL. Consulte a cada dois segundos, substituindo a sessao pelo novo valor recebido **em toda resposta**, inclusive 202.

HTTP **202** significa que nao ha mensagens novas; HTTP **200** retorna mensagens:

```json
{
  "estado": "mensagens_recebidas",
  "resposta": "Codigo e explicacao produzidos pelo agente",
  "mensagens": [{ "id": "id-da-resposta", "texto": "Codigo e explicacao produzidos pelo agente", "anexos": [] }],
  "sessao": "nova-sessao-opaca",
  "consultarAposSegundos": 2
}
```

O agente pode enviar varias mensagens para um unico pedido. `200` confirma mensagens recebidas, **nao o fim de todas as mensagens do turno**. Continue consultando se precisar de mensagens adicionais. Consuma os IDs para evitar duplicatas ao recuperar uma chamada perdida. Para continuar a conversa, envie novo POST com `{ "mensagem": "...", "sessao": "ultimo-valor" }`. Use uma sessao por conversa/usuario; nao envie mensagens ou consultas concorrentes para a mesma sessao, para preservar o cursor de recebimento. Sessoes ativas sao renovadas perto do vencimento; depois de expiradas, inicie nova conversa.

As respostas nao seguem o formato `chat/completions` da OpenAI. `resposta` e texto do modelo, sem garantia de ser JSON valido. Se o texto for usado como JSON ou codigo, valide-o antes de processar/executar.

## Exemplo Node.js / Next.js (backend)

O cliente sem dependencias `integracoes/cliente-agente.mjs` pode ser copiado para outro projeto. Ele espera ate a primeira mensagem, por ate um minuto; se ainda estiver aguardando, retorna a sessao para continuar as consultas.

```js
import { conversar } from './integracoes/cliente-agente.mjs';

const resultado = await conversar({
  url: process.env.AGENTE_API_URL,
  chave: process.env.AGENTE_API_KEY,
  mensagem: 'Gere GET /api/health em TypeScript com Next.js App Router',
});
// resultado.resposta, resultado.mensagens, resultado.sessao
```

## Exemplo Python (backend, biblioteca padrao)

```python
import json, os, urllib.request

url = os.environ['AGENTE_API_URL']
headers = {
    'Authorization': 'Bearer ' + os.environ['AGENTE_API_KEY'],
    'Content-Type': 'application/json',
}
pedido = urllib.request.Request(url, data=json.dumps({
    'mensagem': 'Gere uma API REST de produtos em Python'
}).encode(), headers=headers, method='POST')
with urllib.request.urlopen(pedido, timeout=45) as resposta:
    enviada = json.load(resposta)

# Aguarde dois segundos e repita GET enquanto nao houver mensagens.
headers['X-Agente-Sessao'] = enviada['sessao']
with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=20) as resposta:
    recebida = json.load(resposta)
# Use recebida['sessao'] na consulta seguinte.
```

## Erros e operacao

- **400/413/415/422:** sessao ou JSON invalidos, corpo acima de 64 KiB, formato incorreto ou mensagem fora de 1 a 8000 caracteres.
- **401:** chave ausente ou incorreta.
- **410:** sessao vencida; crie nova conversa.
- **429:** limite por projeto. Respeite `Retry-After`.
- **502:** falha no provedor ou resultado incerto. Um POST pode ter sido recebido mesmo se houve timeout. **Nao reenvie POST automaticamente**; com uma sessao existente, consulte as mensagens antes. Em primeira conversa cujo POST falhou, nao ha recuperacao automatica nem garantia de idempotencia.
- **503:** configuracao, banco, capacidade ou integracao indisponiveis.

Nao armazene prompts, sessoes ou respostas em logs publicos. O contador local guarda somente projeto/janela/numero de chamadas; o processamento e o historico do agente continuam sujeitos as configuracoes do Copilot Studio.

Documentacao Microsoft: [seguranca do canal](https://learn.microsoft.com/en-us/microsoft-copilot-studio/configure-web-security) e [integracao de aplicativos](https://learn.microsoft.com/en-us/microsoft-copilot-studio/publication-connect-bot-to-custom-application).
