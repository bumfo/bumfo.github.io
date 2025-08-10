/**
 * State Manager - Central hub for all DOM manipulations
 * All editing operations go through this manager to ensure consistency
 * and enable undo/redo functionality
 */
class StateManager {
    constructor() {
        this.handlers = new Map();
        this.commitListeners = [];
        this.beforeCommitListeners = [];
    }

    /**
     * Register a mutation handler
     * @param {string} type - The type of mutation
     * @param {Object} handler - Handler object with apply and revert methods
     */
    registerHandler(type, handler) {
        if (!handler.apply || !handler.revert) {
            throw new Error('Handler must have apply and revert methods');
        }
        this.handlers.set(type, handler);
    }

    /**
     * Apply a mutation (legacy method, triggers events)
     * @param {Object} mutation - The mutation to apply
     * @returns {boolean} - Whether the mutation was applied successfully
     */
    applyChange(mutation) {
        return this._applyMutation(mutation, true);
    }

    /**
     * Commit a user-initiated mutation (recordable)
     * @param {Object} mutation - The mutation to commit
     * @returns {boolean} - Whether the mutation was committed successfully
     */
    commit(mutation) {
        return this._applyMutation(mutation, true);
    }

    /**
     * Replay a history mutation (not recordable)
     * @param {Object} mutation - The mutation to replay
     * @returns {boolean} - Whether the mutation was replayed successfully
     */
    replay(mutation) {
        return this._applyMutation(mutation, false);
    }

    /**
     * Internal apply method
     * @param {Object} mutation - The mutation to apply
     * @param {boolean} notifyHistory - Whether to notify commit listeners
     * @returns {boolean} - Whether the mutation was applied successfully
     */
    _applyMutation(mutation, notifyHistory) {
        const handler = this.handlers.get(mutation.type);
        if (!handler) {
            console.error(`No handler registered for mutation type: ${mutation.type}`);
            return false;
        }

        // Notify before commit listeners
        if (notifyHistory) {
            for (const listener of this.beforeCommitListeners) {
                listener(mutation);
            }
        }

        try {
            handler.apply(mutation);
            
            // Notify listeners after successful commit
            if (notifyHistory) {
                for (const listener of this.commitListeners) {
                    listener(mutation, 'commit');
                }
            }
            
            return true;
        } catch (error) {
            console.error(`Error applying mutation:`, error);
            return false;
        }
    }


    /**
     * Revert a mutation (legacy method, triggers events)
     * @param {Object} mutation - The mutation to revert
     * @returns {boolean} - Whether the mutation was reverted successfully
     */
    revertChange(mutation) {
        return this._revertMutation(mutation, true);
    }

    /**
     * Internal revert method
     * @param {Object} mutation - The mutation to revert
     * @param {boolean} notifyHistory - Whether to notify commit listeners
     * @returns {boolean} - Whether the mutation was reverted successfully
     */
    _revertMutation(mutation, notifyHistory) {
        const handler = this.handlers.get(mutation.type);
        if (!handler) {
            console.error(`No handler registered for mutation type: ${mutation.type}`);
            return false;
        }

        try {
            handler.revert(mutation);
            
            // Notify listeners after successful revert
            if (notifyHistory) {
                for (const listener of this.commitListeners) {
                    listener(mutation, 'revert');
                }
            }
            
            return true;
        } catch (error) {
            console.error(`Error reverting mutation:`, error);
            return false;
        }
    }

    /**
     * Add a listener for mutation commits
     * @param {Function} listener - Function to call when mutations are committed
     */
    addCommitListener(listener) {
        this.commitListeners.push(listener);
    }

    /**
     * Remove a listener for mutation commits
     * @param {Function} listener - Function to remove
     */
    removeCommitListener(listener) {
        const index = this.commitListeners.indexOf(listener);
        if (index > -1) {
            this.commitListeners.splice(index, 1);
        }
    }

    /**
     * Add a listener for before mutation commits
     * @param {Function} listener - Function to call before mutations are committed
     */
    addBeforeCommitListener(listener) {
        this.beforeCommitListeners.push(listener);
    }

    /**
     * Remove a before commit listener
     * @param {Function} listener - Function to remove
     */
    removeBeforeCommitListener(listener) {
        const index = this.beforeCommitListeners.indexOf(listener);
        if (index > -1) {
            this.beforeCommitListeners.splice(index, 1);
        }
    }
}

// Export as global for use in other modules
window.StateManager = StateManager;