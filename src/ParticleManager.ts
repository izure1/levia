import { AssetManager } from './AssetManager.js'

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
  /** 스폰 범위 너비 (px). 미지정 시 0 (에미터 중심에서만 생성) */
  spawnWidth?: number
  /** 스폰 범위 높이 (px). 미지정 시 0 (에미터 중심에서만 생성) */
  spawnHeight?: number
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
