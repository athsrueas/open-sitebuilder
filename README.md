# Folio Studio

A small local portfolio builder for artists. A Python server opens a visual editor in your browser; Astro generates a static portfolio, and Wrangler uploads it to Cloudflare Pages through Cloudflare's API.

## Start on Windows

Install Python 3.11+ and Node.js 22.12+ (Node 24 LTS recommended). From this folder run:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

Setup installs Pillow and the Node dependencies and creates a **Folio Studio** desktop shortcut. Double-click the shortcut to open the builder. You can also run `python server.py` directly, or `python server.py --no-browser --port 4873`. On this Codex machine, the scripts can use bundled runtimes.

The shortcut starts the server in the background. To stop it, click **Settings → Close studio**. The foreground command can be stopped with Ctrl+C. This is a source-based application, not a packaged installer yet.

## Media management and image editing

Open **Media** for the dedicated import and management screen. Import several JPEG/PNG/WebP images, search names and descriptions, edit file names and alt text, view image versions, download original files, add images to the current page, and archive/restore library entries. Archive hides an image without deleting it or breaking existing pages.

Click **Edit image** on artwork in the canvas or on an image in the Images sidebar. The editor includes:

- Crop with movable handles and free/square/portrait/landscape ratios; rotate and flip.
- Pixel resizing with proportions locked by default and Pica's high-quality resampling.
- Brightness, contrast, saturation, opacity, and grayscale; adjustment sliders preview live.
- Color-based connected background removal with adjustable tolerance; erase/restore brushes with adjustable size and soft edges. This is a color selection tool, not AI subject segmentation.
- Undo/redo, reset, fit/100%/200% zoom, and transparent PNG download.

**Save new version** preserves the source file and adds an edited copy to the library. Contextual edits can replace just the clicked image; library edits can optionally replace all uses. The checkbox controls this. Imports and generated WebP assets preserve alpha transparency. Edits operate on the web copy (up to 5,000 px); the original upload stays available separately. Image edits allow up to 25 megapixels and 6,000 px per side. WebP exports above 5,000 px are scaled to the existing web-copy limit.

The editor serves pinned local copies of Cropper.js 2.2.0, Pica 10.0.3, and magic-wand-tool 1.1.7. Each is MIT licensed; full notices are in [THIRD-PARTY-IMAGE-LICENSES.md](THIRD-PARTY-IMAGE-LICENSES.md). Run setup.ps1 after updating dependencies. No external image editing service receives artwork.

## Workspace appearance

The editor uses a minimal black-and-white interface. **Workspace** lets you choose a studio icon and add optional stickers. Drag stickers to move them; arrow keys also move focused stickers, and Delete removes one. Hide them with **Show workspace stickers**, or remove them in the appearance panel. These preferences are stored in this browser and are never included in the portfolio or its published site.

## Build a portfolio

- Set the artist name and description in Settings.
- Create pages in the Pages tab. The first page is the homepage; move a page earlier to change that order. Other pages have editable URL slugs.
- Add introductions, text, images, galleries, horizontally scrolling carousels, sketchbooks, and dividers. Click a tile under **Add a block**, or drag it into the live preview and drop at the green insertion line. Drag existing blocks by their dotted handles to reorder them in the list or preview. Blocks can be duplicated and deleted. Click **Delete** in a block’s canvas toolbar, **×** beside the block in the Pages list, or **Details → Delete block**. **Pages → Undo delete** restores recent deletions (up to 20 during the current editor session); saved media stays in the library.
- Select a block in the list to bring it into view, or click it in the preview to edit its settings. Text and theme changes appear immediately. Unchanged sketchbooks keep their current page while you edit surrounding text. The refresh button reloads the preview if needed.
- Edit directly on the page: click headings, body text, image captions, sketchbook titles/captions, the artist name, or the footer description. Text saves automatically; Escape restores the text from when you started editing. Pasted text stays plain text.
- Drop JPEG, PNG, or WebP files onto the canvas to create an image or gallery. Drop onto an existing image to replace it, a gallery/carousel to append photos, or a sketchbook page to replace that page's artwork. You can also drag existing artwork from **Images**, or use **Add photos** and the controls on each block.
- Resize a single image with its bottom-right corner handle, or the width/height sliders beneath it. Use **Crop to fill / Show whole photo** to change how it fits. Sizes are saved and included in the exported site. Move or duplicate blocks with their canvas controls, or drag the dotted handle to a green insertion line. **Details** opens the optional settings panel.
- Browse **Add a block** in the sidebar or **All blocks** on the canvas. Both have search and collapsible categories; click a block or drag it onto the page. Search also matches descriptions.

The library contains 25 blocks:

| Group | Blocks |
| --- | --- |
| Text | Introduction, Text, Heading, Quote, List, Table, Accordion / FAQ, Code / preformatted |
| Artwork | Image, Gallery, Carousel, Sketchbook, Image + text, Cover image, Artwork cards |
| Media | Video, Audio |
| Links & contact | Button, Links, Social links, File link, Contact |
| Layout | Text columns, Divider, Spacer |

Table cells and item titles/text can be edited on the canvas. Lists use one item per line; tables use one row per line with `|` between cells. FAQ answers stay open while editing and collapse on the exported site. Link URLs, list numbering, attribution, column counts, and spacer height have controls on the canvas and in Details. Text columns support two to four columns and stack on small screens; they contain text items rather than nested arbitrary blocks.

Videos accept YouTube/Vimeo URLs or direct hosted video URLs; audio and file links use hosted HTTPS URLs. Contact blocks provide an email link. Photo uploads remain JPEG, PNG, or WebP; media uploads and contact submission processing are not included.

The catalogue is based on the standard types documented by [WordPress](https://wordpress.org/documentation/article/blocks-list/) and [Squarespace](https://support.squarespace.com/hc/en-us/articles/206543757-Add-content-to-your-site-with-blocks), with a searchable category layout like [Webflow's Add panel](https://help.webflow.com/hc/en-us/articles/33961270096659-The-Add-panel). Type definitions and default fields live in `shared/blocks.json`, which the editor, renderer, and server validation share.
- Import JPEG, PNG, or WebP artwork from Images, then assign it to a block. Galleries and carousels follow image selection order. Re-select images to change that order.
- Customize every sketchbook page with an image, title, caption, paper color, crop setting, and hard/soft page type. Reorder pages with the arrow buttons. StPageFlip handles mouse/touch turning and portrait layout.
- Open **Styles → Theme presets** to choose Gallery white, Exhibition, Studio archive, Editorial, Dark viewing room, or Print catalogue. These set colors, typography, widths, spacing, and artwork grid defaults without changing content or existing block overrides. References are linked in the picker.
- Adjust **Site defaults** for heading/body fonts, colors, font sizes, line/letter spacing, alignment, page width, padding, image corners, gallery columns, image height, and grid spacing. Fonts are local system stacks; no external font service is required.
- Open **Styles** in a block’s canvas toolbar (or **Details → Block styles**). Check a setting to override its site default, then edit it directly. Uncheck it to inherit again, or use **Reset block styles** to clear all overrides. New blocks inherit automatically. These controls change the live preview and the Astro export. Check desktop and mobile previews.
- Open **Paper & ink** in site defaults or a block’s canvas styles for paper surfaces, slow lighting, heading ink finishes and pigment washes. Adjust strength, scale, color and motion speed. See [paper and ink materials](PAPER-AND-INK.md) for techniques and research.
- Changes save automatically. Click **Build site** to generate `site/dist` and open the built preview.

The preview and Astro output share `shared/render.js` and the small `shared/runtime.js` interaction layer. Media grids use 480 px thumbnails; exported images offer responsive derivatives. Only images referenced by pages are included in builds. The editor itself is plain JavaScript and CSS; no frontend framework or Node dev server is needed while editing.

## Publish to Cloudflare

For a temporary landing page, enable **Settings → Full-screen splash layout**. This hides the portfolio navigation and footer and gives each block a full viewport canvas; headings and paper/ink settings remain editable. [examples/coming-soon.json](examples/coming-soon.json) contains the Miranda Freestone placeholder with watercolor paper, slow moving light, soft ink type and animated pigment blooms. The local portfolio before this change is preserved in `data/backups`. Disable the layout to return to normal page styling; restore a backed-up project to recover its previous pages.

1. Create a Cloudflare account and a **Pages Direct Upload** project. Use the project name shown in Cloudflare, not a display name or domain. Set its production branch to `main` (Wrangler publishes to `main`).
2. Create an API token with **Account → Cloudflare Pages → Edit**, scoped to your account.
3. In Settings, enter the account ID, project name, and token. Saving writes them to the private `.env` file in the application folder. You can also edit that file directly.
4. Click **Publish**. The server builds the current saved project with Astro, then invokes local Wrangler to upload `site/dist`. Publishing updates the configured project's production site.

The app reads these values from the root `.env` file whenever you open Settings or publish:

```dotenv
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_PAGES_PROJECT=your_pages_project_name
```

Changes to `.env` take effect without restarting. Existing non-empty environment variables override the corresponding file values. Leaving the token field blank in Settings preserves the saved token. To remove it, clear `CLOUDFLARE_API_TOKEN` in `.env` and any launch environment variable.

The `.env` file contains your token in plain text and is excluded from Git. Keep it private; `.env.example` is the shareable blank template. Credentials stay outside project JSON, the generated site, and browser responses. Cloudflare publishing requires internet access. No account or token is needed to edit and build locally.

Official references: [StPageFlip](https://github.com/Nodlik/StPageFlip), [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), [API token setup](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).

## Data and photos

Back up the entire `data` folder. It contains `project.json`, nonsecret Cloudflare configuration, original uploads, and processed web images. Original bytes remain local. Images are orientation-corrected, metadata removed, and converted to WebP at up to 2,400 px for the portfolio and 5,000 px for the full-size link. Images are never upscaled. Import supports up to 60 MB and 80 megapixels per image. Transparency is preserved. Published original downloads and images above 5,000 px are not included in this first version.

The server binds only to `127.0.0.1`; host checks and a per-launch request token protect writes. Do not expose it with a tunnel or bind it to a network interface. No analytics, remote fonts, or external image dependencies are included.

See [the performance audit](PERFORMANCE-AUDIT.md) for coverage, measured results, and remaining device/network limitations.

## Development and checks

```powershell
python -m unittest discover -s tests -v
node --check ui/app.js
node --check shared/render.js
```

The checked-in Astro template expects `site/src/project.json`, generated by the editor's Build action. Build output and personal artwork are excluded from Git. `pnpm-lock.yaml` pins Node dependencies; use `pnpm install --frozen-lockfile` for reproducible installation.

This first version supports one local portfolio, structured block layouts, and styling controls. Free-position canvas editing, arbitrary custom CSS, undo/history, asset deletion, and a packaged installer are future additions. Cloudflare deployment is implemented but must be verified with your account and token.

<!-- folio-about:start -->
## About, feature history and attributions

A local art portfolio editor with static site export and Cloudflare Pages publishing.

Open **About** in the editor toolbar for these same credits and feature history.

### Feature history

- **Visible block deletion and undo** — Delete blocks directly from the canvas toolbar or Pages list, and restore up to 20 recent deletions during the editor session. <sub>2026-10-02 · [018d43d](https://github.com/athsrueas/mirandasite/commit/018d43dadb0a0767c12a9e167282c2b71a59a1bf)</sub>
- **Animated coming-soon splash** — Editable full-screen landing layout with procedural watercolor paper, slow light and ink blooms, plus a reusable coming-soon portfolio example. <sub>2026-10-02 · [06fe1f8](https://github.com/athsrueas/mirandasite/commit/06fe1f8d16858ace665a3d6fee38828582b7a1aa)</sub>
- **About, feature history and library credits** — Feature additions with linked commits, library-to-feature attributions, searchable dependency credits, and shared content synchronized with the README. <sub>2026-10-02 · [49136c1](https://github.com/athsrueas/mirandasite/commit/49136c1ade1139c1aa828e2d97d358a839bf294f)</sub>
- **Performance and responsive layouts** — Incremental canvas previews, responsive image derivatives, background image processing, smaller exported scripts, and narrow-screen editor layouts. <sub>2026-10-02 · [6775461](https://github.com/athsrueas/mirandasite/commit/67754619d87a3b83236fc242536de819dc2ed59c)</sub>
- **Paper and ink materials** — Procedural paper grain, fibers and weave, moving light, heading ink finishes, and pigment washes with motion preferences respected. <sub>2026-10-02 · [b8c6e11](https://github.com/athsrueas/mirandasite/commit/b8c6e112926f1f3b0b959328d33ac7ef5f81e94e)</sub>
- **Media library and image editing** — Import and organize artwork, preserve originals and edited versions, crop, resize, rotate, adjust color, remove connected backgrounds, and refine transparency with brushes. <sub>2026-10-02 · [84e1061](https://github.com/athsrueas/mirandasite/commit/84e10610e9c97c5d1aecabbfc209899b7eceb1ef)</sub>
- **Workspace appearance** — Minimal monochrome editor typography with optional icons and movable stickers stored locally in the browser. <sub>2026-10-02 · [fd3ae2f](https://github.com/athsrueas/mirandasite/commit/fd3ae2fcb3b30830c262ff11b315c272debc77b3)</sub>
- **Themes and inherited block styles** — Six gallery-inspired presets and editable site defaults for fonts, colors, sizing, spacing and artwork layout, with individual block overrides. <sub>2026-10-02 · [280b036](https://github.com/athsrueas/mirandasite/commit/280b036aa9b40cb663ba3d46390454ef597ccb49)</sub>
- **Grouped block library** — 25 portfolio blocks across Text, Artwork, Media, Links & contact, and Layout, with search and collapsible groups. <sub>2026-10-02 · [c65829e](https://github.com/athsrueas/mirandasite/commit/c65829e6088ff0c25f394156bca45d802e14f77e)</sub>
- **Plain interface copy** — Removed promotional slogans from the editor and portfolio defaults. <sub>2026-10-02 · [2039d45](https://github.com/athsrueas/mirandasite/commit/2039d45328f941503ebcd1d1618bdf8313a82a20)</sub>
- **Editing directly on the canvas** — Editable headings, paragraphs and captions, photo drops, existing artwork assignment, and drag handles for image sizing. <sub>2026-10-02 · [3e1ca01](https://github.com/athsrueas/mirandasite/commit/3e1ca01dd74b7aabb14cd2ed77bde0052c46e947)</sub>
- **Live preview and block drops** — Preview updates as content changes; blocks can be dragged onto the page and reordered. <sub>2026-10-02 · [a28f019](https://github.com/athsrueas/mirandasite/commit/a28f01976a87f4b2243bb805af28e16c619979dd)</sub>
- **Initial portfolio builder** — Local Python launcher, pages and artwork blocks, page-flipping sketchbooks, Astro builds, and configured Cloudflare Pages publishing. <sub>2026-10-02 · [e1db04b](https://github.com/athsrueas/mirandasite/commit/e1db04b7e9daa5617f5f86696da70372fe3b03df)</sub>

### Direct libraries

| Library / version | Feature | Attribution / license |
| --- | --- | --- |
| [Astro](https://github.com/withastro/astro) · 6.4.8 | **Static portfolio export.** Compiles the saved portfolio into static HTML, CSS and small interaction scripts when Build site or Publish is used. Runs locally during builds. | MIT · [source and notices](https://github.com/withastro/astro) |
| [StPageFlip](https://github.com/Nodlik/StPageFlip) · 2.0.7 | **Interactive sketchbooks.** Turns HTML sketchbook pages with mouse/touch interaction, hard/soft pages and portrait layouts. Used in the editor preview and exported sketchbook pages. | MIT · [source and notices](https://github.com/Nodlik/StPageFlip) |
| [Cropper.js](https://github.com/fengyuanchen/cropperjs) · 2.2.0 | **Image crop handles.** Provides movable selections and aspect-ratio crop controls in the local image editor. Not shipped in portfolio pages. | MIT · [source and notices](https://github.com/fengyuanchen/cropperjs) |
| [Pica](https://github.com/nodeca/pica) · 10.0.3 | **High-quality image resizing.** Resamples artwork when pixel dimensions are changed in the local image editor. Does not send images to an external service. | MIT · [source and notices](https://github.com/nodeca/pica) |
| [Magic Wand Tool](https://github.com/Tamersoul/magic-wand-js) · 1.1.7 | **Connected-background cutout.** Selects connected pixels by color tolerance so the editor can remove their alpha. Runs in a local worker; this is color selection rather than AI subject segmentation. | MIT · [source and notices](https://github.com/Tamersoul/magic-wand-js) |
| [Pillow](https://github.com/python-pillow/Pillow) · >=11.0,<13 | **Artwork import and web images.** The Python server corrects orientation, removes metadata, preserves transparency, and creates thumbnail, responsive and full-size WebP copies. The original upload is preserved. Pillow's codec notices are documented upstream. | MIT-CMU (HPND) · [source and notices](https://github.com/python-pillow/Pillow) |
| [python-dotenv](https://github.com/theskumar/python-dotenv) · >=1.0,<2 | **Local publishing configuration.** Reads and writes the private .env configuration for the Cloudflare token, account and Pages project. Credentials stay outside portfolio content and generated pages. | BSD-3-Clause · [source and notices](https://github.com/theskumar/python-dotenv) |
| [Wrangler](https://github.com/cloudflare/workers-sdk) · 4.146.0 | **Cloudflare Pages deployment.** Uploads the built static site to the configured Pages project using the Cloudflare API. Invoked by the Python server when Publish is selected. | MIT OR Apache-2.0 · [source and notices](https://github.com/cloudflare/workers-sdk) |

Canvas text editing, block drag-and-drop, adjustment sliders, erase/restore brushes, workspace decorations, and procedural paper/ink use Folio Studio code with native browser APIs. No separate material or AI segmentation library is incorporated. System fonts need no font service.

Full notices for the bundled image tools: [THIRD-PARTY-IMAGE-LICENSES.md](THIRD-PARTY-IMAGE-LICENSES.md).

The expandable inventory lists installed JavaScript packages, including indirect build and publishing dependencies. These packages support the direct libraries above; they are not all delivered to visitors. Versions and declared licenses come from installed package metadata. Package license files and upstream notices remain authoritative. Python dependency ranges come from requirements.txt.

<details>
<summary>Installed JavaScript dependency inventory</summary>

| Package | Version | Declared license |
| --- | --- | --- |
| [@astrojs/compiler](https://github.com/withastro/compiler) | 4.0.0 | MIT |
| [@astrojs/internal-helpers](https://github.com/withastro/astro) | 0.10.0 | MIT |
| [@astrojs/markdown-remark](https://github.com/withastro/astro) | 7.2.0 | MIT |
| [@astrojs/prism](https://github.com/withastro/astro) | 4.0.2 | MIT |
| [@astrojs/telemetry](https://github.com/withastro/astro) | 3.3.2 | MIT |
| [@babel/helper-string-parser](https://github.com/babel/babel) | 7.29.7 | MIT |
| [@babel/helper-validator-identifier](https://github.com/babel/babel) | 7.29.7 | MIT |
| [@babel/parser](https://github.com/babel/babel) | 7.29.9 | MIT |
| [@babel/types](https://github.com/babel/babel) | 7.29.8 | MIT |
| [@capsizecss/unpack](https://github.com/seek-oss/capsize) | 4.0.1 | MIT |
| [@clack/core](https://github.com/bombshell-dev/clack) | 1.5.1 | MIT |
| [@clack/prompts](https://github.com/bombshell-dev/clack) | 1.8.1 | MIT |
| [@cloudflare/kv-asset-handler](https://github.com/cloudflare/workers-sdk) | 0.5.0 | MIT OR Apache-2.0 |
| [@cloudflare/unenv-preset](https://github.com/cloudflare/workers-sdk) | 2.16.2 | MIT OR Apache-2.0 |
| [@cloudflare/workerd-windows-64](https://github.com/cloudflare/workerd) | 1.20261001.1 | Apache-2.0 |
| [@cropper/element](https://github.com/fengyuanchen/cropperjs) | 2.2.0 | MIT |
| [@cropper/element-canvas](https://github.com/fengyuanchen/cropperjs) | 2.2.0 | MIT |
| [@cropper/element-crosshair](https://github.com/fengyuanchen/cropperjs) | 2.2.0 | MIT |
| [@cropper/element-grid](https://github.com/fengyuanchen/cropperjs) | 2.2.0 | MIT |
| [@cropper/element-handle](https://github.com/fengyuanchen/cropperjs) | 2.2.0 | MIT |
| [@cropper/element-image](https://github.com/fengyuanchen/cropperjs) | 2.2.0 | MIT |
| [@cropper/element-selection](https://github.com/fengyuanchen/cropperjs) | 2.2.0 | MIT |
| [@cropper/element-shade](https://github.com/fengyuanchen/cropperjs) | 2.2.0 | MIT |
| [@cropper/element-viewer](https://github.com/fengyuanchen/cropperjs) | 2.2.0 | MIT |
| [@cropper/elements](https://github.com/fengyuanchen/cropperjs) | 2.2.0 | MIT |
| [@cropper/utils](https://github.com/fengyuanchen/cropperjs) | 2.2.0 | MIT |
| [@cspotcode/source-map-support](https://github.com/cspotcode/node-source-map-support) | 0.8.1 | MIT |
| [@esbuild/win32-x64](https://github.com/evanw/esbuild) | 0.27.7 | MIT |
| [@esbuild/win32-x64](https://github.com/evanw/esbuild) | 0.28.1 | MIT |
| [@img/colour](https://github.com/lovell/colour) | 1.1.0 | MIT |
| [@img/sharp-win32-x64](https://github.com/lovell/sharp) | 0.34.5 | Apache-2.0 AND LGPL-3.0-or-later |
| [@img/sharp-win32-x64](https://github.com/lovell/sharp) | 0.35.4 | Apache-2.0 AND LGPL-3.0-or-later |
| [@jridgewell/resolve-uri](https://github.com/jridgewell/resolve-uri) | 3.1.2 | MIT |
| [@jridgewell/sourcemap-codec](https://github.com/jridgewell/sourcemaps) | 1.6.0 | MIT |
| [@jridgewell/trace-mapping](https://github.com/jridgewell/trace-mapping) | 0.3.9 | MIT |
| [@oslojs/encoding](https://github.com/oslo-project/encoding) | 1.1.0 | MIT |
| [@poppinss/colors](https://github.com/poppinss/colors) | 4.1.6 | MIT |
| [@poppinss/dumper](https://github.com/poppinss/dumper) | 0.6.5 | MIT |
| [@poppinss/exception](https://github.com/poppinss/exception) | 1.2.3 | MIT |
| [@rollup/pluginutils](https://github.com/rollup/plugins) | 5.4.0 | MIT |
| [@rollup/rollup-win32-x64-gnu](https://github.com/rollup/rollup) | 4.63.6 | MIT |
| [@rollup/rollup-win32-x64-msvc](https://github.com/rollup/rollup) | 4.63.6 | MIT |
| [@shikijs/core](https://github.com/shikijs/shiki) | 4.5.0 | MIT |
| [@shikijs/engine-javascript](https://github.com/shikijs/shiki) | 4.5.0 | MIT |
| [@shikijs/engine-oniguruma](https://github.com/shikijs/shiki) | 4.5.0 | MIT |
| [@shikijs/langs](https://github.com/shikijs/shiki) | 4.5.0 | MIT |
| [@shikijs/primitive](https://github.com/shikijs/shiki) | 4.5.0 | MIT |
| [@shikijs/themes](https://github.com/shikijs/shiki) | 4.5.0 | MIT |
| [@shikijs/types](https://github.com/shikijs/shiki) | 4.5.0 | MIT |
| [@shikijs/vscode-textmate](https://github.com/shikijs/vscode-textmate) | 10.0.2 | MIT |
| [@sindresorhus/is](https://github.com/sindresorhus/is) | 7.2.0 | MIT |
| [@speed-highlight/core](https://github.com/speed-highlight/core) | 1.2.24 | CC0-1.0 |
| [@types/debug](https://github.com/DefinitelyTyped/DefinitelyTyped) | 4.1.13 | MIT |
| [@types/estree](https://github.com/DefinitelyTyped/DefinitelyTyped) | 1.0.9 | MIT |
| [@types/hast](https://github.com/DefinitelyTyped/DefinitelyTyped) | 3.0.5 | MIT |
| [@types/mdast](https://github.com/DefinitelyTyped/DefinitelyTyped) | 4.0.4 | MIT |
| [@types/ms](https://github.com/DefinitelyTyped/DefinitelyTyped) | 2.1.0 | MIT |
| [@types/nlcst](https://github.com/DefinitelyTyped/DefinitelyTyped) | 2.0.3 | MIT |
| [@types/unist](https://github.com/DefinitelyTyped/DefinitelyTyped) | 3.0.3 | MIT |
| [@ungap/structured-clone](https://github.com/ungap/structured-clone) | 1.4.0 | ISC |
| [anymatch](https://github.com/micromatch/anymatch) | 3.1.3 | ISC |
| [argparse](https://github.com/nodeca/argparse) | 2.0.1 | Python-2.0 |
| [aria-query](https://github.com/A11yance/aria-query) | 5.3.2 | Apache-2.0 |
| [array-iterate](https://github.com/wooorm/array-iterate) | 2.0.1 | MIT |
| [astro](https://github.com/withastro/astro) | 6.4.8 | MIT |
| [axobject-query](https://github.com/A11yance/axobject-query) | 4.1.0 | Apache-2.0 |
| [bail](https://github.com/wooorm/bail) | 2.0.2 | MIT |
| [blake3-wasm](https://github.com/connor4312/blake3) | 2.1.5 | MIT |
| [boolbase](https://github.com/fb55/boolbase) | 1.0.0 | ISC |
| [ccount](https://github.com/wooorm/ccount) | 2.0.1 | MIT |
| [character-entities](https://github.com/wooorm/character-entities) | 2.0.2 | MIT |
| [character-entities-html4](https://github.com/wooorm/character-entities-html4) | 2.1.0 | MIT |
| [character-entities-legacy](https://github.com/wooorm/character-entities-legacy) | 3.0.0 | MIT |
| [chokidar](https://github.com/paulmillr/chokidar) | 5.0.0 | MIT |
| [ci-info](https://github.com/watson/ci-info) | 4.4.0 | MIT |
| [clsx](https://github.com/lukeed/clsx) | 2.1.1 | MIT |
| [comma-separated-tokens](https://github.com/wooorm/comma-separated-tokens) | 2.0.3 | MIT |
| [commander](https://github.com/tj/commander.js) | 11.1.0 | MIT |
| [common-ancestor-path](https://github.com/isaacs/common-ancestor-path) | 2.0.0 | BlueOak-1.0.0 |
| [cookie](https://github.com/jshttp/cookie) | 1.1.1 | MIT |
| [cookie-es](https://github.com/unjs/cookie-es) | 1.2.3 | MIT |
| [cropperjs](https://github.com/fengyuanchen/cropperjs) | 2.2.0 | MIT |
| [crossws](https://github.com/h3js/crossws) | 0.3.5 | MIT |
| [css-select](https://github.com/fb55/css-select) | 6.0.0 | BSD-2-Clause |
| [css-tree](https://github.com/csstree/csstree) | 2.2.1 | MIT |
| [css-tree](https://github.com/csstree/csstree) | 3.2.1 | MIT |
| [css-what](https://github.com/fb55/css-what) | 7.0.0 | BSD-2-Clause |
| [csso](https://github.com/css/csso) | 5.0.5 | MIT |
| [debug](https://github.com/debug-js/debug) | 4.4.3 | MIT |
| [decode-named-character-reference](https://github.com/wooorm/decode-named-character-reference) | 1.3.0 | MIT |
| [defu](https://github.com/unjs/defu) | 6.1.7 | MIT |
| [dequal](https://github.com/lukeed/dequal) | 2.0.3 | MIT |
| [destr](https://github.com/unjs/destr) | 2.0.5 | MIT |
| [detect-libc](https://github.com/lovell/detect-libc) | 2.1.2 | Apache-2.0 |
| [devalue](https://github.com/sveltejs/devalue) | 5.9.4 | MIT |
| [devlop](https://github.com/wooorm/devlop) | 1.1.0 | MIT |
| [diff](https://github.com/kpdecker/jsdiff) | 8.0.4 | BSD-3-Clause |
| [dom-serializer](https://github.com/cheeriojs/dom-serializer) | 2.0.0 | MIT |
| [domelementtype](https://github.com/fb55/domelementtype) | 2.3.0 | BSD-2-Clause |
| [domhandler](https://github.com/fb55/domhandler) | 5.0.3 | BSD-2-Clause |
| [domutils](https://github.com/fb55/domutils) | 3.2.2 | BSD-2-Clause |
| [dset](https://github.com/lukeed/dset) | 3.1.4 | MIT |
| [entities](https://github.com/fb55/entities) | 4.5.0 | BSD-2-Clause |
| [entities](https://github.com/fb55/entities) | 6.0.1 | BSD-2-Clause |
| [error-stack-parser-es](https://github.com/antfu/error-stack-parser-es) | 1.0.5 | MIT |
| [es-module-lexer](https://github.com/guybedford/es-module-lexer) | 2.3.2 | MIT |
| [esbuild](https://github.com/evanw/esbuild) | 0.27.7 | MIT |
| [esbuild](https://github.com/evanw/esbuild) | 0.28.1 | MIT |
| [escape-string-regexp](https://github.com/sindresorhus/escape-string-regexp) | 5.0.0 | MIT |
| [estree-walker](https://github.com/Rich-Harris/estree-walker) | 2.0.2 | MIT |
| [eventemitter3](https://github.com/primus/eventemitter3) | 5.0.4 | MIT |
| [extend](https://github.com/justmoon/node-extend) | 3.0.2 | MIT |
| [fast-string-truncated-width](https://github.com/fabiospampinato/fast-string-truncated-width) | 3.0.3 | MIT |
| [fast-string-width](https://github.com/fabiospampinato/fast-string-width) | 3.0.2 | MIT |
| [fast-wrap-ansi](https://github.com/43081j/fast-wrap-ansi) | 0.2.2 | MIT |
| [fdir](https://github.com/thecodrr/fdir) | 6.5.0 | MIT |
| [flattie](https://github.com/lukeed/flattie) | 1.1.1 | MIT |
| [fontace](https://github.com/delucis/fontace) | 0.4.1 | MIT |
| [fontkitten](https://github.com/delucis/fontkitten) | 1.0.3 | MIT |
| [get-tsconfig](https://github.com/privatenumber/get-tsconfig) | 5.0.0-beta.4 | MIT |
| [github-slugger](https://github.com/Flet/github-slugger) | 2.0.0 | ISC |
| [glur](https://github.com/nodeca/glur) | 2.0.0 | MIT |
| [h3](https://github.com/h3js/h3) | 1.15.11 | MIT |
| [hast-util-from-html](https://github.com/syntax-tree/hast-util-from-html) | 2.0.3 | MIT |
| [hast-util-from-parse5](https://github.com/syntax-tree/hast-util-from-parse5) | 8.0.3 | MIT |
| [hast-util-is-element](https://github.com/syntax-tree/hast-util-is-element) | 3.0.0 | MIT |
| [hast-util-parse-selector](https://github.com/syntax-tree/hast-util-parse-selector) | 4.0.0 | MIT |
| [hast-util-raw](https://github.com/syntax-tree/hast-util-raw) | 9.1.0 | MIT |
| [hast-util-to-html](https://github.com/syntax-tree/hast-util-to-html) | 9.0.5 | MIT |
| [hast-util-to-parse5](https://github.com/syntax-tree/hast-util-to-parse5) | 8.0.1 | MIT |
| [hast-util-to-text](https://github.com/syntax-tree/hast-util-to-text) | 4.0.2 | MIT |
| [hast-util-whitespace](https://github.com/syntax-tree/hast-util-whitespace) | 3.0.0 | MIT |
| [hastscript](https://github.com/syntax-tree/hastscript) | 9.0.1 | MIT |
| [html-escaper](https://github.com/WebReflection/html-escaper) | 3.0.3 | MIT |
| [html-void-elements](https://github.com/wooorm/html-void-elements) | 3.0.0 | MIT |
| [http-cache-semantics](https://github.com/kornelski/http-cache-semantics) | 4.2.0 | BSD-2-Clause |
| [iron-webcrypto](https://github.com/brc-dd/iron-webcrypto) | 1.2.1 | MIT |
| [is-docker](https://github.com/sindresorhus/is-docker) | 3.0.0 | MIT |
| [is-docker](https://github.com/sindresorhus/is-docker) | 4.0.0 | MIT |
| [is-inside-container](https://github.com/sindresorhus/is-inside-container) | 1.0.0 | MIT |
| [is-plain-obj](https://github.com/sindresorhus/is-plain-obj) | 4.1.0 | MIT |
| [is-wsl](https://github.com/sindresorhus/is-wsl) | 3.1.1 | MIT |
| [js-yaml](https://github.com/nodeca/js-yaml) | 4.3.2 | MIT |
| [jsonc-parser](https://github.com/microsoft/node-jsonc-parser) | 3.3.1 | MIT |
| [kleur](https://github.com/lukeed/kleur) | 4.1.5 | MIT |
| [longest-streak](https://github.com/wooorm/longest-streak) | 3.1.0 | MIT |
| [lru-cache](https://github.com/isaacs/node-lru-cache) | 11.5.3 | BlueOak-1.0.0 |
| [magic-string](https://github.com/Rich-Harris/magic-string) | 0.30.21 | MIT |
| [magic-wand-tool](https://github.com/Tamersoul/magic-wand-js) | 1.1.7 | MIT |
| [magicast](https://github.com/unjs/magicast) | 0.5.5 | MIT |
| [markdown-table](https://github.com/wooorm/markdown-table) | 3.0.4 | MIT |
| [mdast-util-definitions](https://github.com/syntax-tree/mdast-util-definitions) | 6.0.0 | MIT |
| [mdast-util-find-and-replace](https://github.com/syntax-tree/mdast-util-find-and-replace) | 3.0.2 | MIT |
| [mdast-util-from-markdown](https://github.com/syntax-tree/mdast-util-from-markdown) | 2.0.3 | MIT |
| [mdast-util-gfm](https://github.com/syntax-tree/mdast-util-gfm) | 3.1.0 | MIT |
| [mdast-util-gfm-autolink-literal](https://github.com/syntax-tree/mdast-util-gfm-autolink-literal) | 2.0.1 | MIT |
| [mdast-util-gfm-footnote](https://github.com/syntax-tree/mdast-util-gfm-footnote) | 2.1.0 | MIT |
| [mdast-util-gfm-strikethrough](https://github.com/syntax-tree/mdast-util-gfm-strikethrough) | 2.0.1 | MIT |
| [mdast-util-gfm-table](https://github.com/syntax-tree/mdast-util-gfm-table) | 2.0.0 | MIT |
| [mdast-util-gfm-task-list-item](https://github.com/syntax-tree/mdast-util-gfm-task-list-item) | 2.0.0 | MIT |
| [mdast-util-phrasing](https://github.com/syntax-tree/mdast-util-phrasing) | 4.1.0 | MIT |
| [mdast-util-to-hast](https://github.com/syntax-tree/mdast-util-to-hast) | 13.2.1 | MIT |
| [mdast-util-to-markdown](https://github.com/syntax-tree/mdast-util-to-markdown) | 2.1.3 | MIT |
| [mdast-util-to-string](https://github.com/syntax-tree/mdast-util-to-string) | 4.0.0 | MIT |
| [mdn-data](https://github.com/mdn/data) | 2.0.28 | CC0-1.0 |
| [mdn-data](https://github.com/mdn/data) | 2.27.1 | CC0-1.0 |
| [micromark](https://github.com/micromark/micromark/tree/main/packages/micromark) | 4.0.3 | MIT |
| [micromark-core-commonmark](https://github.com/micromark/micromark/tree/main/packages/micromark-core-commonmark) | 2.0.4 | MIT |
| [micromark-extension-gfm](https://github.com/micromark/micromark-extension-gfm) | 3.0.0 | MIT |
| [micromark-extension-gfm-autolink-literal](https://github.com/micromark/micromark-extension-gfm-autolink-literal) | 2.1.0 | MIT |
| [micromark-extension-gfm-footnote](https://github.com/micromark/micromark-extension-gfm-footnote) | 2.1.0 | MIT |
| [micromark-extension-gfm-strikethrough](https://github.com/micromark/micromark-extension-gfm-strikethrough) | 2.1.0 | MIT |
| [micromark-extension-gfm-table](https://github.com/micromark/micromark-extension-gfm-table) | 2.1.2 | MIT |
| [micromark-extension-gfm-tagfilter](https://github.com/micromark/micromark-extension-gfm-tagfilter) | 2.0.0 | MIT |
| [micromark-extension-gfm-task-list-item](https://github.com/micromark/micromark-extension-gfm-task-list-item) | 2.1.0 | MIT |
| [micromark-factory-destination](https://github.com/micromark/micromark/tree/main/packages/micromark-factory-destination) | 2.0.1 | MIT |
| [micromark-factory-label](https://github.com/micromark/micromark/tree/main/packages/micromark-factory-label) | 2.0.1 | MIT |
| [micromark-factory-space](https://github.com/micromark/micromark/tree/main/packages/micromark-factory-space) | 2.1.0 | MIT |
| [micromark-factory-title](https://github.com/micromark/micromark/tree/main/packages/micromark-factory-title) | 2.0.1 | MIT |
| [micromark-factory-whitespace](https://github.com/micromark/micromark/tree/main/packages/micromark-factory-whitespace) | 2.0.1 | MIT |
| [micromark-util-character](https://github.com/micromark/micromark/tree/main/packages/micromark-util-character) | 2.1.1 | MIT |
| [micromark-util-chunked](https://github.com/micromark/micromark/tree/main/packages/micromark-util-chunked) | 2.0.1 | MIT |
| [micromark-util-classify-character](https://github.com/micromark/micromark/tree/main/packages/micromark-util-classify-character) | 2.0.1 | MIT |
| [micromark-util-combine-extensions](https://github.com/micromark/micromark/tree/main/packages/micromark-util-combine-extensions) | 2.0.1 | MIT |
| [micromark-util-decode-numeric-character-reference](https://github.com/micromark/micromark/tree/main/packages/micromark-util-decode-numeric-character-reference) | 2.0.2 | MIT |
| [micromark-util-decode-string](https://github.com/micromark/micromark/tree/main/packages/micromark-util-decode-string) | 2.0.1 | MIT |
| [micromark-util-edit-map](https://github.com/micromark/micromark/tree/main/packages/micromark-util-edit-map) | 1.0.0 | MIT |
| [micromark-util-encode](https://github.com/micromark/micromark/tree/main/packages/micromark-util-encode) | 2.0.1 | MIT |
| [micromark-util-html-tag-name](https://github.com/micromark/micromark/tree/main/packages/micromark-util-html-tag-name) | 2.0.1 | MIT |
| [micromark-util-normalize-identifier](https://github.com/micromark/micromark/tree/main/packages/micromark-util-normalize-identifier) | 2.0.1 | MIT |
| [micromark-util-resolve-all](https://github.com/micromark/micromark/tree/main/packages/micromark-util-resolve-all) | 2.0.1 | MIT |
| [micromark-util-sanitize-uri](https://github.com/micromark/micromark/tree/main/packages/micromark-util-sanitize-uri) | 2.0.1 | MIT |
| [micromark-util-subtokenize](https://github.com/micromark/micromark/tree/main/packages/micromark-util-subtokenize) | 2.1.0 | MIT |
| [micromark-util-symbol](https://github.com/micromark/micromark/tree/main/packages/micromark-util-symbol) | 2.0.1 | MIT |
| [micromark-util-types](https://github.com/micromark/micromark/tree/main/packages/micromark-util-types) | 2.0.3 | MIT |
| [miniflare](https://github.com/cloudflare/workers-sdk) | 5.20261001.0-alpha | MIT |
| [mrmime](https://github.com/lukeed/mrmime) | 2.0.1 | MIT |
| [ms](https://github.com/vercel/ms) | 2.1.3 | MIT |
| [multimath](https://github.com/nodeca/multimath) | 3.0.0 | MIT |
| [nanoid](https://github.com/ai/nanoid) | 3.3.19 | MIT |
| [neotraverse](https://github.com/PuruVJ/neotraverse) | 0.6.18 | MIT |
| [nlcst-to-string](https://github.com/syntax-tree/nlcst-to-string) | 4.0.0 | MIT |
| [node-fetch-native](https://github.com/unjs/node-fetch-native) | 1.6.7 | MIT |
| [node-mock-http](https://github.com/unjs/node-mock-http) | 1.0.5 | MIT |
| [normalize-path](https://github.com/jonschlinkert/normalize-path) | 3.0.0 | MIT |
| [nth-check](https://github.com/fb55/nth-check) | 2.1.1 | BSD-2-Clause |
| [obug](https://github.com/sxzz/obug) | 2.2.1 | MIT |
| [ofetch](https://github.com/unjs/ofetch) | 1.5.1 | MIT |
| [ohash](https://github.com/unjs/ohash) | 2.0.12 | MIT |
| [oniguruma-parser](https://github.com/slevithan/oniguruma-parser) | 0.12.2 | MIT |
| [oniguruma-to-es](https://github.com/slevithan/oniguruma-to-es) | 4.3.6 | MIT |
| [p-limit](https://github.com/sindresorhus/p-limit) | 7.3.3 | MIT |
| [p-queue](https://github.com/sindresorhus/p-queue) | 9.3.3 | MIT |
| [p-timeout](https://github.com/sindresorhus/p-timeout) | 7.0.2 | MIT |
| [package-manager-detector](https://github.com/antfu-collective/package-manager-detector) | 1.8.0 | MIT |
| [page-flip](https://github.com/Nodlik/StPageFlip) | 2.0.7 | MIT |
| [parse-latin](https://github.com/wooorm/parse-latin) | 7.0.0 | MIT |
| [parse5](https://github.com/inikulin/parse5) | 7.3.0 | MIT |
| [path-to-regexp](https://github.com/pillarjs/path-to-regexp) | 6.3.0 | MIT |
| [pathe](https://github.com/unjs/pathe) | 2.0.3 | MIT |
| [pica](https://github.com/nodeca/pica) | 10.0.3 | MIT |
| [piccolore](https://github.com/delucis/piccolore) | 0.1.3 | ISC |
| [picocolors](https://github.com/alexeyraspopov/picocolors) | 1.1.1 | ISC |
| [picomatch](https://github.com/micromatch/picomatch) | 2.3.2 | MIT |
| [picomatch](https://github.com/micromatch/picomatch) | 4.0.7 | MIT |
| [postcss](https://github.com/postcss/postcss) | 8.5.28 | MIT |
| [prismjs](https://github.com/PrismJS/prism) | 1.30.0 | MIT |
| [property-information](https://github.com/wooorm/property-information) | 7.2.0 | MIT |
| [radix3](https://github.com/unjs/radix3) | 1.1.2 | MIT |
| [readdirp](https://github.com/paulmillr/readdirp) | 5.1.1 | MIT |
| [regex](https://github.com/slevithan/regex) | 6.1.0 | MIT |
| [regex-recursion](https://github.com/slevithan/regex-recursion) | 6.0.2 | MIT |
| [regex-utilities](https://github.com/slevithan/regex-utilities) | 2.3.0 | MIT |
| [rehype](https://github.com/rehypejs/rehype/tree/main/packages/rehype) | 13.0.2 | MIT |
| [rehype-parse](https://github.com/rehypejs/rehype/tree/main/packages/rehype-parse) | 9.0.1 | MIT |
| [rehype-raw](https://github.com/rehypejs/rehype-raw) | 7.0.0 | MIT |
| [rehype-stringify](https://github.com/rehypejs/rehype/tree/main/packages/rehype-stringify) | 10.0.1 | MIT |
| [remark-gfm](https://github.com/remarkjs/remark-gfm) | 4.0.1 | MIT |
| [remark-parse](https://github.com/remarkjs/remark/tree/main/packages/remark-parse) | 11.0.0 | MIT |
| [remark-rehype](https://github.com/remarkjs/remark-rehype) | 11.1.2 | MIT |
| [remark-smartypants](https://github.com/silvenon/remark-smartypants) | 3.0.3 | MIT |
| [remark-stringify](https://github.com/remarkjs/remark/tree/main/packages/remark-stringify) | 11.0.0 | MIT |
| [resolve-pkg-maps](https://github.com/privatenumber/resolve-pkg-maps) | 1.0.0 | MIT |
| [retext](https://github.com/retextjs/retext/tree/main/packages/retext) | 9.0.0 | MIT |
| [retext-latin](https://github.com/retextjs/retext/tree/main/packages/retext-latin) | 4.0.0 | MIT |
| [retext-smartypants](https://github.com/retextjs/retext-smartypants) | 6.2.0 | MIT |
| [retext-stringify](https://github.com/retextjs/retext/tree/main/packages/retext-stringify) | 4.0.0 | MIT |
| [rollup](https://github.com/rollup/rollup) | 4.63.6 | MIT |
| [sax](https://github.com/isaacs/sax-js) | 1.6.1 | BlueOak-1.0.0 |
| [semver](https://github.com/npm/node-semver) | 7.8.5 | ISC |
| [sharp](https://github.com/lovell/sharp) | 0.34.5 | Apache-2.0 |
| [sharp](https://github.com/lovell/sharp) | 0.35.4 | Apache-2.0 |
| [shiki](https://github.com/shikijs/shiki) | 4.5.0 | MIT |
| [sisteransi](https://github.com/terkelg/sisteransi) | 1.0.5 | MIT |
| [smol-toml](https://github.com/squirrelchat/smol-toml) | 1.9.0 | BSD-3-Clause |
| [source-map-js](https://github.com/7rulnik/source-map-js) | 1.2.2 | BSD-3-Clause |
| [space-separated-tokens](https://github.com/wooorm/space-separated-tokens) | 2.0.2 | MIT |
| [stringify-entities](https://github.com/wooorm/stringify-entities) | 4.0.4 | MIT |
| [supports-color](https://github.com/chalk/supports-color) | 10.2.2 | MIT |
| [svgo](https://github.com/svg/svgo) | 4.1.0 | MIT |
| [tiny-inflate](https://github.com/devongovett/tiny-inflate) | 1.0.3 | MIT |
| [tinyclip](https://github.com/tinylibs/tinyclip) | 0.1.15 | MIT |
| [tinyexec](https://github.com/tinylibs/tinyexec) | 1.3.1 | MIT |
| [tinyglobby](https://github.com/SuperchupuDev/tinyglobby) | 0.2.17 | MIT |
| [trim-lines](https://github.com/wooorm/trim-lines) | 3.0.1 | MIT |
| [trough](https://github.com/wooorm/trough) | 2.2.0 | MIT |
| [ufo](https://github.com/unjs/ufo) | 1.6.4 | MIT |
| [ultrahtml](https://github.com/natemoo-re/ultrahtml) | 1.7.0 | MIT |
| [uncrypto](https://github.com/unjs/uncrypto) | 0.1.3 | MIT |
| [undici](https://github.com/nodejs/undici) | 7.29.1 | MIT |
| [undici](https://github.com/nodejs/undici) | 8.11.2 | MIT |
| [unenv](https://github.com/unjs/unenv) | 2.0.0-rc.24 | MIT |
| [unified](https://github.com/unifiedjs/unified) | 11.0.5 | MIT |
| [unifont](https://github.com/unjs/unifont) | 0.7.5 | MIT |
| [unist-util-find-after](https://github.com/syntax-tree/unist-util-find-after) | 5.0.0 | MIT |
| [unist-util-is](https://github.com/syntax-tree/unist-util-is) | 6.0.1 | MIT |
| [unist-util-modify-children](https://github.com/syntax-tree/unist-util-modify-children) | 4.0.0 | MIT |
| [unist-util-position](https://github.com/syntax-tree/unist-util-position) | 5.0.0 | MIT |
| [unist-util-remove-position](https://github.com/syntax-tree/unist-util-remove-position) | 5.0.0 | MIT |
| [unist-util-stringify-position](https://github.com/syntax-tree/unist-util-stringify-position) | 4.0.0 | MIT |
| [unist-util-visit](https://github.com/syntax-tree/unist-util-visit) | 5.1.0 | MIT |
| [unist-util-visit-children](https://github.com/syntax-tree/unist-util-visit-children) | 3.0.0 | MIT |
| [unist-util-visit-parents](https://github.com/syntax-tree/unist-util-visit-parents) | 6.0.2 | MIT |
| [unstorage](https://github.com/unjs/unstorage) | 1.17.5 | MIT |
| [vfile](https://github.com/vfile/vfile) | 6.0.3 | MIT |
| [vfile-location](https://github.com/vfile/vfile-location) | 5.0.3 | MIT |
| [vfile-message](https://github.com/vfile/vfile-message) | 4.0.3 | MIT |
| [vite](https://github.com/vitejs/vite) | 7.3.6 | MIT |
| [vitefu](https://github.com/svitejs/vitefu) | 1.1.3 | MIT |
| [web-namespaces](https://github.com/wooorm/web-namespaces) | 2.0.1 | MIT |
| [which-pm-runs](https://github.com/zkochan/packages/tree/main/which-pm-runs) | 1.1.0 | MIT |
| [workerd](https://github.com/cloudflare/workerd) | 1.20261001.1 | Apache-2.0 |
| [wrangler](https://github.com/cloudflare/workers-sdk) | 4.146.0 | MIT OR Apache-2.0 |
| [ws](https://github.com/websockets/ws) | 8.21.0 | MIT |
| [xxhash-wasm](https://github.com/jungomi/xxhash-wasm) | 1.1.0 | MIT |
| [yargs-parser](https://github.com/yargs/yargs-parser) | 22.0.0 | ISC |
| [yocto-queue](https://github.com/sindresorhus/yocto-queue) | 1.2.2 | MIT |
| [youch](https://github.com/poppinss/youch) | 4.1.0-beta.10 | MIT |
| [youch-core](https://github.com/poppinss/youch-core) | 0.3.3 | MIT |
| [zod](https://github.com/colinhacks/zod) | 4.6.5 | MIT |
| [zwitch](https://github.com/wooorm/zwitch) | 2.0.4 | MIT |

</details>

`shared/about.json` is the content source for both screens. After changing history, credits or dependencies, run `node scripts/sync-about.mjs`; `node scripts/sync-about.mjs --check` and the automated suite detect README drift. Setup refreshes the inventory from installed dependencies.

<!-- folio-about:end -->
