// 이상적 무마찰 회생제동(배터리 충전 모델). 모든 값은 SI 단위.

export interface Phys {
  r: number // 바퀴 반지름 [m]
  m: number // 질량 [kg]
  v0: number // 제동 직전 속도 [m/s]
  Vmin: number // 최소(배터리) 전압 [V]
  k: number // 발전기 상수 [V/rpm]
  Ri: number // 내부저항 [Ω]
  eta: number // 발전기 효율
}

export interface Sim {
  G: number
  c: number // [V·s/m]
  e0: number // [V]
  vth: number // [m/s]
  tau: number // [s]
  tEnd: number // [s], 저장 없으면 0
  charging: boolean
  Estore: number
  Eloss: number
  Erest: number
  Emax: number
  ratio: number
  a0: number // [m/s²]
  aAvg: number // [m/s²]
  Gstar: number
}

export const kT = (k: number) => (k * 60) / (2 * Math.PI)

export const gStar = (p: Phys) => (2 * p.Vmin * p.r) / (kT(p.k) * p.v0)

export function simulate(p: Phys, G: number): Sim {
  const c = (kT(p.k) * G) / p.r
  const e0 = c * p.v0
  const vth = p.Vmin / c
  const tau = (p.m * p.Ri) / (c * c)
  const charging = e0 > p.Vmin
  const Emax = p.eta * 0.5 * p.m * p.v0 ** 2
  const base = { G, c, e0, vth, tau, charging, Emax, Gstar: gStar(p) }
  if (!charging) {
    return { ...base, tEnd: 0, Estore: 0, Eloss: 0, Erest: 0.5 * p.m * p.v0 ** 2, ratio: 0, a0: 0, aAvg: 0 }
  }
  const tEnd = 5 * tau
  const Estore = p.eta * p.m * vth * (p.v0 - vth)
  const vEnd = vth + (p.v0 - vth) * Math.exp(-5)
  return {
    ...base,
    tEnd,
    Estore,
    Eloss: 0.5 * p.m * (p.v0 - vth) ** 2,
    Erest: 0.5 * p.m * vth ** 2,
    ratio: Estore / Emax,
    a0: (c * (e0 - p.Vmin)) / (p.Ri * p.m),
    aAvg: (p.v0 - vEnd) / tEnd,
  }
}

/** 속도 v(t) */
export function velocity(s: Sim, v0: number, t: number) {
  return s.charging ? s.vth + (v0 - s.vth) * Math.exp(-t / s.tau) : v0
}

/** 이동 거리 ∫v dt (교류 위상, 회전각 계산용) */
export function distance(s: Sim, v0: number, t: number) {
  return s.charging ? s.vth * t + (v0 - s.vth) * s.tau * (1 - Math.exp(-t / s.tau)) : v0 * t
}

export interface SweepPoint { G: number; Estore: number; a0: number }
export interface Sweep { points: SweepPoint[]; Gstar: number }

export function sweepG(p: Phys, [g0, g1]: [number, number], step: number): Sweep {
  const n = Math.round((g1 - g0) / step)
  const points: SweepPoint[] = []
  for (let i = 0; i <= n; i++) {
    const G = Math.round((g0 + i * step) * 1e6) / 1e6
    const s = simulate(p, G)
    points.push({ G, Estore: s.Estore, a0: s.a0 })
  }
  return { points, Gstar: gStar(p) }
}

export const A_MIN = 1
export const A_MAX = 2.5

export interface Optimal {
  G: number | null
  lo: number | null // 적정 감속도 구간 경계
  hi: number | null
  starInside: boolean
  Gstar: number
}

export function optimal({ points, Gstar }: Sweep): Optimal {
  const ok = points.filter((q) => q.a0 >= A_MIN && q.a0 <= A_MAX)
  if (!ok.length) return { G: null, lo: null, hi: null, starInside: false, Gstar }
  const best = ok.reduce((a, b) => (b.Estore > a.Estore ? b : a))
  const lo = ok[0].G
  const hi = ok[ok.length - 1].G
  return { G: best.G, lo, hi, starInside: Gstar >= lo && Gstar <= hi, Gstar }
}

/** RK4 검산: 적분 E_store, 에너지 수지. 상대오차 반환 */
export function verify(p: Phys, G: number) {
  const s = simulate(p, G)
  if (!s.charging) return { storeErr: 0, balanceErr: 0 }
  const accel = (v: number) => -(s.c * Math.max(0, (s.c * v - p.Vmin) / p.Ri)) / p.m
  const dt = s.tau / 200
  let v = p.v0
  let Estore = 0
  let Eloss = 0
  // 저장 전력 η·V_min·I, 열손실 I²·R_i 를 v와 함께 RK4로 적분
  const f = (x: number) => {
    const I = Math.max(0, (s.c * x - p.Vmin) / p.Ri)
    return [accel(x), p.eta * p.Vmin * I, I * I * p.Ri]
  }
  for (let t = 0; t < 10 * s.tau; t += dt) {
    const k1 = f(v)
    const k2 = f(v + (dt / 2) * k1[0])
    const k3 = f(v + (dt / 2) * k2[0])
    const k4 = f(v + dt * k3[0])
    const inc = (i: number) => (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
    Estore += inc(1)
    Eloss += inc(2)
    v += inc(0)
  }
  const KE0 = 0.5 * p.m * p.v0 ** 2
  return {
    storeErr: Math.abs(Estore - s.Estore) / s.Estore,
    balanceErr: Math.abs(Estore / p.eta + Eloss + 0.5 * p.m * v * v - KE0) / KE0,
  }
}
