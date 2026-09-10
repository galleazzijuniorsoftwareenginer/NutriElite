import { Modal } from './Modal'
import { Button } from './Button'
import { useConfirmStore } from '../store/confirmStore'

/** Móntalo una sola vez en la raíz de la app (App.tsx). Escucha el store
 * global de confirmación y renderiza el modal cuando `confirmAction(...)`
 * es invocado desde cualquier parte — sin necesidad de estado local por
 * componente en cada botón destructivo. */
export function ConfirmDialogHost() {
  const { open, title, message, confirmLabel, cancelLabel, danger, settle } = useConfirmStore()

  return (
    <Modal open={open} onClose={() => settle(false)} title={title} width={380}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-2">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => settle(false)}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={() => settle(true)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
