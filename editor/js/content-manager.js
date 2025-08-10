/**
 * Content Manager - Handles text content and range operations
 */
class ContentManager {
    constructor(stateManager, caretTracker) {
        this.stateManager = stateManager;
        this.caretTracker = caretTracker;
        this.registerHandlers();
    }

    /**
     * Register all content-related mutation handlers
     */
    registerHandlers() {
        // Text content handler
        this.stateManager.registerHandler('textContent', {
            apply: (mutation) => {
                const { element, newContent, oldContent } = mutation;

                // Store old content if not provided
                if (oldContent === undefined) {
                    mutation.oldContent = element.textContent;
                }

                element.textContent = newContent;
            },

            revert: (mutation) => {
                const { element, oldContent } = mutation;
                element.textContent = oldContent;
            },
        });

        // Delete content handler (using CaretTracker for positioning)
        this.stateManager.registerHandler('deleteContent', {
            apply: (mutation) => {
                const { startCaretState, endCaretState } = mutation;

                // Convert caret states to DOM ranges using CaretTracker
                const startRange = this.caretTracker.createRangeFromCaretState(startCaretState);
                const endRange = this.caretTracker.createRangeFromCaretState(endCaretState);

                if (!startRange || !endRange) return;

                // Create a range spanning the selection
                const deleteRange = document.createRange();
                deleteRange.setStart(startRange.startContainer, startRange.startOffset);
                deleteRange.setEnd(endRange.startContainer, endRange.startOffset);

                // Store deleted content for revert
                mutation.deletedContents = deleteRange.cloneContents();
                mutation.restorePosition = startCaretState;

                // Delete the contents
                deleteRange.deleteContents();
            },

            revert: (mutation) => {
                const { deletedContents, restorePosition } = mutation;

                // Convert restore position to DOM range
                const restoreRange = this.caretTracker.createRangeFromCaretState(restorePosition);
                if (!restoreRange) return;

                // Insert deleted contents back
                restoreRange.insertNode(deletedContents);
            },
        });

        // Insert content handler (using CaretTracker for positioning)
        this.stateManager.registerHandler('insertContent', {
            apply: (mutation) => {
                const { caretState, content } = mutation;

                // Convert caret state to DOM range using CaretTracker
                const insertRange = this.caretTracker.createRangeFromCaretState(caretState);
                if (!insertRange) return;

                // Store position for revert
                mutation.restorePosition = caretState;
                mutation.insertedLength = content.length;

                // Insert the content
                const textNode = document.createTextNode(content);
                insertRange.insertNode(textNode);
            },

            revert: (mutation) => {
                const { restorePosition, insertedLength } = mutation;

                // Convert restore position to DOM range  
                const restoreRange = this.caretTracker.createRangeFromCaretState(restorePosition);
                if (!restoreRange) return;

                // Create range to select inserted content and delete it
                const deleteRange = document.createRange();
                deleteRange.setStart(restoreRange.startContainer, restoreRange.startOffset);
                deleteRange.setEnd(restoreRange.startContainer, restoreRange.startOffset + insertedLength);

                try {
                    deleteRange.deleteContents();
                } catch (error) {
                    // Handle cases where the range might be invalid
                    console.warn('Failed to revert insertContent:', error);
                }
            },
        });
    }

    /**
     * Delete content in the current selection
     * @returns {boolean} Whether the deletion was successful
     */
    deleteSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return false;

        const range = selection.getRangeAt(0);
        if (range.collapsed) return false;

        try {
            // Capture start and end positions using CaretTracker
            const startPos = this.caretTracker.getLogicalPosition(range.startContainer, range.startOffset);
            const endPos = this.caretTracker.getLogicalPosition(range.endContainer, range.endOffset);

            const startCaretState = CaretState.collapsed(startPos.blockIndex, startPos.offset);
            const endCaretState = CaretState.collapsed(endPos.blockIndex, endPos.offset);

            return this.stateManager.commit({
                type: 'deleteContent',
                startCaretState: startCaretState,
                endCaretState: endCaretState,
            });
        } catch (error) {
            console.warn('Failed to delete selection:', error);
            return false;
        }
    }

    /**
     * Insert content at current cursor position
     * @param {string} content - The content to insert
     * @returns {boolean} Whether the insertion was successful
     */
    insertAtCursor(content) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return false;

        const range = selection.getRangeAt(0);
        if (!range.collapsed) {
            // Delete selection first
            if (!this.deleteSelection()) return false;
        }

        try {
            // Capture current position using CaretTracker
            const currentPos = this.caretTracker.getLogicalPosition(range.startContainer, range.startOffset);
            const caretState = CaretState.collapsed(currentPos.blockIndex, currentPos.offset);

            return this.stateManager.commit({
                type: 'insertContent',
                caretState: caretState,
                content: content,
            });
        } catch (error) {
            console.warn('Failed to insert content:', error);
            return false;
        }
    }
}

// Export as global
window.ContentManager = ContentManager;