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
