import Matter from 'matter-js'
import type { LveObject } from './LveObject.js'

/**
 * CSS 단축 표기법 margin 문자열을 파싱합니다.
 * "10"        → top: 10, right: 10, bottom: 10, left: 10
 * "10 20"     → top: 10, right: 20, bottom: 10, left: 20
 * "10 20 30"  → top: 10, right: 20, bottom: 30, left: 20
 * "10 20 30 40" → top: 10, right: 20, bottom: 30, left: 40
 */
function parseMargin(margin?: string): { top: number; right: number; bottom: number; left: number } {
  if (!margin) return { top: 0, right: 0, bottom: 0, left: 0 }
  const parts = margin.trim().split(/\s+/).map(Number)
  if (parts.some(isNaN)) return { top: 0, right: 0, bottom: 0, left: 0 }
  if (parts.length === 1) {
    return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] }
  } else if (parts.length === 2) {
    return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] }
  } else if (parts.length === 3) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] }
  } else {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] }
  }
}

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
  /** syncObjectSizes에서 크기 변경 감지용 - border/margin 제외한 순수 w, h */
  private lastSizeMap: Map<string, { w: number; h: number }> = new Map()

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

    // style.margin을 파싱하여 물리 바디 크기에 반영
    const m = parseMargin(obj.style.margin)
    const bw = (obj.style.borderWidth ?? 0) * 2
    const physW = (w || 32) + m.left + m.right + bw
    const physH = (h || 32) + m.top + m.bottom + bw

    // 박스 또는 원으로 바디 생성 (type 기반)
    let body: Matter.Body
    if (obj.attribute.type === 'ellipse') {
      const r = Math.min(physW, physH) / 2
      body = Matter.Bodies.circle(x, y, r, options as any)
    } else {
      body = Matter.Bodies.rectangle(x, y, physW, physH, options as any)
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
   * 물리 바디의 크기를 재계산하여 재생성합니다.
   * 현재 위치, 속도, 각도를 유지합니다.
   * w, h는 style.width * scale, style.height * scale 기준 (margin/border 미포함)
   */
  updateBodySize(obj: LveObject, w: number, h: number) {
    const prevBody = this.bodyMap.get(obj.attribute.id)
    if (!prevBody) return

    // 현재 물리 상태 저장
    const pos = { ...prevBody.position }
    const vel = { ...prevBody.velocity }
    const angle = prevBody.angle
    const angularVelocity = prevBody.angularVelocity

    // 기존 body 제거 (objMap/bodyMap에서도 제거)
    Matter.Composite.remove(this.engine.world, prevBody)
    this.bodyMap.delete(obj.attribute.id)
    obj._body = null

    // 위치를 물리 바디 좌표로 임시 반영
    const savedX = obj.transform.position.x
    const savedY = obj.transform.position.y
    obj.transform.position.x = pos.x
    obj.transform.position.y = pos.y

    // 새 크기로 재생성
    this.addBody(obj, w, h)

    // transform을 원래대로 복원 (syncToObjects가 덮어쓸 것)
    obj.transform.position.x = savedX
    obj.transform.position.y = savedY

    // 물리 상태 복원
    const newBody = this.bodyMap.get(obj.attribute.id)
    if (!newBody) return
    Matter.Body.setPosition(newBody, pos)
    Matter.Body.setVelocity(newBody, vel)
    Matter.Body.setAngle(newBody, angle)
    Matter.Body.setAngularVelocity(newBody, angularVelocity)
  }

  /**
   * LveObject._renderedSize 기반으로 물리 바디 크기를 동기화합니다.
   * 매 프레임 World에서 호출되며, 크기가 변경된 경우에만 updateBodySize를 호출합니다.
   */
  syncObjectSizes(objects: Iterable<LveObject>) {
    const EPS = 0.5
    for (const obj of objects) {
      if (!obj._body || !obj._renderedSize) continue
      const { w, h } = obj._renderedSize
      const last = this.lastSizeMap.get(obj.attribute.id)
      if (last && Math.abs(last.w - w) < EPS && Math.abs(last.h - h) < EPS) continue
      this.lastSizeMap.set(obj.attribute.id, { w, h })
      this.updateBodySize(obj, w, h)
    }
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
    this.lastSizeMap.delete(obj.attribute.id)
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
