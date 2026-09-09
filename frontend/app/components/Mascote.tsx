"use client";

import Image from "next/image";

/**
 * Mascote da Wheaton — usado em dois tamanhos:
 *
 *  - <MascoteHero />   corpo inteiro, na tela inicial
 *  - <MascoteAvatar /> só a cabeça, no cabeçalho e nos balões do assistente
 *
 * Os dois leem o MESMO arquivo. O avatar recorta a cabeça via CSS, então não
 * é preciso manter uma segunda imagem já cortada.
 *
 * O arquivo em /public é um PNG com transparência, cortado justo na
 * silhueta — daí as dimensões não serem "redondas".
 */

/** Caminho a partir de /public. A barra inicial é obrigatória: o next/image
 *  monta uma URL a partir dela e rejeita caminho relativo. */
const ARQUIVO = "/mascote-v2.png";

/** Dimensões reais do arquivo — o next/image usa para evitar layout shift. */
const LARGURA_ORIGINAL = 619;
const ALTURA_ORIGINAL = 1402;

/**
 * Recorte da cabeça, medido sobre o arquivo de 619x1402: um quadrado de
 * 430px a partir do topo do capacete, centrado no rosto (x=342).
 * Se a arte mudar de proporção, meça de novo e troque só estes três números.
 */
const CABECA = {
  escala: 144.0, // largura da imagem, em % do container do avatar
  esquerda: -29.5, // deslocamento horizontal, em % do container
  topo: -3.0, // deslocamento vertical, em % do container
};

/**
 * Corpo inteiro. A altura vem das classes (a largura acompanha),
 * então dá para variar por breakpoint sem distorcer.
 */
export function MascoteHero({ className = "" }: { className?: string }) {
  return (
    <Image
      src={ARQUIVO}
      alt="Mascote do Assistente de Manutenção da Wheaton"
      width={LARGURA_ORIGINAL}
      height={ALTURA_ORIGINAL}
      // Nunca passa de ~180px de largura na tela: serve um arquivo pequeno.
      sizes="180px"
      priority
      className={`w-auto select-none ${className}`}
    />
  );
}

/**
 * Só a cabeça, dentro de um quadrado arredondado.
 * O tamanho vem de fora (ex.: "size-9"), como nos ícones que ele substitui.
 */
export function MascoteAvatar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl bg-brand-soft ${className}`}
    >
      <Image
        src={ARQUIVO}
        alt=""
        aria-hidden
        width={LARGURA_ORIGINAL}
        height={ALTURA_ORIGINAL}
        sizes="72px"
        className="absolute h-auto max-w-none select-none"
        style={{
          width: `${CABECA.escala}%`,
          left: `${CABECA.esquerda}%`,
          top: `${CABECA.topo}%`,
        }}
      />
    </div>
  );
}
