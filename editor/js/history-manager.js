/**
 * History Manager - Manages undo/redo functionality
 * Uses a hidden contenteditable element to hook into browser's native undo/redo
 */
class HistoryManager {
    constructor(stateManager, selectionManager) {
        this.stateManager = stateManager;
        this.selectionManager = selectionManager;
        this.historyStack = [];
        this.isPerformingHistoryAction = false;

        // Create hidden contenteditable for browser undo/redo integration
        this.createHiddenTracker();

        // Listen to state changes
        this.stateManager.addChangeListener(this.onStateChange.bind(this));
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
     * Handle state changes from the state manager
     */
    onStateChange(change, action) {
        // Ignore changes during history operations
        if (this.isPerformingHistoryAction) return;

        if (action === 'apply') {
            this.pushChange(change);
        }
    }

    /**
     * Push a change to the history stack
     */
    pushChange(change) {
        // Get current index from DOM (0 if empty)
        const currentIndex = this.currentIndex();

        // Remove any changes after current index (for branching history)
        if (currentIndex < this.historyStack.length) {
            this.historyStack = this.historyStack.slice(0, currentIndex);
        }

        this.historyStack.push(change);

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
        // Save current selection before undo/redo
        if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
            this.selectionManager.saveSelection();
        }
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
        e.preventDefault();
        e.target.blur();
        requestAnimationFrame(() => this.selectionManager.restoreSelection());
    }

    /**
     * Perform undo operation
     */
    undo() {
        // DOM index is already reset to the target state when undo event triggers
        // So we use the current DOM value directly as the operation index
        const operationIndex = this.currentIndex();
        const change = this.historyStack[operationIndex];
        if (!change) return false;

        // Mark that we're performing a history action
        this.isPerformingHistoryAction = true;
        const success = this.stateManager.revertChange(change);
        this.isPerformingHistoryAction = false;

        return success;
    }

    /**
     * Perform redo operation
     */
    redo() {
        // For redo, DOM index points to current state, so we need the previous change
        const currentIndex = this.currentIndex();
        if (currentIndex === 0) return false;
        
        const operationIndex = currentIndex - 1;
        const change = this.historyStack[operationIndex];
        if (!change) return false;

        // Mark that we're performing a history action
        this.isPerformingHistoryAction = true;
        const success = this.stateManager.applyChange(change);
        this.isPerformingHistoryAction = false;

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