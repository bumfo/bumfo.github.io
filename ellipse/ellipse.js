function sq(x) {
  return x * x
}

function inRect(x, y, x0, y0, w, h) {
  return x0 <= x && x < x0 + w && y0 <= y && y < y0 + h
}

window.addEventListener('DOMContentLoaded', function(e) {
  init()
})

let mouseX, mouseY

window.addEventListener('mousemove', function(e) {
  mouseX = e.pageX
  mouseY = e.pageY
})

window.addEventListener('mousedown', function(e) {
  gunFireOn()
})

window.addEventListener('mouseup', function(e) {
  gunFireOff()
})

let ctx

function init() {
  let canvas = document.createElement('canvas')
  document.body.appendChild(canvas)
  document.body.style.margin = 0
  document.body.style.overflow = 'hidden'

  document.body.style.cursor = 'none'

  canvas.width = 1440 * 2
  canvas.height = 900 * 2

  canvas.style.width = 1440 + 'px'
  canvas.style.height = 900 + 'px'

  ctx = canvas.getContext('2d')

  ctx.lineWidth = 10
  ctx.scale(2, 2)
  ctx.fillStyle = '#ACC9E7'
  ctx.strokeStyle = '#759DC1'

  window.requestAnimationFrame(function frame() {
    onFrame()
    onTick()
    window.requestAnimationFrame(frame)
  })
}

let bulletsPerClip = 3
let heatPerShot = 60 / 4
let newPlaneThreshold = 1 / 30
let speedModifier = 1
let bulletSpeed = 14

let planes = [
  {x: 720, y: 450, vx: 0, vy: 0, speed: 1},
  {x: 328, y: 450, vx: 0, vy: 0, speed: 2, bug: 1},
]

let gun = {x: 720, y: 855+12.5, angle: 0}

let bullets = [
]

let isGunFiring = 0
let pendingBullets = 0
let gunHeat = 0

function onFrame() {
  ctx.clearRect(0, 0, 1440, 900)
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
  if (Math.random() < 1/1000) {
    speedModifier *= 1.01
    heatPerShot /= 1.01
  }

  if (Math.random() < newPlaneThreshold) {
    planes.push({x: -100, y: Math.random() * (900 - 300 - 100) + 100, speed: (Math.random() * 7 + 7) * speedModifier, vx: 0, vy: 0, bug: Math.random() > 0.7})
  }

  let i = 0
  while (i < planes.length) {
    if (!inRect(planes[i].x, planes[i].y, -100, -100, 1440 + 200, 900 + 200)) {
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
  if (isGunFiring || pendingBullets)
    gunFire()

  let i = 0
  while (i < bullets.length) {
    let bullet = bullets[i]
    if (!inRect(bullet.x, bullet.y, -100, -100, 1440 + 200, 900 + 200) || bullet.size > 200) {
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

  let phi = Math.atan2(mouseY - gun.y, mouseX - gun.x)
  gun.angle = phi - (-Math.PI / 2)
  if (gun.angle > Math.PI)
    gun.angle -= Math.PI * 2
  if (gun.angle < -Math.PI)
    gun.angle += Math.PI * 2
  if (gun.angle > Math.PI / 2)
    gun.angle = Math.PI / 2
  if (gun.angle < -Math.PI / 2)
    gun.angle = -Math.PI / 2

  if (!gun.angle)
    gun.angle = 0
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

  ctx.lineWidth = 2.5 / scale
  ctx.fillStyle = '#ACC9E7'
  ctx.beginPath()
  ctx.ellipse(0, 0, 185, 37, 0, 0, Math.PI * 2, 0)
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
  ctx.fillRect(-w/2, -h/2 + 50, w, h)
  ctx.strokeRect(-w/2, -h/2 + 50, w, h)

  ctx.rotate(angle)

  ctx.fillStyle = '#759DC1'

  
  w = 20
  h = 60
  ctx.fillRect(-w/2 - 12, -h/2 - 30, w, h)
  ctx.fillRect(-w/2 + 12, -h/2 - 30, w, h)

  w = 20
  h = 150
  ctx.fillRect(-w/2, -h/2 - 90, w, h)

  ctx.restore()
}

function gunFireOn() {
  isGunFiring = 1
  ++pendingBullets
}

function gunFireOff() {
  isGunFiring = 0
}

function gunFire() {
  if (!pendingBullets) {
    if (gunHeat > 0)
      return
  } else {
    if (gunHeat > heatPerShot * (bulletsPerClip - 1)) {
      pendingBullets = 0
      return
    }
  }

  let speed = bulletSpeed
  let angle = gun.angle + (-Math.PI / 2)
  let offset = 78
  bullets.push({x: gun.x + offset * Math.cos(angle), y: gun.y + offset * Math.sin(angle), vx: speed * Math.cos(angle), vy: speed * Math.sin(angle), size: 20})
  --pendingBullets
  if (pendingBullets < 0)
    pendingBullets = 0
  gunHeat += heatPerShot
}