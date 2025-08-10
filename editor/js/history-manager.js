/**
 * History Manager - Manages undo/redo functionality for mutations
 * Uses a hidden contenteditable element to hook into browser's native undo/redo
 */
class HistoryManager {
    constructor(stateManager, selectionManager) {
        this.stateManager = stateManager;
        this.selectionManager = selectionManager;
        this.historyStack = [];
        this.caretTracker = new CaretTracker(selectionManager.editor);
        this.cachedSelectionRect = null; // Cache bounding rect for iOS optimization

        // Create hidden contenteditable for browser undo/redo integration
        this.createHiddenTracker();

        // Listen to commits for history recording and caret capture
        this.stateManager.addBeforeCommitListener(this.onBeforeCommit.bind(this));
        this.stateManager.addCommitListener(this.onMutationCommit.bind(this));
    }

    /**
     * Create the hidden contenteditable element for tracking
     */
    createHiddenTracker() {
        this.tracker = document.createElement('div');
        this.tracker.contentEditable = 'true';
        this.tracker.tabIndex = -1;
        // position: absolute;
        // left: -9999px;
        // width: 1px;
        // height: 1px;
        // overflow: hidden;
        this.tracker.style.cssText = `
            user-select: none;
            pointer-events: none;
            position: absolute;
        `;
        this.tracker.setAttribute('aria-hidden', 'true');
        document.body.appendChild(this.tracker);

        // Listen to input events for undo/redo
        this.tracker.addEventListener('beforeinput', this.onBeforeInput.bind(this));
        this.tracker.addEventListener('input', this.onInput.bind(this));
        this.tracker.addEventListener('focus', this.onTrackerFocus.bind(this));
    }

    /**
     * Read current index from DOM tracker (0 if empty)
     */
    currentIndex() {
        return this.tracker.innerText | 0;
    }

    /**
     * Handle before commit to capture caret state
     */
    onBeforeCommit(mutation) {
        // Cache selection bounding rect before DOM changes (iOS optimization)
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            this.cachedSelectionRect = range.getBoundingClientRect();
        }
        
        // Capture current caret state for undo
        mutation.caretStateBefore = this.caretTracker.captureCaretState();
    }

    /**
     * Position tracker using cached selection rect (call only when needed)
     */
    positionTrackerFromCache() {
        if (this.cachedSelectionRect) {
            this.tracker.style.top = this.cachedSelectionRect.top + 'px';
            this.tracker.style.left = (this.cachedSelectionRect.left - 100) + 'px';
        }
    }

    /**
     * Handle committed mutations from the state manager
     * Only track 'commit' mutations (user mutations), not 'revert' mutations
     */
    onMutationCommit(mutation, eventType) {
        if (eventType === 'commit') {
            // Capture caret state after mutation for redo
            mutation.caretStateAfter = this.caretTracker.captureCaretState();
            this.pushMutation(mutation);
        }
    }

    /**
     * Push a mutation to the history stack
     */
    pushMutation(mutation) {
        // Get current index from DOM (0 if empty)
        const currentIndex = this.currentIndex();

        // Remove any mutations after current index (for branching history)
        if (currentIndex < this.historyStack.length) {
            this.historyStack = this.historyStack.slice(0, currentIndex);
        }

        this.historyStack.push(mutation);

        // Update hidden tracker
        this.updateTracker();
    }

    /**
     * Update the hidden tracker element with current index
     * MUST use execCommand for browser to track history properly
     */
    updateTracker() {
        // Save current selection to avoid interference with editor
        const selection = window.getSelection();
        let savedRange = null;
        if (selection.rangeCount > 0) {
            savedRange = selection.getRangeAt(0).cloneRange();
        }

        // Position tracker from cached rect before potential focus (iOS optimization)
        this.positionTrackerFromCache();

        // Select tracker content and update via execCommand
        const range = document.createRange();
        range.selectNodeContents(this.tracker);
        selection.removeAllRanges();
        selection.addRange(range);

        // Use execCommand to make it undoable
        document.execCommand('insertText', false, String(this.historyStack.length));

        // Restore original selection
        selection.removeAllRanges();
        if (savedRange) {
            try {
                selection.addRange(savedRange);
            } catch (e) {
                // Range may be invalid after DOM changes, ignore
            }
        }
    }

    /**
     * Handle beforeinput event on tracker
     */
    onBeforeInput(e) {
        // No need to save selection - StateManager handles caret tracking
        // if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
        //     // Just prevent any potential interference
        //     e.preventDefault();
        // }
    }

    /**
     * Handle input event on tracker
     */
    onInput(e) {
        switch (e.inputType) {
            case 'historyUndo':
                this.undo();
                break;
            case 'historyRedo':
                this.redo();
                break;
        }
    }

    /**
     * Handle focus on tracker (prevent it and restore selection)
     */
    onTrackerFocus(e) {
        // e.preventDefault();
        // e.target.blur();
        // requestAnimationFrame(() => this.selectionManager.restoreSelection());
    }

    /**
     * Perform undo operation
     */
    undo() {
        // DOM index is already reset to the target state when undo event triggers
        // So we use the current DOM value directly as the operation index
        const operationIndex = this.currentIndex();
        const mutation = this.historyStack[operationIndex];
        if (!mutation) return false;

        // Revert the mutation (no history recording)
        const success = this.stateManager.revert(mutation);

        // Restore caret state for undo
        if (success && mutation.caretStateBefore) {
            this.caretTracker.restoreCaretState(mutation.caretStateBefore);
        }

        return success;
    }

    /**
     * Perform redo operation
     */
    redo() {
        // For redo, DOM index points to current state, so we need the previous mutation
        const currentIndex = this.currentIndex();
        if (currentIndex === 0) return false;

        const operationIndex = currentIndex - 1;
        const mutation = this.historyStack[operationIndex];
        if (!mutation) return false;

        // Replay the forward mutation (no history recording)
        const success = this.stateManager.replay(mutation);

        // Restore caret state for redo
        if (success && mutation.caretStateAfter) {
            this.caretTracker.restoreCaretState(mutation.caretStateAfter);
        }

        return success;
    }

    /**
     * Check if undo is possible
     */
    canUndo() {
        const currentIndex = this.currentIndex();
        return this.historyStack[currentIndex] !== undefined;
    }

    /**
     * Check if redo is possible
     */
    canRedo() {
        const currentIndex = this.currentIndex();
        return currentIndex > 0 && this.historyStack[currentIndex - 1] !== undefined;
    }

    /**
     * Clear history
     */
    clear() {
        this.historyStack = [];
        this.tracker.textContent = '0';
    }

    /**
     * Get current history state
     */
    getState() {
        const currentIndex = this.currentIndex();
        return {
            stack: this.historyStack,
            index: currentIndex,
        };
    }

    /**
     * Destroy the history manager
     */
    destroy() {
        if (this.tracker && this.tracker.parentNode) {
            this.tracker.parentNode.removeChild(this.tracker);
        }
    }
}

// Export as global
window.HistoryManager = HistoryManager;