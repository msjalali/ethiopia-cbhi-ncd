<!-- SCRIPT -->
<script lang="ts">
import './global.css'

import type { Config as CoreConfig } from '@core'

import { calendarMode } from '@shared/calendar'

import type { AppViewModel } from './app-vm'
import { createAppViewModel } from './app-vm'

import InputRow from './components/inputs/input-row.svelte'
import SelectableGraph from './components/graphs/selectable-graph.svelte'
import Selector from './components/selector/selector.svelte'
import type { SelectorViewModel } from './components/selector/selector-vm'

export let coreConfig: CoreConfig

let viewModel: AppViewModel

const calendarSelector: SelectorViewModel = {
  options: [
    { value: 'ethiopian', stringKey: 'Ethiopian' },
    { value: 'gregorian', stringKey: 'Gregorian (approx.)' }
  ],
  selectedValue: calendarMode
}

$: scenarios = viewModel?.scenarios
$: selectedLayoutOption = viewModel?.selectedLayoutOption
$: visibleGraphContainers = viewModel?.graphContainers.slice(0, $selectedLayoutOption.maxVisible)

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
      <div class="header-top">
        <div class="app-title">Health Care Financing and NCD Treatment in Ethiopia</div>
        <div class="calendar-selector">
          <div class="calendar-label">Calendar:</div>
          <Selector viewModel={calendarSelector} />
        </div>
      </div>
      <div class="app-description">
        This dashboard presents projected hypertension and diabetes treatment outcomes in Ethiopia&rsquo;s Amhara
        region. Use the sliders to explore how changes in CBHI enrollment, fee-waiver coverage, screening, provider
        and medication capacity, and reimbursement policies may affect treatment over time.
      </div>
    </div>

    <div class="content-container">
      <div class="sliders-panel">
        <div class="sliders-panel-title">Decision Levers</div>
        {#each $scenarios as scenario}
          <div class="scenario-container">
            {#if scenario.sliders.length > 0}
              <div class="scenario-header">
                {#if scenario.name}
                  <div class="scenario-name">{scenario.name}</div>
                {/if}
                <button on:click={() => scenario.reset()}>Reset</button>
              </div>
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
      </div>

      <div class="graphs-panel">
        <div class="options-container">
          <div class="layout-label">Max Visible Graphs:</div>
          <Selector viewModel={viewModel.layoutSelector} />
        </div>

        {#if visibleGraphContainers.length > 0}
          <div class="graphs-container {$selectedLayoutOption.value}">
            {#each visibleGraphContainers as graphContainer, i}
              <div class="selectable-graph-container">
                <SelectableGraph viewModel={graphContainer} showSelector={i >= 2} />
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-config-message">No graphs configured. You can edit 'config/graphs.csv' to get started.</div>
        {/if}
      </div>
    </div>

    <div class="footer">
      <div class="footer-line"></div>
      <div class="footer-text">
        Created by MJ Lab, Harvard. 2026. Read the study report <a href="#">here</a>.
      </div>
    </div>
  </div>
{/await}

<!-- STYLE -->
<style lang="sass">
.app-container
  display: flex
  flex-direction: column
  gap: 12px
  box-sizing: border-box
  height: 100vh
  padding: 18px 24px
  background-color: #fff

  @media (max-width: 800px)
    height: auto
    min-height: 100vh
    padding: 12px
    gap: 12px

.header
  display: flex
  flex-direction: column
  gap: 6px
  flex-shrink: 0

.header-top
  display: flex
  flex-direction: row
  justify-content: space-between
  align-items: baseline
  gap: 16px

  @media (max-width: 800px)
    flex-wrap: wrap
    gap: 8px

.app-title
  font-size: 1.45em
  font-weight: 700
  color: #1f3a4d
  letter-spacing: .01em

  @media (max-width: 800px)
    font-size: 1.15em

.calendar-selector
  display: flex
  flex-direction: row
  align-items: center
  gap: 8px
  flex-shrink: 0

.calendar-label
  font-size: 1rem
  font-weight: 700
  color: #1f3a4d

.app-description
  font-size: .85em
  color: #64707a
  max-width: 1000px
  line-height: 1.45

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

.options-container
  display: flex
  flex-direction: row
  align-items: center
  gap: 10px
  flex-shrink: 0
  flex-wrap: wrap

.layout-label
  font-size: 1rem
  font-weight: 700
  color: #1f3a4d

.graphs-container
  display: grid
  gap: 20px
  flex: 1
  min-height: 0
  &.layout_1_2
    grid-template-columns: 1fr 1fr
  &.layout_2_2
    grid-template-columns: 1fr 1fr
    grid-template-rows: 1fr 1fr

  @media (max-width: 800px)
    flex: none
    &.layout_1_2, &.layout_2_2
      grid-template-columns: 1fr
      grid-template-rows: none

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
  gap: 10px
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
  color: #1f3a4d
  flex-shrink: 0

.scenario-container
  display: flex
  flex-direction: column
  flex-shrink: 0
  padding: 12px 16px
  border-radius: 10px
  background-color: #eef2f6

.slider-section
  margin-top: 12px

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
  justify-content: flex-end
  align-items: baseline
  gap: 10px
  margin-bottom: 4px

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
