import { AssetManager } from './AssetManager.js'

export interface SpriteClipOptions {
  /** 애니메이션 클립 이름 */
  name: string
  /** 에셋 맵에서의 키 */
  src: string
  /** 스프라이트 시트에서 한 프레임의 너비 (px) */
  frameWidth: number
  /** 스프라이트 시트에서 한 프레임의 높이 (px) */
  frameHeight: number
  /** 초당 프레임 수 */
  frameRate: number
  /** 반복 여부 */
  loop: boolean
  /** 시작 프레임 인덱스 (0-based) */
  start: number
  /** 마지막 프레임 인덱스 (exclusive — start=0, end=10 이면 0~9 재생) */
  end: number
}

export interface SpriteClip extends SpriteClipOptions { }

/**
 * 스프라이트 애니메이션 클립을 등록·관리합니다.
 * world.createSpriteManager()로 생성합니다.
 */
export class SpriteManager extends AssetManager<SpriteClipOptions, SpriteClip> {
  /**
   * 애니메이션 클립을 등록합니다.
   */
  create(options: SpriteClipOptions): this {
    this.clips.set(options.name, { ...options })
    return this
  }
}
