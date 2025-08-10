/**
 * Block Manager - Handles block-level operations for the editor
 */
class BlockManager {
    constructor(editorElement, stateManager, caretTracker) {
        this.editor = editorElement;
        this.stateManager = stateManager;
        this.caretTracker = caretTracker;
        this.registerHandlers();
    }

    /**
     * DRY helper to capture caret state before DOM changes
     * @param {Object} mutation - The mutation object to store caret state on
     */
    captureCaretState(mutation) {
        const currentRange = Carets.getCurrentRange();
        if (currentRange && this.caretTracker) {
            try {
                mutation.caretStateBefore = this.caretTracker.captureCaretState();
            } catch (error) {
                console.warn('Failed to capture caret state:', error);
            }
        }
    }

    /**
     * DRY helper to restore caret state after DOM changes
     * @param {Object} mutation - The mutation object containing caret state
     * @param {string} stateKey - Key for caret state ('caretStateBefore' or 'caretStateAfter')
     */
    restoreCaretState(mutation, stateKey = 'caretStateBefore') {
        const caretState = mutation[stateKey];
        if (caretState && this.caretTracker) {
            try {
                this.caretTracker.restoreCaretState(caretState);
            } catch (error) {
                console.warn('Failed to restore caret state:', error);
            }
        }
    }

    /**
     * Register all block-related mutation handlers
     */
    registerHandlers() {
        // Format block handler
        this.stateManager.registerHandler('formatBlock', {
            apply: (mutation) => {
                const { element, newElement } = mutation;
                
                // Capture current caret state before DOM changes
                this.captureCaretState(mutation);

                // Store for revert (capture parent info before DOM changes)
                mutation.oldElement = element;
                mutation.parent = element.parentNode;
                mutation.nextSibling = element.nextSibling;

                // Move children and replace
                while (element.firstChild) {
                    newElement.appendChild(element.firstChild);
                }
                element.parentNode.replaceChild(newElement, element);

                // Restore caret position if captured
                this.restoreCaretState(mutation);
            },

            revert: (mutation) => {
                const { oldElement, newElement, parent, nextSibling } = mutation;
                
                // Restore children to old element (reuse existing element)
                while (newElement.firstChild) {
                    oldElement.appendChild(newElement.firstChild);
                }
                
                // Remove new element and restore old element at original position
                newElement.remove();
                parent.insertBefore(oldElement, nextSibling);
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
                const { block, splitOffset, newBlock, atEnd } = mutation;

                // Store block index for caret tracking
                const blocks = Array.from(this.editor.children);
                mutation.originalBlockIndex = blocks.indexOf(block);

                // Store references for revert (newBlock passed from outside)
                mutation.originalTextContent = block.textContent;

                if (atEnd) {
                    // Fast path: assume split at end, newBlock content already set outside
                    // No content changes needed to original block
                } else {
                    // Regular split path
                    mutation.splitOffset = splitOffset;

                    // Split the text content
                    const textContent = block.textContent;
                    const beforeText = textContent.substring(0, splitOffset);
                    const afterText = textContent.substring(splitOffset);

                    // Update original block
                    block.textContent = beforeText;
                    newBlock.textContent = afterText;
                }

                // Insert new block after original
                block.parentNode.insertBefore(newBlock, block.nextSibling);

                // Store new block index and caret state for redo (cursor at start of new block)
                mutation.newBlockIndex = mutation.originalBlockIndex + 1;
                mutation.caretStateAfter = CaretState.collapsed(mutation.newBlockIndex, 0);

                // Restore caret to new block immediately after DOM changes
                this.restoreCaretState(mutation, 'caretStateAfter');
            },

            revert: (mutation) => {
                const { block, newBlock, originalTextContent, atEnd } = mutation;

                // Remove the new block
                newBlock.remove();

                if (!atEnd) {
                    // Restore original text content only if we actually split
                    block.textContent = originalTextContent;
                }
            },
        });

        // Delete block handler (just remove block)
        this.stateManager.registerHandler('deleteBlock', {
            apply: (mutation) => {
                const { block } = mutation;

                // Store position info for revert and caret tracking
                mutation.parent = block.parentNode;
                mutation.nextSibling = block.nextSibling;
                mutation.deletedBlock = block;

                // Store caret state for positioning at end of previous block
                const previousBlock = block.previousElementSibling;
                if (previousBlock) {
                    const blocks = Array.from(this.editor.children);
                    const prevBlockIndex = blocks.indexOf(previousBlock);
                    mutation.caretStateAfter = CaretState.collapsed(prevBlockIndex, previousBlock.textContent.length);
                }
                
                block.remove();

                // Restore caret to end of previous block
                this.restoreCaretState(mutation, 'caretStateAfter');
            },

            revert: (mutation) => {
                const { deletedBlock, parent, nextSibling } = mutation;

                // Re-insert the deleted block DOM element at original position
                parent.insertBefore(deletedBlock, nextSibling);
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

                // Store second block element for reuse in revert
                mutation.removedSecondBlock = secondBlock;

                // Set caret state for after merge (cursor at merge point where first block ends)
                mutation.caretStateAfter = CaretState.collapsed(mutation.firstBlockIndex, mutation.mergeOffset);

                // Merge content
                firstBlock.textContent = firstBlock.textContent + secondBlock.textContent;

                // Remove second block (but keep reference for revert)
                secondBlock.remove();

                // Restore caret to merge point immediately after DOM changes
                this.restoreCaretState(mutation, 'caretStateAfter');
            },

            revert: (mutation) => {
                const { firstBlock, firstBlockContent, secondBlockContent, removedSecondBlock } = mutation;

                // Restore original content
                firstBlock.textContent = firstBlockContent;

                // Reuse the removed second block element
                removedSecondBlock.textContent = secondBlockContent;
                mutation.secondBlock = removedSecondBlock; // Update reference

                // Re-insert second block
                firstBlock.parentNode.insertBefore(removedSecondBlock, firstBlock.nextSibling);
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

        // Create new element outside mutation for reusability
        const newElement = document.createElement(tagName.toUpperCase());

        return this.stateManager.commit({
            type: 'formatBlock',
            element: block,
            newElement: newElement,
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

        // Create new block outside mutation for reusability
        const newBlock = document.createElement(newBlockTag || block.tagName);

        const success = this.stateManager.commit({
            type: 'splitBlock',
            block: block,
            splitOffset: offset,
            newBlock: newBlock,
        });

        if (success) {
            return newBlock;
        }
        return null;
    }

    /**
     * Insert a new block after specified block (split at end with optional content)
     * @param {Element} block - The block to insert after
     * @param {string} content - Optional content for new block
     * @param {string} newBlockTag - Optional tag for new block (defaults to same as original)
     * @returns {Element|null} The new block created
     */
    insertBlockAfter(block, content = '', newBlockTag = null) {
        if (!this.isBlock(block)) return null;

        // Create new block outside mutation for reusability
        const newBlock = document.createElement(newBlockTag || block.tagName);
        newBlock.textContent = content;

        const success = this.stateManager.commit({
            type: 'splitBlock',
            block: block,
            atEnd: true,
            newBlock: newBlock,
        });

        if (success) {
            return newBlock;
        }
        return null;
    }

    /**
     * Delete a block (just removes it, merging handled separately)
     * @param {Element} block - The block to delete
     * @returns {boolean} Whether the deletion was successful
     */
    deleteBlock(block) {
        if (!this.isBlock(block)) return false;

        return this.stateManager.commit({
            type: 'deleteBlock',
            block: block,
        });
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