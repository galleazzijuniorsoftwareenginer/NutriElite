import { create } from 'zustand'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve: ((value: boolean) => void) | null
}

interface ConfirmStore extends ConfirmState {
  request: (options: ConfirmOptions) => Promise<boolean>
  settle: (value: boolean) => void
}

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  open: false,
  title: '¿Estás seguro?',
  message: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  danger: true,
  resolve: null,
  request: (options) =>
    new Promise<boolean>((resolve) => {
      set({
        open: true,
        title: options.title ?? '¿Estás seguro?',
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Sí, confirmar',
        cancelLabel: options.cancelLabel ?? 'Cancelar',
        danger: options.danger ?? true,
        resolve,
      })
    }),
  settle: (value) => {
    get().resolve?.(value)
    set({ open: false, resolve: null })
  },
}))

/** Abre un diálogo de confirmación y resuelve `true` solo si el usuario confirma.
 * Úsalo antes de cualquier acción destructiva (cancelar, eliminar, excluir). */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().request(options)
}
