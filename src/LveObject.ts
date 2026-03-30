import { v4 as uuidv4 } from './utils/uuid.js'
import type Matter from 'matter-js'
import type {
  Attribute,
  Dataset,
  DatasetValue,
  LveObjectOptions,
  Style,
  Transform,
  Vec3,
} from './types.js'

function makeVec3(partial?: Partial<Vec3>): Vec3 {
  return {
    x: partial?.x ?? 0,
    y: partial?.y ?? 0,
    z: partial?.z ?? 0,
  }
}

function makeStyle(partial?: Partial<Style>): Style {
  return {
    color: partial?.color,
    opacity: partial?.opacity ?? 1,
    width: partial?.width,
    height: partial?.height,
    blur: partial?.blur,
    borderColor: partial?.borderColor,
    borderWidth: partial?.borderWidth,
    fontSize: partial?.fontSize,
    fontFamily: partial?.fontFamily,
    fontWeight: partial?.fontWeight,
    fontStyle: partial?.fontStyle ?? 'normal',
    textAlign: partial?.textAlign ?? 'left',
    lineHeight: partial?.lineHeight ?? 1,
    display: partial?.display ?? 'block',
    pointerEvents: partial?.pointerEvents ?? true,
    margin: partial?.margin,
    shadowColor: partial?.shadowColor,
    shadowBlur: partial?.shadowBlur,
    shadowOffsetX: partial?.shadowOffsetX,
    shadowOffsetY: partial?.shadowOffsetY,
    zIndex: partial?.zIndex ?? 0,
    blendMode: partial?.blendMode,
  }
}

export abstract class LveObject {
  readonly attribute: Attribute
  readonly dataset: Dataset
  readonly style: Style
  readonly transform: Transform

  /** matter-js 바디 참조 (PhysicsEngine에서 설정) */
  _body: Matter.Body | null = null

  constructor(type: string, options?: LveObjectOptions) {
    this.attribute = {
      type,
      id: uuidv4(),
      name: options?.attribute?.name ?? '',
      className: options?.attribute?.className ?? '',
      text: options?.attribute?.text,
      physics: options?.attribute?.physics ?? null,
      density: options?.attribute?.density,
      friction: options?.attribute?.friction,
      restitution: options?.attribute?.restitution,
      fixedRotation: options?.attribute?.fixedRotation,
      gravityScale: options?.attribute?.gravityScale,
      collisionGroup: options?.attribute?.collisionGroup,
      collisionMask: options?.attribute?.collisionMask,
      collisionCategory: options?.attribute?.collisionCategory,
    }

    this.dataset = Object.assign({}, options?.dataset)

    this.style = makeStyle(options?.style)

    this.transform = {
      position: makeVec3(options?.transform?.position),
      rotation: makeVec3(options?.transform?.rotation),
      scale: {
        x: options?.transform?.scale?.x ?? 1,
        y: options?.transform?.scale?.y ?? 1,
        z: options?.transform?.scale?.z ?? 1,
      },
    }
  }

  setDataset(key: string, value: DatasetValue) {
    this.dataset[key] = value
  }

  getDataset(key: string): DatasetValue | undefined {
    return this.dataset[key]
  }

  /**
   * 물리 바디에 힘을 적용합니다. attribute.physics가 설정된 경우에만 동작합니다.
   */
  applyForce(force: { x: number; y: number }) {
    if (!this._body) {
      console.warn('[LveObject] applyForce: 물리 바디가 없습니다. attribute.physics를 설정하십시오.')
      return
    }
    const Matter = (globalThis as any).__Matter__
    if (Matter) {
      Matter.Body.applyForce(this._body, this._body.position, force)
    }
  }

  /**
   * 물리 바디의 속도를 설정합니다. attribute.physics가 설정된 경우에만 동작합니다.
   */
  setVelocity(velocity: { x: number; y: number }) {
    if (!this._body) {
      console.warn('[LveObject] setVelocity: 물리 바디가 없습니다. attribute.physics를 설정하십시오.')
      return
    }
    const Matter = (globalThis as any).__Matter__
    if (Matter) {
      Matter.Body.setVelocity(this._body, velocity)
    }
  }
}
