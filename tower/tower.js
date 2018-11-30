function sq(x) {
  return x * x
}

function inRect(x, y, x0, y0, w, h) {
  return x0 <= x && x < x0 + w && y0 <= y && y < y0 + h
}

let mouseX, mouseY

let canvas
let ctx
let canvasWidth = window.innerWidth
let canvasHeight = window.innerHeight

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

  ctx.lineWidth = 10
  ctx.scale(2, 2)
  ctx.fillStyle = '#ACC9E7'
  ctx.strokeStyle = '#759DC1'
}

let planeSpeedModifier = 1

let planeCreateThreshold = 1 / 30
let planeMaxSpeed = 14
let planeMinSpeed = 7
let gunClipSize = 3
let gunHeatPerShot = 60 / 4
let gunMaxTurnRate = Math.PI / 10
let bulletSpeed = 14

let planes = [
  {x: 720 / 1440 * canvasWidth, y: 450 / 900 * canvasHeight, vx: 0, vy: 0, speed: 1},
  {x: 328 / 1440 * canvasWidth, y: 450 / 900 * canvasHeight, vx: 0, vy: 0, speed: 2, bug: 1},
]

let gun = {x: 720 / 1440 * canvasWidth, y: (855 + 12.5) - 900 + canvasHeight, angle: 0}

let bullets = [
]

let gunIsFiring = 0
let gunIsWaiting = 0
let gunIsWaitingOnce = 0
let gunPendingBullets = 0
let gunHeat = 0

function onFrame() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  planes.forEach(function(plane) {
    drawPlane(plane)
  })
  bullets.forEach(function(bullet) {
    drawBullet(bullet)
  })
  drawGun(gun)
}

function onTick() {
  detectCollision()
  updatePlanes()
  updateBullets()
  updateGun()
}

function onResize() {
  canvasWidth = window.innerWidth
  canvasHeight = window.innerHeight

  gun.x = 720 / 1440 * canvasWidth
  gun.y = (855 + 12.5) - 900 + canvasHeight

  initCanvas()
}

function detectCollision() {
  let i = 0

  let planeW = 90
  let planeH = 20

  while (i < bullets.length) {
    let bullet = bullets[i]
    if (bullet.exploding) {
      ++i
      continue
    }
    let j = 0
    while (j < planes.length){
      let plane = planes[j]
      if (plane.dropping) {
        ++j
        continue
      }
      if (inRect(bullet.x, bullet.y, plane.x - planeW / 2, plane.y - planeH / 2, planeW, planeH)) {
        plane.dropping = 1
        bullet.exploding = 1
      }
      ++j
    }
    ++i
  }
}

function updatePlanes() {
  if (Math.random() < 1 / 1000) {
    planeSpeedModifier *= 1.01
    gunHeatPerShot /= 1.01
  }

  // if (planes.length == 0) {
  if (Math.random() < planeCreateThreshold) {
    planes.push({x: -100, y: Math.random() * (canvasHeight * 2 / 3 - 100) + 100, speed: (Math.random() * (planeMaxSpeed - planeMinSpeed) + planeMinSpeed) * planeSpeedModifier, vx: 0, vy: 0, bug: Math.random() > 0.7})
  }

  let i = 0
  while (i < planes.length) {
    if (!inRect(planes[i].x, planes[i].y, -100, -100, canvasWidth + 200, canvasHeight + 200)) {
      planes.splice(i, 1)
    } else {
      if (planes[i].dropping) {
        planes[i].vx = planes[i].speed
        planes[i].vy += 0.5
        planes[i].angle = Math.atan2(planes[i].vy, planes[i].vx) / 3
      } else if (planes[i].bug) {
        let angle = Math.atan2(planes[i].vy, planes[i].vx - planes[i].speed)
        let length = Math.min(planes[i].speed / 10, 1) // Math.sqrt(sq(planes[i].vy) + sq(planes[i].vx))
        angle += Math.PI / 100
        planes[i].vx = planes[i].speed + length * Math.cos(angle)
        planes[i].vy = length * Math.sin(angle)
        planes[i].angle = Math.atan2(planes[i].vy, planes[i].vx) / 3
      } else {
        planes[i].vx = planes[i].speed
        planes[i].vy = 0
      }

      planes[i].x += planes[i].vx
      planes[i].y += planes[i].vy

      ++i
    }
  }
}

function updateBullets() {
  if (gunIsFiring || gunPendingBullets)
    gunFire()

  let i = 0
  while (i < bullets.length) {
    let bullet = bullets[i]
    if (!inRect(bullet.x, bullet.y, -100, -100, canvasWidth + 200, canvasHeight + 200) || bullet.size > 200) {
      bullets.splice(i, 1)
    } else {
      if (bullet.exploding) {
        bullet.vx *= 0.5
        bullet.vy *= 0.5
        bullet.size += 1000 / bullet.size
      }

      bullet.x += bullet.vx
      bullet.y += bullet.vy

      ++i
    }
  }
}

function updateGun() {
  if (gunHeat > 0)
    --gunHeat

  // let phi = Math.atan2(mouseY - gun.y, mouseX - gun.x)

  var phi = -Math.PI / 2;

  if (planes.length > 0) {
    var plane = planes[planes.length - 1];

    phi = Math.atan2(plane.y - gun.y, plane.x - gun.x);
    phi += Math.asin(plane.speed * Math.sin(Math.PI + phi) / bulletSpeed);

    gunFireOnce()
  }

  let angle = phi - (-Math.PI / 2)
  if (!angle)
    angle = 0

  if (angle > Math.PI)
    angle -= Math.PI * 2
  if (angle < -Math.PI)
    angle += Math.PI * 2
  if (angle > Math.PI / 2)
    angle = Math.PI / 2
  if (angle < -Math.PI / 2)
    angle = -Math.PI / 2

  let turn = angle - gun.angle
  
  gun.angle = Math.sign(turn) * Math.min(Math.abs(turn), gunMaxTurnRate) + gun.angle

  if (gunIsWaiting || gunIsWaitingOnce) {
    if (Math.abs(turn) < 1e-3) {
      if (gunIsWaiting) {
        gunFireOn()
        gunIsWaiting = 0
      }
      if (gunIsWaitingOnce > 0) {
        gunFireOnce()
        --gunIsWaitingOnce
      }
    }
  }
}

function drawPlane(plane) {
  let x = plane.x
  let y = plane.y
  let angle = plane.angle

  let scale = 0.25

  ctx.save()

  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.rotate(angle)

  ctx.lineWidth = 10 // 2.5 / scale
  ctx.fillStyle = '#ACC9E7'
  ctx.beginPath()
  ctx.ellipse(0, 0, 185, 37, 0, 0, Math.PI * 2 * 0.9999, 0) // Safari has bugs with full ellipse (without any rotation), which renders as half lineWidth
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(-150, -20)
  ctx.lineTo(-90, -20)
  ctx.lineTo(-90 -20, -100)
  ctx.lineTo(-150 -10, -100)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.ellipse(95, -30, 45, 22, 0, 0.2, Math.PI - 0.2, 1)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = 'white'
  ctx.fillRect(-95, -10, 150, 30)
  ctx.strokeRect(-95, -10, 150, 30)

  ctx.restore()
}

function drawBullet(bullet) {
  let x = bullet.x
  let y = bullet.y
  let size = bullet.size

  let scale = 0.2

  ctx.save()

  ctx.globalAlpha = Math.max(0, (200 - size) / (200 - 20))

  ctx.translate(x, y)
  ctx.scale(scale, scale)

  ctx.lineWidth = 2.5 / scale
  ctx.beginPath()
  ctx.arc(0, 0, size, 0, Math.PI * 2, 0)
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}

function drawGun(gun) {
  let x = gun.x
  let y = gun.y
  let angle = gun.angle

  let w, h
  let scale = 0.5

  ctx.save()

  ctx.translate(x, y)
  ctx.scale(scale, scale)

  w = 100
  h = 100
  ctx.lineWidth = 2.5 / scale
  ctx.fillStyle = '#ACC9E7'
  ctx.fillRect(-w / 2, -h / 2 + 50, w, h)
  ctx.strokeRect(-w / 2, -h / 2 + 50, w, h)

  ctx.rotate(angle)

  ctx.fillStyle = '#759DC1'

  
  w = 20
  h = 60
  ctx.fillRect(-w / 2 - 12, -h / 2 - 30, w, h)
  ctx.fillRect(-w / 2 + 12, -h / 2 - 30, w, h)

  w = 20
  h = 150
  ctx.fillRect(-w / 2, -h / 2 - 90, w, h)

  ctx.restore()
}

function gunFireOnce() {
  ++gunPendingBullets
}

function gunFireWait() {
  gunIsWaiting = 1
  ++gunIsWaitingOnce
}

function gunFireOn() {
  gunIsFiring = 1
}

function gunFireOff() {
  gunIsWaiting = 0
  gunIsFiring = 0
}

function gunFire() {
  if (gunPendingBullets <= 0) {
    if (gunHeat > 0)
      return
  } else {
    if (gunHeat > gunHeatPerShot * (gunClipSize - 1)) {
      gunPendingBullets = 0
      return
    }
  }

  let speed = bulletSpeed
  let angle = gun.angle + (-Math.PI / 2)
  let offset = 0; // 78
  bullets.push({x: gun.x + offset * Math.cos(angle), y: gun.y + offset * Math.sin(angle), vx: speed * Math.cos(angle), vy: speed * Math.sin(angle), size: 20})
  --gunPendingBullets
  if (gunPendingBullets < 0)
    gunPendingBullets = 0
  gunHeat += gunHeatPerShot
}


window.addEventListener('DOMContentLoaded', function(e) {
  init()
})

// window.addEventListener('mousemove', function(e) {
//   mouseX = e.pageX
//   mouseY = e.pageY
// })

// window.addEventListener('mousedown', function(e) {
//   gunFireOn()
//   gunFireOnce()
//   mouseX = e.pageX
//   mouseY = e.pageY
// })

// window.addEventListener('mouseup', function(e) {
//   gunFireOff()
// })

// window.addEventListener('touchmove', function(e) {
//   e.preventDefault()
//   mouseX = e.pageX
//   mouseY = e.pageY
// })

// window.addEventListener('touchstart', function(e) {
//   gunFireWait()
//   mouseX = e.pageX
//   mouseY = e.pageY
// })

// window.addEventListener('touchend', function(e) {
//   if (e.touches.length == 0) {
//     gunFireOff()
//   }
// })

window.addEventListener('resize', function(e) {
  onResize()
})

window.addEventListener('touchmove', function(e) {
  e.preventDefault()
}, { passive: false })
