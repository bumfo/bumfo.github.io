/**
 * Selection Manager - Handles selection and range management for a specific editor
 */
class SelectionManager {
    constructor(editorElement) {
        this.editor = editorElement;
        this.savedRange = null;
    }

    /**
     * Save the current selection
     * @returns {Range|null} The saved range
     */
    saveSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            this.savedRange = selection.getRangeAt(0).cloneRange();
            return this.savedRange;
        }
        return null;
    }

    /**
     * Restore the previously saved selection
     * @returns {boolean} Whether restoration was successful
     */
    restoreSelection() {
        if (this.savedRange !== null) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(this.savedRange);
            return true;
        }
        return false;
    }

    /**
     * Get the current selection
     * @returns {Selection} The current selection
     */
    getSelection() {
        return window.getSelection();
    }

    /**
     * Get the current range
     * @returns {Range|null} The current range or null if no selection
     */
    getCurrentRange() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            return selection.getRangeAt(0);
        }
        return null;
    }

    /**
     * Check if the current selection is within this editor
     * @returns {boolean} Whether selection is in this editor
     */
    isSelectionInEditor() {
        const range = this.getCurrentRange();
        if (!range) return false;
        
        const container = range.commonAncestorContainer;
        const node = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
        return this.editor.contains(node);
    }

    /**
     * Set selection to a specific range
     * @param {Range} range - The range to select
     */
    setRange(range) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    /**
     * Collapse selection to a point
     * @param {Node} node - The node to collapse to
     * @param {number} offset - The offset within the node
     */
    collapse(node, offset) {
        const selection = window.getSelection();
        selection.collapse(node, offset);
    }

    /**
     * Select all content in an element
     * @param {Element} element - The element to select (defaults to editor)
     */
    selectElement(element = this.editor) {
        const range = document.createRange();
        range.selectNodeContents(element);
        this.setRange(range);
    }

    /**
     * Clear the current selection
     */
    clearSelection() {
        window.getSelection().removeAllRanges();
    }

    /**
     * Check if there's a selection
     * @returns {boolean} Whether there's a selection
     */
    hasSelection() {
        const selection = window.getSelection();
        return selection.rangeCount > 0 && !selection.isCollapsed;
    }

    /**
     * Get the container element of the current selection
     * @returns {Element|null} The container element or null
     */
    getContainerElement() {
        if (!this.isSelectionInEditor()) return null;
        
        const range = this.getCurrentRange();
        if (!range) return null;
        
        let container = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) {
            container = container.parentElement;
        }
        return container;
    }

    /**
     * Get the block element containing the current selection
     * @returns {Element|null} The block element or null
     */
    getBlockElement() {
        if (!this.isSelectionInEditor()) return null;
        
        const range = this.getCurrentRange();
        if (!range) return null;
        
        let block = range.startContainer;
        if (block.nodeType === Node.TEXT_NODE) {
            block = block.parentNode;
        }
        
        // Find the direct child of editor
        while (block && block !== this.editor && block.parentNode !== this.editor) {
            block = block.parentNode;
        }
        
        return block === this.editor ? null : block;
    }

    /**
     * Get all block elements in the current selection
     * @returns {Element[]} Array of block elements
     */
    getSelectedBlocks() {
        if (!this.isSelectionInEditor()) return [];
        
        const range = this.getCurrentRange();
        if (!range) return [];
        
        const blocks = [];
        const startBlock = this.getBlockElement();
        
        if (!startBlock) return blocks;
        
        if (range.collapsed) {
            blocks.push(startBlock);
        } else {
            // Get all blocks between start and end
            let current = startBlock;
            blocks.push(current);
            
            const endContainer = range.endContainer;
            const endNode = endContainer.nodeType === Node.TEXT_NODE ? endContainer.parentNode : endContainer;
            
            while (current && !current.contains(endNode)) {
                current = current.nextElementSibling;
                if (current && this.editor.contains(current)) {
                    blocks.push(current);
                }
            }
        }
        
        return blocks;
    }
}

// Export as global
window.SelectionManager = SelectionManager;