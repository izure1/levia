import { AssetManager } from './AssetManager.js'

export interface SizeRange {
  min: number
  max: number
}

export interface ParticleClipOptions {
  /** 클립 이름 */
  name: string
  /** 에셋 맵에서의 키 */
  src: string
  /** 루프 여부 */
  loop: boolean
  /** 파티클 하나의 생존 시간 (ms) */
  lifespan: number
  /** 파티클 생성 간격 (ms) */
  interval: number
  /** 한 번에 생성되는 파티클 수 */
  rate: number
  /** 스폰 범위 X (px). 미지정 시 0 (에미터 중심에서만 생성) */
  spawnX?: number
  /** 스폰 범위 Y (px). 미지정 시 0 (에미터 중심에서만 생성) */
  spawnY?: number
  /** 스폰 범위 Z (px). 미지정 시 0 (에미터 중심에서만 생성) */
  spawnZ?: number
  /** 파티클 생성 시 초기 발사 속도의 최대 강도 */
  impulse: number
  /** 파티클 생성 시 초기 각속도의 최대 강도 (rad/ms). 미지정 또는 0이면 회전 없음 */
  angularImpulse?: number
  /** 파티클 크기 시작/종료 범위 지정 */
  size?: {
    start?: SizeRange
    end?: SizeRange
  }
  /** 파티클 투명도 시작/종료 범위 지정 */
  opacity?: {
    start?: SizeRange
    end?: SizeRange
  }
}

export interface ParticleClip extends ParticleClipOptions { }

/**
 * 파티클 클립을 등록·관리합니다.
 * world.createParticleManager()로 생성합니다.
 */
export class ParticleManager extends AssetManager<ParticleClipOptions, ParticleClip> {
  create(options: ParticleClipOptions): this {
    this.clips.set(options.name, { ...options })
    return this
  }
}
