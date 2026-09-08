"use client";

import {
  ArrowUpRightIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

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
    texto: "Qual foi a última OS do Forno B?",
  },
  {
    icon: ClockIcon,
    titulo: "Histórico",
    texto:
      "Existem chamados anteriores de vazamento no flexível da máquina B5?",
  },
  {
    icon: ChartBarIcon,
    titulo: "Indicadores",
    texto: "Qual o MTTR e o MTBF da B5 nos últimos 90 dias?",
  },
];

/** Tela inicial, quando ainda não há mensagens. */
export default function EmptyState({
  onEscolher,
}: {
  onEscolher: (texto: string) => void;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-[20px] bg-brand text-white shadow-xl shadow-brand/30">
        <WrenchScrewdriverIcon className="size-8" />
      </div>

      <h2 className="text-[28px] font-semibold tracking-tight">
        O que você precisa consultar?
      </h2>
      <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-muted">
        Consultas ao histórico de manutenção da Wheaton: chamados, ordens de
        serviço, equipamentos e indicadores. As respostas citam os chamados
        usados como evidência.
      </p>

      <div className="mt-9 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
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

      <p className="mt-8 max-w-md text-xs leading-relaxed text-muted">
        As respostas se baseiam apenas nos registros encontrados na base e não
        substituem o diagnóstico técnico da manutenção.
      </p>
    </div>
  );
}
