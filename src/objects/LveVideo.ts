import { LveObject } from '../LveObject.js'
import type { LveObjectOptions } from '../types.js'
import type { VideoManager } from '../VideoManager.js'
import type { VideoClip } from '../VideoManager.js'

export class LveVideo extends LveObject {
  /** 연결된 VideoManager */
  private _manager: VideoManager | null = null

  /** 현재 재생 중인 클립 이름 */
  private _clipName: string | null = null

  /** 현재 클립 정보 (Renderer에서 직접 참조) */
  _clip: VideoClip | null = null

  /** 현재 재생할 에셋 키 (Renderer에서 직접 참조) */
  _src: string | null = null

  /** 재생 중 여부 */
  _playing: boolean = false

  constructor(options?: LveObjectOptions) {
    super('video', options)
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
  play(name: string) {
    if (!this._manager) {
      console.warn('[LveVideo] VideoManager가 설정되지 않았습니다. setManager()를 먼저 호출하십시오.')
      return
    }
    const clip = this._manager.get(name)
    if (!clip) {
      console.warn(`[LveVideo] 클립 '${name}'을 찾을 수 없습니다.`)
      return
    }

    this._clipName = name
    this._clip = clip
    this._src = clip.src
    this._playing = true
  }

  /**
   * 재생을 정지합니다.
   */
  stop() {
    this._playing = false
  }
}
