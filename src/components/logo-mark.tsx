import Image from 'next/image'

// Monograma T e L. Os ícones do site e do app saem do mesmo desenho
// (mobile/assets/brand/monograma.png, gerados por gerar-icones.py).
export function LogoMark({ size = 28 }: { size?: number }) {
  return <Image src="/logo-mark.png" alt="" width={size} height={size} aria-hidden="true" priority />
}
