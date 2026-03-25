from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)



class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String)
    phone = Column(String)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
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
