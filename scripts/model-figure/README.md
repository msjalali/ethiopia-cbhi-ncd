# Model overview figure ("About the Model" step-through)

The "🔍 See what's behind the scenes" modal on the dashboard shows the model structure
as a series of build-up steps (right-to-left in the original figure = simplest-to-most-
complete in the app), with the shared elements staying in the same place as new pieces
are added.

## How it works

1. `source/CBHI.svg` is the source figure exported from the diagramming tool (Lucidchart),
   containing several side-by-side panels: the **leftmost** panel is the most complete
   (final) diagram, and each panel to its right is an earlier, simpler stage.
2. `build-model-figure-steps.ps1` parses that SVG, detects the panels, and writes:
   - `packages/app/src/assets/model-figure/step-1.svg` ... `step-N.svg` (one per step,
     step 1 = simplest/rightmost panel)
   - `defs.svg` (the shared glyph/shape definitions, written once instead of duplicated
     per step, to keep the app bundle small)
   - `manifest.json` (canvas size + step list)
3. The Svelte component (`packages/app/src/components/model-overview/model-overview-modal.svelte`)
   loads all of these via a glob import, so it automatically adapts to however many
   steps the script produces.
4. Caption text per step lives in `config/model-figure-captions.csv` (edit this directly
   to change the wording — no code changes needed).

## Updating the figure in the future

1. Export the updated figure from the diagramming tool as SVG, with the same
   left-to-right "most complete → simplest" panel layout, and replace
   `scripts/model-figure/source/CBHI.svg` with it (or point `-SourceSvg` at a new file).
2. Re-run the build script from the repo root:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "scripts\model-figure\build-model-figure-steps.ps1" -SourceSvg "scripts\model-figure\source\CBHI.svg" -OutDir "packages\app\src\assets\model-figure"
   ```

3. Check the console output — it prints how many panels it detected and how many
   elements are in each. If the panel count changed, update
   `config/model-figure-captions.csv` to match (one row per step; `step` numbers must
   be consecutive starting at 1).
4. If a detected panel isn't worth its own step (e.g. a near-duplicate), drop it with
   `-ExcludeSteps <N>` (can pass multiple), where `N` is its 1-indexed position in the
   detected (not yet excluded) step order. Remaining steps are renumbered automatically.
5. Open the dashboard locally (`npm run dev`), click "See what's behind the scenes",
   and click through Next/Back to confirm the steps look right and shared elements
   don't visibly jump between steps.

## Parameters

- `-GapThreshold` (default 150): horizontal gap (in source SVG units) used to detect
  where one panel ends and the next begins. Increase this if panels are being split
  incorrectly at gaps *within* a panel; decrease it if two actual panels are being
  merged into one.
- `-Padding` (default 150): margin added around the final panel's content to size the
  shared output canvas. Increase if content looks clipped near the edges.
