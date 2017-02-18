var canvas
var ctx
var canvasWidth = document.documentElement.clientWidth
var canvasHeight = document.documentElement.clientHeight

function init() {
  canvas = document.createElement('canvas')
  document.body.appendChild(canvas)
  document.body.style.margin = 0
  document.body.style.overflow = 'hidden'

  hideCursor()
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

  ctx.lineWidth = 2
  ctx.scale(2, 2)
  ctx.fillStyle = 'black'
  ctx.strokeStyle = 'black'
}

var t = 0
var first = 2.5
var second = 0.25
var extend = 0.5

function fn(t) {
  var phase = t % (first + second)
  if (phase < first) {
    return 1 + extend * (1 - Math.cos((phase / first * 0.9 + 0.1) * Math.PI / 2))
  }
  return 1 + extend * Math.sin((1 - (phase - first) / second) * Math.PI / 2)
}

var switched = false
var clicked = false
var hover = false
var x, y

var t1 = 0
var t2 = 0
var offset = 2
var factor0 = 1
var factor = 1

function onFrame() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  x = canvasWidth / 2
  y = canvasHeight * 0.618

  if (switched) {
    document.body.style.background = 'black'
    return
  }

  if (clicked) {
    if (sq(25 * factor0) > (sq(x) + sq(y))) { // sq(x) + sq(y) - 1000) {
      switched = true
    }

    factor0 = (1 + sq(t2 * 1.5 + 0) - sq(0))
    factor = 1 + sq(t2 + offset) - sq(offset)

    t2 += 1 / 30
    if (first - t % (first + second) > 1 / 10) {
      t += 1 / 10
    }
    factor0 *= 1 + (fn(t) - 1) * (1 - Math.cos(Math.min(t2, 1) * Math.PI))
    // t2 += (fn(t + 0.001) - fn(t)) / 0.001 / 2 / (t2 + 1)
  }

  ctx.beginPath()
  ctx.arc(x, y, 25 * factor0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, y, 25 * 1.2 * fn(t) * factor, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()

  if (clicked) {
    return
  }

  if (hover) {
    if (first - t % (first + second) > 0.1) {
      t += 1 / 10
    } else if (first + second - t % (first + second) > 1 / 60) {
      t += 1 / 60
    } else if (t1 < first - first / 6) {
      t = first + second - 0.001
      t1 += 1 / 60
    } else {
      t = 0
      t1 = 0
    }
    return
  }

  t += 1 / 60
}

function onTick() {

}

function onResize() {
  canvasWidth = document.documentElement.clientWidth
  canvasHeight = document.documentElement.clientHeight

  initCanvas()
}

function hideCursor() {
  document.body.style.cursor = 'none'
}

window.addEventListener('DOMContentLoaded', function(e) {
  init()
})

var timeout

function sq(x) {
  return x * x
}

window.addEventListener('mousemove', function(e) {
  document.body.style.cursor = 'default'
  clearTimeout(timeout)
  timeout = setTimeout(hideCursor, 2000)

  if (sq(e.pageX - x) + sq(e.pageY - y) < sq(25)) {
    hover = true
  } else {
    hover = false
  }
})

window.addEventListener('mousedown', function(e) {
  if (sq(e.pageX - x) + sq(e.pageY - y) < sq(25)) {
    clicked = true
  }
})

window.addEventListener('touchstart', function(e) {
  e.preventDefault()
  if (sq(e.pageX - x) + sq(e.pageY - y) < sq(25)) {
    hover = true
  } else {
    hover = false
  }
})

window.addEventListener('touchmove', function(e) {
  e.preventDefault()
  if (sq(e.pageX - x) + sq(e.pageY - y) < sq(25)) {
    hover = true
  } else {
    hover = false
  }
})

window.addEventListener('touchend', function(e) {
  e.preventDefault()
  if (sq(e.pageX - x) + sq(e.pageY - y) < sq(25)) {
    clicked = true
  }
})

window.addEventListener('resize', function(e) {
  onResize()
})
