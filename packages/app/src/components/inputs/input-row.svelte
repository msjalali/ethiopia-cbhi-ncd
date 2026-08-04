<!-- SCRIPT -->
<script lang="ts">
import { _ } from '@shared/i18n'
import type { WritableSliderInput } from '@model/app-model-inputs'
import Slider from './slider.svelte'

export let input: WritableSliderInput

let showDescription = false

// Format the slider value
function formatValue(value: number): string {
  // TODO: Exercise for the reader: use d3-format or similar to format the slider value
  if (input.spec.format === 'percent') {
    const sign = value > 0 ? '+' : ''
    return `${sign}${Math.round(value * 100)}%`
  } else if (input.spec.format === 'delay_months') {
    // The underlying value is a fractional change relative to a 12-month baseline
    // delay (e.g. -0.5 to +0.5); show it as an absolute, intuitive month count.
    // Higher slider values mean a stronger delay-reduction strategy, so they map
    // to a shorter delay.
    return `${Math.round(12 * (1 - value))}`
  } else if (input.spec.format === '.2f') {
    return value.toFixed(2)
  } else {
    return value.toFixed(1)
  }
}
</script>

<!-- TEMPLATE -->
<div class="input-row-container">
  <div class="label-row">
    <div class="label">{@html $_(input.spec.labelKey)}</div>
    {#if input.spec.descriptionKey}
      <button
        type="button"
        class="info-icon"
        aria-label="More info"
        aria-expanded={showDescription}
        on:click={() => (showDescription = !showDescription)}
      >
        ?
      </button>
    {/if}
    <div class="spacer"></div>
    <div class="value">{formatValue($input)}</div>
    <div class="units">{@html $_(input.spec.unitsKey)}</div>
  </div>
  {#if showDescription && input.spec.descriptionKey}
    <div class="description">{$_(input.spec.descriptionKey)}</div>
  {/if}
  <div class="slider-row">
    <Slider {input} />
  </div>
</div>

<!-- STYLE -->
<style lang="sass">
.input-row-container
  margin: .15rem 0

.spacer
  flex: 1

.label-row
  display: flex
  align-items: center
  gap: .3rem

.label
  font-weight: normal

.info-icon
  display: flex
  align-items: center
  justify-content: center
  width: 18px
  height: 18px
  padding: 0
  margin: 0
  border-radius: 50%
  border: 1px solid #8a9aa8
  background: none
  color: #5c6b77
  font-size: .7em
  font-weight: 700
  line-height: 1
  font-family: inherit
  cursor: pointer
  flex-shrink: 0
  -webkit-tap-highlight-color: transparent

  &:hover, &:focus-visible, &[aria-expanded='true']
    background-color: #dce5ec
    border-color: #5c6b77

.description
  font-size: .85em
  color: #5c6b77
  background-color: #dfe7ed
  border-radius: 6px
  padding: 6px 8px
  margin: 2px 0 4px 0
  line-height: 1.35

.slider-row
  position: relative
  width: 100%

.value
  min-width: 2rem
  text-align: right
  font-weight: bold
</style>
