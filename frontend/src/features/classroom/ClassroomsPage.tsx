import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createClassroom,
  deleteClassroom,
  getStudentPatients,
  joinClassroom,
  listClassroomStudents,
  listEnrolledClassrooms,
  listMyClassrooms,
  removeStudent,
} from '../../api/classroom'
import { useAuthStore } from '../../store/authStore'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Field'

const GOAL_LABEL: Record<string, string> = { cut: 'Pérdida de peso', bulk: 'Ganancia de masa', maintenance: 'Mantenimiento' }

function ProfessorView() {
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [selectedClassroom, setSelectedClassroom] = useState<number | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null)

  const { data: classrooms } = useQuery({ queryKey: ['classrooms'], queryFn: listMyClassrooms })
  const { data: students } = useQuery({
    queryKey: ['classroom-students', selectedClassroom],
    queryFn: () => listClassroomStudents(selectedClassroom!),
    enabled: !!selectedClassroom,
  })
  const { data: studentPatients } = useQuery({
    queryKey: ['student-patients', selectedClassroom, selectedStudent],
    queryFn: () => getStudentPatients(selectedClassroom!, selectedStudent!),
    enabled: !!selectedClassroom && !!selectedStudent,
  })

  const createMut = useMutation({
    mutationFn: () => createClassroom(nombre),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      setNombre('')
    },
  })
  const deleteMut = useMutation({
    mutationFn: deleteClassroom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      setSelectedClassroom(null)
    },
  })
  const removeStudentMut = useMutation({
    mutationFn: (studentId: number) => removeStudent(selectedClassroom!, studentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classroom-students', selectedClassroom] }),
  })

  const activeStudent = students?.find((s) => s.user_id === selectedStudent)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">Nueva turma</h2>
        <div className="flex gap-2">
          <Input placeholder="Ej. Nutrición Clínica 2026-A" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Button size="sm" loading={createMut.isPending} disabled={!nombre} onClick={() => createMut.mutate()}>
            Crear
          </Button>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          {classrooms?.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedClassroom(c.id)
                setSelectedStudent(null)
              }}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs ${
                selectedClassroom === c.id ? 'border-accent bg-accent-light' : 'border-border'
              }`}
            >
              <div>
                <p className="font-medium text-text">{c.nombre}</p>
                <p className="text-text-3">Código: {c.codigo_acceso} · {c.total_estudiantes} estudiante(s)</p>
              </div>
            </button>
          ))}
          {classrooms?.length === 0 && <p className="text-xs text-text-3">Aún no creaste ninguna turma.</p>}
        </div>
      </Card>

      <Card className="lg:col-span-2">
        {!selectedClassroom ? (
          <p className="py-10 text-center text-sm text-text-3">Selecciona una turma para ver sus estudiantes.</p>
        ) : selectedStudent && activeStudent ? (
          <div>
            <button onClick={() => setSelectedStudent(null)} className="mb-3 text-xs font-medium text-accent-2 hover:underline">
              ← Volver a la lista
            </button>
            <h3 className="mb-3 text-sm font-semibold text-text">Pacientes de práctica de {activeStudent.username}</h3>
            {studentPatients?.length === 0 && <p className="text-sm text-text-3">Este estudiante aún no tiene pacientes.</p>}
            <div className="flex flex-col gap-3">
              {studentPatients?.map((p) => (
                <div key={p.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium text-text">{p.name}</p>
                  {p.plans.length === 0 ? (
                    <p className="text-xs text-text-3">Sin planes calculados aún.</p>
                  ) : (
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {p.plans.map((pl) => (
                        <li key={pl.id} className="text-xs text-text-2">
                          {GOAL_LABEL[pl.goal] || pl.goal} · TMB {Math.round(pl.tmb)} · GET {Math.round(pl.get)} kcal · {pl.weight}kg
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">Estudiantes inscritos</h3>
              <Button size="sm" variant="ghost" className="text-danger" onClick={() => deleteMut.mutate(selectedClassroom)}>
                Eliminar turma
              </Button>
            </div>
            {students?.length === 0 ? (
              <p className="text-sm text-text-3">Comparte el código para que se inscriban estudiantes.</p>
            ) : (
              <ul className="divide-y divide-border">
                {students?.map((s) => (
                  <li key={s.user_id} className="flex items-center justify-between py-2.5">
                    <button onClick={() => setSelectedStudent(s.user_id)} className="text-left">
                      <p className="text-sm font-medium text-accent-2 hover:underline">{s.username}</p>
                      <p className="text-xs text-text-3">{s.total_pacientes} pacientes · {s.total_planes} planes</p>
                    </button>
                    <Button size="sm" variant="ghost" className="text-danger" onClick={() => removeStudentMut.mutate(s.user_id)}>
                      Quitar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

function StudentView() {
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const { data: classrooms } = useQuery({ queryKey: ['my-classrooms'], queryFn: listEnrolledClassrooms })

  const joinMut = useMutation({
    mutationFn: () => joinClassroom(code),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-classrooms'] })
      setMessage(res.already_joined ? 'Ya estabas inscrito en esta turma.' : `Te uniste a "${res.classroom_name}" ✅`)
      setCode('')
    },
    onError: () => setMessage('Código inválido.'),
  })

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">Unirme a una turma</h2>
        <div className="flex gap-2">
          <Input placeholder="Código de 6 caracteres" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} />
          <Button loading={joinMut.isPending} disabled={code.length !== 6} onClick={() => joinMut.mutate()}>
            Unirme
          </Button>
        </div>
        {message && <p className="text-xs text-text-2">{message}</p>}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-text">Mis turmas</h2>
        {classrooms?.length === 0 ? (
          <p className="text-sm text-text-3">Aún no te inscribiste en ninguna turma.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {classrooms?.map((c) => (
              <li key={c.id} className="rounded-md border border-border px-3 py-2 text-sm text-text">
                {c.nombre}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export function ClassroomsPage() {
  const role = useAuthStore((s) => s.role)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Salón de clase</h1>
        <p className="text-sm text-text-2">
          {role === 'student'
            ? 'Únete a la turma de tu profesor con el código que te compartió.'
            : 'Crea una turma, comparte el código y revisa el progreso de práctica de tus estudiantes.'}
        </p>
      </div>
      {role === 'student' ? <StudentView /> : <ProfessorView />}
    </div>
  )
}
