# ipc-node

This package is a simple IPC implementation between Node and its child process (Golang binary) using the `stdin` / `stdout` as the transport.

- Installation

```bash

  npm install ipc-node-go
  #or
  yarn add ipc-node-go

```

- Useage

```js
const IPC = require('ipc-node-go')
//or
import IPC from 'ipc-node-go'

const ipc = new IPC('path-to-golang-bin')
// start the child process
let arg = ['some-flags', 'or-anything']
ipc.init(arg)
// send a message to go process
ipc.send('start-service', true)

//listen for and event
ipc.on('service-ready', someData => {
  console.log(someData)
})
// send and get an acknoledgement via a callback
ipc.sendAndReceive('get-service-info', { id: 1 }, (error, data) => {
  // do whatever you want
})
```

IPC is an EventEmitter.
