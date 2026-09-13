import type { ReactNode } from 'react'
import clsx from 'clsx'

// Tooltip de hover puro CSS (group-hover) — pensado para envolver botones
// solo-ícono donde la acción no es obvia sin texto (flechas de navegación,
// cerrar, mostrar/ocultar contraseña, etc.). No usar en botones que ya
// tienen su propio texto visible: ahí sería ruido redundante.
export function Tooltip({
  label,
  children,
  placement = 'top',
}: {
  label: string
  children: ReactNode
  placement?: 'top' | 'bottom'
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={clsx(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-text px-2 py-1 text-[11px] font-medium text-surface opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
          placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
        )}
      >
        {label}
      </span>
    </span>
  )
}
