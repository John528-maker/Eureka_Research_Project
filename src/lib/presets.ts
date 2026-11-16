import type { Phys } from './physics.ts'

export interface Params {
  r: number // [m]
  m: number // [kg]
  rpm: number
  V_min: number
  k: number // [V/rpm]
  R_i: number
  eta: number
  gRange: [number, number]
  gStep: number
}

export const model: Params = {
  r: 0.075, /* 메인 바퀴 지름 15cm */
  m: 1,
  rpm: 200 /* 구동 모터 200rpm, 모터 기어와 축 기어가 같은 크기(실물 사진 기준 1:1) → 바퀴도 200rpm */,
  V_min: 12,
  k: 0.06 /* 발전용 모터 12V@200rpm → 12/200 */,
  R_i: 10 /* 추정: 사양표 근사 */,
  eta: 0.8 /* 가정 */,
  gRange: [1, 10],
  gStep: 0.01,
}

export const speedOf = (p: Params) => (2 * Math.PI * p.r * p.rpm) / 60

export const toSI = (p: Params): Phys => ({ r: p.r, m: p.m, v0: speedOf(p), Vmin: p.V_min, k: p.k, Ri: p.R_i, eta: p.eta })
