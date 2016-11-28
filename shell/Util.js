function isDescendant(container, node) {
  return container.contains(node) && container != node
}

function proceedUp(container, cur) {
  while (isDescendant(container, cur.parentNode)) {
    cur = cur.parentNode
  }
  return cur
}

module.exports = {
  isDescendant: isDescendant,
  proceedUp: proceedUp,
}
