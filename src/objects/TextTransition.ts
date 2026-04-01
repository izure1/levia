import { Text } from './Text.js'
import { BaseTransition } from './BaseTransition.js'

export class TextTransition extends BaseTransition<Text> {
  constructor(target: Text) { super(target) }

  start(newText: string, charDurationMs: number): this {
    if (this._anim) this._anim.stop()

    if (charDurationMs <= 0) {
      this.target.attribute.text = newText
      this.target._transitionProgress = 1
      this.target._dirtyTexture = true
      return this
    }

    this.target.attribute.text = newText
    this.target._transitionProgress = 0
    this.target._dirtyTexture = true

    // 마크업 태그를 제외한 순수 글자 수 바탕으로 총 시간 계산
    const pureTextLength = newText.replace(/<[^>]*>/g, '').length
    const totalDurationMs = pureTextLength * charDurationMs

    this._startTransition(totalDurationMs, 'linear',
      (progress) => {
        this.target._transitionProgress = progress
        this.target._dirtyTexture = true
      },
      () => {
        this.target._transitionProgress = 1
        this.target._dirtyTexture = true
      }
    )
    return this
  }
}
