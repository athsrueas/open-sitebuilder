# Paper and ink materials

Open **Styles → Site defaults → Paper & ink**, or a block's **Styles → Paper & ink** on the canvas. Block settings inherit site defaults; check an override to change it, then uncheck to inherit again. Effects are off until selected. Theme presets reset site materials to their defaults and retain block overrides.

Available materials:

- Cotton/drawing paper: fine grain and deterministic fibers.
- Watercolor/cold press: broader surface relief with fine fibers.
- Laid paper: parallel paper-making lines over fine grain.
- Canvas: a fine woven surface.
- Moving paper light: a slow directional light wash.
- Heading ink: clean type, letterpress impression, dry ink, or soft bleed.
- Background pigment: a still wash, an expanding/contracting bloom, or drifting ink.

Adjust grain size, texture strength, pigment color/strength and animation duration. Ink wash strength is limited to 0–50%; motion duration is 6–90 seconds. Numeric controls enforce their displayed ranges. Sketchbook pages retain their own paper color and inherit the surface texture. Opaque artwork covers the texture; transparent images show the surface behind them. Filters are restricted to headings and block quotations. The editor's controls are unaffected.

These are procedural visual approximations, not a physical simulation of paper bending, wet pigment transport, or capillary absorption. StPageFlip provides the existing page-turn animation. Ink bloom uses a seeded turbulent pigment mask and slow transforms. Paper uses stitched SVG noise, diffuse lighting, fibers and weave patterns; no downloaded texture photographs or licensed artwork are bundled.

Preview and Astro export share the same material renderer. All material assets are embedded locally. Native SVG/CSS avoids additional library dependencies. Reduced-motion preferences and print rendering disable motion; viewport observers and document visibility pause animation when it cannot be seen. Static textures remain available without JavaScript.

## Research

- [W3C Filter Effects](https://www.w3.org/TR/filter-effects-1/): turbulence, diffuse lighting, displacement and compositing primitives used for procedural materials.
- [filtered.ink, CHI 2023](https://doi.org/10.1145/3544548.3581051): research into combining SVG filters for dynamic illustrations, including paper surfaces and ink effects. This implementation uses original code and patterns, not copied paper assets.
- [PavelDoGreat WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation): mature MIT-licensed GPU fluid simulation and a candidate for a future interactive ink canvas. It is not bundled here. A fluid solver alone does not model absorption into paper, and needs additional work for containment, device compatibility, accessibility and GPU resource cleanup.
- [NVIDIA GPU Gems: Fast Fluid Dynamics Simulation on the GPU](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu): the fluid approach referenced by the WebGL project.

Implementation: `shared/materials.js`; settings and validation: `shared/styles.json`. Neither generated sites nor the editor require a material service or internet connection.
