import { World } from '../src/World'
import type { LveObject } from '../src/LveObject'
import type { ParticleOptions } from '../src/objects/Particle'
import type { RectangleOptions } from '../src/objects/Rectangle'
import type { EasingType } from '../src/types'

// =============================================================
// 옵션 인터페이스
// =============================================================

export interface VisualnovelOption {
  width: number
  height: number
  depth: number
}

// =============================================================
// 프리셋 타입
// =============================================================

export type EffectType = 'dust' | 'rain' | 'snow' | 'sakura' | 'sparkle'
export type Intensity = 'light' | 'normal' | 'heavy'
export type MoodType = 'day' | 'sunset' | 'night' | 'sepia' | 'horror' | 'none'
export type ZoomPreset = 'close-up' | 'medium' | 'wide' | 'reset'
export type PanPreset = 'left' | 'right' | 'up' | 'down' | 'center'
export type ShakePreset = 'light' | 'normal' | 'heavy' | 'earthquake'
export type CharacterPositionPreset = 'far-left' | 'left' | 'center' | 'right' | 'far-right'
export type BackgroundFitPreset = 'stretch' | 'contain' | 'cover'
export type FadeColorPreset = 'black' | 'white' | 'red' | 'dream' | 'sepia'
export type FlashPreset = 'white' | 'red' | 'yellow'
export type WipePreset = 'left' | 'right' | 'up' | 'down'
export type LightPreset = 'spot' | 'ambient' | 'warm' | 'cold'
export type FlickerPreset = 'candle' | 'strobe' | 'flicker'
export type OverlayPreset = 'caption' | 'title' | 'whisper'

// =============================================================
// 프리셋 룩업 테이블
// =============================================================

const EFFECT_PRESETS: Record<EffectType, Record<Intensity, Partial<ParticleOptions>>> = {
  dust: { light: { attribute: { src: 'dust' }, style: { opacity: 0.3 } }, normal: { attribute: { src: 'dust' }, style: { opacity: 0.6 } }, heavy: { attribute: { src: 'dust' }, style: { opacity: 0.9 } } },
  rain: { light: { attribute: { src: 'rain' }, style: { opacity: 0.4 } }, normal: { attribute: { src: 'rain' }, style: { opacity: 0.7 } }, heavy: { attribute: { src: 'rain' }, style: { opacity: 1.0 } } },
  snow: { light: { attribute: { src: 'snow' }, style: { opacity: 0.5 } }, normal: { attribute: { src: 'snow' }, style: { opacity: 0.8 } }, heavy: { attribute: { src: 'snow' }, style: { opacity: 1.0 } } },
  sakura: { light: { attribute: { src: 'sakura' }, style: { opacity: 0.6 } }, normal: { attribute: { src: 'sakura' }, style: { opacity: 0.85 } }, heavy: { attribute: { src: 'sakura' }, style: { opacity: 1.0 } } },
  sparkle: { light: { attribute: { src: 'sparkle' }, style: { opacity: 0.4 } }, normal: { attribute: { src: 'sparkle' }, style: { opacity: 0.8 } }, heavy: { attribute: { src: 'sparkle' }, style: { opacity: 1.0 } } }
}

const MOOD_PRESETS: Record<MoodType, string> = {
  day: 'rgba(255, 255, 255, 0)',
  sunset: 'rgba(255, 100, 0, 0.2)',
  night: 'rgba(0, 0, 50, 0.4)',
  sepia: 'rgba(112, 66, 20, 0.3)',
  horror: 'rgba(150, 0, 0, 0.3)',
  none: 'transparent'
}

const ZOOM_PRESETS: Record<ZoomPreset, { scale: number, duration: number }> = {
  'close-up': { scale: 1.5, duration: 1500 },
  'medium': { scale: 1.2, duration: 1000 },
  'wide': { scale: 0.8, duration: 1500 },
  'reset': { scale: 1.0, duration: 1000 }
}

const PAN_PRESETS: Record<PanPreset, { x: number, y: number, duration: number }> = {
  left: { x: -200, y: 0, duration: 1000 },
  right: { x: 200, y: 0, duration: 1000 },
  up: { x: 0, y: -200, duration: 1000 },
  down: { x: 0, y: 200, duration: 1000 },
  center: { x: 0, y: 0, duration: 1000 }
}

// 캐릭터 위치별 x축 비율 룩업
const CHARACTER_X_RATIO: Record<CharacterPositionPreset, number> = {
  'far-left': 0.1,
  'left': 0.25,
  'center': 0.5,
  'right': 0.75,
  'far-right': 0.9
}

const SHAKE_PRESETS: Record<ShakePreset, { intensity: number, duration: number }> = {
  light: { intensity: 5, duration: 300 },
  normal: { intensity: 10, duration: 500 },
  heavy: { intensity: 20, duration: 800 },
  earthquake: { intensity: 50, duration: 2000 }
}

// 페이드 전환 색상 + 이징 룩업
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

// 조명 효과 — gradient 색상 룩업
const LIGHT_PRESETS: Record<LightPreset, { color: string, opacity: number }> = {
  spot: { color: 'rgba(255,240,180,0.25)', opacity: 0.25 },
  ambient: { color: 'rgba(255,255,220,0.1)', opacity: 0.1 },
  warm: { color: 'rgba(255,150,50,0.2)', opacity: 0.2 },
  cold: { color: 'rgba(100,150,255,0.15)', opacity: 0.15 }
}

// 텍스트 오버레이 스타일 룩업
const OVERLAY_PRESETS: Record<OverlayPreset, {
  fontSize: number
  color: string
  opacity: number
  zIndex: number
  y: 'top' | 'center' | 'bottom'
}> = {
  caption: { fontSize: 24, color: '#ffffff', opacity: 0.9, zIndex: 1000, y: 'bottom' },
  title: { fontSize: 48, color: '#ffffff', opacity: 1.0, zIndex: 1000, y: 'center' },
  whisper: { fontSize: 18, color: '#ccccdd', opacity: 0.6, zIndex: 1000, y: 'center' }
}

// =============================================================
// Visualnovel 클래스
// =============================================================

export class Visualnovel {
  protected readonly world: World
  protected readonly width: number
  protected readonly height: number
  protected readonly depth: number

  /** 이 인스턴스가 생성한 모든 오브젝트 */
  private _objects: Set<LveObject> = new Set()
  /** 위치 키 → 캐릭터 오브젝트 */
  private _characters: Map<CharacterPositionPreset, LveObject> = new Map()
  /** 현재 배경 오브젝트 */
  private _backgroundObj: LveObject | null = null
  /** 무드 필터 오브젝트 */
  private _moodObj: LveObject | null = null
  /** 화면 전환용 오버레이 오브젝트 (재사용) */
  private _transitionObj: LveObject | null = null
  /** 텍스트 오버레이 목록 */
  private _overlayObjs: LveObject[] = []
  /** 조명 오브젝트 목록 */
  private _lightObjs: LveObject[] = []
  /** 깜빡임 타이머 핸들 */
  private _flickerHandle: ReturnType<typeof setInterval> | null = null

  constructor(world: World, option: VisualnovelOption) {
    this.world = world
    this.width = option.width
    this.height = option.height
    this.depth = option.depth

    // 씬 구성을 위한 필수 요소인 카메라가 없다면 자동으로 생성 및 연결
    if (!this.world.camera) {
      this.world.camera = this.world.createCamera()
    }
  }

  // -----------------------------------------------------------
  // 내부 헬퍼
  // -----------------------------------------------------------

  /** 오브젝트를 생성 후 내부 Set에 등록합니다 */
  private _track<T extends LveObject>(obj: T): T {
    this._objects.add(obj)
    return obj
  }

  /** 전환 오버레이 Rectangle을 지연 생성하거나 재사용합니다 */
  private _getTransitionRect(color: string): LveObject {
    if (!this._transitionObj) {
      const rect = this.world.createRectangle({
        attribute: { color },
        style: {
          width: this.width * 2, // 여유 있게 덮기 위해 2배
          height: this.height * 2,
          opacity: 0,
          zIndex: 9999,
          pointerEvents: false
        },
        transform: {
          // 카메라는 z:100 거리에서 1:1 스케일을 가집니다.
          position: { x: 0, y: 0, z: 100 }
        }
      })
      this.world.camera?.addChild(rect)
      this._transitionObj = rect
      // 전환 오브젝트는 clear()로 제거하지 않도록 _objects에 넣지 않습니다
    } else {
      (this._transitionObj as any).attribute.color = color
      // wipe 등으로 변경되었을 위치 초기화
      this._transitionObj.transform.position.x = 0
      this._transitionObj.transform.position.y = 0
    }
    return this._transitionObj
  }

  // -----------------------------------------------------------
  // 환경 효과 (파티클)
  // -----------------------------------------------------------

  /**
   * 프리셋 환경 효과(파티클)를 공간에 추가합니다.
   * @param type 효과 종류 (dust, rain, snow, sakura, sparkle)
   * @param intensity 강도 (light, normal, heavy)
   * @param overrides 세부 옵션 오버라이드
   */
  addEffect(type: EffectType = 'dust', intensity: Intensity = 'normal', overrides?: Partial<ParticleOptions>): this {
    const preset = EFFECT_PRESETS[type]?.[intensity] || EFFECT_PRESETS.dust.normal

    const particle = this._track(this.world.createParticle({
      attribute: { ...preset.attribute, ...overrides?.attribute },
      style: {
        width: this.width,
        height: this.height,
        ...preset.style,
        ...overrides?.style
      },
      transform: {
        position: { x: 0, y: 0, z: 0 },
        ...overrides?.transform
      },
      ...overrides
    }))

    particle.play()
    return this
  }

  /** addEffect('dust') 의 간편 래퍼 */
  addDust(intensity: Intensity = 'normal', overrides?: Partial<ParticleOptions>): this {
    return this.addEffect('dust', intensity, overrides)
  }

  // -----------------------------------------------------------
  // 배경
  // -----------------------------------------------------------

  /**
   * 공간 배경을 추가합니다.
   * @param src 에셋 이름 또는 URL
   * @param fit 배경 맞춤 방식
   * @param isVideo 비디오 여부
   * @param overrides 세부 오버라이드
   */
  setBackground(src: string, fit: BackgroundFitPreset = 'stretch', isVideo: boolean = false, overrides?: any): this {
    // 기존 배경 제거
    if (this._backgroundObj) {
      this._backgroundObj.remove()
      this._objects.delete(this._backgroundObj)
      this._backgroundObj = null
    }

    const aspectRatio = this.width / this.height
    let finalW = this.width
    let finalH = this.height
    if (fit === 'contain') { finalH = finalW / aspectRatio }
    else if (fit === 'cover') { finalW = finalH * aspectRatio }

    // 깊이에 따른 원근 스케일 보정 (카메라가 존재하므로 바로 사용 가능)
    const cam = this.world.camera as any
    const zPos = overrides?.transform?.position?.z ?? this.depth
    if (cam && typeof cam.calcDepthRatio === 'function') {
      finalW = cam.calcDepthRatio(zPos, finalW)
      finalH = cam.calcDepthRatio(zPos, finalH)
    }

    const options = {
      attribute: { src, ...overrides?.attribute },
      style: { width: finalW, height: finalH, zIndex: -1, ...overrides?.style },
      transform: {
        position: { x: 0, y: 0, z: zPos },
        ...overrides?.transform
      },
      ...overrides
    }

    const bg = isVideo
      ? (() => { const v = this.world.createVideo(options as any); v.play(); return v })()
      : this.world.createImage(options as any)

    this._backgroundObj = this._track(bg)
    return this
  }

  /**
   * 배경을 새로운 에셋으로 부드럽게 전환합니다.
   * @param newSrc 새 에셋 이름
   * @param preset 전환 방식 (현재 'fade' 지원)
   * @param duration 지속 시간 (ms)
   */
  transitionTo(newSrc: string, preset: 'fade' | 'cut' = 'fade', duration: number = 1000): this {
    const bg = this._backgroundObj as any
    if (!bg) return this

    if (preset === 'cut') {
      bg.attribute.src = newSrc
    } else if (preset === 'fade' && typeof bg.transition?.start === 'function') {
      bg.transition.start(newSrc, duration)
    } else {
      bg.attribute.src = newSrc
    }
    return this
  }

  // -----------------------------------------------------------
  // 무드 (화면 색조 필터)
  // -----------------------------------------------------------

  /**
   * 화면 전체에 색조 오버레이를 추가합니다.
   * @param mood 무드 프리셋
   * @param overrides 세부 사각형 옵션 오버라이드
   */
  setMood(mood: MoodType = 'none', overrides?: Partial<RectangleOptions>): this {
    if (this._moodObj) {
      this._moodObj.remove()
      this._objects.delete(this._moodObj)
      this._moodObj = null
    }
    if (mood === 'none') return this

    const color = MOOD_PRESETS[mood]
    const rect = this._track(this.world.createRectangle({
      attribute: { color },
      style: {
        width: this.width * 1.5,
        height: this.height * 1.5,
        zIndex: 998,
        pointerEvents: false,
        ...overrides?.style
      },
      transform: {
        position: { x: 0, y: 0, z: 100 },
        ...overrides?.transform
      },
      ...overrides
    }))
    this.world.camera?.addChild(rect)
    this._moodObj = rect
    return this
  }

  // -----------------------------------------------------------
  // 캐릭터
  // -----------------------------------------------------------

  /**
   * 캐릭터 이미지를 지정 위치에 배치합니다.
   * @param src 캐릭터 에셋 이름
   * @param position 위치 프리셋
   * @param overrides 세부 오버라이드
   */
  addCharacter(src: string, position: CharacterPositionPreset = 'center', overrides?: any): this {
    // 같은 위치에 이미 캐릭터가 있으면 교체
    const existing = this._characters.get(position)
    if (existing) {
      existing.remove()
      this._objects.delete(existing)
    }

    const xPos = this.width * (CHARACTER_X_RATIO[position] - 0.5)
    const zPos = overrides?.transform?.position?.z ?? (this.depth / 2)

    // 캐릭터 원본 혹은 비율 유지
    const cam = this.world.camera as any
    const targetW = cam && typeof cam.calcDepthRatio === 'function' ? cam.calcDepthRatio(zPos, 500) : 500

    const img = this._track(this.world.createImage({
      attribute: { src, ...overrides?.attribute },
      style: { width: targetW, zIndex: 10, ...overrides?.style },
      transform: {
        position: { x: xPos, y: 0, z: zPos },
        ...overrides?.transform
      },
      ...overrides
    }))

    this._characters.set(position, img)
    return this
  }

  // -----------------------------------------------------------
  // 조명 효과
  // -----------------------------------------------------------

  /**
   * 공간에 조명 효과를 추가합니다.
   * @param preset 조명 프리셋 (spot, ambient, warm, cold)
   * @param overrides 세부 오버라이드
   */
  addLight(preset: LightPreset = 'ambient', overrides?: Partial<RectangleOptions>): this {
    const p = LIGHT_PRESETS[preset]
    const rect = this._track(this.world.createRectangle({
      attribute: { color: p.color },
      style: {
        width: this.width,
        height: this.height,
        opacity: p.opacity,
        zIndex: 997,
        pointerEvents: false,
        blendMode: 'screen',
        ...overrides?.style
      },
      transform: {
        position: { x: 0, y: 0, z: 100 },
        ...overrides?.transform
      },
      ...overrides
    }))
    this.world.camera?.addChild(rect)
    this._lightObjs.push(rect)
    return this
  }

  /**
   * 조명이 자연스럽게 깜빡이는 효과를 적용합니다.
   * @param preset 깜빡임 프리셋 (candle, strobe, flicker)
   */
  setFlicker(preset: FlickerPreset = 'candle'): this {
    const target = this._lightObjs[this._lightObjs.length - 1]
    if (!target) return this

    // 기존 깜빡임 취소
    if (this._flickerHandle) {
      clearInterval(this._flickerHandle)
      this._flickerHandle = null
    }

    const configs: Record<FlickerPreset, { interval: number, range: [number, number] }> = {
      candle: { interval: 120, range: [0.7, 1.0] },
      flicker: { interval: 80, range: [0.4, 1.0] },
      strobe: { interval: 60, range: [0.0, 1.0] }
    }
    const cfg = configs[preset]

    this._flickerHandle = setInterval(() => {
      const [min, max] = cfg.range
      target.style.opacity = min + Math.random() * (max - min)
    }, cfg.interval)

    return this
  }

  // -----------------------------------------------------------
  // 텍스트 오버레이
  // -----------------------------------------------------------

  /**
   * 화면에 텍스트 오버레이를 추가합니다.
   * @param text 표시할 텍스트
   * @param preset 오버레이 스타일 프리셋
   * @param overrides 세부 오버라이드
   */
  addOverlay(text: string, preset: OverlayPreset = 'caption', overrides?: any): this {
    const p = OVERLAY_PRESETS[preset]
    const yPosMap: Record<'top' | 'center' | 'bottom', number> = {
      top: this.height * 0.1,
      center: this.height * 0.5,
      bottom: this.height * 0.85
    }

    const cam = this.world.camera as any
    const targetPos = cam && typeof cam.canvasToLocal === 'function'
      ? cam.canvasToLocal(this.width / 2, yPosMap[p.y])
      : { x: 0, y: 0, z: 100 }

    const textObj = this._track(this.world.createText({
      attribute: { text, ...overrides?.attribute },
      style: {
        fontSize: p.fontSize,
        color: p.color,
        opacity: p.opacity,
        zIndex: p.zIndex,
        pointerEvents: false,
        ...overrides?.style
      },
      transform: {
        position: targetPos,
        ...overrides?.transform
      },
      ...overrides
    }))

    this.world.camera?.addChild(textObj)
    this._overlayObjs.push(textObj)
    return this
  }

  /** 모든 텍스트 오버레이를 제거합니다 */
  clearOverlay(): this {
    for (const obj of this._overlayObjs) {
      obj.remove()
      this._objects.delete(obj)
    }
    this._overlayObjs = []
    return this
  }

  // -----------------------------------------------------------
  // 카메라 동적 효과
  // -----------------------------------------------------------

  /**
   * 프리셋 기반 카메라 줌인/아웃.
   * @param preset close-up / medium / wide / reset
   * @param overrides scale 또는 duration 수동 지정
   */
  zoomCamera(preset: ZoomPreset = 'reset', overrides?: { scale?: number, duration?: number }): this {
    const cam = this.world.camera
    const p = ZOOM_PRESETS[preset]
    const scale = overrides?.scale ?? p.scale
    const duration = overrides?.duration ?? p.duration

    if (cam && typeof cam.animate === 'function') {
      cam.animate({ transform: { scale: { x: scale, y: scale } } }, duration, 'easeInOutQuad')
    }
    return this
  }

  /**
   * 프리셋 기반 카메라 패닝.
   * @param preset left / right / up / down / center
   * @param overrides x, y, duration 수동 지정
   */
  panCamera(preset: PanPreset = 'center', overrides?: { x?: number, y?: number, duration?: number }): this {
    const cam = this.world.camera
    const p = PAN_PRESETS[preset]
    const x = overrides?.x ?? p.x
    const y = overrides?.y ?? p.y
    const duration = overrides?.duration ?? p.duration

    if (cam && typeof cam.animate === 'function') {
      cam.animate({ transform: { position: { x, y } } }, duration, 'easeInOutQuad')
    }
    return this
  }

  /**
   * 프리셋 기반 카메라 흔들기.
   */
  shakeCamera(preset: ShakePreset = 'normal', overrides?: { intensity?: number, duration?: number }): this {
    const cam = this.world.camera
    if (!cam) return this

    const p = SHAKE_PRESETS[preset]
    const intensity = overrides?.intensity ?? p.intensity
    const duration = overrides?.duration ?? p.duration

    const originX = cam.transform.position.x
    const originY = cam.transform.position.y
    const interval = 50
    let elapsed = 0

    const handle = setInterval(() => {
      elapsed += interval
      if (elapsed >= duration) {
        clearInterval(handle)
        cam.transform.position.x = originX
        cam.transform.position.y = originY
        return
      }
      cam.transform.position.x = originX + (Math.random() - 0.5) * intensity
      cam.transform.position.y = originY + (Math.random() - 0.5) * intensity
    }, interval)

    return this
  }

  /**
   * 지정 위치의 캐릭터를 향해 카메라를 팬 + 줌인 합산으로 포커스합니다.
   */
  focusCharacter(position: CharacterPositionPreset, zoomPreset: ZoomPreset = 'close-up', duration: number = 1200): this {
    const xPos = this.width * (CHARACTER_X_RATIO[position] - 0.5)
    this.panCamera('center', { x: xPos, y: 0, duration })
    this.zoomCamera(zoomPreset, { duration })
    return this
  }

  /**
   * 지정 위치의 캐릭터를 강조합니다 (무드 레이어를 해당 캐릭터 뒤에만 적용).
   * 기존 무드를 어둡게 바꾸고, 해당 캐릭터만 zIndex를 올립니다.
   */
  highlightCharacter(position: CharacterPositionPreset): this {
    const target = this._characters.get(position)
    if (!target) return this

    // 무드를 어둠으로 교체
    this.setMood('night')

    // 대상 캐릭터만 무드 레이어 앞으로 올리기
    target.style.zIndex = 1001
    return this
  }

  // -----------------------------------------------------------
  // 화면 전환 (Screen Transition)
  // -----------------------------------------------------------

  /**
   * 화면 전체를 지정 색상으로 서서히 전환합니다.
   * @param dir 'in' (화면 등장) | 'out' (화면 퇴장)
   * @param preset 페이드 색상/이징 프리셋
   * @param duration 지속 시간 (ms)
   */
  screenFade(dir: 'in' | 'out', preset: FadeColorPreset = 'black', duration: number = 800): this {
    const { color, easing } = FADE_PRESETS[preset]
    const rect = this._getTransitionRect(color)

    if (dir === 'out') {
      // 투명 → 불투명
      if (typeof rect.animate === 'function') {
        rect.animate({ style: { opacity: 1 } }, duration, easing)
      }
    } else {
      // 불투명 → 투명
      if (typeof rect.animate === 'function') {
        rect.animate({ style: { opacity: 0 } }, duration, easing)
      }
    }
    return this
  }

  /**
   * 화면을 순간적으로 번쩍이게 합니다.
   * @param preset 번쩍임 색상 프리셋
   */
  screenFlash(preset: FlashPreset = 'white'): this {
    const { color, duration } = FLASH_PRESETS[preset]
    const rect = this._getTransitionRect(color)

    rect.style.opacity = 1
    if (typeof rect.animate === 'function') {
      rect.animate({ style: { opacity: 0 } }, duration, 'easeOut')
    }
    return this
  }

  /**
   * 지정 방향으로 화면을 닦아내듯 전환합니다.
   * @param preset 닦아내기 방향
   * @param duration 지속 시간 (ms)
   */
  screenWipe(preset: WipePreset = 'left', duration: number = 800): this {
    const rect = this._getTransitionRect('rgba(0,0,0,1)')
    rect.style.opacity = 1

    const targetPos: Record<WipePreset, { x: number, y: number }> = {
      left: { x: -this.width, y: 0 },
      right: { x: this.width, y: 0 },
      up: { x: 0, y: -this.height },
      down: { x: 0, y: this.height }
    }

    const target = targetPos[preset]
    if (typeof rect.animate === 'function') {
      rect.animate({
        transform: { position: { x: target.x, y: target.y } }
      }, duration, 'easeInOutQuad')
    }
    return this
  }

  // -----------------------------------------------------------
  // 씬 일괄 관리
  // -----------------------------------------------------------

  /**
   * 이 Visualnovel 인스턴스가 생성한 오브젝트를 모두 제거합니다.
   */
  clear(): this {
    if (this._flickerHandle) {
      clearInterval(this._flickerHandle)
      this._flickerHandle = null
    }

    for (const obj of this._objects) {
      obj.remove()
    }

    this._objects.clear()
    this._characters.clear()
    this._backgroundObj = null
    this._moodObj = null
    this._overlayObjs = []
    this._lightObjs = []
    return this
  }

  /**
   * 이 Visualnovel 인스턴스가 생성한 모든 오브젝트를 부드럽게 등장시킵니다.
   */
  fadeIn(duration: number = 600): this {
    for (const obj of this._objects) {
      if (typeof obj.fadeIn === 'function') {
        obj.fadeIn(duration)
      }
    }
    return this
  }

  /**
   * 이 Visualnovel 인스턴스가 생성한 모든 오브젝트를 부드럽게 퇴장시킵니다.
   */
  fadeOut(duration: number = 600): this {
    for (const obj of this._objects) {
      if (typeof obj.fadeOut === 'function') {
        obj.fadeOut(duration)
      }
    }
    return this
  }
}
