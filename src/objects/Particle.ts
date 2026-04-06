import { LeviarObject } from '../LeviarObject.js'
import type { LeviarObjectOptions } from '../types.js'
import type { ParticleClip, ParticleManager } from '../ParticleManager.js'
import type { PhysicsEngine } from '../PhysicsEngine.js'
import Matter from 'matter-js'

export interface ParticleAttribute {
  src?: string
  /**
   * true이면 matter-js 기반 물리를 각 파티클 인스턴스에 적용합니다.
   * false(기본)이면 내부 velocity 시뮬레이션을 사용합니다.
   */
  strictPhysics?: boolean
}

const DELEGATED_KEYS = ['src']

export interface ParticleOptions<
  D extends Record<string, any> = Record<string, any>
> extends LeviarObjectOptions<ParticleAttribute, D> {
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
  /** 크기 궤적 (보간용) */
  sizes: number[]
  /** 투명도 궤적 (보간용) */
  opacities: number[]
  /** 생성 timestamp */
  born: number
  /** 생존 시간 (ms) */
  lifespan: number
  /** 현재 회전각 (rad) — 매 tick 갱신 */
  angle: number
  /** 각속도 (rad/ms) — 스폰 시 결정 */
  angularVelocity: number
  /** strict 모드 전용 matter-js 바디 */
  body?: Matter.Body
  /** 가상 물리(strict=false) 누적 연산용 마지막 갱신 시간 */
  lastTick?: number
}

// matter-js 기본 중력(gravity.y=1, scale=0.001)에 의해 매 step 속도에 더해지는 가속도는 0.001 px/ms²로 정확히 일치합니다.
const GRAVITY = 0.001 // px/ms²

export class Particle<
  D extends Record<string, any> = Record<string, any>
> extends LeviarObject<ParticleAttribute, D> {

  private __manager: ParticleManager | null = null
  private __clipName: string | null = null
  __clip: ParticleClip | null = null
  /** 생성자 시점에 __manager가 없어서 보류된 src 값 */
  private __pendingSrc: string | null = null

  /** 활성 파티클 인스턴스 목록 (Renderer에서 직접 참조) */
  __instances: ParticleInstance[] = []

  private __playing: boolean = false
  private __lastSpawnTime: number = 0
  private __spawnCount: number = 0   // loop=false 일 때 총 스폰 횟수 추적

  /** PhysicsEngine 참조 (strict 모드 전용) */
  private __physics: PhysicsEngine | null = null

  /** 일시정지 여부 */
  private __paused: boolean = false

  private static readonly DELEGATED_GETTERS: Record<string, (self: Particle) => any> = {
    src: (self) => self.__clipName ?? undefined,
  }

  private static readonly DELEGATED_SETTERS: Record<string, (self: Particle, value: any) => void> = {
    src: (self, value: string) => {
      if (!self.__manager) {
        console.warn('[Particle] __setManager()를 먼저 호출하십시오.')
        return
      }
      const clip = self.__manager.get(value)
      if (!clip) {
        console.warn(`[Particle] 클립 '${value}'을 찾을 수 없습니다.`)
        return
      }
      self.__clipName = value
      self.__clip = clip
      self.__playing = false
      self.__paused = false
      self.__lastSpawnTime = 0
      self.__spawnCount = 0
      self.__instances = []
    },
  }

  constructor(options?: ParticleOptions<D>) {
    super('particle', options, DELEGATED_KEYS)
    // src setter는 __manager에 의존하므로 생성자 시점에 처리할 수 없습니다.
    // __setManager() 호출 시 자동으로 적용됩니다.
    this.__pendingSrc = (options?.attribute as any)?.src ?? null
  }

  /**
   * ParticleManager를 연결합니다.
   */
  __setManager(manager: ParticleManager): this {
    this.__manager = manager
    if (this.__pendingSrc) {
      this.attribute.src = this.__pendingSrc
      this.__pendingSrc = null
    }
    return this
  }

  /**
   * PhysicsEngine을 연결합니다. strict=true 시 필요합니다.
   */
  __setPhysics(physics: PhysicsEngine): this {
    this.__physics = physics
    return this
  }

  /**
   * 파티클 에미션을 시작합니다.
   */
  play(): this {
    if (!this.__clip) {
      console.warn('[Particle] src 속성을 먼저 설정하십시오.')
      return this
    }
    this.__playing = true
    this.__paused = false
    this.emit('play')
    return this
  }

  /**
   * 파티클 에미션을 일시정지합니다.
   */
  pause(): this {
    if (!this.__playing || this.__paused) return this
    this.__paused = true
    this.emit('pause')
    return this
  }

  /**
   * 파티클 에미션을 정지합니다. 이미 생성된 인스턴스는 lifespan까지 유지됩니다.
   */
  stop(): this {
    if (!this.__playing && !this.__paused) return this
    const wasLooping = this.__clip?.loop ?? false
    this.__playing = false
    this.__paused = false
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
  __tick(timestamp: number) {
    if (!this.__clip) return

    const clip = this.__clip

    // 최초 호출 시 기준 시간 설정
    if (this.__lastSpawnTime === 0) {
      this.__lastSpawnTime = timestamp
    }

    // ─── 스폰 처리 ───────────────────────────────────────
    if (this.__playing && !this.__paused) {
      const elapsed = timestamp - this.__lastSpawnTime
      if (elapsed >= clip.interval) {
        this._spawn(timestamp)
        this.__lastSpawnTime = timestamp
        this.__spawnCount++

        // loop=false 이면 1회 스폰 후 에미션 정지
        if (!clip.loop) {
          this.__playing = false
        }
      }
    }

    // ─── 인스턴스 업데이트 & 제거 ────────────────────────
    // 비물리 모드라도 월드의 물리엔진 중력 가속도와 객체의 gravityScale을 추적하여 반영합니다.
    const gScale = this.attribute.gravityScale ?? 1
    const gX = this.__physics ? (this.__physics.engine.gravity.x * this.__physics.engine.gravity.scale) : 0
    const gY = this.__physics ? (this.__physics.engine.gravity.y * this.__physics.engine.gravity.scale) : GRAVITY

    const alive: ParticleInstance[] = []
    for (const inst of this.__instances) {
      const age = timestamp - inst.born
      if (age >= inst.lifespan) {
        // 만료 → strict 모드이면 바디 제거
        if (inst.body && this.__physics) {
          this._removeInstanceBody(inst)
        }
        continue
      }

      if (!inst.body) {
        // 일반 모드: 타임스텝 누적 연산으로 변경하여 마찰 효과 지원
        const stepDt = timestamp - (inst.lastTick ?? inst.born)
        inst.lastTick = timestamp

        if (stepDt > 0) {
          const friction = this.attribute.frictionAir ?? 0
          // 60fps(16.666ms) 기준의 frictionAir 감쇠율을 현재 스텝에 맞게 보간
          const frameRatio = stepDt / 16.666
          const slip = Math.pow(Math.max(0, 1 - friction), frameRatio)

          inst.vx += gX * gScale * stepDt
          inst.vy += gY * gScale * stepDt

          inst.vx *= slip
          inst.vy *= slip
          inst.vz *= slip

          inst.x += inst.vx * stepDt
          inst.y += inst.vy * stepDt
          inst.z += inst.vz * stepDt
          inst.angle += inst.angularVelocity * stepDt
        }
      } else {
        // strict 모드: matter-js 바디 위치 및 각도를 상대 좌표로
        const emX = this.transform.position.x
        const emY = this.transform.position.y
        inst.x = inst.body.position.x - emX
        inst.y = inst.body.position.y - emY
        inst.z = inst.spawnZ // matter.js는 2D이므로 z 보존
        inst.angle = inst.body.angle
      }

      alive.push(inst)
    }
    this.__instances = alive
  }

  private _spawn(timestamp: number) {
    const clip = this.__clip!
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

      const sizes: number[] = []
      if (clip.size && clip.size.length > 0) {
        for (const [min, max] of clip.size) {
          sizes.push(min + Math.random() * (max - min))
        }
      } else {
        sizes.push(1, 0) // 기본값 호환: 1 -> 0
      }

      const opacities: number[] = []
      if (clip.opacity && clip.opacity.length > 0) {
        for (const [min, max] of clip.opacity) {
          opacities.push(min + Math.random() * (max - min))
        }
      } else {
        opacities.push(1, 0) // 기본값 호환: 1 -> 0
      }

      // 에미터 범위 내 랜덤 스폰 위치 (중심 기준 ±range/2)
      const offsetX = rangeX > 0 ? (Math.random() - 0.5) * rangeX : 0
      const offsetY = rangeY > 0 ? (Math.random() - 0.5) * rangeY : 0
      const offsetZ = rangeZ > 0 ? (Math.random() - 0.5) * rangeZ : 0

      const angImpulse = clip.angularImpulse ?? 0
      const angularVelocity = angImpulse > 0
        ? (Math.random() * 2 - 1) * angImpulse
        : 0

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
        sizes,
        opacities,
        born: timestamp,
        lifespan: clip.lifespan,
        angle: 0,
        angularVelocity,
      }

      if (this.attribute.strictPhysics && this.__physics) {
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
        // 초기 속도 및 각속도 부여
        Matter.Body.setVelocity(body, { x: inst.vx * 16, y: inst.vy * 16 })
        if (angularVelocity !== 0) {
          Matter.Body.setAngularVelocity(body, angularVelocity * 16)
        }
        Matter.Composite.add(this.__physics.engine.world, body)
        inst.body = body
      }

      this.__instances.push(inst)
    }
  }

  private _removeInstanceBody(inst: ParticleInstance) {
    if (!inst.body || !this.__physics) return
    Matter.Composite.remove(this.__physics.engine.world, inst.body)
    inst.body = undefined
  }

  protected _getDelegatedAttribute(key: string): any {
    const handler = Particle.DELEGATED_GETTERS[key]
    if (handler) return handler(this)
    return super._getDelegatedAttribute(key)
  }

  protected _setDelegatedAttribute(key: string, value: any): void {
    const handler = Particle.DELEGATED_SETTERS[key]
    if (handler) {
      handler(this, value)
    } else {
      super._setDelegatedAttribute(key, value)
    }
  }
}
