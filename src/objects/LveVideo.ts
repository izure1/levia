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

const DELEGATED_KEYS = ['src', 'currentTime', 'playbackRate', 'volume']

export class LveVideo<
  D extends Record<string, any> = Record<string, any>
> extends LveObject<VideoAttribute, D> {
  /** 연결된 VideoManager */
  private _manager: VideoManager | null = null

  /** 현재 재생 중인 클립 이름 */
  private _clipName: string | null = null

  /** 현재 클립 정보 (Renderer에서 직접 참조) */
  _clip: VideoClip | null = null

  /** 생성자 시점에 _manager가 없어서 보류된 src 값 */
  private _pendingSrc: string | null = null

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

  private static readonly DELEGATED_GETTERS: Record<string, (self: LveVideo) => any> = {
    src: (self) => self._clipName ?? undefined,
    currentTime: (self) => self._videoElement?.currentTime ?? 0,
    playbackRate: (self) => self._videoElement?.playbackRate ?? 1.0,
    volume: (self) => self._videoElement?.volume ?? 1.0,
  }

  private static readonly DELEGATED_SETTERS: Record<string, (self: LveVideo, value: any) => void> = {
    src: (self, value: string) => {
      if (!self._manager) {
        console.warn('[LveVideo] __setManager()를 먼저 호출하십시오.')
        return
      }
      const clip = self._manager.get(value)
      if (!clip) {
        console.warn(`[LveVideo] 클립 '${value}'을 찾을 수 없습니다.`)
        return
      }
      self._clipName = value
      self._clip = clip
      self._src = clip.src
      self._playing = false
      self._paused = false
      self._needsSeekToStart = true
      if (self._videoElement) self._videoElement.currentTime = 0
      else self._pendingSeek = 0
    },
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

  constructor(options?: LveObjectOptions<VideoAttribute, D>) {
    super('video', options, DELEGATED_KEYS)
    // src setter는 _manager에 의존하므로 생성자 시점에 처리할 수 없습니다.
    // __setManager() 호출 시 자동으로 적용됩니다.
    this._pendingSrc = (options?.attribute as any)?.src ?? null
  }

  /**
   * VideoManager를 연결합니다.
   */
  __setManager(manager: VideoManager): this {
    this._manager = manager
    if (this._pendingSrc) {
      this.attribute.src = this._pendingSrc
      this._pendingSrc = null
    }
    return this
  }

  /**
   * 저장된 비디오 클립을 재생합니다.
   */
  play(): this {
    if (!this._clip) {
      console.warn('[LveVideo] src 속성을 먼저 설정하십시오.')
      return this
    }
    this._playing = true
    this._paused = false
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
   * 재생을 정지하고 처음으로 되돌립니다. loop=false일 때 'ended'를 emit합니다.
   */
  stop(): this {
    const wasPlaying = this._playing
    this._playing = false
    this._paused = false
    this._needsSeekToStart = true
    if (this._videoElement) {
      this._videoElement.currentTime = 0
    } else {
      this._pendingSeek = 0
    }

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
    const handler = LveVideo.DELEGATED_GETTERS[key]
    if (handler) return handler(this)
    return super._getDelegatedAttribute(key)
  }

  protected _setDelegatedAttribute(key: string, value: any): void {
    const handler = LveVideo.DELEGATED_SETTERS[key]
    if (handler) {
      handler(this, value)
    } else {
      super._setDelegatedAttribute(key, value)
    }
  }
}
