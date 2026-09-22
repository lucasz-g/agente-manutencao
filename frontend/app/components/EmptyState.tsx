"use client";

import {
  ArrowUpRightIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { MascoteHero } from "./Mascote";

/**
 * Perguntas de exemplo. Cada uma cobre uma capacidade real do agente:
 * ranking de falhas, consulta de OS, histórico e indicadores.
 *
 * Para trocar/adicionar sugestões, edite só esta lista.
 */
const SUGESTOES = [
  {
    icon: ExclamationTriangleIcon,
    titulo: "Ranking de falhas",
    texto: "Quais equipamentos mais falharam este mês?",
  },
  {
    icon: ClipboardDocumentListIcon,
    titulo: "Ordem de serviço",
    texto: "Quais foram as OS mais longas da semana?",
  },
  {
    icon: ClockIcon,
    titulo: "Histórico",
    texto:
      "Quais máquinas tiveram maior número de ocorrências?",
  },
  {
    icon: ChartBarIcon,
    titulo: "Indicadores",
    texto: "Quais máquinas tiveram o melhor desempenho em termos de MTTR e MTBF nos últimos 90 dias?",
  },
];

/** Tela inicial, quando ainda não há mensagens. */
export default function EmptyState({
  onEscolher,
}: {
  onEscolher: (texto: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center overflow-hidden px-4 py-5 text-center sm:py-8">
      <h2 className="text-[28px] font-semibold tracking-tight">
        O que você precisa consultar?
      </h2>
      <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-muted">
        Consultas aos dados de manutenção da Wheaton: chamados, ordens de
        serviço, equipamentos e indicadores.
      </p>

      {/*
        Mascote só de lg pra cima: no mobile ele roubava a altura toda da
        tela, que agora é fixa em 100dvh. Fica à esquerda dos cards, com os
        pés alinhados à base deles (items-end) para parecer apoiado.
      */}
      <div className="chat-col mt-6 flex flex-col items-center justify-center gap-2 sm:mt-8 lg:flex-row lg:items-end lg:gap-7">
        <MascoteHero className="hidden shrink-0 drop-shadow-xl lg:-mb-1 lg:block lg:h-[min(20rem,40vh)]" />

        <div className="grid w-full gap-3 sm:grid-cols-2">
          {SUGESTOES.map((s) => (
            <button
              key={s.titulo}
              onClick={() => onEscolher(s.texto)}
              className="group relative rounded-2xl bg-surface p-4 pr-9 text-left shadow-sm ring-1 ring-border transition hover:-translate-y-1 hover:shadow-lg hover:shadow-brand/10 hover:ring-brand"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <s.icon className="size-5" />
              </div>
              <p className="text-sm font-semibold">{s.titulo}</p>
              <p className="mt-1 text-xs leading-snug text-muted">{s.texto}</p>
              <ArrowUpRightIcon className="absolute right-3 top-4 size-4 text-brand opacity-0 transition group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
