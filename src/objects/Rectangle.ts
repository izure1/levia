import { LeviarObject } from '../LeviarObject.js'
import type { LeviarObjectOptions } from '../types.js'

export interface RectangleOptions<
  D extends Record<string, any> = Record<string, any>
> extends LeviarObjectOptions<Record<string, any>, D> { }

export class Rectangle<
  D extends Record<string, any> = Record<string, any>
> extends LeviarObject<Record<string, any>, D> {
  constructor(options?: RectangleOptions<D>) {
    super('rectangle', options)
  }
}
