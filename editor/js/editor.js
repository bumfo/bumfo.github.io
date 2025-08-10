/**
 * Main Editor Application
 * Ties together all the managers and sets up the editor
 */
class Editor {
    constructor(editorElement) {
        this.element = editorElement;
        
        // Initialize managers
        this.stateManager = new StateManager();
        this.selectionManager = new SelectionManager(editorElement);
        this.blockManager = new BlockManager(editorElement, this.stateManager);
        this.contentManager = new ContentManager(this.stateManager);
        this.historyManager = new HistoryManager(this.stateManager, this.selectionManager);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Store reference to p4 for demo
        this.p4 = document.getElementById('p4');
    }


    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Keyboard events
        this.element.addEventListener('keydown', this.onKeyDown.bind(this));
        this.element.addEventListener('beforeinput', this.onBeforeInput.bind(this));
        this.element.addEventListener('paste', this.onPaste.bind(this));
        
        // Mouse events
        this.element.addEventListener('mousedown', this.onMouseDown.bind(this));
        
        // Button events (demo)
        const btn = document.getElementById('btn');
        if (btn) {
            btn.addEventListener('mousedown', e => e.preventDefault());
            btn.addEventListener('focus', e => e.preventDefault());
            btn.addEventListener('click', this.onButtonClick.bind(this));
        }
    }

    /**
     * Handle keydown events
     */
    onKeyDown(e) {
        switch (e.key) {
            case 'Enter':
                this.handleEnter(e);
                break;
            case 'Tab':
                this.handleTab(e);
                break;
            case 'Backspace':
                this.handleBackspace(e);
                break;
            case 'Delete':
                this.handleDelete(e);
                break;
        }
    }

    /**
     * Handle Enter key
     */
    handleEnter(e) {
        if (!e.shiftKey) {
            e.preventDefault();
            // TODO: Implement block splitting
        }
    }

    /**
     * Handle Tab key
     */
    handleTab(e) {
        e.preventDefault();
        // TODO: Implement tab handling (indent/outdent)
    }

    /**
     * Handle Backspace key
     */
    handleBackspace(e) {
        const range = this.selectionManager.getCurrentRange();
        if (!range) {
            e.preventDefault();
            return;
        }

        // If there's a selection, let default behavior handle it
        if (!range.collapsed) {
            return;
        }

        const block = this.blockManager.getBlockForNode(range.startContainer);
        if (!block) return;

        // Check if at block start
        if (BlockText.isAtBlockStart(range)) {
            e.preventDefault();
            
            // If not a paragraph, convert to paragraph
            if (block.tagName !== 'P') {
                this.blockManager.formatBlock(block, 'P');
            }
            // TODO: Implement block merging with previous block
        }
    }

    /**
     * Handle Delete key
     */
    handleDelete(e) {
        const range = this.selectionManager.getCurrentRange();
        if (!range) {
            e.preventDefault();
            return;
        }

        // If there's a selection, let default behavior handle it
        if (!range.collapsed) {
            return;
        }

        const block = this.blockManager.getBlockForNode(range.startContainer);
        if (!block) return;

        // Check if at block end
        if (BlockText.isAtBlockEnd(range)) {
            e.preventDefault();
            // TODO: Implement block merging with next block
        }
    }

    /**
     * Handle beforeinput events
     */
    onBeforeInput(e) {
        const selection = this.selectionManager.getSelection();
        if (!selection.isCollapsed) {
            // Delete selected content before inserting new content
            const range = selection.getRangeAt(0);
            this.stateManager.commit({
                type: 'deleteContent',
                range: range
            });
        }
    }

    /**
     * Handle paste events
     */
    onPaste(e) {
        e.preventDefault();
        // TODO: Implement paste handling with sanitization
    }

    /**
     * Handle mousedown events
     */
    onMouseDown(e) {
        let el = e.target;
        if (el !== this.element) {
            // Find the block element
            while (el.parentNode !== this.element) {
                el = el.parentNode;
                if (!el || el === document.body) return;
            }
            
            // Make block contenteditable if needed
            const contenteditable = el.hasAttribute('contenteditable') || this.element.hasAttribute('contenteditable');
            if (!contenteditable) {
                el.setAttribute('contenteditable', '');
            }
        }
    }

    /**
     * Handle button click (demo)
     */
    onButtonClick() {
        // this.selectionManager.saveSelection();
        this.deleteLine();
        // this.selectionManager.restoreSelection();
    }

    /**
     * Demo: Add line
     */
    addLine() {
        if (!this.p4 || this.element.contains(this.p4)) return false;
        
        return this.stateManager.commit({
            type: 'insertElement',
            element: this.p4,
            parent: this.element,
            before: null
        });
    }

    /**
     * Demo: Delete line
     */
    deleteLine() {
        if (!this.p4 || !this.element.contains(this.p4)) return false;
        
        return this.stateManager.commit({
            type: 'removeElement',
            element: this.p4
        });
    }

    /**
     * Execute a command (wrapper for document.execCommand)
     */
    execCommand(command, value = null) {
        if (!document.execCommand(command, false, value)) {
            throw new Error(`Failed to execute command: ${command}`);
        }
    }

    /**
     * Get editor statistics
     */
    getStats() {
        return {
            blocks: this.blockManager.getAllBlocks().length,
            historySize: this.historyManager.getState().stack.length,
            canUndo: this.historyManager.canUndo(),
            canRedo: this.historyManager.canRedo()
        };
    }

    /**
     * Destroy the editor
     */
    destroy() {
        // Remove event listeners
        this.element.removeEventListener('keydown', this.onKeyDown.bind(this));
        this.element.removeEventListener('beforeinput', this.onBeforeInput.bind(this));
        this.element.removeEventListener('paste', this.onPaste.bind(this));
        this.element.removeEventListener('mousedown', this.onMouseDown.bind(this));
        
        // Destroy managers
        this.historyManager.destroy();
    }
}

// Initialize the editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const editorElement = document.getElementById('editor');
    if (editorElement) {
        window.editor = new Editor(editorElement);
        console.log('Editor initialized', window.editor.getStats());
    }
});