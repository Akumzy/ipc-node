import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'

class IPC extends EventEmitter {
  binPath: string
  go: ChildProcess | null
  closed: boolean
  constructor(binPath: string) {
    super()
    this.binPath = binPath
    this.go = null
    this.closed = false
  }
  public init(arg: string[] = []) {
    this.closed = false
    const self = this
    const go = spawn(this.binPath, arg)
    this.go = go
    go.stderr.setEncoding('utf8')
    go.stdout.setEncoding('utf8')
    // emit the errors
    go.stderr.on('error', e => self.emit('log', e))
    go.stderr.on('data', e => self.emit('log', e))

    let outBuffer = ''
    go.stdout.on('data', s => {
      if (isJSON(s)) {
        s.endsWith('}\\n') ? s.replace('}\\n', '}') : s
        let payload = parseJSON(s)
        if (typeof payload === 'object' && payload !== null) {
          self.emit('data', payload)
          let { error, data, event } = payload
          self.emit(event, data, error)
        }
        return
      }
      outBuffer += s
      if (s.endsWith('}\\n')) {
        let d = outBuffer.replace('}\\n', '}')
        let payload = parseJSON(d)
        if (typeof payload === 'object' && payload !== null) {
          self.emit('data', payload)
          let { error, data, event } = payload
          self.emit(event, data, error)
        }
        outBuffer = ''
      }
    })

    go.once('close', _ => {
      self.closed = true
      self.emit('close')
    })
    return this
  }

  public kill() {
    this.closed = true
    if (this.go) this.go.kill()
  }
  /**
   *
   * @param eventType
   * @param data
   */
  public send(eventType: string, data: any) {
    this._send(eventType, data, false)
  }
  /**
   * sendRaw gives your access to a third `boolean` argument which
   * is used to determine if this is a sendAndReceive action
   */
  public sendRaw(eventType: string, data: any, isSendAndReceive = false) {
    this._send(eventType, data, isSendAndReceive)
  }

  private _send(eventType: string, data: any, SR: boolean) {
    try {
      if (!this.go || this.closed) return
      if (this.go.killed || !this.go.connected) return
      if (this.go && this.go.stdin) {
        let payload: string
        if (typeof data === 'object' || Array.isArray(data)) payload = JSON.stringify(data)
        else payload = data
        let d = JSON.stringify({
          event: eventType,
          data: payload,
          SR: !!SR
        })
        if (this.go.stdin) {
          this.go.stdin.write(d + '\n')
        }
      }
    } catch (error) {
      this.emit('error', error)
    }
  }
  /**
   * Send and receive an acknowledgement through
   * a callback
   */
  public sendAndReceive(eventName: string, data: any, cb: (error: Error, data: any) => void) {
    this._send(eventName, data, true)
    let rc = eventName + '___RC___'
    this.once(rc, (data, error) => {
      if (typeof cb === 'function') cb(error, data)
    })
  }
}
function parseJSON(s: string) {
  try {
    let data = s.replace(/}\\n/g, '}')
    if (data.endsWith(',')) {
      data = data.slice(0, -1).trim()
    }
    return JSON.parse(data)
  } catch (error) {
    return null
  }
}
function isJSON(s: string) {
  try {
    s = s.endsWith('}\\n') ? s.replace('}\\n', '}') : s
    JSON.parse(s)
    return true
  } catch (error) {
    return false
  }
}
export = IPC
