attribute vec2 a_location;

void main(void) {
  gl_Position = vec4(a_location * 0.5, 0.0, 1.0);
}
