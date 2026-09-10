import { useState } from 'react'

interface CategoryTileProps {
  imageUrl?: string | null
  gradient: string
  icon: string
  alt: string
  height?: number
  iconSize?: string
}

export function CategoryTile({ imageUrl, gradient, icon, alt, height = 120, iconSize = 'text-4xl' }: CategoryTileProps) {
  const [failed, setFailed] = useState(false)
  const showImage = imageUrl && !failed

  return (
    <div
      className={`relative flex items-center justify-center ${iconSize}`}
      style={{ height, background: showImage ? undefined : gradient }}
    >
      {showImage ? (
        <img src={imageUrl} alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span>{icon}</span>
      )}
    </div>
  )
}
