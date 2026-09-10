import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProfile, saveProfile } from '../../api/profile'
import type { NutritionistProfile } from '../../types'
import { Card, CardHeader, CardTitle } from '../../components/Card'
import { FieldWrap, Input } from '../../components/Field'
import { Button } from '../../components/Button'

const EMPTY: NutritionistProfile = {
  nombre: '',
  cedula: '',
  especialidad: '',
  clinica: '',
  telefono: '',
  email: '',
  logo_base64: '',
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ProfileForm() {
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: ['profile'], queryFn: getProfile })
  const [form, setForm] = useState<NutritionistProfile>(EMPTY)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data) setForm({ ...EMPTY, ...data })
  }, [data])

  const saveMut = useMutation({
    mutationFn: saveProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  function set<K extends keyof NutritionistProfile>(key: K, value: NutritionistProfile[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await fileToBase64(file)
    set('logo_base64', base64)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos clínicos</CardTitle>
      </CardHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          saveMut.mutate(form)
        }}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrap label="Nombre completo">
            <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Cédula profesional">
            <Input value={form.cedula} onChange={(e) => set('cedula', e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Especialidad">
            <Input value={form.especialidad} onChange={(e) => set('especialidad', e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Clínica / consultorio">
            <Input value={form.clinica} onChange={(e) => set('clinica', e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Teléfono">
            <Input value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Email de contacto">
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </FieldWrap>
        </div>

        <FieldWrap label="Logo (aparece en el PDF)">
          <div className="flex items-center gap-4">
            {form.logo_base64 ? (
              <img src={form.logo_base64} alt="Logo" className="h-14 w-14 rounded-md border border-border object-contain" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-border-strong text-[10px] text-text-3">
                Sin logo
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs text-text-2" />
            {form.logo_base64 && (
              <Button type="button" size="sm" variant="ghost" className="text-danger" onClick={() => set('logo_base64', '')}>
                Quitar
              </Button>
            )}
          </div>
        </FieldWrap>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={saveMut.isPending}>
            Guardar cambios
          </Button>
          {saved && <span className="text-xs font-medium text-accent">✓ Guardado</span>}
        </div>
      </form>
    </Card>
  )
}

export function ProfilePage() {
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Perfil profesional</h1>
        <p className="text-sm text-text-2">Esta información aparece en los reportes PDF que generas.</p>
      </div>
      <ProfileForm />
    </div>
  )
}
