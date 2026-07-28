<!-- SCRIPT -->
<script lang="ts">
import { _ } from '@shared/i18n'
import Selector from '@components/selector/selector.svelte'
import Graph from './graph.svelte'
import Legend from './legend.svelte'
import type { SelectableGraphViewModel } from './selectable-graph-vm'

export let viewModel: SelectableGraphViewModel
export let showSelector = true
/** Optional short "how much did this change" stat, shown just below the title. */
export let statText: string | undefined = undefined
export let statPositive = true
const selectedGraphViewModel = viewModel.selectedGraphViewModel
</script>

<!-- TEMPLATE -->
<div class="selectable-graph">
  {#if showSelector}
    <Selector viewModel={viewModel.selectorViewModel} />
  {:else}
    <div class="graph-title">{$_($selectedGraphViewModel.spec.titleKey)}</div>
  {/if}
  {#if statText}
    <div class="stat-tile" class:negative={!statPositive}>{statText}</div>
  {/if}
  <div class="graph-container">
    <Graph viewModel={$selectedGraphViewModel} />
  </div>
  <Legend graphSpec={$selectedGraphViewModel.spec} />
</div>

<!-- STYLE -->
<style lang="sass">
.selectable-graph
  display: flex
  flex-direction: column
  flex: 1
  gap: .5rem

.graph-title
  font-size: .95em
  font-weight: 700
  color: #333
  padding: 4px 0

.stat-tile
  font-size: .85em
  font-weight: 700
  color: #1f3a4d
  background-color: #eef2f6
  border-left: 3px solid #2f6690
  border-radius: 6px
  padding: 3px 10px

  &.negative
    border-left-color: #a83c3c

.graph-container
  position: relative
  width: 100%
  height: 100%
</style>
