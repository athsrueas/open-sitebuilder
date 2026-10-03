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
- Add introductions, text, images, galleries, horizontally scrolling carousels, sketchbooks, and dividers. Click a tile under **Add a block**, or drag it into the live preview and drop at the green insertion line. Drag existing blocks by their dotted handles to reorder them in the list or preview. Blocks can be duplicated and deleted.
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
