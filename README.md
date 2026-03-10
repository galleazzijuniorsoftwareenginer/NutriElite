Backend SaaS for automated nutritional plan calculation and clinical PDF report generation.

NutriElite is a Python-based backend system designed to calculate metabolic metrics (BMR, TDEE), generate macronutrient distributions, convert values into SMAE portions, perform energy audit validation, and produce structured clinical PDF reports for nutrition professionals.


Developed a Python backend project with automated CI pipeline using GitHub Actions and integrated SonarCloud for static code analysis and code quality monitoring.

Key components:
• Python backend structure
• Git version control
• GitHub repository management
• CI pipeline with GitHub Actions
• Static code analysis with SonarCloud
• Automated quality checks for maintainability, reliability, and security
 Features

JWT Authentication (secure login system)

User registration and authentication

BMR calculation (Harris-Benedict & Mifflin-St Jeor)

TDEE (Total Daily Energy Expenditure) calculation

Goal-based caloric adjustment (cut / maintenance / bulk)

Automatic macronutrient distribution

SMAE portion conversion logic

Energy audit validation (4-4-9 rule)

Dynamic PDF generation with clinical structure

Relational database modeling using SQLAlchemy# NutriElite1



The project follows a layered backend architecture:

routes/      → HTTP endpoints
services/    → Business logic and calculations
models/      → Database models (SQLAlchemy ORM)
schemas/     → Data validation (Pydantic)
database.py  → Database configuration
main.py      → Application entry point
 
This architecture ensures:

Maintainability

Testability

Scalability

Clear separation between logic and transport layers



Tech Stack

Python

FastAPI

SQLAlchemy (ORM)

SQLite

JWT Authentication

ReportLab (PDF rendering engine)

Git



Business Logic Overview
Metabolic Engine

BMR → TDEE → Goal Adjustment → Macronutrient Distribution

Macronutrient allocation is computed based on:

Body weight (g/kg for protein)

Caloric percentage allocation for fats

Remaining caloric distribution for carbohydrates

Energy Audit Validation

Energy consistency is validated using:

Protein = 4 kcal/g
Carbohydrates = 4 kcal/g
Fats = 9 kcal/g

The system compares planned TDEE against calculated macronutrient energy output to ensure nutritional consistency.

📄 PDF Output Includes

Patient information

Anthropometric evaluation (BMI + classification)

Macronutrient audit table

SMAE distribution taThis architecture ensures:

 

Installation
git clone https://github.com/galleazzijuniorsoftwareenginer/NutriElite1.git
cd nutrielite1
python -m venv venv
source venv/bin/activate   # macOS / Linux
venv\Scripts\activate      # Windows
pip install -r requirements.txt


Running the API
uvicorn main:app --reload


API documentation available at:
http://127.0.0.1:8000/docs


Engineering Focus

This project was built to demonstrate:

API design principles

Authentication workflows

Relational database modeling

Business rule implementation

Modular service-layer architecture

Real-world SaaS backend structuring



 Future Improvements

Automated meal plan generation engine that translates macronutrient targets into structured dietary menus

Food database integration with portion-level nutrient mapping

Intelligent macro-to-food allocation algorithm

User branding (logo upload) for personalized clinical reports

Automated energy-closure optimization

Unit and integration testing coverage

Containerization and CI/CD pipeline implementation

Cloud deployment for production scalability



 Project Status

Version 1.0 – Core backend and clinical logic fully implemented.

