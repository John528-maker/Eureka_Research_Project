// 실행: npm run check
import assert from 'node:assert/strict'
import { FRICTION_S, motion, optimal, simulate, sweepG, verify } from './physics.ts'
import { model, toSI } from './presets.ts'

const near = (x: number, want: number, tol: number, what: string) =>
  assert.ok(Math.abs(x - want) <= tol, `${what}: ${x} (기대 ${want} ± ${tol})`)

const mp = toSI(model)
const mOpt = optimal(sweepG(mp, model.gRange, model.gStep))
for (const G of [mOpt.G!, model.gRange[1], 1.5]) {
  const { storeErr, balanceErr } = verify(mp, G)
  assert.ok(storeErr < 0.01 && balanceErr < 0.01, `model G=${G} 검산 실패 ${storeErr} ${balanceErr}`)
}
const s = simulate(mp, mOpt.G!)
console.log('model', { v0: mp.v0, Gstar: mOpt.Gstar, G: mOpt.G, lo: mOpt.lo, hi: mOpt.hi, a0: s.a0, Estore: s.Estore })

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
