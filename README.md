# sphinx-persistence

This extension saves your readers' work in a Jupyter Book, TeachBooks or Sphinx website.

Without it, everything a reader does in an interactive book is lost when they refresh or close the page. This includes quiz answers, code they edited and exercises they filled in. With this extension, all of it comes back when the reader returns, even days later. The extension stores everything in the reader's own browser. There is no server and no account, and no data leaves the reader's computer.

## Install

You need to add two lines and then rebuild your book.

1. Add this line to your book's `requirements.txt`:

   ```
   sphinx-persistence @ git+https://github.com/omarkammouh/sphinx-persistence
   ```

2. Add the extension to your book's `_config.yml`:

   ```yaml
   sphinx:
     extra_extensions:
       - sphinx_persistence
   ```

For a plain Sphinx project without Jupyter Book, add `"sphinx_persistence"` to the `extensions` list in `conf.py` instead.

With no further settings, the extension saves the reader's work and adds the Export, Import and Reset buttons to the page header. It adds nothing else to your pages. You can turn on the progress controls (checkboxes, sidebar ticks and Reset buttons per activity) one by one, as [Settings](#settings) explains.

## Saving the reader's work

The extension saves the four kinds of work below. Saving is on by default.

### Form fields

The extension saves anything a reader types or selects in text boxes, text areas, checkboxes, radio buttons, dropdowns and sliders. It saves in the background a moment after each change, and once more when the reader leaves the page. So nothing is lost when a reader closes the tab in the middle of a sentence. When the reader comes back, every field is filled in as they left it. The extension also picks up fields that a script adds after the page has loaded.

This part is always on, because the other parts build on it.

### Live code cells

If your book has executable code cells (thebe, or "Live Code"), the extension saves the code a reader writes or changes in a cell. The next time the reader opens the page, the code is back in the cell. The extension saves only the code and not the output, so the reader runs the cell again to see the output.

Each saved edit also remembers what the original cell looked like. If you later change that cell in a new version of your book, the old edit no longer matches, and the extension skips it. This way a reader never sees their code appear in a cell where it does not belong.

The extension also stops thebe's "unsaved work" pop-up when a reader leaves the page, because the work is already saved.

Turn it off with `persistence_code_cells: false`.

### Quiz answers

The extension saves answers to TeachBooks-Questions quizzes. It saves which option the reader picked in a multiple-choice question and what they typed into a math answer field. When the reader reloads the page, the answer is selected again. The extension does not show the feedback (correct or incorrect) again, so the reader presses Check to see it.

Turn it off with `persistence_questions: false`.

### Custom HTML activities

Many books contain small exercises written directly in HTML, such as sorting, matching and click-to-classify exercises. Normally another script cannot save these, because each activity keeps its state in its own code. This extension records the clicks a reader makes inside such an activity. When the reader reloads the page, the extension replays those clicks, and the activity rebuilds itself step by step. If the reader had pressed Check, the graded result comes back as well. You do not need to change the activities themselves.

Turn it off with `persistence_activities: false`. To skip single activities, such as timed games, list their ids in `persistence_activity_exclude_ids`.

## Export, Import and Reset buttons

The extension adds three buttons to the page header. They are on by default.

![Export, Import and Reset buttons in the page toolbar](docs/toolbar.png)

Saved work lives in one browser on one computer. Export and Import move it between computers. Export downloads one file with all saved work in the whole book, and Import loads such a file back in. A student can work in the university library, export the file and continue at home. The file also works as a backup in case the browser clears its storage.

Import checks the file first. If the file comes from a different book, the reader sees a warning before anything changes. Code edits that no longer match the current version of the book are skipped.

The Reset button lets a reader start over. It asks whether to clear only the current page or the whole book. Then it deletes the saved work and reloads the page in its original state. It only deletes what this extension saved.

Turn all three buttons off with `persistence_toolbar: false`.

## Progress controls

The extension can also add controls that help readers track how far they are. These controls are off by default, so readers of an existing book see no new buttons after you install the extension. Each control has its own setting, so you can turn on only the ones you want.

### Checkbox at the end of each page

With `persistence_page_checkbox: true`, every page ends with a "Mark this section as complete" checkbox that the reader can tick when they are done with the page.

![Mark this section as complete checkbox](docs/mark-complete.png)

### Ticks in the sidebar

With `persistence_sidebar_ticks: true`, a tick appears in the left sidebar next to every page the reader has marked complete. The reader can then see at a glance which pages they have finished. The ticks come from the page checkbox, so turn on `persistence_page_checkbox` as well.

![Tick next to a completed page in the sidebar](docs/sidebar-check.png)

### "Mark as done" after each activity

With `persistence_activity_checkboxes: true`, every learning activity ends with a "Mark as done" checkbox. The extension finds learning activities in two ways. The first is an HTML element with `data-learning-activity="true"` that contains an element with the class `la-title`. The second is a heading that starts with "Learning activity:".

### Reset button after each activity

With `persistence_activity_reset: true`, every learning activity that is written in HTML ends with a "Reset" button. This button clears the saved answers of that one activity and reloads the page, so the reader can start the activity again. It keeps the "Mark as done" tick. Activities written as Markdown headings do not get this button, because they have no saved state of their own.

### Checkboxes on long pages

Some pages are long walkthroughs with numbered parts, such as "3.1.1: Setting up the model". You can give each numbered part its own "Mark as done" checkbox. Set `persistence_part_heading_pages` to a pattern that matches the web addresses of those pages, for example `"chapter_3|chapter_4"`. The pattern is a JavaScript regular expression. When the setting is empty, which is the default, no page gets these checkboxes.

## What does not get saved

- The output of code cells is not saved. Only the code is saved, and running it again brings the output back.
- Anything inside an iframe from another website, such as YouTube or H5P, is not saved. Browsers do not let a page look inside those.
- Canvas animations and games are not saved. They start again on purpose.
- The extension does not remember which tab of a tab set was open.

## Settings

All settings are optional. In a Jupyter Book or TeachBooks book, put them in `_config.yml` under `sphinx:` and then `config:`, next to your other Sphinx settings. In a plain Sphinx project, put them in `conf.py`. Rebuild the book after you change a setting.

This example turns on all progress controls:

```yaml
sphinx:
  extra_extensions:
    - sphinx_persistence
  config:
    persistence_page_checkbox: true
    persistence_sidebar_ticks: true
    persistence_activity_checkboxes: true
    persistence_activity_reset: true
```

The table lists every setting in the order of this README.

| Setting | Default | What it does |
|---|---|---|
| `persistence_code_cells` | `true` | Saves the code readers write in live code cells. |
| `persistence_questions` | `true` | Saves TeachBooks-Questions answers. |
| `persistence_activities` | `true` | Saves custom HTML activities. |
| `persistence_activity_exclude_ids` | `[]` | Lists the ids of HTML activities that should never be saved, such as timed games. |
| `persistence_toolbar` | `true` | Shows the Export, Import and Reset buttons in the page header. |
| `persistence_page_checkbox` | `false` | Adds a "Mark this section as complete" checkbox at the end of every page. |
| `persistence_sidebar_ticks` | `false` | Shows a tick in the sidebar next to completed pages. Needs `persistence_page_checkbox`. |
| `persistence_activity_checkboxes` | `false` | Adds a "Mark as done" checkbox after every learning activity. |
| `persistence_activity_reset` | `false` | Adds a "Reset" button after every learning activity written in HTML. |
| `persistence_part_heading_pages` | `""` | Adds a "Mark as done" checkbox after numbered part headings on pages whose address matches this pattern, for example `"chapter_3\|chapter_4"`. |
| `persistence_book_id` | `""` | Gives your book a name. When a reader imports a file from a different book, they see a warning. Without a name, the extension uses the website address. |

## Good to know

- The extension saves work per browser and per computer. To move it to another computer, use Export on the first computer and Import on the second.
- Browsers give a website about 5 MB of storage. If a reader fills it, they get a warning, so no work is lost without notice.
- Reset deletes only what this extension saved. It does not touch other data of the website.

## Development

The JavaScript files are in `src/sphinx_persistence/static/`. Sphinx serves the installed copy of the package. So after you edit a file, reinstall the package from your checkout before you rebuild the book you test with:

```
pip install --force-reinstall --no-deps /path/to/sphinx-persistence
```

## License

MIT
