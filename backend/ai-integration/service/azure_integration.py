import asyncio
import os
import threading
import time

import httpx2
from azure.identity import ClientSecretCredential
from dotenv import load_dotenv
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

load_dotenv()

FABRIC_MCP_URL = "https://api.fabric.microsoft.com/v1/mcp/workspaces/9a900a02-5133-490e-bb91-aad13b876bb3/dataagents/c78b4b77-2b9e-4285-a9f2-2565faba5e51/agent"
FABRIC_SCOPE = "https://api.fabric.microsoft.com/.default"

# O Data Agent não guarda estado entre chamadas: o contexto multi-turno é
# reconstruído concatenando o histórico na própria pergunta. Como as respostas
# costumam ter milhares de caracteres, o histórico é podado antes de ser enviado.
MAX_HISTORY_MESSAGES = int(os.getenv("FABRIC_MAX_HISTORY_MESSAGES", "6"))
MAX_HISTORY_CHARS_PER_MESSAGE = int(
    os.getenv("FABRIC_MAX_HISTORY_CHARS_PER_MESSAGE", "1500")
)

# Perguntas que varrem tabelas grandes demoram. O SDK (mcp 2.2) ainda nao
# implementa a extensao de tasks do MCP, que responderia sem segurar a conexao
# aberta, entao o unico controle disponivel e o timeout.
TIMEOUT = httpx2.Timeout(
    float(os.getenv("FABRIC_TIMEOUT_SECONDS", "600")),
    connect=30.0,
)

_credential = None
_token_cache = None
_token_lock = threading.Lock()


def get_fabric_token() -> str:
    """Obter token do Fabric para autenticação (com cache até a expiração)"""
    global _credential, _token_cache

    with _token_lock:
        # Renova com 5 min de folga antes de expirar
        if _token_cache and _token_cache.expires_on - time.time() > 300:
            return _token_cache.token

        if _credential is None:
            _credential = ClientSecretCredential(
                tenant_id=os.environ["AZURE_TENANT_ID"],
                client_id=os.environ["AZURE_CLIENT_ID"],
                client_secret=os.environ["AZURE_CLIENT_SECRET"],
            )

        _token_cache = _credential.get_token(FABRIC_SCOPE)
        return _token_cache.token


def get_auth_headers() -> dict:
    """Montar headers de autenticação para cada requisição"""
    return {
        "Authorization": f"Bearer {get_fabric_token()}",
        "Content-Type": "application/json",
    }


def _truncate(texto: str, limite: int) -> str:
    texto = texto.strip()
    if len(texto) <= limite:
        return texto
    return texto[:limite].rstrip() + " […resposta truncada…]"


def build_prompt(question: str, history: list | None = None) -> str:
    """
    Concatenar o histórico da conversa na pergunta enviada ao Data Agent.

    `history` é a lista de mensagens anteriores (sem a pergunta atual), cada uma
    com `role` ("user" ou "assistant") e `content`. Sem histórico, devolve a
    pergunta intacta — para não alterar o comportamento de perguntas avulsas.
    """
    if not history:
        return question

    recentes = [
        m for m in history
        if getattr(m, "content", None) or (isinstance(m, dict) and m.get("content"))
    ][-MAX_HISTORY_MESSAGES:]

    if not recentes:
        return question

    linhas = []
    for m in recentes:
        role = m["role"] if isinstance(m, dict) else m.role
        content = m["content"] if isinstance(m, dict) else m.content
        rotulo = "Usuário" if role == "user" else "Assistente"
        linhas.append(f"{rotulo}: {_truncate(content, MAX_HISTORY_CHARS_PER_MESSAGE)}")

    historico = "\n\n".join(linhas)

    return (
        "Histórico da conversa até aqui (use apenas como contexto para entender "
        "a que a pergunta se refere; não repita o que já foi respondido):\n\n"
        f"{historico}\n\n"
        "---\n\n"
        f"Pergunta atual do usuário: {question}"
    )


async def query_data_agent(question: str, history: list | None = None) -> str:
    """
    Consultar o Data Agent do Fabric via MCP.

    Retorna a mesma resposta em markdown que o agente produz na plataforma Fabric.

    O Data Agent é stateless; passando `history` (mensagens anteriores do chat),
    o contexto é reconstruído dentro da própria pergunta, permitindo follow-ups
    como "pode" ou "detalha o item 3".
    """
    prompt = build_prompt(question, history)
    # get_token faz I/O bloqueante; não pode rodar direto no event loop
    headers = await asyncio.to_thread(get_auth_headers)

    # O SDK do mcp 2.x tipa este parametro como httpx2.AsyncClient e constroi
    # httpx2.EventSource sobre as respostas dele: tem que ser httpx2, nao httpx.
    async with httpx2.AsyncClient(headers=headers, timeout=TIMEOUT) as http_client:
        async with streamable_http_client(
            FABRIC_MCP_URL,
            http_client=http_client,
        ) as (read, write):
            async with ClientSession(read, write) as session:
                # Handshake MCP
                await session.initialize()

                # Descobrir a ferramenta exposta pelo agente
                tools = await session.list_tools()

                if not tools.tools:
                    raise ValueError("Nenhuma ferramenta encontrada no Data Agent")

                tool = tools.tools[0]

                # Encontrar o nome do argumento dinamicamente
                # (hoje é "userQuestion", mas não hardcoda)
                schema = tool.input_schema or {}
                properties = schema.get("properties") or {}
                required = schema.get("required") or []

                if required:
                    question_arg = required[0]
                elif properties:
                    question_arg = next(iter(properties))
                else:
                    raise ValueError(
                        f"Ferramenta '{tool.name}' não expõe argumento de pergunta"
                    )

                # Chamar a ferramenta com a pergunta
                result = await session.call_tool(tool.name, {question_arg: prompt})

                # Extrair respostas de texto
                answers = [
                    block.text
                    for block in result.content
                    if getattr(block, "text", None)
                ]

                if result.is_error:
                    detalhe = "\n".join(answers) or "sem detalhes"
                    raise RuntimeError(f"Data Agent retornou erro: {detalhe}")

                if not answers:
                    raise ValueError("Data Agent retornou resposta vazia")

                return "\n".join(answers)


# Para testes locais
if __name__ == "__main__":
    try:
        print("🔍 Health check: querying data agent...")
        answer = asyncio.run(query_data_agent("Última OS do Forno B"))
        print("✅ Resposta:")
        print(answer)
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback

        traceback.print_exc()
