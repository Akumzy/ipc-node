"use strict";
const events_1 = require("events");
const child_process_1 = require("child_process");
class IPC extends events_1.EventEmitter {
    constructor(binPath) {
        super();
        this.binPath = binPath;
        this.go = null;
        this.closed = false;
    }
    /**
     * Start the child process
     * @param arg
     */
    init(arg = []) {
        this.closed = false;
        const self = this;
        const go = child_process_1.spawn(this.binPath, arg);
        this.go = go;
        go.stderr.setEncoding('utf8');
        go.stdout.setEncoding('utf8');
        // emit the errors
        go.stderr.on('error', e => self.emit('error', e));
        go.stderr.on('data', e => self.emit('log', e));
        let outBuffer = '';
        go.stdout.on('data', s => {
            outBuffer += s;
            if (s.endsWith('}\\n')) {
                self._processData(outBuffer);
                outBuffer = '';
            }
        });
        go.once('close', _ => {
            self.closed = true;
            self.emit('close');
        });
        return this;
    }
    _processData(payload) {
        let _data = this.parseJSON(payload);
        if (Array.isArray(_data)) {
            for (const item of _data) {
                this.emit('data', _data);
                let { error, data, event } = item;
                this.emit(event, data, error);
            }
        }
    }
    /**
     * Kill the child process
     */
    kill() {
        this.closed = true;
        if (this.go)
            this.go.kill();
    }
    /**
     * Send message to `Golang` process
     * @param event
     * @param data
     */
    send(event, data) {
        this._send(event, data, false);
    }
    /**
     * sendRaw gives your access to a third `boolean` argument which
     * is used to determine if this is a sendAndReceive action
     */
    sendRaw(event, data, isSendAndReceive = false) {
        this._send(event, data, isSendAndReceive);
    }
    /**
     *
     * @param event
     * @param data
     * @param SR this tells `Go` process if this message needs an acknowledgement
     */
    _send(event, data, SR) {
        try {
            if (!this.go || this.closed)
                return;
            if (this.go && this.go.stdin.writable) {
                let payload;
                if (typeof data === 'object' || Array.isArray(data))
                    payload = JSON.stringify(data);
                else
                    payload = data;
                // We are converting this to `JSON` this to preserve the
                // data types
                let d = JSON.stringify({
                    event,
                    data: payload,
                    SR: !!SR
                });
                if (this.go.stdin.writable) {
                    this.go.stdin.write(d + '\n');
                }
            }
        }
        catch (error) {
            this.emit('error', error);
        }
    }
    /**
     *  Send and receive an acknowledgement through
     * a callback from `Go` process
     * @param event
     * @param data
     * @param cb
     */
    sendAndReceive(event, data, cb) {
        this._send(event, data, true);
        let rc = event + '___RC___';
        this.once(rc, (data, error) => {
            if (typeof cb === 'function')
                cb(error, data);
        });
    }
    parseJSON(s) {
        try {
            let data = s.replace(/}\\n/g, '},');
            if (data.endsWith(',')) {
                data = data.slice(0, -1).trim();
            }
            return JSON.parse(`[${data}]`);
        }
        catch (error) {
            this.emit('parse-error', error);
            return null;
        }
    }
}
module.exports = IPC;
