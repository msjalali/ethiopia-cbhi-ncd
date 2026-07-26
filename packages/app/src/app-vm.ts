import { derived, get, writable, type Readable } from 'svelte/store'

import type { Config as CoreConfig, GraphSpec, SourceName } from '@core'

import { _ } from '@shared/i18n'
import { syncWritable } from '@shared/stores'

import { type AppModel, type AppModelContext, createAppModel } from '@model/app-model'
import type { WritableSliderInput } from '@model/app-model-inputs'

import inputsCsvRaw from '../../../config/inputs.csv?raw'

function getFixedVarNames(csv: string): Set<string> {
  const [headerLine, ...rows] = csv.trim().split(/\r?\n/)
  const headers = headerLine.split(',')
  const varnameIdx = headers.indexOf('varname')
  const groupIdx = headers.indexOf('group name')
  const names = rows
    .map(row => row.split(','))
    .filter(cols => cols[groupIdx]?.trim() === 'Fixed')
    .map(cols => cols[varnameIdx]?.trim())
    .filter(Boolean)
  return new Set(names)
}

/**
 * Build a map from varname to its "group name" column value, for every
 * non-"Fixed" row.  Used to cluster sliders into labeled sub-sections in
 * the UI, driven entirely by the `group name` column in `config/inputs.csv`.
 */
function getVarGroupNames(csv: string): Map<string, string> {
  const [headerLine, ...rows] = csv.trim().split(/\r?\n/)
  const headers = headerLine.split(',')
  const varnameIdx = headers.indexOf('varname')
  const groupIdx = headers.indexOf('group name')
  const map = new Map<string, string>()
  for (const row of rows) {
    const cols = row.split(',')
    const groupName = cols[groupIdx]?.trim()
    const varName = cols[varnameIdx]?.trim()
    if (varName && groupName && groupName !== 'Fixed') {
      map.set(varName, groupName)
    }
  }
  return map
}

const HIDDEN_VAR_NAMES = getFixedVarNames(inputsCsvRaw)
const VAR_GROUP_NAMES = getVarGroupNames(inputsCsvRaw)
import type { GraphViewModel } from '@components/graphs/graph-vm'
import { SelectableGraphViewModel } from '@components/graphs/selectable-graph-vm'
import type { SelectorOption, SelectorViewModel } from '@components/selector/selector-vm'

export interface LayoutOption extends SelectorOption {
  maxVisible: number
}

export interface SliderGroup {
  name: string
  sliders: WritableSliderInput[]
}

export class ScenarioViewModel {
  public readonly sliderGroups: SliderGroup[]

  constructor(
    public readonly name: string,
    public readonly sliders: WritableSliderInput[]
  ) {
    this.sliderGroups = groupSliders(sliders)
  }

  reset() {
    this.sliders.forEach(slider => slider.reset())
  }
}

/**
 * Cluster the given sliders into groups, in the order the groups first
 * appear, based on each slider's varname mapping to a "group name" in
 * `config/inputs.csv`.
 */
function groupSliders(sliders: WritableSliderInput[]): SliderGroup[] {
  const groups: SliderGroup[] = []
  const groupsByName = new Map<string, SliderGroup>()
  for (const slider of sliders) {
    const groupName = VAR_GROUP_NAMES.get(slider.spec.varName ?? '') ?? ''
    let group = groupsByName.get(groupName)
    if (!group) {
      group = { name: groupName, sliders: [] }
      groupsByName.set(groupName, group)
      groups.push(group)
    }
    group.sliders.push(slider)
  }
  return groups
}

export async function createAppViewModel(coreConfig: CoreConfig): Promise<AppViewModel> {
  // Initialize the app model that wraps the generated model
  const appModel = await createAppModel(coreConfig)

  // Create the `AppViewModel` instance
  return new AppViewModel(appModel)
}

export class AppViewModel {
  public readonly layoutSelector: SelectorViewModel
  public readonly selectedLayoutOption: Readable<LayoutOption>
  public readonly graphContainers: SelectableGraphViewModel[]
  public readonly scenarios: Readable<ScenarioViewModel[]>

  constructor(appModel: AppModel) {
    const graphSpecs = [...appModel.coreConfig.graphs.values()]
    const graphViewModels = graphSpecs.map(graphSpec => createGraphViewModel(appModel, graphSpec))

    // The UI allows the user to choose different graph layouts.  For now, add
    // enough graph containers to support up to 4 graphs at a time.
    const maxVisibleGraphs = Math.min(4, graphSpecs.length)
    const numFixedGraphs = Math.min(2, graphSpecs.length)
    const fixedGraphIds = new Set(graphViewModels.slice(0, numFixedGraphs).map(graph => graph.spec.id))
    this.graphContainers = []
    for (let i = 0; i < maxVisibleGraphs; i++) {
      const graphId = graphViewModels[i].spec.id
      const excludedGraphIds = i >= numFixedGraphs ? fixedGraphIds : undefined
      this.graphContainers.push(new SelectableGraphViewModel(graphViewModels, i, graphId, excludedGraphIds))
    }

    // Add the layout options
    const initialLayout = import.meta.hot?.data?.initialLayout || 'layout_1_2'
    const layoutOptions: LayoutOption[] = [
      { value: 'layout_1_2', stringKey: '2', maxVisible: 2 },
      { value: 'layout_2_2', stringKey: '4', maxVisible: 4 }
    ]
    this.layoutSelector = {
      options: layoutOptions,
      selectedValue: syncWritable(initialLayout),
      onUserChange: layout => {
        if (import.meta.hot) {
          import.meta.hot.data.initialLayout = layout
        }
      }
    }
    this.selectedLayoutOption = derived(this.layoutSelector.selectedValue, $selectedLayout => {
      return layoutOptions.find(option => option.value === $selectedLayout)
    })

    // Create the scenario view models
    const scenarios: ScenarioViewModel[] = []
    function addScenario(sourceName: SourceName, context: AppModelContext) {
      let displayName: string
      if (sourceName.startsWith('Scenario')) {
        displayName = sourceName.replace('Scenario', 'Scenario ')
      } else {
        displayName = ''
      }
      // TODO: We need to update `app.svelte` to handle switch inputs; for now, only show sliders

		const sliders = [...context.inputs.values()]
		  .filter(input => input.kind === 'slider')
		  .filter(input => !HIDDEN_VAR_NAMES.has(input.spec.varName ?? '')) as WritableSliderInput[]

      const scenario = new ScenarioViewModel(displayName, sliders)
      scenarios.push(scenario)
      return scenario
    }
    for (const [sourceName, context] of appModel.getContexts()) {
      addScenario(sourceName, context)
    }
    this.scenarios = writable(scenarios)
  }
}

/**
 * Create a `GraphViewModel` for the given spec.
 */
function createGraphViewModel(appModel: AppModel, graphSpec: GraphSpec): GraphViewModel {
  return {
    spec: graphSpec,
    dataChanged: appModel.dataChanged,
    getSeriesForVar: (varId, sourceName) => {
      return appModel.getSeriesForVar(sourceName, varId)
    },
    getStringForKey(key: string, values?: { [key: string]: string }): string {
      return get(_)(key, values)
    },
    formatYAxisTickValue: value => {
      return format(value, graphSpec.yFormat)
    }
  }
}

/**
 * Return a formatted string representation of the given number.
 */
function format(num: number, formatString: string) {
  // TODO: You could use d3-format or another similar formatting library
  // here.  For now, this is set up to handle a small subset of formats
  // used in the example config files.  Regardless of the number of decimal
  // places, values are shown with thousands separators (e.g. "12,345").
  switch (formatString) {
    case '.1f':
      return num.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    case '.2f':
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    case 'percent':
      // The underlying data is a fraction (e.g. 0.35); display it as a whole
      // percentage number (e.g. "35") without a trailing "%" sign, since the
      // graph's own axis label already conveys that the units are "Percent".
      return (num * 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
    default:
      // Preserve the value's own natural precision (as `toString()` did before),
      // just with thousands separators added for large numbers.
      return num.toLocaleString('en-US', { maximumFractionDigits: 10 })
  }
}
