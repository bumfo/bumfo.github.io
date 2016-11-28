let article = document.querySelector('article')
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
article.addEventListener('compositionstart', function(e) {
  onIMEStart(e)
})
article.addEventListener('compositionupdate', function(e) {
  onIMEUpdate(e)
})
article.addEventListener('compositionend', function(e) {
  onIMEEnd(e)
})

function isDescendant(container, node) {
  return container.contains(node) && container != node
}

function proceedUp(container, cur) {
  while (isDescendant(container, cur.parentNode)) {
    cur = cur.parentNode
  }
  return cur
}

function getChangedChildSetOf(container, records) {
  let elSet = new Set()

  records.forEach(function(record) {
    if (record.type === 'characterData')
      elSet.add(record.target)
    else if (record.type === 'childList')
      record.addedNodes.forEach(function(node) {
        elSet.add(node)
      })
  })

  return new Set(
    Array.from(elSet)
    .filter(function(target) {
      return isDescendant(container, target)
    })
    .map(function(target) {
      return proceedUp(container, target)
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

function formatElement(el) {
  let str = el.textContent
  let tagOld = el.nodeName.toLowerCase()
  let tagNew = getFormatedTag(str)

  if (tagOld !== tagNew) {
    console.log(tagOld, tagNew)
    return changeTagName(el, tagOld, tagNew)
  }

  return el
}

const CaretPosition = function(container) {
  function getSelection() {
    return window.getSelection()
  }

  function getSelectionRange() {
    let selection = getSelection()
    if (selection.rangeCount > 0)
      return selection.getRangeAt(0)
    return null
  }

  function replaceSelectionRange(selection, range) {
    selection.removeAllRanges()
    selection.addRange(range)
  }

  function proceedUpOffset(cur, offset) {
    while (isDescendant(container, cur.parentNode)) {
      while (cur.previousSibling) {
        cur = cur.previousSibling
        if (cur.nodeType === 1 || cur.nodeType === 3) {
          offset += cur.textContent.length // todo, prove that `textContent` is the best way
        }
      }

      cur = cur.parentNode
    }
    return [cur, offset]
  }

  function proceedDownOffset(cur, offset) {
    // console.log(cur.textContent.length, offset)

    while (cur.textContent.length >= offset) {
      if (cur.nodeType === 3) {
        return [cur, offset]
      } else if (cur.nodeType === 1) {
        if (!cur.firstChild) {
          return [cur, offset]
        }

        cur = cur.firstChild
        if (cur.textContent.length < offset) {
          offset -= cur.textContent.length
        } else {
          continue
        }

        while (cur.nextSibling) {
          cur = cur.nextSibling
          if (cur.nodeType === 1 || cur.nodeType === 3) {
            if (cur.textContent.length < offset) {
              offset -= cur.textContent.length
            } else {
              break
            }
          }
        }
        continue
      } else {
        return null
      }
    }
    return null
  }

  let savedStartPos = null
  let savedEndPos = null
  let savedIsCollapsed = true

  function saveCaretPosition() {
    let range = getSelectionRange()
    if (!range) {
      savedIsCollapsed = true
      savedStartPos = null
      savedEndPos = null
      return
    }
    if (range.collapsed) {
      savedIsCollapsed = true
      savedStartPos = proceedUpOffset(range.startContainer, range.startOffset)
      savedEndPos = savedStartPos
    } else {
      savedIsCollapsed = false
      savedStartPos = proceedUpOffset(range.startContainer, range.startOffset)
      savedEndPos = proceedUpOffset(range.endContainer, range.endOffset)

      if (savedStartPos[0] != savedEndPos[0]) {
        console.log('NON SAME NODE COLLAPSED RANGE IS TO BE IMPLEMENTED')
        console.log([range.startContainer, range.startOffset], [range.endContainer, range.endOffset])
      }
    }
  }

  function restoreCaretPosition(elOld, el) {
    if (!savedStartPos || !savedEndPos)
      return
      // if (elOld === el)
      //   return
    if (elOld !== savedStartPos[0] || elOld !== savedEndPos[0])
      return

    let localStartPos = proceedDownOffset(el, savedStartPos[1])

    if (!localStartPos) {
      console.error('CNNOT RESTORE START POS')
      return
    }

    let changed = false
    let range = getSelectionRange() || document.createRange()

    curStartPos = [range.startContainer, range.startOffset]

    if (curStartPos[0] !== localStartPos[0] || curStartPos[1] !== localStartPos[1]) {
      range.setStart(localStartPos[0], localStartPos[1])
      changed = true
    }

    if (!savedIsCollapsed) {
      let localEndPos = proceedDownOffset(el, savedEndPos[1])

      if (!localEndPos) {
        console.error('CNNOT RESTORE END POS')
        return
      }

      curEndPos = [range.endContainer, range.endOffset]

      if (curEndPos[0] !== localEndPos[0] || curEndPos[1] !== localEndPos[1]) {
        range.setEnd(localEndPos[0], localEndPos[1])
        changed = true
      }
    } else {
      if (!range.collapsed) {
        range.collapse(true)
        changed = true
      }
    }

    if (changed) {
      replaceSelectionRange(getSelection(), range)
    }
  }

  return {
    save: saveCaretPosition,
    tryRestore: restoreCaretPosition
  }
}(article)

let isPausedDOM = false
let changedChildSet = null

function onMutation(records) {
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

function onIMEStart(e) {
  isPausedDOM = true
}
function onIMEUpdate(e) {}
function onIMEEnd(e) {
  isPausedDOM = false
}
