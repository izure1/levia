import { LveObject } from '../LveObject.js'
import { BaseTransition } from './BaseTransition.js'
import type { EasingType } from '../types.js'

export class FadeTransition extends BaseTransition<LveObject> {
  constructor(target: LveObject) { super(target) }

  start(durationMs: number, easing: EasingType | undefined, type: 'in' | 'out'): this {
    if (this._anim) this._anim.stop()

    if (type === 'out') {
      this.target._fadeOpacity = 1
      this.target._dirtyTexture = true

      this._startTransition(durationMs, easing,
        (progress) => {
          this.target._fadeOpacity = 1 - progress
        },
        () => {
          this.target.style.display = 'none'
          this.target._fadeOpacity = 0
        }
      )
    } else {
      this.target.style.display = 'block'
      this.target._fadeOpacity = 0
      this.target._dirtyTexture = true

      this._startTransition(durationMs, easing,
        (progress) => {
          this.target._fadeOpacity = progress
        },
        () => {
          this.target._fadeOpacity = 1
        }
      )
    }
    return this
  }
}
