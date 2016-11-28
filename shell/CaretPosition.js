const Util = require('./Util.js')

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

  function createRange() {
    return document.createRange()
  }

  function replaceSelectionRange(selection, range) {
    selection.removeAllRanges()
    selection.addRange(range)
  }

  function proceedUpOffset(cur, offset) {
    while (Util.isDescendant(container, cur.parentNode)) {
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
    let range = getSelectionRange() || createRange()

    let curStartPos = [range.startContainer, range.startOffset]

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
}

module.exports = CaretPosition
