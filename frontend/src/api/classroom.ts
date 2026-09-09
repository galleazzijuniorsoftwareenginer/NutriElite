import { api } from './client'

export interface Classroom {
  id: number
  professor_user_id: number
  nombre: string
  codigo_acceso: string
  total_estudiantes: number
  created_at: string
}

export interface StudentSummary {
  user_id: number
  username: string
  joined_at: string
  total_pacientes: number
  total_planes: number
}

export interface StudentPatientPlan {
  id: number
  goal: string
  weight: number
  get: number
  tmb: number
  created_at: string
}

export interface StudentPatientSummary {
  id: number
  name: string
  plans: StudentPatientPlan[]
}

export interface EnrolledClassroom {
  id: number
  nombre: string
  codigo_acceso: string
}

export async function createClassroom(nombre: string) {
  const { data } = await api.post<Classroom>('/classrooms', { nombre })
  return data
}

export async function listMyClassrooms() {
  const { data } = await api.get<Classroom[]>('/classrooms')
  return data
}

export async function joinClassroom(codigo_acceso: string) {
  const { data } = await api.post<{ ok: boolean; classroom_id: number; classroom_name?: string; already_joined?: boolean }>(
    '/classrooms/join',
    { codigo_acceso }
  )
  return data
}

export async function listEnrolledClassrooms() {
  const { data } = await api.get<EnrolledClassroom[]>('/classrooms/mine')
  return data
}

export async function listClassroomStudents(classroomId: number) {
  const { data } = await api.get<StudentSummary[]>(`/classrooms/${classroomId}/students`)
  return data
}

export async function removeStudent(classroomId: number, studentUserId: number) {
  const { data } = await api.delete(`/classrooms/${classroomId}/students/${studentUserId}`)
  return data
}

export async function getStudentPatients(classroomId: number, studentUserId: number) {
  const { data } = await api.get<StudentPatientSummary[]>(`/classrooms/${classroomId}/students/${studentUserId}/patients`)
  return data
}

export async function deleteClassroom(classroomId: number) {
  const { data } = await api.delete(`/classrooms/${classroomId}`)
  return data
}
