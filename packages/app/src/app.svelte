<!-- SCRIPT -->
<script lang="ts">
import './global.css'

import { derived } from 'svelte/store'

import type { Config as CoreConfig } from '@core'

import { _ } from '@shared/i18n'
import { calendarMode, ETHIOPIAN_TO_GREGORIAN_OFFSET } from '@shared/calendar'

import type { AppViewModel } from './app-vm'
import { createAppViewModel } from './app-vm'

import InputRow from './components/inputs/input-row.svelte'
import SelectableGraph from './components/graphs/selectable-graph.svelte'
import Selector from './components/selector/selector.svelte'
import type { SelectorViewModel } from './components/selector/selector-vm'
import ModelOverviewModal from './components/model-overview/model-overview-modal.svelte'
import HowToUseModal from './components/help/how-to-use-modal.svelte'
import { scheduleUsageSnapshot } from './usage-logging'

// Maps each slider's model variable name to the column name used in the usage log.
const LEVER_LOG_KEYS: Record<string, string> = {
  'enrollment strategy strength': 'enrollment',
  'fee waiver strategy strength': 'fee_waiver',
  'delay reduction strategy strength': 'delay_months',
  'reimbursement strategy strength': 'reimbursement',
  'provider strategy strength': 'provider',
  'restock strategy strength': 'restock',
  'screen strategy strength': 'screening'
}

export let coreConfig: CoreConfig

let viewModel: AppViewModel
let showModelOverview = false
let showHowToUse = false
let showPrimaryOutcomesInfo = false

const calendarSelector: SelectorViewModel = {
  options: [
    { value: 'ethiopian', stringKey: 'Ethiopian' },
    { value: 'gregorian', stringKey: 'Gregorian (approx.)' }
  ],
  selectedValue: calendarMode
}

$: scenarios = viewModel?.scenarios
$: scenario = $scenarios?.[0]
$: presets = viewModel?.presets ?? []
$: headlineStats = viewModel?.headlineStats
$: stats = $headlineStats ?? []
$: yearOffset = $calendarMode === 'gregorian' ? ETHIOPIAN_TO_GREGORIAN_OFFSET : 0
$: statTexts = stats.map(stat => {
  if (stat.year === undefined) {
    return stat.value
  }
  const unitText = stat.unit ? ` ${stat.unit}` : ''
  return `${stat.value}${unitText} in ${stat.year + yearOffset}`
})
$: primaryGraphContainers = viewModel?.graphContainers.slice(0, 2) ?? []
$: otherGraphContainers = viewModel?.graphContainers.slice(2, 4) ?? []

// Track dashboard usage (lever settings + which "Other Projections" graphs are
// selected) for the two selectable graph slots, so changes to either trigger a
// usage-log snapshot below.
$: otherContainer0 = otherGraphContainers[0]
$: otherContainer1 = otherGraphContainers[1]
$: selectedOtherGraph0 = otherContainer0?.selectedGraphViewModel
$: selectedOtherGraph1 = otherContainer1?.selectedGraphViewModel

// A single derived store combining all of the current scenario's slider values,
// so that any slider change (any index) triggers the usage-log snapshot below.
$: sliderValuesStore = scenario && scenario.sliders.length > 0 ? derived(scenario.sliders, values => values) : undefined

$: if (viewModel && sliderValuesStore && $sliderValuesStore) {
  const leverSnapshot: Record<string, number> = {}
  scenario.sliders.forEach((slider, i) => {
    const logKey = LEVER_LOG_KEYS[slider.spec.varName ?? '']
    if (logKey) {
      const rawValue = $sliderValuesStore[i]
      // Log the delay lever in the same absolute-months units shown in the UI,
      // rather than the underlying -0.5..0.5 fractional-change value.
      leverSnapshot[logKey] = logKey === 'delay_months' ? Math.round(12 * (1 + rawValue)) : rawValue
    }
  })
  scheduleUsageSnapshot({
    ...leverSnapshot,
    other_dropdown_1: selectedOtherGraph0 ? $_($selectedOtherGraph0.spec.titleKey) : '',
    other_dropdown_2: selectedOtherGraph1 ? $_($selectedOtherGraph1.spec.titleKey) : '',
    calendar_mode: $calendarMode
  })
}

// Wait for the view model to be loaded before we render the app
const viewReady = createAppViewModel(coreConfig).then(result => {
  viewModel = result
})
</script>

<!-- TEMPLATE -->
{#await viewReady}
  <div class="loading-container"></div>
{:then}
  <div class="app-container">
    <div class="header">
      <div class="app-title">Health Care Financing and NCD Treatment in Ethiopia</div>
      <div class="app-description">
        This dashboard projects treatment outcomes for two non-communicable diseases (NCDs) &mdash; hypertension and
        diabetes &mdash; in Ethiopia&rsquo;s Amhara region. Use the sliders to see how changes in Community-Based
        Health Insurance (CBHI) enrollment, screening, and reimbursement policies affect treatment over time. The
        black line shows the baseline (no change).
      </div>
      <div class="header-actions">
        <div class="calendar-selector">
          <div class="calendar-label">Calendar:</div>
          <Selector viewModel={calendarSelector} />
        </div>
      </div>
    </div>

    <div class="content-container">
      <div class="sliders-panel">
        {#if presets.length > 0 && scenario}
          <div class="presets-section">
            <div class="presets-title">Example Scenarios</div>
            <div class="preset-row">
              {#each presets as preset}
                <button class="preset-button" on:click={() => scenario.applyPreset(preset)}>{preset.name}</button>
              {/each}
            </div>
          </div>
        {/if}
        <div class="sliders-panel-title">Decision Levers</div>
        {#each $scenarios as scenario}
          <div class="scenario-container">
            {#if scenario.sliders.length > 0}
              <div class="scenario-header">
                <div class="nudge-text">👉 Move a slider and watch the projections respond</div>
                <button on:click={() => scenario.reset()}>Reset</button>
              </div>
              {#if scenario.name}
                <div class="scenario-name">{scenario.name}</div>
              {/if}
              {#each scenario.sliderGroups as group}
                <div class="slider-section">
                  {#if group.name}
                    <div class="slider-section-title">{group.name}</div>
                  {/if}
                  {#each group.sliders as slider}
                    <InputRow input={slider} />
                  {/each}
                </div>
              {/each}
            {:else}
              <div class="empty-config-message">
                No sliders configured. You can edit 'config/inputs.csv' to get started.
              </div>
            {/if}
          </div>
        {/each}
        <div class="action-links">
          <button type="button" class="about-link" on:click={() => (showHowToUse = true)}>
            <span class="about-link-icon">💡</span> <span class="about-link-text">Get the most out of this dashboard</span>
          </button>
          <button type="button" class="about-link" on:click={() => (showModelOverview = true)}>
            <span class="about-link-icon">🔍</span> <span class="about-link-text">See what&rsquo;s behind the scenes</span>
          </button>
        </div>
      </div>

      <div class="graphs-panel">
        {#if primaryGraphContainers.length > 0}
          <div class="graph-section">
            <div class="graph-section-title-row">
              <div class="graph-section-title">Primary Outcomes</div>
              <button
                type="button"
                class="info-icon"
                aria-label="What does % in treatment mean?"
                aria-expanded={showPrimaryOutcomesInfo}
                on:click={() => (showPrimaryOutcomesInfo = !showPrimaryOutcomesInfo)}
              >
                ?
              </button>
            </div>
            {#if showPrimaryOutcomesInfo}
              <div class="section-description">
                &ldquo;% in treatment&rdquo; is the share of people with hypertension or diabetes who are currently
                diagnosed and on treatment, out of everyone estimated to have the condition (both diagnosed and
                undiagnosed).
              </div>
            {/if}
            <div class="graph-row">
              {#each primaryGraphContainers as graphContainer, i}
                <div class="selectable-graph-container">
                  <SelectableGraph
                    viewModel={graphContainer}
                    showSelector={false}
                    statText={statTexts[i]}
                    statPositive={stats[i]?.positive ?? true}
                  />
                </div>
              {/each}
            </div>
          </div>
          <div class="graph-section">
            <div class="graph-section-title-row">
              <div class="graph-section-title">Other Projections</div>
              <div class="graph-section-hint">(select an outcome from the list below)</div>
            </div>
            <div class="graph-row">
              {#each otherGraphContainers as graphContainer, i}
                <div class="selectable-graph-container">
                  <SelectableGraph
                    viewModel={graphContainer}
                    showSelector={true}
                    statText={statTexts[i + primaryGraphContainers.length]}
                    statPositive={stats[i + primaryGraphContainers.length]?.positive ?? true}
                  />
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="empty-config-message">No graphs configured. You can edit 'config/graphs.csv' to get started.</div>
        {/if}
      </div>
    </div>

    <div class="footer">
      <div class="footer-line"></div>
      <div class="footer-text">
        Created by MJ Lab, Harvard. 2026. Read the study report <a href="#">[link will be added later]</a>.
      </div>
    </div>
  </div>

  <ModelOverviewModal bind:open={showModelOverview} />
  <HowToUseModal bind:open={showHowToUse} />
{/await}

<!-- STYLE -->
<style lang="sass">
.app-container
  display: flex
  flex-direction: column
  gap: 16px
  box-sizing: border-box
  height: 100vh
  padding: 14px 24px
  background-color: #fff

  @media (max-width: 800px)
    height: auto
    min-height: 100vh
    padding: 12px
    gap: 12px

.header
  position: relative
  display: flex
  flex-direction: column
  gap: 2px
  flex-shrink: 0

.app-title
  font-size: 1.45em
  font-weight: 700
  color: #2c5f8a
  letter-spacing: .01em
  max-width: calc(100% - 260px)

  @media (max-width: 800px)
    font-size: 1.15em
    max-width: none

.header-actions
  position: absolute
  top: 2px
  right: 0
  display: flex
  flex-direction: column
  align-items: flex-end
  gap: 4px
  flex-shrink: 0

  @media (max-width: 800px)
    position: static
    flex-direction: column
    align-items: flex-start
    gap: 8px
    width: 100%

.action-links
  display: flex
  flex-direction: row
  align-items: center
  gap: 16px
  flex-wrap: wrap
  margin-top: 4px
  flex-shrink: 0

  @media (max-width: 800px)
    gap: 12px

.about-link
  display: flex
  align-items: center
  gap: 5px
  font-size: .95em
  padding: 0
  border: none
  background: none
  font-weight: 600
  color: #2c5f8a
  cursor: pointer

  &:hover
    opacity: .8

.about-link-icon
  font-size: 1em
  line-height: 1

.about-link-text
  text-decoration: underline

.calendar-selector
  display: flex
  flex-direction: row
  align-items: center
  gap: 8px
  flex-shrink: 0
  font-size: .9em

.calendar-label
  font-weight: 700
  color: #1f3a4d

.app-description
  font-size: .78em
  color: #64707a
  max-width: 1000px
  line-height: 1.4
  margin-bottom: 2px

.content-container
  display: flex
  flex-direction: row
  gap: 20px
  flex: 1
  min-height: 0

  @media (max-width: 800px)
    flex-direction: column
    flex: none

.graphs-panel
  display: flex
  flex-direction: column
  gap: 10px
  flex: 1
  min-width: 0
  min-height: 0

  @media (max-width: 800px)
    flex: none
    min-height: 400px

.graph-section
  display: flex
  flex-direction: column
  gap: 6px
  flex: 1
  min-height: 0

  @media (max-width: 800px)
    flex: none

.graph-section-title-row
  display: flex
  flex-direction: row
  align-items: center
  gap: 8px
  padding-bottom: 4px
  border-bottom: 1px solid #c3d0da
  flex-shrink: 0

.graph-section-title
  font-weight: 700
  font-size: .9em
  color: #2c5f8a

.graph-section-hint
  font-size: .8em
  font-weight: 400
  color: #5c6b77

.section-description
  font-size: .85em
  color: #5c6b77
  background-color: #eef2f6
  border-radius: 6px
  padding: 6px 8px
  margin-top: 4px
  line-height: 1.35

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

.graph-row
  display: grid
  grid-template-columns: 1fr 1fr
  gap: 20px
  flex: 1
  min-height: 0

  @media (max-width: 800px)
    grid-template-columns: 1fr

.selectable-graph-container
  display: flex
  box-sizing: border-box
  width: 100%
  height: 100%
  min-height: 0
  padding: 6px

  @media (max-width: 800px)
    height: 320px

.sliders-panel
  display: flex
  flex-direction: column
  gap: 4px
  width: 460px
  flex-shrink: 0
  min-height: 0
  overflow-y: auto
  font-size: .85em

  @media (max-width: 800px)
    width: 100%
    overflow-y: visible

.sliders-panel-title
  font-size: 1rem
  font-weight: 700
  color: #2c5f8a
  flex-shrink: 0

.presets-section
  display: flex
  flex-direction: column
  gap: 4px
  flex-shrink: 0
  padding-bottom: 10px
  border-bottom: 1px solid #c3d0da

.presets-title
  font-size: 1rem
  font-weight: 700
  color: #2c5f8a

.preset-row
  display: flex
  flex-wrap: wrap
  gap: 6px
  flex-shrink: 0

.preset-button
  padding: 4px 10px
  font-size: .78em
  font-weight: 400
  color: #1f3a4d
  background-color: #fff
  border: 1px solid #9db2c2
  border-radius: 14px
  cursor: pointer
  transition: background-color .15s ease, border-color .15s ease

  &:hover
    background-color: #dce5ec
    border-color: #5c6b77

.scenario-container
  display: flex
  flex-direction: column
  flex-shrink: 0
  padding: 6px 16px
  border-radius: 10px
  background-color: #eef2f6

.slider-section
  margin-top: 6px

  &:first-child
    margin-top: 0

.slider-section-title
  font-weight: 700
  font-size: .9em
  color: #1f3a4d
  padding-bottom: 4px
  margin-bottom: 2px
  border-bottom: 1px solid #c3d0da

.scenario-header
  display: flex
  flex-direction: row
  justify-content: space-between
  align-items: center
  gap: 10px
  margin-bottom: 4px

.nudge-text
  font-size: .85em
  font-weight: 600
  color: #000

.scenario-name
  margin-bottom: 10px
  color: #5c6b77
  font-size: .9em
  font-weight: 700

.scenario-header :global(button)
  padding: 5px 12px
  font-size: .85em
  font-weight: 600
  color: #1f3a4d
  background-color: #fff
  border: 1px solid #c3d0da
  border-radius: 6px
  cursor: pointer
  transition: background-color .15s ease, border-color .15s ease
  &:hover
    background-color: #e3eaf0
    border-color: #9db2c2

.empty-config-message
  margin: 20px 0
  font-size: .9em
  text-align: center

.footer
  display: flex
  flex-direction: column
  gap: 6px
  flex-shrink: 0

.footer-line
  border-top: 1px solid #ddd

.footer-text
  font-size: .7em
  color: #999
  a
    color: #999
</style>
