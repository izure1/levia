export type EventMap = Record<string, any[]>

type EventCallback<TArgs extends any[]> = (...args: TArgs) => void

interface ListenerEntry {
  cb: EventCallback<any[]>
  once: boolean
}

export class EventEmitter<TEvents extends Record<string, any> = EventMap> {
  private _listeners: Map<string, ListenerEntry[]> = new Map()

  /**
   * 이벤트 리스너를 등록합니다. 스페이스로 구분하여 여러 이벤트를 동시에 등록할 수 있습니다.
   */
  on<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K] extends any[] ? TEvents[K] : any[]>): this
  on(event: string, callback: EventCallback<any[]>): this
  on(event: string, callback: EventCallback<any[]>): this {
    for (const ev of event.trim().split(/\s+/)) {
      if (!ev) continue
      if (!this._listeners.has(ev)) this._listeners.set(ev, [])
      this._listeners.get(ev)!.push({ cb: callback, once: false })
    }
    return this
  }

  /**
   * 이벤트 리스너를 제거합니다. 스페이스로 구분하여 여러 이벤트를 동시에 해제할 수 있습니다.
   */
  off<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K] extends any[] ? TEvents[K] : any[]>): this
  off(event: string, callback: EventCallback<any[]>): this
  off(event: string, callback: EventCallback<any[]>): this {
    for (const ev of event.trim().split(/\s+/)) {
      if (!ev) continue
      const list = this._listeners.get(ev)
      if (!list) continue
      const idx = list.findIndex(e => e.cb === callback)
      if (idx !== -1) list.splice(idx, 1)
    }
    return this
  }

  /**
   * 한 번만 실행되는 이벤트 리스너를 등록합니다.
   */
  once<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K] extends any[] ? TEvents[K] : any[]>): this
  once(event: string, callback: EventCallback<any[]>): this
  once(event: string, callback: EventCallback<any[]>): this {
    for (const ev of event.trim().split(/\s+/)) {
      if (!ev) continue
      if (!this._listeners.has(ev)) this._listeners.set(ev, [])
      this._listeners.get(ev)!.push({ cb: callback, once: true })
    }
    return this
  }

  /**
   * 이벤트를 발행합니다. 스페이스로 구분하여 여러 이벤트를 동시에 발행할 수 있습니다.
   */
  emit<K extends keyof TEvents>(event: K, ...args: TEvents[K] extends any[] ? TEvents[K] : any[]): this
  emit(event: string, ...args: any[]): this
  emit(event: string, ...args: any[]): this {
    for (const ev of event.trim().split(/\s+/)) {
      if (!ev) continue
      const list = this._listeners.get(ev)
      if (!list || list.length === 0) continue

      // once 항목은 실행 후 제거
      const toRemove: number[] = []
      for (let i = 0; i < list.length; i++) {
        list[i].cb(...args)
        if (list[i].once) toRemove.push(i)
      }
      for (let i = toRemove.length - 1; i >= 0; i--) {
        list.splice(toRemove[i], 1)
      }
    }
    return this
  }
}
