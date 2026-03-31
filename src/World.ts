import { Loader } from './Loader.js'
import { Camera } from './objects/Camera.js'
import { Rectangle } from './objects/Rectangle.js'
import { Ellipse } from './objects/Ellipse.js'
import { Text } from './objects/Text.js'
import { LveObject } from './LveObject.js'
import { LveImage } from './objects/LveImage.js'
import { LveVideo } from './objects/LveVideo.js'
import { Sprite } from './objects/Sprite.js'
import { Particle } from './objects/Particle.js'
import type { ParticleOptions } from './objects/Particle.js'
import { SpriteManager } from './SpriteManager.js'
import { VideoManager } from './VideoManager.js'
import { ParticleManager } from './ParticleManager.js'
import { PhysicsEngine } from './PhysicsEngine.js'
import type { LveObjectOptions, LoadedAssets, Attribute, WorldEvents } from './types.js'
import type { RectangleOptions } from './objects/Rectangle.js'
import { Renderer } from './Renderer.js'
import { EventEmitter } from './EventEmitter.js'
import { Mat4, Vec3 as OglVec3 } from 'ogl'

const AXIS_X = new OglVec3(1, 0, 0)
const AXIS_Y = new OglVec3(0, 1, 0)
const AXIS_Z = new OglVec3(0, 0, 1)

export interface WorldOptions {
  /** 캔버스 엘리먼트. 지정하지 않으면 자동으로 생성합니다. */
  canvas?: HTMLCanvasElement
  /**
   * 원근 투영 초점 거리.
   * 카메라 기본 Z는 `-focalLength` 로 설정됩니다.
   * 카메라와 오브젝트 사이의 transform.position.z의 차이가 focalLength일때 1:1 스케일로 렌더링됩니다.
   * @default 100
   */
  focalLength?: number
}

/**
 * MouseEvent를 래핑하여 stopPropagation() 호출 여부를 추적합니다.
 */
function wrapMouseEvent(e: MouseEvent): MouseEvent & { _propagationStopped: boolean } {
  const wrapped = e as MouseEvent & { _propagationStopped: boolean }
  if (wrapped._propagationStopped !== undefined) return wrapped
  wrapped._propagationStopped = false
  const original = e.stopPropagation.bind(e)
  e.stopPropagation = () => {
    wrapped._propagationStopped = true
    original()
  }
  return wrapped
}

export class World extends EventEmitter<WorldEvents> {
  private renderer: Renderer
  private objects: Set<LveObject> = new Set()
  private rafId: number | null = null
  private physics: PhysicsEngine = new PhysicsEngine()
  private _canvas: HTMLCanvasElement | null = null
  /** 현재 포커스 중인 카메라 (지정되지 않으면 객체 중 Camera를 찾습니다) */
  private _activeCamera: LveObject | null = null
  /** mouseover 상태 추적 (객체 id → boolean) */
  private _mouseOver: Set<string> = new Set()
  /** 원근 투영 초점 거리 */
  readonly focalLength: number

  /** 스프라이트 애니메이션 클립 매니저 */
  readonly spriteManager: SpriteManager = new SpriteManager()
  /** 비디오 클립 매니저 */
  readonly videoManager: VideoManager = new VideoManager()
  /** 파티클 클립 매니저 */
  readonly particleManager: ParticleManager = new ParticleManager()
  /** 에셋 로더 */
  readonly loader: Loader

  /** 모든 Loader에서 로드된 에셋의 통합 맵 */
  private _assets: LoadedAssets = {}

  constructor(canvasOrOptions?: HTMLCanvasElement | WorldOptions) {
    super()
    let canvasEl: HTMLCanvasElement
    let options: WorldOptions = {}

    if (canvasOrOptions instanceof HTMLCanvasElement) {
      canvasEl = canvasOrOptions
    } else {
      options = canvasOrOptions ?? {}
      canvasEl = options.canvas ?? this.createCanvas()
    }

    this.focalLength = options.focalLength ?? 100
    this._canvas = canvasEl
    this.renderer = new Renderer(canvasEl, this.focalLength)
    this.loader = new Loader()
    this.loader.on('complete', ({ assets }) => {
      Object.assign(this._assets, assets)
    })
    this._setupMouseEvents(canvasEl)
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;'
    document.body.appendChild(canvas)

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    })

    return canvas
  }

  // ─── 마우스 이벤트 ────────────────────────────────

  private _setupMouseEvents(canvas: HTMLCanvasElement) {
    // 객체에 이벤트를 emit하고, 전파가 막히지 않으면 world로 버블링합니다.
    const dispatch = (eventName: string, e: MouseEvent) => {
      const wrapped = wrapMouseEvent(e)
      const hits = this._getHitObjects(wrapped)
      for (const obj of hits) {
        obj.emit(eventName, wrapped)
        if (wrapped._propagationStopped) return
      }
      // 전파가 막히지 않으면 world로 버블링
      this.emit(eventName, hits[0], wrapped)
    }

    canvas.addEventListener('click', (e) => dispatch('click', e))
    canvas.addEventListener('dblclick', (e) => dispatch('dblclick', e))
    canvas.addEventListener('contextmenu', (e) => dispatch('contextmenu', e))
    canvas.addEventListener('mousedown', (e) => dispatch('mousedown', e))
    canvas.addEventListener('mouseup', (e) => dispatch('mouseup', e))

    canvas.addEventListener('mousemove', (e) => {
      const wrapped = wrapMouseEvent(e)
      const hits = this._getHitObjects(wrapped)
      const hitIds = new Set(hits.map(o => o.attribute.id))

      // mouseover: 새로 진입한 객체
      for (const obj of hits) {
        if (!this._mouseOver.has(obj.attribute.id)) {
          this._mouseOver.add(obj.attribute.id)
          obj.emit('mouseover', wrapped)
          if (!wrapped._propagationStopped) this.emit('mouseover', obj, wrapped)
        }
        obj.emit('mousemove', wrapped)
        if (!wrapped._propagationStopped) this.emit('mousemove', obj, wrapped)
      }

      // mouseout: 이전에 over였는데 이번에 없는 객체
      for (const id of Array.from(this._mouseOver)) {
        if (!hitIds.has(id)) {
          this._mouseOver.delete(id)
          const obj = Array.from(this.objects).find(o => o.attribute.id === id)
          if (obj) {
            obj.emit('mouseout', wrapped)
            if (!wrapped._propagationStopped) this.emit('mouseout', obj, wrapped)
          }
        }
      }
    })

    canvas.addEventListener('mouseleave', (e: MouseEvent) => {
      const wrapped = wrapMouseEvent(e)
      for (const id of Array.from(this._mouseOver)) {
        const obj = Array.from(this.objects).find(o => o.attribute.id === id)
        if (obj) {
          obj.emit('mouseout', wrapped)
          if (!wrapped._propagationStopped) this.emit('mouseout', obj, wrapped)
        }
      }
      this._mouseOver.clear()
    })
  }

  /**
   * 화면좌표 기준으로 마우스 위치에 겹쳐지는 객체를 반환합니다. (AABB hit-test)
   */
  private _getHitObjects(e: MouseEvent): LveObject[] {
    const canvas = this._canvas
    if (!canvas) return []

    // 캔버스 상대 마우스 좌표 (DPR 고려)
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const mouseX = (e.clientX - rect.left) * scaleX - canvas.width / 2
    const mouseY = -((e.clientY - rect.top) * scaleY - canvas.height / 2)

    // 카메라 위치 및 회전
    let camX = 0, camY = 0, camZ = 0
    let camRotX = 0, camRotY = 0, camRotZ = 0
    const activeCam = this.camera
    if (activeCam) {
      camX = activeCam.transform.position.x
      camY = activeCam.transform.position.y
      camZ = activeCam.transform.position.z
      camRotX = activeCam.transform.rotation.x || 0
      camRotY = activeCam.transform.rotation.y || 0
      camRotZ = activeCam.transform.rotation.z || 0
    }

    const radX = -camRotX * Math.PI / 180
    const radY = -camRotY * Math.PI / 180
    const radZ = -camRotZ * Math.PI / 180

    const focalLength = this.focalLength
    const result: LveObject[] = []
    const modelMat = new Mat4()

    const pointInPoly = (px: number, py: number, poly: { x: number, y: number }[]) => {
      let inside = false
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y
        const xj = poly[j].x, yj = poly[j].y
        const intersect = ((yi > py) !== (yj > py))
          && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)
        if (intersect) inside = !inside
      }
      return inside
    }

    // z 기준 내림차순 정렬을 위해 모든 변환 사전 계산 (상단 객체 우선 판정)
    // OGL 행렬은 열우선이므로 obj._worldMatrix의 [12, 13, 14]가 월드 좌표(x, y, z)입니다.
    const objectsData = Array.from(this.objects)
      .filter(obj => obj.attribute.type !== 'camera' && obj.style.display !== 'none' && obj.style.pointerEvents)
      .map(obj => {
        const mat = obj._worldMatrix as unknown as Float32Array
        // Lve4와 OpenGL 좌표계 연결 과정에서 역방향된 z를 본래 양수 스케일로 복원 (-1 곱함)
        const wx = mat[12], wy = mat[13], wz = -mat[14]

        let dx = wx - camX
        let dy = wy - camY
        let dz = wz - camZ

        if (radY !== 0) {
          const cosY = Math.cos(radY), sinY = Math.sin(radY)
          const nx = dx * cosY + dz * sinY
          const nz = -dx * sinY + dz * cosY
          dx = nx; dz = nz
        }
        if (radX !== 0) {
          const cosX = Math.cos(radX), sinX = Math.sin(radX)
          const ny = dy * cosX - dz * sinX
          const nz = dy * sinX + dz * cosX
          dy = ny; dz = nz
        }
        if (radZ !== 0) {
          const cosZ = Math.cos(radZ), sinZ = Math.sin(radZ)
          const nx = dx * cosZ - dy * sinZ
          const ny = dx * sinZ + dy * cosZ
          dx = nx; dy = ny
        }
        return { obj, dx, dy, dz }
      })
      .filter(data => data.dz >= 0)
      .filter(data => {
        // 1차 고속 필터링: Bounding Box (AABB) 기반 Early Exit
        const perspectiveScale = data.dz === 0 ? 1 : focalLength / data.dz
        const screenX = data.dx * perspectiveScale
        const screenY = data.dy * perspectiveScale

        // 실제 크기가 아직 0이면(예: 이미지 로드 전) 무조건 패스
        const baseW = data.obj._renderedSize?.w ?? data.obj.style.width ?? 100
        const baseH = data.obj._renderedSize?.h ?? data.obj.style.height ?? 100
        const w = baseW * perspectiveScale * Math.abs(data.obj.transform.scale.x)
        const h = baseH * perspectiveScale * Math.abs(data.obj.transform.scale.y)

        // 회전 및 피벗을 모두 커버하는 넉넉한 충돌 안전 반경 (대각선 근사치 w + h)
        // 화면 위치(screenX, screenY)에서 마우스가 이 반경을 벗어나면 절대 충돌할 수 없음
        const safeRadius = w + h
        if (Math.abs(mouseX - screenX) > safeRadius || Math.abs(mouseY - screenY) > safeRadius) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        const zdiff = b.dz - a.dz
        return zdiff !== 0 ? zdiff : a.obj.style.zIndex - b.obj.style.zIndex
      })

    for (const { obj, dx, dy, dz } of objectsData) {
      const { transform, style } = obj
      const perspectiveScale = dz === 0 ? 1 : focalLength / dz

      const screenX = dx * perspectiveScale
      const screenY = dy * perspectiveScale

      const baseW = obj._renderedSize?.w ?? style.width ?? 0
      const baseH = obj._renderedSize?.h ?? style.height ?? 0
      const w = baseW * perspectiveScale * transform.scale.x
      const h = baseH * perspectiveScale * transform.scale.y

      if (w <= 0 || h <= 0) continue

      modelMat.identity()
      modelMat.translate(new OglVec3(screenX, screenY, 0))

      if (camRotY) modelMat.rotate(-camRotY * Math.PI / 180, AXIS_Y)
      if (camRotX) modelMat.rotate(-camRotX * Math.PI / 180, AXIS_X)
      if (camRotZ) modelMat.rotate(-camRotZ * Math.PI / 180, AXIS_Z)

      const rot = transform.rotation
      if (rot.z) modelMat.rotate(rot.z * Math.PI / 180, AXIS_Z)
      if (rot.y) modelMat.rotate(rot.y * Math.PI / 180, AXIS_Y)
      if (rot.x) modelMat.rotate(rot.x * Math.PI / 180, AXIS_X)

      const pivot = transform.pivot
      modelMat.translate(new OglVec3(
        (0.5 - pivot.x) * w,
        -(0.5 - pivot.y) * h,
        0
      ))
      modelMat.scale(new OglVec3(w, h, 1))

      const m = modelMat as unknown as Float32Array
      // Quad 꼭짓점 투영 (-0.5 ~ +0.5)
      const getPt = (px: number, py: number) => ({
        x: m[0] * px + m[4] * py + m[12],
        y: m[1] * px + m[5] * py + m[13]
      })
      const corners = [
        getPt(-0.5, -0.5), getPt(0.5, -0.5),
        getPt(0.5, 0.5), getPt(-0.5, 0.5)
      ]

      if (pointInPoly(mouseX, mouseY, corners)) {
        result.push(obj)
      }
    }

    return result
  }

  /**
   * 월드의 중력을 설정합니다.
   */
  setGravity(g: { x: number; y: number }) {
    this.physics.setGravity(g.x, g.y)
  }

  /**
   * 월드의 활성 카메라 객체를 반환합니다. 
   */
  get camera(): LveObject | null {
    return this._activeCamera
  }

  /**
   * 월드의 카메라를 특정 객체로 지정합니다. 카메라 객체만 지정할 수 있습니다.
   * `null`을 할당하면 기본 동작으로 돌아갑니다.
   */
  set camera(camera: LveObject | null) {
    if (camera !== null && camera.attribute.type !== 'camera') {
      throw new Error('The assigned object must be of camera type.');
    }
    this._activeCamera = camera
  }

  /**
   * CSS querySelector와 유사한 방식으로 오브젝트를 선택합니다.
   * 지원 셀렉터: `.className`, `#id`, `[attribute=value]`
   */
  select(query: string): LveObject[] {
    const all = Array.from(this.objects)
    if (query.startsWith('.')) {
      const cls = query.slice(1)
      return all.filter(o => o.attribute.className.split(' ').includes(cls))
    }
    if (query.startsWith('#')) {
      const id = query.slice(1)
      return all.filter(o => o.attribute.id === id)
    }
    const attrMatch = query.match(/^\[(.+)=(.+)\]$/)
    if (attrMatch) {
      const key = attrMatch[1]
      const value = attrMatch[2]
      return all.filter(o => o.attribute[key as keyof Attribute] === value)
    }
    return []
  }

  /**
   * 에셋 로더를 생성합니다. 로드 완료 시 World 내부 에셋 맵에 자동으로 병합됩니다.
   * @deprecated world.loader를 직접 사용하십시오.
   */
  createLoader(): Loader {
    return this.loader
  }

  /**
   * 캔버스의 x, y 좌표(0 ~ width, 0 ~ height)를 현재 카메라 기준의 월드 좌표로 변환합니다.
   * @param x 캔버스 좌측 상단을 0으로 하는 x 좌표
   * @param y 캔버스 좌측 상단을 0으로 하는 y 좌표
   * @param targetZ (선택) 투영하고자 하는 월드 공간의 Z 좌표. 기본값은 0 입니다.
   */
  canvasToWorld(x: number, y: number, targetZ: number = 0): { x: number; y: number; z: number } {
    const canvas = this._canvas
    if (!canvas) return { x: 0, y: 0, z: 0 }

    const screenX = x - canvas.width / 2
    const screenY = -(y - canvas.height / 2)

    let camX = 0, camY = 0, camZ = 0
    let rotX = 0, rotY = 0, rotZ = 0
    const activeCam = this.camera

    if (activeCam) {
      camX = activeCam.transform.position.x
      camY = activeCam.transform.position.y
      camZ = activeCam.transform.position.z

      rotX = activeCam.transform.rotation.x || 0
      rotY = activeCam.transform.rotation.y || 0
      rotZ = activeCam.transform.rotation.z || 0
    }

    const targetDepth = targetZ - camZ
    const scale = targetDepth / this.focalLength
    let dx = screenX * scale
    let dy = screenY * scale
    let dz = targetDepth

    if (activeCam) {
      const radZ = rotZ * Math.PI / 180
      const radX = rotX * Math.PI / 180
      const radY = rotY * Math.PI / 180

      if (radZ !== 0) {
        const c = Math.cos(radZ), s = Math.sin(radZ)
        const nx = dx * c - dy * s
        const ny = dx * s + dy * c
        dx = nx; dy = ny
      }
      if (radX !== 0) {
        const c = Math.cos(radX), s = Math.sin(radX)
        const ny = dy * c - dz * s
        const nz = dy * s + dz * c
        dy = ny; dz = nz
      }
      if (radY !== 0) {
        const c = Math.cos(radY), s = Math.sin(radY)
        const nx = dx * c + dz * s
        const nz = -dx * s + dz * c
        dx = nx; dz = nz
      }
    }

    return {
      x: camX + dx,
      y: camY + dy,
      z: camZ + dz
    }
  }

  /**
   * currentZ를 현재 카메라의 Z 좌표라고 가정할 때,
   * targetZ 깊이에 있는 대상이 화면에서 value 크기만큼 보이려면
   * 실제 값이 얼마가 되어야 하는지 원근 비율을 수학적으로 계산해 반환합니다.
   * @param currentZ 카메라의 Z 좌표
   * @param targetZ 목표 Z 좌표
   * @param value 기준 크기 (화면에 보여질 목표 크기)
   */
  calcDepthRatio(currentZ: number, targetZ: number, value: number): number {
    const depth = targetZ - currentZ
    const scale = depth === 0 ? 1 : this.focalLength / depth

    if (scale === 0) return value

    return value / scale
  }

  // ─── Object 생성 ─────────────────────────────────────────

  createCamera(options?: LveObjectOptions): Camera {
    const cam = new Camera(options)
    if (options?.transform?.position?.z === undefined) {
      cam.transform.position.z = -this.focalLength
    }
    this.objects.add(cam)
    this._tryAddPhysics(cam)
    this.renderer.markSortDirty()
    return cam
  }

  createRectangle(options?: RectangleOptions): Rectangle {
    const rect = new Rectangle(options)
    this.objects.add(rect)
    this._tryAddPhysics(rect, options?.style?.width, options?.style?.height)
    this._trackSortDirty(rect)
    this.renderer.markSortDirty()
    return rect
  }

  createEllipse(options?: LveObjectOptions): Ellipse {
    const el = new Ellipse(options)
    this.objects.add(el)
    this._tryAddPhysics(el, options?.style?.width, options?.style?.height)
    this._trackSortDirty(el)
    this.renderer.markSortDirty()
    return el
  }

  createText(options?: LveObjectOptions): Text {
    const text = new Text(options)
    this.objects.add(text)
    this._trackSortDirty(text)
    this.renderer.markSortDirty()
    return text
  }

  createImage(options?: LveObjectOptions): LveImage {
    const img = new LveImage(options)
    this.objects.add(img)
    this._trackSortDirty(img)
    this.renderer.markSortDirty()
    return img
  }

  createVideo(options?: LveObjectOptions): LveVideo {
    const video = new LveVideo(options)
    video.setManager(this.videoManager)
    this.objects.add(video)
    this._trackSortDirty(video)
    this.renderer.markSortDirty()
    return video
  }

  createSprite(options?: LveObjectOptions): Sprite {
    const sprite = new Sprite(options)
    sprite.setManager(this.spriteManager)
    this.objects.add(sprite)
    this._trackSortDirty(sprite)
    this.renderer.markSortDirty()
    return sprite
  }

  createParticle(options?: ParticleOptions): Particle {
    const particle = new Particle(options)
    particle.setPhysics(this.physics)
    particle.setManager(this.particleManager)
    this.objects.add(particle)
    this._trackSortDirty(particle)
    this.renderer.markSortDirty()
    return particle
  }

  removeObject(obj: LveObject) {
    this.physics.removeBody(obj)
    this.objects.delete(obj)
    this.renderer.markSortDirty()
  }

  start() {
    if (this.rafId !== null) return
    let prevTime = 0

    const loop = (timestamp: number) => {
      if (prevTime !== 0) {
        this.physics.step(timestamp)
      }
      prevTime = timestamp

      // 렌더링 전 모든 루트 객체(부모 없는 객체)와 카메라의 월드 매트릭스를 계층 구조에 맞게 최신화
      for (const obj of this.objects) {
        if (!obj.parent) {
          obj.updateMatrixWorld()
        }
      }

      this.renderer.render(this.objects, this._assets, timestamp, this.camera)
      // 렌더 후 실제 크기가 확정되면 물리 바디 크기를 동기화
      this.physics.syncObjectSizes(this.objects)
      this.rafId = requestAnimationFrame(loop)
    }

    this.rafId = requestAnimationFrame(loop)
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  /**
   * 객체의 Z 좌표 또는 zIndex 변경 시 Z-Sort 캐시를 무효화합니다.
   */
  private _trackSortDirty(obj: LveObject) {
    obj.on('positionmodified', (axis: string) => {
      if (axis === 'z') this.renderer.markSortDirty()
    })
    obj.on('cssmodified', (key: string) => {
      if (key === 'zIndex') this.renderer.markSortDirty()
    })
  }

  private _tryAddPhysics(obj: LveObject, w?: number, h?: number) {
    if (!obj.attribute.physics) return

    this.physics.addBody(obj, w ?? 32, h ?? 32)

    // 크기에 영향을 주는 속성 변경 시 물리 바디를 재생성합니다.
    const resizeBody = () => {
      const sw = (obj.style.width ?? w ?? 32) * obj.transform.scale.x
      const sh = (obj.style.height ?? h ?? 32) * obj.transform.scale.y
      this.physics.updateBodySize(obj, sw, sh)
    }

    const CSS_RESIZE_KEYS = new Set(['width', 'height', 'borderWidth', 'margin'])
    obj.on('cssmodified', (key) => {
      if (CSS_RESIZE_KEYS.has(key)) resizeBody()
    })
    obj.on('scalemodified', () => resizeBody())
  }
}
