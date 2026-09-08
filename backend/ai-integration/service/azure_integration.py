import asyncio
import os

from azure.identity import ClientSecretCredential
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from mcp.shared._httpx_utils import create_mcp_http_client
from dotenv import load_dotenv

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
    access_token = get_fabric_token()

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}",
    }

    http_client = create_mcp_http_client(headers=headers)
    async with streamable_http_client(FABRIC_MCP_URL, http_client=http_client) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()
            tool_name = tools.tools[0].name  # "DataAgent_Agente_de_Manuten_o"

            result = await session.call_tool(
                tool_name,
                arguments={"userQuestion": question},
            )

            texto = "\n".join(
                block.text for block in result.content if hasattr(block, "text")
            )
            return texto

if __name__ == "__main__":
    print(asyncio.run(query_data_agent("Última OS do Forno B")))
