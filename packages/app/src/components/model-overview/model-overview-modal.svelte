<!-- SCRIPT -->
<script lang="ts">
import manifest from '../../assets/model-figure/manifest.json'
import defsSvgRaw from '../../assets/model-figure/defs.svg?raw'
import captionsCsvRaw from '../../../../../config/model-figure-captions.csv?raw'

// The shared glyph <defs> block is stored once (defs.svg) rather than duplicated in
// every step file. Extract just its inner content so it can be rendered once, and
// <use> references in each step SVG resolve against it (SVG <use> resolves ids
// anywhere in the same document, not just within its own <svg> element).
const sharedDefsInner = defsSvgRaw.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

export let open = false

// Load every generated step SVG (raw markup) and index by step number. Using a glob
// means this automatically picks up however many steps the build script produced, so
// re-running scripts/model-figure/build-model-figure-steps.ps1 with an updated source
// figure (more or fewer steps) doesn't require any code changes here.
const stepModules = import.meta.glob('../../assets/model-figure/step-*.svg', {
  eager: true,
  query: '?raw',
  import: 'default'
}) as Record<string, string>

function parseCaptions(csv: string): Record<number, string> {
  const [headerLine, ...rows] = csv.trim().split(/\r?\n/)
  const headers = headerLine.split(',')
  const stepIdx = headers.indexOf('step')
  const captionIdx = headers.indexOf('caption')
  const map: Record<number, string> = {}
  for (const row of rows) {
    // Caption text is quoted (may contain commas), so split respecting quotes.
    const cols = row.match(/(".*?"|[^,]+)(?=,|$)/g)?.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"')) ?? []
    const step = Number(cols[stepIdx])
    if (!Number.isNaN(step)) {
      map[step] = cols[captionIdx] ?? ''
    }
  }
  return map
}

const captions = parseCaptions(captionsCsvRaw)

const steps = Object.entries(stepModules)
  .map(([path, svg]) => {
    const match = path.match(/step-(\d+)\.svg$/)
    return { step: Number(match?.[1] ?? 0), svg }
  })
  .filter(s => s.step > 0)
  .sort((a, b) => a.step - b.step)

const viewBoxWidth: number = manifest.viewBoxWidth
const viewBoxHeight: number = manifest.viewBoxHeight

// currentIndex of -1 represents the introduction screen, shown before the first
// build-up step.
const INTRO = -1
let currentIndex = INTRO

$: showingIntro = currentIndex === INTRO
$: currentStep = showingIntro ? undefined : steps[currentIndex]
$: caption = currentStep ? (captions[currentStep.step] ?? '') : ''
$: isFirst = showingIntro
$: isLast = currentIndex === steps.length - 1

function next() {
  if (!isLast) currentIndex += 1
}
function back() {
  if (!isFirst) currentIndex -= 1
}
function close() {
  open = false
  currentIndex = INTRO
}
function onKeydown(e: KeyboardEvent) {
  if (!open) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowRight') next()
  else if (e.key === 'ArrowLeft') back()
}
</script>

<svelte:window on:keydown={onKeydown} />

<!-- TEMPLATE -->
{#if open}
  <div class="backdrop" on:click={close} on:keydown={() => {}} role="presentation">
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-label="Model overview"
      on:click|stopPropagation
      on:keydown={() => {}}
    >
      <div class="modal-header">
        <div class="modal-title">About the Model</div>
        <button type="button" class="close-button" aria-label="Close" on:click={close}>&times;</button>
      </div>

      {#if showingIntro}
        <div class="intro">
          <p>
            This dashboard is built on a <strong>system dynamics model</strong> developed in collaboration with
            local researchers in the Amhara region of Ethiopia. It captures how community-based health insurance
            (CBHI), health facility financing, and screening interact over time to shape hypertension and diabetes
            treatment outcomes.
          </p>
          <p>Click <strong>Next</strong> to see how the model&rsquo;s structure is built up, piece by piece.</p>
        </div>
      {:else}
        <div class="figure-stage" style="aspect-ratio: {viewBoxWidth} / {viewBoxHeight}">
          <svg class="shared-defs" aria-hidden="true">{@html sharedDefsInner}</svg>
          {#each steps as s (s.step)}
            <div class="figure-layer" class:visible={s.step === currentStep?.step}>
              {@html s.svg}
            </div>
          {/each}
        </div>

        <div class="caption">{caption}</div>
      {/if}

      <div class="modal-footer">
        <button type="button" class="nav-button" on:click={back} disabled={isFirst}>Back</button>
        <div class="step-indicator">
          {showingIntro ? 'Introduction' : `Step ${currentIndex + 1} of ${steps.length}`}
        </div>
        <button type="button" class="nav-button" on:click={next} disabled={isLast}>Next</button>
      </div>
    </div>
  </div>
{/if}

<!-- STYLE -->
<style lang="sass">
.backdrop
  position: fixed
  inset: 0
  background-color: rgba(20, 30, 40, 0.55)
  display: flex
  align-items: center
  justify-content: center
  z-index: 1000
  padding: 24px
  box-sizing: border-box

.modal
  display: flex
  flex-direction: column
  gap: 12px
  background-color: #fff
  border-radius: 12px
  padding: 20px
  width: 100%
  max-width: 760px
  max-height: 90vh
  box-sizing: border-box
  box-shadow: 0 12px 40px rgba(0,0,0,0.25)

  @media (max-width: 800px)
    max-width: none
    width: 100%
    height: 100%
    max-height: none
    border-radius: 0

.modal-header
  display: flex
  flex-direction: row
  justify-content: space-between
  align-items: center
  flex-shrink: 0

.modal-title
  font-size: 1.1em
  font-weight: 700
  color: #1f3a4d

.close-button
  border: none
  background: none
  font-size: 1.6em
  line-height: 1
  color: #5c6b77
  cursor: pointer
  padding: 0 4px

  &:hover
    color: #1f3a4d

.intro
  font-size: .95em
  color: #3d4a54
  line-height: 1.55

  p
    margin: 0 0 12px 0

    &:last-child
      margin-bottom: 0

  strong
    color: #1f3a4d

.figure-stage
  position: relative
  width: 100%
  flex-shrink: 1
  min-height: 0
  overflow: auto
  background-color: #fafbfc
  border: 1px solid #e0e6ea
  border-radius: 8px

.shared-defs
  position: absolute
  width: 0
  height: 0
  overflow: hidden

.figure-layer
  position: absolute
  inset: 0
  opacity: 0
  transition: opacity .35s ease
  pointer-events: none

  &.visible
    opacity: 1
    pointer-events: auto

  :global(svg)
    width: 100%
    height: 100%
    display: block

.caption
  font-size: .9em
  color: #3d4a54
  line-height: 1.45
  min-height: 2.6em
  flex-shrink: 0

.modal-footer
  display: flex
  flex-direction: row
  align-items: center
  justify-content: space-between
  flex-shrink: 0

.step-indicator
  font-size: .85em
  color: #64707a
  font-weight: 600

.nav-button
  padding: 6px 16px
  font-size: .9em
  font-weight: 600
  color: #1f3a4d
  background-color: #fff
  border: 1px solid #9db2c2
  border-radius: 8px
  cursor: pointer
  transition: background-color .15s ease, border-color .15s ease

  &:hover:not(:disabled)
    background-color: #dce5ec
    border-color: #5c6b77

  &:disabled
    opacity: .4
    cursor: default
</style>
