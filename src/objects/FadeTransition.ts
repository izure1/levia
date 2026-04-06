import { LeviarObject } from '../LeviarObject.js'
import { BaseTransition } from './BaseTransition.js'
import type { EasingType } from '../types.js'

export class FadeTransition extends BaseTransition<LeviarObject> {
  constructor(target: LeviarObject) { super(target) }

  start(durationMs: number, easing: EasingType | undefined, type: 'in' | 'out'): this {
    if (this._anim) this._anim.stop()

    if (type === 'out') {
      this.target.__fadeOpacity = 1
      this.target.__dirtyTexture = true

      this._startTransition(durationMs, easing,
        (progress) => {
          this.target.__fadeOpacity = 1 - progress
        },
        () => {
          this.target.style.display = 'none'
          this.target.__fadeOpacity = 0
        }
      )
    } else {
      this.target.style.display = 'block'
      this.target.__fadeOpacity = 0
      this.target.__dirtyTexture = true

      this._startTransition(durationMs, easing,
        (progress) => {
          this.target.__fadeOpacity = progress
        },
        () => {
          this.target.__fadeOpacity = 1
        }
      )
    }
    return this
  }
}
