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

function getChangedChildOf(container, records) {
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

let timeouts = new WeakMap()

function highlightElement(el) {
  el.classList.add('highlight')
  clearTimeout(timeouts.get(el))
  timeouts.set(el, 
    setTimeout(function() {
      if (el.classList.length == 1)
        el.classList.remove('highlight')
      else
        el.removeAttribute('class')
      timeouts.delete(el)
    }, 100)
  )
}

function onMutation(records) {
  let muta = getChangedChildOf(article, records)
  console.log(muta)

  muta.forEach(function(el) {
    highlightElement(el)
  })
}
