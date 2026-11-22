# Changelog

## 0.5.2

- Clicks are no longer replayed into an area marked `data-persistence="off"` or into an activity listed in `persistence_activity_exclude_ids`. Before, only the recording of new clicks was skipped, so clicks saved earlier still came back: a deck of flip cards that a reader once turned over opened turned over on every visit.

## 0.5.1

- Each sidebar circle sits on the middle of the first line of its page title. Its position comes from the title's own font size and line height, so it fits any theme.

## 0.5.0

- The sidebar has one kind of mark. `persistence_sidebar_ticks` now gives every page a circle at the right edge that the reader clicks to mark the page as done, and the circle shows a tick when the page is done. The setting `persistence_sidebar_clickable` is gone. A book that still sets it gets a harmless warning from Sphinx and can remove the line.
- Ticking "Mark this section as complete" now fills the page's sidebar circle at once. Before, the circle changed only after a reload.

## 0.4.2

- Code cleanup: two unused Reset methods removed from `book-exporter.js`; the docstring of the settings matches the README.

## 0.4.1

- The menu stays open while the mouse moves from the disk icon down to the actions. The icon's tooltip, which covered the menu, is gone.
- The sidebar marks form one straight column also in books with pages that have sub-pages (and an expand arrow).

## 0.4.0

- Export, Import and Reset always sit in one menu behind a disk icon in the page header. The three separate header buttons and the setting `persistence_toolbar_menu` are gone. A book that still sets `persistence_toolbar_menu` gets a harmless warning from Sphinx and can remove the line.

## 0.3.0

- New setting `persistence_toolbar_menu`: Export, Import and Reset in one menu behind a single header button (issue #3).
- The Reset button has a bin icon (issue #4).
- New setting `persistence_sidebar_clickable`: readers click a mark next to a page in the sidebar to mark it as done (issue #5).
- The sidebar now shows the tick for the page the reader is on (issues #1 and #8).
- A ticked checkbox is readable in dark mode (issue #2).
- With `persistence_sidebar_ticks` alone, the ticks also sit in one column at the right edge of the sidebar.
- The GitHub test runs on Python 3.10 and 3.12 and uses the current settings.

## 0.2.0

Each progress control now has its own setting, and all of them are off by default. Saving and the Export, Import and Reset buttons stay on by default.

- The single setting `persistence_progress_checkboxes` is replaced by four settings: `persistence_page_checkbox`, `persistence_sidebar_ticks`, `persistence_activity_checkboxes` and `persistence_activity_reset`. A book that used the old setting must set the new ones to keep its controls.
- The Reset button of an activity can now be shown without the "Mark as done" checkbox.
- An author can keep a field or an activity out of saving with `data-persistence="off"` on it or on an element around it.
- The README has a Limitations section and links to the new example book.
- Reset clears inputs without an id, such as sliders, and no longer saves its own clicks.
- The Copy button on code blocks no longer causes an error.
- Export first saves input that was still waiting to be saved.
- Live code cells that a reader adds are not saved.
- The question that Reset asks is clearer.

## 0.1.0

First release.

- Auto-save and restore of reader input: text fields, checkboxes, radio
  groups, selects, and dynamically added fields
- Live-code (thebe) cell persistence, with content fingerprints so edited
  pages never restore code into the wrong cell
- TeachBooks-Questions answers (multiple choice and math fields)
- Click record & replay for custom raw-HTML activities
- Export / Import / Reset toolbar with a validated JSON progress file
- "Mark as done" progress checkboxes with sidebar ticks (on by default)
- Configurable through `persistence_*` options in `conf.py` / `_config.yml`
