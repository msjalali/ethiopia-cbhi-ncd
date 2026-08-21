import { writable, type Writable, type Readable } from 'svelte/store'

import type { Config as CoreConfig, Model as CoreModel, InputId, OutputVarId, Series, SourceName } from '@core'
import { createAsyncModel } from '@core'

import { createWritableModelInput, type WritableInput } from './app-model-inputs'

/**
 * Source name used by graph datasets that draw the user-pinned reference line.
 * Must match the "plot N source" value used in config/graphs.csv.
 */
export const PINNED_SOURCE_NAME = 'Pinned'

/**
 * Create an `AppModel` instance.
 */
export async function createAppModel(coreConfig: CoreConfig): Promise<AppModel> {
  // Create the underlying model
  const coreModel = await createAsyncModel(coreConfig)

  // Create the `AppModel` instance
  return new AppModel(coreConfig, coreModel)
}

/**
 * A context that holds a distinct set of model inputs and outputs.
 */
export interface AppModelContext {
  /** The source name associated with the context. */
  sourceName: SourceName

  /** The set of inputs associated with this context. */
  inputs: Map<InputId, WritableInput>
}

/**
 * High-level interface to the runnable model.
 */
export class AppModel {
  public readonly contexts: Map<SourceName, AppModelContext> = new Map()

  private readonly writableDataChanged: Writable<number> = writable(0)
  public readonly dataChanged: Readable<number> = this.writableDataChanged

  /**
   * A snapshot of the live model outputs, captured when the user pins the current
   * scenario. Graphs render this under the "Pinned" source name as a dashed line,
   * so a scenario can be compared against both the baseline and an earlier run of
   * the user's own choosing. Empty when nothing is pinned.
   */
  private readonly pinnedSeries: Map<OutputVarId, Series> = new Map()

  private readonly writablePinned: Writable<boolean> = writable(false)
  public readonly pinned: Readable<boolean> = this.writablePinned

  constructor(
    public readonly coreConfig: CoreConfig,
    private readonly coreModel: CoreModel
  ) {
    // Helper function that creates a context with Svelte-friendly
    // `WritableInput` instances
    const contexts = this.contexts
    function addContext(sourceName: SourceName) {
      // Create a `WritableInput` instance for each input variable in the config
      const inputs: Map<InputId, WritableInput> = new Map()
      for (const inputSpec of coreConfig.inputs.values()) {
        const input = createWritableModelInput(inputSpec)
        inputs.set(input.spec.id, input)
      }

      // Add the context in the core model
      coreModel.addContext(sourceName, { inputs })

      // Add the app-level context
      contexts.set(sourceName, {
        sourceName,
        inputs
      })
    }

    // This is a special feature of this template.  We check the graph specs to
    // see if there are graphs configured with one or more datasets that use
    // "ScenarioN" as the source.  If so, we create a context for each scenario
    // name.  This allows the UI to show multiple groups of inputs.  If there
    // are no scenario-specific datasets, we create a single context.
    const scenarioNames = new Set<SourceName>()
    for (const graphSpec of coreConfig.graphs.values()) {
      for (const dataset of graphSpec.datasets) {
        if (dataset.externalSourceName?.startsWith('Scenario')) {
          scenarioNames.add(dataset.externalSourceName)
        }
      }
    }
    if (scenarioNames.size > 0) {
      // Create a context for each scenario name
      for (const scenarioName of scenarioNames) {
        addContext(scenarioName)
      }
    } else {
      // Create a single context
      addContext('Primary')
    }

    // Increment the data change count when the model produces new outputs
    coreModel.onOutputsChanged = () => {
      this.writableDataChanged.update(count => count + 1)
    }
  }

  getContexts(): ReadonlyMap<SourceName, AppModelContext> {
    return this.contexts
  }

  getSeriesForVar(sourceName: SourceName | undefined, varId: OutputVarId): Series | undefined {
    if (sourceName === undefined) {
      sourceName = 'Primary'
    }
    if (sourceName === PINNED_SOURCE_NAME) {
      // Fall back to the live series when nothing is pinned. The pinned dataset is
      // hidden in that case, so the values are never drawn; returning the live
      // series simply avoids a "no data available" error on every graph update.
      return this.pinnedSeries.get(varId) ?? this.coreModel.getSeriesForVar('Primary', varId)
    }
    return this.coreModel.getSeriesForVar(sourceName, varId)
  }

  /** Return true if the user has pinned a scenario. */
  hasPinnedData(): boolean {
    return this.pinnedSeries.size > 0
  }

  /**
   * Capture the current model outputs as the pinned reference. This copies the
   * series that are already in memory from the latest run, so no additional model
   * run is needed.
   */
  pinCurrent(): void {
    this.pinnedSeries.clear()
    for (const varId of this.pinnableVarIds()) {
      const series = this.coreModel.getSeriesForVar('Primary', varId)
      if (series) {
        // Copy, otherwise the next model run would overwrite the pinned points.
        this.pinnedSeries.set(varId, series.copy())
      }
    }
    this.writablePinned.set(this.pinnedSeries.size > 0)
    this.writableDataChanged.update(count => count + 1)
  }

  /** Discard the pinned reference. */
  clearPinned(): void {
    this.pinnedSeries.clear()
    this.writablePinned.set(false)
    this.writableDataChanged.update(count => count + 1)
  }

  /** Every output variable that some graph draws from the live model run. */
  private pinnableVarIds(): Set<OutputVarId> {
    const varIds: Set<OutputVarId> = new Set()
    for (const graphSpec of this.coreConfig.graphs.values()) {
      for (const dataset of graphSpec.datasets) {
        if (dataset.externalSourceName === undefined) {
          varIds.add(dataset.varId)
        }
      }
    }
    return varIds
  }
}
