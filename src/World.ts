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
import type { LveObjectOptions, LoadedAssets } from './types.js'
import type { RectangleOptions } from './objects/Rectangle.js'
import { Renderer } from './Renderer.js'
import { EventEmitter } from './EventEmitter.js'

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

export class World extends EventEmitter {
  private renderer: Renderer
  private objects: Set<LveObject> = new Set()
  private rafId: number | null = null
  private physics: PhysicsEngine = new PhysicsEngine()
  private _canvas: HTMLCanvasElement | null = null
  /** mouseover 상태 추적 (객체 id → boolean) */
  private _mouseOver: Set<string> = new Set()

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

  constructor(canvas?: HTMLCanvasElement) {
    super()
    const canvasEl = canvas ?? this.createCanvas()
    this._canvas = canvasEl
    this.renderer = new Renderer(canvasEl)
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
   * 화면좌표 기준으로 마우스 위치에 갹쳐지는 객체를 반환합니다. (AABB hit-test)
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

    // 카메라 위치
    let camX = 0
    let camY = 0
    let camZ = 0
    for (const obj of this.objects) {
      if (obj.attribute.type === 'camera') {
        camX = obj.transform.position.x
        camY = obj.transform.position.y
        camZ = obj.transform.position.z
        break
      }
    }

    const focalLength = 500
    const result: LveObject[] = []

    for (const obj of this.objects) {
      if (obj.attribute.type === 'camera') continue
      if (obj.style.display === 'none') continue
      if (!obj.style.pointerEvents) continue

      const { transform, style } = obj
      const depth = transform.position.z - camZ
      if (depth < 0) continue

      const perspectiveScale = depth === 0 ? 1 : focalLength / depth
      const screenX = (transform.position.x - camX) * perspectiveScale * transform.scale.x
      const screenY = (transform.position.y - camY) * perspectiveScale * transform.scale.y
      const hw = ((style.width ?? 0) * perspectiveScale * transform.scale.x) / 2
      const hh = ((style.height ?? 0) * perspectiveScale * transform.scale.y) / 2

      if (hw <= 0 || hh <= 0) continue

      if (
        mouseX >= screenX - hw && mouseX <= screenX + hw &&
        mouseY >= screenY - hh && mouseY <= screenY + hh
      ) {
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
   * CSS querySelector와 유사한 방식으로 오브젝트를 선택합니다.
   * 지원 셀렉터: `.className`, `#id`, `[name=xxx]`, 타입 문자열
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
    const nameMatch = query.match(/^\[name=(.+)\]$/)
    if (nameMatch) {
      return all.filter(o => o.attribute.name === nameMatch[1])
    }
    return all.filter(o => o.attribute.type === query)
  }

  /**
   * 에셋 로더를 생성합니다. 로드 완료 시 World 내부 에셋 맵에 자동으로 병합됩니다.
   * @deprecated world.loader를 직접 사용하십시오.
   */
  createLoader(): Loader {
    return this.loader
  }

  // ─── Object 생성 ─────────────────────────────────────────

  createCamera(options?: LveObjectOptions): Camera {
    const cam = new Camera(options)
    this.objects.add(cam)
    this._tryAddPhysics(cam)
    return cam
  }

  createRectangle(options?: RectangleOptions): Rectangle {
    const rect = new Rectangle(options)
    this.objects.add(rect)
    this._tryAddPhysics(rect, options?.style?.width, options?.style?.height)
    return rect
  }

  createEllipse(options?: LveObjectOptions): Ellipse {
    const el = new Ellipse(options)
    this.objects.add(el)
    this._tryAddPhysics(el, options?.style?.width, options?.style?.height)
    return el
  }

  createText(options?: LveObjectOptions): Text {
    const text = new Text(options)
    this.objects.add(text)
    return text
  }

  createImage(options?: LveObjectOptions): LveImage {
    const img = new LveImage(options)
    this.objects.add(img)
    return img
  }

  createVideo(options?: LveObjectOptions): LveVideo {
    const video = new LveVideo(options)
    video.setManager(this.videoManager)
    this.objects.add(video)
    return video
  }

  createSprite(options?: LveObjectOptions): Sprite {
    const sprite = new Sprite(options)
    sprite.setManager(this.spriteManager)
    this.objects.add(sprite)
    return sprite
  }

  createParticle(options?: ParticleOptions): Particle {
    const particle = new Particle(options)
    particle.setPhysics(this.physics)
    particle.setManager(this.particleManager)
    this.objects.add(particle)
    return particle
  }

  removeObject(obj: LveObject) {
    this.physics.removeBody(obj)
    this.objects.delete(obj)
  }

  start() {
    if (this.rafId !== null) return
    let prevTime = 0

    const loop = (timestamp: number) => {
      if (prevTime !== 0) {
        this.physics.step(timestamp)
      }
      prevTime = timestamp

      this.renderer.render(this.objects, this._assets, timestamp)
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

  private _tryAddPhysics(obj: LveObject, w?: number, h?: number) {
    if (obj.attribute.physics) {
      this.physics.addBody(obj, w ?? 32, h ?? 32)
    }
  }
}
