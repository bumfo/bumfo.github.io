/**
 * Selection utilities - Static methods for selection and range management
 */
class Carets {

    /**
     * Get the current range
     * @returns {Range|null} The current range or null if no selection
     */
    static getCurrentRange() {
        const selection = window.getSelection();
        return selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    }

    /**
     * Check if the current selection is within an editor
     * @param {Element} editor - The editor element to check
     * @returns {boolean} Whether selection is in this editor
     */
    static isSelectionInEditor(editor) {
        const range = Carets.getCurrentRange();
        if (!range) return false;

        const container = range.commonAncestorContainer;
        const node = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
        return editor.contains(node);
    }

    /**
     * Set selection to a specific range (DRY helper for removeAllRanges + addRange)
     * @param {Range} range - The range to select
     */
    static setRange(range) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    /**
     * Select all content in an element
     * @param {Element} element - The element to select
     */
    static selectElement(element) {
        const range = document.createRange();
        range.selectNodeContents(element);
        Carets.setRange(range);
    }

    /**
     * Get the block element containing the current selection
     * @param {Element} editor - The editor element
     * @returns {Element|null} The block element or null
     */
    static getBlockElement(editor) {
        if (!Carets.isSelectionInEditor(editor)) return null;

        const range = Carets.getCurrentRange();
        if (!range) return null;

        let block = range.startContainer;
        if (block.nodeType === Node.TEXT_NODE) {
            block = block.parentNode;
        }

        // Find the direct child of editor
        while (block && block !== editor && block.parentNode !== editor) {
            block = block.parentNode;
        }

        return block === editor ? null : block;
    }
}

// Export as global
window.Carets = Carets;