/**
 * State Manager - Central hub for all DOM manipulations
 * All editing operations go through this manager to ensure consistency
 * and enable undo/redo functionality
 */
class StateManager {
    constructor() {
        this.handlers = new Map();
        this.listeners = [];
        this.beforeChangeListeners = [];
    }

    /**
     * Register a state change handler
     * @param {string} type - The type of state change
     * @param {Object} handler - Handler object with apply and revert methods
     */
    registerHandler(type, handler) {
        if (!handler.apply || !handler.revert) {
            throw new Error('Handler must have apply and revert methods');
        }
        this.handlers.set(type, handler);
    }

    /**
     * Apply a state change
     * @param {Object} change - The state change to apply
     * @returns {boolean} - Whether the change was applied successfully
     */
    applyChange(change) {
        const handler = this.handlers.get(change.type);
        if (!handler) {
            console.error(`No handler registered for change type: ${change.type}`);
            return false;
        }

        // Notify before change listeners
        for (const listener of this.beforeChangeListeners) {
            listener(change);
        }

        try {
            handler.apply(change);
            
            // Notify listeners after successful change
            for (const listener of this.listeners) {
                listener(change, 'apply');
            }
            
            return true;
        } catch (error) {
            console.error(`Error applying change:`, error);
            return false;
        }
    }

    /**
     * Revert a state change
     * @param {Object} change - The state change to revert
     * @returns {boolean} - Whether the change was reverted successfully
     */
    revertChange(change) {
        const handler = this.handlers.get(change.type);
        if (!handler) {
            console.error(`No handler registered for change type: ${change.type}`);
            return false;
        }

        try {
            handler.revert(change);
            
            // Notify listeners after successful revert
            for (const listener of this.listeners) {
                listener(change, 'revert');
            }
            
            return true;
        } catch (error) {
            console.error(`Error reverting change:`, error);
            return false;
        }
    }

    /**
     * Add a listener for state changes
     * @param {Function} listener - Function to call when state changes
     */
    addChangeListener(listener) {
        this.listeners.push(listener);
    }

    /**
     * Remove a listener for state changes
     * @param {Function} listener - Function to remove
     */
    removeChangeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Add a listener for before state changes
     * @param {Function} listener - Function to call before state changes
     */
    addBeforeChangeListener(listener) {
        this.beforeChangeListeners.push(listener);
    }

    /**
     * Remove a before change listener
     * @param {Function} listener - Function to remove
     */
    removeBeforeChangeListener(listener) {
        const index = this.beforeChangeListeners.indexOf(listener);
        if (index > -1) {
            this.beforeChangeListeners.splice(index, 1);
        }
    }
}

// Export as global for use in other modules
window.StateManager = StateManager;