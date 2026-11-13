// 실행: npm run check
import assert from 'node:assert/strict'
import { FRICTION_S, motion, optimal, simulate, sweepG, verify } from './physics.ts'
import { presets, toSI } from './presets.ts'

const near = (x: number, want: number, tol: number, what: string) =>
  assert.ok(Math.abs(x - want) <= tol, `${what}: ${x} (기대 ${want} ± ${tol})`)

for (const id of ['leaf', 'model'] as const) {
  const pr = presets[id]
  const p = toSI(pr)
  const opt = optimal(sweepG(p, pr.gRange, pr.gStep))
  for (const G of [opt.G!, pr.gRange[1], 1.5]) {
    const { storeErr, balanceErr } = verify(p, G)
    assert.ok(storeErr < 0.01 && balanceErr < 0.01, `${id} G=${G} 검산 실패 ${storeErr} ${balanceErr}`)
  }
  const s = simulate(p, opt.G!)
  console.log(id, { v0: p.v0, Gstar: opt.Gstar, G: opt.G, lo: opt.lo, hi: opt.hi, a0: s.a0, Estore: s.Estore })
}

const leafOpt = optimal(sweepG(toSI(presets.leaf), [1, 20], 0.1))
near(leafOpt.Gstar, 8.1, 0.05, 'SC1 G*')
near(leafOpt.G!, 8.1, 1e-9, 'SC1 최적 G')
near(simulate(toSI(presets.leaf), leafOpt.Gstar).a0, 1.98, 0.01, 'SC1 a0(G*)')

const mp = toSI(presets.model)
const mOpt = optimal(sweepG(mp, [1, 10], 0.01))
near(mp.v0, 1.571, 0.01, 'SC2 v0')
near(mOpt.Gstar, 2.0, 0.01, 'SC2 G*')
near(simulate(mp, mOpt.Gstar).a0, 18.33, 0.05, 'SC2 a0(G*)')
assert.ok(!mOpt.starInside)
near(mOpt.lo!, 1.1, 1e-9, 'SC2 구간 시작')
near(mOpt.hi!, 1.22, 1e-9, 'SC2 구간 끝')
near(mOpt.G!, 1.22, 1e-9, 'SC2 최적 G')
near(simulate(mp, 1.22).a0, 2.46, 0.01, 'SC2 a0')
near(simulate(mp, 1.22).Estore, 0.292, 0.001, 'SC2 E_store')
// 정지까지의 운동: 회생 구간 끝에서 이어지고, 마찰 브레이크 뒤 속도 0
const ms = simulate(mp, 1.22)
near(motion(ms, mp.v0, ms.tEnd + 1e-9).v, motion(ms, mp.v0, ms.tEnd).v, 1e-6, '마찰 구간 연속')
near(motion(ms, mp.v0, ms.tEnd + FRICTION_S).v, 0, 1e-12, '정지 속도')
console.log('모든 검산 통과')
