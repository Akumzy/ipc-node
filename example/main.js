const ipc = require('../dist/index')
const { join } = require('path')
const io = new ipc(join(__dirname, './compired-go-binary'))

io.init()

io.on('error', console.log)
io.on('get-time-every-20-seconds', (time, err) => {
  console.log(new Date(time))
})
