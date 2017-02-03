var canvas
var ctx
var canvasWidth = window.innerWidth
var canvasHeight = window.innerHeight

function init() {
  canvas = document.createElement('canvas')
  document.body.appendChild(canvas)
  document.body.style.margin = 0
  document.body.style.overflow = 'hidden'

  document.body.style.cursor = 'none'

  onResize()

  window.requestAnimationFrame(function frame() {
    onFrame()
    onTick()
    window.requestAnimationFrame(frame)
  })
}

function initCanvas() {
  canvas.width = canvasWidth * 2
  canvas.height = canvasHeight * 2

  canvas.style.width = canvasWidth + 'px'
  canvas.style.height = canvasHeight + 'px'

  ctx = canvas.getContext('2d')

  ctx.scale(2, 2)
  ctx.fillStyle = 'black'
}

var tile = 1
var steps = (canvasHeight / tile)|0 + 1

var length = steps * 2
var viewLength = (canvasWidth / tile)
var vector = new Array(length).fill(0)
vector[(length / 2)|0] = 1
var step = 0
var offset = (length + 1 - viewLength) / 2

function onFrame() {
  for (let i = 0; i < vector.length; i++) {
    vector[i] && ctx.fillRect((i - offset) * tile, step * tile, tile, tile)
  }
}

var table = [0, 1, 1, 1, 1, 0, 0, 0] // no. 30

function fn(a, b, c) {
  return table[(a << 2) + (b << 1) + c]
}

function onTick() {
  ++step
  var next = new Array(vector.length).fill(0)
  for (let i = 0; i + 2 < vector.length; ++i) {
    next[i + 1] = fn(vector[i + 0], vector[i + 1], vector[i + 2])
  }
  vector = next
}

function onResize() {
  canvasWidth = window.innerWidth
  canvasHeight = window.innerHeight

  initCanvas()
}

window.addEventListener('DOMContentLoaded', function(e) {
  init()
})

// window.addEventListener('resize', function(e) {
//   onResize()
// })
