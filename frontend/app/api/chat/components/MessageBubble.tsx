"use client";

import { useState } from "react";
import {
  CheckIcon,
  ClipboardIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import type { Message } from "../../../types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Uma mensagem do chat: avatar + balão + botão de copiar. */
export default function MessageBubble({ message }: { message: Message }) {
  const [copiado, setCopiado] = useState(false);
  const isUser = message.role === "user";

  async function copiar() {
    await navigator.clipboard.writeText(message.content);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div
      className={`group flex animate-fade-up gap-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar */}
      <div
        className={`mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-semibold ${
          isUser
            ? "bg-surface text-muted ring-1 ring-border"
            : "bg-brand text-white shadow-md shadow-brand/25"
        }`}
      >
        {isUser ? "EU" : <WrenchScrewdriverIcon className="size-4" />}
      </div>

      <div
        className={`flex min-w-0 max-w-[80%] flex-col ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {/* Balão */}
        <div
          className={`px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap ${
            isUser
              ? "rounded-[18px] rounded-br-md bg-brand text-white shadow-md shadow-brand/20"
              : "rounded-[18px] rounded-bl-md bg-surface text-foreground shadow-sm ring-1 ring-border/70"
          }`}
        >
          {!message.content ? (
            <TypingDots />
          ) : isUser ? (
            message.content
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Ação de copiar — aparece no hover */}
        {message.content && (
          <button
            onClick={copiar}
            className="mt-1.5 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted opacity-0 transition hover:bg-surface-muted focus:opacity-100 group-hover:opacity-100"
          >
            {copiado ? (
              <>
                <CheckIcon className="size-3.5 text-brand" /> Copiado
              </>
            ) : (
              <>
                <ClipboardIcon className="size-3.5" /> Copiar
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/** Três bolinhas piscando, enquanto a resposta não começa a chegar. */
function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-blink rounded-full bg-brand"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
