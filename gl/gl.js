var canvas = document.createElement('canvas')
var gl = canvas.getContext('webgl')
var canvasWidth
var canvasHeight

function init() {
  document.body.appendChild(canvas)
  document.body.style.margin = 0
  document.body.style.overflow = 'hidden'

  onResize()

  initShaders()
  initBuffers()

  window.requestAnimationFrame(function frame() {
    onFrame()
    onTick()
    window.requestAnimationFrame(frame)
  })

  window.addEventListener('resize', function(e) {
    onResize()
  })

  var timeout

  window.addEventListener('mousemove', function(e) {
    document.body.style.cursor = 'default'
    clearTimeout(timeout)
    timeout = setTimeout(hideMouse, 2000)
  })
}

var horizAspect // w / h
var squareVerticesBuffer
var vertexPositionAttribute
var vertexColorAttribute
var shaderProgram

var squareRotation = 0.0

function initGl() {
  canvas.width = canvasWidth * 2
  canvas.height = canvasHeight * 2

  canvas.style.width = canvasWidth + 'px'
  canvas.style.height = canvasHeight + 'px'

  horizAspect = canvasWidth / canvasHeight

  gl.clearColor(1.0, 1.0, 1.0, 1.0)
  // Enable depth testing
  gl.enable(gl.DEPTH_TEST)
  // Near things obscure far things
  gl.depthFunc(gl.LEQUAL)
  // Clear the color as well as the depth buffer.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.viewport(0, 0, canvasWidth * 2, canvasHeight * 2)
  // gl.viewport(0, 0, 100, 100)
}


function initShaders() {
  var fragmentShader = getShader(gl, 'shader-fs')
  var vertexShader = getShader(gl, 'shader-vs')
  
  // Create the shader program
  
  shaderProgram = gl.createProgram()
  gl.attachShader(shaderProgram, vertexShader)
  gl.attachShader(shaderProgram, fragmentShader)
  gl.linkProgram(shaderProgram)
  
  // If creating the shader program failed, alert
  
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.warn('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram))
    throw new Error()
  }
  
  gl.useProgram(shaderProgram)
  
  vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition')
  gl.enableVertexAttribArray(vertexPositionAttribute)

  vertexColorAttribute = gl.getAttribLocation(shaderProgram, 'aVertexColor')
  gl.enableVertexAttribArray(vertexColorAttribute)
}

function getShader(gl, id, type) {
  var shaderScript, theSource, currentChild, shader

  shaderScript = document.getElementById(id)

  if (!shaderScript) {
    return null
  }

  theSource = shaderScript.text

  if (!type) {
    if (shaderScript.type == 'x-shader/x-fragment') {
      type = gl.FRAGMENT_SHADER
    } else if (shaderScript.type == 'x-shader/x-vertex') {
      type = gl.VERTEX_SHADER
    } else {
      // Unknown shader type
      return null
    }
  }
  shader = gl.createShader(type)

  gl.shaderSource(shader, theSource)

  // Compile the shader program
  gl.compileShader(shader)

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}


function initBuffers() {
  squareVerticesBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer)
  
  var vertices = [
    1.0,  1.0,  0.0,
    -1.0, 1.0,  0.0,
    1.0,  -1.0, 0.0,
    -1.0, -1.0, 0.0
  ]
  
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

  var colors = [
    1.0,  1.0,  1.0,  1.0,    // white
    1.0,  0.0,  0.0,  1.0,    // red
    0.0,  1.0,  0.0,  1.0,    // green
    0.0,  0.0,  1.0,  1.0     // blue
  ]
  
  squareVerticesColorBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesColorBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW)
}

var perspectiveMatrix

function drawScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  
  perspectiveMatrix = makePerspective(45, horizAspect, 0.1, 100.0)
  
  loadIdentity()
  mvTranslate([-0.0, 0.0, -6.0])

  // mvPushMatrix()
  mvRotate(squareRotation, [1, 1, 1])
  
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer)
  gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0)

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesColorBuffer)
  gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0)

  setMatrixUniforms()
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  // mvPopMatrix()
}

function onFrame() {
  drawScene()
}

function onTick() {
  ++squareRotation
}

function onResize() {
  canvasWidth = window.innerWidth
  canvasHeight = window.innerHeight

  initGl()
}

function hideMouse() {
  document.body.style.cursor = 'none'
}

window.addEventListener('DOMContentLoaded', function(e) {
  init()
})




function loadIdentity() {
  mvMatrix = Matrix.I(4)
}

function multMatrix(m) {
  mvMatrix = mvMatrix.x(m)
}

function mvTranslate(v) {
  multMatrix(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4())
}

function setMatrixUniforms() {
  var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix")
  gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix.flatten()))

  var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix")
  gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()))
}




var mvMatrixStack = []

function mvPushMatrix(m) {
  if (m) {
    mvMatrixStack.push(m.dup())
    mvMatrix = m.dup()
  } else {
    mvMatrixStack.push(mvMatrix.dup())
  }
}

function mvPopMatrix() {
  if (!mvMatrixStack.length) {
    throw new Error('Can\'t pop from an empty matrix stack.')
  }
  
  mvMatrix = mvMatrixStack.pop()
  return mvMatrix
}

function mvRotate(angle, v) {
  var inRadians = angle * Math.PI / 180.0
  
  var m = Matrix.Rotation(inRadians, $V([v[0], v[1], v[2]])).ensure4x4()
  multMatrix(m)
}
