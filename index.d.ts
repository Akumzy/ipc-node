import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
declare class IPC extends EventEmitter {
    binPath: string;
    go: ChildProcess;
    closed: boolean;
    constructor(binPath: string);
    init(arg?: string[]): this;
    kill(): void;
    send(eventType: string, data: any): void;
    sendRaw(eventType: string, data: any, isSendAndReceive?: boolean): void;
    private _send;
    sendAndReceive(eventName: string, data: any, cb: (error: Error, data: any) => void): void;
}
export default IPC;
