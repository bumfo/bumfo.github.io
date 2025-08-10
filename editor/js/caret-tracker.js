/**
 * Caret State - Represents logical caret position using block indices and text offsets
 * This representation is immune to DOM changes and can be reliably restored
 */
class CaretState {
    constructor(startBlockIndex, startOffset, endBlockIndex = null, endOffset = null) {
        this.startBlockIndex = startBlockIndex;
        this.startOffset = startOffset;
        this.endBlockIndex = endBlockIndex !== null ? endBlockIndex : startBlockIndex;
        this.endOffset = endOffset !== null ? endOffset : startOffset;
        this.isCollapsed = (this.startBlockIndex === this.endBlockIndex && this.startOffset === this.endOffset);
    }

    /**
     * Create a collapsed caret state at a single position
     */
    static collapsed(blockIndex, offset) {
        return new CaretState(blockIndex, offset);
    }

    /**
     * Create a range caret state spanning multiple positions
     */
    static range(startBlockIndex, startOffset, endBlockIndex, endOffset) {
        return new CaretState(startBlockIndex, startOffset, endBlockIndex, endOffset);
    }

    /**
     * Check if this caret state is valid for the given editor
     */
    isValid(editor) {
        const blocks = Array.from(editor.children);
        
        // Check start position
        if (this.startBlockIndex < 0 || this.startBlockIndex >= blocks.length) {
            return false;
        }
        
        const startBlock = blocks[this.startBlockIndex];
        const startTextLength = this.getTextLength(startBlock);
        if (this.startOffset < 0 || this.startOffset > startTextLength) {
            return false;
        }
        
        // Check end position if not collapsed
        if (!this.isCollapsed) {
            if (this.endBlockIndex < 0 || this.endBlockIndex >= blocks.length) {
                return false;
            }
            
            const endBlock = blocks[this.endBlockIndex];
            const endTextLength = this.getTextLength(endBlock);
            if (this.endOffset < 0 || this.endOffset > endTextLength) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Get the text length of a block (visible text only)
     */
    getTextLength(block) {
        return block.textContent.length;
    }

    /**
     * Create a fallback caret state when current state is invalid
     */
    createFallback(editor) {
        const blocks = Array.from(editor.children);
        if (blocks.length === 0) {
            return CaretState.collapsed(0, 0);
        }
        
        // Try to place caret in the closest valid position
        const maxBlockIndex = blocks.length - 1;
        const blockIndex = Math.max(0, Math.min(this.startBlockIndex, maxBlockIndex));
        const block = blocks[blockIndex];
        const maxOffset = this.getTextLength(block);
        const offset = Math.max(0, Math.min(this.startOffset, maxOffset));
        
        return CaretState.collapsed(blockIndex, offset);
    }

    /**
     * Create a copy of this caret state
     */
    clone() {
        return new CaretState(this.startBlockIndex, this.startOffset, this.endBlockIndex, this.endOffset);
    }

    /**
     * String representation for debugging
     */
    toString() {
        if (this.isCollapsed) {
            return `CaretState(${this.startBlockIndex}:${this.startOffset})`;
        }
        return `CaretState(${this.startBlockIndex}:${this.startOffset} -> ${this.endBlockIndex}:${this.endOffset})`;
    }
}

/**
 * Caret Tracker - Converts between DOM Ranges and logical CaretState
 * Handles the complexity of DOM traversal and text offset calculations
 */
class CaretTracker {
    constructor(editor) {
        this.editor = editor;
        this.isUpdating = false; // Flag to prevent recursive operations
    }

    /**
     * Capture the current caret state from the DOM
     */
    captureCaretState() {
        if (this.isUpdating) {
            return null;
        }

        const selection = window.getSelection();
        if (selection.rangeCount === 0) {
            return null;
        }

        let range = selection.getRangeAt(0);
        if (!this.isRangeInEditor(range)) {
            return null;
        }

        // Normalize range to handle special cases (like formatBlock aftermath)
        range = this.normalizeRange(range);

        try {
            const startPos = this.getLogicalPosition(range.startContainer, range.startOffset);
            
            if (range.collapsed) {
                return CaretState.collapsed(startPos.blockIndex, startPos.offset);
            }
            
            const endPos = this.getLogicalPosition(range.endContainer, range.endOffset);
            return CaretState.range(startPos.blockIndex, startPos.offset, endPos.blockIndex, endPos.offset);
            
        } catch (error) {
            console.warn('Failed to capture caret state:', error);
            return null;
        }
    }

    /**
     * Restore a caret state to the DOM
     */
    restoreCaretState(caretState) {
        if (!caretState || this.isUpdating) {
            return false;
        }

        // Validate the caret state
        if (!caretState.isValid(this.editor)) {
            caretState = caretState.createFallback(this.editor);
        }

        this.isUpdating = true;
        
        try {
            const range = this.createRangeFromCaretState(caretState);
            if (range) {
                Carets.setRange(range);
                return true;
            }
        } catch (error) {
            console.warn('Failed to restore caret state:', error);
        } finally {
            this.isUpdating = false;
        }
        
        return false;
    }

    /**
     * Convert logical position to DOM Range
     */
    createRangeFromCaretState(caretState) {
        const blocks = Array.from(this.editor.children);
        
        // Validate block indices
        if (caretState.startBlockIndex >= blocks.length || caretState.startBlockIndex < 0) {
            return null;
        }
        
        const startPos = this.getDOMPosition(blocks[caretState.startBlockIndex], caretState.startOffset);
        if (!startPos) return null;
        
        const range = document.createRange();
        range.setStart(startPos.node, startPos.offset);
        
        if (caretState.isCollapsed) {
            range.collapse(true);
        } else {
            // Validate end block index
            if (caretState.endBlockIndex >= blocks.length || caretState.endBlockIndex < 0) {
                range.collapse(true);
            } else {
                const endPos = this.getDOMPosition(blocks[caretState.endBlockIndex], caretState.endOffset);
                if (endPos) {
                    range.setEnd(endPos.node, endPos.offset);
                } else {
                    range.collapse(true);
                }
            }
        }
        
        return range;
    }

    /**
     * Get logical position (block index + text offset) from DOM position
     */
    getLogicalPosition(node, offset) {
        const blocks = Array.from(this.editor.children);
        
        // Find the containing block
        let blockElement = node;
        if (node.nodeType === Node.TEXT_NODE) {
            blockElement = node.parentElement;
        }
        
        // Walk up to find the block (direct child of editor)
        while (blockElement && blockElement.parentNode !== this.editor) {
            blockElement = blockElement.parentNode;
        }
        
        if (!blockElement) {
            throw new Error('Node not found in editor');
        }
        
        const blockIndex = blocks.indexOf(blockElement);
        if (blockIndex === -1) {
            throw new Error('Block not found in editor children');
        }
        
        // Calculate text offset within the block
        const textOffset = this.getTextOffsetInBlock(blockElement, node, offset);
        
        return { blockIndex, offset: textOffset };
    }

    /**
     * Get DOM position (node + offset) from block and text offset
     */
    getDOMPosition(block, textOffset) {
        if (!block) return null;
        
        let currentOffset = 0;
        const walker = document.createTreeWalker(
            block,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            const nodeLength = node.textContent.length;
            
            if (currentOffset + nodeLength >= textOffset) {
                const offsetInNode = textOffset - currentOffset;
                return { node, offset: offsetInNode };
            }
            
            currentOffset += nodeLength;
        }
        
        // If we reach here, place at end of block
        // Find the last text node by walking through all nodes
        let lastTextNode = null;
        walker.currentNode = block;
        let currentNode;
        while (currentNode = walker.nextNode()) {
            if (currentNode.nodeType === Node.TEXT_NODE) {
                lastTextNode = currentNode;
            }
        }
        
        if (lastTextNode) {
            return { node: lastTextNode, offset: lastTextNode.textContent.length };
        }
        
        // Fallback: place at end of block element
        return { node: block, offset: block.childNodes.length };
    }

    /**
     * Calculate text offset within a block for a given DOM position
     */
    getTextOffsetInBlock(block, targetNode, targetOffset) {
        let textOffset = 0;
        
        const walker = document.createTreeWalker(
            block,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            if (node === targetNode) {
                return textOffset + targetOffset;
            }
            textOffset += node.textContent.length;
        }
        
        // If target node is not a text node, it might be an element
        if (targetNode.nodeType === Node.ELEMENT_NODE) {
            // Find the text offset up to this element
            const walker2 = document.createTreeWalker(
                block,
                NodeFilter.SHOW_ALL,
                null,
                false
            );
            
            let currentTextOffset = 0;
            let currentNode;
            
            while (currentNode = walker2.nextNode()) {
                if (currentNode === targetNode) {
                    return currentTextOffset;
                }
                if (currentNode.nodeType === Node.TEXT_NODE) {
                    currentTextOffset += currentNode.textContent.length;
                }
            }
        }
        
        // Fallback to block end
        return block.textContent.length;
    }

    /**
     * Normalize range to handle special cases like caret at editor level
     * Converts |<h1>xxx to <h1>|xxx
     */
    normalizeRange(range) {
        const normalizedRange = range.cloneRange();
        
        // Fix start position if it's at editor level
        if (range.startContainer === this.editor && range.startOffset < this.editor.childNodes.length) {
            const targetNode = this.editor.childNodes[range.startOffset];
            if (targetNode && targetNode.nodeType === Node.ELEMENT_NODE) {
                // Move caret to start of the block element
                const firstTextNode = this.getFirstTextNode(targetNode);
                if (firstTextNode) {
                    normalizedRange.setStart(firstTextNode, 0);
                } else {
                    // No text node, place at start of block element
                    normalizedRange.setStart(targetNode, 0);
                }
            }
        }
        
        // Fix end position if it's at editor level
        if (range.endContainer === this.editor && range.endOffset < this.editor.childNodes.length) {
            const targetNode = this.editor.childNodes[range.endOffset];
            if (targetNode && targetNode.nodeType === Node.ELEMENT_NODE) {
                const firstTextNode = this.getFirstTextNode(targetNode);
                if (firstTextNode) {
                    normalizedRange.setEnd(firstTextNode, 0);
                } else {
                    normalizedRange.setEnd(targetNode, 0);
                }
            }
        }
        
        // If range was collapsed, keep it collapsed
        if (range.collapsed) {
            normalizedRange.collapse(true);
        }
        
        return normalizedRange;
    }

    /**
     * Get the first text node in a block
     */
    getFirstTextNode(block) {
        const walker = document.createTreeWalker(
            block,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        return walker.nextNode();
    }

    /**
     * Check if a range is within the editor
     */
    isRangeInEditor(range) {
        const startInEditor = this.editor.contains(range.startContainer);
        const endInEditor = this.editor.contains(range.endContainer);
        return startInEditor && endInEditor;
    }

    /**
     * Get block index for a DOM node
     */
    getBlockIndex(node) {
        let blockElement = node;
        if (node.nodeType === Node.TEXT_NODE) {
            blockElement = node.parentElement;
        }
        
        while (blockElement && blockElement.parentNode !== this.editor) {
            blockElement = blockElement.parentNode;
        }
        
        if (!blockElement) return -1;
        
        return Array.from(this.editor.children).indexOf(blockElement);
    }
}

// Export as globals
window.CaretState = CaretState;
window.CaretTracker = CaretTracker;