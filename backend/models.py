from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from sqlalchemy.sql import func
from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    email = Column(String, nullable=True)
    first_login = Column(Integer, default=1)
    is_pro = Column(Integer, default=0)
    stripe_customer_id = Column(String, nullable=True)
    plans_this_month = Column(Integer, default=0)
    plans_month_reset = Column(String, nullable=True)
    role = Column(String, default="professional")  # professional|student



class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String)
    phone = Column(String)
    status = Column(String, default="activo")  # activo|inactivo|pausado
    notas_generales = Column(Text, nullable=True)
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    emergency_contact_relation = Column(String, nullable=True)
    blood_type = Column(String, nullable=True)  # A+|A-|B+|B-|AB+|AB-|O+|O-
    activity_category = Column(String, nullable=True)  # sedentario|caminata|ejercicio_moderado|deporte_recreativo|deporte_competitivo
    activity_type = Column(String, nullable=True)  # descripción libre: "Camina 30min 3x/sem", "Fútbol competitivo"
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)


    patient_name = Column(String)
    patient_email = Column(String)
    patient_phone = Column(String)


    weight = Column(Float)
    height = Column(Float)
    age = Column(Integer)
    gender = Column(String)
    activity_level = Column(Float)
    goal = Column(String)
    body_fat_percent = Column(Float, nullable=True)  # requerido por las fórmulas Katch-McArdle/Cunningham
    formula = Column(String, nullable=True)

    tmb = Column(Float)
    get = Column(Float)
    protein = Column(Float)
    carbs = Column(Float)
    fats = Column(Float)

    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    is_template = Column(Integer, default=0)
    template_name = Column(String, nullable=True)
    weekly_menu = Column(JSON, nullable=True)
    meal_distribution = Column(JSON, nullable=True)
    public_token = Column(String, unique=True, nullable=True, index=True)
from sqlalchemy import Column, Integer, String, Float
from backend.database import Base

class FitnessReference(Base):
    __tablename__ = "fitness_references"

    id = Column(Integer, primary_key=True, index=True)

    test_type = Column(String)
    gender = Column(String)

    age_min = Column(Integer)
    age_max = Column(Integer)

    very_poor = Column(Float)
    poor = Column(Float)
    average = Column(Float)
    good = Column(Float)
    excellent = Column(Float)
class FoodGroup(Base):
    __tablename__ = "food_groups"

    id = Column(Integer, primary_key=True, index=True)

    group_name = Column(String)
    subgroup_name = Column(String)

    kcal = Column(Float)
    protein = Column(Float)
    fats = Column(Float)
    carbs = Column(Float)
    fiber = Column(Float)

    calcium = Column(Float)
    iron = Column(Float)
    sodium = Column(Float)
    cholesterol = Column(Float)
from sqlalchemy.orm import relationship


class PlanFoodGroup(Base):
    __tablename__ = "plan_food_groups"

    id = Column(Integer, primary_key=True, index=True)

    plan_id = Column(Integer, ForeignKey("plans.id"))
    food_group_id = Column(Integer, ForeignKey("food_groups.id"))

    portions = Column(Float)

    plan = relationship("Plan", backref="plan_food_groups")
    food_group = relationship("FoodGroup")


class ClinicalRecord(Base):
    """Expediente clínico del paciente (NOM-004-SSA3-2012) — datos que cambian
    poco entre consultas. Los datos por visita viven en Consultation."""
    __tablename__ = "clinical_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True, nullable=False)

    antecedentes_heredofamiliares = Column(Text, nullable=True)
    antecedentes_patologicos = Column(Text, nullable=True)
    antecedentes_no_patologicos = Column(Text, nullable=True)
    alergias = Column(Text, nullable=True)
    medicamentos_actuales = Column(Text, nullable=True)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Consultation(Base):
    """Una nota de consulta/visita — metodología ABCD (Antropométricos,
    Bioquímicos, Clínicos, Dietéticos) usada en evaluación nutricional."""
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=True)

    fecha = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    motivo_consulta = Column(Text, nullable=True)

    # A — Antropométricos (snapshot independiente del Plan, para graficar evolución)
    peso = Column(Float, nullable=True)
    talla = Column(Float, nullable=True)

    # Pliegues cutáneos (adipómetro) — protocolo Jackson-Pollock 3 sitios, en mm.
    # Hombre usa pecho/abdominal/muslo; mujer usa tríceps/suprailíaco/muslo.
    pliegue_pecho = Column(Float, nullable=True)
    pliegue_abdominal = Column(Float, nullable=True)
    pliegue_triceps = Column(Float, nullable=True)
    pliegue_suprailiaco = Column(Float, nullable=True)
    pliegue_muslo = Column(Float, nullable=True)
    grasa_corporal_pct = Column(Float, nullable=True)
    grasa_corporal_metodo = Column(String, nullable=True)  # bioimpedancia|pliegues_jp3

    # B — Bioquímicos: lista de {"nombre","valor","unidad"} (ej. glucosa, colesterol)
    bioquimicos = Column(JSON, nullable=True)

    # C — Clínicos
    signos_vitales = Column(JSON, nullable=True)  # {"presion_arterial","frecuencia_cardiaca",...}
    exploracion_fisica = Column(Text, nullable=True)

    # D — Dietéticos
    habitos_dieteticos = Column(Text, nullable=True)

    diagnostico_nutricional = Column(Text, nullable=True)
    plan_objetivos = Column(Text, nullable=True)
    evolucion = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RenalAssessment(Base):
    """Metas nutricionales para enfermedad renal crónica, según guías KDOQI."""
    __tablename__ = "renal_assessments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    consultation_id = Column(Integer, ForeignKey("consultations.id"), nullable=True)

    ckd_stage = Column(String, nullable=False)  # "1","2","3a","3b","4","5"
    dialysis_modality = Column(String, nullable=False, default="none")  # none|hemodialysis|peritoneal
    weight = Column(Float, nullable=False)
    age = Column(Integer, nullable=True)

    # Laboratorios opcionales que ajustan las metas
    potassium_meq_l = Column(Float, nullable=True)
    phosphorus_mg_dl = Column(Float, nullable=True)
    albumin_g_dl = Column(Float, nullable=True)
    egfr = Column(Float, nullable=True)

    # Metas calculadas
    kcal_per_kg = Column(Float, nullable=False)
    kcal_total = Column(Float, nullable=False)
    protein_g_per_kg = Column(Float, nullable=False)
    protein_g_total = Column(Float, nullable=False)
    sodium_mg = Column(Float, nullable=False)
    potassium_mg = Column(Float, nullable=False)
    phosphorus_mg = Column(Float, nullable=False)
    fluid_ml = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Recipe(Base):
    """Receta del banco de la app (created_by=null) o creada por un
    nutricionista (created_by=user_id, solo visible para él)."""
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    nombre = Column(String, nullable=False)
    tiempo_comida = Column(String, nullable=False)  # Desayuno|Colación|Comida|Cena
    goal_tags = Column(JSON, nullable=True)  # ["cut","bulk","maintenance"]
    categoria_tags = Column(JSON, nullable=True)  # ["Navidad","Nuevas","Bajo en grasa",...]
    ingredientes = Column(JSON, nullable=False)  # [{"alimento","cantidad_g"}]
    instrucciones = Column(Text, nullable=True)
    kcal_aprox = Column(Float, nullable=True)
    imagen_url = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Classroom(Base):
    """Turma creada por un profesor — los estudiantes se inscriben con un código."""
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    professor_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    nombre = Column(String, nullable=False)
    codigo_acceso = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ClassroomEnrollment(Base):
    __tablename__ = "classroom_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    student_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Appointment(Base):
    """Cita agendada entre el nutricionista y un paciente."""
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=30)
    status = Column(String, default="scheduled")  # scheduled|completed|cancelled|no_show
    notes = Column(Text, nullable=True)
    reminder_sent = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PathologyTemplate(Base):
    """Plan prediseñado por patología/objetivo (biblioteca clínica) — contenido
    curado, no ligado a un paciente. Se asigna copiando su weekly_menu a un
    Plan nuevo."""
    __tablename__ = "pathology_templates"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    categoria = Column(String, nullable=False, index=True)  # "vegano","diabetes","keto",...
    kcal_objetivo = Column(Float, nullable=False)
    descripcion = Column(Text, nullable=True)
    tiempos_por_dia = Column(Integer, default=5)
    weekly_menu = Column(JSON, nullable=False)  # misma forma que Plan.weekly_menu
    imagen_url = Column(String, nullable=True)
    activo = Column(Integer, default=1)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RecipeFavorite(Base):
    """Receta marcada como favorita por un nutricionista."""
    __tablename__ = "recipe_favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PlanPreferences(Base):
    """Preferencias por defecto que el nutricionista puede ajustar en
    Configuración > Plan nutricional — se aplican al abrir un Nuevo plan,
    pero siguen siendo editables por plan en el wizard."""
    __tablename__ = "plan_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    default_formula = Column(String, default="mifflin")  # mifflin|harris|schofield
    default_activity_level = Column(Float, default=1.55)
    default_goal = Column(String, default="cut")  # cut|maintenance|bulk
    protein_pct = Column(Float, default=25)
    fat_pct = Column(Float, default=20)
    carb_pct = Column(Float, default=55)
    kcal_adjustment_cut = Column(Float, default=-300)
    kcal_adjustment_bulk = Column(Float, default=300)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class NutritionistProfile(Base):
    __tablename__ = "nutritionist_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    nombre = Column(String, nullable=True)
    cedula = Column(String, nullable=True)
    especialidad = Column(String, nullable=True)
    clinica = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    email = Column(String, nullable=True)
    logo_base64 = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
