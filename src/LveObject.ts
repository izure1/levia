import { v4 as uuidv4 } from './utils/uuid.js'
import type Matter from 'matter-js'
import { animateObject } from './Animation.js'
import type { Animation } from './Animation.js'
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
  LveObjectOptions,
  LveObjectEvents,
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
    shadowColor: partial?.shadowColor,
    shadowBlur: partial?.shadowBlur,
    shadowOffsetX: partial?.shadowOffsetX,
    shadowOffsetY: partial?.shadowOffsetY,
    zIndex: partial?.zIndex ?? 0,
    blendMode: partial?.blendMode,
  }
}

/**
 * 객체의 얕은 프로퍼티 변경을 감지하여 이벤트를 발행하는 Proxy를 만듭니다.
 */
function makeTrackedProxy<T extends object>(
  target: T,
  emitter: EventEmitter,
  eventName: string,
): T {
  return new Proxy(target, {
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

export abstract class LveObject extends EventEmitter<LveObjectEvents> {
  readonly attribute: Attribute
  readonly dataset: Dataset
  readonly style: Style
  readonly transform: Transform

  /** matter-js 바디 참조 (PhysicsEngine에서 설정) */
  _body: Matter.Body | null = null

  /**
   * Renderer가 매 프레임 기록하는 실제 렌더 크기 (월드 좌표 기준, scale 포함, perspectiveScale 제외)
   * style.width/height 미지정 시 naturalWidth 등의 값이 들어옵니다.
   */
  _renderedSize: { w: number; h: number } | null = null

  /** Offscreen Canvas · 텍스처 재생성이 필요함을 나타내는 dirty flag */
  _dirtyTexture: boolean = true

  /** 물리 바디 크기 재확인이 필요함을 나타내는 dirty flag */
  _dirtyPhysics: boolean = false

  /**
   * 마지막 텍스처 변경 이후 경과한 프레임 수.
   * 새 변경이 오면 0으로 리셋, 임계값 도달 시 텍스처를 업데이트합니다. (디바운스)
   */
  _textureIdleCount: number = 0

  /**
   * 마지막 물리 변경 이후 경과한 프레임 수.
   * 새 변경이 오면 0으로 리셋, 임계값 도달 시 물리 실제 크기를 재확인합니다. (디바운스)
   */
  _physicsIdleCount: number = 0

  /**
   * 마지막 텍스처 업데이트 이후 경과한 프레임 수.
   * 렌더 후 0으로 리셋, 임계값 도달 시 강제 업데이트합니다. (스로틀)
   */
  _textureThrottleCount: number = 0

  /**
   * 마지막 물리 업데이트 이후 경과한 프레임 수.
   * 업데이트 후 0으로 리셋, 임계값 도달 시 강제 재확인합니다. (스로틀)
   */
  _physicsThrottleCount: number = 0


  constructor(type: string, options?: LveObjectOptions) {
    super()

    const rawAttribute: Attribute = {
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

    const rawDataset = Object.assign({}, options?.dataset)
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
    this.attribute = makeTrackedProxy(rawAttribute, this, 'attrmodified')
    this.dataset = makeTrackedProxy(rawDataset, this, 'datamodified')
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
    // dirty를 세울 때 idle 카운터를 0으로 리셋하여 디바운스 기준점 재설정
    this.on('cssmodified', (key) => {
      const flags = STYLE_DIRTY_MAP[key]
      if (!flags) return
      if (flags.includes('texture')) {
        this._dirtyTexture = true
        this._textureIdleCount = 0
      }
      if (flags.includes('physics')) {
        this._dirtyPhysics = true
        this._physicsIdleCount = 0
      }
    })
    this.on('attrmodified', (key) => {
      const flags = ATTR_DIRTY_MAP[key]
      if (!flags) return
      if (flags.includes('texture')) {
        this._dirtyTexture = true
        this._textureIdleCount = 0
      }
      if (flags.includes('physics')) {
        this._dirtyPhysics = true
        this._physicsIdleCount = 0
      }
    })
    this.on('scalemodified', (key) => {
      const flags = SCALE_DIRTY_MAP[key]
      if (!flags) return
      if (flags.includes('physics')) {
        this._dirtyPhysics = true
        this._physicsIdleCount = 0
      }
    })
    this.on('pivotmodified', () => {
      this._dirtyPhysics = true
      this._physicsIdleCount = 0
    })
  }

  setDataset(key: string, value: DatasetValue) {
    this.dataset[key] = value
  }

  getDataset(key: string): DatasetValue | undefined {
    return this.dataset[key]
  }

  /**
   * 객체에 하나 이상의 클래스를 추가합니다. (공백으로 구분)
   * 이미 존재하는 클래스는 무시됩니다.
   */
  addClass(classNames: string) {
    if (!classNames) return
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
  }

  /**
   * 객체에서 하나 이상의 클래스를 제거합니다. (공백으로 구분)
   * 존재하지 않는 클래스는 무시됩니다.
   */
  removeClass(classNames: string) {
    if (!classNames || !this.attribute.className) return
    const currentClasses = this.attribute.className.split(/\s+/).filter(Boolean)
    const removeClasses = classNames.split(/\s+/).filter(Boolean)

    const newClasses = currentClasses.filter(c => !removeClasses.includes(c))

    if (currentClasses.length !== newClasses.length) {
      this.attribute.className = newClasses.join(' ')
    }
  }

  /**
   * 물리 바디에 힘을 적용합니다. attribute.physics가 설정된 경우에만 동작합니다.
   */
  applyForce(force: { x?: number; y?: number }) {
    if (!this._body) {
      console.warn('[LveObject] applyForce: 물리 바디가 없습니다. attribute.physics를 설정하십시오.')
      return
    }
    const Matter = (globalThis as any).__Matter__
    if (Matter) {
      Matter.Body.applyForce(this._body, this._body.position, { x: force.x ?? 0, y: force.y ?? 0 })
    }
  }

  /**
   * 물리 바디의 속도를 설정합니다. attribute.physics가 설정된 경우에만 동작합니다.
   */
  setVelocity(velocity: { x?: number; y?: number }) {
    if (!this._body) {
      console.warn('[LveObject] setVelocity: 물리 바디가 없습니다. attribute.physics를 설정하십시오.')
      return
    }
    const Matter = (globalThis as any).__Matter__
    if (Matter) {
      Matter.Body.setVelocity(this._body, { x: velocity.x ?? this._body.velocity.x, y: velocity.y ?? this._body.velocity.y })
    }
  }

  /**
   * 물리 바디의 각속도를 설정합니다. attribute.physics가 설정된 경우에만 동작합니다.
   * @param angularVelocity 각속도 (라디안/초)
   */
  setAngularVelocity(angularVelocity: number) {
    if (!this._body) {
      console.warn('[LveObject] setAngularVelocity: 물리 바디가 없습니다. attribute.physics를 설정하십시오.')
      return
    }
    const Matter = (globalThis as any).__Matter__
    if (Matter) {
      Matter.Body.setAngularVelocity(this._body, angularVelocity)
    }
  }

  /**
   * 물리 바디에 토크(회전력)를 적용합니다. attribute.physics가 설정된 경우에만 동작합니다.
   * Matter.js는 매 스텝마다 torque를 소비하므로, 매 프레임 호출하면 지속적인 회전력이 됩니다.
   * @param torque 토크 값 (양수: 시계 방향, 음수: 반시계 방향)
   */
  applyTorque(torque: number) {
    if (!this._body) {
      console.warn('[LveObject] applyTorque: 물리 바디가 없습니다. attribute.physics를 설정하십시오.')
      return
    }
    this._body.torque += torque
  }

  private _followTarget?: LveObject
  private _followOffset?: { x?: number; y?: number; z?: number }
  private _followListener?: (axis: string, val: number) => void
  private _followers: Set<LveObject> = new Set()

  /**
   * 자신이 따라다니는 객체를 반환합니다. 없다면 undefined를 반환합니다.
   */
  get following(): LveObject | undefined {
    return this._followTarget
  }

  /**
   * 현재 자신을 따라다니는 모든 객체를 배열로 반환합니다.
   */
  get followers(): LveObject[] {
    return Array.from(this._followers)
  }

  /**
   * 다른 LveObject를 일정 거리를 두고 따라다닙니다.
   * 기존에 따라다니던 객체가 있다면 새로운 객체로 덮어씁니다.
   */
  follow(target: LveObject, offset?: { x?: number; y?: number; z?: number }) {
    this.unfollow()
    this._followTarget = target
    this._followOffset = offset
    target._followers.add(this)

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
  }

  /**
   * 대상을 따라다니는 동작을 중지합니다.
   */
  unfollow() {
    if (this._followTarget && this._followListener) {
      this._followTarget.off('positionmodified', this._followListener as any)
      this._followTarget._followers.delete(this)
      this._followTarget = undefined
      this._followListener = undefined
      this._followOffset = undefined
    }
  }

  /**
   * 자신을 따라다니는 특정 오브젝트의 추적을 끊어냅니다. (unfollow 시킴)
   * @param follower 제거할 추적 객체
   */
  kick(follower: LveObject) {
    if (this._followers.has(follower)) {
      follower.unfollow()
    }
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

    // LveObject가 가진 실제 속성 맵을 구성합니다
    const source: Record<string, any> = {
      style: this.style,
      transform: this.transform,
      dataset: this.dataset,
      attribute: this.attribute,
    }
    return animateObject(source, normalized as any, duration, easing)
  }
}
