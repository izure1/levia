/**
 * Visualnovel.ts — Typed Visual Novel scene manager
 *
 * Usage:
 *   const vn = Visualnovel.create()
 *     .defineCharacter({
 *       heroine: { images: { normal: 'girl_normal', happy: 'girl_happy' }, focusPoint: { x: 0.5, y: 0.2 } }
 *     })
 *     .defineBackground({
 *       library: { src: 'bg_library', parallax: true },
 *       rooftop: { src: 'bg_rooftop', parallax: false }
 *     })
 *     .build(world, { width: 800, height: 600, depth: 500 })
 *
 *   vn.showCharacter('heroine', 'center', 'normal')
 *   vn.setBackground('library', 'cover', 1000)
 */

import type { World, LveObject, EasingType } from '../src'
import type { ParticleOptions } from '../src/objects/Particle'
import type { RectangleOptions } from '../src/objects/Rectangle'

// =============================================================
// Public Types
// =============================================================

export interface VisualnovelOption {
  width: number
  height: number
  depth: number
}

/** Image variant map: imageKey → asset src */
export type CharImages = Record<string, string>

/** Single character definition */
export interface CharDef {
  images: CharImages
  /** Focus point (0~1 normalized). x: left→right, y: top→bottom. Default { x:0.5, y:0.5 } */
  focusPoint?: { x: number, y: number }
}

/** Single background definition */
export interface BgDef {
  src: string
  /**
   * Parallax mode. Default: true
   * - true : placed at world Z-depth, extra padding for camera movement
   * - false: attached as camera child (always screen-fixed)
   */
  parallax?: boolean
}

export type CharDefs = Record<string, CharDef>
export type BgDefs = Record<string, BgDef>

export type ZoomPreset = 'close-up' | 'medium' | 'wide' | 'reset'
export type PanPreset = 'left' | 'right' | 'up' | 'down' | 'center'
export type ShakePreset = 'light' | 'normal' | 'heavy' | 'earthquake'
export type CharacterPositionPreset = 'far-left' | 'left' | 'center' | 'right' | 'far-right' | string
export type BackgroundFitPreset = 'stretch' | 'contain' | 'cover'
export type FadeColorPreset = 'black' | 'white' | 'red' | 'dream' | 'sepia'
export type FlashPreset = 'white' | 'red' | 'yellow'
export type WipePreset = 'left' | 'right' | 'up' | 'down'
export type MoodType = 'day' | 'night' | 'sunset' | 'foggy' | 'sepia' | 'cold' | 'noir' | 'none'
export type LightPreset = 'spot' | 'ambient' | 'warm' | 'cold'
export type FlickerPreset = 'candle' | 'flicker' | 'strobe'
export type OverlayPreset = 'caption' | 'title' | 'whisper'
export type EffectType = 'dust' | 'rain' | 'snow' | 'sakura' | 'sparkle' | 'fog' | 'leaves' | 'fireflies'

// =============================================================
// Preset Lookup Tables
// =============================================================

const CHARACTER_X_RATIO: Record<string, number> = {
  'far-left': 0.1,
  'left': 0.25,
  'center': 0.5,
  'right': 0.75,
  'far-right': 0.9
}

const ZOOM_PRESETS: Record<ZoomPreset, { scale: number, duration: number }> = {
  'close-up': { scale: 1.5, duration: 800 },
  'medium': { scale: 1.2, duration: 600 },
  'wide': { scale: 0.8, duration: 800 },
  'reset': { scale: 1.0, duration: 600 }
}

const PAN_PRESETS: Record<PanPreset, { x: number, y: number, duration: number }> = {
  left: { x: -200, y: 0, duration: 1000 },
  right: { x: 200, y: 0, duration: 1000 },
  up: { x: 0, y: 200, duration: 1000 },
  down: { x: 0, y: -200, duration: 1000 },
  center: { x: 0, y: 0, duration: 1000 }
}

const SHAKE_PRESETS: Record<ShakePreset, { intensity: number, duration: number }> = {
  light: { intensity: 5, duration: 300 },
  normal: { intensity: 10, duration: 500 },
  heavy: { intensity: 20, duration: 800 },
  earthquake: { intensity: 50, duration: 2000 }
}

const FADE_PRESETS: Record<FadeColorPreset, { color: string, easing: EasingType }> = {
  black: { color: 'rgba(0,0,0,1)', easing: 'linear' },
  white: { color: 'rgba(255,255,255,1)', easing: 'linear' },
  red: { color: 'rgba(200,0,0,1)', easing: 'easeIn' },
  dream: { color: 'rgba(200,180,255,1)', easing: 'easeInOut' },
  sepia: { color: 'rgba(150,100,50,1)', easing: 'easeIn' }
}

const FLASH_PRESETS: Record<FlashPreset, { color: string, duration: number }> = {
  white: { color: 'rgba(255,255,255,1)', duration: 300 },
  red: { color: 'rgba(255,0,0,1)', duration: 300 },
  yellow: { color: 'rgba(255,220,0,1)', duration: 250 }
}

const WIPE_PRESETS: Record<WipePreset, { x: number, y: number }> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 }
}

const MOOD_PRESETS: Record<MoodType, { color: string, vignette?: string, blendMode?: string }> = {
  day: { color: 'rgba(255,220,120,0.08)' },
  night: { color: 'rgba(0,20,80,0.55)', vignette: 'rgba(0,0,50,0.6)', blendMode: 'multiply' },
  sunset: { color: 'rgba(255,100,40,0.35)', vignette: 'rgba(150,40,0,0.4)' },
  foggy: { color: 'rgba(200,210,220,0.4)', vignette: 'rgba(180,190,200,0.3)', blendMode: 'screen' },
  sepia: { color: 'rgba(160,120,60,0.35)', vignette: 'rgba(100,70,30,0.3)', blendMode: 'multiply' },
  cold: { color: 'rgba(80,120,200,0.25)', vignette: 'rgba(40,60,150,0.2)', blendMode: 'screen' },
  noir: { color: 'rgba(0,0,0,0.5)', vignette: 'rgba(0,0,0,0.6)', blendMode: 'multiply' },
  none: { color: 'transparent' }
}

const LIGHT_PRESETS: Record<LightPreset, { color: string, opacity: number }> = {
  spot: { color: 'radial-gradient(circle,rgba(255,240,180,0.8) 0%,transparent 70%)', opacity: 0.6 },
  ambient: { color: 'rgba(255,230,150,1)', opacity: 0.15 },
  warm: { color: 'rgba(255,160,50,1)', opacity: 0.25 },
  cold: { color: 'rgba(100,160,255,1)', opacity: 0.2 }
}

const OVERLAY_PRESETS: Record<OverlayPreset, { fontSize: number, color: string, opacity: number, zIndex: number, y: 'top' | 'center' | 'bottom' }> = {
  caption: { fontSize: 24, color: '#ffffff', opacity: 1, zIndex: 1000, y: 'bottom' },
  title: { fontSize: 48, color: '#ffffff', opacity: 1, zIndex: 1001, y: 'center' },
  whisper: { fontSize: 18, color: '#cccccc', opacity: 0.7, zIndex: 999, y: 'bottom' }
}

const EFFECT_PRESETS: Record<EffectType, Partial<ParticleOptions>> = {
  dust: { attribute: { src: 'dust' }, style: { width: 4, height: 4, opacity: 0.5, color: '#cccccc' } },
  rain: { attribute: { src: 'rain' }, style: { width: 2, height: 12, opacity: 0.6, color: '#aaccff' } },
  snow: { attribute: { src: 'snow' }, style: { width: 8, height: 8, opacity: 0.8, color: '#ffffff' } },
  sakura: { attribute: { src: 'sakura' }, style: { width: 12, height: 12, opacity: 0.9, color: '#ffaacc' } },
  sparkle: { attribute: { src: 'sparkle' }, style: { width: 6, height: 6, opacity: 0.9, color: '#ffffaa' } },
  fog: { attribute: { src: 'fog' }, style: { width: 80, height: 40, opacity: 0.3, color: '#aabbcc' } },
  leaves: { attribute: { src: 'leaves' }, style: { width: 14, height: 14, opacity: 0.85, color: '#88bb44' } },
  fireflies: { attribute: { src: 'fireflies' }, style: { width: 6, height: 6, opacity: 0.9, color: '#aaffaa' } }
}

const EFFECT_CLIP_PRESETS: Record<EffectType, object> = {
  dust: { gravity: -0.01, velocityY: -0.5, velocityX: 0.3, velocityZ: 0, lifespan: 300 },
  rain: { gravity: 0.3, velocityY: -8, velocityX: -1, velocityZ: 0, lifespan: 80 },
  snow: { gravity: 0.02, velocityY: -1, velocityX: 0.2, velocityZ: 0, lifespan: 400 },
  sakura: { gravity: 0.01, velocityY: -0.8, velocityX: 0.5, velocityZ: 0.1, lifespan: 500 },
  sparkle: { gravity: -0.02, velocityY: -0.5, velocityX: 0.1, velocityZ: 0, lifespan: 120 },
  fog: { gravity: 0, velocityY: 0, velocityX: 0.1, velocityZ: 0, lifespan: 600 },
  leaves: { gravity: 0.02, velocityY: -0.6, velocityX: 0.4, velocityZ: 0.1, lifespan: 450 },
  fireflies: { gravity: -0.01, velocityY: 0.2, velocityX: 0.1, velocityZ: 0, lifespan: 350 }
}

const DEFAULT_RATES: Partial<Record<EffectType, number>> = {
  dust: 5, rain: 40, snow: 15, sakura: 8, sparkle: 12, fog: 3, leaves: 6, fireflies: 4
}

// =============================================================
// VisualnovelBuilder
// =============================================================

/**
 * Typed builder that accumulates character/background definitions
 * and constructs a fully-typed Visualnovel instance.
 */
export class VisualnovelBuilder<
  TC extends CharDefs = Record<never, never>,
  TB extends BgDefs = Record<never, never>
> {
  private readonly _c: TC
  private readonly _b: TB

  constructor(c: TC, b: TB) {
    this._c = c
    this._b = b
  }

  /**
   * Define character assets. Keys become type-safe identifiers.
   * @example
   * .defineCharacter({
   *   heroine: { images: { normal: 'girl_normal', happy: 'girl_happy' }, focusPoint: { x:0.5, y:0.2 } }
   * })
   */
  defineCharacter<C extends CharDefs>(defs: C): VisualnovelBuilder<C, TB> {
    return new VisualnovelBuilder(defs, this._b)
  }

  /**
   * Define backgrounds. Keys become type-safe identifiers.
   * @example
   * .defineBackground({
   *   library: { src: 'bg_library', parallax: true },
   *   rooftop: { src: 'bg_roof',    parallax: false }
   * })
   */
  defineBackground<B extends BgDefs>(defs: B): VisualnovelBuilder<TC, B> {
    return new VisualnovelBuilder(this._c, defs)
  }

  /** Instantiate the Visualnovel engine. */
  build(world: World, option: VisualnovelOption): Visualnovel<TC, TB> {
    return new Visualnovel(world, option, this._c, this._b)
  }
}

// =============================================================
// Visualnovel (generic)
// =============================================================

export class Visualnovel<
  TC extends CharDefs = Record<never, never>,
  TB extends BgDefs = Record<never, never>
> {
  protected readonly world: World
  protected readonly width: number
  protected readonly height: number
  protected readonly depth: number
  /** Max camera X displacement (world units). Used to calculate background padding. */
  protected readonly maxCameraX: number
  /** Max camera Y displacement (world units). Used to calculate background padding. */
  protected readonly maxCameraY: number

  private readonly _charDefs: TC
  private readonly _bgDefs: TB

  private _objects: Set<LveObject> = new Set()
  private _characters: Map<string, LveObject> = new Map()
  private _effects: Map<string, LveObject> = new Map()
  private _backgroundObj: LveObject | null = null
  private _backgroundIsParallax: boolean = true
  private _moodObj: LveObject | null = null
  private _transitionObj: LveObject | null = null
  private _overlayObjs: Map<string, LveObject> = new Map()
  private _lightObjs: Map<string, LveObject> = new Map()
  private _flickerObj: LveObject | null = null
  private _initialCamZ: number = 0

  // -----------------------------------------------------------
  // Static entry point
  // -----------------------------------------------------------

  /** Returns a new builder. */
  static create(): VisualnovelBuilder {
    return new VisualnovelBuilder(
      {} as Record<never, never>,
      {} as Record<never, never>
    )
  }

  // -----------------------------------------------------------
  // Constructor (internal; use Visualnovel.create()...build())
  // -----------------------------------------------------------

  constructor(world: World, option: VisualnovelOption, charDefs: TC, bgDefs: TB) {
    this.world = world
    this.width = option.width
    this.height = option.height
    this.depth = option.depth
    this._charDefs = charDefs
    this._bgDefs = bgDefs

    if (!this.world.camera) {
      this.world.camera = this.world.createCamera()
    }
    this._initialCamZ = this.world.camera!.transform.position.z

    // Compute maxCamera values based on actual scene geometry
    // (engine focal=100 → objects at depth/2 have much larger world units than canvas pixels)
    const cam = this.world.camera as any
    const calcRatio = typeof cam?.calcDepthRatio === 'function'
      ? (z: number, s: number) => cam.calcDepthRatio(z, s) as number
      : (_z: number, s: number) => s
    const charW = calcRatio(this.depth / 2, 500)
    this.maxCameraX = Math.ceil(this.width * 0.4 + charW * 0.5)
    this.maxCameraY = Math.ceil(charW * 1.0 + this.height * 0.1)
  }

  // -----------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------

  private get _characterPlaneLocalZ(): number {
    const cam = this.world.camera
    if (!cam) return this.depth / 2
    return (this.depth / 2) - cam.transform.position.z
  }

  /**
   * Resolve a position string to a 0~1 x-ratio.
   * 1) Preset name lookup
   * 2) "n/m" fraction → xRatio = n / (m+1)
   * 3) Fallback 0.5
   */
  private _resolvePositionX(position: string): number {
    if (CHARACTER_X_RATIO[position] !== undefined) return CHARACTER_X_RATIO[position]
    const m = position.match(/^(\d+)\/(\d+)$/)
    if (m) {
      const n = parseInt(m[1], 10)
      const d = parseInt(m[2], 10)
      if (d > 0) return n / (d + 1)
    }
    return 0.5
  }

  private _track<T extends LveObject>(obj: T): T {
    this._objects.add(obj)
    return obj
  }

  private _getTransitionRect(color: string): LveObject {
    if (!this._transitionObj) {
      const w = this.world.canvas ? Math.max((this.world.canvas as any).width, this.width) : this.width
      const h = this.world.canvas ? Math.max((this.world.canvas as any).height, this.height) : this.height
      const rect = this.world.createRectangle({
        style: { color, width: w * 2, height: h * 2, opacity: 0, zIndex: 9999, pointerEvents: false },
        transform: { position: { x: 0, y: 0, z: 100 } }
      })
      this.world.camera?.addChild(rect)
      this._transitionObj = rect
    } else {
      this._transitionObj.style.color = color
      this._transitionObj.transform.position.x = 0
      this._transitionObj.transform.position.y = 0
    }
    return this._transitionObj
  }

  // -----------------------------------------------------------
  // Scene management
  // -----------------------------------------------------------

  /** Remove all scene objects (characters, effects, background, mood, overlays, lights). */
  clear(): this {
    this._objects.forEach(obj => obj.remove())
    this._objects.clear()
    this._characters.clear()
    this._effects.clear()
    this._backgroundObj = null
    if (this._moodObj) { this._moodObj.remove(); this._moodObj = null }
    this._overlayObjs.forEach(obj => obj.remove()); this._overlayObjs.clear()
    this._lightObjs.forEach(obj => obj.remove()); this._lightObjs.clear()
    this._flickerObj = null
    return this
  }

  // -----------------------------------------------------------
  // Environment effects
  // -----------------------------------------------------------

  /**
   * Add a particle effect. The effect type is also its identifier (one per type).
   * @param type   Effect preset name
   * @param rate   Particles per interval
   * @param overrides Fine-grained option overrides
   */
  addEffect(type: EffectType = 'dust', rate?: number, overrides?: Partial<ParticleOptions>): this {
    const preset = EFFECT_PRESETS[type] ?? EFFECT_PRESETS.dust
    const finalRate = rate ?? DEFAULT_RATES[type] ?? 10

    if (this._effects.has(type)) this.removeEffect(type)

    const clipName = `${type}_rate_${finalRate}`
    if (!this.world.particleManager.get(clipName)) {
      const clipBase = EFFECT_CLIP_PRESETS[type] ?? EFFECT_CLIP_PRESETS.dust
      const customSrc = overrides?.attribute?.src ?? (preset.attribute as any)?.src ?? type
      this.world.particleManager.create({
        name: clipName, src: customSrc,
        ...(clipBase as any),
        rate: finalRate,
        spawnX: this.width * 2,
        spawnY: this.height * 2,
        spawnZ: this.depth
      })
    }

    const particle = this._track(this.world.createParticle({
      attribute: { ...(preset.attribute as any), src: clipName, ...overrides?.attribute },
      style: { ...(preset.style as any), ...overrides?.style },
      transform: { position: { x: 0, y: 0, z: 0 }, ...overrides?.transform },
      ...(overrides as any)
    }))
    this._effects.set(type, particle)
    particle.play()
    return this
  }

  /** Remove a particle effect. */
  removeEffect(type: EffectType, duration: number = 600): this {
    const effect = this._effects.get(type)
    if (effect) {
      this._effects.delete(type)
      if (duration > 0 && typeof effect.fadeOut === 'function') {
        effect.fadeOut(duration)
        setTimeout(() => { effect.remove(); this._objects.delete(effect) }, duration)
      } else {
        effect.remove(); this._objects.delete(effect)
      }
    }
    return this
  }

  // -----------------------------------------------------------
  // Background
  // -----------------------------------------------------------

  /**
   * Set the background using a key from defineBackground.
   * @param key       Background key (type-safe)
   * @param fit       Fit mode
   * @param duration  Crossfade duration (0 = instant)
   * @param isVideo   Treat src as video
   */
  setBackground<K extends keyof TB & string>(
    key: K,
    fit: BackgroundFitPreset = 'stretch',
    duration: number = 1000,
    isVideo: boolean = false,
    overrides?: any
  ): this {
    const def = this._bgDefs[key]
    if (!def) return this

    const finalSrc = def.src
    const useParallax = def.parallax ?? true

    // Same parallax mode → crossfade in place
    if (this._backgroundObj && duration > 0
      && this._backgroundIsParallax === useParallax
      && typeof (this._backgroundObj as any).transition === 'function') {
      ; (this._backgroundObj as any).transition(finalSrc, duration)
      return this
    }

    if (this._backgroundObj) {
      this._backgroundObj.remove()
      this._objects.delete(this._backgroundObj)
      this._backgroundObj = null
    }

    this._backgroundIsParallax = useParallax
    const cam = this.world.camera as any
    const aspectRatio = this.width / this.height

    if (useParallax) {
      let baseW = this.width, baseH = this.height
      if (fit === 'contain') baseH = baseW / aspectRatio
      else if (fit === 'cover') baseW = baseH * aspectRatio

      const bgZ = overrides?.transform?.position?.z ?? this.depth
      let finalW = baseW, finalH = baseH
      if (cam && typeof cam.calcDepthRatio === 'function') {
        finalW = cam.calcDepthRatio(bgZ, baseW) + 2 * this.maxCameraX
        finalH = cam.calcDepthRatio(bgZ, baseH) + 2 * this.maxCameraY
      }

      const opts = {
        attribute: { src: finalSrc, ...overrides?.attribute },
        style: { width: finalW, height: finalH, zIndex: -1, ...overrides?.style },
        transform: { position: { x: 0, y: 0, z: bgZ }, ...overrides?.transform },
        ...overrides
      }
      const bg = isVideo
        ? (() => { const v = this.world.createVideo(opts as any); v.play(); return v })()
        : this.world.createImage(opts as any)
      if (duration > 0 && typeof (bg as any).fadeIn === 'function') (bg as any).fadeIn(duration)
      this._backgroundObj = this._track(bg)
    } else {
      let finalW = this.width, finalH = this.height
      if (fit === 'contain') finalH = finalW / aspectRatio
      else if (fit === 'cover') finalW = finalH * aspectRatio

      const opts = {
        attribute: { src: finalSrc, ...overrides?.attribute },
        style: { width: finalW, height: finalH, zIndex: -1, ...overrides?.style },
        transform: { position: { x: 0, y: 0, z: 100 }, ...overrides?.transform },
        ...overrides
      }
      const bg = isVideo
        ? (() => { const v = this.world.createVideo(opts as any); v.play(); return v })()
        : this.world.createImage(opts as any)
      this.world.camera?.addChild(bg)
      if (duration > 0 && typeof (bg as any).fadeIn === 'function') (bg as any).fadeIn(duration)
      this._backgroundObj = this._track(bg)
    }
    return this
  }

  // -----------------------------------------------------------
  // Mood
  // -----------------------------------------------------------

  /** Apply a mood colour/vignette overlay on the character plane. */
  setMood(mood: MoodType = 'none', overrides?: Partial<RectangleOptions>): this {
    if (this._moodObj) {
      this._moodObj.remove()
      this._objects.delete(this._moodObj)
      this._moodObj = null
    }
    if (mood === 'none') return this

    const { color, vignette, blendMode } = MOOD_PRESETS[mood]
    const rect = this._track(this.world.createRectangle({
      attribute: overrides?.attribute,
      style: {
        color,
        gradient: vignette, gradientType: 'circular',
        width: this.world.camera!.calcDepthRatio(this.depth / 2, this.width * 2),
        height: this.world.camera!.calcDepthRatio(this.depth / 2, this.height * 2),
        zIndex: 998, pointerEvents: false,
        blendMode: blendMode as any,
        ...overrides?.style
      },
      transform: { position: { x: 0, y: 0, z: this._characterPlaneLocalZ }, ...overrides?.transform },
      ...overrides
    }))
    this.world.camera?.addChild(rect)
    this._moodObj = rect
    return this
  }

  // -----------------------------------------------------------
  // Characters
  // -----------------------------------------------------------

  /**
   * Show a character at the given position.
   * - **New character**: creates and fades in.
   * - **Existing character (same key)**: animates to the new position;
   *   if `imageKey` differs from current, crossfades the image.
   *
   * @param key      Character key (from defineCharacter — type-safe)
   * @param position Position preset or 'n/m' fraction
   * @param imageKey Image variant (from the character's images map — type-safe). Defaults to first image.
   */
  showCharacter<K extends keyof TC & string>(
    key: K,
    position: CharacterPositionPreset = 'center',
    imageKey?: keyof TC[K]['images'] & string
  ): this {
    const def = this._charDefs[key]
    if (!def) return this

    const resolvedKey = imageKey ?? (Object.keys(def.images)[0] as string)
    const src = def.images[resolvedKey]
    const xPos = this.width * (this._resolvePositionX(position) - 0.5)
    const zPos = this.depth / 2

    const existing = this._characters.get(key)
    if (existing) {
      // Move to new x position
      existing.animate({ transform: { position: { x: xPos } } }, 400, 'easeInOutQuad')
      // Change image if specified
      if (imageKey) {
        if (typeof (existing as any).transition === 'function') {
          ; (existing as any).transition(src, 300)
        } else if ((existing as any).attribute) {
          ; (existing as any).attribute.src = src
        }
      }
    } else {
      const targetW = this.world.camera!.calcDepthRatio(zPos, 500)
      const img = this._track(this.world.createImage({
        attribute: { src },
        style: { width: targetW, zIndex: 10 },
        transform: { position: { x: xPos, y: 0, z: zPos } }
      }))
      if (typeof (img as any).fadeIn === 'function') (img as any).fadeIn(400)
      this._characters.set(key, img)
    }
    return this
  }

  /** Remove a character with fade-out. */
  removeCharacter<K extends keyof TC & string>(key: K, duration: number = 600): this {
    const obj = this._characters.get(key)
    if (obj) {
      this._characters.delete(key)
      if (duration > 0 && typeof obj.fadeOut === 'function') {
        obj.fadeOut(duration)
        setTimeout(() => { obj.remove(); this._objects.delete(obj) }, duration)
      } else {
        obj.remove(); this._objects.delete(obj)
      }
    }
    return this
  }

  /**
   * Pan + zoom the camera to focus on a specific character.
   * Uses the character's `focusPoint` from defineCharacter, overridable at call time.
   */
  focusCharacter<K extends keyof TC & string>(
    key: K,
    zoomPreset: ZoomPreset = 'close-up',
    duration: number = 800,
    focusPoint?: { x: number, y: number }
  ): this {
    const target = this._characters.get(key)
    if (!target) return this

    const def = this._charDefs[key]
    const fp = focusPoint ?? def?.focusPoint ?? { x: 0.5, y: 0.5 }

    const targetX = (target as any).transform?.position?.x ?? 0
    const targetZ = (target as any).transform?.position?.z ?? (this.depth / 2)
    const charW = (target as any).style?.width ?? this.world.camera!.calcDepthRatio(targetZ, 500)
    const charH = charW * 2

    const panX = targetX + charW * (fp.x - 0.5)
    const panY = charH * (0.5 - fp.y)

    this.panCamera('custom', duration, panX, panY)
    this.zoomCamera(zoomPreset, duration)
    return this
  }

  /** Dim all characters except the highlighted one. */
  highlightCharacter<K extends keyof TC & string>(key: K): this {
    this._characters.forEach((obj, k) => {
      if (typeof obj.animate === 'function') {
        obj.animate({ style: { opacity: k === key ? 1 : 0.3 } }, 400, 'easeInOutQuad')
      }
    })
    return this
  }

  // -----------------------------------------------------------
  // Lighting
  // -----------------------------------------------------------

  /** Add a light effect. Identified by preset (one active light per preset). */
  addLight(preset: LightPreset = 'ambient', overrides?: Partial<RectangleOptions>): this {
    const p = LIGHT_PRESETS[preset]
    if (this._lightObjs.has(preset)) this.removeLight(preset)

    const rect = this._track(this.world.createRectangle({
      attribute: overrides?.attribute,
      style: {
        color: p.color,
        width: this.world.camera!.calcDepthRatio(this.depth / 2, this.width * 2),
        height: this.world.camera!.calcDepthRatio(this.depth / 2, this.height * 2),
        opacity: p.opacity, zIndex: 997, pointerEvents: false, blendMode: 'screen',
        ...overrides?.style
      },
      transform: { position: { x: 0, y: 0, z: this._characterPlaneLocalZ }, ...overrides?.transform },
      ...overrides
    }))
    this.world.camera?.addChild(rect)
    this._lightObjs.set(preset, rect)
    return this
  }

  /** Remove a light by its preset key. */
  removeLight(preset: LightPreset, duration: number = 600): this {
    const obj = this._lightObjs.get(preset)
    if (obj) {
      this._lightObjs.delete(preset)
      if (duration > 0 && typeof obj.fadeOut === 'function') {
        obj.fadeOut(duration)
        setTimeout(() => { obj.remove(); this._objects.delete(obj) }, duration)
      } else {
        obj.remove(); this._objects.delete(obj)
      }
    }
    return this
  }

  /**
   * Apply a flickering effect to a light.
   * @param lightPreset   Which light (its addLight preset key)
   * @param flickerPreset Flicker style
   */
  setFlicker(lightPreset: LightPreset, flickerPreset: FlickerPreset = 'candle'): this {
    const target = this._lightObjs.get(lightPreset) ?? Array.from(this._lightObjs.values()).pop()
    if (!target) return this

    this._flickerObj = null
    const baseOpacity = (target as any)._flickerBaseOpacity ?? target.style.opacity ?? 1
      ; (target as any)._flickerBaseOpacity = baseOpacity

    const configs: Record<FlickerPreset, { interval: number, range: [number, number] }> = {
      candle: { interval: 120, range: [0.6, 1.0] },
      flicker: { interval: 80, range: [0.3, 1.0] },
      strobe: { interval: 60, range: [0.0, 1.0] }
    }
    const cfg = configs[flickerPreset]
    this._flickerObj = target

    const step = () => {
      if (this._flickerObj !== target) {
        target.animate({ style: { opacity: baseOpacity } }, 300, 'easeInOutQuad')
        return
      }
      const [min, max] = cfg.range
      const next = baseOpacity * (min + Math.random() * (max - min))
      target.animate({ style: { opacity: next } }, cfg.interval, 'linear').on('end', step)
    }
    step()
    return this
  }

  // -----------------------------------------------------------
  // Text overlays
  // -----------------------------------------------------------

  /** Add a text overlay (one per preset). */
  addOverlay(text: string, preset: OverlayPreset = 'caption', overrides?: any): this {
    const p = OVERLAY_PRESETS[preset]
    if (this._overlayObjs.has(preset)) this.removeOverlay(preset)

    const yMap: Record<'top' | 'center' | 'bottom', number> = {
      top: this.height * 0.1,
      center: this.height * 0.5,
      bottom: this.height * 0.85
    }
    const cam = this.world.camera as any
    const pos = cam && typeof cam.canvasToLocal === 'function'
      ? cam.canvasToLocal(this.width / 2, yMap[p.y])
      : { x: 0, y: 0, z: 100 }

    const textObj = this._track(this.world.createText({
      attribute: { text, ...overrides?.attribute },
      style: {
        fontSize: p.fontSize, color: p.color, opacity: p.opacity,
        zIndex: p.zIndex, pointerEvents: false,
        ...overrides?.style
      },
      transform: { position: pos, ...overrides?.transform },
      ...overrides
    }))
    this.world.camera?.addChild(textObj)
    this._overlayObjs.set(preset, textObj)
    return this
  }

  /** Remove a text overlay by preset key. */
  removeOverlay(preset: OverlayPreset, duration: number = 600): this {
    const obj = this._overlayObjs.get(preset)
    if (obj) {
      this._overlayObjs.delete(preset)
      if (duration > 0 && typeof obj.fadeOut === 'function') {
        obj.fadeOut(duration)
        setTimeout(() => { obj.remove(); this._objects.delete(obj) }, duration)
      } else {
        obj.remove(); this._objects.delete(obj)
      }
    }
    return this
  }

  /** Remove all text overlays. */
  clearOverlay(duration: number = 400): this {
    const keys = Array.from(this._overlayObjs.keys()) as OverlayPreset[]
    keys.forEach(k => this.removeOverlay(k, duration))
    return this
  }

  // -----------------------------------------------------------
  // Camera
  // -----------------------------------------------------------

  /** Zoom camera using a preset or custom scale. */
  zoomCamera(preset: ZoomPreset = 'reset', duration?: number, overrideScale?: number): this {
    const cam = this.world.camera
    if (!cam) return this
    const { scale, duration: pd } = ZOOM_PRESETS[preset]
    const finalScale = overrideScale ?? scale
    const finalDur = duration ?? pd
    const baseDist = this.depth / 2
    const newZ = this._initialCamZ + baseDist - baseDist / finalScale
    cam.animate({ transform: { position: { z: newZ } } }, finalDur, 'easeInOutQuad')
    return this
  }

  /** Pan camera to a preset position or custom world coordinates. */
  panCamera(preset: PanPreset | 'custom', duration?: number, customX?: number, customY?: number): this {
    const cam = this.world.camera
    if (!cam) return this
    let x: number, y: number, dur: number
    if (preset === 'custom') {
      x = customX ?? 0; y = customY ?? 0; dur = duration ?? 800
    } else {
      const p = PAN_PRESETS[preset]
      x = customX ?? p.x; y = customY ?? p.y; dur = duration ?? p.duration
    }
    cam.animate({ transform: { position: { x, y } } }, dur, 'easeInOutQuad')
    return this
  }

  /** Shake camera with a preset. */
  shakeCamera(preset: ShakePreset = 'normal', overrideDuration?: number, overrideIntensity?: number): this {
    const cam = this.world.camera
    if (!cam) return this
    const { intensity: pi, duration: pd } = SHAKE_PRESETS[preset]
    const intensity = overrideIntensity ?? pi
    const totalDuration = overrideDuration ?? pd
    const baseX = cam.transform.position.x
    const baseY = cam.transform.position.y
    const steps = Math.floor(totalDuration / 50)
    let i = 0
    const shake = () => {
      if (i >= steps) { cam.animate({ transform: { position: { x: baseX, y: baseY } } }, 100, 'easeOut'); return }
      const dx = (Math.random() - 0.5) * intensity * 2
      const dy = (Math.random() - 0.5) * intensity * 2
      cam.animate({ transform: { position: { x: baseX + dx, y: baseY + dy } } }, 50, 'linear').on('end', shake)
      i++
    }
    shake()
    return this
  }

  // -----------------------------------------------------------
  // Screen transitions
  // -----------------------------------------------------------

  /** Fade in or out. */
  screenFade(dir: 'in' | 'out', preset: FadeColorPreset = 'black', duration: number = 600): this {
    const { color, easing } = FADE_PRESETS[preset]
    const rect = this._getTransitionRect(color)
    rect.animate({ style: { opacity: dir === 'out' ? 1 : 0 } }, duration, easing)
    return this
  }

  /** Quick flash. */
  screenFlash(preset: FlashPreset = 'white'): this {
    const { color, duration } = FLASH_PRESETS[preset]
    const rect = this._getTransitionRect(color)
    rect.animate({ style: { opacity: 1 } }, duration / 2, 'easeOut')
      .on('end', () => rect.animate({ style: { opacity: 0 } }, duration / 2, 'easeIn'))
    return this
  }

  /** Wipe transition. */
  screenWipe(dir: 'in' | 'out', preset: WipePreset = 'left', duration: number = 800): this {
    const rect = this._getTransitionRect('rgba(0,0,0,1)')
    const w = this.world.canvas ? Math.max((this.world.canvas as any).width, this.width) : this.width
    const h = this.world.canvas ? Math.max((this.world.canvas as any).height, this.height) : this.height
    const { x: dx, y: dy } = WIPE_PRESETS[preset]
    if (dir === 'out') {
      rect.transform.position.x = dx * w * 2
      rect.transform.position.y = dy * h * 2
      rect.style.opacity = 1
      rect.animate({ transform: { position: { x: 0, y: 0 } } }, duration, 'easeInOutQuad')
    } else {
      rect.transform.position.x = 0
      rect.transform.position.y = 0
      rect.style.opacity = 1
      rect.animate({ transform: { position: { x: dx * w * 2, y: dy * h * 2 } } }, duration, 'easeInOutQuad')
        .on('end', () => { rect.style.opacity = 0 })
    }
    return this
  }

  /** Convenience: fade from black to scene. */
  fadeIn(duration: number = 800): this {
    const rect = this._getTransitionRect('rgba(0,0,0,1)')
    rect.style.opacity = 1
    rect.animate({ style: { opacity: 0 } }, duration, 'easeInOut')
    return this
  }

  /** Convenience: fade scene to black. */
  fadeOut(duration: number = 800): this {
    const rect = this._getTransitionRect('rgba(0,0,0,1)')
    rect.style.opacity = 0
    rect.animate({ style: { opacity: 1 } }, duration, 'easeInOut')
    return this
  }
}
