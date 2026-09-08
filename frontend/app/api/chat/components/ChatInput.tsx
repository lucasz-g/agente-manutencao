"use client";

import { useEffect, useRef } from "react";
import { PaperAirplaneIcon, StopIcon } from "@heroicons/react/24/outline";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  carregando: boolean;
};

/** Caixa de texto que cresce sozinha + botão de enviar/parar. */
export default function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  carregando,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ajusta a altura conforme o usuário digita, sem passar de ~30% da
  // janela (em telas baixas a caixa para de crescer mais cedo).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const limite = Math.max(96, Math.min(160, window.innerHeight * 0.3));
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, limite)}px`;
  }, [value]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envia, Shift+Enter quebra linha.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="px-4 pb-5 pt-3">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-[22px] bg-surface p-2 shadow-lg shadow-black/5 ring-1 ring-border transition focus-within:ring-2 focus-within:ring-brand">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre um chamado, equipamento, máquina ou período..."
            className="max-h-[30dvh] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-muted"
          />

          {carregando ? (
            <button
              onClick={onStop}
              title="Parar resposta"
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-foreground transition hover:opacity-75"
            >
              <StopIcon className="size-4" />
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!value.trim()}
              title="Enviar"
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-brand/30 transition hover:bg-brand-hover active:scale-95 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted disabled:shadow-none"
            >
              <PaperAirplaneIcon className="size-4" />
            </button>
          )}
        </div>

        <p className="mt-2.5 text-center text-xs text-muted">
          <kbd className="rounded border border-border bg-surface px-1 py-px font-sans">
            Enter
          </kbd>{" "}
          envia ·{" "}
          <kbd className="rounded border border-border bg-surface px-1 py-px font-sans">
            Shift + Enter
          </kbd>{" "}
          quebra linha
        </p>
      </div>
    </div>
  );
}
