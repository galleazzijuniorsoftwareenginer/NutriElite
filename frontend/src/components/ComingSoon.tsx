export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface py-24 text-center">
      <p className="font-display text-lg text-text">{title}</p>
      <p className="mt-1 text-sm text-text-2">Esta sección está en construcción.</p>
    </div>
  )
}
