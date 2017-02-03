!function() {
  function fill(x) {
    x = x|0
    for (var i = 0; i < this.length; i++) {
      this[i] = x
    }
    return this
  }

  try { eval('new Array(8).fill(0)') } catch (e) { Array.prototype.fill = fill }
  try { eval('new Int8Array(8).fill(0)') } catch (e) { typeof Int8Array !== 'undefined' && (Int8Array.prototype.fill = fill) }
  try { eval('window.addEventListener("DOMContentLoaded", function() {})') } catch (e) {
    var registry = []
    var p = 'addEventListener'
    var WindowProto = typeof Window === 'undefined' ? window : Window.prototype
    var HTMLDocumentProto = typeof HTMLDocument === 'undefined' ? document : HTMLDocument.prototype
    var ElementProto = typeof Element === 'undefined' ? {} : Element.prototype
    WindowProto[p] = HTMLDocumentProto[p] = ElementProto[p] = function(type, listener) {
      var target = this
      if (type === 'DOMContentLoaded') {
        type = 'load'
      }

      registry.unshift([target, type, listener, function(event) {
        event.currentTarget = target
        event.preventDefault = function () { event.returnValue = false }
        event.stopPropagation = function () { event.cancelBubble = true }
        event.target = event.srcElement || target

        listener.call(target, event)
      }])

      this.attachEvent("on" + type, registry[0][3])
    }
  }
  try { eval('requestAnimationFrame(function() {})') } catch (e) {
    window['requestAnimationFrame'] = function(fn) {
      setTimeout(fn, 1000 / 60)
    }
  }
  try { eval('innerWidth, innerHeight') } catch (e) {
    var onresize = function() {
      window.innerWidth = document.documentElement.clientWidth || document.body.clientWidth
      window.innerHeight = document.documentElement.clientHeight || document.body.clientHeight
    }

    onresize()
    
    window.addEventListener('resize', onresize)
  }
  try { eval('document.createElement("canvas").getContext("2d")') } catch (e) {
    load('s/excanvas.js')

    var createElement = document.createElement
    document.createElement = function(type) {
      var el = createElement.call(document, type)
      if (type === 'canvas') {
        G_vmlCanvasManager.initElement(el)
      }
      return el
    }
  }
}()
