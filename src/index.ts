import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
interface GoPayload {
  event: string
  data: any
  error: any
  SR: boolean
}
class IPC extends EventEmitter {
  go: ChildProcess | null
  closed: boolean
  constructor(private binPath: string) {
    super()
    this.go = null
    this.closed = false
  }
  /**
   * Start the child process
   * @param arg
   */
  public init(arg: string[] = []) {
    this.closed = false
    const self = this
    const go = spawn(this.binPath, arg, {})
    this.go = go
    go.stderr.setEncoding('utf8')
    go.stdout.setEncoding('utf8')
    // emit the errors
    go.stderr.on('error', e => self.emit('error', e))
    go.stderr.on('data', e => self.emit('log', e))

    let outBuffer = ''
    go.stdout.on('data', s => {
      outBuffer += s
      if (s.endsWith('}\\n')) {
        self._processData(outBuffer)
        outBuffer = ''
      }
    })

    go.once('close', _ => {
      self.closed = true
      self.emit('close')
    })
    process.on('beforeExit', () => this.kill())
    return this
  }
  private _processData(payload: string) {
    let _data = this.parseJSON(payload)
    if (Array.isArray(_data)) {
      for (const item of _data) {
        this.emit('data', item)
        let { error, data, event } = item
        this.emit(event, data, error)
      }
    }
  }
  /**
   * Kill the child process
   */
  public kill() {
    try {
      this.closed = true
     this.go.kill()
    } catch (error) {
    }
    
  }
  /**
   * Send message to `Golang` process
   * @param event
   * @param data
   */
  public send(event: string, data: any) {
    this._send(event, data, false)
  }
  /**
   * sendRaw gives your access to a third `boolean` argument which
   * is used to determine if this is a sendAndReceive action
   */
  public sendRaw(event: string, data: any, isSendAndReceive = false) {
    this._send(event, data, isSendAndReceive)
  }

  /**
   *
   * @param event
   * @param data
   * @param SR this tells `Go` process if this message needs an acknowledgement
   */
  private _send(event: string, data: any, SR: boolean) {
    try {
      if (!this.go || this.closed) return
      if (this.go && this.go.stdin.writable) {
        let payload: string
        if (typeof data === 'object' || Array.isArray(data)) payload = JSON.stringify(data)
        else payload = data
        // We are converting this to `JSON` this to preserve the
        // data types
        let d = JSON.stringify({
          event,
          data: payload,
          SR: !!SR
        })
        if (this.go.stdin.writable) {
          this.go.stdin.write(d + '\n')
        }
      }
    } catch (error) {
      this.emit('error', error)
    }
  }
  /**
   *  Send and receive an acknowledgement through
   * a callback from `Go` process
   * @param event
   * @param data
   * @param cb
   */
  public sendAndReceive(event: string, data: any, cb: (error: Error, data: any) => void) {
    this._send(event, data, true)
    let rc = event + '___RC___'
    this.once(rc, (data, error) => {
      if (typeof cb === 'function') cb(error, data)
    })
  }
  private parseJSON(s: string): GoPayload[] | null {
    try {
      let data = s.replace(/}\\n/g, '},')
      if (data.endsWith(',')) {
        data = data.slice(0, -1).trim()
      }
      return JSON.parse(`[${data}]`)
    } catch (error) {
      this.emit('parse-error', error)
      return null
    }
  }
}

export = IPC
