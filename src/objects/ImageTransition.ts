import { LveImage } from './LveImage.js'
import { Animation } from '../Animation.js'

export class ImageTransition {
  private _anim: Animation | null = null

  constructor(public target: LveImage) { }

  start(newSrc: string, durationMs: number) {
    if (this._anim) this._anim.stop()

    if (!this.target._src || durationMs <= 0 || this.target._src === newSrc) {
      this.target.play(newSrc)
      this.target._transitionOldSrc = null
      this.target._transitionProgress = 0
      return
    }

    this.target._transitionOldSrc = this.target._src
    this.target._transitionProgress = 0
    this.target.play(newSrc)

    this._anim = new Animation({ progress: 1 })
    this._anim.start((state) => {
      this.target._transitionProgress = state.progress
    }, durationMs, 'linear')

    this._anim.on('end', () => {
      this.target._transitionOldSrc = null
      this.target._transitionProgress = 0
      this._anim = null
    })
  }
}
