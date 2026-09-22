# Backend — integração com o Data Agent

Serviço FastAPI que recebe perguntas do frontend e as encaminha ao Data Agent do
Microsoft Fabric pelo protocolo MCP. Este documento cobre as bibliotecas usadas e
como a conexão com o MCP funciona.

Para subir o projeto inteiro, veja [DOCKER.md](../../DOCKER.md). Para o panorama do
produto, [README.md](../../README.md).

## Bibliotecas

| Lib | Para quê | Limite declarado |
| --- | --- | --- |
| `fastapi[standard]` | API HTTP (`main.py`), validação dos payloads com Pydantic | `>=0.141.1,<1` |
| `uvicorn` | Servidor ASGI — é o que o `CMD` do Dockerfile invoca | `>=0.30,<1` |
| `azure-identity` | `ClientSecretCredential`, que troca as credenciais do service principal por um token do Fabric | `>=1.25,<2` |
| `mcp` | Cliente do protocolo MCP: handshake, descoberta da ferramenta e chamada | `>=2.0,<3` |
| `httpx2` | Cliente HTTP que o `mcp` 2.x exige. **Não é o `httpx`** | `>=2.5,<3` |
| `python-dotenv` | Carrega o `.env` em desenvolvimento | `>=1.0,<2` |

Versões resolvidas na imagem hoje: `fastapi` 0.141.1, `uvicorn` 0.53.0,
`azure-identity` 1.25.3, `mcp` 2.2.0, `httpx2` 2.13.0, `python-dotenv` 1.2.3.

### Onde as dependências moram

Só no `pyproject.toml`. O Dockerfile instala a partir dele, com `uv`:

```dockerfile
COPY pyproject.toml ./
RUN pip install --no-cache-dir uv==0.9.29 \
    && uv pip install --system --no-cache -r pyproject.toml \
    && pip uninstall -y uv
```

Antes existiam duas listas — o `pyproject.toml` declarava três dependências e o
Dockerfile instalava cinco, com um `pip install` escrito à mão. Elas divergiram: o
código importava `httpx` e `python-dotenv` sem que os dois estivessem declarados,
funcionando só porque vinham de carona do `fastapi[standard]`. Ao adicionar uma
biblioteca, adicione apenas no `pyproject.toml`.

O `requirements.txt` no diretório é um `pip freeze` de um ambiente **Windows** — tem
`pywin32`, `pyinstaller` e outros pacotes que não instalam em Linux. Ele está no
`.dockerignore` e não participa do build. Não use como referência.

### Por que os limites superiores importam

O `mcp` quebrou a API entre 1.x e 2.x:

| | `mcp` 1.x | `mcp` 2.x (em uso) |
| --- | --- | --- |
| Função do transporte | `streamablehttp_client` | `streamable_http_client` |
| Como passar auth | `headers=...` | `http_client=...` |
| Retorno | 3 valores | 2 valores |
| Schema da ferramenta | `tool.inputSchema` | `tool.input_schema` |
| Erro na resposta | `result.isError` | `result.is_error` |

O código usa a forma 2.x. Sem o `<3` — e antes o limite era um `>=1.0.0` aberto — um
rebuild poderia resolver para uma versão incompatível e quebrar em produção sem que
nada no repositório tivesse mudado.

### A pegadinha do `httpx` vs `httpx2`

O `mcp` 2.x não depende do `httpx`: depende do **`httpx2`**, que é um pacote
diferente. A assinatura do transporte deixa isso explícito:

```python
streamable_http_client(url, *, http_client: httpx2.AsyncClient | None = None, ...)
```

Internamente o SDK constrói `httpx2.EventSource` e `httpx2.Headers` sobre as respostas
desse cliente. Passar um `httpx.AsyncClient` é misturar dois pacotes distintos — a
conexão até abre, mas não é um caminho suportado. Por isso o
[`azure_integration.py`](service/azure_integration.py) importa `httpx2`.

Os dois pacotes coexistem no ambiente, porque o `fastapi[standard]` traz o `httpx`
para o `TestClient`. Um `import httpx` passa sem erro e o engano não aparece de cara.

### Atenção ao seguir a documentação oficial

A [doc do MCP server no Learn](https://learn.microsoft.com/en-us/fabric/data-science/data-agent-mcp-server)
mostra os exemplos na API do `mcp` **1.x** (`streamablehttp_client(url, headers=...)`
com retorno de 3 valores, `tool.inputSchema`, `block.type`). O código deste repositório
está na 2.x e é o que está correto para a versão instalada. Ajustar o código para
"bater com a documentação" o quebra.

## A conexão com o MCP

### Endpoint

```
https://api.fabric.microsoft.com/v1/mcp/workspaces/{WorkspaceId}/dataagents/{DataAgentId}/agent
```

A URL só responde depois que o Data Agent é **publicado** no Fabric. Antes disso
retorna erro mesmo estando correta. Os valores também aparecem prontos em
Settings → Model Context Protocol, na tela do agente.

### Autenticação

Client credentials: `ClientSecretCredential` troca `AZURE_TENANT_ID`,
`AZURE_CLIENT_ID` e `AZURE_CLIENT_SECRET` por um token no escopo
`https://api.fabric.microsoft.com/.default`, enviado como `Authorization: Bearer` em
toda requisição. O service principal precisa de acesso ao workspace e ao agente.

O token fica em cache no processo e é renovado com 5 minutos de folga antes de expirar
(`get_fabric_token`). Como `get_token` faz I/O bloqueante, ele é chamado via
`asyncio.to_thread` para não travar o event loop do FastAPI.

O endpoint **não** suporta dynamic client registration nem client identity metadata —
o cliente tem que obter o token por conta própria, como é feito aqui.

### O fluxo de uma pergunta

O endpoint não é REST: não adianta mandar um POST com a pergunta. É preciso cumprir o
protocolo, e é isso que o SDK faz por baixo:

```
1. initialize   — handshake do MCP
2. tools/list   — descobre a ferramenta que o agente expõe (é sempre uma só)
3. tools/call   — envia a pergunta e recebe a resposta em markdown
```

O nome da ferramenta e o nome do argumento **não são hardcoded**: o código lê a
primeira ferramenta anunciada e tira o argumento do `input_schema` dela, preferindo o
campo listado em `required`. Hoje o argumento se chama `userQuestion`, mas se o Fabric
renomear, a integração continua funcionando.

### O agente não tem memória

Cada `tools/call` é independente. O MCP não tem o equivalente aos *threads* que a
Assistants API oferecia, então o agente não lembra nada da pergunta anterior.

Quem resolve isso é o `build_prompt`: ele concatena o histórico do chat dentro da
própria pergunta, com um rótulo de papel por mensagem e uma instrução para o agente
usar aquilo só como contexto. É o que faz um follow-up como "detalha o item 3"
funcionar.

Como as respostas do agente costumam vir com milhares de caracteres, o histórico é
podado antes de ser enviado — senão o prompt cresce sem limite a cada turno:

| Variável | Padrão | O que faz |
| --- | --- | --- |
| `FABRIC_MAX_HISTORY_MESSAGES` | `6` | Quantas mensagens anteriores entram |
| `FABRIC_MAX_HISTORY_CHARS_PER_MESSAGE` | `1500` | Corte por mensagem |

Sem histórico, a pergunta vai intacta.

### Perguntas longas

Uma pergunta que varre tabelas grandes ou dispara várias queries pode demorar mais do
que um proxy ou balanceador mantém a conexão aberta.

A especificação do MCP prevê a extensão `io.modelcontextprotocol/tasks` justamente
para isso: o servidor devolve um identificador na hora e o cliente busca o resultado
depois com `tasks/get`, sobrevivendo a quedas de conexão. O Fabric suporta.

**O SDK `mcp` 2.2.0 ainda não implementa** — não há `tasks/get` nem `tasks/cancel` no
pacote. Então o único controle disponível hoje é o timeout, configurável por
`FABRIC_TIMEOUT_SECONDS` (padrão 600s, com 30s para conexão). Se perguntas pesadas
começarem a estourar esse limite, a saída é implementar o protocolo de tasks à mão ou
aguardar o suporte no SDK.

## Por que MCP, e não o SDK Python

A Microsoft documenta um segundo caminho, o
[client SDK Python](https://learn.microsoft.com/en-us/fabric/data-science/consume-data-agent-python),
com um `FabricDataAgentClient`. Ele **não é uma alternativa viável**:

- É construído sobre a **OpenAI Assistants API** (`beta.assistants`, `beta.threads`,
  `beta.threads.runs`), que a OpenAI desligou em **26 de agosto de 2026**. A própria
  documentação abre recomendando migrar para o endpoint MCP.
- Nunca foi um pacote no PyPI — o `FabricDataAgentClient` é um arquivo `.py` que se
  copia de um repositório de exemplo, o que exigiria vendorizá-lo na imagem.

Sobre desempenho, os dois caminhos batiam no mesmo agente: o que domina a latência é o
trabalho dele (planejar, gerar o SQL, executar contra o OneLake, redigir a resposta),
não o transporte. A qualidade da resposta é idêntica pelo mesmo motivo. A única
diferença real era a favor do SDK antigo — os *threads*, ou seja, estado de conversa
no servidor — e é exatamente o que o `build_prompt` compensa.

## Rodando

Health check local, que faz uma consulta real ao agente:

```bash
python -m service.azure_integration
```

O serviço:

```bash
uvicorn main:app --reload
```

Requer um `.env` com `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` e `AZURE_CLIENT_SECRET`.
