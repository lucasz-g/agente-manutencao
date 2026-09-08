import type { NextRequest } from "next/server";

/**
 * Endpoint do chat.
 *
 * Hoje ele devolve uma resposta simulada, em streaming (palavra por palavra),
 * só para a interface funcionar de ponta a ponta.
 *
 * PARA PLUGAR O BACKEND DE VERDADE:
 * troque o miolo do `start()` por um fetch na sua API e vá repassando
 * os pedaços recebidos com `controller.enqueue(encoder.encode(pedaco))`.
 */

const FASTAPI_BACKEND_URL = "http://localhost:8000/data-agent/query"

type Message = {
  role: "user" | "assistant";
  content: string;
};


async function fetchFromBackend( question: string ) : Promise<string> {
  const response = await fetch(FASTAPI_BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  }); 

  if(!response.ok){
    throw new Error("Network response not ok.")
  }
  
  const data = await response.json();
  return data.answer;

}

export async function POST(request: NextRequest) {
  const { messages } = (await request.json()) as { messages: Message[] };

  const ultimaPergunta = messages.filter((m) => m.role === "user").at(-1);
  const texto = await fetchFromBackend(ultimaPergunta?.content ?? "");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Quebra o texto em pedacinhos e envia um por vez, com uma pausa,
      // para dar o efeito de "digitando".
      for (const pedaco of texto.split(/(\s+)/)) {
        controller.enqueue(encoder.encode(pedaco));
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
