import { LveObject } from '../LveObject.js'
import type { LveObjectOptions } from '../types.js'
import type { ParticleClip, ParticleManager } from '../ParticleManager.js'
import type { PhysicsEngine } from '../PhysicsEngine.js'
import Matter from 'matter-js'

export interface ParticleAttribute {
  src?: string
}
export interface ParticleOptions<D extends Record<string, any> = Record<string, any>> extends LveObjectOptions<ParticleAttribute, D> {
  /**
   * true이면 matter-js 기반 물리를 각 파티클 인스턴스에 적용합니다.
   * false(기본)이면 내부 velocity 시뮬레이션을 사용합니다.
   */
  strict?: boolean
}

export interface ParticleInstance {
  /** 에미터 기준 초기 스폰 x 오프셋 (px) */
  spawnX: number
  /** 에미터 기준 초기 스폰 y 오프셋 (px) */
  spawnY: number
  /** 에미터 기준 초기 스폰 z 오프셋 (px) */
  spawnZ: number
  /** 에미터 기준 현재 x 좌표 (px) — tick마다 갱신 */
  x: number
  /** 에미터 기준 현재 y 좌표 (px) — tick마다 갱신 */
  y: number
  /** 에미터 기준 현재 z 좌표 (px) — tick마다 갱신 */
  z: number
  /** x 방향 속도 (px/ms) */
  vx: number
  /** y 방향 속도 (px/ms) */
  vy: number
  /** z 방향 속도 (px/ms) */
  vz: number
  /** 시작 크기 배율 */
  startSize: number
  /** 종료 크기 배율 */
  endSize: number
  /** 생성 timestamp */
  born: number
  /** 생존 시간 (ms) */
  lifespan: number
  /** strict 모드 전용 matter-js 바디 */
  body?: Matter.Body
}

const GRAVITY = 0.00015 // px/ms² (내부 시뮬레이션용 중력 가속도)
export class Particle<D extends Record<string, any> = Record<string, any>> extends LveObject<ParticleAttribute, D> {
  /** strict 모드 여부 */
  readonly strict: boolean

  private _manager: ParticleManager | null = null
  private _clipName: string | null = null
  _clip: ParticleClip | null = null

  /** 활성 파티클 인스턴스 목록 (Renderer에서 직접 참조) */
  _instances: ParticleInstance[] = []

  private _playing: boolean = false
  private _lastSpawnTime: number = 0
  private _spawnCount: number = 0   // loop=false 일 때 총 스폰 횟수 추적

  /** PhysicsEngine 참조 (strict 모드 전용) */
  private _physics: PhysicsEngine | null = null

  /** 일시정지 여부 */
  private _paused: boolean = false

  constructor(options?: ParticleOptions<D>) {
    super('particle', options)
    this.strict = options?.strict ?? false
  }

  /**
   * ParticleManager를 연결합니다.
   */
  __setManager(manager: ParticleManager): this {
    this._manager = manager
    return this
  }

  /**
   * PhysicsEngine을 연결합니다. strict=true 시 필요합니다.
   */
  __setPhysics(physics: PhysicsEngine): this {
    this._physics = physics
    return this
  }

  /**
   * 지정한 클립 이름으로 파티클 에미션을 시작합니다.
   */
  play(name: string): this {
    if (!this._manager) {
      console.warn('[Particle] __setManager()를 먼저 호출하십시오.')
      return this
    }
    const clip = this._manager.get(name)
    if (!clip) {
      console.warn(`[Particle] 클립 '${name}'을 찾을 수 없습니다.`)
      return this
    }
    this._clipName = name
    this._clip = clip
    this._playing = true
    this._lastSpawnTime = 0
    this._spawnCount = 0
    this._instances = []
    this.emit('play')
    return this
  }

  /**
   * 파티클 에미션을 일시정지합니다.
   */
  pause(): this {
    if (!this._playing || this._paused) return this
    this._paused = true
    this.emit('pause')
    return this
  }

  /**
   * 파티클 에미션을 정지합니다. 이미 생성된 인스턴스는 lifespan까지 유지됩니다.
   */
  stop(): this {
    if (!this._playing && !this._paused) return this
    const wasLooping = this._clip?.loop ?? false
    this._playing = false
    this._paused = false
    if (wasLooping) {
      this.emit('repeat')
    } else {
      this.emit('ended')
    }
    return this
  }

  /**
   * Renderer에서 매 프레임 호출합니다.
   * 인스턴스 생성/업데이트/제거를 처리합니다.
   */
  tick(timestamp: number) {
    if (!this._clip) return

    const clip = this._clip

    // 최초 호출 시 기준 시간 설정
    if (this._lastSpawnTime === 0) {
      this._lastSpawnTime = timestamp
    }

    // ─── 스폰 처리 ───────────────────────────────────────
    if (this._playing && !this._paused) {
      const elapsed = timestamp - this._lastSpawnTime
      if (elapsed >= clip.interval) {
        this._spawn(timestamp)
        this._lastSpawnTime = timestamp
        this._spawnCount++

        // loop=false 이면 1회 스폰 후 에미션 정지
        if (!clip.loop) {
          this._playing = false
        }
      }
    }

    // ─── 인스턴스 업데이트 & 제거 ────────────────────────
    // 비물리 모드라도 월드의 물리엔진 중력 가속도와 객체의 gravityScale을 추적하여 반영합니다.
    const gScale = this.attribute.gravityScale ?? 1
    const gX = this._physics ? (this._physics.engine.gravity.x * this._physics.engine.gravity.scale) / 16.666 : 0
    const gY = this._physics ? (this._physics.engine.gravity.y * this._physics.engine.gravity.scale) / 16.666 : GRAVITY

    const alive: ParticleInstance[] = []
    for (const inst of this._instances) {
      const age = timestamp - inst.born
      if (age >= inst.lifespan) {
        // 만료 → strict 모드이면 바디 제거
        if (inst.body && this._physics) {
          this._removeInstanceBody(inst)
        }
        continue
      }

      if (!inst.body) {
        // 일반 모드: 초기 스폰 오프셋 + velocity 적분으로 위치 계산
        const dt = timestamp - inst.born  // ms
        inst.x = inst.spawnX + inst.vx * dt + 0.5 * (gX * gScale) * dt * dt
        inst.y = inst.spawnY + inst.vy * dt + 0.5 * (gY * gScale) * dt * dt
        inst.z = inst.spawnZ + inst.vz * dt
      } else {
        // strict 모드: matter-js 바디 위치를 상대 좌표로
        const emX = this.transform.position.x
        const emY = this.transform.position.y
        inst.x = inst.body.position.x - emX
        inst.y = inst.body.position.y - emY
        inst.z = inst.spawnZ // matter.js는 2D이므로 z 보존
      }

      alive.push(inst)
    }
    this._instances = alive
  }

  private _spawn(timestamp: number) {
    const clip = this._clip!
    const attr = this.attribute
    const emX = this.transform.position.x
    const emY = this.transform.position.y

    // clip에서 스폰 범위 읽기 (미지정 시 0 → 에미터 중심에서만 생성)
    const rangeX = clip.spawnX ?? 0
    const rangeY = clip.spawnY ?? 0
    const rangeZ = clip.spawnZ ?? 0

    for (let i = 0; i < clip.rate; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * clip.impulse

      const startSzMin = clip.size?.start?.min ?? 1
      const startSzMax = clip.size?.start?.max ?? 1
      const endSzMin = clip.size?.end?.min ?? 0
      const endSzMax = clip.size?.end?.max ?? 0
      const startSize = startSzMin + Math.random() * (startSzMax - startSzMin)
      const endSize = endSzMin + Math.random() * (endSzMax - endSzMin)

      // 에미터 범위 내 랜덤 스폰 위치 (중심 기준 ±range/2)
      const offsetX = rangeX > 0 ? (Math.random() - 0.5) * rangeX : 0
      const offsetY = rangeY > 0 ? (Math.random() - 0.5) * rangeY : 0
      const offsetZ = rangeZ > 0 ? (Math.random() - 0.5) * rangeZ : 0

      const inst: ParticleInstance = {
        spawnX: offsetX,
        spawnY: offsetY,
        spawnZ: offsetZ,
        x: offsetX,
        y: offsetY,
        z: offsetZ,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 0,
        startSize,
        endSize,
        born: timestamp,
        lifespan: clip.lifespan,
      }

      if (this.strict && this._physics) {
        // strict 모드: 스폰 오프셋을 적용한 world 좌표에 바디 생성
        const pw = this.style.width ? Math.min(this.style.width, this.style.height ?? this.style.width) / 4 : 4
        const bodyOpts: any = {
          density: attr.density ?? 0.001,
          friction: attr.friction ?? 0,
          restitution: attr.restitution ?? 0.3,
          frictionAir: attr.frictionAir ?? 0.03,
          collisionFilter: {
            group: attr.collisionGroup ?? -1,
            mask: attr.collisionMask ?? 0xFFFFFFFF,
            category: attr.collisionCategory ?? 0x0001,
          },
        }
        const body = Matter.Bodies.circle(emX + offsetX, emY + offsetY, Math.max(pw, 2), bodyOpts)
        // IBodyDefinition에 없는 필드는 직접 할당
        if (attr.fixedRotation) Matter.Body.setInertia(body, Infinity)
        if (attr.gravityScale != null) (body as any).gravityScale = attr.gravityScale
        // 초기 속도 부여
        Matter.Body.setVelocity(body, { x: inst.vx * 16, y: inst.vy * 16 })
        Matter.Composite.add(this._physics.engine.world, body)
        inst.body = body
      }

      this._instances.push(inst)
    }
  }

  private _removeInstanceBody(inst: ParticleInstance) {
    if (!inst.body || !this._physics) return
    Matter.Composite.remove(this._physics.engine.world, inst.body)
    inst.body = undefined
  }
}
