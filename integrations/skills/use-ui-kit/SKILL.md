---
name: use-ui-kit
description: Build or edit web interfaces with the existing UI KIT when the project adopts it or the user requests it. Reuse its HTML/PHP components, tokens and local assets instead of designing a new UI system.
---

# Use UI KIT

Use the existing UI KIT as the project's design system. Preserve the application's
structure and the user's explicit design and technology choices.

## Locate the library

Read the project's AGENTS.md and DESIGN.md for the library path and pinned version.
The default project path is `assets/brand-ui/`. For first-time adoption on the owner's
machine, `/home/hp/UIKIT` is a possible source; verify it exists rather than relying on it
in other environments. Resolve filesystem paths separately from public asset URLs.

Read the resolved kit's DESIGN.md, README.md integration section and tokens.json.
Read docs/api.md and the relevant component documentation only for behavior in use.
If the library is missing, locate the user-provided release/source or ask for its location;
do not replace it with an invented design or silently download a different kit.

## Reuse and integrate

- Find the nearest source in examples/*.html and examples/*.js. With a full catalog,
  index.html and catalog-examples.js help locate additional variants. Copy source HTML,
  not initialized DOM wrappers. Keep labels/ARIA; change duplicated IDs and references.
- Prefer existing components, then compositions, then a project-specific component using
  existing tokens. Record necessary design exceptions in the project's DESIGN.md.
- Read docs/system-coverage.md for component choice, state applicability and browser limits; use the catalog preview matrix before adding a new variant.
- Read docs/pages.md for app shell, list/detail/edit, settings, auth/service and content recipes; replace demo callbacks with application behavior.
- Read docs/mobile.md for container grids, table/list/auto, sheets, native selects,
  limited chips, visualViewport and safe-area rules.
- Read docs/patterns.md for page headers/toolbars, choice groups, form error summary,
  server errors, description lists, copy and draft/apply filters. Use the existing
  forms controller and optional patterns module rather than duplicate state handling.
- Use one release of CSS/JS/vendor/assets. Follow README dependency order: Bootstrap CSS,
  tokens.css, ui-kit.css, project CSS; Bootstrap bundle and one Lucide file before ui-kit.js.
  Add modules as needed after the core; forms precedes inputs for stepper.
- Keep runtime local and framework-free. Do not introduce a mandatory build, CDN, React
  adapter or another component library. If the application already uses a framework,
  integrate the documented DOM lifecycle where suitable and disclose unsupported needs.
- Before replacing a dynamic container, await BrandUI.destroy(container); after insertion,
  call BrandUI.init(container). Connect real data and submit handlers in application code;
  examples demonstrate behavior without real submission.
- Use semantic theme tokens and typography/layout roles from DESIGN.md. Keep project CSS
  separate after ui-kit.css. Change tokens.json and regenerate when changing token values;
  do not hand-edit generated tokens.css/tokens.js or patch the vendored dependencies.
- Keep related short controls, filters, actions and metadata on one row while their content
  widths plus standard gaps fit the container. Use brand-control-row for labeled controls,
  brand-filter-fields for filters and brand-cluster for actions. Avoid equal wide columns,
  automatic growth and forced full-width rows for short values. Wrap whole items only when
  space runs out; preserve DOM order, readable text, control heights and touch targets.
  Size free-text fields for the expected input; justify any field that fills spare width.
- Preserve third-party licenses. Replace demo copy and images as needed; the temporary kit
  name and graphics do not authorize a new brand or license decision.

For installation, version pinning and project instruction templates, read the resolved
kit's docs/adoption.md. Read ROADMAP.md before modifying the source UI KIT itself.

## Verify the integrated page

Check local resource paths, relevant interactions/states, keyboard focus, light/dark,
and 320/390/768/1440 px. Check the application's actual submit/data flow when changed.
Check that short controls share a row when space allows and wrap in narrow containers
without horizontal page overflow or clipped labels.
Use an isolated temporary browser profile with localhost for browser automation.
Preserve offline file:// examples when editing the kit. Report the library version,
components reused, local extensions and checks actually performed; do not claim other
browsers or screen readers were tested without running them.
