import type { Phys } from './physics.ts'

export type TabId = 'leaf' | 'model'

export interface Params {
  r: number // [m]
  m: number // [kg]
  v0_kmh?: number
  rpm?: number
  V_min: number
  k: number // [V/rpm]
  R_i: number
  eta: number
  gRange: [number, number]
  gStep: number
}

export const leaf: Params = { r: 0.216, m: 1521, v0_kmh: 60, V_min: 240, k: 0.08, R_i: 2.3 /* 이상화 가정값 */, eta: 0.8, gRange: [1, 20], gStep: 0.1 }

export const model: Params = {
  r: 0.15,
  m: 1,
  rpm: 150 /* TODO 임시값 */,
  V_min: 11,
  k: 0.08 /* 사용자 제공, 사양표 불일치: 라벨 rpm 확인 후 12/rpm */,
  R_i: 10 /* 추정: 사양표 근사 */,
  eta: 0.8 /* 가정 */,
  gRange: [1, 10],
  gStep: 0.01,
}

export const presets: Record<TabId, Params> = { leaf, model }

export const speedOf = (p: Params) =>
  p.rpm !== undefined ? (2 * Math.PI * p.r * p.rpm) / 60 : (p.v0_kmh ?? 0) / 3.6

export const toSI = (p: Params): Phys => ({ r: p.r, m: p.m, v0: speedOf(p), Vmin: p.V_min, k: p.k, Ri: p.R_i, eta: p.eta })
