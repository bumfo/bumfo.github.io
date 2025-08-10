/**
 * Main Editor Application
 * Ties together all the managers and sets up the editor
 */
class Editor {
    constructor(editorElement) {
        this.element = editorElement;

        // Initialize caret tracker shared across managers
        this.caretTracker = new CaretTracker(editorElement);

        // Initialize managers
        this.stateManager = new StateManager();
        this.blockManager = new BlockManager(editorElement, this.stateManager);
        this.historyManager = new HistoryManager(this.stateManager, this.caretTracker);
        this.contentManager = new ContentManager(this.stateManager, this.caretTracker);

        // Create bottom editing bar
        this.createEditingBar();

        // Set up event listeners
        this.setupEventListeners();

        // Store reference to p4 for demo
        this.p4 = document.getElementById('p4');
    }

    /**
     * Create the bottom editing bar
     */
    createEditingBar() {
        // Create toolbar container
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'editor-toolbar';

        // Format buttons group
        const formatGroup = document.createElement('div');
        formatGroup.className = 'toolbar-group';

        const formatButtons = [
            { tag: 'H1', label: 'H1' },
            { tag: 'H2', label: 'H2' },
            { tag: 'H3', label: 'H3' },
            { tag: 'P', label: 'P' },
        ];

        formatButtons.forEach(({ tag, label }) => {
            const btn = document.createElement('button');
            btn.className = 'toolbar-btn format-btn';
            btn.textContent = label;
            btn.dataset.format = tag;
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => this.formatCurrentBlock(tag));
            formatGroup.appendChild(btn);
        });

        // Action buttons group
        const actionGroup = document.createElement('div');
        actionGroup.className = 'toolbar-group';

        const splitBtn = document.createElement('button');
        splitBtn.className = 'toolbar-btn action-btn';
        splitBtn.textContent = 'Split';
        splitBtn.addEventListener('mousedown', (e) => e.preventDefault());
        splitBtn.addEventListener('click', () => this.splitCurrentBlock());

        const mergeBtn = document.createElement('button');
        mergeBtn.className = 'toolbar-btn action-btn';
        mergeBtn.textContent = 'Merge';
        mergeBtn.addEventListener('mousedown', (e) => e.preventDefault());
        mergeBtn.addEventListener('click', () => this.mergeWithPrevious());

        actionGroup.appendChild(splitBtn);
        actionGroup.appendChild(mergeBtn);

        // Add groups to toolbar
        this.toolbar.appendChild(formatGroup);
        this.toolbar.appendChild(actionGroup);

        // Add toolbar to body
        document.body.appendChild(this.toolbar);

        // Store references for later
        this.formatButtons = formatGroup.querySelectorAll('.format-btn');
        this.splitButton = splitBtn;
        this.mergeButton = mergeBtn;

        // Update toolbar state initially and on selection change
        setTimeout(() => this.updateToolbarState(), 0);
    }

    /**
     * Format current block to specified tag
     */
    formatCurrentBlock(tagName) {
        const range = Carets.getCurrentRange();
        if (!range) return;

        const block = this.blockManager.getBlockForNode(range.startContainer);
        if (!block) return;

        this.blockManager.formatBlock(block, tagName);
        this.updateToolbarState();
    }

    /**
     * Split current block at cursor position
     */
    splitCurrentBlock() {
        const range = Carets.getCurrentRange();
        if (!range || !range.collapsed) return;

        const block = this.blockManager.getBlockForNode(range.startContainer);
        if (!block) return;

        // Get text offset within the block using caret tracker
        try {
            const logicalPos = this.caretTracker.getLogicalPosition(range.startContainer, range.startOffset);
            const textOffset = logicalPos.offset;

            // Split the block at the cursor position
            const newBlock = this.blockManager.splitBlock(block, textOffset);

            if (newBlock) {
                // Create caret state for start of new block
                const blocks = Array.from(this.element.children);
                const newBlockIndex = blocks.indexOf(newBlock);
                const newCaretState = CaretState.collapsed(newBlockIndex, 0);

                // Restore caret using the tracker
                this.caretTracker.restoreCaretState(newCaretState);
                this.updateToolbarState();
            }
        } catch (error) {
            console.warn('Failed to split block:', error);
        }
    }

    /**
     * Merge current block with previous block
     */
    mergeWithPrevious() {
        const range = Carets.getCurrentRange();
        if (!range) return;

        const block = this.blockManager.getBlockForNode(range.startContainer);
        if (!block) return;

        const previousBlock = block.previousElementSibling;
        if (!previousBlock) return;

        // Perform the merge - caret positioning is handled by the mutation
        const success = this.blockManager.mergeWithPrevious(block);

        if (success) {
            this.updateToolbarState();
        }
    }

    /**
     * Update toolbar state based on current selection
     */
    updateToolbarState() {
        const range = Carets.getCurrentRange();
        if (!range) return;

        const block = this.blockManager.getBlockForNode(range.startContainer);
        if (!block) return;

        // Update format button states
        this.formatButtons.forEach(btn => {
            const format = btn.dataset.format;
            if (block.tagName === format) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update action button states
        const blocks = this.blockManager.getAllBlocks();
        const blockIndex = blocks.indexOf(block);

        // Disable merge if first block
        this.mergeButton.disabled = blockIndex === 0;

        // Split is always enabled for now
        this.splitButton.disabled = false;
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

        // Selection change events for toolbar updates
        this.element.addEventListener('keyup', () => this.updateToolbarState());
        this.element.addEventListener('mouseup', () => this.updateToolbarState());
        document.addEventListener('selectionchange', () => {
            if (Carets.isSelectionInEditor(this.element)) {
                this.updateToolbarState();
            }
        });

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
        const range = Carets.getCurrentRange();
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
        const range = Carets.getCurrentRange();
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
        const selection = window.getSelection();
        if (!selection.isCollapsed) {
            // Delete selected content before inserting new content
            this.contentManager.deleteSelection();
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
            before: null,
        });
    }

    /**
     * Demo: Delete line
     */
    deleteLine() {
        if (!this.p4 || !this.element.contains(this.p4)) return false;

        return this.stateManager.commit({
            type: 'removeElement',
            element: this.p4,
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
            canRedo: this.historyManager.canRedo(),
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