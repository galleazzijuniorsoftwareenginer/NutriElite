import type { Formula, Gender, Goal, NutritionistProfile, WeeklyMenu } from '../../types'

export interface WizardPlanData {
  planId: number
  patientName: string
  patientEmail: string
  patientPhone: string
  patientId: number | null
  weight: number
  height: number
  age: number
  gender: Gender
  activityLevel: number
  goal: Goal
  formula: Formula
  useEta: boolean
  tmb: number
  originalGet: number
}

export interface WizardState {
  plan: WizardPlanData | null
  carbPct: number
  protPct: number
  fatPct: number
  kcalAdjustment: number
  weeklyMenu: WeeklyMenu | null
  profile: NutritionistProfile | null
}

export const DEFAULT_PCT = { carbPct: 55, protPct: 25, fatPct: 20 }
