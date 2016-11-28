let article = document.querySelector('article')
const CaretPosition = require('./CaretPosition.js')(article)
const Util = require('./Util.js')

new MutationObserver(function(records, observer) {
  onMutation(records)
}).observe(article, {
  childList: true,
  // attributes: true,
  characterData: true,
  subtree: true,
  // attributeOldValue: true,
  // characterDataOldValue: true,
  // attributeFilter: [],
})
article.addEventListener('input', function(e) {
  onInput(e)
})
article.addEventListener('compositionstart', function(e) {
  onIMEStart(e)
})
article.addEventListener('compositionupdate', function(e) {
  onIMEUpdate(e)
})
article.addEventListener('compositionend', function(e) {
  onIMEEnd(e)
})
window.addEventListener('undo', function(e) {
  e.preventDefault()
})

function getChangedChildSetOf(container, records) {
  let elSet = new Set()

  records.forEach(function(record) {
    if (record.type === 'characterData')
      elSet.add(record.target)
    else if (record.type === 'childList') {
      elSet.add(record.target)
      record.addedNodes.forEach(function(node) {
        elSet.add(node)
      })
    }
  })

  return new Set(
    Array.from(elSet)
    .filter(function(target) {
      return Util.isDescendant(container, target)
    })
    .map(function(target) {
      return Util.proceedUp(container, target)
    })
  )
}

const highlightElement = function() {
  let timeouts = new WeakMap()

  return function highlightElement(el) {
    el.classList.add('highlight')
    clearTimeout(timeouts.get(el))
    timeouts.set(el,
      setTimeout(function() {
        if (el.classList.length === 1)
          el.removeAttribute('class')
        else
          el.classList.remove('highlight')
        timeouts.delete(el)
      }, 100)
    )
  }
}()

function isSpace(char) {
  return char === ' ' || char === '\xa0'
}

function getFormatedTag(str) {
  let i = 0
  if (str[i] === '#') {
    while (str[++i] === '#') {}
    let count = i
    if (isSpace(str[i]))
      return 'h' + count
    else
      return 'p'
  } else if (str[i] === '>') {
    if (isSpace(str[++i]))
      return 'blockquote'
    else
      return 'p'
  }

  return 'p';
}

function changeTagName(el, tagOld, tagNew) {
  let elNew = document.createElement(tagNew)

  if (el.nodeType === 1) {
    while (el.childNodes.length) {
      elNew.appendChild(el.childNodes[0])
    }
  } else if (el.nodeType === 3) {
    elNew.textContent = el.textContent
  }

  el.parentNode.replaceChild(elNew, el)

  return elNew
}

function formatElementOuter(el) {
  let str = el.textContent
  let tagOld = el.nodeName.toLowerCase()
  let tagNew = getFormatedTag(str)

  if (tagOld !== tagNew) {
    return changeTagName(el, tagOld, tagNew)
  }

  return el
}

function formatElementInner(el) {
  let str = el.textContent

  if (str === '') {
    return
  }

  let code = []

  let div = document.createElement('div')

  let stack = []
  let op = []

  let tags = {
    '*': 'b',
    '_': 'u',
    '/': 'i',
    '-': 's',
  }

  str.replace(/(^#{1,6}\s|^>\s|[*\/\-]|\b_|_\b)|(?:(?![*\/\-]|\b_|_\b).)+/g, function(u, v) {
    if (v) {
      if (/^#{1,6}\s$/.test(v)) {
        stack.push('<tt>')
        stack.push(v)
        stack.push('</tt>')
        return
      }

      if (/^>\s/.test(v)) {
        stack.push('<tt>')
        stack.push(v)
        stack.push('</tt>')
        return
      }

      if (op.length === 0 || op.lastIndexOf(v) === -1) {
        op.push(v)
        stack.push(v)
      } else {
        while (op.length && op[op.length - 1] !== v) {
          op.pop()
        }

        if (op.length) {
          let tag = tags[v]
          let mark = '<tt-' + tag + '><span>' + v + '</span></tt-' + tag + '>'
          let beginTag = '<' + tag + '><span>'
          let endTag = '</span></' + tag + '>'

          op.pop()
          let sta = []
          while (stack.length > 0 && stack[stack.length - 1] !== v) {
            sta.push(stack.pop())
          }
          stack.pop()
          stack.push(mark + beginTag)
          while (sta.length) {
            stack.push(sta.pop())
          }
          stack.push(endTag + mark)
        }
      }
    } else {
      div.textContent = u.replace(/\s+/g, ' ').replace(/^ | $/g, '\xa0')
      stack.push(div.innerHTML)
    }
  })

  let html = stack.join('')

  if (el.innerHTML != html) {
    ignoreMutation = true
    el.innerHTML = html
  }
}

function formatElement(el) {
  el = formatElementOuter(el)
  formatElementInner(el)
  return el
}


let isPausedDOM = false
let changedChildSet = null
let ignoreMutation = false

function onMutation(records) {
  if (ignoreMutation)
    return

  let set = getChangedChildSetOf(article, records)

  if (changedChildSet) {
    set.forEach(function(node) {
      changedChildSet.add(node)
    })
  } else {
    changedChildSet = set
  }

  if (!isPausedDOM) {
    processChangedChildSet()
  }
}

function processChangedChildSet() {
  CaretPosition.save()
  changedChildSet.forEach(function(el) {
    let elOld = el
    el = formatElement(el)
    CaretPosition.tryRestore(elOld, el)

    highlightElement(el)
  })
  changedChildSet = null
}

function onInput(e) {
  ignoreMutation = false
}

function onIMEStart(e) {
  isPausedDOM = true
}

function onIMEUpdate(e) {}

function onIMEEnd(e) {
  isPausedDOM = false
}
