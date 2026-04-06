import { LeviarObject } from '../LeviarObject.js'
import type { LeviarObjectOptions } from '../types.js'
import type { SpriteClip, SpriteManager } from '../SpriteManager.js'

export interface SpriteAttribute {
  currentTime?: number
  playbackRate?: number
  src?: string
}

const DELEGATED_KEYS = ['src', 'currentTime', 'playbackRate']

export class Sprite<
  D extends Record<string, any> = Record<string, any>
> extends LeviarObject<SpriteAttribute, D> {
  /** 연결된 SpriteManager */
  private __manager: SpriteManager | null = null

  /** 현재 재생 중인 클립 이름 */
  private __clipName: string | null = null

  /** 현재 클립 정보 (Renderer에서 직접 참조) */
  __clip: SpriteClip | null = null

  /** 생성자 시점에 __manager가 없어서 보류된 src 값 */
  private __pendingSrc: string | null = null

  /** 커스텀 재생 속도 (fps). undefined면 clip의 frameRate 사용 */
  __playbackRate?: number

  /** 현재 프레임 인덱스 (clip.start 기준 절대 인덱스) */
  __currentFrame: number = 0

  /** 마지막 프레임 변경 시각 (rAF timestamp) */
  __lastFrameTime: number = 0

  /** 재생 중 여부 */
  __playing: boolean = false

  /** 일시정지 여부 */
  __paused: boolean = false

  private static readonly DELEGATED_GETTERS: Record<string, (self: Sprite) => any> = {
    src: (self) => self.__clipName ?? undefined,
    currentTime: (self) => self.__clip ? Math.max(0, self.__currentFrame - self.__clip.start) : 0,
    playbackRate: (self) => self.__playbackRate ?? (self.__clip ? self.__clip.frameRate : 0),
  }

  private static readonly DELEGATED_SETTERS: Record<string, (self: Sprite, value: any) => void> = {
    src: (self, value: string) => {
      if (!self.__manager) {
        console.warn('[Sprite] __setManager()를 먼저 호출하십시오.')
        return
      }
      const clip = self.__manager.get(value)
      if (!clip) {
        console.warn(`[Sprite] 클립 '${value}'을 찾을 수 없습니다.`)
        return
      }
      self.__clipName = value
      self.__clip = clip
      self.__currentFrame = clip.start
      self.__lastFrameTime = 0
      self.__playing = false
      self.__paused = false
    },
    currentTime: (self, value: number) => {
      if (!self.__clip) return
      self.__currentFrame = self.__clip.start + Math.floor(value)
      if (self.__currentFrame >= self.__clip.end) self.__currentFrame = self.__clip.end - 1
      if (self.__currentFrame < self.__clip.start) self.__currentFrame = self.__clip.start
    },
    playbackRate: (self, value: number) => {
      self.__playbackRate = value
    },
  }

  constructor(options?: LeviarObjectOptions<SpriteAttribute, D>) {
    super('sprite', options, DELEGATED_KEYS)
    // src setter는 __manager에 의존하므로 생성자 시점에 처리할 수 없습니다.
    // __setManager() 호출 시 자동으로 적용됩니다.
    this.__pendingSrc = (options?.attribute as any)?.src ?? null
  }

  /**
   * SpriteManager를 연결합니다.
   */
  __setManager(manager: SpriteManager): this {
    this.__manager = manager
    if (this.__pendingSrc) {
      this.attribute.src = this.__pendingSrc
      this.__pendingSrc = null
    }
    return this
  }

  /**
   * 애니메이션 클립을 재생합니다.
   */
  play(): this {
    if (!this.__clip) {
      console.warn('[Sprite] src 속성을 먼저 설정하십시오.')
      return this
    }
    if (this.__playing && !this.__paused) return this

    this.__playing = true
    this.__paused = false
    this.__lastFrameTime = 0
    this.emit('play')
    return this
  }

  /** 재생을 일시정지합니다. */
  pause(): this {
    if (!this.__playing || this.__paused) return this
    this.__paused = true
    this.emit('pause')
    return this
  }

  /** 애니메이션을 정지하고 처음으로 되돌립니다. */
  stop(): this {
    this.__playing = false
    this.__paused = false
    if (this.__clip) {
      this.__currentFrame = this.__clip.start
      this.__lastFrameTime = 0
    }
    return this
  }

  /**
   * Renderer에서 매 프레임 호출하여 현재 프레임 인덱스를 업데이트합니다.
   */
  __tick(timestamp: number) {
    if (!this.__playing || this.__paused || !this.__clip) return

    const { frameRate, start, end, loop } = this.__clip
    const targetFps = this.__playbackRate !== undefined ? this.__playbackRate : frameRate
    const interval = 1000 / targetFps

    if (this.__lastFrameTime === 0) {
      this.__lastFrameTime = timestamp
      return
    }

    if (timestamp - this.__lastFrameTime >= interval) {
      this.__currentFrame++
      this.__lastFrameTime = timestamp

      if (this.__currentFrame >= end) {
        if (loop) {
          this.__currentFrame = start
          this.emit('repeat')
        } else {
          this.__currentFrame = end - 1
          this.__playing = false
          this.emit('ended')
        }
      }
    }
  }

  protected _getDelegatedAttribute(key: string): any {
    const handler = Sprite.DELEGATED_GETTERS[key]
    if (handler) return handler(this)
    return super._getDelegatedAttribute(key)
  }

  protected _setDelegatedAttribute(key: string, value: any): void {
    const handler = Sprite.DELEGATED_SETTERS[key]
    if (handler) {
      handler(this, value)
    } else {
      super._setDelegatedAttribute(key, value)
    }
  }
}
