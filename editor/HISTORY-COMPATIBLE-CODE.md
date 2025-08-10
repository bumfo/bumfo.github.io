# History-Compatible Code Patterns

## The Problem

When implementing undo/redo functionality with DOM mutations, a common mistake is relying on DOM references that can become stale between the `apply` and `revert` operations. Elements can be removed, moved, or modified, making their `parentNode` references unreliable.

## Core Principle

**Always capture DOM state BEFORE making changes, never rely on stale references.**

## Pattern 1: Element Replacement

### The Wrong Way
```javascript
apply: (mutation) => {
    const { element, newTag } = mutation;
    const newElement = document.createElement(newTag);
    
    // DOM changes happen here
    element.parentNode.replaceChild(newElement, element);
    
    // Store references AFTER changes
    mutation.oldElement = element;
    mutation.newElement = newElement;
},

revert: (mutation) => {
    const { oldElement, newElement } = mutation;
    
    // PROBLEM: newElement.parentNode might be null or wrong!
    // The element could have been removed by other operations
    newElement.parentNode.replaceChild(oldElement, newElement);
}
```

### The Right Way
```javascript
apply: (mutation) => {
    const { element, newTag } = mutation;
    const newElement = document.createElement(newTag);
    
    // GOOD: Capture parent info BEFORE DOM changes
    mutation.oldElement = element;
    mutation.newElement = newElement;
    mutation.parent = element.parentNode;
    mutation.nextSibling = element.nextSibling;
    
    // Move children and replace
    while (element.firstChild) {
        newElement.appendChild(element.firstChild);
    }
    element.parentNode.replaceChild(newElement, element);
},

revert: (mutation) => {
    const { oldElement, newElement, parent, nextSibling } = mutation;
    
    // Restore children to old element
    while (newElement.firstChild) {
        oldElement.appendChild(newElement.firstChild);
    }
    
    // GOOD: Use captured parent info, don't rely on stale references
    newElement.remove();
    parent.insertBefore(oldElement, nextSibling);
}
```

## Pattern 2: Element Insertion/Removal

### Insert Element
```javascript
apply: (mutation) => {
    const { element, parent, before } = mutation;
    
    // GOOD: Store position info before insertion (for potential removal)
    mutation.parent = parent;
    mutation.nextSibling = before;
    
    parent.insertBefore(element, before || null);
},

revert: (mutation) => {
    // GOOD: Element removal is always safe
    mutation.element.remove();
    
    // Position info already captured for potential redo
}
```

### Remove Element
```javascript
apply: (mutation) => {
    const { element } = mutation;
    
    // GOOD: Capture position info BEFORE removal
    mutation.parent = element.parentNode;
    mutation.nextSibling = element.nextSibling;
    
    element.remove();
},

revert: (mutation) => {
    const { element, parent, nextSibling } = mutation;
    
    // GOOD: Use captured position info to restore
    parent.insertBefore(element, nextSibling);
}
```

## Pattern 3: Content Changes

### Text Content
```javascript
apply: (mutation) => {
    const { element, newContent } = mutation;
    
    // GOOD: Always store original state first
    mutation.originalContent = element.textContent;
    
    // Apply change
    element.textContent = newContent;
},

revert: (mutation) => {
    const { element, originalContent } = mutation;
    
    // GOOD: Use captured original state
    element.textContent = originalContent;
}
```

### Attribute Changes
```javascript
apply: (mutation) => {
    const { element, attributeName, newValue } = mutation;
    
    // GOOD: Store original attribute value
    mutation.originalValue = element.getAttribute(attributeName);
    
    element.setAttribute(attributeName, newValue);
},

revert: (mutation) => {
    const { element, attributeName, originalValue } = mutation;
    
    if (originalValue === null) {
        element.removeAttribute(attributeName);
    } else {
        element.setAttribute(attributeName, originalValue);
    }
}
```

## Pattern 4: Complex Operations (Block Split/Merge)

### Block Split
```javascript
apply: (mutation) => {
    const { block, splitOffset } = mutation;
    
    // GOOD: Capture all needed info before changes
    mutation.originalTextContent = block.textContent;
    mutation.parent = block.parentNode;
    
    // Create new block
    const newBlock = document.createElement(block.tagName);
    
    // Split content
    const beforeText = block.textContent.substring(0, splitOffset);
    const afterText = block.textContent.substring(splitOffset);
    
    block.textContent = beforeText;
    newBlock.textContent = afterText;
    
    // Insert new block
    block.parentNode.insertBefore(newBlock, block.nextSibling);
    
    // Store for revert
    mutation.newBlock = newBlock;
},

revert: (mutation) => {
    const { block, newBlock, originalTextContent } = mutation;
    
    // GOOD: Remove new block and restore original content
    newBlock.remove();
    block.textContent = originalTextContent;
}
```

## Why These Patterns Matter

1. **DOM References Can Become Invalid**: Elements can be removed, moved, or replaced by other operations between `apply` and `revert`.

2. **Undo/Redo Isn't Always Sequential**: Users can perform multiple operations, then undo in different orders.

3. **Third-party Code**: Browser extensions, dev tools, or other scripts might modify the DOM.

4. **Race Conditions**: Async operations or event handlers might interfere.

## Key Principles Summary

✅ **DO**:
- Capture `parentNode` and `nextSibling` BEFORE making DOM changes
- Store original content/attributes BEFORE modifying them
- Use `element.remove()` + `parent.insertBefore()` for reliable restoration
- Test undo/redo operations thoroughly, especially with complex sequences

❌ **DON'T**:
- Rely on `element.parentNode` in revert operations
- Use `replaceChild()` with elements that might have been moved
- Assume DOM structure hasn't changed between apply and revert
- Store references to DOM nodes that might be modified by other operations

## Testing Strategy

```javascript
// Test sequence that often reveals stale reference bugs:
1. Apply operation A
2. Apply operation B that affects same elements
3. Undo operation A (tests if references are still valid)
4. Redo operation A
5. Undo operation B
6. Undo operation A again
```

This pattern ensures your mutations remain robust even when DOM structure changes between operations.