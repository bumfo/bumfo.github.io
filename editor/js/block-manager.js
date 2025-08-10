/**
 * Block Manager - Handles block-level operations for the editor
 */
class BlockManager {
    constructor(editorElement, stateManager) {
        this.editor = editorElement;
        this.stateManager = stateManager;
        this.registerHandlers();
    }

    /**
     * Register all block-related mutation handlers
     */
    registerHandlers() {
        // Format block handler
        this.stateManager.registerHandler('formatBlock', {
            apply: (mutation) => {
                const { element, newTag } = mutation;
                const newEl = document.createElement(newTag);

                // Store for revert
                mutation.oldElement = element;
                mutation.newElement = newEl;

                // Move children and replace
                while (element.firstChild) {
                    newEl.appendChild(element.firstChild);
                }
                element.parentNode.replaceChild(newEl, element);
            },

            revert: (mutation) => {
                const { oldElement, newElement } = mutation;
                while (newElement.firstChild) {
                    oldElement.appendChild(newElement.firstChild);
                }
                newElement.parentNode.replaceChild(oldElement, newElement);
            },
        });

        // Insert element handler
        this.stateManager.registerHandler('insertElement', {
            apply: (mutation) => {
                const { element, parent, before } = mutation;
                parent.insertBefore(element, before || null);
            },

            revert: (mutation) => mutation.element.remove(),
        });

        // Remove element handler
        this.stateManager.registerHandler('removeElement', {
            apply: (mutation) => {
                const { element } = mutation;
                mutation.parent = element.parentNode;
                mutation.nextSibling = element.nextSibling;
                element.remove();
            },

            revert: (mutation) => {
                const { element, parent, nextSibling } = mutation;
                parent.insertBefore(element, nextSibling);
            },
        });

        // Split block handler
        this.stateManager.registerHandler('splitBlock', {
            apply: (mutation) => {
                const { block, splitOffset, newBlockTag } = mutation;

                // Store block index for caret tracking
                const blocks = Array.from(this.editor.children);
                mutation.originalBlockIndex = blocks.indexOf(block);

                // Create new block element
                const newBlock = document.createElement(newBlockTag || block.tagName);

                // Store references for revert
                mutation.newBlock = newBlock;
                mutation.originalTextContent = block.textContent;
                mutation.splitOffset = splitOffset;

                // Split the text content
                const textContent = block.textContent;
                const beforeText = textContent.substring(0, splitOffset);
                const afterText = textContent.substring(splitOffset);

                // Update original block
                block.textContent = beforeText;
                newBlock.textContent = afterText;

                // Insert new block after original
                block.parentNode.insertBefore(newBlock, block.nextSibling);

                // Store new block index and caret state for redo (cursor at start of new block)
                mutation.newBlockIndex = mutation.originalBlockIndex + 1;
                mutation.caretStateAfter = CaretState.collapsed(mutation.newBlockIndex, 0);
            },

            revert: (mutation) => {
                const { block, newBlock, originalTextContent } = mutation;

                // Remove the new block
                newBlock.remove();

                // Restore original text content
                block.textContent = originalTextContent;
            },
        });

        // Merge blocks handler  
        this.stateManager.registerHandler('mergeBlocks', {
            apply: (mutation) => {
                const { firstBlock, secondBlock } = mutation;

                // Store block indices and content for revert and caret tracking
                const blocks = Array.from(this.editor.children);
                mutation.firstBlockIndex = blocks.indexOf(firstBlock);
                mutation.secondBlockIndex = blocks.indexOf(secondBlock);
                mutation.firstBlockContent = firstBlock.textContent;
                mutation.secondBlockContent = secondBlock.textContent;
                mutation.mergeOffset = firstBlock.textContent.length;

                // Store second block's tag for proper restoration
                mutation.secondBlockTag = secondBlock.tagName;

                // Set caret state for after merge (cursor at merge point where first block ends)
                mutation.caretStateAfter = CaretState.collapsed(mutation.firstBlockIndex, mutation.mergeOffset);

                // Merge content
                firstBlock.textContent = firstBlock.textContent + secondBlock.textContent;

                // Remove second block
                secondBlock.remove();

                // Restore caret to merge point immediately after DOM changes
                const caretTracker = window.editor?.caretTracker;
                if (caretTracker) {
                    caretTracker.restoreCaretState(mutation.caretStateAfter);
                }
            },

            revert: (mutation) => {
                const { firstBlock, firstBlockContent, secondBlockContent, secondBlockTag } = mutation;

                // Restore original content
                firstBlock.textContent = firstBlockContent;

                // Re-create second block with correct tag
                const secondBlock = document.createElement(secondBlockTag);
                secondBlock.textContent = secondBlockContent;
                mutation.secondBlock = secondBlock; // Update reference

                // Re-insert second block
                firstBlock.parentNode.insertBefore(secondBlock, firstBlock.nextSibling);
            },
        });
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
     * Get the first text node in a block
     */
    getFirstTextNode(block) {
        const walker = document.createTreeWalker(
            block,
            NodeFilter.SHOW_TEXT,
            null,
            false,
        );
        return walker.nextNode();
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

        return this.stateManager.commit({
            type: 'formatBlock',
            element: block,
            newTag: tagName.toUpperCase(),
        });
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

        if (this.stateManager.commit({
            type: 'insertElement',
            element: newBlock,
            parent: this.editor,
            before: beforeBlock,
        })) {
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

        return this.stateManager.commit({
            type: 'removeElement',
            element: block,
        });
    }

    /**
     * Split a block at the specified text offset
     * @param {Element} block - The block to split
     * @param {number} offset - Text offset where to split
     * @param {string} newBlockTag - Optional tag for new block (defaults to same as original)
     * @returns {Element|null} The new block created after split
     */
    splitBlock(block, offset, newBlockTag = null) {
        if (!this.isBlock(block)) return null;

        const success = this.stateManager.commit({
            type: 'splitBlock',
            block: block,
            splitOffset: offset,
            newBlockTag: newBlockTag,
        });

        if (success) {
            // Find the new block that was created
            return block.nextElementSibling;
        }
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
        if (firstBlock.nextElementSibling !== secondBlock) return false;

        return this.stateManager.commit({
            type: 'mergeBlocks',
            firstBlock: firstBlock,
            secondBlock: secondBlock,
        });
    }

    /**
     * Merge current block with previous block
     * @param {Element} block - The block to merge with its previous sibling
     * @returns {boolean} Whether the merge was successful
     */
    mergeWithPrevious(block) {
        if (!this.isBlock(block)) return false;

        const previousBlock = block.previousElementSibling;
        if (!previousBlock || !this.isBlock(previousBlock)) return false;

        return this.mergeBlocks(previousBlock, block);
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

        // Apply both mutations
        // Note: In a real implementation, this might be a single composite mutation
        if (this.stateManager.commit({
            type: 'removeElement',
            element: block,
        })) {
            return this.stateManager.commit({
                type: 'insertElement',
                element: block,
                parent: this.editor,
                before: beforeBlock,
            });
        }

        return false;
    }
}

// Export as global
window.BlockManager = BlockManager;