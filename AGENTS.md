# UI KIT development

Read `ROADMAP.md` before changing this project, including after context compaction.
Use its current checkpoint, task IDs, decisions, verification notes and next action to continue.

- Read `DESIGN.md` for the existing visual system before UI changes. Project adoption templates
  live in `integrations/`; integration guidance is `docs/adoption.md`.
- Keep related short controls, filters, actions and metadata on one row whenever their content
  widths and standard gaps fit the container. Use content-sized widths and natural wrapping
  (`brand-control-row` for labeled controls); do not impose equal wide columns or premature
  full-width rows. Preserve readable labels, control heights and touch targets when wrapping.
- Preserve the framework-free HTML/PHP integration and offline `file://` examples.
- Bootstrap and Lucide are vendored; do not replace the stack or add mandatory runtime dependencies.
- `tokens.json` is the source for generated `tokens.css` and `tokens.js`.
- Start one roadmap stage at a time; update its task checkboxes as work and verification finish.
- A completed stage needs working implementation, integration/docs, relevant checks and a Git commit.
- Record partial work, failed checks and remaining limitations honestly before any handoff or compaction.
- Keep original references and vendored license files intact. Do not invent a brand or license decision.
- Browser tests use an isolated temporary Chrome profile and a localhost server; no user browser profile.
- Release ZIPs must match current source. Use the release script once it is available.
- Run `git status` before committing and never overwrite unrelated user changes.
- Git was initialized locally. The user requested saving this project to GitHub on 2026-10-31;
  origin is https://github.com/interdizdev-stack/UIKIT.git (provided 2026-11-01).
  The user explicitly authorized updating this public repository on 2026-11-01. Keep it public.
  Publish only UIKit as an ordinary source repository on main: source files, styles, scripts,
  tokens, assets, vendored dependencies and examples, plus its documentation, project rules,
  build/check scripts and tests. README must describe components, integration and usage rules,
  with clone-first instructions. Release ZIPs are supplementary, never a replacement for the
  source tree. Do not publish local Git-history bundles, backups, personal notes, credentials,
  browser profiles, caches or generated test results. In particular, leave `agy audit.md`
  untracked and unpublished. Local and plugin-created
  remote commit graphs may differ: do not force-push over either history. Read ROADMAP.md
  before synchronizing through native Git; its authentication is separate from the plugin.
  Preserve repository visibility and do not publish to another destination without a user request.
  When no author is configured,
  use per-command `-c user.name=Codex -c user.email=codex@localhost` for maintenance commits.

No parallel agent work is requested by these instructions.
