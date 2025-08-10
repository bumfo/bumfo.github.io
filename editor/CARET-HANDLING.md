# Caret Handling Guidelines

## Core Principles

### 1. Caret Handling in Mutations Only
- **DO**: Handle caret positioning in mutation `apply` handlers
- **DON'T**: Handle caret positioning in mutation `revert` handlers (handled by history system)
- **DON'T**: Handle caret positioning in high-level methods (Editor class methods)

### 2. Mutation Apply Handlers
Caret handling should be done in the `apply` handler when:
- The DOM structure changes (elements replaced, moved, or removed)
- Text content is split or merged
- The user expects the caret to be at a specific position after the operation

```javascript
// GOOD: Caret handled in mutation apply
this.stateManager.registerHandler('splitBlock', {
    apply: (mutation) => {
        // ... perform DOM changes ...
        
        // Set caret position for the operation
        mutation.caretStateAfter = CaretState.collapsed(newBlockIndex, 0);
        
        // Restore caret immediately
        this.restoreCaretState(mutation, 'caretStateAfter');
    },
    
    revert: (mutation) => {
        // ... revert DOM changes ...
        // NO caret handling here - history system handles it
    }
});
```

### 3. Mutation Revert Handlers
- **NEVER** manually handle caret in `revert` handlers
- The history system automatically captures and restores caret state
- Adding caret handling in revert would conflict with the history system

### 4. High-Level Methods (Editor Class)
```javascript
// GOOD: Let mutation handle caret
splitCurrentBlock() {
    const { range, block } = this.getNormalizedRangeAndBlock();
    if (!range || !block) return;
    
    const textOffset = this.caretTracker.getLogicalPosition(...).offset;
    
    // Just call the method - caret handled by mutation
    this.blockManager.splitBlock(block, textOffset);
}

// BAD: Manual caret handling in high-level method
splitCurrentBlock() {
    // ... split block ...
    
    // DON'T do this - should be in mutation
    const caretState = CaretState.collapsed(newIndex, 0);
    this.caretTracker.restoreCaretState(caretState);
}
```

## Implementation Patterns

### Pattern 1: Operations Creating New Blocks
For operations that create new blocks (split, insert):
```javascript
apply: (mutation) => {
    // Create and insert new block
    const newBlock = document.createElement(tag);
    parent.insertBefore(newBlock, ...);
    
    // Set caret to start of new block
    mutation.caretStateAfter = CaretState.collapsed(newBlockIndex, 0);
    this.restoreCaretState(mutation, 'caretStateAfter');
}
```

### Pattern 2: Operations Merging Content
For operations that merge blocks:
```javascript
apply: (mutation) => {
    // Store merge point
    const mergeOffset = firstBlock.textContent.length;
    
    // Merge content
    firstBlock.textContent += secondBlock.textContent;
    secondBlock.remove();
    
    // Set caret at merge point
    mutation.caretStateAfter = CaretState.collapsed(blockIndex, mergeOffset);
    this.restoreCaretState(mutation, 'caretStateAfter');
}
```

### Pattern 3: Operations Preserving Caret Position
For operations that should maintain caret position (format changes):
```javascript
apply: (mutation) => {
    // Capture current caret position
    this.captureCaretState(mutation);
    
    // Perform DOM changes that might disrupt selection
    element.parentNode.replaceChild(newElement, element);
    
    // Restore to captured position
    this.restoreCaretState(mutation);
}
```

### Pattern 4: Operations Deleting Blocks
For operations that delete blocks:
```javascript
apply: (mutation) => {
    const previousBlock = block.previousElementSibling;
    
    if (previousBlock) {
        // Move caret to end of previous block
        mutation.caretStateAfter = CaretState.collapsed(
            prevIndex, 
            previousBlock.textContent.length
        );
    }
    
    block.remove();
    
    // Restore caret if we have a position
    this.restoreCaretState(mutation, 'caretStateAfter');
}
```

## DRY Helper Methods

The BlockManager provides two helper methods to avoid code duplication:

### captureCaretState(mutation)
- Captures current caret state before DOM changes
- Stores it in `mutation.caretStateBefore`
- Handles errors gracefully with console warnings

### restoreCaretState(mutation, stateKey)
- Restores caret from mutation object
- Default key is 'caretStateBefore'
- Can specify 'caretStateAfter' for operations that calculate new position
- Handles errors gracefully with console warnings

## Summary Checklist

✅ **DO**:
- Handle caret in mutation `apply` handlers only
- Use DRY helper methods (`captureCaretState`, `restoreCaretState`)
- Calculate appropriate caret position based on operation type
- Store caret state in mutation object for history

❌ **DON'T**:
- Handle caret in mutation `revert` handlers
- Handle caret in Editor class methods (high-level operations)
- Duplicate caret handling logic
- Forget to handle edge cases (e.g., deleting first block)

## Why This Pattern?

1. **Single Responsibility**: Mutations handle both DOM changes and caret positioning
2. **History Integration**: Caret state is automatically part of undo/redo
3. **Consistency**: All caret handling follows the same pattern
4. **Maintainability**: Changes to caret logic are centralized in mutations
5. **Testing**: Easier to test when caret logic is with the operation it belongs to