import {
  Renderer as OGLRenderer,
  Camera,
  Transform,
  Geometry,
  Program,
  Mesh,
  Texture,
  Mat4,
  Vec3 as OglVec3
} from 'ogl'
import type { OGLRenderingContext } from 'ogl'

const AXIS_X = new OglVec3(1, 0, 0)
const AXIS_Y = new OglVec3(0, 1, 0)
const AXIS_Z = new OglVec3(0, 0, 1)
import { colorVertex, colorFragment, ellipseVertex, ellipseFragment } from './shaders/color.js'
import { textureVertex, textureFragment } from './shaders/texture.js'
import { instancedVertex, instancedFragment } from './shaders/instanced.js'
import { parseTextMarkup } from './utils/textMarkup.js'
import { TEXTURE_THROTTLE_FRAMES, TEXTURE_DEBOUNCE_FRAMES } from './dirty.js'

import type { LveObject } from './LveObject.js'
import type { Sprite } from './objects/Sprite.js'
import type { LveImage } from './objects/LveImage.js'
import type { LveVideo } from './objects/LveVideo.js'
import type { Particle } from './objects/Particle.js'
import type { LoadedAssets } from './types.js'

// ─── Quad 지오메트리 헬퍼 ────────────────────────────────────────────────────

function createQuadGeometry(gl: OGLRenderingContext) {
  return new Geometry(gl, {
    position: {
      size: 2,
      data: new Float32Array([
        -0.5, -0.5,
        0.5, -0.5,
        0.5, 0.5,
        -0.5, 0.5,
      ]),
    },
    uv: {
      size: 2,
      data: new Float32Array([
        0, 0,
        1, 0,
        1, 1,
        0, 1,
      ]),
    },
    index: {
      data: new Uint16Array([0, 1, 2, 0, 2, 3]),
    },
  })
}

// ─── 색상 파싱 헬퍼 ──────────────────────────────────────────────────────────

function parseCSSColor(color: string): [number, number, number, number] {
  // hex #rrggbb 또는 #rrggbbaa
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16) / 255
      const g = parseInt(hex[1] + hex[1], 16) / 255
      const b = parseInt(hex[2] + hex[2], 16) / 255
      return [r, g, b, 1]
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255
      const g = parseInt(hex.slice(2, 4), 16) / 255
      const b = parseInt(hex.slice(4, 6), 16) / 255
      const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
      return [r, g, b, a]
    }
  }
  // rgb(r, g, b) 또는 rgba(r, g, b, a)
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/)
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1]) / 255,
      parseInt(rgbMatch[2]) / 255,
      parseInt(rgbMatch[3]) / 255,
      rgbMatch[4] != null ? parseFloat(rgbMatch[4]) : 1,
    ]
  }
  // hsl(h, s%, l%) 또는 hsla(h, s%, l%, a)
  const hslMatch = color.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)/)
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) / 360
    const s = parseFloat(hslMatch[2]) / 100
    const l = parseFloat(hslMatch[3]) / 100
    const a = hslMatch[4] != null ? parseFloat(hslMatch[4]) : 1
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    if (s === 0) return [l, l, l, a]
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3), a]
  }
  return [1, 1, 1, 1]
}

// ─── 그라디언트 stops 파서 ────────────────────────────────────────────────────
// '45deg, rgb(255,255,255) 0%, rgb(255,0,0) 50%' → { direction: 45, stops: [...] }
interface GradientParsed {
  direction: number
  stops: { offset: number; color: string }[]
}

function parseGradientStops(gradient: string): GradientParsed {
  // 선택적 방향각 파싱: '45deg,' 또는 '-90deg,'
  let direction = 0
  const degMatch = gradient.match(/^\s*(-?[\d.]+)deg\s*,\s*/)
  const stopsStr = degMatch ? gradient.slice(degMatch[0].length) : gradient
  if (degMatch) direction = parseFloat(degMatch[1])

  const stops: { offset: number; color: string }[] = []
  const re = /((?:rgba?|hsla?)\([^)]+\)|#[0-9a-fA-F]+|[a-zA-Z]+)\s+([\d.]+)%/g
  let m: RegExpExecArray | null
  while ((m = re.exec(stopsStr)) !== null) {
    stops.push({ offset: parseFloat(m[2]) / 100, color: m[1] })
  }
  return { direction, stops }
}

// ─── 텍스처 캐시 키 ──────────────────────────────────────────────────────────

// 텍스트 오브젝트의 Offscreen Canvas → Texture 캐시
interface TextTextureEntry {
  texture: Texture
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  lastText: string
  mesh: Mesh
}

const TEXT_RENDER_SCALE = 2


// ─── Renderer ────────────────────────────────────────────────────────────────

export class Renderer {
  private ogl: OGLRenderer
  private gl: OGLRenderingContext
  private camera: Camera
  private scene: Transform

  // 공용 지오메트리 (quad)
  private quadGeo!: Geometry

  // 프로그램 캐시
  private colorProgram!: Program
  private ellipseProgram!: Program
  private textureProgram!: Program
  private instancedProgram!: Program

  // Placeholder 색상 Program (에러 표시)
  private placeholderProgram!: Program

  // 공유 메쉬 (매 프레임 객체 생성 방지)
  private colorMesh!: Mesh
  private ellipseMesh!: Mesh
  private textureMesh!: Mesh
  private placeholderMesh!: Mesh

  // 상태 보존용 렌더 변수 (Model/View 매트릭스 계산용)
  private _modelMat = new Mat4()
  private _viewMat = new Mat4()
  private _tmpVec = new OglVec3()
  private _activeObj!: LveObject
  private _activeRenderW = 0
  private _activeRenderH = 0

  // 오브젝트별 Mesh 캐시
  private meshCache = new Map<string, Mesh>()

  // 그라디언트 텍스처 캐시 (gradient 키 → Texture)
  private _gradientTextureCache = new Map<string, Texture>()

  // 텍스트 텍스처 캐시 (id → TextTextureEntry)
  private textCache = new Map<string, TextTextureEntry>()

  // 텍스트 내용 기반 공유 캐시 (contentKey → TextTextureEntry)
  // 동일한 텍스트·스타일을 가진 객체끼리 Canvas/Texture를 공유하여 flush 횟수 감소
  private textContentCache = new Map<string, TextTextureEntry>()

  // 공유 텍스처 참조 카운트 (contentKey → 참조 중인 객체 수)
  private textContentRefCount = new Map<string, number>()

  // 카메라 미지정 시 렌더링할 텍스트 오브젝트 모의 객체
  private _noCameraText: any

  public removeTextEntry(id: string) {
    const entry = this.textCache.get(id)
    if (!entry) return

    const contentKey = (entry as any)._contentKey as string | undefined
    if (contentKey) {
      const count = this.textContentRefCount.get(contentKey) || 0
      if (count <= 1) {
        this.textContentRefCount.delete(contentKey)
        this.textContentCache.delete(contentKey)
        // OGL Texture 및 WebGL 리소스 정리
        if (entry.texture && (entry.texture as any).delete) {
          ; (entry.texture as any).delete()
        }
      } else {
        this.textContentRefCount.set(contentKey, count - 1)
      }
    }
    this.textCache.delete(id)
  }

  // 에셋 텍스처 캐시 (src → Texture)
  private assetTextureCache = new Map<string, Texture>()

  // 비디오 텍스처 캐시 (src → Texture) — 매 프레임 업데이트 필요
  private videoTextureCache = new Map<string, Texture>()

  // --- Auto-Batching State ---
  private readonly _batchMaxSize = 1000
  private _batchMat0!: Float32Array
  private _batchMat1!: Float32Array
  private _batchMat2!: Float32Array
  private _batchMat3!: Float32Array
  private _batchOpacityFlip!: Float32Array
  private _batchUVParams!: Float32Array
  private _batchCount = 0
  private _batchTexture: Texture | null = null
  private _batchBlendMode: string = 'source-over'
  private _currentBlendMode: string = ''
  private _instancedGeo!: Geometry
  private _instancedMesh!: Mesh

  // --- Z-Sort Cache (Dirty-Flag) ---
  /** 정렬 순서가 캐시된 객체 배열 (카메라 거리 기준 내림차순) */
  private _sortedObjects: LveObject[] = []
  /** true이면 다음 프레임에 재정렬 */
  private _sortDirty = true
  /** 마지막으로 정렬에 사용된 카메라 회전값 */
  private _lastCamRotX = 0
  private _lastCamRotY = 0
  private _lastCamRotZ = 0
  /** 마지막 정렬 시 객체 수 */
  private _lastObjCount = -1

  /** 원근 투영 초점 거리. 카메라 기본 Z는 -focalLength 로 설정됩니다. */
  readonly focalLength: number

  constructor(canvas: HTMLCanvasElement, focalLength: number = 100) {
    this.focalLength = focalLength

    const N = this._batchMaxSize
    this._batchMat0 = new Float32Array(N * 4)
    this._batchMat1 = new Float32Array(N * 4)
    this._batchMat2 = new Float32Array(N * 4)
    this._batchMat3 = new Float32Array(N * 4)
    this._batchOpacityFlip = new Float32Array(N * 2)
    this._batchUVParams = new Float32Array(N * 4)

    this.ogl = new OGLRenderer({
      canvas,
      width: canvas.width,
      height: canvas.height,
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    })
    this.gl = this.ogl.gl

    // 원근 투영 카메라: focalLength → FOV 변환
    // fov = 2 * atan(h/2 / focalLength)
    const fov = 2 * Math.atan(canvas.height / 2 / focalLength)
    this.camera = new Camera(this.gl, {
      fov: fov * 180 / Math.PI,
      aspect: canvas.width / canvas.height,
      near: 0.1,
      far: 100000,
    })
    // OGL 기본 카메라: -Z 방향을 바라봄 (OpenGL 규칙)
    // 구 시스템과 일치: obj.z > cam.z = 앞에 있음
    // camera.position.z = 0, lookAt 없음 → 기본 -Z 바라봄
    this.camera.position.z = 0

    this.scene = new Transform()

    this.quadGeo = createQuadGeometry(this.gl)
    this._initPrograms()
  }

  get width() { return this.ogl.width }
  get height() { return this.ogl.height }

  /**
   * Z-Sort 캐시를 무효화합니다.
   * 객체의 position.z 또는 zIndex가 변경될 때 World에서 호출합니다.
   */
  markSortDirty() {
    this._sortDirty = true
  }

  setSize(w: number, h: number) {
    this.ogl.setSize(w, h)
    // 원근 카메라 aspect 재설정
    const fov = 2 * Math.atan(h / 2 / this.focalLength)
    this.camera.perspective({
      fov: fov * 180 / Math.PI,
      aspect: w / h,
      near: 0.1,
      far: 100000,
    })
  }

  // ─── 프로그램 초기화 ─────────────────────────────────────────────────────

  private _initPrograms() {
    const gl = this.gl

    this.colorProgram = new Program(gl, {
      vertex: colorVertex,
      fragment: colorFragment,
      uniforms: {
        uColor: { value: [1, 1, 1, 1] },
        uOpacity: { value: 1 },
        uRadius: { value: 0 },
        uSize: { value: [1, 1] },
        uModelMatrix: { value: new Float32Array(16) },
        uViewMatrix: { value: new Float32Array(16) },
        uProjectionMatrix: { value: new Float32Array(16) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })

    this.ellipseProgram = new Program(gl, {
      vertex: ellipseVertex,
      fragment: ellipseFragment,
      uniforms: {
        uColor: { value: [1, 1, 1, 1] },
        uOpacity: { value: 1 },
        uModelMatrix: { value: new Float32Array(16) },
        uViewMatrix: { value: new Float32Array(16) },
        uProjectionMatrix: { value: new Float32Array(16) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })

    this.textureProgram = new Program(gl, {
      vertex: textureVertex,
      fragment: textureFragment,
      uniforms: {
        uTexture: { value: null },
        uOpacity: { value: 1 },
        uFlipY: { value: 0 },
        uUVOffset: { value: [0, 0] },
        uUVScale: { value: [1, 1] },
        uModelMatrix: { value: new Float32Array(16) },
        uViewMatrix: { value: new Float32Array(16) },
        uProjectionMatrix: { value: new Float32Array(16) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })

    this.instancedProgram = new Program(gl, {
      vertex: instancedVertex,
      fragment: instancedFragment,
      uniforms: {
        uTexture: { value: null },
        uViewMatrix: { value: new Float32Array(16) },
        uProjectionMatrix: { value: new Float32Array(16) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })

    this._instancedGeo = new Geometry(gl, {
      position: { size: 2, data: new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]) },
      uv: { size: 2, data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]) },
      index: { data: new Uint16Array([0, 1, 2, 0, 2, 3]) },
      instanceMat0: { instanced: 1, size: 4, data: this._batchMat0 },
      instanceMat1: { instanced: 1, size: 4, data: this._batchMat1 },
      instanceMat2: { instanced: 1, size: 4, data: this._batchMat2 },
      instanceMat3: { instanced: 1, size: 4, data: this._batchMat3 },
      instanceOpacityFlip: { instanced: 1, size: 2, data: this._batchOpacityFlip },
      instanceUVParams: { instanced: 1, size: 4, data: this._batchUVParams },
    });
    this._instancedMesh = new Mesh(gl, { geometry: this._instancedGeo, program: this.instancedProgram });

    // placeholder: 분홍 반투명
    this.placeholderProgram = new Program(gl, {
      vertex: colorVertex,
      fragment: colorFragment,
      uniforms: {
        uColor: { value: [1, 0.2, 0.4, 0.5] },
        uOpacity: { value: 1 },
        uRadius: { value: 0 },
        uSize: { value: [1, 1] },
        uModelMatrix: { value: new Float32Array(16) },
        uViewMatrix: { value: new Float32Array(16) },
        uProjectionMatrix: { value: new Float32Array(16) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })

    // ─── 공유 메쉬 초기화 ──────────────────────────────────────────────
    this.colorMesh = new Mesh(gl, { geometry: this.quadGeo, program: this.colorProgram })
    this.ellipseMesh = new Mesh(gl, { geometry: this.quadGeo, program: this.ellipseProgram })
    this.textureMesh = new Mesh(gl, { geometry: this.quadGeo, program: this.textureProgram })
    this.placeholderMesh = new Mesh(gl, { geometry: this.quadGeo, program: this.placeholderProgram })
  }

  // ─── 공개 렌더 메서드 ────────────────────────────────────────────────────

  render(objects: Set<LveObject>, assets: LoadedAssets = {}, timestamp: number = 0, activeCamera: LveObject | null = null) {
    if (!activeCamera) {
      // 검은 화면 (알림 목적)
      this.gl.clearColor(0, 0, 0, 1)
      this.gl.clear(this.gl.COLOR_BUFFER_BIT)
      this.gl.enable(this.gl.BLEND)

      this._currentBlendMode = '';
      this._setBlendMode('source-over');

      // 경고 텍스트 렌더링
      if (!this._noCameraText) {
        this._noCameraText = {
          attribute: { id: '__no_camera_warning__', type: 'text', text: 'No Camera' },
          style: { color: '#ff5555', fontSize: 24, textAlign: 'center', opacity: 1 },
          transform: {
            position: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1 },
            rotation: { z: 0 }
          },
          _dirtyTexture: true,
          _textureThrottleCount: 0,
          _textureIdleCount: 0
        }
      }
      this._drawText(this._noCameraText as LveObject, 0, 0, 1, timestamp)
      return
    }

    const camRotX = activeCamera.transform.rotation.x || 0
    const camRotY = activeCamera.transform.rotation.y || 0
    const camRotZ = activeCamera.transform.rotation.z || 0
    const camZ = activeCamera.transform.position.z

    // ─── View Matrix 빌드 (1회/프레임) ─────────────────────────
    this._buildViewMatrix(activeCamera)

    // ─── Z-Sort: Dirty-Flag 기반 캐시 ────────────────────
    // 카메라 이동만으로는 객체 간 dz 차이가 바뀌지 않으므로(cam 위치 항 소거됨)
    // 카메라 회전 or 객체 수 변화 or 외부 markSortDirty() 시에만 재정렬합니다.
    const rotChanged = camRotX !== this._lastCamRotX
      || camRotY !== this._lastCamRotY
      || camRotZ !== this._lastCamRotZ
    const countChanged = objects.size !== this._lastObjCount

    if (this._sortDirty || rotChanged || countChanged) {
      this._lastCamRotX = camRotX
      this._lastCamRotY = camRotY
      this._lastCamRotZ = camRotZ
      this._lastObjCount = objects.size
      this._sortDirty = false

      // 직접 Z 좌표 기준 정렬 (GPU View 연산으로 지처리)
      const sortedObjects: LveObject[] = []
      for (const o of objects) {
        if (
          o.attribute.type === 'camera' ||
          o.style.display === 'none'
        ) {
          continue
        }
        sortedObjects.push(o)
      }
      sortedObjects.sort((a, b) => {
        // 계층 구조 지원 _worldMatrix의 변환된 Z좌표 기준 정렬 (-1로 원상 복구)
        const mA = a._worldMatrix as unknown as Float32Array
        const mB = b._worldMatrix as unknown as Float32Array
        const zdiff = (-mB[14]) - (-mA[14])
        return zdiff !== 0 ? zdiff : a.style.zIndex - b.style.zIndex
      })
      this._sortedObjects = sortedObjects
    }

    // 화면 클리어
    this.gl.clearColor(0, 0, 0, 0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    this.gl.enable(this.gl.BLEND)

    // 블렌드상태 초기화
    this._currentBlendMode = '';
    this._setBlendMode('source-over');

    // 캐시된 순서로 렌더링
    // obj.z > camZ 인 것만 (카메라 앞에 있는 것)
    for (let i = 0, len = this._sortedObjects.length; i < len; i++) {
      const obj = this._sortedObjects[i]
      const mArr = obj._worldMatrix as unknown as Float32Array
      if (-mArr[14] <= camZ) continue
      this._drawObject(obj, assets, timestamp)
    }
    this._flushBatch()
  }

  // ─── 내부 오브젝트 렌더 ──────────────────────────────────────────────────

  private _drawObject(
    obj: LveObject,
    assets: LoadedAssets,
    timestamp: number,
  ) {
    const { style, transform } = obj

    const baseW = obj._renderedSize?.w ?? style.width ?? 0
    const baseH = obj._renderedSize?.h ?? style.height ?? 0

    // 변환(Scale 등)은 이미 _worldMatrix 내부에 계층적으로 완전 곱해져 있으므로
    // 기본 메시 구성은 스케일 1 수준인 base값만 던져주어 중복 연산을 배제합니다.
    const w = baseW
    const h = baseH

    // 현재 렌더링 상태 저장 (Model Matrix 계산용)
    this._activeObj = obj
    this._activeRenderW = w
    this._activeRenderH = h

    // _worldMatrix 기반 계산이므로, 더 이상 지역 x,y 속성이 개별 필요치 않습니다.
    const px = 0
    const py = 0

    const type = obj.attribute.type

    switch (type) {
      case 'rectangle':
        this._drawRectangle(obj, px, py, w, h)
        break
      case 'ellipse':
        this._drawEllipse(obj, px, py, w, h)
        break
      case 'text':
        this._drawText(obj, px, py, 1, timestamp)
        break
      case 'image':
        this._drawAsset(obj as LveImage, px, py, w, h, 1, assets)
        break
      case 'video':
        this._drawVideo(obj as LveVideo, px, py, w, h, 1, assets)
        break
      case 'sprite':
        this._drawSprite(obj as Sprite, px, py, w, h, 1, assets, timestamp)
        break
      case 'particle':
        this._drawParticle(obj as Particle, px, py, w, h, 1, assets, timestamp)
        break
      default:
        break
    }
  }

  // ─── 모델 행렬 헬퍼 ─────────────────────────────────────────────────────

  /**
   * 객체의 고유 TRS(Translation, Rotation, Scale, Pivot)만으로 Model Matrix를 생성합니다.
   * 카메라 정보는 View Matrix에서 처리됩니다.
   */
  private _makeModelMatrix(x: number, y: number, w: number, h: number, zOffset: number = 0): Float32Array {
    const obj = this._activeObj
    const pivot = obj.transform.pivot

    // 1. 객체의 _worldMatrix를 기반으로 시작합니다. (계층 회전, 이동, 크기 완벽 포함)
    this._modelMat.copy(obj._worldMatrix)

    // 2. 파티클 등 로컬단에서 발생하는 개별 위치 및 렌더 뎁스 추가
    if (x !== 0 || y !== 0 || zOffset !== 0) {
      this._tmpVec[0] = x; this._tmpVec[1] = y; this._tmpVec[2] = -zOffset;
      this._modelMat.translate(this._tmpVec)
    }

    // 3. 자식의 렌더 피벗 오프셋 처리. 모델 매트릭스에 이미 적용된 스케일보다 앞서서 로컬 좌표계 크기에 맞춘 위치 조작.
    this._tmpVec[0] = (0.5 - pivot.x) * w
    this._tmpVec[1] = -(0.5 - pivot.y) * h
    this._tmpVec[2] = 0
    this._modelMat.translate(this._tmpVec)

    // 4. 메시 사이즈 확보를 위한 기본 쿼드 스케일링
    this._tmpVec[0] = w; this._tmpVec[1] = h; this._tmpVec[2] = 1
    this._modelMat.scale(this._tmpVec)

    return this._modelMat as unknown as Float32Array
  }

  /**
   * View Matrix를 직접 계산하여 모든 Program에 업로드합니다.
   * OGL camera.viewMatrix에 의존하지 않고 _viewMat에 직접 구성합니다.
   *
   * 좌표계: obj.z > cam.z = 카메라 앞 (구 시스템과 동일)
   * 모델 z = -obj.z 이므로, 카메라 역변환 z = +camZ
   */
  private _buildViewMatrix(cam: LveObject) {
    const pos = cam.transform.position
    const rot = cam.transform.rotation

    this._viewMat.identity()

    // 1. 카메라 회전 역변환
    if (rot.y) this._viewMat.rotate(-rot.y * Math.PI / 180, AXIS_Y)
    if (rot.x) this._viewMat.rotate(-rot.x * Math.PI / 180, AXIS_X)
    if (rot.z) this._viewMat.rotate(-rot.z * Math.PI / 180, AXIS_Z)

    // 2. 카메라 위치 역변환
    // 카메라 world z = -camZ (네게이트된 공간), 역변환 z = +camZ
    this._tmpVec[0] = -pos.x
    this._tmpVec[1] = -pos.y
    this._tmpVec[2] = pos.z
    this._viewMat.translate(this._tmpVec)

    const vm = this._viewMat as unknown as Float32Array
    this.colorProgram.uniforms['uViewMatrix'].value = vm
    this.ellipseProgram.uniforms['uViewMatrix'].value = vm
    this.textureProgram.uniforms['uViewMatrix'].value = vm
    this.instancedProgram.uniforms['uViewMatrix'].value = vm
    this.placeholderProgram.uniforms['uViewMatrix'].value = vm
  }

  /** ogl 카메라의 projectionMatrix를 Float32Array로 반환 */
  private _projMatrix(): Float32Array {
    return this.camera.projectionMatrix as unknown as Float32Array
  }

  private _setBlendMode(mode: string = 'source-over') {
    if (this._currentBlendMode === mode) return;
    this._currentBlendMode = mode;

    const gl = this.gl;
    let eq: number = gl.FUNC_ADD;
    let src: number = gl.SRC_ALPHA;
    let dst: number = gl.ONE_MINUS_SRC_ALPHA;
    let srcA: number = gl.ONE;
    let dstA: number = gl.ONE_MINUS_SRC_ALPHA;

    switch (mode) {
      case 'source-over':
        src = gl.SRC_ALPHA; dst = gl.ONE_MINUS_SRC_ALPHA;
        srcA = gl.ONE; dstA = gl.ONE_MINUS_SRC_ALPHA;
        break;
      case 'source-in':
        src = gl.DST_ALPHA; dst = gl.ZERO;
        srcA = gl.DST_ALPHA; dstA = gl.ZERO;
        break;
      case 'source-out':
        src = gl.ONE_MINUS_DST_ALPHA; dst = gl.ZERO;
        srcA = gl.ONE_MINUS_DST_ALPHA; dstA = gl.ZERO;
        break;
      case 'source-atop':
        src = gl.DST_ALPHA; dst = gl.ONE_MINUS_SRC_ALPHA;
        srcA = gl.DST_ALPHA; dstA = gl.ONE_MINUS_SRC_ALPHA;
        break;
      case 'destination-over':
        src = gl.ONE_MINUS_DST_ALPHA; dst = gl.ONE;
        srcA = gl.ONE_MINUS_DST_ALPHA; dstA = gl.ONE;
        break;
      case 'destination-in':
        src = gl.ZERO; dst = gl.SRC_ALPHA;
        srcA = gl.ZERO; dstA = gl.SRC_ALPHA;
        break;
      case 'destination-out':
        src = gl.ZERO; dst = gl.ONE_MINUS_SRC_ALPHA;
        srcA = gl.ZERO; dstA = gl.ONE_MINUS_SRC_ALPHA;
        break;
      case 'lighter':
        src = gl.SRC_ALPHA; dst = gl.ONE;
        srcA = gl.ONE; dstA = gl.ONE;
        break;
      case 'copy':
        src = gl.ONE; dst = gl.ZERO;
        srcA = gl.ONE; dstA = gl.ZERO;
        break;
      case 'xor':
        src = gl.ONE_MINUS_DST_ALPHA; dst = gl.ONE_MINUS_SRC_ALPHA;
        srcA = gl.ONE_MINUS_DST_ALPHA; dstA = gl.ONE_MINUS_SRC_ALPHA;
        break;
      case 'multiply':
        src = gl.DST_COLOR; dst = gl.ONE_MINUS_SRC_ALPHA;
        srcA = gl.DST_COLOR; dstA = gl.ONE_MINUS_SRC_ALPHA;
        break;
      case 'screen':
        src = gl.ONE; dst = gl.ONE_MINUS_SRC_COLOR;
        srcA = gl.ONE; dstA = gl.ONE_MINUS_SRC_COLOR;
        break;
      case 'lighten': {
        const ext = gl.getExtension('EXT_blend_minmax');
        eq = (gl as any).MAX ?? (ext ? (ext as any).MAX_EXT : gl.FUNC_ADD) ?? gl.FUNC_ADD;
        src = gl.ONE; dst = gl.ONE;
        srcA = gl.ONE; dstA = gl.ONE;
        break;
      }
      case 'darken': {
        const ext = gl.getExtension('EXT_blend_minmax');
        eq = (gl as any).MIN ?? (ext ? (ext as any).MIN_EXT : gl.FUNC_ADD) ?? gl.FUNC_ADD;
        src = gl.ONE; dst = gl.ONE;
        srcA = gl.ONE; dstA = gl.ONE;
        break;
      }
      case 'overlay':
      case 'color-dodge':
      case 'color-burn':
      case 'hard-light':
      case 'soft-light':
      case 'difference':
      case 'exclusion':
        if (mode === 'exclusion' || mode === 'difference') {
          src = gl.ONE_MINUS_DST_COLOR; dst = gl.ONE_MINUS_SRC_COLOR;
          srcA = gl.ONE_MINUS_DST_COLOR; dstA = gl.ONE_MINUS_SRC_COLOR;
        } else {
          src = gl.SRC_ALPHA; dst = gl.ONE_MINUS_SRC_ALPHA;
          srcA = gl.ONE; dstA = gl.ONE_MINUS_SRC_ALPHA;
        }
        break;
      default:
        break;
    }

    gl.blendEquation(eq);
    gl.blendFuncSeparate(src, dst, srcA, dstA);
  }

  // ─── Program uniform 드로우 헬퍼 ─────────────────────────────────────────

  private _flushBatch() {
    if (this._batchCount === 0 || !this._batchTexture) return;

    this.instancedProgram.uniforms['uTexture'].value = this._batchTexture;
    this.instancedProgram.uniforms['uProjectionMatrix'].value = this._projMatrix();

    this._setBlendMode(this._batchBlendMode);

    const gl = this.gl
    const geo = this._instancedGeo;
    geo.instancedCount = this._batchCount;

    // OGL의 needsUpdate는 attr.data 전체(최대 1000개분)를 bufferSubData로 업로드합니다.
    // bufferSubData의 srcOffset, length 인자로 실제 batchCount 범위만 GPU에 전송합니다.
    const n = this._batchCount
    const uploadSubData = (attr: any, data: Float32Array, stride: number) => {
      // attr.buffer는 OGL의 addAttribute 시점에 이미 생성·등록되어 있음
      gl.bindBuffer(gl.ARRAY_BUFFER, attr.buffer)
        // OGL의 state 캐시와 동기화 (직접 bindBuffer 호출을 OGL이 인지하도록)
        ; (gl as any).renderer.state.boundBuffer = attr.buffer
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, n * stride)
    }

    uploadSubData(geo.attributes.instanceMat0, this._batchMat0, 4)
    uploadSubData(geo.attributes.instanceMat1, this._batchMat1, 4)
    uploadSubData(geo.attributes.instanceMat2, this._batchMat2, 4)
    uploadSubData(geo.attributes.instanceMat3, this._batchMat3, 4)
    uploadSubData(geo.attributes.instanceOpacityFlip, this._batchOpacityFlip, 2)
    uploadSubData(geo.attributes.instanceUVParams, this._batchUVParams, 4)

    this._instancedMesh.draw({ camera: this.camera });

    this._batchCount = 0;
    this._batchTexture = null;
  }

  private _drawColorMesh(
    program: Program,
    x: number, y: number, w: number, h: number,
    color: string, opacity: number,
  ) {
    this._flushBatch();
    this._setBlendMode(this._activeObj?.style?.blendMode ?? 'source-over');
    const [r, g, b, a] = parseCSSColor(color)
    program.uniforms['uColor'].value = [r, g, b, a]
    program.uniforms['uOpacity'].value = opacity
    program.uniforms['uModelMatrix'].value = this._makeModelMatrix(x, y, w, h)
    program.uniforms['uProjectionMatrix'].value = this._projMatrix()

    this.colorMesh.draw({ camera: this.camera })
  }

  private _drawTextureMesh(
    texture: Texture,
    x: number, y: number, w: number, h: number,
    opacity: number,
    flipY = false,
    uvOffset: [number, number] = [0, 0],
    uvScale: [number, number] = [1, 1],
    zOffset: number = 0
  ) {
    const blendMode = this._activeObj?.style?.blendMode ?? 'source-over';

    if (this._batchTexture !== texture || this._batchBlendMode !== blendMode || this._batchCount >= this._batchMaxSize) {
      this._flushBatch();
    }

    this._batchTexture = texture;
    this._batchBlendMode = blendMode;

    const m = this._makeModelMatrix(x, y, w, h, zOffset);
    const idx = this._batchCount;
    const idx4 = idx * 4;
    const idx2 = idx * 2;

    this._batchMat0[idx4] = m[0]; this._batchMat0[idx4 + 1] = m[1]; this._batchMat0[idx4 + 2] = m[2]; this._batchMat0[idx4 + 3] = m[3];
    this._batchMat1[idx4] = m[4]; this._batchMat1[idx4 + 1] = m[5]; this._batchMat1[idx4 + 2] = m[6]; this._batchMat1[idx4 + 3] = m[7];
    this._batchMat2[idx4] = m[8]; this._batchMat2[idx4 + 1] = m[9]; this._batchMat2[idx4 + 2] = m[10]; this._batchMat2[idx4 + 3] = m[11];
    this._batchMat3[idx4] = m[12]; this._batchMat3[idx4 + 1] = m[13]; this._batchMat3[idx4 + 2] = m[14]; this._batchMat3[idx4 + 3] = m[15];

    this._batchOpacityFlip[idx2] = opacity;
    this._batchOpacityFlip[idx2 + 1] = flipY ? 1 : 0;

    this._batchUVParams[idx4] = uvOffset[0];
    this._batchUVParams[idx4 + 1] = uvOffset[1];
    this._batchUVParams[idx4 + 2] = uvScale[0];
    this._batchUVParams[idx4 + 3] = uvScale[1];

    this._batchCount++;
  }

  // ─── Rectangle ──────────────────────────────────────────────────────────

  private _drawRectangle(obj: LveObject, x: number, y: number, w: number, h: number) {
    const { style } = obj
    if (!style.color && !style.gradient && !style.borderColor && !style.outlineColor) return

    const targetOpacity = style.opacity * obj._fadeOpacity

    // outline 먼저 (border 바깥)
    if (style.outlineColor && (style.outlineWidth ?? 0) > 0) {
      const bw = (style.borderWidth ?? 0)
      const ow = style.outlineWidth!
      this._drawColorMesh(this.colorProgram, x, y, w + bw * 2 + ow * 2, h + bw * 2 + ow * 2, style.outlineColor, targetOpacity)
    }

    // 테두리 (border)
    if (style.borderColor && (style.borderWidth ?? 0) > 0) {
      const bw = style.borderWidth!
      this._drawColorMesh(this.colorProgram, x, y, w + bw * 2, h + bw * 2, style.borderColor, targetOpacity)
    }

    // 본체 color
    if (style.color) {
      this._drawColorMesh(this.colorProgram, x, y, w, h, style.color, targetOpacity)
    }

    // 그라디언트 레이어 (color 위에 덮어씬움)
    if (style.gradient && w > 0 && h > 0) {
      const tex = this._makeGradientTexture(w, h, style.gradient, style.gradientType ?? 'linear', false)
      if (tex) this._drawTextureMesh(tex, x, y, w, h, targetOpacity)
    }
  }

  // ─── Ellipse ────────────────────────────────────────────────────────────

  private _drawEllipse(obj: LveObject, x: number, y: number, w: number, h: number) {
    this._flushBatch();
    this._setBlendMode(this._activeObj?.style?.blendMode ?? 'source-over');
    const { style } = obj
    if (!style.color && !style.gradient && !style.borderColor && !style.outlineColor) return

    const drawEllipse = (ew: number, eh: number, color: string) => {
      const [r, g, b, a] = parseCSSColor(color)
      this.ellipseProgram.uniforms['uColor'].value = [r, g, b, a]
      this.ellipseProgram.uniforms['uOpacity'].value = style.opacity * obj._fadeOpacity
      this.ellipseProgram.uniforms['uModelMatrix'].value = this._makeModelMatrix(x, y, ew, eh)
      this.ellipseProgram.uniforms['uProjectionMatrix'].value = this._projMatrix()
      this.ellipseMesh.draw({ camera: this.camera })
    }

    // outline 먼저 (border 바깥)
    if (style.outlineColor && (style.outlineWidth ?? 0) > 0) {
      const bw = (style.borderWidth ?? 0)
      const ow = style.outlineWidth!
      drawEllipse(w + bw * 2 + ow * 2, h + bw * 2 + ow * 2, style.outlineColor)
    }

    // 테두리 (border)
    if (style.borderColor && (style.borderWidth ?? 0) > 0) {
      const bw = style.borderWidth!
      drawEllipse(w + bw * 2, h + bw * 2, style.borderColor)
    }

    // 본체 color
    if (style.color) {
      drawEllipse(w, h, style.color)
    }

    // 그라디언트 레이어 — ellipse 형태에 맞게 원형 클리핑 포함
    if (style.gradient && w > 0 && h > 0) {
      const tex = this._makeGradientTexture(w, h, style.gradient, style.gradientType ?? 'linear', true)
      if (tex) this._drawTextureMesh(tex, x, y, w, h, style.opacity * obj._fadeOpacity)
    }
  }

  // ─── Text (Offscreen Canvas → Texture) ──────────────────────────────────

  private _drawText(obj: LveObject, x: number, y: number, perspectiveScale: number, _timestamp: number) {
    const { style, attribute } = obj
    const id = obj.attribute.id
    const rawText = attribute.text ?? ''

    // 2x supersampling: z 애니메이션 중 canvas 재생성 없이 화질 확보
    const baseFontSize = (style.fontSize ?? 16)
    const maxW = style.width != null ? style.width * TEXT_RENDER_SCALE : null
    const maxH = style.height != null ? style.height * TEXT_RENDER_SCALE : null

    // content 기반 캐시 키 — 렌더링 결과가 동일한 조건들을 조합
    const contentKey = `${rawText}|${baseFontSize}|${style.fontFamily ?? ''}|${style.fontWeight ?? ''}|${style.fontStyle ?? ''}|${style.color ?? ''}|${style.borderColor ?? ''}|${style.borderWidth ?? 0}|${style.textAlign ?? ''}|${style.lineHeight ?? 1}|${style.letterSpacing ?? 0}|${maxW ?? ''}|${maxH ?? ''}|${style.shadowColor ?? ''}|${style.shadowBlur ?? 0}|${style.shadowOffsetX ?? 0}|${style.shadowOffsetY ?? 0}`

    let entry = this.textCache.get(id)

    // 스로틄: 마지막 렌더 이후 프레임 카운터 증가
    obj._textureThrottleCount++
    // 디바운스: dirty 상태일 때만 idle 카운터 증가
    if (obj._dirtyTexture) obj._textureIdleCount++

    const needRender = !entry
      || (obj._dirtyTexture && (
        obj._textureIdleCount >= TEXTURE_DEBOUNCE_FRAMES    // 디바운스: K프레임 동안 변경 없음 → 마무리
        || obj._textureThrottleCount >= TEXTURE_THROTTLE_FRAMES // 스로틀링: N프레임 초과 → 강제 업데이트
      ))

    if (!entry) {
      // content 캐시 히트: 동일 내용의 기존 entry 공유
      const shared = this.textContentCache.get(contentKey)
      if (shared) {
        entry = shared
        this.textCache.set(id, entry)
        const refCount = this.textContentRefCount.get(contentKey) || 0
        this.textContentRefCount.set(contentKey, refCount + 1)
        obj._dirtyTexture = false
        obj._textureIdleCount = 0
        obj._textureThrottleCount = 0
      } else {
        // 새 Canvas/Texture 생성
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        const texture = new Texture(this.gl, { image: canvas, generateMipmaps: false })
        const mesh = new Mesh(this.gl, { geometry: this.quadGeo, program: this.textureProgram })
        entry = { texture, canvas, ctx, lastText: '', mesh }
          ; (entry as any)._contentKey = contentKey
        this.textCache.set(id, entry)
        this.textContentCache.set(contentKey, entry)
        this.textContentRefCount.set(contentKey, 1)
      }
    }

    if (needRender) {
      // 스타일이 변경된 경우 기존 contentKey로의 공유를 무효화하고 새 entry 생성
      const prevContentKey = (entry as any)._contentKey as string | undefined
      if (prevContentKey && prevContentKey !== contentKey) {
        // 이전 캐시 참조 해제
        const prevCount = this.textContentRefCount.get(prevContentKey) || 0
        if (prevCount <= 1) {
          this.textContentRefCount.delete(prevContentKey)
          this.textContentCache.delete(prevContentKey)
          if (entry.texture && (entry.texture as any).delete) {
            ; (entry.texture as any).delete()
          }
        } else {
          this.textContentRefCount.set(prevContentKey, prevCount - 1)
        }

        // 이 entry를 다른 객체도 공유 중일 수 있으므로(ref count > 1) 항상 새 entry를 만들어 교체
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        const texture = new Texture(this.gl, { image: canvas, generateMipmaps: false })
        const mesh = new Mesh(this.gl, { geometry: this.quadGeo, program: this.textureProgram })
        entry = { texture, canvas, ctx, lastText: '', mesh }
        this.textCache.set(id, entry)
      }

      ; (entry as any)._contentKey = contentKey
      this._renderTextToCanvas(entry, rawText, style, baseFontSize, maxW, maxH, (obj as any)._transitionProgress ?? 1)

      // content 캐시 신규 등록 또는 업데이트
      this.textContentCache.set(contentKey, entry)
      if (prevContentKey !== contentKey) {
        // 새로 생성되었거나 키가 바뀐 경우 ref count 증가
        const refCount = this.textContentRefCount.get(contentKey) || 0
        this.textContentRefCount.set(contentKey, refCount + 1)
      }
      obj._dirtyTexture = false
      obj._textureIdleCount = 0
      obj._textureThrottleCount = 0  // 렌더 후 양쪽 리셋
    }

    const cw = entry.canvas.width
    const ch = entry.canvas.height
    if (cw === 0 || ch === 0) return

    // 실제 월드 크기 기록 (TEXT_RENDER_SCALE 역산)
    // scale은 _worldMatrix에 이미 포함되어 있으므로 여기서 곱하지 않음
    obj._renderedSize = {
      w: cw / TEXT_RENDER_SCALE,
      h: ch / TEXT_RENDER_SCALE,
    }

    // canvas는 TEXT_RENDER_SCALE 기준, 표시는 perspectiveScale 기준으로 보정
    const displayScale = perspectiveScale / TEXT_RENDER_SCALE
    this._drawTextureMesh(entry.texture, x, y, cw * displayScale, ch * displayScale, style.opacity * obj._fadeOpacity, false)
  }

  private _renderTextToCanvas(
    entry: TextTextureEntry,
    rawText: string,
    style: LveObject['style'],
    baseFontSize: number,
    maxW: number | null,
    maxH: number | null,
    transitionProgress: number = 1,
  ) {
    const { canvas, ctx } = entry
    const fontFamily = style.fontFamily ?? 'sans-serif'
    const baseFontWeight = style.fontWeight ?? 'normal'
    const baseFontStyle = style.fontStyle ?? 'normal'
    const baseColor = style.color ?? '#000000'
    const lineHeightMul = style.lineHeight ?? 1
    const textAlign = style.textAlign ?? 'left'

    const spans = parseTextMarkup(rawText, {
      fontSize: baseFontSize,
      fontWeight: baseFontWeight,
      fontStyle: baseFontStyle,
      color: baseColor,
      borderColor: style.borderColor,
      borderWidth: style.borderWidth,
      letterSpacing: style.letterSpacing,
    })

    // shadow 지원: Canvas 2D에서 그대로 구현
    const shadowColor = style.shadowColor
    const shadowBlur = (style.shadowBlur ?? 0) * TEXT_RENDER_SCALE
    const shadowOffsetX = (style.shadowOffsetX ?? 0) * TEXT_RENDER_SCALE
    const shadowOffsetY = (style.shadowOffsetY ?? 0) * TEXT_RENDER_SCALE

    // ── 논리 줄 → word-wrap 렌더 줄 계산 ─────────────────────────────
    interface RenderToken { text: string; span: ReturnType<typeof parseTextMarkup>[number] }
    interface RenderLine { tokens: RenderToken[]; lineH: number }

    const spaceRe = /(\S+|\s+)/g
    const renderLines: RenderLine[] = []
    const logicalLines: RenderToken[][] = [[]]

    for (const span of spans) {
      const parts = span.text.split('\n')
      parts.forEach((p, i) => {
        if (i > 0) logicalLines.push([])
        if (p) logicalLines[logicalLines.length - 1].push({ text: p, span })
      })
    }

    // sizes-only canvas for measuring
    canvas.width = 2
    canvas.height = 2

    for (const logLine of logicalLines) {
      let curLine: RenderToken[] = []
      let curW = 0
      let curH = baseFontSize * TEXT_RENDER_SCALE * lineHeightMul

      const flushLine = () => {
        if (curLine.length > 0 || renderLines.length === 0) {
          renderLines.push({ tokens: curLine, lineH: curH })
        }
        curLine = []
        curW = 0
        curH = baseFontSize * TEXT_RENDER_SCALE * lineHeightMul
      }

      if (logLine.length === 0) {
        renderLines.push({ tokens: [], lineH: baseFontSize * TEXT_RENDER_SCALE * lineHeightMul })
        continue
      }

      for (const token of logLine) {
        const fs = (token.span.style.fontSize ?? baseFontSize) * TEXT_RENDER_SCALE
        const fw = token.span.style.fontWeight ?? baseFontWeight
        const fi = token.span.style.fontStyle ?? baseFontStyle
        const ls = (token.span.style.letterSpacing ?? style.letterSpacing ?? 0) * TEXT_RENDER_SCALE
        curH = Math.max(curH, fs * lineHeightMul)
        ctx.font = `${fi} ${fw} ${fs}px ${fontFamily}`
        ctx.letterSpacing = `${ls}px`

        if (maxW === null) {
          curLine.push(token)
        } else {
          const words = token.text.match(spaceRe) ?? [token.text]
          for (const word of words) {
            const wordW = ctx.measureText(word).width
            if (curW > 0 && curW + wordW > maxW) flushLine()
            curLine.push({ text: word, span: token.span })
            curW += wordW
          }
        }
      }
      flushLine()
    }

    const measuredWidths = renderLines.map(rl => {
      let w = 0
      for (const tok of rl.tokens) {
        const fs = (tok.span.style.fontSize ?? baseFontSize) * TEXT_RENDER_SCALE
        const fw = tok.span.style.fontWeight ?? baseFontWeight
        const fi = tok.span.style.fontStyle ?? baseFontStyle
        const ls = (tok.span.style.letterSpacing ?? style.letterSpacing ?? 0) * TEXT_RENDER_SCALE
        ctx.font = `${fi} ${fw} ${fs}px ${fontFamily}`
        ctx.letterSpacing = `${ls}px`
        w += ctx.measureText(tok.text).width
      }
      return w
    })

    const containerW = maxW ?? Math.max(...measuredWidths, 0)
    const totalH = renderLines.reduce((s, r) => s + r.lineH, 0)

    let maxBorderWidth = 0
    for (const span of spans) {
      if (span.style.borderColor) {
        maxBorderWidth = Math.max(maxBorderWidth, (span.style.borderWidth ?? 1) * TEXT_RENDER_SCALE)
      }
    }

    const canvasW = Math.ceil(maxW ?? containerW) + shadowBlur * 2 + Math.abs(shadowOffsetX) + maxBorderWidth * 2
    const canvasH = Math.ceil(maxH ?? totalH) + shadowBlur * 2 + Math.abs(shadowOffsetY) + maxBorderWidth * 2

    canvas.width = canvasW
    canvas.height = canvasH
    ctx.clearRect(0, 0, canvasW, canvasH)

    if (shadowColor) {
      ctx.shadowColor = shadowColor
      ctx.shadowBlur = shadowBlur
      ctx.shadowOffsetX = shadowOffsetX
      ctx.shadowOffsetY = shadowOffsetY
    }

    const originX = shadowBlur + Math.max(0, shadowOffsetX) / 2 + maxBorderWidth
    const originY = shadowBlur + Math.max(0, shadowOffsetY) / 2 + maxBorderWidth

    let curY = originY
    for (let li = 0; li < renderLines.length; li++) {
      const rl = renderLines[li]
      const lineW = measuredWidths[li]
      let lineStartX: number
      if (textAlign === 'center') lineStartX = originX + (containerW - lineW) / 2
      else if (textAlign === 'right') lineStartX = originX + containerW - lineW
      else lineStartX = originX

      let penX = lineStartX
      const baseline = curY + rl.lineH * 0.8

      for (const tok of rl.tokens) {
        const fs = (tok.span.style.fontSize ?? baseFontSize) * TEXT_RENDER_SCALE
        const fw = tok.span.style.fontWeight ?? baseFontWeight
        const fi = tok.span.style.fontStyle ?? baseFontStyle
        const fc = tok.span.style.color ?? baseColor
        const bc = tok.span.style.borderColor
        const bw = (tok.span.style.borderWidth ?? 1) * TEXT_RENDER_SCALE
        const ls = (tok.span.style.letterSpacing ?? style.letterSpacing ?? 0) * TEXT_RENDER_SCALE

        ctx.font = `${fi} ${fw} ${fs}px ${fontFamily}`
        ctx.letterSpacing = `${ls}px`

        if (bc) {
          ctx.lineJoin = 'round'
          ctx.miterLimit = 2
          ctx.strokeStyle = bc
          ctx.lineWidth = bw * 2
          ctx.strokeText(tok.text, penX, baseline)
        }

        ctx.fillStyle = fc
        ctx.fillText(tok.text, penX, baseline)
        penX += ctx.measureText(tok.text).width
      }
      curY += rl.lineH
    }

    if (transitionProgress < 1) {
      ctx.globalCompositeOperation = 'destination-out'
      const totalLines = renderLines.length
      let lineTopY = 0

      for (let li = 0; li < renderLines.length; li++) {
        const rl = renderLines[li]
        // 마지막 줄이면 남은 캔버스 높이까지 모두 포괄
        const lineBottomY = (li === totalLines - 1) ? canvasH : lineTopY + rl.lineH

        // 이 줄의 로컬 진행도 (0 ~ 1)
        const lineProgress = Math.min(1, Math.max(0, transitionProgress * totalLines - li))

        if (lineProgress === 0) {
          // 시작도 안 함: 이 줄 영역을 완전히 지움
          ctx.fillStyle = 'rgba(0,0,0,1)'
          ctx.fillRect(0, lineTopY, canvasW, lineBottomY - lineTopY)
        } else if (lineProgress < 1) {
          // 절반쯤 진행 중: 진행도에 따라 우측 영역을 부드럽게 지우기 (그라데이션)
          const gradLineW = canvasW * 0.3
          const revealX = (canvasW + gradLineW) * lineProgress - gradLineW

          const grad = ctx.createLinearGradient(revealX, 0, revealX + gradLineW, 0)
          grad.addColorStop(0, 'rgba(0,0,0,0)') // 왼쪽(이미 드러난 부분)은 지우지 않음
          grad.addColorStop(1, 'rgba(0,0,0,1)') // 오른쪽(아직 안 드러난 부분)은 완전히 지움

          ctx.fillStyle = grad
          ctx.fillRect(0, lineTopY, canvasW, lineBottomY - lineTopY)
        }

        lineTopY += rl.lineH
      }

      ctx.globalCompositeOperation = 'source-over'
    }

    // Texture 업데이트
    entry.texture.image = canvas
    entry.texture.needsUpdate = true
  }

  // ─── Image ──────────────────────────────────────────────────────────────

  private _drawAsset(obj: LveImage, x: number, y: number, w: number, h: number, perspectiveScale: number, assets: LoadedAssets) {
    const src = obj._src
    const oldSrc = obj._transitionOldSrc
    const progress = obj._transitionProgress ?? 0

    const drawAssetInner = (assetSrc: string, drawOpacity: number) => {
      const asset = assets[assetSrc]
      if (!asset || !(asset instanceof HTMLImageElement)) {
        if (!oldSrc || assetSrc === src) {
          this._drawPlaceholder(x, y, w || 60, h || 60)
        }
        return
      }

      let drawW: number, drawH: number;
      if (w && !h) {
        drawW = w;
        drawH = w * (asset.naturalHeight / asset.naturalWidth);
      } else if (!w && h) {
        drawW = h * (asset.naturalWidth / asset.naturalHeight);
        drawH = h;
      } else {
        drawW = w || asset.naturalWidth * perspectiveScale;
        drawH = h || asset.naturalHeight * perspectiveScale;
      }

      obj._renderedSize = {
        w: drawW / perspectiveScale,
        h: drawH / perspectiveScale,
      }

      const texture = this._getOrCreateAssetTexture(assetSrc, asset)
      this._drawTextureMesh(texture, x, y, drawW, drawH, drawOpacity, false)
    }

    // 트랜지션 중이면 이전 이미지와 새 이미지를 모두 그린다
    if (oldSrc) {
      drawAssetInner(oldSrc, obj.style.opacity * obj._fadeOpacity * (1 - progress))
      if (src) {
        drawAssetInner(src, obj.style.opacity * obj._fadeOpacity * progress)
      }
    } else if (src) {
      drawAssetInner(src, obj.style.opacity * obj._fadeOpacity)
    } else {
      this._drawPlaceholder(x, y, w || 60, h || 60)
    }
  }

  // ─── Video ──────────────────────────────────────────────────────────────

  private _drawVideo(obj: LveVideo, x: number, y: number, w: number, h: number, perspectiveScale: number, assets: LoadedAssets) {
    const src = obj._src
    const asset = src ? assets[src] : undefined
    if (!asset || !(asset instanceof HTMLVideoElement)) {
      this._drawPlaceholder(x, y, w || 60, h || 60)
      return
    }

    // 객체에서 속성(currentTime 등)을 조작하기 위해 엘리먼트 참조 주입
    obj._videoElement = asset

    const clip = obj._clip

    if (obj._playing) {
      if (clip) {
        asset.loop = clip.loop
        if (obj._needsSeekToStart && clip.start != null) {
          asset.currentTime = clip.start / 1000
          obj._needsSeekToStart = false
        }
      }
      if (asset.paused) asset.play().catch(() => { })
    } else {
      if (!asset.paused) asset.pause()
    }

    // 사용자 명시적 seek — clip.start보다 뒤에 적용하여 항상 우선
    if (obj._pendingSeek !== null) {
      asset.currentTime = obj._pendingSeek
      obj._pendingSeek = null
    }

    if (clip?.end != null && asset.currentTime >= clip.end / 1000) {
      if (clip.loop) {
        asset.currentTime = (clip.start ?? 0) / 1000
        obj._onRepeat()
      } else {
        asset.pause()
        obj._onEnded()
      }
    }

    // style.width/height 미지정 시 videoSize에 perspectiveScale 적용
    // scale은 _worldMatrix에 이미 포함되어 있으므로 여기서 곱하지 않음
    let drawW: number, drawH: number;
    if (w && !h) {
      drawW = w;
      drawH = w * (asset.videoHeight / asset.videoWidth);
    } else if (!w && h) {
      drawW = h * (asset.videoWidth / asset.videoHeight);
      drawH = h;
    } else {
      drawW = w || asset.videoWidth * perspectiveScale;
      drawH = h || asset.videoHeight * perspectiveScale;
    }

    obj._renderedSize = {
      w: drawW / perspectiveScale,
      h: drawH / perspectiveScale,
    }

    // 비디오 텍스처는 매 프레임 업데이트
    let tex = this.videoTextureCache.get(src!)
    if (!tex) {
      tex = new Texture(this.gl, { image: asset, generateMipmaps: false })
      this.videoTextureCache.set(src!, tex)
    }
    tex.image = asset
    tex.needsUpdate = true

    this._drawTextureMesh(tex, x, y, drawW, drawH, obj.style.opacity * obj._fadeOpacity)
  }

  // ─── Sprite ─────────────────────────────────────────────────────────────

  private _drawSprite(sprite: Sprite, x: number, y: number, w: number, h: number, perspectiveScale: number, assets: LoadedAssets, timestamp: number) {
    sprite.tick(timestamp)

    const clip = sprite._clip
    const src = clip?.src
    if (!src) return

    const asset = assets[src]
    if (!asset || !(asset instanceof HTMLImageElement)) {
      this._drawPlaceholder(x, y, w || 60, h || 60)
      return
    }

    const texture = this._getOrCreateAssetTexture(src, asset)

    if (!clip) {
      // scale은 _worldMatrix에 이미 포함되어 있으므로 여기서 곱하지 않음
      let drawW: number, drawH: number;
      if (w && !h) {
        drawW = w;
        drawH = w * (asset.naturalHeight / asset.naturalWidth);
      } else if (!w && h) {
        drawW = h * (asset.naturalWidth / asset.naturalHeight);
        drawH = h;
      } else {
        drawW = w || asset.naturalWidth * perspectiveScale;
        drawH = h || asset.naturalHeight * perspectiveScale;
      }
      this._drawTextureMesh(texture, x, y, drawW, drawH, sprite.style.opacity * sprite._fadeOpacity)
      return
    }

    const { frameWidth, frameHeight } = clip
    const sheetCols = Math.floor(asset.naturalWidth / frameWidth)
    const frameIdx = sprite._currentFrame
    const col = frameIdx % sheetCols
    const row = Math.floor(frameIdx / sheetCols)
    const uvScaleX = frameWidth / asset.naturalWidth
    const uvScaleY = frameHeight / asset.naturalHeight
    const uvOffsetX = col * uvScaleX
    const uvOffsetY = 1.0 - (row + 1) * uvScaleY

    // scale은 _worldMatrix에 이미 포함되어 있으므로 여기서 곱하지 않음
    let drawW: number, drawH: number;
    if (w && !h) {
      drawW = w;
      drawH = w * (frameHeight / frameWidth);
    } else if (!w && h) {
      drawW = h * (frameWidth / frameHeight);
      drawH = h;
    } else {
      drawW = w || frameWidth * perspectiveScale;
      drawH = h || frameHeight * perspectiveScale;
    }

    this._drawTextureMesh(
      texture,
      x, y, drawW, drawH,
      sprite.style.opacity * sprite._fadeOpacity,
      false,
      [uvOffsetX, uvOffsetY],
      [uvScaleX, uvScaleY],
    )
  }

  // ─── Particle (Instanced) ────────────────────────────────────────────────

  private _drawParticle(
    obj: Particle,
    emX: number, emY: number,
    w: number, h: number,
    perspectiveScale: number,
    assets: LoadedAssets,
    timestamp: number,
  ) {
    obj.tick(timestamp)

    const clip = obj._clip
    if (!clip) return

    const asset = assets[clip.src]
    if (!asset || !(asset instanceof HTMLImageElement)) {
      this._drawPlaceholder(emX, emY, w || 30, h || 30)
      return
    }

    const instances = obj._instances
    if (instances.length === 0) return

    const natW = asset.naturalWidth
    const natH = asset.naturalHeight
    // w/h는 이미 perspectiveScale이 반영된 픽셀 크기
    let baseW: number, baseH: number;
    if (w && !h) {
      baseW = w;
      baseH = w * (natH / natW);
    } else if (!w && h) {
      baseW = h * (natW / natH);
      baseH = h;
    } else {
      baseW = w || natW;
      baseH = h || natH;
    }

    const texture = this._getOrCreateAssetTexture(clip.src, asset)

    // 블렌드 모드 설정은 _drawTextureMesh 배칭에서 자동으로 처리됨
    for (const inst of instances) {
      const age = timestamp - inst.born
      const t = Math.min(age / inst.lifespan, 1)
      const scale = inst.startSize + (inst.endSize - inst.startSize) * t
      const opacity = 1 - t
      if (opacity <= 0 || scale <= 0) continue

      // 에미터 위치 + 인스턴스 상대 오프셋
      const ix = emX + inst.x * perspectiveScale
      const iy = emY + inst.y * perspectiveScale

      const iw = baseW * scale
      const ih = baseH * scale

      this._drawTextureMesh(
        texture,
        ix, iy, iw, ih,
        obj.style.opacity * obj._fadeOpacity * opacity,
        false, [0, 0], [1, 1],
        inst.z || 0
      )
    }

  }

  // ─── Gradient Texture ────────────────────────────────────────────────────

  /**
   * gradient stops 문자열로부터 Offscreen Canvas 텍스처를 생성합니다.
   * @param ellipseClip true이면 ellipse SDF 원형 클리핑을 Canvas 내에서 적용합니다.
   */
  private _makeGradientTexture(
    w: number,
    h: number,
    gradient: string,
    type: 'linear' | 'circular',
    ellipseClip: boolean,
  ): Texture | null {
    const cacheKey = `${Math.round(w)}|${Math.round(h)}|${gradient}|${type}|${ellipseClip}`
    let tex = this._gradientTextureCache.get(cacheKey)
    if (tex) return tex

    const { direction, stops } = parseGradientStops(gradient)
    if (stops.length === 0) return null

    const pw = Math.max(1, Math.round(w))
    const ph = Math.max(1, Math.round(h))
    const canvas = document.createElement('canvas')
    canvas.width = pw
    canvas.height = ph
    const ctx = canvas.getContext('2d')!

    // ellipse 클리핑: 원형 영역 외부를 투명으로 유지
    if (ellipseClip) {
      ctx.beginPath()
      ctx.ellipse(pw / 2, ph / 2, pw / 2, ph / 2, 0, 0, Math.PI * 2)
      ctx.clip()
    }

    let grad: CanvasGradient
    if (type === 'circular') {
      const cx = pw / 2
      const cy = ph / 2
      const r = Math.max(pw, ph) / 2
      grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    } else {
      // linear: direction(deg) 기준 시작→끝 좌표 계산
      const rad = (direction - 90) * Math.PI / 180
      const cx = pw / 2
      const cy = ph / 2
      const halfLen = Math.sqrt(pw * pw + ph * ph) / 2
      const x0 = cx - Math.cos(rad) * halfLen
      const y0 = cy - Math.sin(rad) * halfLen
      const x1 = cx + Math.cos(rad) * halfLen
      const y1 = cy + Math.sin(rad) * halfLen
      grad = ctx.createLinearGradient(x0, y0, x1, y1)
    }

    for (const stop of stops) {
      grad.addColorStop(stop.offset, stop.color)
    }

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, pw, ph)

    tex = new Texture(this.gl, { image: canvas, generateMipmaps: false })
    this._gradientTextureCache.set(cacheKey, tex)
    return tex
  }

  // ─── Placeholder ────────────────────────────────────────────────────────

  private _drawPlaceholder(x: number, y: number, w: number, h: number) {
    this._flushBatch();
    this._setBlendMode(this._activeObj?.style?.blendMode ?? 'source-over');
    this.placeholderProgram.uniforms['uModelMatrix'].value = this._makeModelMatrix(x, y, w, h)
    this.placeholderProgram.uniforms['uProjectionMatrix'].value = this._projMatrix()
    this.placeholderMesh.draw({ camera: this.camera })
  }

  // ─── Texture 캐시 ────────────────────────────────────────────────────────

  private _getOrCreateAssetTexture(src: string, asset: HTMLImageElement): Texture {
    let tex = this.assetTextureCache.get(src)
    if (!tex) {
      tex = new Texture(this.gl, { image: asset, generateMipmaps: false })
      this.assetTextureCache.set(src, tex)
    }
    return tex
  }
}
