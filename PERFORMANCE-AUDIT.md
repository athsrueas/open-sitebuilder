# Responsiveness and optimization audit — 2026-10-02

This is a dated audit, not an exhaustive certification of every later version. Its original block counts, test counts and timings describe the 2026-10-02 fixtures. The current block catalogue and user instructions are in [README.md](README.md); later checks are noted below.

The audit used a separate local server and test portfolio. The artist's project and Cloudflare credentials were not changed. The normal Astro output was rebuilt after testing; test images were removed from the generated public media folder. No live deployment was made.

## Coverage

- All 25 block types: rendering, editor inspectors, canvas style controls and generated output.
- All six theme presets, plus 78 individual site style choices or numeric/color boundaries across Colors, Typography, Layout, and Paper & ink. Shared validation and CSS generation cover every registered setting.
- Editor widths: 1920, 1440, 1024, 768, 600, 390 and 320 pixels.
- Generated pages: seven pages at 1440, 768, 390 and 320 pixels, covering every block type, paper material and ink mode. No horizontal body overflow or broken loaded images was found.
- Pages, Styles, Images, Details, settings, workspace decorations, media library, image editor and build dialog. Media import, search, archive/restore and the missing-credentials publishing path were exercised.
- Stress fixture: 200 blocks, 16 distinct imported images and eight 12-page sketchbooks. The image tools also used a 4000 × 3000 image.
- Image operations: all rotation/flip directions, resize, four zoom choices, free and four fixed crop ratios, adjustment sliders, grayscale, connected-background cutout, erase/restore brushes, undo/redo/reset and saving new versions. Saved versions were verified at 2000 × 1500 and 4000 × 3000 pixels.
- Automated suite: 17 JavaScript and 14 Python tests, plus syntax/diff checks and successful Astro builds.

## Measurements

These are local observations in the Codex in-app browser on this Windows machine, not guarantees for other hardware or networks. Render measurements use opt-in instrumentation around the real editor functions, not automation round-trip times.

| Test | Observation |
|---|---:|
| Initial mixed 200-block preview, before optimization | 391.8 ms |
| Same fixture, after lazy forms and incremental rendering | 80.3 ms |
| Preview DOM elements, before → after | 37,657 → 5,457 |
| Initial image-heavy 200-block preview | 86.7 ms |
| Preview updates during the first 104 theme/style renders | About 26 ms average |
| 12 MP adjustment preview | About 16 ms; sampled maximum 18.2 ms |
| 12 MP full-resolution adjustment worker | 93.1 ms |
| Tested connected-background cutout worker operation | 25.5 ms |
| Generated site's common runtime, uncompressed | 3,083 bytes |
| Conditional page-flip chunk, uncompressed | 44,258 bytes |

Image loading/application produced occasional 67–104 ms main-thread long tasks from decoding, canvas reads, history copies and painting. The expensive pixel loops now run in a worker; native decoding and encoding still take time on large images. A large PNG save outlasted one automation wait; the backend saved the complete 4000 × 3000 version, and the test window was reloaded before continuing.

## Changes

- Canvas style forms are created only when opened. Unchanged blocks are reused, referenced assets are indexed once, and theme edits preserve sketchbook instances and page position. Resize observers update book dimensions without recreating them.
- Preview messages and brush movements are coalesced by animation frame. Image brushes redraw only the changed area.
- Adjustment sliders use a maximum 1280-pixel preview. Apply, save and download still process full-size pixels. Full-size adjustments and connected-background selection run in a dedicated worker with transferable buffers. Workers and large canvases are released on close; history commits avoid unnecessary copies.
- Media grids use lazy, asynchronously decoded 480-pixel thumbnails. Portfolio images expose 480/1200/2400-pixel responsive sources and intrinsic dimensions. Existing imports receive cached derivatives on demand. Immutable media can be reused by the browser.
- Paper texture data is declared once per used material rather than repeated inside every block. Generated client code is separated from the material-generation code, and page-flip is loaded only where needed.
- Builds include referenced images, including archived images that remain in use, and remove stale generated images. Unused imports and versions stay in the local library.
- Narrow editor windows stack panels; media and image dialogs fit small screens. Toolbars wrap, controls remain reachable, and the mobile image editor opens with the canvas above the tools. Long text can wrap without widening pages.
- Crops are constrained to source bounds, preventing oversized crops and unintended transparent margins when aspect ratios change.

## Limits and reproduction

The audit does not exhaust every possible combination, imported artwork, or custom URL. Physical iOS/Android devices, Safari/Firefox, network throttling, third-party video/audio service performance and authenticated Cloudflare publishing were not tested. The builder remains a desktop tool; large images and many simultaneous sketchbooks will use more memory than text-only pages.

Run `node --test tests/*.test.js` and `python -m unittest discover -s tests` for regressions. Add `?diagnostics=1` to the local editor URL to enable page-local render/long-task measurements. The preview inherits this flag. Summaries are available in the hidden DOM output `#folio-diagnostics`; no measurements are transmitted and diagnostics are not included in the generated site.

## Published export optimization — 2026-10-02

- Per-page published HTML removes editing hooks and hidden link-edit labels.
- CSS rules for absent block classes/tags are removed while retaining nested responsive rules, negative selectors and quoted SVG URLs.
- Unused paper/ink markup and SVG filters are omitted; only animated blocks are observed by the motion controller.
- Static-only Astro builds with download deterrence disabled emit zero JavaScript files. Download deterrence adds its image-protection runtime on artwork pages. Mixed builds emit only the required material and/or sketchbook runtime files, referenced only by pages using those features.
- Controlled text + Free layout fixture: 14,795 → 4,416 bytes of uncompressed renderer HTML/CSS (70% reduction). Artwork transfer sizes remain separate from this measurement.
- Actual mixed/static Astro builds, all 26 block renderers, CSS pruning edge cases and local generated runtime routing were checked. Browser checks confirmed sketchbook flipping, ink animation, a zero-script static page and no horizontal overflow at 390px.

Repeat with `node scripts/test-published-build.mjs` when no build/publish job is active. Fixture output and its size report remain in ignored `data/` directories.

## Documentation and recent regression check — 2026-10-03

The current catalogue has 26 blocks. The automated suite currently contains 49 JavaScript and 42 Python tests. Recent isolated browser and Astro build checks covered cross-page block dragging and internal destinations, footer visibility, footer text editing, footer links, save/reload preservation and removal of editor controls from published HTML. These checks do not replace the original performance measurements or extend them to untested devices. Use the README's private-runtime commands to run the suite without requiring global Python or Node installations.

Before running the published-build check, create `site/src/project.json` using **Build site** once and wait for build/publish jobs to finish. The script restores that input, but its disposable output remains under `data/published-build-test`.
