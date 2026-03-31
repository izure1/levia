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
import type { Camera as LveCamera } from './objects/Camera.js'
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

  // 상태 보존용 렌더 변수 (Model 매트릭스 계산용)
  private _modelMat = new Mat4()
  private _activeObj!: LveObject
  private _activeCamRotX = 0
  private _activeCamRotY = 0
  private _activeCamRotZ = 0
  private _activeRenderW = 0
  private _activeRenderH = 0

  // 오브젝트별 Mesh 캐시
  private meshCache = new Map<string, Mesh>()

  // 텍스트 텍스처 캐시 (id → TextTextureEntry)
  private textCache = new Map<string, TextTextureEntry>()

  // 카메라 미지정 시 렌더링할 텍스트 오브젝트 모의 객체
  private _noCameraText: any

  // 에셋 텍스처 캐시 (src → Texture)
  private assetTextureCache = new Map<string, Texture>()

  // 비디오 텍스처 캐시 (src → Texture) — 매 프레임 업데이트 필요
  private videoTextureCache = new Map<string, Texture>()

  // --- Auto-Batching State ---
  private readonly _batchMaxSize = 30000
  private _batchMat0!: Float32Array
  private _batchMat1!: Float32Array
  private _batchMat2!: Float32Array
  private _batchMat3!: Float32Array
  private _batchOpacityFlip!: Float32Array
  private _batchUVParams!: Float32Array
  private _batchCount = 0
  private _batchTexture: Texture | null = null
  private _batchBlendMode: string = 'source-over'
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

    // 직교 투영 카메라: 화면 픽셀 좌표계 (0,0 = center)
    this.camera = new Camera(this.gl, {
      left: -canvas.width / 2,
      right: canvas.width / 2,
      bottom: -canvas.height / 2,
      top: canvas.height / 2,
      near: -1000,
      far: 1000,
    })
    this.camera.position.z = 1
    this.camera.lookAt([0, 0, 0])

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
    // 직교 카메라 재설정
    const cam = this.camera as any
    cam.left = -w / 2
    cam.right = w / 2
    cam.bottom = -h / 2
    cam.top = h / 2
    this.camera.orthographic({ left: -w / 2, right: w / 2, bottom: -h / 2, top: h / 2, near: -1000, far: 1000 })
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
      this.gl.blendFuncSeparate(
        this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA,
        this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA,
      )

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

    const camX = activeCamera.transform.position.x
    const camY = activeCamera.transform.position.y
    const camZ = activeCamera.transform.position.z
    const camRotX = activeCamera.transform.rotation.x || 0
    const camRotY = activeCamera.transform.rotation.y || 0
    const camRotZ = activeCamera.transform.rotation.z || 0

    // 카메라의 회전 역변환 헬퍼 (위치 역산용)
    const radX = -camRotX * Math.PI / 180
    const radY = -camRotY * Math.PI / 180
    const radZ = -camRotZ * Math.PI / 180

    const getCamTransformed = (obj: LveObject) => {
      let dx = obj.transform.position.x - camX
      let dy = obj.transform.position.y - camY
      let dz = obj.transform.position.z - camZ

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
      return { dx, dy, dz }
    }

    // ─── Z-Sort: Dirty-Flag 기반 캐시 ────────────────────
    // 카메라 이동만으로는 객체 간 dz 차이가 바뀌지 않으므로(cam 위치 항이 소거됨)
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

      // 카메라 회전이 없으면 절대 Z 좌표 기준으로 정렬할 수 있습니다. (cam.z 항 소거)
      // 카메라 회전이 있으면 현재 프레임의 실제 dz를 구해 정렬합니다.
      const useAbsoluteZ = (camRotX === 0 && camRotY === 0 && camRotZ === 0)

      if (useAbsoluteZ) {
        this._sortedObjects = Array.from(objects)
          .filter(o => o.attribute.type !== 'camera')
          .sort((a, b) => {
            const zdiff = b.transform.position.z - a.transform.position.z
            return zdiff !== 0 ? zdiff : a.style.zIndex - b.style.zIndex
          })
      } else {
        // 회전이 있으면 실제 dz 계산 후 정렬
        this._sortedObjects = Array.from(objects)
          .filter(o => o.attribute.type !== 'camera')
          .map(o => ({ o, dz: getCamTransformed(o).dz }))
          .sort((a, b) => {
            const zdiff = b.dz - a.dz
            return zdiff !== 0 ? zdiff : a.o.style.zIndex - b.o.style.zIndex
          })
          .map(x => x.o)
      }
    }

    // 캐시된 순서로 renderables 구성 (정렬 없음, dz 계산만)
    const renderables: Array<{ obj: LveObject; dx: number; dy: number; dz: number }> = []
    for (const obj of this._sortedObjects) {
      if (obj.style.display === 'none') continue
      const { dx, dy, dz } = getCamTransformed(obj)
      if (dz >= 0) renderables.push({ obj, dx, dy, dz })
    }

    // 화면 클리어
    this.gl.clearColor(0, 0, 0, 0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    this.gl.enable(this.gl.BLEND)
    this.gl.blendFuncSeparate(
      this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA,
      this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA,
    )

    for (const item of renderables) {
      this._drawObject(item.obj, item.dx, item.dy, item.dz, camRotX, camRotY, camRotZ, assets, timestamp)
    }
    this._flushBatch();
  }

  // ─── 내부 오브젝트 렌더 ──────────────────────────────────────────────────

  private _drawObject(
    obj: LveObject,
    dx: number,
    dy: number,
    dz: number,
    camRotX: number,
    camRotY: number,
    camRotZ: number,
    assets: LoadedAssets,
    timestamp: number,
  ) {
    const { style, transform } = obj

    // rawDepth = 카메라로부터의 부호 있는 변환된 거리. 음수 = 카메라 뒤 → 숨김
    const rawDepth = dz
    if (rawDepth < 0) return

    const focalLength = this.focalLength
    // depth=0이면 1:1 스케일, focalLength만큼 떨어졌을 때 1:1 스케일
    const perspectiveScale = rawDepth === 0 ? 1 : focalLength / rawDepth

    const screenX = dx * perspectiveScale
    const screenY = dy * perspectiveScale

    const baseW = obj._renderedSize?.w ?? style.width ?? 0
    const baseH = obj._renderedSize?.h ?? style.height ?? 0
    const w = baseW * perspectiveScale * transform.scale.x
    const h = baseH * perspectiveScale * transform.scale.y
    const rotation = 0 // 더 이상 _drawXXX 헬퍼로 직접 전달하지 않고 ModelMatrix 내부에서 처리

    // 현재 렌더링 상태 저장 (Model Matrix 계산용)
    this._activeObj = obj
    this._activeCamRotX = camRotX
    this._activeCamRotY = camRotY
    this._activeCamRotZ = camRotZ
    this._activeRenderW = w
    this._activeRenderH = h

    const type = obj.attribute.type

    if (type === 'rectangle') {
      this._drawRectangle(obj, screenX, screenY, w, h)
    } else if (type === 'ellipse') {
      this._drawEllipse(obj, screenX, screenY, w, h)
    } else if (type === 'text') {
      this._drawText(obj, screenX, screenY, perspectiveScale, timestamp)
    } else if (type === 'image') {
      this._drawAsset(obj as LveImage, screenX, screenY, w, h, perspectiveScale, assets)
    } else if (type === 'video') {
      this._drawVideo(obj as LveVideo, screenX, screenY, w, h, perspectiveScale, assets)
    } else if (type === 'sprite') {
      this._drawSprite(obj as Sprite, screenX, screenY, w, h, perspectiveScale, assets, timestamp)
    } else if (type === 'particle') {
      this._drawParticle(obj as Particle, screenX, screenY, w, h, perspectiveScale, assets, timestamp)
    }
  }

  // ─── 모델 행렬 헬퍼 ─────────────────────────────────────────────────────

  /**
   * 3D 회전과 Pivot이 반영된 모델 행렬을 반환합니다.
   * column-major 순서 (WebGL 표준)
   */
  private _makeModelMatrix(x: number, y: number, w: number, h: number): Float32Array {
    this._modelMat.identity()
    // 1. 카메라 투영 위치로 이동
    this._modelMat.translate(new OglVec3(x, y, 0))

    // 2. 화면 평면 기준 역카메라 회전 (카메라가 기울면 월드가 반대로 기우는 효과)
    if (this._activeCamRotY) this._modelMat.rotate(-this._activeCamRotY * Math.PI / 180, AXIS_Y)
    if (this._activeCamRotX) this._modelMat.rotate(-this._activeCamRotX * Math.PI / 180, AXIS_X)
    if (this._activeCamRotZ) this._modelMat.rotate(-this._activeCamRotZ * Math.PI / 180, AXIS_Z)

    // 3. 객체의 고유 회전 적용
    const rot = this._activeObj.transform.rotation
    if (rot.z) this._modelMat.rotate(rot.z * Math.PI / 180, AXIS_Z)
    if (rot.y) this._modelMat.rotate(rot.y * Math.PI / 180, AXIS_Y)
    if (rot.x) this._modelMat.rotate(rot.x * Math.PI / 180, AXIS_X)

    // 4. Pivot을 기준으로 기하학적 중심선 이동 (크기 w, h는 스케일, _activeRenderW는 베이스)
    // Canvas 좌표계(Y-down) 특성상 pivotY=0이 Top이 되도록 Y 오프셋은 음수 적용
    const pivot = this._activeObj.transform.pivot
    this._modelMat.translate(new OglVec3(
      (0.5 - pivot.x) * this._activeRenderW,
      -(0.5 - pivot.y) * this._activeRenderH,
      0
    ))

    // 5. 최종 쿼드 스케일링
    this._modelMat.scale(new OglVec3(w, h, 1))

    return this._modelMat as unknown as Float32Array
  }

  /** ogl 카메라의 projectionMatrix를 Float32Array로 반환 */
  private _projMatrix(): Float32Array {
    return this.camera.projectionMatrix as unknown as Float32Array
  }

  // ─── Program uniform 드로우 헬퍼 ─────────────────────────────────────────

  private _flushBatch() {
    if (this._batchCount === 0 || !this._batchTexture) return;

    this.instancedProgram.uniforms['uTexture'].value = this._batchTexture;
    this.instancedProgram.uniforms['uProjectionMatrix'].value = this._projMatrix();

    if (this._batchBlendMode === 'lighter') {
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
    }

    const geo = this._instancedGeo;
    geo.instancedCount = this._batchCount;

    geo.attributes.instanceMat0.needsUpdate = true;
    geo.attributes.instanceMat1.needsUpdate = true;
    geo.attributes.instanceMat2.needsUpdate = true;
    geo.attributes.instanceMat3.needsUpdate = true;
    geo.attributes.instanceOpacityFlip.needsUpdate = true;
    geo.attributes.instanceUVParams.needsUpdate = true;

    this._instancedMesh.draw({ camera: this.camera });

    if (this._batchBlendMode === 'lighter') {
      this.gl.blendFuncSeparate(
        this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA,
        this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA
      );
    }

    this._batchCount = 0;
    this._batchTexture = null;
  }

  private _drawColorMesh(
    program: Program,
    x: number, y: number, w: number, h: number,
    color: string, opacity: number,
  ) {
    this._flushBatch();
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
  ) {
    const blendMode = this._activeObj?.style?.blendMode ?? 'source-over';

    if (this._batchTexture !== texture || this._batchBlendMode !== blendMode || this._batchCount >= this._batchMaxSize) {
      this._flushBatch();
    }

    this._batchTexture = texture;
    this._batchBlendMode = blendMode;

    const m = this._makeModelMatrix(x, y, w, h);
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
    if (!style.color && !style.borderColor && !style.outlineColor) return

    // outline 먼저 (border 바깥)
    if (style.outlineColor && (style.outlineWidth ?? 0) > 0) {
      const bw = (style.borderWidth ?? 0)
      const ow = style.outlineWidth!
      this._drawColorMesh(this.colorProgram, x, y, w + bw * 2 + ow * 2, h + bw * 2 + ow * 2, style.outlineColor, style.opacity)
    }

    // 테두리 (border)
    if (style.borderColor && (style.borderWidth ?? 0) > 0) {
      const bw = style.borderWidth!
      this._drawColorMesh(this.colorProgram, x, y, w + bw * 2, h + bw * 2, style.borderColor, style.opacity)
    }

    // 본체
    if (style.color) {
      this._drawColorMesh(this.colorProgram, x, y, w, h, style.color, style.opacity)
    }
  }

  // ─── Ellipse ────────────────────────────────────────────────────────────

  private _drawEllipse(obj: LveObject, x: number, y: number, w: number, h: number) {
    this._flushBatch();
    const { style } = obj
    if (!style.color && !style.borderColor && !style.outlineColor) return

    const drawEllipse = (ew: number, eh: number, color: string) => {
      const [r, g, b, a] = parseCSSColor(color)
      this.ellipseProgram.uniforms['uColor'].value = [r, g, b, a]
      this.ellipseProgram.uniforms['uOpacity'].value = style.opacity
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

    // 본체
    if (style.color) {
      drawEllipse(w, h, style.color)
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
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const texture = new Texture(this.gl, { image: canvas, generateMipmaps: false })
      const mesh = new Mesh(this.gl, { geometry: this.quadGeo, program: this.textureProgram })
      entry = { texture, canvas, ctx, lastText: '', mesh }
      this.textCache.set(id, entry)
    }

    if (needRender) {
      this._renderTextToCanvas(entry, rawText, style, baseFontSize, maxW, maxH)
      obj._dirtyTexture = false
      obj._textureIdleCount = 0
      obj._textureThrottleCount = 0  // 렌더 후 양쪽 리셋
    }

    const cw = entry.canvas.width
    const ch = entry.canvas.height
    if (cw === 0 || ch === 0) return

    // 실제 월드 크기 기록 (TEXT_RENDER_SCALE 역산, scale 반영)
    obj._renderedSize = {
      w: (cw / TEXT_RENDER_SCALE) * obj.transform.scale.x,
      h: (ch / TEXT_RENDER_SCALE) * obj.transform.scale.y,
    }

    // canvas는 TEXT_RENDER_SCALE 기준, 표시는 perspectiveScale 기준으로 보정
    const displayScale = perspectiveScale / TEXT_RENDER_SCALE
    this._drawTextureMesh(entry.texture, x, y, cw * displayScale * obj.transform.scale.x, ch * displayScale * obj.transform.scale.y, style.opacity, false)
  }

  private _renderTextToCanvas(
    entry: TextTextureEntry,
    rawText: string,
    style: LveObject['style'],
    baseFontSize: number,
    maxW: number | null,
    maxH: number | null,
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
        curH = Math.max(curH, fs * lineHeightMul)
        ctx.font = `${fi} ${fw} ${fs}px ${fontFamily}`

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
        ctx.font = `${fi} ${fw} ${fs}px ${fontFamily}`
        w += ctx.measureText(tok.text).width
      }
      return w
    })

    const containerW = maxW ?? Math.max(...measuredWidths, 0)
    const totalH = renderLines.reduce((s, r) => s + r.lineH, 0)

    const canvasW = Math.ceil(maxW ?? containerW) + shadowBlur * 2 + Math.abs(shadowOffsetX)
    const canvasH = Math.ceil(maxH ?? totalH) + shadowBlur * 2 + Math.abs(shadowOffsetY)

    canvas.width = canvasW
    canvas.height = canvasH
    ctx.clearRect(0, 0, canvasW, canvasH)

    if (shadowColor) {
      ctx.shadowColor = shadowColor
      ctx.shadowBlur = shadowBlur
      ctx.shadowOffsetX = shadowOffsetX
      ctx.shadowOffsetY = shadowOffsetY
    }

    const originX = shadowBlur + Math.max(0, shadowOffsetX) / 2
    const originY = shadowBlur + Math.max(0, shadowOffsetY) / 2

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

        ctx.font = `${fi} ${fw} ${fs}px ${fontFamily}`
        ctx.fillStyle = fc
        ctx.fillText(tok.text, penX, baseline)

        if (bc) {
          ctx.strokeStyle = bc
          ctx.lineWidth = bw as number
          ctx.strokeText(tok.text, penX, baseline)
        }
        penX += ctx.measureText(tok.text).width
      }
      curY += rl.lineH
    }

    // Texture 업데이트
    entry.texture.image = canvas
    entry.texture.needsUpdate = true
  }

  // ─── Image ──────────────────────────────────────────────────────────────

  private _drawAsset(obj: LveImage, x: number, y: number, w: number, h: number, perspectiveScale: number, assets: LoadedAssets) {
    const src = obj._src
    const asset = src ? assets[src] : undefined
    if (!asset || !(asset instanceof HTMLImageElement)) {
      this._drawPlaceholder(x, y, w || 60, h || 60)
      return
    }

    // style.width/height 미지정 시 naturalSize에 perspectiveScale 적용
    const drawW = w || asset.naturalWidth * perspectiveScale * obj.transform.scale.x
    const drawH = h || asset.naturalHeight * perspectiveScale * obj.transform.scale.y

    obj._renderedSize = {
      w: drawW / perspectiveScale / obj.transform.scale.x,
      h: drawH / perspectiveScale / obj.transform.scale.y,
    }

    const texture = this._getOrCreateAssetTexture(src!, asset)

    this._drawTextureMesh(texture, x, y, drawW, drawH, obj.style.opacity, false)
  }

  // ─── Video ──────────────────────────────────────────────────────────────

  private _drawVideo(obj: LveVideo, x: number, y: number, w: number, h: number, perspectiveScale: number, assets: LoadedAssets) {
    const src = obj._src
    const asset = src ? assets[src] : undefined
    if (!asset || !(asset instanceof HTMLVideoElement)) {
      this._drawPlaceholder(x, y, w || 60, h || 60)
      return
    }

    const clip = obj._clip

    if (obj._playing) {
      if (clip) {
        asset.loop = clip.loop
        if (asset.paused && clip.start != null) asset.currentTime = clip.start / 1000
      }
      if (asset.paused) asset.play().catch(() => { })
    } else {
      if (!asset.paused) asset.pause()
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
    const drawW = w || asset.videoWidth * perspectiveScale * obj.transform.scale.x
    const drawH = h || asset.videoHeight * perspectiveScale * obj.transform.scale.y

    obj._renderedSize = {
      w: drawW / perspectiveScale / obj.transform.scale.x,
      h: drawH / perspectiveScale / obj.transform.scale.y,
    }

    // 비디오 텍스처는 매 프레임 업데이트
    let tex = this.videoTextureCache.get(src!)
    if (!tex) {
      tex = new Texture(this.gl, { image: asset, generateMipmaps: false })
      this.videoTextureCache.set(src!, tex)
    }
    tex.image = asset
    tex.needsUpdate = true

    this._drawTextureMesh(tex, x, y, drawW, drawH, obj.style.opacity)
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
      const drawW = w || asset.naturalWidth * perspectiveScale * sprite.transform.scale.x
      const drawH = h || asset.naturalHeight * perspectiveScale * sprite.transform.scale.y
      this._drawTextureMesh(texture, x, y, drawW, drawH, sprite.style.opacity)
      return
    }

    const { frameWidth, frameHeight } = clip
    const sheetCols = Math.floor(asset.naturalWidth / frameWidth)
    const frameIdx = sprite._currentFrame
    const col = frameIdx % sheetCols
    const row = Math.floor(frameIdx / sheetCols)
    const uvOffsetX = (col * frameWidth) / asset.naturalWidth
    const uvOffsetY = (row * frameHeight) / asset.naturalHeight
    const uvScaleX = frameWidth / asset.naturalWidth
    const uvScaleY = frameHeight / asset.naturalHeight

    const drawW = w || frameWidth * perspectiveScale * sprite.transform.scale.x
    const drawH = h || frameHeight * perspectiveScale * sprite.transform.scale.y

    this._drawTextureMesh(
      texture,
      x, y, drawW, drawH,
      sprite.style.opacity,
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
    const baseW = w || natW
    const baseH = h || natH

    const texture = this._getOrCreateAssetTexture(clip.src, asset)

    // 블렌드 모드 설정은 _drawTextureMesh 배칭에서 자동으로 처리됨
    for (const inst of instances) {
      const age = timestamp - inst.born
      const t = Math.min(age / inst.lifespan, 1)
      const scale = 1 - t
      const opacity = 1 - t
      if (opacity <= 0 || scale <= 0) continue

      // 에미터 위치 + 인스턴스 상대 오프셋 (Y는 Canvas 2D → WebGL 반전)
      const ix = emX + inst.x * perspectiveScale
      const iy = emY - inst.y * perspectiveScale

      const iw = baseW * scale
      const ih = baseH * scale

      this._drawTextureMesh(
        texture,
        ix, iy, iw, ih,
        obj.style.opacity * opacity,
      )
    }

  }

  // ─── Placeholder ────────────────────────────────────────────────────────

  private _drawPlaceholder(x: number, y: number, w: number, h: number) {
    this._flushBatch();
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
