"use client";

import { useState } from "react";
import { CheckIcon, ClipboardIcon } from "@heroicons/react/24/outline";
import type { Message } from "../types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MascoteAvatar } from "./Mascote";

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
      {isUser ? (
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface text-[11px] font-semibold text-muted ring-1 ring-border">
          EU
        </div>
      ) : (
        <MascoteAvatar className="mt-1 size-8 shadow-sm" />
      )}

      <div
        className={`flex min-w-0 max-w-[100%] flex-col ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {/* Balão */}
        <div
          className={`rounded-[18px] px-4 py-2.5 text-[15px] leading-relaxed break-words ${
            isUser
              ? "rounded-br-md bg-brand whitespace-pre-wrap text-white shadow-md shadow-brand/20"
              : "rounded-bl-md bg-surface text-foreground shadow-sm ring-1 ring-border/70"
          }`}
        >
          {/*
            O pre-wrap fica só no balão do usuário (texto puro, preserva as
            quebras digitadas). No do assistente o markdown já produz os
            blocos; com pre-wrap as quebras da fonte viravam linhas em branco.
          */}
          {!message.content ? (
            <TypingDots />
          ) : isUser ? (
            message.content
          ) : (
            <div className="prose max-w-none text-[15px] leading-relaxed prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:mt-4 prose-headings:mb-2 prose-headings:text-base prose-pre:my-2.5 prose-hr:my-4 prose-blockquote:my-2.5 prose-blockquote:border-brand/40">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{ table: Tabela }}
              >
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

/**
 * Tabela de markdown. Vai num container com rolagem própria: tabela de
 * chamados costuma ter muitas colunas e não pode empurrar a página inteira.
 */
function Tabela({ children }: { children?: React.ReactNode }) {
  return (
    <div className="-mx-1 my-3 overflow-x-auto rounded-xl ring-1 ring-border">
      <table className="my-0 w-full text-sm">{children}</table>
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
