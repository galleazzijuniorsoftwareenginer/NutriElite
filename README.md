 ## NutriElite

Backend SaaS for automated nutritional plan calculation and clinical PDF report generation.

The NutriElite backend is a Python-based system designed to calculate metabolic metrics, generate macronutrient distributions, convert values into SMAE portions, validate nutritional energy consistency, and produce structured clinical PDF reports for nutrition professionals.

The system is deployed in the cloud and publicly accessible.

## Live API

## Base URL

https://nutrielite-production-e88f.up.railway.app

## Swagger Documentation

https://nutrielite-production-e88f.up.railway.app/docs

## Live App Demo

https://nutrielite-production-e88f.up.railway.app/app/

## Overview

NutriElite is a backend SaaS platform that performs automated nutritional calculations and generates structured clinical reports.

The system calculates:

Basal Metabolic Rate (BMR)

Total Daily Energy Expenditure (TDEE)

Goal-adjusted caloric intake

Macronutrient distribution

SMAE portion conversion

Energy audit validation

Clinical PDF report generation

## Architecture

The project follows a layered backend architecture:

routes/      → HTTP endpoints
services/    → Business logic
models/      → Database models (SQLAlchemy ORM)
schemas/     → Data validation (Pydantic)
database.py  → Database configuration
main.py      → Application entry point

This architecture ensures:

Maintainability

Testability

Scalability

Clear separation of concerns

## Tech Stack

Python

FastAPI

SQLAlchemy

SQLite

JWT Authentication

ReportLab (PDF rendering)

Docker

Docker Compose

GitHub Actions (CI)

SonarCloud (static code analysis)

Railway (cloud deployment)

## DevOps & CI Pipeline

The project includes an automated CI pipeline.

Pipeline flow:

git push
   ↓
GitHub Actions
   ↓
SonarCloud static analysis
   ↓
Railway deployment

This ensures:

automated code quality monitoring

maintainability analysis

secure and reliable deployments

## Features

Authentication

JWT authentication

User registration

Secure login system

Metabolic Calculations

BMR calculation

Harris-Benedict

Mifflin-St Jeor

TDEE calculation

Goal-based caloric adjustment

Cut

Maintenance

Bulk

Nutrition Logic

Automatic macronutrient distribution

SMAE portion conversion

Energy audit validation (4-4-9 rule)

Clinical Reporting

Dynamic clinical PDF generation

Structured nutrition reports

Anthropometric evaluation (BMI classification)

## Business Logic Overview

Metabolic Engine Flow

BMR → TDEE → Goal Adjustment → Macronutrient Distribution

Macronutrient allocation is computed using:

Body weight for protein (g/kg)

Caloric percentage allocation for fats

Remaining caloric distribution for carbohydrates

## Energy Audit Validation

Energy consistency is validated using the standard nutrition rule:

Protein        = 4 kcal/g
Carbohydrates  = 4 kcal/g
Fats           = 9 kcal/g

The system compares calculated macronutrient energy against planned caloric intake to ensure nutritional consistency.

## PDF Clinical Report Includes

Patient information

Anthropometric evaluation

BMI classification

Macronutrient audit table

SMAE distribution table

## Running Locally

Clone the repository:

git clone https://github.com/galleazzijuniorsoftwareenginer/NutriElite1.git
cd NutriElite1

Create virtual environment:

python -m venv venv

Activate environment:

macOS / Linux

source venv/bin/activate

Windows

venv\Scripts\activate

Install dependencies:

pip install -r requirements.txt

Run the API:

uvicorn backend.main:app --reload

API documentation:

http://127.0.0.1:8000/docs

## Running with Docker

Build and start containers:

docker compose up --build

API will be available at:

http://localhost:8000/docs

## Engineering Focus

This project demonstrates:

Backend API architecture

Authentication workflows

Relational database modeling

Modular service-layer design

Business rule implementation

CI/CD integration

Containerized backend deployment

## Future Improvements

Automated meal plan generation engine

Food database integration

Intelligent macro-to-food allocation algorithm

User branding for clinical reports

Energy closure optimization

Unit and integration tests

Full containerized production deployment

Advanced CI/CD automation

## Project Status

Version 1.0

Core backend architecture and clinical nutritional calculation engine fully implemented.