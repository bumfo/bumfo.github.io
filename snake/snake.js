function sq(x) {
  return x * x;
}

function inRect(x, y, x0, y0, w, h) {
  return x0 <= x && x < x0 + w && y0 <= y && y < y0 + h;
}

let mouseX, mouseY;

let canvas;
let ctx;
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

function init() {
  canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  document.body.style.margin = 0;
  document.body.style.overflow = 'hidden';

  // document.body.style.cursor = 'none';

  onResize();

  window.requestAnimationFrame(function frame() {
    onFrame();
    onTick();
    window.requestAnimationFrame(frame);
  });
}

function initCanvas() {
  canvas.width = canvasWidth * 2;
  canvas.height = canvasHeight * 2;

  canvas.style.width = canvasWidth + 'px';
  canvas.style.height = canvasHeight + 'px';

  ctx = canvas.getContext('2d');

  ctx.lineWidth = 10;
  ctx.scale(2, 2);
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
}

function onFrame() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  drawField();
}

function onTick() {
  updateField();
}

function onResize() {
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;

  initCanvas();
}

function rand(l, r) {
  return ((Math.random() * (r - l)) + l) | 0
}

var N = 50;
var M = 50;

var FIELD_BLANK = 0;
var FIELD_WALL = 1;
var FIELD_HEAD = 2;
var FIELD_BODY = 3;
var FIELD_FOOD = 4;

var A = new Int8Array(N * M).fill(FIELD_BLANK);
var B = new Int8Array(N * M).fill(FIELD_BLANK);

for (var i = 0; i < N; ++i) {
  A[i * M + 0] = FIELD_WALL;
  A[i * M + M - 1] = FIELD_WALL;
}

for (var j = 0; j < M; ++j) {
  A[0 * M + j] = FIELD_WALL;
  A[(N - 1) * M + j] = FIELD_WALL;
}

var ri = rand(3, N - 3);
var rj = rand(3, M - 3);
A[ri * M + rj] = FIELD_HEAD;
A[(ri + 1) * M + rj] = FIELD_BODY;

var SNAKE_I = [ri + 1, ri];
var SNAKE_J = [rj, rj];

var CEIL_WIDTH = 10;
var CEIL_HEIGHT = 10;

var di = 0;
var dj = 1;

function drawField() {
  for (var i = 0; i < N; ++i) {
    for (var j = 0; j < M; ++j) {
      var x = i * CEIL_WIDTH;
      var y = j * CEIL_HEIGHT;

      switch (A[i * M + j]) {
        case FIELD_BLANK: break;
        case FIELD_WALL: 
          ctx.fillStyle = '#000';
          ctx.fillRect(x, y, CEIL_WIDTH, CEIL_HEIGHT);
          break;
        case FIELD_HEAD: 
          ctx.fillStyle = 'red';
          ctx.fillRect(x, y, CEIL_WIDTH, CEIL_HEIGHT);
          break;
        case FIELD_BODY: 
          ctx.fillStyle = 'grey';
          ctx.fillRect(x, y, CEIL_WIDTH, CEIL_HEIGHT);
          break;
        case FIELD_FOOD: 
          ctx.fillStyle = 'yellow';
          ctx.fillRect(x, y, CEIL_WIDTH, CEIL_HEIGHT);
          break;
      }
    }
  }
}

var counter = 0;
var paused = false;

var count_food = 0;

function updateField() {
  ++counter;

  if (paused || counter % 15 !== 0) return;

  var food_i = rand(3, N - 3);
  var food_j = rand(3, M - 3);

  B.set(A);

  var grow = false;

  for (var i = 0; i < N; ++i) {
    for (var j = 0; j < M; ++j) {
      if (A[(i - di) * M + j - dj] !== FIELD_HEAD) {
        switch (A[i * M + j]) {
          case FIELD_BLANK: 
            if (count_food < 1) {
              if (i == food_i && j == food_j) {
                ++count_food;
                B[i * M + j] = FIELD_FOOD;
              } else {
                // B[i * M + j] = FIELD_BLANK;
              }
            }
            break;
          case FIELD_WALL: break;
          case FIELD_HEAD: 
            B[i * M + j] = FIELD_BODY;
            break;
          case FIELD_BODY: 
            break;
          case FIELD_FOOD: break;
        }
      } else {
        switch (A[i * M + j]) {
          case FIELD_BLANK: 
            B[i * M + j] = FIELD_HEAD;
            SNAKE_I.push(i);
            SNAKE_J.push(j);
            break;
          case FIELD_WALL: throw new Error(); break;
          case FIELD_HEAD: throw new Error(); break;
          case FIELD_BODY: throw new Error(); break;
          case FIELD_FOOD: 
            --count_food;
            grow = true;

            B[i * M + j] = FIELD_HEAD;
            SNAKE_I.push(i);
            SNAKE_J.push(j);
            break;
        }
      }
    }
  }

  if (!grow) {
    var tail_i = SNAKE_I.shift();
    var tail_j = SNAKE_J.shift();

    B[tail_i * M + tail_j] = FIELD_BLANK;
  }

  A.set(B);
}

window.addEventListener('DOMContentLoaded', function(e) {
  init();
});

window.addEventListener('keydown', function(e) {
  var ai = 1; var aj = 0;
  var bi = 0; var bj = 1;

  switch (e.code) {
    case 'ArrowLeft':
      ai = 0; aj = 1;
      bi = -1; bj = 0;
      break;
    case 'ArrowRight': 
      ai = 0; aj = -1;
      bi = 1; bj = 0;
      break;
    case 'Space':
      paused = !paused;
      break;
  }

  var ddi = di * ai + dj * aj;
  var ddj = di * bi + dj * bj;

  di = ddi;
  dj = ddj;
});
