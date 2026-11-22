/**
 * Progress Checkboxes
 * -------------------
 * Lets students self-report what they have finished, and remembers it.
 *
 * It can add these controls to a content page. Each has its own switch in the
 * book's config, and all of them are off unless the book turns them on:
 *   1. A "Mark this section as complete" checkbox at the foot of the page
 *      (persistence_page_checkbox).
 *   2. A tick in the left sidebar for every completed page
 *      (persistence_sidebar_ticks).
 *   3. A circle in the left sidebar next to every page, which the reader
 *      clicks to mark that page as done or not done
 *      (persistence_sidebar_clickable).
 *   4. A "Mark as done" checkbox below each explicitly classified Learning
 *      Activity (persistence_activity_checkboxes).
 *   5. A "Reset" button below each Learning Activity (persistence_activity_reset).
 *   6. A "Mark as done" checkbox after numbered part headings on chosen pages
 *      (persistence_part_heading_pages).
 *
 * These are ordinary <input type="checkbox"> elements with a STABLE, deterministic
 * id, so the existing DataManager (data-manager.js) picks them up automatically and
 * gives us persistence, Export, Import and Reset for free, this module writes no
 * storage of its own. It only creates the boxes, styles them, and mirrors the page's
 * completion state as a ✓ at the right edge of the matching link in the left sidebar,
 * so a student can see at a glance which sections they have finished across the
 * whole book. The sidebar circles write the same saved value as the page checkbox.
 */

(function () {
    'use strict';

    // Must match DataManager.storagePrefix so we can read the same keys back when
    // ticking the sidebar. Kept in one place.
    var STORAGE_PREFIX = 'abm_book_';
    var PAGE_READ_ID = 'progress-page-read';   // id of the per-page checkbox
    var ACTIVITY_PREFIX = 'progress-act-';     // id prefix for per-activity checkboxes
    var PART_PREFIX = 'progress-part-';        // id prefix for per-part checkboxes (ch3/ch4)

    /**
     * Read one on/off switch from the build-time config (window.sphinxPersistence,
     * written by the Python side). Each kind of progress control has its own
     * switch, and all of them are off unless the book turns them on.
     */
    function option(name) {
        var cfg = window.sphinxPersistence || {};
        return cfg[name] === true;
    }

    /**
     * Turn an activity title into a short, URL-safe, stable slug. The slug is part
     * of the storage key, so it must be reproducible across reloads and builds: the
     * same title always yields the same slug (and therefore the same saved state).
     */
    function slugify(text) {
        return text
            .toLowerCase()
            .replace(/^\s*learning activity:\s*/, '') // drop the common prefix
            .replace(/[^a-z0-9]+/g, '-')              // non-alphanumerics -> hyphen
            .replace(/^-+|-+$/g, '')                  // trim stray hyphens
            .slice(0, 60) || 'activity';
    }

    /**
     * Build the little checkbox control. `id` must be unique and stable within the
     * page; DataManager keys off it. `variant` only tweaks styling/label.
     */
    function makeControl(id, labelText, variant) {
        var label = document.createElement('label');
        label.className = 'progress-check progress-check--' + variant;

        var box = document.createElement('input');
        box.type = 'checkbox';
        box.id = id;
        box.className = 'progress-check__box';

        var text = document.createElement('span');
        text.className = 'progress-check__label';
        text.textContent = labelText;

        label.appendChild(box);
        label.appendChild(text);

        // Reflect checked state as a class on the label for styling, and keep the
        // sidebar map in sync. DataManager dispatches 'change' when it restores a
        // saved value, so this handler also runs on load, no separate restore path.
        var sync = function () {
            label.classList.toggle('is-checked', box.checked);
            if (id === PAGE_READ_ID) refreshSidebarTicks();
        };
        box.addEventListener('change', sync);
        sync(); // set the initial (unchecked) styling immediately

        return label;
    }

    // Title elements may carry inline children only, most commonly the "#"
    // headerlink Sphinx appends to a Markdown heading (### Learning Activity: …).
    // Anything with a block-level child is a container, not a title, so we skip it.
    var INLINE_ONLY = /^(A|SPAN|CODE|EM|STRONG|B|I|SUP|SUB|SMALL|MARK|U)$/;
    function isTitleLeaf(el) {
        for (var i = 0; i < el.children.length; i++) {
            if (!INLINE_ONLY.test(el.children[i].tagName)) return false;
        }
        return true;
    }

    /**
     * Put a freshly-made checkbox at the END of the thing it belongs to, rather
     * than right under its title (a checkbox greeting you at the *start* of an
     * activity reads as strange).
     *
     * A Learning Activity is normally a self-contained {raw} html activity
     * wrapped in <div id="…"> whose title is a non-heading leaf (e.g.
     * <div class="schw-h">), so the nearest div[id] ancestor IS the activity card,
     * drop the control just beneath it. A "part" heading, or the rare
     * Markdown-heading activity, has no such wrapper, so fall back to the end of
     * its enclosing <section>. Keeping the control OUTSIDE the widget wrapper also
     * keeps it clear of activity-persistence.js, which records clicks inside
     * div[id] widgets. Position never affects persistence, the checkbox id comes
     * from the title text, not its place in the DOM.
     */
    function placeControlAtEnd(titleEl, control) {
        if (!/^H[1-6]$/.test(titleEl.tagName)) {
            var card = titleEl.closest('article.bd-article div[id]');
            if (card && card !== titleEl) {
                card.insertAdjacentElement('afterend', control);
                return;
            }
        }
        var sec = titleEl.closest('section');
        if (sec) sec.appendChild(control);
        else titleEl.insertAdjacentElement('afterend', control);
    }

    /**
     * The self-contained {raw} html activity card (<div id="…">) a title belongs to,
     * or null for a Markdown-heading activity / a numbered "part" heading (which
     * have no widget wrapper and therefore no per-activity saved state to reset).
     */
    function activityCard(titleEl) {
        if (/^H[1-6]$/.test(titleEl.tagName)) return null;
        var card = titleEl.closest('article.bd-article div[id]');
        return (card && card !== titleEl) ? card : null;
    }

    /**
     * A "↺ Reset" button that clears everything this one activity has saved and
     * reloads to its pristine state, so a student can restart an activity whenever
     * they want. It removes: the click-replay key (activity-persistence.js,
     * `…__activity__<id>`), the DataManager keys of any native inputs inside the
     * widget (`…_<id>` / `…__radio__<name>`), and the in-memory replay sequence.
     * It deliberately does NOT touch the "Mark as done" tick (that lives outside
     * the card), finishing an activity and replaying it are separate ideas.
     */
    function makeResetButton(card) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'progress-reset';
        btn.innerHTML = '↺ Reset';
        btn.setAttribute('aria-label', 'Reset this activity');
        btn.title = 'Clear your saved answers for this activity and start over';
        btn.addEventListener('click', function () {
            var question = option('activityCheckboxes')
                ? 'Clear your saved answers for this activity? Your "Mark as done" tick is kept.'
                : 'Clear your saved answers for this activity?';
            if (!window.confirm(question)) return;
            var base = STORAGE_PREFIX + window.location.pathname;
            var dm = window.dataManager;
            // Stop pending saves so none writes a value back after the clear.
            try { if (dm) { dm.suppressAutoSave = true; if (dm.cancelPendingSaves) dm.cancelPendingSaves(); } } catch (e) {}
            try { localStorage.removeItem(base + '__activity__' + card.id); } catch (e) {}
            try {
                card.querySelectorAll('input, textarea, select').forEach(function (inp) {
                    // Use DataManager's own key so inputs without an id (sliders,
                    // checkboxes) are cleared too, not only those with an id.
                    if (dm && dm.getStorageKey) { localStorage.removeItem(dm.getStorageKey(inp)); return; }
                    if (inp.type === 'radio' && inp.name) localStorage.removeItem(base + '__radio__' + inp.name);
                    else if (inp.id) localStorage.removeItem(base + '_' + inp.id);
                });
            } catch (e) {}
            try {
                if (window.activityPersistence && window.activityPersistence.sequences) {
                    window.activityPersistence.sequences.delete(card.id);
                }
            } catch (e) {}
            window.location.reload();
        });
        return btn;
    }

    /**
     * Wrap the "Mark as done" checkbox and (when the activity has a card) a
     * "Reset" button into one inline action bar, so both sit together at the end of
     * the activity. Heading/part activities have no card, so they get the bare
     * checkbox.
     */
    function withReset(titleEl, control) {
        var card = option('activityReset') ? activityCard(titleEl) : null;
        if (!card) return control;
        var bar = document.createElement('div');
        bar.className = 'progress-actions';
        if (control) bar.appendChild(control);
        bar.appendChild(makeResetButton(card));
        return bar;
    }

    /**
     * Find every explicitly classified Learning Activity and drop a "Done"
     * checkbox at its END. External activities declare their role with
     * data-learning-activity="true" and expose one .la-title. The heading fallback
     * remains for the rare Markdown-authored activity, but normal book content
     * never has to rely on a title-text scan to receive its completion control.
     */
    function attachActivityCheckboxes() {
        var usedSlugs = Object.create(null);

        function attach(el) {
            if (el.dataset.progressAttached) return;              // idempotent
            var t = (el.textContent || '').trim();
            if (!/^learning activity:/i.test(t) || t.length > 140) return;
            if (!isTitleLeaf(el)) return;                         // a container, not the title

            // De-duplicate slugs so two identically-titled activities on one page
            // still get distinct, stable keys.
            var slug = slugify(t);
            usedSlugs[slug] = (usedSlugs[slug] || 0) + 1;
            if (usedSlugs[slug] > 1) slug += '-' + usedSlugs[slug];

            // With "Mark as done" off, the activity may still get a Reset
            // button on its own; withReset returns null when it gets neither.
            var control = option('activityCheckboxes')
                ? makeControl(ACTIVITY_PREFIX + slug, 'Mark as done', 'activity')
                : null;
            var actions = withReset(el, control);
            if (!actions) return;
            el.dataset.progressAttached = '1';
            placeControlAtEnd(el, actions);
        }

        document.querySelectorAll(
            'article.bd-article [data-learning-activity="true"]'
        ).forEach(function (card) {
            var title = card.querySelector('.la-title');
            if (title) attach(title);
        });

        document.querySelectorAll(
            'article.bd-article h1, article.bd-article h2, article.bd-article h3, ' +
            'article.bd-article h4, article.bd-article h5, article.bd-article h6'
        ).forEach(function (el) {
            attach(el);
        });
    }

    /**
     * Add a single "Mark this section as complete" checkbox at the end of the page
     * content, for the read-and-move-on pages.
     */
    function attachPageCheckbox() {
        var article = document.querySelector('article.bd-article');
        if (!article || document.getElementById('progress-page-wrap')) return;

        var wrap = document.createElement('div');
        wrap.id = 'progress-page-wrap';
        wrap.className = 'progress-page';
        wrap.appendChild(makeControl(PAGE_READ_ID, 'Mark this section as complete', 'page'));
        article.appendChild(wrap);
    }

    /**
     * Long, multi-part walkthrough pages can get a "Mark as done" checkbox at
     * the end of each top-level numbered "part" (just before the next part
     * begins) so a student can see how far they have worked through a page.
     * Which pages qualify is set by the `persistence_part_heading_pages` Sphinx
     * option, a JS regex matched against the pathname (empty = feature off).
     * A part is an <h2> whose text starts with a dotted section number, e.g.
     * "## 3.1.1: Setting up the model" or "## 4.1.1.1: The base model".
     * The page-title <h1> is already covered by the page checkbox, and deeper
     * <h3>+ subsections are skipped to keep the page uncluttered. The ids are
     * stable, so DataManager persists them for free, exactly like the activity
     * boxes above.
     */
    function attachPartCheckboxes() {
        var cfg = window.sphinxPersistence || {};
        if (!cfg.partHeadingPages) return;
        var partRe;
        try { partRe = new RegExp(cfg.partHeadingPages); } catch (e) { return; }
        if (!partRe.test(window.location.pathname || '')) return;

        var headings = document.querySelectorAll('article.bd-article h2');
        var usedSlugs = Object.create(null);

        headings.forEach(function (el) {
            if (el.dataset.progressAttached) return;              // idempotent
            // Heading text minus the trailing "#"/"¶" headerlink Sphinx appends.
            var t = (el.textContent || '').replace(/[#¶]\s*$/, '').trim();
            // A "part" starts with a dotted section number ("3.1.1: …",
            // "4.1.1.1: …"); unnumbered <h2>s such as "Key takeaways" are not parts.
            if (!/^\d+(\.\d+)+[.:]?\s/.test(t)) return;

            var slug = slugify(t);
            usedSlugs[slug] = (usedSlugs[slug] || 0) + 1;
            if (usedSlugs[slug] > 1) slug += '-' + usedSlugs[slug];

            el.dataset.progressAttached = '1';
            var control = makeControl(PART_PREFIX + slug, 'Mark as done', 'activity');
            placeControlAtEnd(el, withReset(el, control));
        });
    }

    /**
     * Read a page's saved "complete" flag straight from localStorage. DataManager
     * stores values as {value, timestamp, url}; we only need `value`.
     */
    function isPathComplete(pathname) {
        try {
            var raw = localStorage.getItem(STORAGE_PREFIX + pathname + '_' + PAGE_READ_ID);
            if (!raw) return false;
            return JSON.parse(raw).value === true;
        } catch (e) {
            return false;
        }
    }

    /** Save a page's "complete" flag in the same form DataManager uses. */
    function setPathComplete(pathname, done) {
        try {
            localStorage.setItem(STORAGE_PREFIX + pathname + '_' + PAGE_READ_ID, JSON.stringify({
                value: done, timestamp: Date.now(), url: pathname
            }));
        } catch (e) { /* storage full or blocked: leave the state as it was */ }
    }

    /**
     * The page a sidebar link points to. The theme gives the link to the page
     * you are on the address "#", so that link means the current page.
     */
    function linkPathname(a) {
        var href = a.getAttribute('href');
        if (!href) return null;
        if (href === '#' || (href.charAt(0) === '#' && a.classList.contains('current'))) {
            return window.location.pathname;
        }
        if (href.charAt(0) === '#') return null;
        try {
            return new URL(href, window.location.href).pathname;
        } catch (e) {
            return null;
        }
    }

    /** Click on a sidebar mark: switch that page between done and not done. */
    function toggleFromSidebar(event, pathname) {
        event.preventDefault();
        event.stopPropagation();
        var done = !isPathComplete(pathname);
        var box = document.getElementById(PAGE_READ_ID);
        if (pathname === window.location.pathname && box) {
            // Keep the checkbox at the end of the page in step; its change
            // event saves the value through DataManager.
            box.checked = done;
            box.dispatchEvent(new Event('change', { bubbles: true }));
        }
        setPathComplete(pathname, done);
        refreshSidebarTicks();
    }

    /**
     * Mirror per-page completion into the left sidebar: a ✓ appears next to any
     * section link whose page the student has marked complete. With clickable
     * ticks on, every page link gets a mark the reader can click to mark the
     * page as done or not done, an empty circle until it is done.
     */
    function refreshSidebarTicks() {
        var clickable = option('sidebarClickable');
        if (!option('sidebarTicks') && !clickable) return;
        var links = document.querySelectorAll('.bd-sidebar-primary a.reference.internal, nav.bd-links a');
        links.forEach(function (a) {
            var pathname = linkPathname(a);
            if (!pathname) return;
            var done = isPathComplete(pathname);
            a.classList.toggle('is-read', done);
            var mark = a.querySelector('.progress-tick');
            if (!done && !clickable) {
                if (mark) mark.remove();
                a.classList.remove('has-progress-mark');
                return;
            }
            if (!mark) {
                mark = document.createElement('span');
                mark.className = 'progress-tick';
                a.classList.add('has-progress-mark');
                if (clickable) {
                    mark.classList.add('progress-tick--clickable');
                    mark.setAttribute('role', 'checkbox');
                    mark.tabIndex = 0;
                    mark.addEventListener('click', function (e) { toggleFromSidebar(e, pathname); });
                    mark.addEventListener('keydown', function (e) {
                        if (e.key === 'Enter' || e.key === ' ') toggleFromSidebar(e, pathname);
                    });
                } else {
                    mark.setAttribute('aria-hidden', 'true');
                }
                a.appendChild(mark);
            }
            mark.textContent = done ? '✓' : '';
            mark.classList.toggle('is-done', done);
            if (clickable) {
                mark.setAttribute('aria-checked', String(done));
                mark.setAttribute('aria-label', done ? 'Marked as done. Click to undo.' : 'Mark this page as done');
                mark.title = done ? 'Done. Click to undo.' : 'Mark as done';
            }
        });
    }

    /** Scoped styles, injected once (mirrors the pattern in book-exporter.js). */
    function injectStyles() {
        if (document.getElementById('progress-checkboxes-styles')) return;
        var style = document.createElement('style');
        style.id = 'progress-checkboxes-styles';
        style.textContent = [
            '.progress-check{display:inline-flex;align-items:center;gap:.45rem;',
            '  margin:.5rem 0 1rem;padding:.3rem .7rem;border:1px solid var(--pst-color-border,#d0d7de);',
            '  border-radius:999px;font-size:.85rem;line-height:1.2;cursor:pointer;',
            '  user-select:none;background:var(--pst-color-surface,#f6f8fa);',
            '  color:var(--pst-color-text-base,#333);transition:background .15s,border-color .15s;}',
            '.progress-check:hover{border-color:var(--abm-primary,#00A6D6);}',
            '.progress-check__box{margin:0;cursor:pointer;width:1rem;height:1rem;accent-color:var(--abm-primary,#00A6D6);}',
            '.progress-check.is-checked{background:rgba(0,166,214,.14);border-color:var(--abm-primary,#00A6D6);color:var(--abm-primary-dark,#0C2340);}',
            '.progress-check.is-checked .progress-check__label{font-weight:600;}',
            '.progress-check--page{margin-top:1.5rem;}',
            '.progress-page{margin-top:2.5rem;padding-top:1rem;border-top:1px solid var(--abm-border,#e1e4e8);}',
            // End-of-activity action bar: "Mark as done" + "Reset" together
            '.progress-actions{display:inline-flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin:.5rem 0 1rem;}',
            '.progress-actions .progress-check{margin:0;}',
            '.progress-reset{display:inline-flex;align-items:center;gap:.3rem;padding:.32rem .72rem;',
            '  border:1px solid var(--abm-border,#d0d7de);border-radius:999px;font-size:.8rem;line-height:1.2;',
            '  cursor:pointer;user-select:none;background:var(--abm-surface-2,#fff);color:var(--abm-muted,#5C5C5C);',
            '  font-family:var(--abm-font,inherit);transition:background .15s,border-color .15s,color .15s;}',
            '.progress-reset:hover{border-color:var(--abm-primary,#00A6D6);color:var(--abm-primary-strong,#006BAE);background:var(--abm-panel,#EAF4FB);}',
            // Sidebar completion ticks
            '.progress-tick{color:var(--pst-color-primary,#006BAE);font-weight:700;margin-left:.35rem;}',
            // Put every clickable mark in one column at the right edge of the sidebar.
            // Every mark (tick or circle) sits at the right edge, so the link's
            // underline does not run under it. The selector matches the theme's
            // nav.bd-links li > a so that its padding wins.
            'a.has-progress-mark,nav.bd-links li > a.has-progress-mark{position:relative;padding-right:1.9rem;}',
            'a.has-progress-mark .progress-tick{position:absolute;right:.45rem;top:.35rem;margin:0;width:1.05rem;text-align:center;}',
            // A page with sub-pages keeps 33px on the right for its expand arrow.
            // When the sidebar has such pages, move every other mark in by the
            // same amount, so all marks form one straight column.
            'nav.bd-links:has(li.has-children) li:not(.has-children) > a.has-progress-mark{padding-right:calc(1.9rem + 30px);}',
            'nav.bd-links:has(li.has-children) li:not(.has-children) > a.has-progress-mark .progress-tick{right:calc(.45rem + 30px);}',
            '.progress-tick--clickable{display:inline-flex;align-items:center;justify-content:center;',
            '  width:1.05rem;height:1.05rem;border:1.5px solid var(--pst-color-border,#c4ccd4);border-radius:50%;',
            '  font-size:.7rem;line-height:1;vertical-align:middle;cursor:pointer;}',
            '.progress-tick--clickable:hover,.progress-tick--clickable:focus{border-color:var(--pst-color-primary,#006BAE);outline:none;}',
            '.progress-tick--clickable.is-done{border-color:var(--pst-color-primary,#006BAE);background:var(--pst-color-primary,#006BAE);color:var(--pst-color-background,#fff);}',
            'html[data-theme=dark] .progress-check.is-checked{color:var(--pst-color-text-base,#eee);}',
            'a.reference.internal.is-read{opacity:.95;}'
        ].join('');
        (document.head || document.documentElement).appendChild(style);
    }

    function init() {
        injectStyles();
        if (option('activityCheckboxes') || option('activityReset')) attachActivityCheckboxes();
        attachPartCheckboxes();
        if (option('pageCheckbox')) attachPageCheckbox();
        // The sidebar map reads localStorage, which DataManager may still be
        // restoring on load; run once now and once after load to catch late writes.
        refreshSidebarTicks();
        window.addEventListener('load', refreshSidebarTicks, { once: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
