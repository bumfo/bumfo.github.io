/**
 * History Manager - Manages undo/redo functionality
 * Uses a hidden contenteditable element to hook into browser's native undo/redo
 */
class HistoryManager {
    constructor(stateManager, selectionManager) {
        this.stateManager = stateManager;
        this.selectionManager = selectionManager;
        this.historyStack = [];
        this.currentIndex = -1;
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
        this.tracker.style.cssText = `
            position: absolute;
            left: -9999px;
            width: 1px;
            height: 1px;
            overflow: hidden;
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
        // Remove any changes after current index (for branching history)
        if (this.currentIndex < this.historyStack.length - 1) {
            this.historyStack = this.historyStack.slice(0, this.currentIndex + 1);
        }
        
        this.historyStack.push(change);
        this.currentIndex++;
        
        // Update hidden tracker
        this.updateTracker();
    }

    /**
     * Update the hidden tracker element with current index
     */
    updateTracker() {
        // Use the tracker to store current index
        const range = document.createRange();
        range.selectNodeContents(this.tracker);
        
        const selection = window.getSelection();
        const currentSelection = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
        
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Use execCommand to make it undoable
        document.execCommand('insertText', false, String(this.currentIndex + 1));
        
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
        if (!this.canUndo()) return false;
        
        const change = this.historyStack[this.currentIndex];
        this.currentIndex--;
        
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
        if (!this.canRedo()) return false;
        
        this.currentIndex++;
        const change = this.historyStack[this.currentIndex];
        
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
        return this.currentIndex >= 0;
    }

    /**
     * Check if redo is possible
     */
    canRedo() {
        return this.currentIndex < this.historyStack.length - 1;
    }

    /**
     * Clear history
     */
    clear() {
        this.historyStack = [];
        this.currentIndex = -1;
        this.tracker.textContent = '0';
    }

    /**
     * Get current history state
     */
    getState() {
        return {
            stack: this.historyStack,
            index: this.currentIndex
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