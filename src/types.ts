// ============================================================
// Attribute
// ============================================================

export interface Attribute {
  type: string
  id: string
  name: string
  className: string
  text?: string
  physics?: 'dynamic' | 'static' | null
  density?: number
  friction?: number
  restitution?: number
  fixedRotation?: boolean
  gravityScale?: number
  collisionGroup?: number
  collisionMask?: number
  collisionCategory?: number
}

// ============================================================
// Dataset
// ============================================================

export type DatasetValue = string | number | boolean | object | Array<unknown>

export interface Dataset {
  [key: string]: DatasetValue
}

// ============================================================
// Style
// ============================================================

export interface Style {
  color?: string
  opacity: number
  width?: number
  height?: number
  blur?: number
  borderColor?: string
  borderWidth?: number
  outlineColor?: string
  outlineWidth?: number
  fontSize?: number
  fontFamily?: string
  fontWeight?: string | number
  fontStyle?: 'normal' | 'italic'
  textAlign?: 'left' | 'center' | 'right'
  lineHeight?: number
  display: 'block' | 'none'
  pointerEvents: boolean
  margin?: string
  shadowColor?: string
  shadowBlur?: number
  shadowOffsetX?: number
  shadowOffsetY?: number
  zIndex: number
  blendMode?: GlobalCompositeOperation
}

// ============================================================
// Transform
// ============================================================

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Transform {
  position: Vec3
  rotation: Vec3
  scale: Vec3
}

// ============================================================
// Object Init Options
// ============================================================

export interface LveObjectOptions {
  attribute?: Partial<Omit<Attribute, 'type' | 'id'>>
  dataset?: Dataset
  style?: Partial<Style>
  transform?: {
    position?: Partial<Vec3>
    rotation?: Partial<Vec3>
    scale?: Partial<Vec3>
  }
}

// ============================================================
// Asset Loader Types
// ============================================================

export type AssetMap = Record<string, string>

export type LoadedAsset = HTMLImageElement | HTMLVideoElement

export type LoadedAssets = Record<string, LoadedAsset>

export type LoaderEventType = 'load' | 'loading' | 'loaded' | 'error' | 'complete'

// ============================================================
// Animation Types
// ============================================================

export type EasingType =
  | 'linear'
  | 'easeIn' | 'easeOut' | 'easeInOut'
  | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad'
  | 'easeInCubic' | 'easeOutCubic' | 'easeInOutCubic'
  | 'easeInQuart' | 'easeOutQuart' | 'easeInOutQuart'
  | 'easeInQuint' | 'easeOutQuint' | 'easeInOutQuint'
  | 'easeInSine' | 'easeOutSine' | 'easeInOutSine'
  | 'easeInExpo' | 'easeOutExpo' | 'easeInOutExpo'
  | 'easeInCirc' | 'easeOutCirc' | 'easeInOutCirc'
  | 'easeInBack' | 'easeOutBack' | 'easeInOutBack'
  | 'easeInElastic' | 'easeOutElastic' | 'easeInOutElastic'
  | 'easeInBounce' | 'easeOutBounce' | 'easeInOutBounce'

/** 애니메이션 대상 값. 숫자 또는 복합 대입 연산자 문자열 ('+=100', '-=50', '*=2', '/=2') */
export type AnimateValue = number | string

export interface AnimateTarget {
  style?: Partial<Record<keyof Style, AnimateValue>>
  /** animate.md 예제처럼 최상위 position 키 사용 가능 → 내부적으로 transform.position으로 리매핑 */
  position?: Partial<Record<keyof Vec3, AnimateValue>>
  transform?: {
    position?: Partial<Record<keyof Vec3, AnimateValue>>
    rotation?: Partial<Record<keyof Vec3, AnimateValue>>
    scale?: Partial<Record<keyof Vec3, AnimateValue>>
  }
  dataset?: Record<string, any>
  [key: string]: any
}

// ============================================================
// Event Maps
// ============================================================

/** LveObject (및 하위 클래스) 공통 이벤트 맵 */
export interface LveObjectEvents {
  [key: string]: any[]
  // 속성 변경 이벤트
  cssmodified: [key: string, value: any, prev: any]
  attrmodified: [key: string, value: any, prev: any]
  datamodified: [key: string, value: any, prev: any]
  rotationmodified: [key: string, value: any, prev: any]
  positionmodified: [key: string, value: any, prev: any]
  scalemodified: [key: string, value: any, prev: any]
  // 재생 이벤트 (video, sprite, particle)
  play: []
  pause: []
  ended: []
  repeat: []
  // 마우스 이벤트
  click: [e: MouseEvent]
  dblclick: [e: MouseEvent]
  contextmenu: [e: MouseEvent]
  mousedown: [e: MouseEvent]
  mouseup: [e: MouseEvent]
  mousemove: [e: MouseEvent]
  mouseover: [e: MouseEvent]
  mouseout: [e: MouseEvent]
}

/** Animation 클래스 이벤트 맵 */
export interface AnimationEvents {
  [key: string]: any[]
  start: []
  pause: []
  stop: []
  resume: []
  update: [state: Record<string, any>]
}
