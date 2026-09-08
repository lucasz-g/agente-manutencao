from fastapi import FastAPI
from pydantic import BaseModel
from service.azure_integration import query_data_agent 

app = FastAPI()


class Pergunta(BaseModel):
    question: str

@app.post("/data-agent/query")
async def data_agent_query(payload: Pergunta):
    resposta = await query_data_agent(payload.question)
    return {"answer": resposta}