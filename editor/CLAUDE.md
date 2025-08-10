# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a custom rich text editor built with vanilla HTML, CSS, and JavaScript. The editor features:

- Contenteditable-based editing with custom keyboard handling
- Block-level element manipulation (headings, paragraphs)
- Custom undo/redo history system
- Advanced text selection and range management
- Block text utilities for layout-free text processing

## Architecture

### Core Components

- **Single HTML file structure**: `history.html` contains the complete editor implementation
- **Editor element**: Main contenteditable article with id `#editor`
- **History system**: Custom undo/redo using `historyStack` array and hidden div for state tracking
- **Block text utilities**: `BlockText` module provides advanced text position detection without layout calculations

### Key Functions

- `saveSelection()` / `restoreSelection()`: Manages cursor position across operations
- `formatBlock(el, tag)`: Converts block elements between different HTML tags (e.g., P to H2)
- `addLine()` / `deleteLine()`: Dynamic content manipulation with history tracking
- `appendHistory()`: Records operations for undo/redo functionality

### Event Handling

- **Keyboard events**: Custom handling for Enter, Tab, Backspace, Delete keys
- **Input events**: Processes `historyUndo` and `historyRedo` input types
- **Mouse events**: Dynamic contenteditable attribute management
- **Paste prevention**: All paste operations are blocked

### BlockText Module

Advanced text utilities that work without forcing layout calculations:
- `isAtBlockStart()` / `isAtBlockEnd()`: Detect cursor position at block boundaries
- `getVisibleOffsetFromBlockStart()`: Calculate text offset with whitespace collapsing
- Handles CSS `white-space` properties, hidden elements, and atomic inlines
- Supports both CSS-aware and fallback block detection

## Development Notes

- No build system or package.json - pure vanilla implementation
- No external dependencies or frameworks
- Self-contained in a single HTML file with embedded CSS and JavaScript
- Uses modern browser APIs (Range, Selection, TreeWalker, etc.)