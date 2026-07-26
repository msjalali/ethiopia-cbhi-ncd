<!-- SCRIPT -->
<script lang="ts">
import { _ } from '@shared/i18n'
import type { WritableSliderInput } from '@model/app-model-inputs'
import Slider from './slider.svelte'

export let input: WritableSliderInput

// Format the slider value
function formatValue(value: number): string {
  // TODO: Exercise for the reader: use d3-format or similar to format the slider value
  if (input.spec.format === 'percent') {
    const sign = value > 0 ? '+' : ''
    return `${sign}${Math.round(value * 100)}%`
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
      <div class="info-icon" title={$_(input.spec.descriptionKey)}>?</div>
    {/if}
    <div class="spacer"></div>
    <div class="value">{formatValue($input)}</div>
    <div class="units">{@html $_(input.spec.unitsKey)}</div>
  </div>
  <div class="slider-row">
    <Slider {input} />
  </div>
</div>

<!-- STYLE -->
<style lang="sass">
.input-row-container
  margin: .3rem 0

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
  width: 14px
  height: 14px
  border-radius: 50%
  border: 1px solid #8a9aa8
  color: #5c6b77
  font-size: .65em
  font-weight: 700
  line-height: 1
  cursor: help
  flex-shrink: 0

.slider-row
  position: relative
  width: 100%

.value
  min-width: 2rem
  text-align: right
  font-weight: bold
</style>
