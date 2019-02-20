import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
declare class IPC extends EventEmitter {
    private binPath;
    go: ChildProcess | null;
    closed: boolean;
    constructor(binPath: string);
    /**
     * Start the child process
     * @param arg
     */
    init(arg?: string[]): this;
    private _processData;
    /**
     * Kill the child process
     */
    kill(): void;
    /**
     * Send message to `Golang` process
     * @param event
     * @param data
     */
    send(event: string, data: any): void;
    /**
     * sendRaw gives your access to a third `boolean` argument which
     * is used to determine if this is a sendAndReceive action
     */
    sendRaw(event: string, data: any, isSendAndReceive?: boolean): void;
    /**
     *
     * @param event
     * @param data
     * @param SR this tells `Go` process if this message needs an acknowledgement
     */
    private _send;
    /**
     *  Send and receive an acknowledgement through
     * a callback from `Go` process
     * @param event
     * @param data
     * @param cb
     */
    sendAndReceive(event: string, data: any, cb: (error: Error, data: any) => void): void;
    private parseJSON;
}
export = IPC;
