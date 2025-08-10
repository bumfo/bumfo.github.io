/**
 * History Manager - Manages undo/redo functionality for mutations
 * Uses a hidden contenteditable element to hook into browser's native undo/redo
 */
class HistoryManager {
    constructor(stateManager, selectionManager) {
        this.stateManager = stateManager;
        this.selectionManager = selectionManager;
        this.historyStack = [];

        // Create hidden contenteditable for browser undo/redo integration
        this.createHiddenTracker();
        
        // Listen to commits for history recording
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
     * Handle committed mutations from the state manager
     * Only track 'commit' mutations (user mutations), not 'revert' mutations
     */
    onMutationCommit(mutation, eventType) {
        if (eventType === 'commit') {
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
     */
    updateTracker() {
        // Use the tracker to store current stack length
        const range = document.createRange();
        range.selectNodeContents(this.tracker);

        const selection = window.getSelection();
        const currentSelection = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

        selection.removeAllRanges();
        selection.addRange(range);

        // Use execCommand to make it undoable
        document.execCommand('insertText', false, String(this.historyStack.length));

        // Restore original selection
        if (currentSelection) {
            selection.removeAllRanges();
            selection.addRange(currentSelection);
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
                this.selectionManager.restoreSelection();
                break;
            case 'historyRedo':
                this.redo();
                this.selectionManager.restoreSelection();
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
        return this.stateManager.revert(mutation);
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
        return this.stateManager.replay(mutation);
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