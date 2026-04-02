import Matter from 'matter-js'
import type { LveObject } from './LveObject.js'
import { PHYSICS_THROTTLE_FRAMES, PHYSICS_DEBOUNCE_FRAMES } from './dirty.js'

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
  /** Z → 양수 그룹 번호 매핑 (1-based). 같은 Z = 같은 양수 그룹 = 충돌, 다른 Z = 다른 그룹 = 차단 */
  private zGroupMap: Map<number, number> = new Map()
  private nextZGroup: number = 1

  constructor() {
    this.engine = Matter.Engine.create()

    // matter-js는 기본적으로 engine.gravity를 모든 바디에 일괄 적용합니다 (force = mass * gravity.y * gravity.scale).
    // attribute.gravityScale이 개별 설정된 바디에 대해 각 바디의 최종 중력이 원래 중력 * gravityScale이 되도록
    // 해당 차이만큼의 추가 힘을 매번 업데이트 전 적용합니다.
    Matter.Events.on(this.engine, 'beforeUpdate', () => {
      const gravity = this.engine.gravity
      for (const body of Matter.Composite.allBodies(this.engine.world)) {
        const scale = (body as any).gravityScale
        if (scale !== undefined && scale !== 1 && !body.isStatic) {
          const m = body.mass
          body.force.x += m * gravity.x * gravity.scale * (scale - 1)
          body.force.y += m * gravity.y * gravity.scale * (scale - 1)
        }
      }
    })
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

    // style.margin을 파싱하여 물리 바디 크기에 반영
    const m = parseMargin(obj.style.margin)
    const bw = (obj.style.borderWidth ?? 0) * 2
    
    // w, h는 이미 scale이 적용된 렌더링 크기 또는 style 크기가 들어옵니다.
    const baseW = w || 32
    const baseH = h || 32
    const physW = baseW + m.left + m.right + bw
    const physH = baseH + m.top + m.bottom + bw

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
      angle: (obj.transform.rotation.z || 0) * Math.PI / 180,
    }

    // pivot 오프셋 계산 (Renderer.ts와 동일한 맵핑: pivot (0,0) = top-left -> center moves right and down)
    const pivotOffsetX = (0.5 - obj.transform.pivot.x) * baseW
    const pivotOffsetY = -(0.5 - obj.transform.pivot.y) * baseH

    // margin 비대칭 교정 (예: left 20이면 바디 박스가 왼쪽으로 확장되어 중심이 왼쪽으로 이동)
    // Y축은 Renderer 기준 위쪽이 +Y이므로 top margin이 늘어나면 중심이 위로 이동
    const marginOffsetX = (m.right - m.left) / 2
    const marginOffsetY = (m.top - m.bottom) / 2

    const localCenterX = pivotOffsetX + marginOffsetX
    const localCenterY = pivotOffsetY + marginOffsetY

    // 회전을 적용하여 월드 위치 기준 바디 중심점 계산
    const angle = options.angle as number
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    
    const worldCenterX = x + localCenterX * cos - localCenterY * sin
    const worldCenterY = y + localCenterX * sin + localCenterY * cos

    // 박스 또는 원으로 바디 생성 (type 기반)
    let body: Matter.Body
    if (obj.attribute.type === 'ellipse') {
      const r = Math.min(physW, physH) / 2
      body = Matter.Bodies.circle(worldCenterX, worldCenterY, r, options as any)
    } else {
      body = Matter.Bodies.rectangle(worldCenterX, worldCenterY, physW, physH, options as any)
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
   * dirty + 디바운스(개혁) 또는 스로틄(강제) 조건 달성 시에만 크기를 재확인합니다.
   */
  syncObjectSizes(objects: Iterable<LveObject>) {
    const EPS = 0.5
    for (const obj of objects) {
      if (!obj._body || !obj._renderedSize) continue

      // 스로틄: 마지막 업데이트 이후 프레임 카운터 증가
      obj._physicsThrottleCount++
      // 디바운스: dirty 상태일 때만 idle 카운터 증가
      if (obj._dirtyPhysics) obj._physicsIdleCount++

      const shouldCheck = obj._dirtyPhysics && (
        obj._physicsIdleCount >= PHYSICS_DEBOUNCE_FRAMES    // 디바운스: K프레임 변경 없음 → 마무리
        || obj._physicsThrottleCount >= PHYSICS_THROTTLE_FRAMES // 스로틄: N프레임 초과 → 강제
      )

      if (!shouldCheck) continue

      obj._dirtyPhysics = false
      obj._physicsIdleCount = 0
      obj._physicsThrottleCount = 0  // 업데이트 후 양쪽 리셋

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
    this.updateZCollisionFilters()
    Matter.Engine.update(this.engine, delta)
    this.syncToObjects()
  }

  /**
   * 매 step 전, 오브젝트의 Z 좌표를 기반으로 collisionFilter.group을 동적으로 갱신합니다.
   * - 같은 Z → 같은 양수 group → matter-js 규칙상 무조건 충돌
   * - 다른 Z → 다른 group → category=0/mask=0 으로 충돌 차단
   * - 사용자가 attr.collisionGroup을 명시한 경우 Z 로직을 건너뜁니다.
   */
  private updateZCollisionFilters() {
    for (const [id, body] of this.bodyMap) {
      const obj = this.objMap.get(id)
      if (!obj) continue

      // 사용자가 collisionCategory/collisionMask를 직접 지정한 경우 Z 필터 무시
      if (obj.attribute.collisionCategory != null || obj.attribute.collisionMask != null) continue

      const z = obj.transform.position.z ?? 0

      // Z 값에 대응하는 category 비트 (1 << index, 최대 32개 고유 Z 레이어)
      if (!this.zGroupMap.has(z)) {
        const bit = 1 << ((this.nextZGroup++ - 1) % 31 + 1) // 비트 1~31 사용 (비트0은 기본값 회피)
        this.zGroupMap.set(z, bit)
      }
      const category = this.zGroupMap.get(z)!

      // mask = 자신의 category → 같은 category끼리만 (A & B_mask) !== 0 성립
      const cf = body.collisionFilter
      if (cf.group !== 0 || cf.category !== category || cf.mask !== category) {
        Matter.Body.set(body, {
          collisionFilter: {
            group: obj.attribute.collisionGroup ?? 0,
            category,
            mask: category,
          },
        })
      }
    }
  }

  /**
   * matter-js 바디의 위치/회전을 LveObject.transform에 반영합니다.
   */
  private syncToObjects() {
    for (const [id, body] of this.bodyMap) {
      const obj = this.objMap.get(id)
      if (!obj) continue

      // 크기와 마진 구하기
      // PhysicsEngine에서 캐싱된 _renderedSize 또는 style 속성 활용
      const lastSize = this.lastSizeMap.get(id)
      // syncObjectSizes가 호출되기 전이면 _renderedSize의 값을 근사치로 가져옵니다.
      let baseW = lastSize?.w ?? obj._renderedSize?.w ?? obj.style.width
      let baseH = lastSize?.h ?? obj._renderedSize?.h ?? obj.style.height
      // sizeMap에 캐시된 값이 없으면 (생성 직후 등) scale을 곱해야 할 수도 있으나,
      // lastSizeMap은 syncObjectSizes에서 세팅되며 사실상 w, h입니다.
      if (!lastSize) {
        baseW = (baseW ?? 32) * obj.transform.scale.x
        baseH = (baseH ?? 32) * obj.transform.scale.y
      } else {
        baseW = baseW ?? 32
        baseH = baseH ?? 32
      }

      const m = parseMargin(obj.style.margin)

      // 로컬 오프셋 재계산
      const pivotOffsetX = (0.5 - obj.transform.pivot.x) * baseW
      const pivotOffsetY = -(0.5 - obj.transform.pivot.y) * baseH
      const marginOffsetX = (m.right - m.left) / 2
      const marginOffsetY = (m.top - m.bottom) / 2
      
      const localCenterX = pivotOffsetX + marginOffsetX
      const localCenterY = pivotOffsetY + marginOffsetY

      // 현재 바디의 각도를 기반으로 오프셋 회전
      const cos = Math.cos(body.angle)
      const sin = Math.sin(body.angle)
      
      const rotatedOffsetX = localCenterX * cos - localCenterY * sin
      const rotatedOffsetY = localCenterX * sin + localCenterY * cos

      // pivot (pos) = 바디 중심 - 회전된 오프셋
      obj.transform.position.x = body.position.x - rotatedOffsetX
      obj.transform.position.y = body.position.y - rotatedOffsetY
      obj.transform.rotation.z = (body.angle * 180) / Math.PI
    }
  }
}
