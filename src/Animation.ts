import type { EasingType, AnimationEvents } from './types.js'
import { EventEmitter } from './EventEmitter.js'

// ============================================================
// Easing Functions
// ============================================================

const easings: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,

  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),

  easeInQuint: (t) => t * t * t * t * t,
  easeOutQuint: (t) => 1 + (--t) * t * t * t * t,
  easeInOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t),

  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : t < 0.5
          ? Math.pow(2, 20 * t - 10) / 2
          : (2 - Math.pow(2, -20 * t + 10)) / 2,

  easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t) => Math.sqrt(1 - (t - 1) * (t - 1)),
  easeInOutCirc: (t) =>
    t < 0.5
      ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
      : (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2,

  easeInBack: (t) => { const c1 = 1.70158; return (c1 + 1) * t * t * t - c1 * t * t },
  easeOutBack: (t) => { const c1 = 1.70158; return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) },
  easeInOutBack: (t) => {
    const c1 = 1.70158
    const c2 = c1 * 1.525
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (2 * t - 2) + c2) + 2) / 2
  },

  easeInElastic: (t) => {
    if (t === 0) return 0
    if (t === 1) return 1
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3))
  },
  easeOutElastic: (t) => {
    if (t === 0) return 0
    if (t === 1) return 1
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
  },
  easeInOutElastic: (t) => {
    if (t === 0) return 0
    if (t === 1) return 1
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2 + 1
  },

  easeInBounce: (t) => 1 - easings.easeOutBounce(1 - t),
  easeOutBounce: (t) => {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) return n1 * t * t
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  },
  easeInOutBounce: (t) =>
    t < 0.5
      ? (1 - easings.easeOutBounce(1 - 2 * t)) / 2
      : (1 + easings.easeOutBounce(2 * t - 1)) / 2,
}

// ============================================================
// Compound Operator Parsing
// ============================================================

/** 복합 대입 연산자 문자열을 파싱하여 최종 목표값을 계산합니다. */
function resolveTarget(current: number, raw: number | string): number {
  if (typeof raw === 'number') return raw
  if (raw.startsWith('+=')) return current + parseFloat(raw.slice(2))
  if (raw.startsWith('-=')) return current - parseFloat(raw.slice(2))
  if (raw.startsWith('*=')) return current * parseFloat(raw.slice(2))
  if (raw.startsWith('/=')) return current / parseFloat(raw.slice(2))
  return parseFloat(raw)
}

// ============================================================
// Deep Snapshot & Interpolation
// ============================================================

type DeepRecord = { [key: string]: number | string | DeepRecord }

/** 현재 객체에서 숫자 값의 스냅샷을 재귀적으로 추출합니다. */
function snapshotNumbers(source: Record<string, any>, target: DeepRecord): Record<string, any> {
  const snapshot: Record<string, any> = {}
  for (const key of Object.keys(target)) {
    const tVal = (target as any)[key]
    const sVal = (source as any)?.[key]
    if (tVal !== null && typeof tVal === 'object' && !Array.isArray(tVal)) {
      snapshot[key] = snapshotNumbers(sVal ?? {}, tVal)
    } else if (typeof tVal === 'number' || typeof tVal === 'string') {
      snapshot[key] = typeof sVal === 'number' ? sVal : 0
    }
  }
  return snapshot
}

/** from → to를 t(0~1)로 선형 보간하여 결과 객체를 반환합니다. */
function interpolate(
  from: Record<string, any>,
  to: Record<string, any>,
  t: number,
  rawTarget: DeepRecord
): Record<string, any> {
  const result: Record<string, any> = {}
  for (const key of Object.keys(to)) {
    const toVal = (to as any)[key]
    const fromVal = (from as any)?.[key]
    const raw = (rawTarget as any)[key]
    if (toVal !== null && typeof toVal === 'object' && !Array.isArray(toVal)) {
      result[key] = interpolate(fromVal ?? {}, toVal, t, raw)
    } else if (typeof toVal === 'number' && typeof fromVal === 'number') {
      result[key] = fromVal + (toVal - fromVal) * t
    }
  }
  return result
}

/** rawTarget의 복합 연산자를 현재 값 기준으로 최종 순자 목표로 변환합니다. */
function resolveAllTargets(current: Record<string, any>, raw: DeepRecord): Record<string, any> {
  const resolved: Record<string, any> = {}
  for (const key of Object.keys(raw)) {
    const rVal = (raw as any)[key]
    const cVal = (current as any)?.[key]
    if (rVal !== null && typeof rVal === 'object' && !Array.isArray(rVal)) {
      resolved[key] = resolveAllTargets(cVal ?? {}, rVal)
    } else if (typeof rVal === 'number' || typeof rVal === 'string') {
      resolved[key] = resolveTarget(typeof cVal === 'number' ? cVal : 0, rVal)
    }
  }
  return resolved
}

// ============================================================
// Animation Class
// ============================================================

export type AnimationCallback = (state: Record<string, any>) => void

export class Animation extends EventEmitter<AnimationEvents> {
  private _initialTarget: DeepRecord
  private _rafId: number | null = null
  private _startTime: number | null = null
  private _pausedElapsed: number = 0
  private _isPaused: boolean = false
  private _duration: number = 0
  private _easingFn: (t: number) => number = easings.linear
  private _callback: AnimationCallback | null = null
  private _from: Record<string, any> = {}
  private _to: Record<string, any> = {}

  constructor(target: DeepRecord) {
    super()
    this._initialTarget = target
  }

  /**
   * 애니메이션을 시작합니다.
   * @param callback 매 프레임마다 현재 상태를 전달받는 콜백
   * @param duration 지속 시간 (ms)
   * @param easing 이징 함수 이름 (기본값: 'linear')
   */
  start(callback: AnimationCallback, duration: number, easing: EasingType = 'linear') {
    this.stop()
    this._callback = callback
    this._duration = duration
    this._easingFn = easings[easing] ?? easings.linear

    // initialTarget의 복합 연산자 기준이 되는 시작값은 0으로 간주
    this._from = snapshotNumbers({}, this._initialTarget)
    this._to = resolveAllTargets({}, this._initialTarget)
    this._pausedElapsed = 0
    this._isPaused = false

    this.emit('start')
    this._tick(null)
  }

  pause() {
    if (this._isPaused || this._startTime === null) return
    this._isPaused = true
    this._pausedElapsed += performance.now() - this._startTime
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
    this.emit('pause')
  }

  resume() {
    if (!this._isPaused) return
    this._isPaused = false
    this._startTime = null  // _tick에서 재설정
    this.emit('resume')
    this._tick(null)
  }

  stop() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
      this.emit('stop')
    }
    this._startTime = null
    this._pausedElapsed = 0
    this._isPaused = false
  }

  private _tick(timestamp: number | null) {
    const now = timestamp ?? performance.now()

    if (this._startTime === null) {
      this._startTime = now - this._pausedElapsed
    }

    const elapsed = now - this._startTime
    const rawT = Math.min(elapsed / this._duration, 1)
    const easedT = this._easingFn(rawT)

    const state = interpolate(this._from, this._to, easedT, this._initialTarget)
    this._callback?.(state)
    this.emit('update', state)

    if (rawT < 1) {
      this._rafId = requestAnimationFrame((ts) => this._tick(ts))
    } else {
      this._rafId = null
      this.emit('end')
    }
  }
}

// ============================================================
// Helpers for LveObject.animate()
// ============================================================

/** LveObject의 animate()에서 사용 - source 객체를 직접 업데이트합니다. */
export function animateObject(
  source: Record<string, any>,
  rawTarget: DeepRecord,
  duration: number,
  easing: EasingType = 'linear'
): Animation {
  const from = snapshotNumbers(source, rawTarget)
  const to = resolveAllTargets(source, rawTarget)

  const easingFn = easings[easing] ?? easings.linear
  let startTime: number | null = null

  const anim = new Animation(rawTarget)

    // internal override: start()를 source 기반으로 재정의
    ; (anim as any)._from = from
    ; (anim as any)._to = to
    ; (anim as any)._duration = duration
    ; (anim as any)._easingFn = easingFn
    ; (anim as any)._pausedElapsed = 0
    ; (anim as any)._isPaused = false

  const tick = (timestamp: number | null) => {
    const now = timestamp ?? performance.now()
    if (startTime === null) startTime = now

    const elapsed = now - startTime
    const rawT = Math.min(elapsed / duration, 1)
    const easedT = easingFn(rawT)

    applyInterpolated(source, from, to, easedT, rawTarget)

    if (rawT < 1) {
      (anim as any)._rafId = requestAnimationFrame((ts) => tick(ts))
    } else {
      (anim as any)._rafId = null
      anim.emit('end')
    }
  }

  (anim as any)._rafId = requestAnimationFrame((ts) => tick(ts))

  return anim
}

/** 보간 결과를 source 객체에 직접 씁니다 (재귀). */
function applyInterpolated(
  source: Record<string, any>,
  from: Record<string, any>,
  to: Record<string, any>,
  t: number,
  raw: DeepRecord
) {
  for (const key of Object.keys(to)) {
    const toVal = (to as any)[key]
    const fromVal = (from as any)?.[key]
    if (toVal !== null && typeof toVal === 'object' && !Array.isArray(toVal)) {
      if (source[key] === undefined || source[key] === null) source[key] = {}
      applyInterpolated(source[key], fromVal ?? {}, toVal, t, (raw as any)[key])
    } else if (typeof toVal === 'number' && typeof fromVal === 'number') {
      source[key] = fromVal + (toVal - fromVal) * t
    }
  }
}

export { easings }
export type { EasingType }
