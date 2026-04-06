import { v4 as uuidv4 } from './utils/uuid.js'
import { Mat4, Vec3 as OglVec3 } from 'ogl'
import type Matter from 'matter-js'
import { animateObject } from './Animation.js'
import type { Animation } from './Animation.js'
import { FadeTransition } from './objects/FadeTransition.js'
import { EventEmitter } from './EventEmitter.js'
import {
  STYLE_DIRTY_MAP,
  ATTR_DIRTY_MAP,
  SCALE_DIRTY_MAP,
} from './dirty.js'
import type {
  Attribute,
  AnimateTarget,
  Dataset,
  DatasetValue,
  EasingType,
  LeviarObjectOptions,
  LeviarObjectEvents,
  Style,
  Transform,
  Vec3,
} from './types.js'

// updateMatrixWorld에서 매 프레임 발생하는 OglVec3 생성 방지용 전역 상수 및 임시 변수
const VEC3_X = new OglVec3(1, 0, 0)
const VEC3_Y = new OglVec3(0, 1, 0)
const VEC3_Z = new OglVec3(0, 0, 1)
const _tmpVec3 = new OglVec3(0, 0, 0)


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
    outlineColor: partial?.outlineColor,
    outlineWidth: partial?.outlineWidth,
    fontSize: partial?.fontSize,
    fontFamily: partial?.fontFamily,
    fontWeight: partial?.fontWeight,
    fontStyle: partial?.fontStyle ?? 'normal',
    textAlign: partial?.textAlign ?? 'left',
    lineHeight: partial?.lineHeight ?? 1,
    display: partial?.display ?? 'block',
    pointerEvents: partial?.pointerEvents ?? true,
    margin: partial?.margin,
    textShadowColor: partial?.textShadowColor,
    textShadowBlur: partial?.textShadowBlur,
    textShadowOffsetX: partial?.textShadowOffsetX,
    textShadowOffsetY: partial?.textShadowOffsetY,
    boxShadowColor: partial?.boxShadowColor,
    boxShadowBlur: partial?.boxShadowBlur,
    boxShadowSpread: partial?.boxShadowSpread,
    boxShadowOffsetX: partial?.boxShadowOffsetX,
    boxShadowOffsetY: partial?.boxShadowOffsetY,
    zIndex: partial?.zIndex ?? 0,
    blendMode: partial?.blendMode,
    letterSpacing: partial?.letterSpacing ?? 0,
    gradient: partial?.gradient,
    gradientType: partial?.gradientType,
    borderRadius: partial?.borderRadius,
  }
}

/**
 * 객체의 얕은 프로퍼티 변경을 감지하여 이벤트를 발행하는 Proxy를 만듭니다.
 */
function makeTrackedProxy<T extends object>(
  target: T,
  emitter: EventEmitter,
  eventName: string,
  delegatedKeys?: string[],
): T {
  return new Proxy(target, {
    get(obj, prop) {
      // 위임 키이면 오버라이드된 위임 메서드에서 값을 읽습니다.
      if (typeof prop === 'string' && delegatedKeys?.includes(prop)) {
        return (emitter as any)._getDelegatedAttribute(prop)
      }
      return (obj as any)[prop]
    },
    set(obj, prop, value) {
      let prev
      if (typeof prop === 'string' && delegatedKeys?.includes(prop)) {
        // 위임 키이면 오버라이드된 위임 메서드에 처리를 맡깁니다.
        prev = (emitter as any)._getDelegatedAttribute(prop)
          ; (emitter as any)._setDelegatedAttribute(prop, value)
      } else {
        prev = (obj as any)[prop]
          ; (obj as any)[prop] = value
      }
      if (prev !== value) {
        emitter.emit(eventName, String(prop), value, prev)
      }
      return true
    },
  })
}

/**
 * Vec3 변경을 감지하는 Proxy (position/rotation/scale)
 */
function makeVec3Proxy(
  vec: Vec3,
  emitter: EventEmitter,
  eventName: string,
): Vec3 {
  return new Proxy(vec, {
    set(obj, prop, value) {
      const prev = (obj as any)[prop]
        ; (obj as any)[prop] = value
      if (prev !== value) {
        emitter.emit(eventName, String(prop), value, prev)
      }
      return true
    },
  })
}

export abstract class LeviarObject<
  T extends Record<string, any> = Record<string, any>,
  D extends Record<string, any> = Record<string, any>
> extends EventEmitter<LeviarObjectEvents> {
  readonly attribute: Attribute & T
  readonly dataset: D
  readonly style: Style
  readonly transform: Transform

  /** matter-js 바디 참조 (PhysicsEngine에서 설정) */
  __body: Matter.Body | null = null

  /**
   * attribute Proxy의 위임 키에 대한 값을 가져옵니다. (하위 클래스에서 재정의)
   */
  protected _getDelegatedAttribute(key: string): any {
    return undefined
  }

  /**
   * attribute Proxy의 위임 키에 대한 값을 설정합니다. (하위 클래스에서 재정의)
   */
  protected _setDelegatedAttribute(key: string, value: any): void {
  }

  /**
   * Renderer가 매 프레임 기록하는 실제 렌더 크기 (월드 좌표 기준, scale 포함, perspectiveScale 제외)
   * style.width/height 미지정 시 naturalWidth 등의 값이 들어옵니다.
   */
  __renderedSize: { w: number; h: number } | null = null

  /** Offscreen Canvas · 텍스처 재생성이 필요함을 나타내는 dirty flag */
  __dirtyTexture: boolean = true

  /** 물리 바디 크기 재확인이 필요함을 나타내는 dirty flag */
  __dirtyPhysics: boolean = false

  /**
   * 마지막 텍스처 변경 이후 경과한 프레임 수.
   * 새 변경이 오면 0으로 리셋, 임계값 도달 시 텍스처를 업데이트합니다. (디바운스)
   */
  __textureIdleCount: number = 0

  /**
   * 마지막 물리 변경 이후 경과한 프레임 수.
   * 새 변경이 오면 0으로 리셋, 임계값 도달 시 물리 실제 크기를 재확인합니다. (디바운스)
   */
  __physicsIdleCount: number = 0

  /**
   * 마지막 텍스처 업데이트 이후 경과한 프레임 수.
   * 렌더 후 0으로 리셋, 임계값 도달 시 강제 업데이트합니다. (스로틀)
   */
  __textureThrottleCount: number = 0

  /**
   * 마지막 물리 업데이트 이후 경과한 프레임 수.
   * 업데이트 후 0으로 리셋, 임계값 도달 시 강제 재확인합니다. (스로틀)
   */
  __physicsThrottleCount: number = 0

  /**
   * FadeTransition에 의해 제어되는 렌더링용 내부 투명도.
   */
  __fadeOpacity: number = 1

  /** 부모 객체 (계층 구조) */
  parent: LeviarObject | null = null
  /** 자식 객체 목록 */
  children: Set<LeviarObject> = new Set()

  /** 로컬 변환 매트릭스 (자신의 position, rotation, scale) */
  private localMatrix: Mat4 = new Mat4()
  /** 부모의 반영이 끝난 최종 월드 매트릭스 */
  __worldMatrix: Mat4 = new Mat4()

  constructor(type: string, options?: LeviarObjectOptions<T, D>, delegatedKeys?: string[]) {
    super()

    const rawAttribute = {
      type,
      id: uuidv4(),
      name: options?.attribute?.name ?? '',
      className: options?.attribute?.className ?? '',
      physics: options?.attribute?.physics ?? null,
      density: options?.attribute?.density,
      friction: options?.attribute?.friction,
      restitution: options?.attribute?.restitution,
      fixedRotation: options?.attribute?.fixedRotation,
      gravityScale: options?.attribute?.gravityScale,
      collisionGroup: options?.attribute?.collisionGroup,
      collisionMask: options?.attribute?.collisionMask,
      collisionCategory: options?.attribute?.collisionCategory,
      ...(options?.attribute as any),
    } as Attribute & T

    const rawDataset = Object.assign({}, options?.dataset) as D
    const rawStyle = makeStyle(options?.style)
    const rawPosition = makeVec3(options?.transform?.position)
    const rawRotation = makeVec3(options?.transform?.rotation)
    const rawScale: Vec3 = {
      x: options?.transform?.scale?.x ?? 1,
      y: options?.transform?.scale?.y ?? 1,
      z: options?.transform?.scale?.z ?? 1,
    }
    const rawPivot = {
      x: options?.transform?.pivot?.x ?? 0.5,
      y: options?.transform?.pivot?.y ?? 0.5,
    }

    // Proxy로 감싸서 변경 감지
    this.attribute = makeTrackedProxy(rawAttribute, this, 'attrmodified', delegatedKeys)
    this.dataset = makeTrackedProxy(rawDataset as object, this, 'datamodified') as D
    this.style = makeTrackedProxy(rawStyle, this, 'cssmodified')
    this.transform = {
      position: makeVec3Proxy(rawPosition, this, 'positionmodified'),
      rotation: makeVec3Proxy(rawRotation, this, 'rotationmodified'),
      scale: makeVec3Proxy(rawScale, this, 'scalemodified'),
      pivot: new Proxy(rawPivot, {
        set: (obj, prop, value) => {
          const prev = (obj as any)[prop]
            ; (obj as any)[prop] = value
          if (prev !== value) {
            this.emit('pivotmodified', String(prop), value, prev)
          }
          return true
        }
      })
    }

    // Proxy 이벤트에서 룩업 테이블 기반으로 dirty flag 갱신
    this.on('cssmodified', (key) => {
      const flags = STYLE_DIRTY_MAP[key]
      if (!flags) return
      if (flags.includes('texture')) {
        this.__dirtyTexture = true
        this.__textureIdleCount = 0
      }
      if (flags.includes('physics')) {
        this.__dirtyPhysics = true
        this.__physicsIdleCount = 0
      }
    })
    this.on('attrmodified', (key) => {
      const flags = ATTR_DIRTY_MAP[key]
      if (!flags) return
      if (flags.includes('texture')) {
        this.__dirtyTexture = true
        this.__textureIdleCount = 0
      }
      if (flags.includes('physics')) {
        this.__dirtyPhysics = true
        this.__physicsIdleCount = 0
      }
    })
    this.on('scalemodified', (key) => {
      const flags = SCALE_DIRTY_MAP[key]
      if (!flags) return
      if (flags.includes('physics')) {
        this.__dirtyPhysics = true
        this.__physicsIdleCount = 0
      }
    })
    this.on('pivotmodified', () => {
      this.__dirtyPhysics = true
      this.__physicsIdleCount = 0
    })
  }

  /**
   * 계층 구조(Hierarchy)의 자식으로 다른 LeviarObject를 추가합니다.
   * 부모 객체의 3D 매트릭스 변환을 완전히 상속받게 됩니다.
   */
  addChild(child: LeviarObject): this {
    if (child.parent) {
      child.parent.removeChild(child)
    }
    child.parent = this
    this.children.add(child)
    return this
  }

  /**
   * 자식 객체를 삭제합니다.
   */
  removeChild(child: LeviarObject): this {
    if (child.parent === this) {
      child.parent = null
      this.children.delete(child)
    }
    return this
  }

  /**
   * 현재 부모 객체로부터 독립합니다.
   */
  removeFromParent(): this {
    if (this.parent) {
      this.parent.removeChild(this)
    }
    return this
  }

  /**
   * 객체를 월드에서 제거합니다.
   * @param options 제거 옵션. child: true이면 자식 객체도 함께 삭제, follower: true이면 자신을 따라다니는 객체도 함께 삭제 (기본값: 모두 false)
   */
  remove(options?: { follower?: boolean; child?: boolean }): this {
    const removeChild = options?.child ?? false
    const removeFollower = options?.follower ?? false

    if (removeChild) {
      const childrenToDrop = Array.from(this.children)
      for (const child of childrenToDrop) {
        child.remove(options)
      }
    }

    this.removeFromParent()

    const followersToKick = Array.from(this.followers)
    for (const follower of followersToKick) {
      this.kick(follower)
      if (removeFollower) {
        follower.remove(options)
      }
    }

    // 월드/물리엔진이 이 이벤트를 수신하여 제거 처리를 할 수 있도록 이벤트를 방출합니다.
    this.emit('remove', this)

    return this
  }

  /**
   * 객체의 로컬 트랜스폼 및 피벗을 이용해 월드 매트릭스를 재귀적으로 계산 및 갱신합니다.
   * World.ts 의 렌더 루프 전에 루트 노드로부터 호출되어야 합니다.
   */
  __updateMatrixWorld(force: boolean = false) {
    const pos = this.transform.position
    const rot = this.transform.rotation
    const scale = this.transform.scale

    // 1. 자신의 로컬 매트릭스 갱신 (Z -> Y -> X 순서로 회전)
    this.localMatrix.identity()
    // Leviar의 관행(+Z가 앞)을 OpenGL 호환(-Z가 앞)으로 동기화하기 위해 -pos.z 적용
    _tmpVec3.set(pos.x, pos.y, -pos.z)
    this.localMatrix.translate(_tmpVec3)
    if (rot.z) this.localMatrix.rotate(rot.z * Math.PI / 180, VEC3_Z)
    if (rot.y) this.localMatrix.rotate(rot.y * Math.PI / 180, VEC3_Y)
    if (rot.x) this.localMatrix.rotate(rot.x * Math.PI / 180, VEC3_X)
    _tmpVec3.set(scale.x, scale.y, scale.z)
    this.localMatrix.scale(_tmpVec3)

    // 2. 부모가 존재할 경우 월드 매트릭스 상속 계산 (world = parent.world * local)
    if (this.parent) {
      this.__worldMatrix.multiply(this.parent.__worldMatrix, this.localMatrix)
    } else {
      this.__worldMatrix.copy(this.localMatrix)
    }

    // 3. 하위 자식 목록에 대해 재귀 갱신 (preserve-3d 구조)
    for (const child of this.children) {
      child.__updateMatrixWorld(force)
    }
  }

  /**
   * 객체가 주어진 클래스들을 모두 포함하고 있는지 확인합니다. (공백으로 구분)
   * 전달된 모든 클래스가 존재할 때만 true를 반환합니다.
   */
  hasClass(classNames: string): boolean {
    if (!classNames || !this.attribute.className) return false
    const currentClasses = this.attribute.className.split(/\s+/).filter(Boolean)
    const requiredClasses = classNames.split(/\s+/).filter(Boolean)

    if (requiredClasses.length === 0) return false
    return requiredClasses.every(cls => currentClasses.includes(cls))
  }

  /**
   * 객체에 하나 이상의 클래스를 추가합니다. (공백으로 구분)
   * 이미 존재하는 클래스는 무시됩니다.
   */
  addClass(classNames: string): this {
    if (!classNames) return this
    const currentClasses = (this.attribute.className || '').split(/\s+/).filter(Boolean)
    const newClasses = classNames.split(/\s+/).filter(Boolean)

    let changed = false
    for (const cls of newClasses) {
      if (!currentClasses.includes(cls)) {
        currentClasses.push(cls)
        changed = true
      }
    }

    if (changed) {
      this.attribute.className = currentClasses.join(' ')
    }
    return this
  }

  /**
   * 객체에서 하나 이상의 클래스를 제거합니다. (공백으로 구분)
   * 존재하지 않는 클래스는 무시됩니다.
   */
  removeClass(classNames: string): this {
    if (!classNames || !this.attribute.className) return this
    const currentClasses = this.attribute.className.split(/\s+/).filter(Boolean)
    const removeClasses = classNames.split(/\s+/).filter(Boolean)

    const newClasses = currentClasses.filter(c => !removeClasses.includes(c))

    if (currentClasses.length !== newClasses.length) {
      this.attribute.className = newClasses.join(' ')
    }
    return this
  }

  /**
   * 물리 바디에 힘을 적용합니다. attribute.physics가 설정된 경우에만 동작합니다.
   */
  applyForce(force: { x?: number; y?: number }): this {
    if (!this.__body) {
      console.warn('[LeviarObject] applyForce: 물리 바디가 없습니다. attribute.physics를 설정하십시오.')
      return this
    }
    const Matter = (globalThis as any).__Matter__
    if (Matter) {
      Matter.Body.applyForce(this.__body, this.__body.position, { x: force.x ?? 0, y: force.y ?? 0 })
    }
    return this
  }

  /**
   * 물리 바디의 속도를 설정합니다. attribute.physics가 설정된 경우에만 동작합니다.
   */
  setVelocity(velocity: { x?: number; y?: number }): this {
    if (!this.__body) {
      console.warn('[LeviarObject] setVelocity: 물리 바디가 없습니다. attribute.physics를 설정하십시오.')
      return this
    }
    const Matter = (globalThis as any).__Matter__
    if (Matter) {
      Matter.Body.setVelocity(this.__body, { x: velocity.x ?? this.__body.velocity.x, y: velocity.y ?? this.__body.velocity.y })
    }
    return this
  }

  /**
   * 물리 바디의 각속도를 설정합니다. attribute.physics가 설정된 경우에만 동작합니다.
   * @param angularVelocity 각속도 (라디안/초)
   */
  setAngularVelocity(angularVelocity: number): this {
    if (!this.__body) {
      console.warn('[LeviarObject] setAngularVelocity: 물리 바디가 없습니다. attribute.physics를 설정하십시오.')
      return this
    }
    const Matter = (globalThis as any).__Matter__
    if (Matter) {
      Matter.Body.setAngularVelocity(this.__body, angularVelocity)
    }
    return this
  }

  /**
   * 물리 바디에 토크(회전력)를 적용합니다. attribute.physics가 설정된 경우에만 동작합니다.
   * Matter.js는 매 스텝마다 torque를 소비하므로, 매 프레임 호출하면 지속적인 회전력이 됩니다.
   * @param torque 토크 값 (양수: 시계 방향, 음수: 반시계 방향)
   */
  applyTorque(torque: number): this {
    if (!this.__body) {
      console.warn('[LeviarObject] applyTorque: 물리 바디가 없습니다. attribute.physics를 설정하십시오.')
      return this
    }
    this.__body.torque += torque
    return this
  }

  private _followTarget?: LeviarObject
  private _followOffset?: { x?: number; y?: number; z?: number }
  private _followListener?: (axis: string, val: number) => void
  private _followers: Set<LeviarObject> = new Set()

  /**
   * 자신이 따라다니는 객체를 반환합니다. 없다면 undefined를 반환합니다.
   */
  get following(): LeviarObject | undefined {
    return this._followTarget
  }

  /**
   * 현재 자신을 따라다니거나 들러붙은 모든 객체를 배열로 반환합니다.
   */
  get followers(): LeviarObject[] {
    return Array.from(this._followers)
  }

  /**
   * 다른 LeviarObject를 일정 거리를 두고 따라다닙니다.
   * 기존에 따라다니던 객체가 있다면 새로운 객체로 덮어씁니다.
   */
  follow(target: LeviarObject, offset?: { x?: number; y?: number; z?: number }): this {
    this.unfollow()

    this._followTarget = target
    this._followOffset = offset
    target['_followers'].add(this)

    this._followListener = () => {
      if (this._followOffset?.x !== undefined) {
        this.transform.position.x = target.transform.position.x + this._followOffset.x
      } else {
        this.transform.position.x = target.transform.position.x
      }

      if (this._followOffset?.y !== undefined) {
        this.transform.position.y = target.transform.position.y + this._followOffset.y
      } else {
        this.transform.position.y = target.transform.position.y
      }

      if (this._followOffset?.z !== undefined) {
        this.transform.position.z = target.transform.position.z + this._followOffset.z
      } else {
        this.transform.position.z = target.transform.position.z
      }
    }

    target.on('positionmodified', this._followListener as any)
    this._followListener('', 0)
    return this
  }

  /**
   * 대상을 따라다니는 동작을 중지합니다.
   */
  unfollow(): this {
    if (this._followTarget && this._followListener) {
      this._followTarget.off('positionmodified', this._followListener as any)
      this._followTarget['_followers'].delete(this)
      this._followTarget = undefined
      this._followListener = undefined
      this._followOffset = undefined
    }
    return this
  }

  /**
   * 자신을 따라다니는 특정 오브젝트의 추적을 끊어냅니다. (unfollow 시킴)
   * @param follower 제거할 추적 객체
   */
  kick(follower: LeviarObject): this {
    if (this['_followers'].has(follower)) {
      follower.unfollow()
    }
    return this
  }

  /**
   * 객체의 속성을 애니메이션으로 부드럽게 변경합니다.
   * @param target 변경할 속성과 목표값 (숫자 or 복합 대입 연산자 문자열)
   * @param duration 지속 시간 (ms)
   * @param easing 이징 함수 이름 (기본값: 'linear')
   */
  animate(target: AnimateTarget, duration: number, easing: EasingType = 'linear'): Animation {
    // animate.md 예제처럼 최상위 position → transform.position 으로 리매핑합니다
    const normalized: Record<string, any> = { ...target }
    if (normalized.position) {
      if (!normalized.transform) normalized.transform = {}
      normalized.transform.position = normalized.position
      delete normalized.position
    }

    // LeviarObject가 가진 실제 속성 맵을 구성합니다
    const source: Record<string, any> = {
      style: this.style,
      transform: this.transform,
      dataset: this.dataset,
      attribute: this.attribute,
    }
    return animateObject(source, normalized as any, duration, easing)
  }

  private _fadeTransition?: FadeTransition

  /**
   * 객체를 부드럽게 나타나게 합니다 (display: block 이후 투명도 0 -> 1).
   */
  fadeIn(durationMs: number, easing?: EasingType): FadeTransition {
    if (!this._fadeTransition) {
      this._fadeTransition = new FadeTransition(this)
    }
    this._fadeTransition.start(durationMs, easing, 'in')
    return this._fadeTransition
  }

  /**
   * 객체를 부드럽게 사라지게 합니다 (투명도 1 -> 0 이후 display: none).
   */
  fadeOut(durationMs: number, easing?: EasingType): FadeTransition {
    if (!this._fadeTransition) {
      this._fadeTransition = new FadeTransition(this)
    }
    this._fadeTransition.start(durationMs, easing, 'out')
    return this._fadeTransition
  }
}
