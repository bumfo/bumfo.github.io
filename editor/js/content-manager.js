/**
 * Content Manager - Handles text content and range operations
 */
class ContentManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
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
            }
        });

        // Delete content handler
        this.stateManager.registerHandler('deleteContent', {
            apply: (mutation) => {
                const { range } = mutation;
                
                // Store deleted contents for revert
                mutation.deletedContents = range.cloneContents();
                mutation.startContainer = range.startContainer;
                mutation.startOffset = range.startOffset;
                
                range.deleteContents();
            },
            
            revert: (mutation) => {
                const { deletedContents, startContainer, startOffset } = mutation;
                
                // Create range to insert deleted content back
                const range = document.createRange();
                range.setStart(startContainer, startOffset);
                range.collapse(true);
                
                range.insertNode(deletedContents);
            }
        });
    }
}

// Export as global
window.ContentManager = ContentManager;