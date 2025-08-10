/**
 * Block text utilities (layout-free).
 *
 * Public API:
 *   isAtBlockStart(input, opts?)
 *   isAtBlockEnd(input, opts?)
 *   getVisibleOffsetFromBlockStart(input, opts?)  // offset to the chosen boundary (start by default)
 *
 * Notes:
 * - `input` can be a Selection or a Range.
 * - By default:
 *    - CSS is respected to detect blocks and pre-like whitespace (no layout forced).
 *    - display:none / [hidden] content is ignored.
 *    - NBSP counts as visible (1 char).
 *    - Zero-width codepoints are ignored.
 *    - <br> counts as 1 visible char (represented as "\n" conceptually).
 */
const BlockText = (() => {
    const BANNED = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/;

    function isSelection(x) {
        return x && typeof x.getRangeAt === 'function' && x.rangeCount > 0;
    }

    function toRange(input) {
        if (input instanceof Range) return input.cloneRange();
        if (isSelection(input)) return input.getRangeAt(0).cloneRange();
        return null;
    }

    function nearestBlockAncestor(node, { respectCSS }) {
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        for (let cur = node; cur && cur.nodeType === 1; cur = cur.parentNode) {
            const el = /** @type {Element} */(cur);
            if (!respectCSS) {
                // Quick fallback: common block-ish tags
                if (/^(P|DIV|LI|BLOCKQUOTE|SECTION|ARTICLE|ASIDE|MAIN|HEADER|FOOTER|UL|OL|TABLE|TR|TD|TH|FIGURE|FIGCAPTION|FIELDSET|LEGEND|NAV|DL|DT|DD|H[1-6])$/.test(el.tagName)) {
                    return el;
                }
            } else {
                const d = getComputedStyle(el).display;
                if (
                    d === 'block' || d === 'flow-root' || d === 'list-item' ||
                    d === 'table' || d === 'table-row-group' || d === 'table-header-group' ||
                    d === 'table-footer-group' || d === 'table-row' || d === 'table-cell' ||
                    d === 'grid' || d === 'flex'
                ) return el;
            }
        }
        return null;
    }

    function isPreLike(el, respectCSS) {
        if (!el) return false;
        if (el.closest('pre,textarea')) return true;
        if (!respectCSS) return false;
        for (let cur = el; cur; cur = cur.parentElement) {
            const ws = getComputedStyle(cur).whiteSpace;
            if (ws === 'pre' || ws === 'pre-wrap') return true;
            if (ws === 'nowrap') return false; // still collapses ASCII spaces
        }
        return false;
    }

    function isAtomicInline(el, respectCSS) {
        const tag = el.tagName;
        if (/^(IMG|INPUT|BUTTON|SELECT|TEXTAREA|VIDEO|AUDIO|IFRAME|CANVAS|SVG|MATH|PROGRESS|METER|EMBED|OBJECT)$/.test(tag)) {
            return true;
        }
        if (!respectCSS) return false;
        const d = getComputedStyle(el).display;
        return d === 'inline-block' || d === 'inline-flex' || d === 'inline-grid';
    }

    function hasHiddenAncestor(el, stopAt, respectCSS) {
        for (let cur = el; cur && cur !== stopAt.parentElement; cur = cur.parentElement) {
            if (cur.hidden) return true;
            if (respectCSS) {
                const cs = getComputedStyle(cur);
                if (cs.display === 'none') return true;
            }
        }
        return false;
    }

    function isBanned(el) {
        return BANNED.test(el.tagName);
    }

    function isInBannedContainer(el) {
        for (let cur = el; cur; cur = cur.parentElement) if (isBanned(cur)) return true;
        return false;
    }

    function intersects(range, node) {
        if (typeof range.intersectsNode === 'function') {
            try {
                return range.intersectsNode(node);
            } catch { /* old engines */
            }
        }
        const r = (node.ownerDocument || document).createRange();
        try {
            r.selectNode(node);
        } catch {
            if (node.nodeType === Node.TEXT_NODE) {
                r.setStart(node, 0);
                r.setEnd(node, node.nodeValue ? node.nodeValue.length : 0);
            } else {
                return false;
            }
        }
        return !(r.compareBoundaryPoints(Range.END_TO_START, range) <= 0 ||
            r.compareBoundaryPoints(Range.START_TO_END, range) >= 0);
    }

    function collapsedBoundaryRange(input, edge) {
        const r = toRange(input);
        if (!r) return null;
        const out = r.cloneRange();
        if (edge === 'end') out.collapse(false); else out.collapse(true);
        return out;
    }

    function sliceRange(block, edgeRange, side /* 'before' | 'after' */) {
        const doc = block.ownerDocument || document;
        const s = doc.createRange();
        if (side === 'before') {
            s.setStart(block, 0);
            s.setEnd(edgeRange.startContainer, edgeRange.startOffset);
        } else {
            s.setStart(edgeRange.endContainer, edgeRange.endOffset);
            s.setEnd(block, block.childNodes.length);
        }
        return s;
    }

    function makeWalker(block, slice, { respectCSS, skipHidden }) {
        const doc = block.ownerDocument || document;
        return doc.createTreeWalker(
            block,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            {
                acceptNode(node) {
                    if (!intersects(slice, node)) return NodeFilter.FILTER_REJECT;

                    if (node.nodeType === Node.TEXT_NODE) {
                        const parent = node.parentElement;
                        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
                        if (skipHidden && hasHiddenAncestor(parent, block, respectCSS)) return NodeFilter.FILTER_REJECT;
                        if (isInBannedContainer(parent)) return NodeFilter.FILTER_REJECT;
                        return NodeFilter.FILTER_ACCEPT;
                    }

                    const el = /** @type {Element} */(node);
                    if (isBanned(el)) return NodeFilter.FILTER_REJECT;
                    if (skipHidden && hasHiddenAncestor(el, block, respectCSS)) return NodeFilter.FILTER_REJECT;
                    // Count <br> or atomic inlines as visible tokens
                    if (el.tagName === 'BR' || isAtomicInline(el, respectCSS)) return NodeFilter.FILTER_ACCEPT;
                    return NodeFilter.FILTER_SKIP;
                },
            },
        );
    }

    function textPartForNodeInSlice(node, slice, edge, side) {
        // Return the substring of a text node that's inside the slice
        let t = node.nodeValue || '';
        if (node === slice.startContainer && node.nodeType === Node.TEXT_NODE) {
            if (side === 'after') t = t.slice(slice.startOffset);
        }
        if (node === slice.endContainer && node.nodeType === Node.TEXT_NODE) {
            if (side === 'before') t = t.slice(0, slice.endOffset);
        }
        return t;
    }

    function countVisibleInSlice(block, edgeRange, side, opts) {
        const {
            respectCSS = false,
            skipHidden = false,
            ignoreZeroWidth = false,
            treatNbspAsContent = true,
            brAs = '\n',
        } = opts || {};

        const slice = sliceRange(block, edgeRange, side);
        const walker = makeWalker(block, slice, { respectCSS, skipHidden });

        // State for normal collapsing across nodes
        let visibleCount = 0;
        let lastWasSpace = (side === 'before'); // at true → drop an initial join-space at the very start of the block

        let n;
        while ((n = walker.nextNode())) {
            if (n.nodeType === Node.ELEMENT_NODE) {
                // <br> or atomic inline
                visibleCount += 1;                 // treat as 1 visible char
                lastWasSpace = /\s$/.test(brAs);   // newline acts like a space at boundary
                continue;
            }

            // TEXT node
            let t = textPartForNodeInSlice(n, slice, edgeRange, side);

            if (!t) continue;

            // Normalize
            if (t.indexOf('\u0000') !== -1) t = t.replace(/\u0000/g, '');
            if (ignoreZeroWidth) t = t.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

            const NBSP = '\u00A0';
            const parentEl = /** @type {Text} */(n).parentElement;
            const preLike = isPreLike(parentEl, respectCSS);

            if (!treatNbspAsContent) t = t.replaceAll(NBSP, ' ');

            if (side === 'after') {
                // For end-check behavior later, we only need to know "is anything visible?"
                // But for offset counting we still need the full length; this function provides that.
            }

            if (preLike) {
                t = t.replace(/\r\n?/g, '\n'); // normalize CRLF
                // In pre-like, everything counts verbatim
                visibleCount += t.length;
                lastWasSpace = /\s$/.test(t);
            } else {
                // Collapse ASCII whitespace to single space
                t = t.replace(/[\t\n\r\f ]+/g, ' ');
                // Drop a leading join-space (block start or just after a space/newline/BR)
                if (lastWasSpace) t = t.replace(/^ +/, '');
                visibleCount += t.length;
                lastWasSpace = / $/.test(t);
            }
        }
        return visibleCount;
    }

    function hasAnyVisibleAfter(block, edgeRange, opts) {
        const {
            respectCSS = false,
            skipHidden = false,
            ignoreZeroWidth = false,
            treatNbspAsContent = true,
        } = opts || {};

        const slice = sliceRange(block, edgeRange, 'after');
        const walker = makeWalker(block, slice, { respectCSS, skipHidden });

        const NBSP = '\u00A0';

        let n;
        while ((n = walker.nextNode())) {
            if (n.nodeType === Node.ELEMENT_NODE) {
                // <br> or atomic inline → definitely visible content after
                return true;
            }
            // TEXT node
            let t = textPartForNodeInSlice(n, slice, edgeRange, 'after');
            if (!t) continue;

            if (t.indexOf('\u0000') !== -1) t = t.replace(/\u0000/g, '');
            if (ignoreZeroWidth) t = t.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

            const parentEl = /** @type {Text} */(n).parentElement;
            const preLike = isPreLike(parentEl, respectCSS);

            if (preLike) {
                // Any char after caret inside pre-like is visible
                if (t.length) return true;
            } else {
                // In normal flow, ignore ASCII whitespace; consider NBSP only if treated as content
                if (!treatNbspAsContent) t = t.replaceAll(NBSP, ' ');
                // If we have any non-ASCII-whitespace char, it's visible
                if (/[^\t\n\r\f ]/.test(t)) return true;
                // Otherwise it's only collapsible whitespace → not enough to disqualify end-of-block
            }
        }
        return false;
    }

    function resolveBlockAndBoundary(input, which, opts) {
        const r = collapsedBoundaryRange(input, which);
        if (!r) return { block: null, edgeRange: null };
        const block = nearestBlockAncestor(r.startContainer, { respectCSS: opts?.respectCSS !== false });
        return { block, edgeRange: r };
    }

    // --- Public methods ---

    /**
     * Is the selection/range boundary at the start of its block?
     * (counts with HTML whitespace collapsing)
     */
    function isAtBlockStart(input, opts = undefined) {
        const { block, edgeRange } = resolveBlockAndBoundary(input, 'start', opts);
        if (!block) return false;
        const count = countVisibleInSlice(block, edgeRange, 'before', opts);
        return count === 0;
    }

    /**
     * Is the selection/range boundary at the end of its block?
     * (ignores trailing collapsible ASCII whitespace in normal flow,
     * but treats anything in pre-like contexts as visible)
     */
    function isAtBlockEnd(input, opts = undefined) {
        const { block, edgeRange } = resolveBlockAndBoundary(input, 'end', opts);
        if (!block) return false;
        return !hasAnyVisibleAfter(block, edgeRange, opts);
    }

    /**
     * Return the collapsed visible character offset from the start of the block
     * to the specified boundary (default: start boundary).
     *
     * @returns {number}
     */
    function getVisibleOffsetFromBlockStart(input, opts = undefined) {
        const edge = (opts && opts.edge === 'end') ? 'end' : 'start';
        const { block, edgeRange } = resolveBlockAndBoundary(input, edge, opts);
        if (!block) return 0;
        return countVisibleInSlice(block, edgeRange, 'before', opts);
    }

    return { isAtBlockStart, isAtBlockEnd, getVisibleOffsetFromBlockStart };
})();

// Export as global
window.BlockText = BlockText;