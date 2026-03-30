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
  play(name: string) {
    if (!this._manager) {
      console.warn('[Sprite] SpriteManager가 설정되지 않았습니다. setManager()를 먼저 호출하십시오.')
      return
    }
    const clip = this._manager.get(name)
    if (!clip) {
      console.warn(`[Sprite] 클립 '${name}'을 찾을 수 없습니다.`)
      return
    }
    if (this._clipName === name && this._playing && !this._paused) return

    this._clipName = name
    this._clip = clip
    this._currentFrame = clip.start
    this._lastFrameTime = 0
    this._playing = true
    this._paused = false
    this.emit('play')
  }

  /** 재생을 일시정지합니다. */
  pause() {
    if (!this._playing || this._paused) return
    this._paused = true
    this.emit('pause')
  }

  /** 일시정지를 재개합니다. */
  resume() {
    if (!this._paused) return
    this._paused = false
    this.emit('play')
  }

  /** 애니메이션을 정지합니다. */
  stop() {
    this._playing = false
    this._paused = false
  }

  /**
   * Renderer에서 매 프레임 호출하여 현재 프레임 인덱스를 업데이트합니다.
   */
  tick(timestamp: number) {
    if (!this._playing || this._paused || !this._clip) return

    const { frameRate, start, end, loop } = this._clip
    const interval = 1000 / frameRate

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
}
