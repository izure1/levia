import { LeviarImage } from './LeviarImage.js'
import { BaseTransition } from './BaseTransition.js'

export class ImageTransition extends BaseTransition<LeviarImage> {
  constructor(target: LeviarImage) { super(target) }

  start(newSrc: string, durationMs: number): this {
    if (this._anim) this._anim.stop()

    if (!this.target.attribute?.src || durationMs <= 0 || this.target.attribute.src === newSrc) {
      this.target.attribute.src = newSrc
      this.target.__transitionOldSrc = null
      this.target.__transitionProgress = 0
      return this
    }
    this.target.__transitionOldSrc = this.target.attribute.src
    this.target.__transitionProgress = 0
    this.target.attribute.src = newSrc

    this._startTransition(durationMs, 'linear',
      (progress) => {
        this.target.__transitionProgress = progress
      },
      () => {
        this.target.__transitionOldSrc = null
        this.target.__transitionProgress = 0
      }
    )
    return this
  }
}
