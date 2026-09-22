import asyncio
import os

from azure.identity import ClientSecretCredential
from dotenv import load_dotenv
from azure.fabric.mcp import FabricMCPClient

load_dotenv()

FABRIC_MCP_URL = ( "https://api.fabric.microsoft.com/v1/mcp/workspaces/9a900a02-5133-490e-bb91-aad13b876bb3/dataagents/c78b4b77-2b9e-4285-a9f2-2565faba5e51/agent"
)

def get_fabric_token() -> str:
    credential = ClientSecretCredential(
        tenant_id=os.environ["AZURE_TENANT_ID"],
        client_id=os.environ["AZURE_CLIENT_ID"],
        client_secret=os.environ["AZURE_CLIENT_SECRET"],
    )
    token = credential.get_token("https://api.fabric.microsoft.com/.default")
    return token.token

async def query_data_agent(question: str) -> str:
    # MCP Client DENTRO do Azure/Fabric context
    client = FabricMCPClient(
        workspace_id="9a900a02-5133-490e-bb91-aad13b876bb3",
        credential=ClientSecretCredential(...)
    )
    
    result = await client.call_tool("DataAgent_Agente_de_Manuten_o", 
                                    {"userQuestion": question})
    return "\n".join(block.text for block in result.content if hasattr(block, "text"))

if __name__ == "__main__":
    print("Health check: querying data agent...")
    print(asyncio.run(query_data_agent("Última OS do Forno B")))
