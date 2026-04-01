import { LveObject } from '../LveObject.js'
import type { LveObjectOptions } from '../types.js'
import type { SpriteClip, SpriteManager } from '../SpriteManager.js'

export class Sprite extends LveObject {
  /** 연결된 SpriteManager */
  private _manager: SpriteManager | null = null

  /** 현재 재생 중인 클립 이름 */
  private _clipName: string | null = null

  /** 현재 클립 정보 (Renderer에서 직접 참조) */
  _clip: SpriteClip | null = null

  /** 커스텀 재생 속도 (fps). undefined면 clip의 frameRate 사용 */
  private _playbackRate?: number

  /** 현재 프레임 인덱스 (clip.start 기준 절대 인덱스) */
  _currentFrame: number = 0

  /** 마지막 프레임 변경 시각 (rAF timestamp) */
  _lastFrameTime: number = 0

  /** 재생 중 여부 */
  _playing: boolean = false

  /** 일시정지 여부 */
  _paused: boolean = false

  constructor(options?: LveObjectOptions) {
    super('sprite', options)
  }

  /**
   * SpriteManager를 연결합니다.
   */
  setManager(manager: SpriteManager) {
    this._manager = manager
  }

  /**
   * 지정한 이름의 애니메이션 클립을 재생합니다.
   * setManager()를 먼저 호출해야 합니다.
   */
  play(name: string): this {
    if (!this._manager) {
      console.warn('[Sprite] SpriteManager가 설정되지 않았습니다. setManager()를 먼저 호출하십시오.')
      return this
    }
    const clip = this._manager.get(name)
    if (!clip) {
      console.warn(`[Sprite] 클립 '${name}'을 찾을 수 없습니다.`)
      return this
    }
    if (this._clipName === name && this._playing && !this._paused) return this

    this._clipName = name
    this._clip = clip
    this._currentFrame = clip.start
    this._lastFrameTime = 0
    this._playing = true
    this._paused = false
    this.emit('play')
    return this
  }

  /** 재생을 일시정지합니다. */
  pause(): this {
    if (!this._playing || this._paused) return this
    this._paused = true
    this.emit('pause')
    return this
  }

  /** 일시정지를 재개합니다. */
  resume(): this {
    if (!this._paused) return this
    this._paused = false
    this.emit('play')
    return this
  }

  /** 애니메이션을 정지합니다. */
  stop(): this {
    this._playing = false
    this._paused = false
    return this
  }

  /**
   * Renderer에서 매 프레임 호출하여 현재 프레임 인덱스를 업데이트합니다.
   */
  tick(timestamp: number) {
    if (!this._playing || this._paused || !this._clip) return

    const { frameRate, start, end, loop } = this._clip
    const targetFps = this._playbackRate !== undefined ? this._playbackRate : frameRate
    const interval = 1000 / targetFps

    if (this._lastFrameTime === 0) {
      this._lastFrameTime = timestamp
      return
    }

    if (timestamp - this._lastFrameTime >= interval) {
      this._currentFrame++
      this._lastFrameTime = timestamp

      if (this._currentFrame >= end) {
        if (loop) {
          this._currentFrame = start
          this.emit('repeat')
        } else {
          this._currentFrame = end - 1
          this._playing = false
          this.emit('ended')
        }
      }
    }
  }

  // ==== 재생 속성 ====

  /** 프레임 현재 위치 (0부터 시작) */
  get currentTime(): number {
    return this._clip ? Math.max(0, this._currentFrame - this._clip.start) : 0
  }

  set currentTime(value: number) {
    if (this._clip) {
      this._currentFrame = this._clip.start + Math.floor(value)
      if (this._currentFrame >= this._clip.end) {
        this._currentFrame = this._clip.end - 1
      }
      if (this._currentFrame < this._clip.start) {
        this._currentFrame = this._clip.start
      }
    }
  }

  /** 초당 재생 속도 (fps) */
  get playbackRate(): number {
    return this._playbackRate ?? (this._clip ? this._clip.frameRate : 0)
  }

  set playbackRate(value: number) {
    this._playbackRate = value
  }

  /** 볼륨 (스프라이트에서는 무시됨) */
  get volume(): number {
    return 0
  }

  set volume(_value: number) {
    // 무시됨
  }
}
