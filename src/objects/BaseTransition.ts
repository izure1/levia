import { EventEmitter } from '../EventEmitter.js'
import type { AnimationEvents, EasingType } from '../types.js'
import { Animation } from '../Animation.js'

export abstract class BaseTransition<T = any> extends EventEmitter<AnimationEvents> {
  protected _anim: Animation | null = null
  public target: T

  constructor(target: T) {
    super()
    this.target = target
  }

  protected _startTransition(durationMs: number, easing: EasingType | undefined, onUpdate: (progress: number) => void, onComplete: () => void) {
    if (this._anim) this._anim.stop()

    this.emit('start')

    this._anim = new Animation({ progress: 1 })
    this._anim.start((state) => {
      onUpdate(state.progress as number)
      this.emit('update', state)
    }, durationMs, easing || 'linear')

    this._anim.on('end', () => {
      this._anim = null
      onComplete()
      this.emit('end')
    })
  }

  stop(): this {
    if (this._anim) {
      this._anim.stop()
      this._anim = null
      this.emit('stop')
    }
    return this
  }

  pause(): this {
    if (this._anim) {
      this._anim.pause()
      this.emit('pause')
    }
    return this
  }

  resume(): this {
    if (this._anim) {
      this._anim.resume()
      this.emit('resume')
    }
    return this
  }
}
