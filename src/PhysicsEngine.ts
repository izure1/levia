import Matter from 'matter-js'
import type { LveObject } from './LveObject.js'

  // globalThis에 Matter를 노출하여 LveObject에서 applyForce/setVelocity 호출 가능하게 함
  ; (globalThis as any).__Matter__ = Matter

/**
 * matter-js 기반 물리 엔진 래퍼.
 * attribute.physics = 'dynamic' | 'static' 인 LveObject를 등록하고 매 프레임 시뮬레이션을 수행합니다.
 */
export class PhysicsEngine {
  readonly engine: Matter.Engine
  private bodyMap: Map<string, Matter.Body> = new Map()
  private objMap: Map<string, LveObject> = new Map()
  private prevTime: number = 0

  constructor() {
    this.engine = Matter.Engine.create()
  }

  /**
   * 중력을 설정합니다.
   */
  setGravity(x: number, y: number) {
    this.engine.gravity.x = x
    this.engine.gravity.y = y
  }

  /**
   * LveObject를 물리 바디로 등록합니다.
   * attribute.physics에 따라 dynamic / static 바디를 생성합니다.
   */
  addBody(obj: LveObject, w: number, h: number) {
    if (!obj.attribute.physics) return

    const { x, y } = obj.transform.position
    const attr = obj.attribute

    const options: Matter.IBodyDefinition = {
      isStatic: attr.physics === 'static',
      density: attr.density ?? 0.001,
      friction: attr.friction ?? 0.1,
      restitution: attr.restitution ?? 0,
      frictionAir: 0.01,
      collisionFilter: {
        group: attr.collisionGroup ?? 0,
        mask: attr.collisionMask ?? 0xFFFFFFFF,
        category: attr.collisionCategory ?? 0x0001,
      },
    }

    // 박스 또는 원으로 바디 생성 (type 기반)
    let body: Matter.Body
    if (obj.attribute.type === 'ellipse') {
      const r = Math.min(w, h) / 2 || 16
      body = Matter.Bodies.circle(x, y, r, options as any)
    } else {
      body = Matter.Bodies.rectangle(x, y, w || 32, h || 32, options as any)
    }

    // IBodyDefinition에 없는 필드는 직접 할당
    if (attr.fixedRotation) {
      Matter.Body.setInertia(body, Infinity)
    }
    if (attr.gravityScale != null) {
      ; (body as any).gravityScale = attr.gravityScale
    }

    obj._body = body
    this.bodyMap.set(obj.attribute.id, body)
    this.objMap.set(obj.attribute.id, obj)
    Matter.Composite.add(this.engine.world, body)
  }

  /**
   * LveObject의 물리 바디를 제거합니다.
   */
  removeBody(obj: LveObject) {
    const body = this.bodyMap.get(obj.attribute.id)
    if (!body) return
    Matter.Composite.remove(this.engine.world, body)
    this.bodyMap.delete(obj.attribute.id)
    this.objMap.delete(obj.attribute.id)
    obj._body = null
  }

  /**
   * 특정 오브젝트에 힘을 적용합니다.
   */
  applyForce(obj: LveObject, force: { x: number; y: number }) {
    if (!obj._body) return
    Matter.Body.applyForce(obj._body, obj._body.position, force)
  }

  /**
   * 특정 오브젝트의 속도를 설정합니다.
   */
  setVelocity(obj: LveObject, velocity: { x: number; y: number }) {
    if (!obj._body) return
    Matter.Body.setVelocity(obj._body, velocity)
  }

  /**
   * 물리 시뮬레이션을 진행하고, 바디 위치를 LveObject에 동기화합니다.
   * @param timestamp requestAnimationFrame의 타임스탬프
   */
  step(timestamp: number) {
    if (this.prevTime === 0) {
      this.prevTime = timestamp
      return
    }
    const delta = Math.min(timestamp - this.prevTime, 50) // 최대 50ms로 clamp (탭 비활성화 등 대응)
    this.prevTime = timestamp
    Matter.Engine.update(this.engine, delta)
    this.syncToObjects()
  }

  /**
   * matter-js 바디의 위치/회전을 LveObject.transform에 반영합니다.
   */
  private syncToObjects() {
    for (const [id, body] of this.bodyMap) {
      const obj = this.objMap.get(id)
      if (!obj) continue
      obj.transform.position.x = body.position.x
      obj.transform.position.y = body.position.y
      obj.transform.rotation.z = (body.angle * 180) / Math.PI
    }
  }
}
