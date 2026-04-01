import { LveObject } from '../LveObject.js'
import type { LveObjectOptions } from '../types.js'
import { TextTransition } from './TextTransition.js'

export interface TextAttribute {
  text?: string
}

export class Text extends LveObject<TextAttribute> {
  /** 트랜지션 진행도 (0 ~ 1, 1이면 완료 또는 미실행) */
  _transitionProgress: number = 1

  /** 전환 관리자 */
  private _transitioner?: TextTransition

  constructor(options?: LveObjectOptions) {
    super('text', options)
  }

  /**
   * 지정된 속도로 텍스트가 글자 단위로 타이핑되듯 서서히 나타나는 효과를 줍니다.
   * @param newText 변경할 새 텍스트
   * @param charDurationMs 글자 1개당 나타나는데 걸리는 시간(밀리초)
   */
  transition(newText: string, charDurationMs: number): TextTransition {
    if (!this._transitioner) {
      this._transitioner = new TextTransition(this)
    }
    this._transitioner.start(newText, charDurationMs)
    return this._transitioner
  }
}
