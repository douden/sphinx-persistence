# Changelog

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
