import { derived, get, writable, type Readable } from 'svelte/store'

import type { Config as CoreConfig, GraphSpec, Point, Series, SourceName } from '@core'

import { _ } from '@shared/i18n'

import { type AppModel, type AppModelContext, createAppModel } from '@model/app-model'
import type { WritableSliderInput } from '@model/app-model-inputs'

import inputsCsvRaw from '../../../config/inputs.csv?raw'
import presetsCsvRaw from '../../../config/presets.csv?raw'

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

/**
 * Represents a named bundle of slider values representing a real-world policy
 * package (e.g. "Universal CBHI push"), so that users can explore a
 * recognizable policy rather than guessing at individual abstract sliders.
 * Driven entirely by `config/presets.csv`, where each row is a preset and
 * each remaining column is a slider's varname mapped to the value it should
 * be set to when that preset is applied.
 */
export interface PolicyPreset {
  name: string
  values: Record<string, number>
}

function parsePresets(csv: string): PolicyPreset[] {
  const [headerLine, ...rows] = csv.trim().split(/\r?\n/)
  const headers = headerLine.split(',')
  const nameIdx = headers.indexOf('preset name')
  return rows
    .map(row => row.split(','))
    .filter(cols => cols[nameIdx]?.trim())
    .map(cols => {
      const values: Record<string, number> = {}
      headers.forEach((header, i) => {
        if (i === nameIdx) {
          return
        }
        const raw = cols[i]?.trim()
        if (raw !== undefined && raw !== '') {
          values[header] = Number(raw)
        }
      })
      return { name: cols[nameIdx].trim(), values }
    })
}

const HIDDEN_VAR_NAMES = getFixedVarNames(inputsCsvRaw)
const VAR_GROUP_NAMES = getVarGroupNames(inputsCsvRaw)
const POLICY_PRESETS = parsePresets(presetsCsvRaw)
import type { GraphViewModel } from '@components/graphs/graph-vm'
import { SelectableGraphViewModel } from '@components/graphs/selectable-graph-vm'

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

  /**
   * Set every slider to the value specified by the given preset (leaving
   * sliders not mentioned in the preset untouched).
   */
  applyPreset(preset: PolicyPreset) {
    for (const slider of this.sliders) {
      const varName = slider.spec.varName ?? ''
      if (varName in preset.values) {
        slider.set(preset.values[varName])
      }
    }
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

export interface HeadlineStat {
  label: string
  value: string
  /** The final simulation year this stat was computed for (in the model's own, Ethiopian, calendar). */
  year: number | undefined
  positive: boolean
}

export class AppViewModel {
  public readonly graphContainers: SelectableGraphViewModel[]
  public readonly scenarios: Readable<ScenarioViewModel[]>
  public readonly headlineStats: Readable<HeadlineStat[]>
  public readonly presets: PolicyPreset[] = POLICY_PRESETS

  constructor(appModel: AppModel) {
    const graphSpecs = [...appModel.coreConfig.graphs.values()]
    const graphViewModels = graphSpecs.map(graphSpec => createGraphViewModel(appModel, graphSpec))

    // Always show up to 4 graphs: the first 2 are fixed, the remaining 2 are
    // selectable from the rest of the configured graphs.
    const maxVisibleGraphs = Math.min(4, graphSpecs.length)
    const numFixedGraphs = Math.min(2, graphSpecs.length)
    const fixedGraphIds = new Set(graphViewModels.slice(0, numFixedGraphs).map(graph => graph.spec.id))
    this.graphContainers = []
    for (let i = 0; i < maxVisibleGraphs; i++) {
      const graphId = graphViewModels[i].spec.id
      const excludedGraphIds = i >= numFixedGraphs ? fixedGraphIds : undefined
      this.graphContainers.push(new SelectableGraphViewModel(graphViewModels, i, graphId, excludedGraphIds))
    }

    // Compute a headline "how much did this change vs. baseline" stat for each
    // of the fixed "primary outcome" graphs, so the impact of the current
    // slider settings is visible at a glance without having to read a chart.
    const primaryGraphSpecs = graphSpecs.slice(0, numFixedGraphs)
    this.headlineStats = derived(appModel.dataChanged, () => {
      return primaryGraphSpecs.map(spec => computeHeadlineStat(appModel, spec))
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
 * Compute a "how much did this change vs. baseline" headline stat for the
 * given graph, comparing the final-year value of the current scenario
 * against the "Ref" (baseline) line already configured for that graph.
 */
function computeHeadlineStat(appModel: AppModel, spec: GraphSpec): HeadlineStat {
  const refDataset = spec.datasets.find(d => d.externalSourceName === 'Ref') ?? spec.datasets[0]
  const curDataset = spec.datasets.find(d => !d.externalSourceName) ?? spec.datasets[0]

  const refLast = lastPoint(appModel.getSeriesForVar(refDataset.externalSourceName, refDataset.varId))
  const curLast = lastPoint(appModel.getSeriesForVar(curDataset.externalSourceName, curDataset.varId))

  const fullTitle = get(_)(spec.titleKey)
  const label = fullTitle.includes(':') ? (fullTitle.split(':').pop() ?? fullTitle).trim() : fullTitle

  if (refLast === undefined || curLast === undefined) {
    return { label, value: 'N/A', year: undefined, positive: true }
  }

  const isPercent = spec.yFormat === 'percent'
  const rawDelta = curLast.y - refLast.y
  const displayDelta = isPercent ? rawDelta * 100 : rawDelta
  const rounded = Math.round(displayDelta * 10) / 10
  const sign = rounded > 0 ? '+' : ''
  const unit = isPercent ? '%' : ''

  return {
    label,
    value: `${sign}${rounded}${unit}`,
    year: Math.round(curLast.x),
    positive: rounded >= 0
  }
}

function lastPoint(series: Series | undefined): Point | undefined {
  if (!series || series.points.length === 0) {
    return undefined
  }
  return series.points[series.points.length - 1]
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
    },
    formatTooltipValue: value => {
      return formatTooltipNumber(value, graphSpec.yFormat)
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

/**
 * Return a formatted string for a chart tooltip (hover) value. Shows one decimal
 * place when the (scaled) magnitude is below 100, otherwise no decimal places.
 */
function formatTooltipNumber(num: number, formatString: string) {
  const isPercent = formatString === 'percent'
  const scaled = isPercent ? num * 100 : num
  const decimals = Math.abs(scaled) < 100 ? 1 : 0
  const text = scaled.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return isPercent ? `${text}%` : text
}
