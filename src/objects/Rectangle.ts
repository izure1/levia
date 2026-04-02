import { LveObject } from '../LveObject.js'
import type { LveObjectOptions } from '../types.js'

export interface RectangleOptions<D extends Record<string, any> = Record<string, any>> extends LveObjectOptions<Record<string, never>, D> { }

export class Rectangle<D extends Record<string, any> = Record<string, any>> extends LveObject<Record<string, never>, D> {
  constructor(options?: RectangleOptions<D>) {
    super('rectangle', options)
  }
}
