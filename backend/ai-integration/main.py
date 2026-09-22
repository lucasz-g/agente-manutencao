from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

from service.azure_integration import query_data_agent

app = FastAPI()


class Mensagem(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class Pergunta(BaseModel):
    question: str
    # Mensagens anteriores do chat, sem a pergunta atual.
    # Opcional: sem histórico, a pergunta é enviada como antes.
    history: list[Mensagem] = []


@app.post("/data-agent/query")
async def data_agent_query(payload: Pergunta):
    resposta = await query_data_agent(
        payload.question,
        [m.model_dump() for m in payload.history],
    )
    return {"answer": resposta}
