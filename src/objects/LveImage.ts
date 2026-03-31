import { LveObject } from '../LveObject.js'
import type { LveObjectOptions } from '../types.js'

export class LveImage extends LveObject {
  /** 현재 표시할 에셋 키 */
  _src: string | null = null

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
}
