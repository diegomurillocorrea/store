import Image from 'next/image'

interface DaiegoLogoProps {
  size?: number
  className?: string
}

export function DaiegoLogo({ size = 40, className = 'rounded-lg' }: DaiegoLogoProps) {
  return (
    <Image
      src="/DAIEGO.png"
      alt="DAIEGO"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      priority
    />
  )
}
