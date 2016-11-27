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

function isDescendant(container, node) {
  return container.contains(node) && container != node
}

function proceedUp(container, cur) {
  while (isDescendant(container, cur.parentNode)) {
    cur = cur.parentNode
  }
  return cur
}

function getChangedChildrenOf(container, records) {
  /* get changed children of container */
  return Array.from(
    new Set(
      records
      .map(function(record) {
        return record.target
      })
      .filter(function(target) {
        return isDescendant(container, target)
      })
      .map(function(target) {
        return proceedUp(container, target)
      })
    )
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
    while (str[++i] === '#') {
    }
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

  function saveCaretPosition() {
    let range = getSelectionRange()
    if (!range) {
      savedStartPos = null
      return
    }
    if (!range.collapsed) {
      savedStartPos = null
      console.log('NON COLLAPSED RANGE IS TO BE IMPLEMENTED')
      return
    }

    savedStartPos = proceedUpOffset(range.startContainer, range.startOffset)
  }

  function restoreCaretPosition(elOld, el) {
    if (!savedStartPos)
      return
    // if (elOld === el)
      // return
    if (elOld !== savedStartPos[0])
      return

    let localPos = proceedDownOffset(el, savedStartPos[1])

    if (!localPos) {
      console.error('CNNOT RESTORE POS')
      return
    }

    let range = document.createRange()
    range.setStart(localPos[0], localPos[1])
    replaceSelectionRange(getSelection(), range)
  }

  return {
    save: saveCaretPosition,
    tryRestore: restoreCaretPosition
  }
}(article)

function onMutation(records) {
  let muta = getChangedChildrenOf(article, records)

  CaretPosition.save()
  muta.forEach(function(el) {
    let elOld = el
    el = formatElement(el)
    CaretPosition.tryRestore(elOld, el)

    highlightElement(el)
  })
}
