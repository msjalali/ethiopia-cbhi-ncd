<!-- SCRIPT -->
<script lang="ts">
import { _ } from '@shared/i18n'
import Selector from '@components/selector/selector.svelte'
import Graph from './graph.svelte'
import Legend from './legend.svelte'
import type { SelectableGraphViewModel } from './selectable-graph-vm'

export let viewModel: SelectableGraphViewModel
export let showSelector = true
const selectedGraphViewModel = viewModel.selectedGraphViewModel
</script>

<!-- TEMPLATE -->
<div class="selectable-graph">
  {#if showSelector}
    <Selector viewModel={viewModel.selectorViewModel} />
  {:else}
    <div class="graph-title">{$_($selectedGraphViewModel.spec.titleKey)}</div>
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
  gap: 1rem

.graph-title
  font-size: .95em
  font-weight: 700
  color: #333
  padding: 4px 0

.graph-container
  position: relative
  width: 100%
  height: 100%
</style>
