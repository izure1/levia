import { LeviarObject } from '../LeviarObject.js'
import type { LeviarObjectOptions } from '../types.js'

export class Ellipse<
  D extends Record<string, any> = Record<string, any>
> extends LeviarObject<Record<string, any>, D> {
  constructor(options?: LeviarObjectOptions<Record<string, any>, D>) {
    super('ellipse', options)
  }
}
