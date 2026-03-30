import { AssetManager } from './AssetManager.js'

export interface VideoClipOptions {
  /** 클립 이름 */
  name: string
  /** 에셋 맵에서의 키 */
  src: string
  /** 반복 여부 */
  loop: boolean
  /** 재생 시작 시각 (ms). 미지정 시 처음부터 */
  start?: number
  /** 재생 종료 시각 (ms). 미지정 시 끝까지 */
  end?: number
}

export interface VideoClip extends VideoClipOptions { }

/**
 * 비디오 클립 정보를 등록·관리합니다.
 * world.createVideoManager()로 생성합니다.
 */
export class VideoManager extends AssetManager<VideoClipOptions, VideoClip> {
  /**
   * 비디오 클립을 등록합니다.
   */
  create(options: VideoClipOptions): this {
    this.clips.set(options.name, { ...options })
    return this
  }
}
