import { LveObject } from '../LveObject.js'
import type { LveObjectOptions } from '../types.js'
import { ImageTransition } from './ImageTransition.js'

export interface ImageAttribute {
  src?: string
}

export class LveImage<
  D extends Record<string, any> = Record<string, any>
> extends LveObject<ImageAttribute, D> {
  /** 트랜지션용 과거 에셋 키 */
  _transitionOldSrc: string | null = null
  /** 트랜지션 진행도 (0 ~ 1) */
  _transitionProgress: number = 0

  /** 전환 관리자 */
  private _transitioner?: ImageTransition

  constructor(options?: LveObjectOptions<ImageAttribute, D>) {
    super('image', options)
  }

  /**
   * 새 이미지로 서서히 변경(크로스페이드)되는 애니메이션 효과를 줍니다.
   * @param newSrc 변경할 새 에셋 키
   * @param durationMs 전환에 걸리는 시간(밀리초)
   */
  transition(newSrc: string, durationMs: number): ImageTransition {
    if (!this._transitioner) {
      this._transitioner = new ImageTransition(this)
    }
    this._transitioner.start(newSrc, durationMs)
    return this._transitioner
  }
}
