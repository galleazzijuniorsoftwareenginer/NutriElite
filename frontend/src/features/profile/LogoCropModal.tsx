import { useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { cropImageToBase64 } from './cropImage'

export function LogoCropModal({
  imageSrc,
  onCancel,
  onConfirm,
}: {
  imageSrc: string
  onCancel: () => void
  onConfirm: (base64: string) => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  async function handleConfirm() {
    if (!croppedAreaPixels) return
    setProcessing(true)
    try {
      const base64 = await cropImageToBase64(imageSrc, croppedAreaPixels)
      onConfirm(base64)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Modal open onClose={onCancel} title="Ajustar logo" width={420}>
      <div className="flex flex-col gap-4">
        <div className="relative h-64 w-full overflow-hidden rounded-md bg-bg">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-2">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" loading={processing} onClick={handleConfirm}>
            Usar esta imagen
          </Button>
        </div>
      </div>
    </Modal>
  )
}
