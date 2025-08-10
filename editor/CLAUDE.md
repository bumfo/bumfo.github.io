# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a custom rich text editor built with vanilla HTML, CSS, and JavaScript. The editor features:

- Contenteditable-based editing with custom keyboard handling
- Block-level element manipulation (headings, paragraphs)
- Custom undo/redo history system with DOM-based state tracking
- Advanced text selection and range management
- Block text utilities for layout-free text processing
- Clean separation of concerns with specialized managers

## Architecture

### Core Design Principles

- **Separation of Concerns**: Each manager handles its own domain and registers its own handlers
- **DOM-based State**: History index stored in DOM to prevent state drift
- **Mutation-based Updates**: All state changes are expressed as mutations
- **Clean Event Flow**: User actions (commits) are recorded, history operations (replay/revert) are not

### Component Structure

#### State Management System

- **StateManager**: Central mutation handler with clean interface
  - `commit(mutation)`: Apply user-initiated mutation (recorded in history)
  - `replay(mutation)`: Replay history mutation (not recorded)
  - `revert(mutation)`: Revert mutation for undo (not recorded)
  - Single internal `_executeMutation()` method avoids duplication
  - Commit listeners only notified for user actions

#### Specialized Managers

- **Editor**: High-level orchestration and user interaction
  - Event handling (keyboard, mouse, paste prevention)
  - Coordination between managers
  - No direct DOM manipulation or handler registration

- **BlockManager**: Block-level operations
  - Self-registers handlers: `formatBlock`, `insertElement`, `removeElement`
  - High-level methods: `formatBlock()`, `insertBlock()`, `removeBlock()`
  - Inline apply/revert functions for clean implementation

- **ContentManager**: Text and range operations
  - Self-registers handlers: `textContent`, `deleteContent`
  - Handles text content changes and range deletions

- **SelectionManager**: Selection and cursor management
  - `saveSelection()` / `restoreSelection()`: Preserves cursor across operations
  - Works with Range and Selection APIs

- **HistoryManager**: Undo/redo functionality
  - Uses hidden contenteditable div to hook into browser's native undo/redo
  - DOM-based index tracking (no separate currentIndex variable)
  - Listens only to commit events (no circular dependencies)
  - Direct `revert()` for undo, `replay()` for redo

### Mutation Flow

1. **User Action** → `stateManager.commit(mutation)` → Records in history
2. **Undo** → `stateManager.revert(mutation)` → No recording
3. **Redo** → `stateManager.replay(mutation)` → No recording

### Key Implementation Details

#### History System

- **DOM-based Index**: History index stored in hidden div's innerText
  - Empty div = index 0
  - Prevents drift between internal state and browser undo/redo
- **Clean Event Separation**: Only commits trigger history recording
- **No Flags Needed**: Clean architectural separation eliminates circular dependencies

#### BlockText Module

Advanced text utilities that work without forcing layout calculations:
- `isAtBlockStart()` / `isAtBlockEnd()`: Detect cursor position at block boundaries
- `getVisibleOffsetFromBlockStart()`: Calculate text offset with whitespace collapsing
- Handles CSS `white-space` properties, hidden elements, and atomic inlines
- Supports both CSS-aware and fallback block detection

### Event Handling

- **Keyboard events**: Custom handling for Enter, Tab, Backspace, Delete keys
- **Input events**: Processes `historyUndo` and `historyRedo` input types
- **Mouse events**: Dynamic contenteditable attribute management
- **Paste prevention**: All paste operations are blocked

## Code Style Guidelines

- **No redundant variables**: Use direct object literals for mutations
- **Inline handlers**: Define apply/revert inline unless complex
- **DRY principle**: Avoid duplication, consolidate common patterns
- **Self-registration**: Managers register their own handlers in constructor

## File Structure

```
editor/
├── index.html                 # Main entry point
├── history.html              # Original prototype implementation
├── js/
│   ├── editor.js            # Main editor orchestration
│   ├── state-manager.js     # Central mutation handling
│   ├── block-manager.js     # Block-level operations
│   ├── content-manager.js   # Text/range operations
│   ├── selection-manager.js # Selection/cursor management
│   ├── history-manager.js   # Undo/redo functionality
│   └── block-text.js        # Text position utilities
└── css/
    └── editor.css           # Editor styles
```

## Development Notes

- No build system or package.json - pure vanilla implementation
- No external dependencies or frameworks
- Uses modern browser APIs (Range, Selection, TreeWalker, etc.)
- Each manager is self-contained with both interface and implementation

## Caret Handling

**Key Rule**: Caret positioning belongs in mutation `apply` handlers ONLY - never in `revert` handlers (history system handles that) or high-level methods (Editor class).

### Core Patterns:
- **Creating blocks** → Position caret at start of new block
- **Merging content** → Position caret at merge point  
- **Preserving position** → Capture before, restore after (e.g., formatBlock)
- **Deleting blocks** → Move caret to end of previous block

### DRY Helpers:
- `this.captureCaretState(mutation)` - Captures current position
- `this.restoreCaretState(mutation, 'caretStateAfter')` - Restores to calculated position

See [CARET-HANDLING.md](./CARET-HANDLING.md) for detailed guidelines and implementation patterns.

## History-Compatible Code

**Critical Rule**: Always capture DOM state BEFORE making changes, never rely on stale references.

- **Element replacement**: Capture `parentNode` and `nextSibling` before DOM changes
- **Revert operations**: Use `remove()` + `insertBefore()` instead of `replaceChild()` with stale refs
- **Content changes**: Store original state first, then apply changes

Example:
```javascript
// GOOD: Capture parent info before changes
mutation.parent = element.parentNode;
mutation.nextSibling = element.nextSibling;

// GOOD: Revert with captured info
newElement.remove();
parent.insertBefore(oldElement, nextSibling);

// BAD: Stale reference - parentNode might be null
newElement.parentNode.replaceChild(oldElement, newElement);
```

See [HISTORY-COMPATIBLE-CODE.md](./HISTORY-COMPATIBLE-CODE.md) for detailed patterns and examples.

## Element Creation Patterns

**Best Practice**: Create DOM elements outside mutations when possible, pass them in as parameters.

**Critical Rule**: Avoid creating elements repeatedly in apply/revert - reuse the same DOM elements to maintain identical tree structure during undo/redo operations.

- **Benefits**: Element reuse in revert operations, cleaner mutation logic, better performance
- **Pattern**: `createElement()` in high-level method, pass element to mutation
- **Revert**: Reuse existing DOM elements instead of creating new ones
- **Identity**: Same DOM elements across apply/revert cycles prevents bugs and simplifies implementation

```javascript
// GOOD: Create element outside, pass to mutation
formatBlock(block, tagName) {
    const newElement = document.createElement(tagName);
    return this.stateManager.commit({
        element: block,
        newElement: newElement,
    });
}

// GOOD: Store and reuse DOM elements in mutations
apply: (mutation) => {
    // Store element for revert
    mutation.removedElement = element;
    element.remove();
},
revert: (mutation) => {
    // Reuse same DOM element
    parent.insertBefore(mutation.removedElement, nextSibling);
}
```