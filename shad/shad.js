var canvas = document.querySelector('canvas')
var gl = canvas.getContext('webgl')

function resize() {
  canvas.width = window.innerWidth * 2
  canvas.height = window.innerHeight * 2
  canvas.style.width = window.innerWidth + 'px'
  canvas.style.height = window.innerHeight + 'px'

  gl.viewport(0, 0, canvas.width, canvas.height)
}

window.addEventListener('resize', resize)
resize()

import vs from '/glsl/shad.vs'
import fs from '/glsl/shad.fs'

var vsShader = gl.createShader(gl.VERTEX_SHADER)
var fsShader = gl.createShader(gl.FRAGMENT_SHADER)

gl.shaderSource(vsShader, vs)
gl.shaderSource(fsShader, fs)

compileShader(vsShader)
compileShader(fsShader)

function compileShader(shader) {
  gl.compileShader(shader)
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    throw `could not compile shader:` + gl.getShaderInfoLog(shader);
  }
}

var program = gl.createProgram()

gl.attachShader(program, vsShader)
gl.attachShader(program, fsShader)

gl.linkProgram(program)
gl.useProgram(program)

var vertexBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1, -1,
  -1,  1,
   1, -1,
   1,  1,
]), gl.STATIC_DRAW)

var aLocation = gl.getAttribLocation(program, 'a_location')
gl.enableVertexAttribArray(aLocation)

gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
gl.vertexAttribPointer(aLocation, 2, gl.FLOAT, false, 0, 0)

function frame() {
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
