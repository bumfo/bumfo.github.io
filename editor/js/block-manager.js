/**
 * Block Manager - Handles block-level operations for the editor
 */
class BlockManager {
    constructor(editorElement, stateManager) {
        this.editor = editorElement;
        this.stateManager = stateManager;
    }

    /**
     * Get all block elements in the editor
     * @returns {Element[]} Array of block elements
     */
    getAllBlocks() {
        return Array.from(this.editor.children);
    }

    /**
     * Get block element containing a node
     * @param {Node} node - The node to find the block for
     * @returns {Element|null} The block element or null
     */
    getBlockForNode(node) {
        if (!node) return null;
        
        let block = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
        
        while (block && block !== this.editor && block.parentNode !== this.editor) {
            block = block.parentNode;
        }
        
        return block === this.editor ? null : block;
    }

    /**
     * Check if an element is a block element
     * @param {Element} element - The element to check
     * @returns {boolean} Whether the element is a block
     */
    isBlock(element) {
        return element && element.parentNode === this.editor;
    }

    /**
     * Format a block element to a different tag
     * @param {Element} block - The block to format
     * @param {string} tagName - The new tag name
     * @returns {boolean} Whether the operation was successful
     */
    formatBlock(block, tagName) {
        if (!this.isBlock(block)) return false;
        
        const change = {
            type: 'formatBlock',
            element: block,
            newTag: tagName.toUpperCase()
        };
        
        return this.stateManager.applyChange(change);
    }

    /**
     * Insert a new block element
     * @param {string} tagName - The tag name for the new block
     * @param {string} content - Optional content for the block
     * @param {Element} beforeBlock - Optional block to insert before
     * @returns {Element|null} The created block or null
     */
    insertBlock(tagName, content = '', beforeBlock = null) {
        const newBlock = document.createElement(tagName);
        if (content) {
            newBlock.textContent = content;
        }
        
        const change = {
            type: 'insertElement',
            element: newBlock,
            parent: this.editor,
            before: beforeBlock
        };
        
        if (this.stateManager.applyChange(change)) {
            return newBlock;
        }
        return null;
    }

    /**
     * Remove a block element
     * @param {Element} block - The block to remove
     * @returns {boolean} Whether the operation was successful
     */
    removeBlock(block) {
        if (!this.isBlock(block)) return false;
        
        const change = {
            type: 'removeElement',
            element: block
        };
        
        return this.stateManager.applyChange(change);
    }

    /**
     * Split a block at the current selection point
     * @param {Range} range - The range where to split
     * @returns {Element|null} The new block created after split
     */
    splitBlock(range) {
        if (!range || range.collapsed) return null;
        
        const block = this.getBlockForNode(range.startContainer);
        if (!block) return null;
        
        // TODO: Implement block splitting logic
        // This would extract content after the range into a new block
        return null;
    }

    /**
     * Merge two adjacent blocks
     * @param {Element} firstBlock - The first block
     * @param {Element} secondBlock - The second block
     * @returns {boolean} Whether the merge was successful
     */
    mergeBlocks(firstBlock, secondBlock) {
        if (!this.isBlock(firstBlock) || !this.isBlock(secondBlock)) return false;
        if (firstBlock.nextSibling !== secondBlock) return false;
        
        // TODO: Implement block merging logic
        // This would move content from secondBlock to firstBlock
        return false;
    }

    /**
     * Get the default block tag name
     * @returns {string} The default tag name
     */
    getDefaultBlockTag() {
        return 'P';
    }

    /**
     * Ensure all direct text nodes are wrapped in blocks
     */
    normalizeBlocks() {
        const childNodes = Array.from(this.editor.childNodes);
        
        for (const node of childNodes) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                const p = document.createElement(this.getDefaultBlockTag());
                node.parentNode.insertBefore(p, node);
                p.appendChild(node);
            }
        }
    }

    /**
     * Check if a block is at a specific position
     * @param {Element} block - The block to check
     * @param {string} position - 'first' or 'last'
     * @returns {boolean} Whether the block is at the position
     */
    isBlockAtPosition(block, position) {
        if (!this.isBlock(block)) return false;
        
        if (position === 'first') {
            return block === this.editor.firstElementChild;
        } else if (position === 'last') {
            return block === this.editor.lastElementChild;
        }
        
        return false;
    }

    /**
     * Move a block to a new position
     * @param {Element} block - The block to move
     * @param {Element} beforeBlock - The block to insert before (null for end)
     * @returns {boolean} Whether the move was successful
     */
    moveBlock(block, beforeBlock = null) {
        if (!this.isBlock(block)) return false;
        if (beforeBlock && !this.isBlock(beforeBlock)) return false;
        
        // First remove the block
        const removeChange = {
            type: 'removeElement',
            element: block
        };
        
        // Then insert at new position
        const insertChange = {
            type: 'insertElement',
            element: block,
            parent: this.editor,
            before: beforeBlock
        };
        
        // Apply both changes
        // Note: In a real implementation, this might be a single composite change
        if (this.stateManager.applyChange(removeChange)) {
            return this.stateManager.applyChange(insertChange);
        }
        
        return false;
    }
}

// Export as global
window.BlockManager = BlockManager;