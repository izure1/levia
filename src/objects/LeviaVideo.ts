import { LeviarObject } from '../LeviarObject.js'
import type { LeviarObjectOptions } from '../types.js'
import type { VideoManager } from '../VideoManager.js'
import type { VideoClip } from '../VideoManager.js'

export interface VideoAttribute {
  currentTime?: number
  playbackRate?: number
  volume?: number
  src?: string
}

const DELEGATED_KEYS = ['src', 'currentTime', 'playbackRate', 'volume']

export class LeviarVideo<
  D extends Record<string, any> = Record<string, any>
> extends LeviarObject<VideoAttribute, D> {
  /** 연결된 VideoManager */
  private __manager: VideoManager | null = null

  /** 현재 재생 중인 클립 이름 */
  private __clipName: string | null = null

  /** 현재 클립 정보 (Renderer에서 직접 참조) */
  __clip: VideoClip | null = null

  /** 생성자 시점에 __manager가 없어서 보류된 src 값 */
  private __pendingSrc: string | null = null

  /** 현재 재생할 에셋 키 (Renderer에서 직접 참조) */
  __src: string | null = null

  /** Renderer에서 활성화된 실제 VideoElement 인스턴스 참조 */
  __videoElement: HTMLVideoElement | null = null

  /** 재생 중 여부 */
  __playing: boolean = false

  /** 일시정지 여부 */
  __paused: boolean = false

  /** 재생 시작 시 시작 위치로 이동해야하는지 여부 (Renderer에서 참조 및 리셋) */
  __needsSeekToStart: boolean = false

  /** currentTime setter에서 __videoElement가 null일 때 대기 중인 seek 값 (Renderer에서 적용 후 null로 리셋) */
  __pendingSeek: number | null = null

  private static readonly DELEGATED_GETTERS: Record<string, (self: LeviarVideo) => any> = {
    src: (self) => self.__clipName ?? undefined,
    currentTime: (self) => self.__videoElement?.currentTime ?? 0,
    playbackRate: (self) => self.__videoElement?.playbackRate ?? 1.0,
    volume: (self) => self.__videoElement?.volume ?? 1.0,
  }

  private static readonly DELEGATED_SETTERS: Record<string, (self: LeviarVideo, value: any) => void> = {
    src: (self, value: string) => {
      if (!self.__manager) {
        console.warn('[LeviarVideo] __setManager()를 먼저 호출하십시오.')
        return
      }
      const clip = self.__manager.get(value)
      if (!clip) {
        console.warn(`[LeviarVideo] 클립 '${value}'을 찾을 수 없습니다.`)
        return
      }
      self.__clipName = value
      self.__clip = clip
      self.__src = clip.src
      self.__playing = false
      self.__paused = false
      self.__needsSeekToStart = true
      if (self.__videoElement) self.__videoElement.currentTime = 0
      else self.__pendingSeek = 0
    },
    currentTime: (self, value: number) => {
      self.__needsSeekToStart = false
      if (self.__videoElement) {
        self.__videoElement.currentTime = value
      } else {
        self.__pendingSeek = value
      }
    },
    playbackRate: (self, value: number) => {
      if (self.__videoElement) self.__videoElement.playbackRate = value
    },
    volume: (self, value: number) => {
      if (self.__videoElement) self.__videoElement.volume = Math.max(0, Math.min(1, value))
    },
  }

  constructor(options?: LeviarObjectOptions<VideoAttribute, D>) {
    super('video', options, DELEGATED_KEYS)
    // src setter는 __manager에 의존하므로 생성자 시점에 처리할 수 없습니다.
    // __setManager() 호출 시 자동으로 적용됩니다.
    this.__pendingSrc = (options?.attribute as any)?.src ?? null
  }

  /**
   * VideoManager를 연결합니다.
   */
  __setManager(manager: VideoManager): this {
    this.__manager = manager
    if (this.__pendingSrc) {
      this.attribute.src = this.__pendingSrc
      this.__pendingSrc = null
    }
    return this
  }

  /**
   * 저장된 비디오 클립을 재생합니다.
   */
  play(): this {
    if (!this.__clip) {
      console.warn('[LeviarVideo] src 속성을 먼저 설정하십시오.')
      return this
    }
    this.__playing = true
    this.__paused = false
    this.emit('play')
    return this
  }

  /**
   * 재생을 일시정지합니다.
   */
  pause(): this {
    if (!this.__playing || this.__paused) return this
    this.__paused = true
    this.__playing = false
    this.emit('pause')
    return this
  }

  /**
   * 재생을 정지하고 처음으로 되돌립니다. loop=false일 때 'ended'를 emit합니다.
   */
  stop(): this {
    const wasPlaying = this.__playing
    this.__playing = false
    this.__paused = false
    this.__needsSeekToStart = true
    if (this.__videoElement) {
      this.__videoElement.currentTime = 0
    } else {
      this.__pendingSeek = 0
    }

    if (wasPlaying && this.__clip && !this.__clip.loop) {
      this.emit('ended')
    }
    return this
  }

  /**
   * Renderer에서 루프 완료 시 호출 — 'repeat' 이벤트를 emit합니다.
   * @internal
   */
  __onRepeat() {
    this.emit('repeat')
  }

  /**
   * Renderer에서 재생 종료 시 호출 — 'ended' 이벤트를 emit합니다.
   * @internal
   */
  __onEnded() {
    this.__playing = false
    this.emit('ended')
  }

  protected _getDelegatedAttribute(key: string): any {
    const handler = LeviarVideo.DELEGATED_GETTERS[key]
    if (handler) return handler(this)
    return super._getDelegatedAttribute(key)
  }

  protected _setDelegatedAttribute(key: string, value: any): void {
    const handler = LeviarVideo.DELEGATED_SETTERS[key]
    if (handler) {
      handler(this, value)
    } else {
      super._setDelegatedAttribute(key, value)
    }
  }
}
