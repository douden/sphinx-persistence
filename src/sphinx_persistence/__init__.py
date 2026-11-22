"""Client-side persistence for interactive books built with Sphinx.

Auto-saves a reader's work (form inputs, quiz answers, live-code cell source,
bespoke raw-HTML activities) to the browser's localStorage and restores it on
reload, with Export, Import and Reset actions docked into the article
header. Everything is client-side: no server, no accounts, no third-party
services.

Enable it like any Sphinx extension (in Jupyter Book / TeachBooks:
``sphinx.extra_extensions: [sphinx_persistence]``). All options are
optional and set as regular Sphinx config values. Saving is on by default.
Everything the extension adds to the page, apart from the toolbar, is off by
default.

Saving:

- ``persistence_code_cells`` (bool, True): save live-code (thebe) cell source.
- ``persistence_questions`` (bool, True): save TeachBooks-Questions answers.
- ``persistence_activities`` (bool, True): record & replay clicks inside
  bespoke ``{raw} html`` activities.

Header toolbar:

- ``persistence_toolbar`` (bool, True): a menu in the page header, behind a
  disk icon, with Export, Import and Reset.

Progress controls added to the page:

- ``persistence_page_checkbox`` (bool, False): a "Mark this section as
  complete" checkbox at the end of every page.
- ``persistence_sidebar_ticks`` (bool, False): a circle at the right edge of
  the left sidebar next to every page. It shows a tick when the page is done,
  and the reader clicks it to mark the page as done or not done.
- ``persistence_activity_checkboxes`` (bool, False): a "Mark as done" checkbox
  after every learning activity (``data-learning-activity="true"`` with a
  ``.la-title``, or a heading that starts with "Learning activity:").
- ``persistence_activity_reset`` (bool, False): a "Reset" button after every
  learning activity that clears only that activity.
- ``persistence_part_heading_pages`` (str, ""): JS regex matched against
  ``location.pathname``; on matching pages, numbered second-level (h2) part headings
  ("3.1.1: ...") also receive a "Mark as done" checkbox. Empty means off.

Other settings:

- ``persistence_activity_exclude_ids`` (list[str], []): activity root ids the
  click recorder must skip (e.g. timed quiz games).
- ``persistence_book_id`` (str, ""): identity stamped into progress exports so
  an import from a different book can warn. Falls back to
  ``<meta name="book-id">``, then the site host.
"""

import json
from pathlib import Path

__version__ = "0.5.2"

_STATIC = Path(__file__).resolve().parent / "static"

# Build-time-generated file carrying the window.sphinxPersistence options.
_CONFIG_JS = "sphinx-persistence-config.js"

# (config option, filename) in required load order: data-manager.js first (it
# owns the shared key registry and reset utilities the others call), the click
# recorder after it, the progress controls last.
_MODULES = (
    (None, "data-manager.js"),  # always on: the backbone of every other module
    ("persistence_toolbar", "book-exporter.js"),
    ("persistence_code_cells", "thebe-code-persistence.js"),
    ("persistence_questions", "teachbook-questions-persistence.js"),
    ("persistence_activities", "activity-persistence.js"),
)

# Options that each switch on one kind of progress control. The file
# progress-checkboxes.js loads when at least one of them is on.
_PROGRESS_OPTIONS = (
    "persistence_page_checkbox",
    "persistence_sidebar_ticks",
    "persistence_activity_checkboxes",
    "persistence_activity_reset",
    "persistence_part_heading_pages",
)


def _on_builder_inited(app):
    """Register the JS assets once the builder (and config) is ready."""
    if app.builder.format != "html":
        return

    # Guard against double registration: under Jupyter Book / TeachBooks this
    # event can fire more than once per process.
    if getattr(app, "_sbp_assets_registered", False):
        return
    app._sbp_assets_registered = True

    config = app.config
    config.html_static_path.append(str(_STATIC))

    # Runtime options the JS modules read at init. Emitted as a NAMED file
    # (generated into the doctree dir, served from _static/), not an inline
    # body script: the Jupyter Book / TeachBooks stack duplicates inline
    # <script> bodies in the rendered head (the reason books carry dedup
    # extensions for thebe/togglebutton), while named files register once.
    runtime = {
        "bookId": config.persistence_book_id,
        "activityExcludeIds": list(config.persistence_activity_exclude_ids),
        "pageCheckbox": bool(config.persistence_page_checkbox),
        "sidebarTicks": bool(config.persistence_sidebar_ticks),
        "activityCheckboxes": bool(config.persistence_activity_checkboxes),
        "activityReset": bool(config.persistence_activity_reset),
        "partHeadingPages": config.persistence_part_heading_pages,
    }
    generated = Path(app.doctreedir) / "sphinx_persistence_static"
    generated.mkdir(parents=True, exist_ok=True)
    (generated / _CONFIG_JS).write_text(
        f"window.sphinxPersistence = {json.dumps(runtime)};\n",
        encoding="utf-8",
    )
    config.html_static_path.append(str(generated))
    # Low priority so the config loads before the module files below.
    app.add_js_file(_CONFIG_JS, priority=200)

    for option, filename in _MODULES:
        if option is None or getattr(config, option):
            app.add_js_file(filename)

    if any(getattr(config, option) for option in _PROGRESS_OPTIONS):
        app.add_js_file("progress-checkboxes.js")


def setup(app):
    # Saving (on by default).
    app.add_config_value("persistence_code_cells", True, "html")
    app.add_config_value("persistence_questions", True, "html")
    app.add_config_value("persistence_activities", True, "html")
    # Header toolbar (on by default).
    app.add_config_value("persistence_toolbar", True, "html")
    # Progress controls added to the page (off by default).
    app.add_config_value("persistence_page_checkbox", False, "html")
    app.add_config_value("persistence_sidebar_ticks", False, "html")
    app.add_config_value("persistence_activity_checkboxes", False, "html")
    app.add_config_value("persistence_activity_reset", False, "html")
    app.add_config_value("persistence_part_heading_pages", "", "html")
    # Other settings.
    app.add_config_value("persistence_activity_exclude_ids", [], "html")
    app.add_config_value("persistence_book_id", "", "html")

    app.connect("builder-inited", _on_builder_inited)

    return {
        "version": __version__,
        "parallel_read_safe": True,
        "parallel_write_safe": True,
    }
