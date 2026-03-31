import { LveObject } from '../LveObject.js'
import type { LveObjectOptions } from '../types.js'
import { ImageTransition } from './ImageTransition.js'

export class LveImage extends LveObject {
  /** 현재 표시할 에셋 키 */
  _src: string | null = null

  /** 트랜지션용 과거 에셋 키 */
  _transitionOldSrc: string | null = null
  /** 트랜지션 진행도 (0 ~ 1) */
  _transitionProgress: number = 0

  /** 전환 관리자 */
  private _transitioner?: ImageTransition

  constructor(options?: LveObjectOptions) {
    super('image', options)
  }

  /**
   * 표시할 에셋 키를 지정합니다.
   * @param src 에셋 맵 키
   */
  play(src: string): this {
    this._src = src
    return this
  }

  /**
   * 새 이미지로 서서히 변경(크로스페이드)되는 애니메이션 효과를 줍니다.
   * @param newSrc 변경할 새 에셋 키
   * @param durationMs 전환에 걸리는 시간(밀리초)
   */
  transition(newSrc: string, durationMs: number): this {
    if (!this._transitioner) {
      this._transitioner = new ImageTransition(this)
    }
    this._transitioner.start(newSrc, durationMs)
    return this
  }
}
