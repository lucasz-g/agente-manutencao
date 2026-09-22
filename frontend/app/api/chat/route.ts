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

const FASTAPI_BACKEND_URL =
  process.env.BACKEND_URL ?? "http://localhost:8000/data-agent/query"

type Message = {
  role: "user" | "assistant";
  content: string;
};


async function fetchFromBackend( question: string, history: Message[] ) : Promise<string> {
  const response = await fetch(FASTAPI_BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question, history }),
  });

  if(!response.ok){
    throw new Error("Network response not ok.")
  }
  
  const data = await response.json();
  return data.answer;

}

export async function POST(request: NextRequest) {
  const { messages } = (await request.json()) as { messages: Message[] };

  // O Data Agent do Fabric é stateless: além da pergunta atual, mandamos as
  // mensagens anteriores para que follow-ups ("pode", "detalha o item 3")
  // façam sentido. O backend é quem poda e monta o prompt final.
  const indiceUltimaPergunta = messages.map((m) => m.role).lastIndexOf("user");
  const ultimaPergunta =
    indiceUltimaPergunta >= 0 ? messages[indiceUltimaPergunta] : undefined;
  const historico =
    indiceUltimaPergunta >= 0 ? messages.slice(0, indiceUltimaPergunta) : [];

  const texto = await fetchFromBackend(ultimaPergunta?.content ?? "", historico);

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
