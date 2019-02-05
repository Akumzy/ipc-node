const { EventEmitter } = require('events'),
  { spawn } = require('child_process')

class IPC extends EventEmitter {
  constructor(binPath) {
    super()
    // Path to Golang binary
    this.binPath = binPath
    this.go = null
    this.closed = false
  }
  init(arg = []) {
    this.closed = false
    const self = this
    const go = spawn(this.binPath, arg)
    this.go = go
    go.stderr.setEncoding('utf8')
    go.stdout.setEncoding('utf8')
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
    go.once('close', _ => self.emit('close'))
    return this
  }

  kill() {
    this.closed = true
    if (this.go) this.go.kill()
  }
  send(eventType, data) {
    this._send(eventType, data, false)
  }
  _send(eventType, data, SR) {
    if (!this.go || this.closed) return
    if (this.go.killed) return
    if (this.go && this.go.stdin) {
      let payload
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
  }
  sendAndReceive(eventName, data, cb) {
    this.send(eventName, eventName, data, true)
    let rc = eventName + '___RC___'
    this.on(rc, (data, error) => {
      if (typeof cb === 'function') cb(error, data)
    })
  }
}
function parseJSON(s) {
  try {
    let data = s.replace(/}\\n/g, '}')
    if (data.endsWith(',')) {
      data = data.slice(0, -1)
    }
    let payload = JSON.parse(`[${data}]`)
    return payload[0]
  } catch (error) {
    return null
  }
}
function isJSON(s) {
  try {
    s = s.endsWith('}\\n') ? s.replace('}\\n', '}') : s
    JSON.parse(s)
    return true
  } catch (error) {
    return false
  }
}
module.exports = IPC
