"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowPathIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import ChatInput from "./api/chat/components/ChatInput";
import EmptyState from "./api/chat/components/EmptyState";
import MessageBubble from "./api/chat/components/MessageBubble";
import type { Message } from "./types";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Guarda o "cancelador" do fetch atual, para o botão de parar funcionar.
  const abortRef = useRef<AbortController | null>(null);
  const fimDaListaRef = useRef<HTMLDivElement>(null);

  // Sempre que chegar conteúdo novo, rola até o fim.
  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function enviar(texto: string) {
    const conteudo = texto.trim();
    if (!conteudo || carregando) return;

    setErro(null);
    setInput("");

    const pergunta: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: conteudo,
    };

    // Balão vazio do assistente — ele mostra as bolinhas até o texto chegar.
    const resposta: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    const historico = [...messages, pergunta];
    setMessages([...historico, resposta]);
    setCarregando(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historico.map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error("Falha na requisição");

      // Lê a resposta em pedaços e vai atualizando o balão do assistente.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const pedaco = decoder.decode(value, { stream: true });
        setMessages((atual) =>
          atual.map((m) =>
            m.id === resposta.id ? { ...m, content: m.content + pedaco } : m,
          ),
        );
      }
    } catch (e) {
      // Cancelar pelo botão "parar" não é erro de verdade.
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setErro("Não consegui falar com o servidor. Tente novamente.");
      }
    } finally {
      setCarregando(false);
      abortRef.current = null;
    }
  }

  function parar() {
    abortRef.current?.abort();
  }

  function novaConversa() {
    parar();
    setMessages([]);
    setInput("");
    setErro(null);
  }

  return (
    <div className="app-shell mx-auto flex w-full flex-col">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between border-b border-border/70 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-md shadow-brand/25">
            <WrenchScrewdriverIcon className="size-4.5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Assistente de Manutenção</p>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <span
                className={`size-1.5 rounded-full bg-brand ${
                  carregando ? "animate-pulse" : ""
                }`}
              />
              {carregando ? "Consultando a base..." : "Online"}
            </p>
          </div>
        </div>

        <button
          onClick={novaConversa}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted ring-1 ring-border transition hover:bg-brand-soft hover:text-brand hover:ring-brand"
        >
          <ArrowPathIcon className="size-3.5" />
          Nova conversa
        </button>
      </header>

      {/* Lista de mensagens */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState onEscolher={enviar} />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-7 sm:px-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}

            {erro && (
              <p className="mx-auto rounded-full bg-red-500/10 px-3.5 py-1.5 text-sm text-red-600">
                {erro}
              </p>
            )}

            <div ref={fimDaListaRef} />
          </div>
        )}
      </main>

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={() => enviar(input)}
        onStop={parar}
        carregando={carregando}
      />
    </div>
  );
}
