import type { Area } from 'react-easy-crop'

export function cropImageToBase64(imageSrc: string, cropPixels: Area, outputSize = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = outputSize
      canvas.height = outputSize
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('No se pudo procesar la imagen'))
      ctx.drawImage(
        img,
        cropPixels.x,
        cropPixels.y,
        cropPixels.width,
        cropPixels.height,
        0,
        0,
        outputSize,
        outputSize
      )
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = imageSrc
  })
}
