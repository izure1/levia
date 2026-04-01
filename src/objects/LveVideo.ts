import { LveObject } from '../LveObject.js'
import type { LveObjectOptions } from '../types.js'
import type { VideoManager } from '../VideoManager.js'
import type { VideoClip } from '../VideoManager.js'

export interface VideoAttribute {
  currentTime?: number
  playbackRate?: number
  volume?: number
  src?: string
}

const DELEGATED_GETTERS: Record<string, (self: LveVideo) => any> = {
  currentTime: (self) => self._videoElement?.currentTime ?? 0,
  playbackRate: (self) => self._videoElement?.playbackRate ?? 1.0,
  volume: (self) => self._videoElement?.volume ?? 1.0,
}

const DELEGATED_SETTERS: Record<string, (self: LveVideo, value: any) => void> = {
  currentTime: (self, value: number) => {
    self._needsSeekToStart = false
    if (self._videoElement) {
      self._videoElement.currentTime = value
    } else {
      self._pendingSeek = value
    }
  },
  playbackRate: (self, value: number) => {
    if (self._videoElement) self._videoElement.playbackRate = value
  },
  volume: (self, value: number) => {
    if (self._videoElement) self._videoElement.volume = Math.max(0, Math.min(1, value))
  },
}

export class LveVideo extends LveObject<VideoAttribute> {
  /** 연결된 VideoManager */
  private _manager: VideoManager | null = null

  /** 현재 재생 중인 클립 이름 */
  private _clipName: string | null = null

  /** 현재 클립 정보 (Renderer에서 직접 참조) */
  _clip: VideoClip | null = null

  /** 현재 재생할 에셋 키 (Renderer에서 직접 참조) */
  _src: string | null = null

  /** Renderer에서 활성화된 실제 VideoElement 인스턴스 참조 */
  _videoElement: HTMLVideoElement | null = null

  /** 재생 중 여부 */
  _playing: boolean = false

  /** 일시정지 여부 */
  _paused: boolean = false

  /** 재생 시작 시 시작 위치로 이동해야하는지 여부 (Renderer에서 참조 및 리셋) */
  _needsSeekToStart: boolean = false

  /** currentTime setter에서 _videoElement가 null일 때 대기 중인 seek 값 (Renderer에서 적용 후 null로 리셋) */
  _pendingSeek: number | null = null

  constructor(options?: LveObjectOptions<VideoAttribute>) {
    super('video', options, Object.keys(DELEGATED_GETTERS))
  }

  /**
   * VideoManager를 연결합니다.
   */
  setManager(manager: VideoManager) {
    this._manager = manager
  }

  /**
   * 지정한 이름의 비디오 클립을 재생합니다.
   * setManager()를 먼저 호출해야 합니다.
   */
  play(name: string): this {
    if (!this._manager) {
      console.warn('[LveVideo] VideoManager가 설정되지 않았습니다. setManager()를 먼저 호출하십시오.')
      return this
    }
    const clip = this._manager.get(name)
    if (!clip) {
      console.warn(`[LveVideo] 클립 '${name}'을 찾을 수 없습니다.`)
      return this
    }

    this._clipName = name
    this._clip = clip
    this._src = clip.src
    this._playing = true
    this._paused = false
    this._needsSeekToStart = true
    this.emit('play')
    return this
  }

  /**
   * 재생을 일시정지합니다.
   */
  pause(): this {
    if (!this._playing || this._paused) return this
    this._paused = true
    this._playing = false
    this.emit('pause')
    return this
  }

  /**
   * 재생을 정지합니다. loop=false일 때 'ended'를 emit합니다.
   */
  stop(): this {
    const wasPlaying = this._playing
    this._playing = false
    this._paused = false

    if (wasPlaying && this._clip && !this._clip.loop) {
      this.emit('ended')
    }
    return this
  }

  /**
   * Renderer에서 루프 완료 시 호출 — 'repeat' 이벤트를 emit합니다.
   * @internal
   */
  _onRepeat() {
    this.emit('repeat')
  }

  /**
   * Renderer에서 재생 종료 시 호출 — 'ended' 이벤트를 emit합니다.
   * @internal
   */
  _onEnded() {
    this._playing = false
    this.emit('ended')
  }

  protected _getDelegatedAttribute(key: string): any {
    const handler = DELEGATED_GETTERS[key]
    if (handler) return handler(this)
    return super._getDelegatedAttribute(key)
  }

  protected _setDelegatedAttribute(key: string, value: any): void {
    const handler = DELEGATED_SETTERS[key]
    if (handler) {
      handler(this, value)
    } else {
      super._setDelegatedAttribute(key, value)
    }
  }
}
