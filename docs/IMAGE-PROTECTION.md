# Artwork viewing and copy deterrents

Folio Studio's current download setting removes full-size artwork links, excludes 5,000 px web copies from new builds and discourages image dragging and right-click saving. It does not stop network retrieval or screenshots. Original uploads remain local.

## How preview-and-viewer galleries work

A gallery can load a small, compressed preview, then load a larger display copy only when the visitor opens a viewer. A viewer can hide download controls, cancel image context menus or draw through canvas. These change the interaction, not ownership of pixels delivered to the browser. [PhotoSwipe](https://photoswipe.com/) documents loading larger images as visitors zoom; it is an MIT-licensed lightbox, not a copy-protection system.

Another approach divides the artwork into a pyramid of small image tiles. The zoom viewer requests only the tiles needed for the current viewport and zoom level. This avoids providing one convenient full-resolution image file, but public tiles can be collected and stitched together. Screenshots remain possible. [OpenSeadragon's zoom image documentation](https://openseadragon.github.io/examples/creating-zooming-images/) explains this format. OpenSeadragon uses a [BSD-3-Clause license](https://github.com/openseadragon/openseadragon/blob/master/LICENSE.txt), rather than MIT.

Cross-origin images without CORS approval can taint a canvas, blocking JavaScript `toDataURL`, `toBlob` and pixel reads. That is a browser privacy boundary, not screenshot protection, and does not make the underlying image requests inaccessible. Do not depend on this trick for artwork security. [MDN canvas security explanation](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image).

## Options for this builder

| Option | Visitor experience | Protection and tradeoff |
| --- | --- | --- |
| Compressed preview + PhotoSwipe lightbox | Fast grid; tap to expand, swipe and zoom | Simple static Astro export and MIT library. Display copy remains downloadable through browser tools. |
| Compressed preview + OpenSeadragon tiled viewer | Smooth inspection of brushwork, paper and sketch details | No single full-resolution file needs to be published. More generated files, requests and build work; tiles can still be reconstructed. BSD license. |
| Watermarked display copies | Any viewer; optional artist name/logo baked into pixels | Watermark also appears in screenshots of those copies. May affect artwork presentation and can sometimes be removed. A removable HTML overlay is weaker. |
| Private high-resolution delivery | Public previews; expanded access gated by server rules or login | Keeps originals out of public static hosting. Needs a Worker/backend and private storage or Cloudflare Images. Authorized visitors can still save what they receive. |

Cloudflare Images supports expiring signed URLs, generated on a backend so the signing key stays secret. Signing restricts access and URL lifetime; it does not stop saving during authorized access. A public endpoint that issues a signed URL to every visitor does not meaningfully restrict who can view it. See [Cloudflare private images](https://developers.cloudflare.com/images/optimization/hosted-images/serve-private-images/). Cloudflare Images is a separate service with its own setup and billing, beyond the existing Pages publishing integration.

## Recommended direction

For a public artist portfolio, use responsive compressed previews, a lazy-loaded expanded viewer, a configurable maximum display resolution, and optional watermarks baked into every published image size. Keep unwatermarked originals local. Use tiled zoom for selected artworks that benefit from close inspection; do not generate thousands of tiles for every image by default.

For private collectors or client proofs, add authenticated high-resolution delivery separately. Neither design can reliably block operating-system screenshots or photographing the screen.

These viewer, watermark and private-delivery options are proposals. The current implemented setting is the basic download deterrent described above.
