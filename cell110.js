var canvas
var ctx
var canvasWidth = 750 // window.innerWidth
var canvasHeight = 1344 // window.innerHeight

function init() {
  canvas = document.createElement('canvas')
  document.body.appendChild(canvas)
  document.body.style.margin = 0
  document.body.style.overflow = 'hidden'

  document.body.style.cursor = 'none'

  onResize()

  var i = 0

  window.requestAnimationFrame(function frame() {
    for (var j = 0; i < 7200, j < 100; ++i, ++j) {
      onFrame()
      onTick()
    }
    window.requestAnimationFrame(frame)
  })
}

function initCanvas() {
  canvas.width = canvasWidth * 2
  canvas.height = canvasHeight * 2

  canvas.style.width = canvasWidth + 'px'
  canvas.style.height = canvasHeight + 'px'

  ctx = canvas.getContext('2d')

  ctx.lineWidth = 10
  ctx.scale(2, 2)
  // ctx.translate(0.5, 0.5)
  ctx.fillStyle = 'black'
  ctx.strokeStyle = 'black'
}

var tile = 0.125
var steps = (canvasHeight / tile)|0 + 1

var length = steps * 2
var viewLength = (canvasWidth / tile)
var vector = new Int8Array(length).fill(0)
for (let i = 0; i < length; i++) {
  vector[i] = Math.random() > 0.5 ? 1 : 0
}
var step = 0
var offset = (length + 1 - viewLength) / 2

function onFrame() {
  for (let i = 0; i < vector.length; i++) {
    vector[i] && ctx.fillRect((i - offset) * tile, step * tile, tile, tile)
  }
}

var table = new Int8Array([0, 1, 1, 1, 0, 1, 1, 0])

function fn(a, b, c) {
  return table[(a << 2) + (b << 1) + c]
}

var next = new Int8Array(length)

function onTick() {
  ++step
  next.fill(0)
  for (let i = 0; i + 2 < vector.length; ++i) {
    next[i + 1] = fn(vector[i + 0], vector[i + 1], vector[i + 2])
  }
  var oldVector = vector
  vector = next
  next = oldVector
}

function onResize() {
  // canvasWidth = window.innerWidth
  // canvasHeight = window.innerHeight

  initCanvas()
}

var hasTouch = false

window.addEventListener('DOMContentLoaded', function(e) {
  init()
})

window.addEventListener('mousedown', function(e) {
  hasTouch = true
})

// window.addEventListener('resize', function(e) {
//   onResize()
// })
