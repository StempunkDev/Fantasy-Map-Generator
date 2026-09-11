# PRD: Feature Modules

## Problem Statement

A map feature — Ice, Military, Markers, Zones, Journeys — is already a vertical slice: a generator in
`src/generators/`, one or more dialogs in `src/controllers/`, a renderer in `src/renderers/`, and a
slice of `pack`. What it lacks is a single file that says so. The slice is held together by a shared
filename prefix and by hand-written entries in four unrelated places: the pipeline step list, the
layer list, the `Controllers` registry, and one more slot in `save.ts`/`load.ts`.

The last of those is the one that hurts. The `.map` body is a 53-element positional array, read back
by numeric index. Adding a field means appending at the end; removing one means leaving a hole
forever — five slots (`data[2]`, `data[4]`, `data[23]`, `data[28]`, `data[33]`) are permanent
placeholders because reusing an index would silently hand one feature's data to another. Nothing ties index 39 to Ice
except a comment and the reader's memory.

`docs/architecture/future-data-model.md` already specifies the fix for the format: `data` becomes a
keyed object (`data.states`, `data.cultures`, …). What it does not say is who writes each key. If
`Save`/`Load` keep one hand-written line per feature, the keyed format has better names but the same
problem: a feature is still described by scattered entries nobody owns.

## Solution

Give every feature a **feature module**: one small, plain object that says what the feature consists
of and owns the one thing today's code has no home for — how the feature's data is serialized.

```ts
// src/features/military.ts
export const Military: FeatureModule = {
  id: "military",
  steps: ["military"],
  layer: "military",
  controllers: {
    MilitaryOverview: () => import("@/controllers/military-overview").then(m => m.MilitaryOverview),
    RegimentsOverview: () => import("@/controllers/regiments-overview").then(m => m.RegimentsOverview),
    RegimentEditor: () => import("@/controllers/regiment-editor").then(m => m.RegimentEditor)
  }
  // no `data`: regiments live on state.military and are saved with states
};
```

`steps` and `layer` are typed pointers into the existing lists — a renamed step or layer is a compile
error, and the lists themselves are untouched. `controllers` moves the feature's registry entries
here, and `controllers/index.ts` spreads them. `data` is the new part: `serialize`/`deserialize` for
the feature's own key, so `Save`/`Load` become a loop over modules instead of a hand-maintained array.

`src/features/index.ts` exports the ordered list `FeatureModules`. No new runtime mechanism is added:
`Pipeline`, `LayersRegistry` and `createRegistry` are unchanged, and the pipeline and layer lists stay
exactly the plain, hand-authored lists they are today. A module references a feature's existing
generator, controllers and renderer; it does not move them.

## User Stories

1. As a contributor, I want one file per feature that lists its steps, layer, dialogs and data key,
   so that "what is the Military feature" is answered by one file instead of a grep across four.
2. As a contributor adding a feature, I want to write one module file and one line in
   `features/index.ts`, so that I don't have to find the right slot in `save.ts` and `load.ts`.
3. As a maintainer, I want `Save`/`Load` to iterate `FeatureModules`, so that adding, renaming or
   removing a feature's data never means picking or retiring a numeric index.
4. As a maintainer, I want each module's `serialize`/`deserialize` to be a pair of plain functions
   with a round-trip test, so that a feature's save format has the same test discipline as other IO.
5. As a contributor, I want a module's `steps` and `layer` to be checked against the real step and
   layer ids by the compiler, so that a rename in either list breaks the build, not the map.
6. As a maintainer, I want the pipeline and layer lists to stay as they are, so that generation
   order and z-order remain readable at a glance in one file each.
7. As a contributor, I want a feature with no data key of its own (Military, Labels) to simply omit
   `data`, so that the pattern never forces an artificial key into existence.
8. As a maintainer, I want features to migrate one at a time, so that migrated and un-migrated
   features coexist and no big-bang cutover is needed.

## Implementation Decisions

- **Descriptor.** A plain object literal, no class, no registration side effects:

  ```ts
  interface FeatureModule {
    id: string; // key in data.<id>; purely descriptive when the module has no data
    steps?: GenerationPipelineStepId[]; // pointers into generation-pipeline.ts
    layer?: LayerId; // pointer into layers.ts
    controllers?: Record<string, () => Promise<unknown>>; // spread into the Controllers registry
    data?: { serialize(): unknown; deserialize(slice: unknown): void };
  }
  ```

  Every field except `id` is optional. `steps` is plural because States owns four non-adjacent steps
  (`states`, `stateStatistics`, `stateForms`, `taxes`).

- **Location.** `src/features/`, one file per feature plus `index.ts` holding the ordered list. It is
  metadata spanning generators, controllers and renderers, so it belongs in none of those folders. The
  export is `FeatureModules`; `pack.features` (islands, lakes) keeps its meaning.

- **`Save`/`Load` loop over modules.** Under the keyed format:

  ```ts
  for (const m of FeatureModules) if (m.data) data[m.id] = m.data.serialize();
  for (const m of FeatureModules) if (m.data) m.data.deserialize(data[m.id]);
  ```

  Until the keyed format lands, `load.ts` keeps its positional reader and calls
  `Ice.data.deserialize(JSON.parse(data[39]))` for migrated features. The index still exists, but the
  knowledge of what to do with it lives in the module.

- **`Controllers` is composed by explicit spreads.** `createRegistry({...coreControllers,
  ...Ice.controllers, ...Military.controllers})`. One readable line per module, no `flatMap`. Dialogs
  no feature owns (`ColorPicker`, `IconSelector`, `HelpAssistant`, …) stay in the file.

- **Pipeline and layer lists are pointers' targets, not derived.** `generation-pipeline.ts` keeps both
  step lists side by side as reviewed in the pipeline PR; `layers.ts` keeps its `new Layer(...)` list.
  The only change is exporting `GenerationPipelineStepId` so `steps` can be typed.

- **Legacy files load through one shim.** The positional-to-keyed change is one version-gated block
  in `auto-update.ts`, the same shape as the existing `data[50]` backfill. No module knows legacy
  indices.

- **Pilots: Ice and Military.** Ice (~365 lines total) has one step, one layer, one dialog and its own
  key, `pack.ice` → `data.ice`: the minimal full case. Military has one step, one layer, three dialogs
  and no data key: the minimal attached case. Between them every field is exercised once.

## Testing Decisions

- **Unit:** each migrated feature adds a `serialize`/`deserialize` round-trip test beside its
  generator test. `features/index.test.ts` asserts, over the real list, that no two modules share an
  `id` or a controller name.
- **E2E:** extend the existing save/load round trip (same shape as `layers-round-trip.spec.ts`) to a
  map saved with the module loop and reloaded, for one owning and one attached pilot.
- **Not tested:** `Save`, `Load`, `Pipeline` and `LayersRegistry` internals; the module list is
  configuration, like `Controllers` and `Services`.

## Out of Scope

- **Deriving the erase pipeline, or any list, from modules.** Reviewed and rejected in the pipeline
  PR: two explicit lists in one file are easier to align than a derivation.
- **Moving `options.map.<id>` and `style.<id>` schema slices into modules.** Both schemas are already
  typed and keyed by feature; relocating fields is a natural follow-up once `data` has proven the
  shape.
- **Physically colocating a feature's files** under `src/features/<name>/`. Deferred, not rejected:
  once descriptors have settled the boundaries it becomes a mechanical move.
- **Runtime isolation between features.** A module is a description and an IO boundary, not a
  sandbox. `pack`/`grid` stay shared and one generator can read another's output exactly as today.
- **`Layers.state`, `GraphOverride.state`, `options.app`.** Each already has a single owner.

## Further Notes

- **Lineage.** This is the fitted version of the packages architecture PoC (Trello #881). Kept: one
  self-contained description per feature, and a generation process and map state that are a set of
  per-feature parts. Dropped, on the PoC's own cons ("huge work", "complexity", "less freedom"): the
  closed package interface, immutable per-step map state, interchangeable generators and parallelism.
  None of those is foreclosed; none is needed to fix the save array.
- **Attached modules are first-class.** Military and Labels keep their data on the entity that owns
  it. A module without `data` is complete, not half-migrated.
- **Possible future: modules own their data.** Today a module serializes a slice of the shared `pack`;
  the slice could instead live on the module itself, with other features reading it through the
  module rather than through `pack`. That would remove cross-feature reads of shared globals — the
  one PoC benefit this proposal leaves on the table. It is deliberately not decided here: it touches
  every generator and changes how the pipeline passes state, so it needs its own proposal and a
  careful weighing once the descriptor has proven itself.
- **The legacy shim is the riskiest piece** because it is one all-fields translation rather than
  thirty small changes. It should ship, and be tested against real old `.map` files, before the
  positional reader is deleted.
- **Naming.** "Module" already means the generator singletons (`window.Rivers`, "the grid modules")
  and the legacy `public/modules` tree. Prose in this codebase says "feature module" in full;
  code says `FeatureModule`/`FeatureModules`.
