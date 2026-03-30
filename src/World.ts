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

export class World {
  private renderer: Renderer
  private objects: Set<LveObject> = new Set()
  private rafId: number | null = null
  private physics: PhysicsEngine = new PhysicsEngine()

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
    const canvasEl = canvas ?? this.createCanvas()
    this.renderer = new Renderer(canvasEl)
    this.loader = new Loader()
    this.loader.on('complete', ({ assets }) => {
      Object.assign(this._assets, assets)
    })
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
