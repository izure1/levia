import { LveObject } from '../LveObject.js'
import type { LveObjectOptions } from '../types.js'

export class Ellipse<
  D extends Record<string, any> = Record<string, any>
> extends LveObject<Record<string, any>, D> {
  constructor(options?: LveObjectOptions<Record<string, any>, D>) {
    super('ellipse', options)
  }
}
