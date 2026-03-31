import { Text } from './Text.js'
import { Animation } from '../Animation.js'

import { EventEmitter } from '../EventEmitter.js'
import type { AnimationEvents } from '../types.js'

export class TextTransition extends EventEmitter<AnimationEvents> {
  private _anim: Animation | null = null

  constructor(public target: Text) { super() }

  start(newText: string, durationMs: number) {
    if (this._anim) this._anim.stop()

    if (durationMs <= 0 || this.target.attribute.text === newText) {
      this.target.attribute.text = newText
      this.target._transitionProgress = 1
      this.target._dirtyTexture = true
      return
    }

    this.target.attribute.text = newText
    this.target._transitionProgress = 0
    this.target._dirtyTexture = true

    this.emit('start')

    this._anim = new Animation({ progress: 1 })
    this._anim.start((state) => {
      this.target._transitionProgress = state.progress
      this.target._dirtyTexture = true
      this.emit('update', state)
    }, durationMs, 'linear')

    this._anim.on('end', () => {
      this.target._transitionProgress = 1
      this.target._dirtyTexture = true
      this._anim = null
      this.emit('end')
    })
  }
}
