import random
import string

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import Classroom, ClassroomEnrollment, User, Patient, Plan
from backend.routes.auth import verify_token
from backend.schemas.classroom import (
    ClassroomCreate,
    ClassroomResponse,
    JoinClassroomRequest,
    StudentSummary,
    StudentPatientSummary,
)

router = APIRouter(prefix="/classrooms")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _current_user(db: Session, token: dict) -> User:
    return db.query(User).filter(User.username == token["sub"]).first()


def _generate_code(db: Session) -> str:
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not db.query(Classroom).filter(Classroom.codigo_acceso == code).first():
            return code


def _serialize(classroom: Classroom, db: Session) -> dict:
    total = db.query(ClassroomEnrollment).filter(ClassroomEnrollment.classroom_id == classroom.id).count()
    return {
        "id": classroom.id,
        "professor_user_id": classroom.professor_user_id,
        "nombre": classroom.nombre,
        "codigo_acceso": classroom.codigo_acceso,
        "total_estudiantes": total,
        "created_at": classroom.created_at,
    }


@router.post("", response_model=ClassroomResponse)
def create_classroom(data: ClassroomCreate, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    user = _current_user(db, token)
    classroom = Classroom(professor_user_id=user.id, nombre=data.nombre, codigo_acceso=_generate_code(db))
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return _serialize(classroom, db)


@router.get("", response_model=list[ClassroomResponse])
def list_my_classrooms(db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    user = _current_user(db, token)
    classrooms = db.query(Classroom).filter(Classroom.professor_user_id == user.id).order_by(Classroom.created_at.desc()).all()
    return [_serialize(c, db) for c in classrooms]


@router.post("/join")
def join_classroom(data: JoinClassroomRequest, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    user = _current_user(db, token)
    classroom = db.query(Classroom).filter(Classroom.codigo_acceso == data.codigo_acceso.upper()).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Código inválido")
    existing = (
        db.query(ClassroomEnrollment)
        .filter(ClassroomEnrollment.classroom_id == classroom.id, ClassroomEnrollment.student_user_id == user.id)
        .first()
    )
    if existing:
        return {"ok": True, "classroom_id": classroom.id, "already_joined": True}

    db.add(ClassroomEnrollment(classroom_id=classroom.id, student_user_id=user.id))
    db.commit()
    return {"ok": True, "classroom_id": classroom.id, "classroom_name": classroom.nombre}


@router.get("/mine")
def list_enrolled_classrooms(db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """Turmas en las que el usuario actual está inscrito como estudiante."""
    user = _current_user(db, token)
    enrollments = db.query(ClassroomEnrollment).filter(ClassroomEnrollment.student_user_id == user.id).all()
    classroom_ids = [e.classroom_id for e in enrollments]
    classrooms = db.query(Classroom).filter(Classroom.id.in_(classroom_ids)).all()
    return [{"id": c.id, "nombre": c.nombre, "codigo_acceso": c.codigo_acceso} for c in classrooms]


def _require_professor_owns(db: Session, classroom_id: int, user: User) -> Classroom:
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id, Classroom.professor_user_id == user.id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return classroom


@router.get("/{classroom_id}/students", response_model=list[StudentSummary])
def list_students(classroom_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    user = _current_user(db, token)
    _require_professor_owns(db, classroom_id, user)

    enrollments = db.query(ClassroomEnrollment).filter(ClassroomEnrollment.classroom_id == classroom_id).all()
    result = []
    for e in enrollments:
        student = db.query(User).filter(User.id == e.student_user_id).first()
        if not student:
            continue
        total_patients = db.query(Patient).filter(Patient.user_id == student.id).count()
        total_plans = db.query(Plan).filter(Plan.user_id == student.id).count()
        result.append({
            "user_id": student.id,
            "username": student.username,
            "joined_at": e.joined_at,
            "total_pacientes": total_patients,
            "total_planes": total_plans,
        })
    return result


@router.delete("/{classroom_id}/students/{student_user_id}")
def remove_student(classroom_id: int, student_user_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    user = _current_user(db, token)
    _require_professor_owns(db, classroom_id, user)
    enrollment = (
        db.query(ClassroomEnrollment)
        .filter(ClassroomEnrollment.classroom_id == classroom_id, ClassroomEnrollment.student_user_id == student_user_id)
        .first()
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Estudiante não encontrado nesta turma")
    db.delete(enrollment)
    db.commit()
    return {"ok": True}


@router.get("/{classroom_id}/students/{student_user_id}/patients", response_model=list[StudentPatientSummary])
def view_student_patients(
    classroom_id: int,
    student_user_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
):
    """Vista de solo lectura para que el profesor revise los pacientes de
    práctica y los planes que un estudiante inscrito ha calculado."""
    user = _current_user(db, token)
    _require_professor_owns(db, classroom_id, user)

    enrolled = (
        db.query(ClassroomEnrollment)
        .filter(ClassroomEnrollment.classroom_id == classroom_id, ClassroomEnrollment.student_user_id == student_user_id)
        .first()
    )
    if not enrolled:
        raise HTTPException(status_code=404, detail="Este estudiante não está inscrito nesta turma")

    patients = db.query(Patient).filter(Patient.user_id == student_user_id).all()
    result = []
    for p in patients:
        plans = db.query(Plan).filter(Plan.patient_id == p.id).order_by(Plan.created_at.desc()).all()
        result.append({
            "id": p.id,
            "name": p.name,
            "plans": [
                {
                    "id": pl.id,
                    "goal": pl.goal,
                    "weight": pl.weight,
                    "get": pl.get,
                    "tmb": pl.tmb,
                    "created_at": str(pl.created_at),
                }
                for pl in plans
            ],
        })
    return result


@router.delete("/{classroom_id}")
def delete_classroom(classroom_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    user = _current_user(db, token)
    classroom = _require_professor_owns(db, classroom_id, user)
    db.query(ClassroomEnrollment).filter(ClassroomEnrollment.classroom_id == classroom_id).delete()
    db.delete(classroom)
    db.commit()
    return {"ok": True}
