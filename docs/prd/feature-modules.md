# PRD — Feature Modules

## Problem Statement

A map feature — Military, Markers, Ice, Religions, Journeys — already exists as a vertical slice in
practice: a generator, one or more controllers, a renderer, and a slice of `pack`/`options.map`. What
it does not have is a single file that says so. The slice is held together only by a shared filename
prefix (`military-generator.ts`, `military-overview.ts`, `draw-military.ts`) and by hand-written
entries in four unrelated places:

- **`src/generators/generation-pipeline.ts`** — the pipeline step id, at the correct phase, in both
  `GenerationPipeline` and (if it runs after `regraph`) `ErasePipeline`.
- **`src/components/layers.ts`** — the layer id, its `draw`/`erase`, its position in z-order.
- **`src/controllers/index.ts`** — one `Controllers` entry per dialog the feature owns (Military
  alone needs three: `MilitaryOverview`, `RegimentsOverview`, `RegimentEditor`).
- **`src/services/io/save.ts`** / **`src/services/io/load.ts`** — one more slot appended to (or read
  by index from) a 52-element positional array, plus a migration in **`auto-update.ts`** (2083 lines)
  if the shape ever changes.

Nothing enforces that these four stay in sync. `save.ts` and `load.ts` already carry the scar tissue
of that: `data[23]`, `data[28]`, `data[33]`, `data[45]` are permanent empty-string placeholders for
fields nobody can safely reuse, because reusing an index silently reassigns someone else's data.
Adding a field means appending at the end and hoping nobody inserts in the middle; removing one means
leaving a hole forever. There is no compiler or test that would catch a mismatch — the array is
`string[]`, read back by numeric index, documented only in `docs/architecture/data-model.md`'s prose.

There is also no single file a contributor can open to learn "what is the Military feature." The
answer today is: grep for the prefix across three folders and cross-reference `generation-pipeline.ts`
and `layers.ts` by hand.

This is about to get worse, not better, on its own: `docs/architecture/future-data-model.md` already
specifies a `.map` format where `data` is a keyed object (`data.states`, `data.cultures`,
`data.settlements`, …) instead of a positional array. That migration has to rewrite `save.ts`,
`load.ts` and a large slice of `auto-update.ts` regardless of this proposal. Doing that rewrite without
also giving each feature a place to own its own key just reproduces the same "four unrelated files"
problem with better key names.

The same shape of problem already exists, today, in the other two places a feature keeps serializable
state. `src/components/options-schema.ts:128` (`mapSchema`) and `src/generators/styles-schema.ts:57`
(`stylesSchema`) are each one large hand-typed `z.strictObject` literal with one field per feature —
`mapSchema` has `military: z.strictObject({units: ...})` at line 139, `stylesSchema` has its own
`military: z.strictObject({...})` at line 207 — declared nowhere near `military-generator.ts` or
`military-overview.ts`, with nothing tying the three together but the shared string `"military"`. A
contributor adding a config field or a style attribute for a feature edits a monolith file that has
no relationship to the feature's own files, exactly as `save.ts`'s array does for world data.

## Solution

Give every feature a **feature module**: one small descriptor object that names the pieces already
implementing that feature (its pipeline step ids, its `Controllers` keys, its `Layers` id) and, for
each of the three serializable buckets an FMG feature can have, its slice of that bucket:

- **world data** — `data.<id>` in the future `.map` format (`docs/architecture/future-data-model.md`)
- **map config** — `options.map.<id>`, and **generation config** — `options.generation.<id>`
  (`docs/architecture/configuration.md`)
- **style** — `style.<id>` (`docs/architecture/architecture.md`'s Map Styling section, which already
  says style should be "organized by map feature rather than by DOM selector")

A single ordered list, `src/modules/index.ts`, holds one descriptor per feature.

This is deliberately **not** a fourth execution mechanism sitting next to the pipeline runner, the
layers registry and the `Controllers` registry — nor a second options object or a second style
object next to the single ones `configuration.md` and the style migration already specify. Those five
things (pipeline, layers, controllers, options, style) already do their one job well, and
re-implementing any of them inside a module system would create exactly the two-sources-of-truth
problem this codebase already avoids elsewhere. What changes is **authorship**, not mechanism: today
`mapSchema` and `stylesSchema` are each one literal object with one field per feature, typed with no
link back to the feature that owns it. A feature module's `mapConfig`/`generationConfig`/`style`
entries are what compose those single objects, in place of a hand-typed field — `optionsSchema` and
`stylesSchema` become `mergeSchemas(residual, ...Modules.all.map(m => m.mapConfig?.schema))` and the
equivalent for style, rather than a literal with every feature inlined. Validation, "replace not
merge," and the requests-vs-map distinction stay exactly the rules `configuration.md` already states —
only where a field's shape and default are *declared* moves.

What a feature module adds, concretely:

1. **A discoverable inventory.** `Modules.all` lists every feature and what it consists of — the
   answer to "what is Military" (three controllers, a layer, no data key, a config key, a style key)
   becomes one file, not a grep across four.
2. **Ownership of the feature's own serializable state.** `serialize()`/`deserialize(slice)` replace
   the feature's `save.ts` line and `load.ts` line; a `mapConfig`/`generationConfig`/`style` entry
   replaces its hand-typed field in `options-schema.ts` / `styles-schema.ts`. `Save`/`Load`,
   `Options` and `Styles` no longer know individual feature shapes — they compose from `Modules.all`.
3. **A wiring-consistency check**, free from (1): a test asserts every id in `pipelineStepIds`, every
   entry in `controllers`, and `layerId` a module references exists in its real registry, and every
   `mapConfig` / `generationConfig` / `style` key it declares exists, once composed, in the single
   options/style object — catching drift that today only breaks at runtime or gets caught by manual
   review.

Because a module's pipeline step ids, `Controllers` keys and `Layers` id already live in their own
files, a module **references** them without moving anything. Config and style are the one place this proposal
does move code: a feature's `mapSchema`/`stylesSchema` field is presently declared *inside* the
monolith, not beside the feature, so adopting the pattern for a feature means relocating that one
field out of `options-schema.ts`/`styles-schema.ts` into the feature's module file — a small,
mechanical, single-feature move, not a rewrite of either schema. `src/generators/`,
`src/controllers/`, `src/renderers/` keep their current, already-documented, folder-by-role layout
(`docs/architecture/architecture.md`'s Project Structure table is unchanged); writing
`src/modules/military.ts`, deleting the feature's `save.ts`/`load.ts` lines and relocating its two
schema fields is a self-contained, revertible change per feature — which is what makes gradual,
one-feature-at-a-time migration possible instead of a single big-bang cutover.

The three buckets are independent per module — a module may own any subset of
`{data, generationConfig, mapConfig, style}`, never forced to invent one it doesn't need. Not every
feature owns a dedicated data key: regiments live on `state.military`, not at their own `data.*` path,
and Labels are distributed across `state.label`, `burg.label`, `province.label` and
`pack.addedLabels`. Military is the clean example that the buckets don't travel together: it has
**no** `data` key (regiments are serialized as part of the States module) but **does** own
`options.map.military` (unit type definitions, `options-schema.ts:139`) and `style.military`
(`styles-schema.ts:207`) outright. A module with no data of its own is an **attached module** for
that bucket — contributing controllers and a layer, IO for the entity it lives on left to whichever
module owns that entity. This is stated up front because it is the first thing that breaks a naive
"one module, one key everywhere" design.

## User Stories

1. As a contributor adding a feature, I want one file that declares its pipeline step, controllers,
   layer and save/load, so that I don't have to remember to touch four unrelated files.
2. As a contributor reading the codebase, I want `Modules.all` to list every feature with what it
   owns, so that "what is the Military feature" is answered by one file, not a grep.
3. As a contributor, I want a feature module to reference existing files rather than require moving
   them, so that adopting the pattern for an old feature is a small, independent, revertible change.
4. As a maintainer, I want `Save`/`Load` to iterate a module list instead of a hand-maintained
   positional array, so that adding a field never means picking the next free numeric index.
5. As a maintainer, I want removing or renaming a feature's data to be a change in one file, so that
   `save.ts`'s permanent placeholder comments (`data[23]`, `data[28]`, `data[33]`, `data[45]`) stop
   accumulating.
6. As a maintainer, I want a test that fails when a module references a pipeline step, controller or
   layer id that no longer exists, so that renames and removals are caught at test time, not by a
   user's broken save file.
7. As a contributor, I want an "attached module" (owns controllers/layer, no data key of its own) to
   be a first-class, unsurprising case, so that features like Military and Labels don't force an
   artificial data key into existence just to fit the pattern.
8. As a maintainer, I want each module's `serialize`/`deserialize` tested for round-trip like any
   other IO code, so that a feature's save format has the same test discipline `docs/architecture/architecture.md`
   already asks of IO modules generally.
9. As a contributor, I want a feature's map-config and generation-config schema slice and defaults
   declared in its module file instead of inline in `options-schema.ts`, so that a feature's requests,
   settings, world data and style are all findable from one file.
10. As a contributor styling a feature, I want a module's `style` entry to relocate the feature's
    already-typed `stylesSchema` field (`docs/prd/style-migration.md`'s steps 1-4/6/7 already got style
    off SVG attributes and into one typed store) rather than redo that extraction, so that this
    proposal only ever moves an existing field, never repeats finished migration work.
11. As a maintainer, I want the single `optionsSchema` and single `stylesSchema` to be composed from
    module slices plus a shrinking hand-authored residual, so that migrating a feature's config and
    style is exactly as incremental — one feature, one PR — as migrating its save data.
12. As a maintainer, I want the wiring-consistency test to also assert a module's declared
    `mapConfig`/`generationConfig`/`style` keys exist in the composed schema, so a feature's config
    and style can't silently drift from what its module claims to own.
13. As a contributor, I want `docs/architecture/configuration.md`'s validation timing, "replace not
    merge" rule, and requests-vs-map distinction to be completely unchanged by this proposal, so that
    moving config authorship into modules never changes when or how a value is trusted.
14. As a maintainer, I want a module with no config or style of its own (like Ice) to simply omit
    those entries, so that not every feature is forced to invent a shape it doesn't need.
15. As a contributor migrating a feature, I want to migrate it without touching features I didn't
    register yet, so that the codebase spends an extended period with both migrated and
    un-migrated features and neither blocks the other.
16. As a maintainer, I want the legacy positional `.map` array to remain loadable through one
    version-gated compatibility shim in `auto-update.ts`, so that old saves keep working without every
    module re-implementing legacy-format knowledge.
17. As a contributor, I want the module registry to live in its own top-level folder rather than be
    shoehorned into `generators/`, `controllers/`, `renderers/`, `services/` or `components/`, so that
    it isn't mistaken for any one of those roles when it is, by design, metadata that spans all of them.
18. As a maintainer, I want "module" as used here to be textually distinct from the codebase's other
    uses of the word (self-registering generator singletons, the legacy `public/modules/**/*.js`
    tree, "the Grid modules" in `generation-pipeline.md`), so that documentation and code comments
    don't collide in meaning.
19. As a contributor, I want the two pilot modules (one data-owning, one config-and-style-owning) to
    be small and reviewable on their own, so that the pattern is proven across its different axes
    before the remaining ~30 features migrate.
20. As a maintainer, I want this proposal to touch nothing about `Layers.state` or
    `GraphOverride.state` persistence, or about `options.app`, so that it stays scoped to the three
    per-feature buckets and doesn't re-litigate ownership that already has a single, working home.
21. As a contributor, I want a module's `serialize`/`deserialize` to be plain, testable functions with
    no DOM or ambient-global dependency beyond what the feature's generator/controller already use, so
    that IO ownership doesn't become a new place for hidden coupling.
22. As a maintainer, I want the module list itself to be the only new registry, not a parallel
    pipeline or layer ordering, so that generation order and z-order keep their single source of
    truth in `generation-pipeline.ts` and `layers.ts` respectively.

## Implementation Decisions

- **Location:** `src/modules/`, a new top-level folder. It is not `core/` — it has one precise job
  (feature manifests plus `data.*` IO dispatch) and is justified the way
  `docs/architecture/architecture.md`'s "Why no `core/`" section asks: a meaningful name for a
  genuinely foundational, cross-cutting concern, not a junk drawer. One file per feature
  (`src/modules/military.ts`, `src/modules/ice.ts`, …) plus `src/modules/index.ts` holding the
  ordered list and the `Modules` export.

- **Naming disambiguation:** "module" is already used for three other things in this codebase —
  self-registering generator singletons (`window.Rivers`, "the Grid modules" in
  `generation-pipeline.md`), the legacy `public/modules/**/*.js` tree, and nothing about a feature
  boundary. To avoid a fourth meaning colliding with the other three, this proposal calls its unit a
  **feature module** in prose everywhere, and the registry export is `Modules` (not `Features` —
  `pack.features` already means islands/lakes/oceans). Code comments in `src/modules/` should say
  "feature module" on first use per file.

- **Descriptor shape** (illustrative — not the final type, which belongs in the implementation PR).
  `id` is the key in `data.<id>` / `options.map.<id>` / `options.generation.<id>` / `style.<id>`, for
  whichever of those buckets a module owns; purely descriptive for the rest. `pipelineStepIds` is
  plural on purpose: a module can own more than one, non-adjacent, phase of generation — States is the
  clearest real case, with `states`, `stateStatistics`, `stateForms` and `taxes` as four separate ids,
  Routes, Religions, Provinces, Markets and Production running steps *between* them. A module claims
  membership in those ids, never their order — the sequence stays exactly where
  `generation-pipeline.ts` already keeps it, unchanged by this proposal.

  ```ts
  interface SchemaSlice {
    schema: z.ZodType;
    defaults: unknown;
  }

  interface FeatureModule<Id extends string = string> {
    id: Id;

    pipelineStepIds?: PipelineStepId[]; // cross-referenced against generation-pipeline.ts, not re-declared
    controllers?: (keyof typeof Controllers)[]; // cross-referenced against controllers/index.ts
    layerId?: LayerId; // cross-referenced against layers.ts

    data?: { serialize(): unknown; deserialize(slice: unknown): void };
    mapConfig?: SchemaSlice; // -> options.map.<id>
    generationConfig?: SchemaSlice; // -> options.generation.<id>
    style?: SchemaSlice; // -> style.<id>
  }
  ```

  `SchemaSlice` is shared by the three config/style buckets because they're structurally identical — a
  typed shape plus its default value — and differ only in which single object they compose into; the
  field *name* carries that meaning, not the type. Each of `data`/`mapConfig`/`generationConfig`/
  `style` is independently optional. A module with no `data` entry is attached for that bucket: it
  documents and cross-checks its controllers/layer/pipeline steps but leaves world-data IO to whichever
  module owns the entity its data lives on. `id` still exists on every module (for the inventory and
  for tests) even when it names no `data.*` key — Military is `id: "military"` with `mapConfig`/`style`
  entries and no `data` entry at all.

- **`Save`/`Load` become a loop over `Modules.all`.** Today's `prepareMapData()` builds a 52-element
  positional array by hand; `load.ts` reads the same 52 indices back. Once every feature has a
  module, that collapses to:

  ```ts
  const data: Record<string, unknown> = {};
  for (const m of Modules.all) if (m.data) data[m.id] = m.data.serialize();
  ```

  and the symmetric loop on load. This is the concrete mechanism by which this proposal and
  `future-data-model.md`'s keyed `data` object are the same migration, not two.

- **`optionsSchema`/`stylesSchema` become composed, not hand-typed.** `mapSchema` at
  `src/components/options-schema.ts:128` and `stylesSchema` at `src/generators/styles-schema.ts:57`
  are today one `z.strictObject` literal per file, one field per feature. Once every feature that
  needs one has a module, each becomes:

  ```ts
  const mapSchema = z.strictObject({
    ...residualMapSchemaFields, // shrinks to nothing as features migrate; see Migration Plan
    ...Object.fromEntries(Modules.all.filter(m => m.mapConfig).map(m => [m.id, m.mapConfig.schema]))
  });
  ```

  and the equivalent for `optionsSchema.shape.generation` and `stylesSchema`. `Options`'s defaults and
  `Styles`'s `DEFAULT_STYLES` (`src/generators/styles.ts:6`) compose the same way from each module's
  `defaults`. **Nothing about validation, timing, or the replace-not-merge policy changes** —
  `configuration.md`'s principles govern the composed object exactly as they govern today's literal
  one; only where a field's shape and default are declared moves, from the monolith to the feature's
  own file.

- **Non-entity `data` (topology: `grid`/`pack` cell arrays and Voronoi structure) is not a feature
  module.** It has no controller, no layer, and every module reads it — it is the foundation every
  module's `serialize` indexes into, not a feature of its own. It keeps whatever home the
  `future-data-model.md` migration gives it (`data.topology`), owned directly by `Save`/`Load`, not
  by a module. This mirrors `architecture.md`'s own advice to name a foundational bucket
  (`src/state/`) rather than pretend everything is a feature.

- **`Layers.state`, `GraphOverride.state` and `options.app` are untouched.** They already have a
  single, working owner (`LayersRegistry`, `GraphOverride`, the app-preferences section of
  `configuration.md`) that this proposal has no reason to disturb — none of the three is "a feature's
  own state" in the sense `data`/`mapConfig`/`generationConfig`/`style` are. `options.map` and `style`
  *are* in scope, per the Solution section above, but only as composition of what already exists — the
  single objects, their storage location, and every rule in `configuration.md` about them stay as
  documented.

- **Legacy `.map` compatibility is one shim, not N.** The transition from positional array to keyed
  `data` object is itself a breaking format change, gated the same way every other breaking change in
  `auto-update.ts` is: a single `isOlderThan(...)` block maps each of the 52 legacy indices to its new
  module key, once, the same shape as the existing `data[50]`-backfill block described in
  `docs/prd/layers-management.md`. No individual module re-implements legacy-index knowledge; once
  every feature has migrated and the shim has shipped for one full version cycle, the positional
  reader in `load.ts` can be deleted.

- **Wiring-consistency test.** One test (`src/modules/index.test.ts`) iterates `Modules.all` and
  asserts every id in `pipelineStepIds` exists in `GenerationPipeline`'s step list, every entry in
  `controllers` exists in the `Controllers` registry, and every `layerId` exists in `Layers` — plus,
  for the composed buckets, that every `mapConfig`/`generationConfig`/`style` key a module declares
  is present, under that module's `id`, in the composed `optionsSchema`/`stylesSchema`. This is the
  payoff for referencing instead of re-declaring: drift becomes a failing test instead of a runtime
  `undefined` or a config field that silently stopped validating.

## Migration Plan

This is explicitly gradual, feature by feature, in either order — nothing in the design requires
migrating features together, and nothing requires a feature's `data`, `mapConfig`,
`generationConfig` and `style` entries to land in the same PR (a module can grow entries over time,
same as it can be registered with just one). Two pilots are proposed first because, between them, they
cover every axis a module can have except `generationConfig`:

- **Ice** (`src/generators/ice-generator.ts`, `src/controllers/ice-editor.ts`,
  `src/renderers/draw-ice.ts`; ~365 lines total) is the minimal **data-only** case: one generator, one
  controller, one layer, one dedicated data key (`pack.ice` → `data.ice`), no config and no style of
  its own, no cross-feature callers. It proves the descriptor and the `serialize`/`deserialize` →
  `Save`/`Load` wiring end to end at the lowest possible risk.
- **Military** (`src/generators/military-generator.ts`, three controllers —
  `military-overview.ts`, `regiments-overview.ts`, `regiment-editor.ts` — and
  `src/renderers/draw-military.ts`) is the minimal **config-and-style, no-data** case: no dedicated
  data key (regiments live on `state.military`), multiple controllers under one feature, but a real
  `mapConfig` (`options.map.military.units`, today `options-schema.ts:139`) and a real `style`
  (`style.military`, today `styles-schema.ts:207`) to relocate. It proves the no-owned-data path,
  multi-controller aggregation, and the schema-relocation mechanics before either is assumed to
  generalize.

A feature exercising `generationConfig` (for example Cultures or States, whose `growthRate` already
lives in `options.generation` per `configuration.md`'s own example table) is left to the first
post-pilot migration rather than a third dedicated pilot — by that point the schema-composition
mechanism will already be proven for `mapConfig`, and `generationConfig` composes the same way.

Once both pilots land and the wiring-consistency test is in place, the remaining ~30 features
(Markers, Journeys, Measurers, Zones, Goods/Markets/Deals, Religions, Provinces, Routes, …) migrate
one PR at a time, each deleting its `save.ts` line and `load.ts` line, relocating whichever of its
`options-schema.ts`/`styles-schema.ts` fields exist, and adding its `src/modules/<feature>.ts` file.
`save.ts`/`load.ts` carry both the module loop and the shrinking legacy array side by side for the
whole migration, and `options-schema.ts`/`styles-schema.ts` carry both the composed module slices and
a shrinking residual literal; each artifact is deleted only once its residual is empty.

Labels is a second attached case worth naming explicitly: label data already lives on many owning
entities rather than one key, which is the same shape as Military's problem. Whatever the Labels
feature module ends up looking like should follow whatever data/view convention that feature already
settles on, not invent a second one.

## Testing Decisions

- **What makes a good test here:** assert the registry's external behavior against fake modules —
  that `Modules.all` returns them in registration order, that the wiring-consistency check flags a
  reference to a nonexistent pipeline step/controller/layer id, and that the `Save`/`Load` loop calls
  `serialize`/`deserialize` for every module that has them and skips attached modules cleanly. Do not
  assert on `Save`/`Load` internals beyond that loop.
- **Module under test:** the registry list and the consistency check
  (`src/modules/index.test.ts`), built over fake module objects the same way
  `src/components/layers.test.ts` builds its own `LayersRegistry` instance over fake layers rather
  than the real singleton.
- **Per-feature round trip:** each migrated feature keeps its own `serialize`/`deserialize` round-trip
  test alongside its existing generator/controller tests — this is ordinary IO testing per
  `architecture.md`'s IO section, not new policy.
- **E2E:** extend the existing save/load round-trip coverage (the same shape as
  `layers-round-trip.spec.ts`) to cover a map saved by the module loop and reloaded through the
  legacy-array shim, and vice versa, for at least one owning and one attached pilot module.
- **Schema-composition equivalence, during migration only:** each time a `mapConfig`/
  `generationConfig`/`style` field relocates from the monolith into a module, a test asserts the
  composed schema (residual + module slices) is identical, field for field, to what the hand-authored
  schema produced before the move — the migration is required to change authorship, never shape. This
  test is deleted along with the residual once a schema has no fields left to compose against.

## Out of Scope

- **Physically colocating a feature's files** into `src/modules/<feature>/{generator,editor,renderer}.ts`.
  Considered and rejected for this proposal in favor of the lower-disruption descriptor approach;
  nothing here forecloses it later if the descriptor pattern proves the boundaries right.
- **Rewriting the pipeline runner or `LayersRegistry`.** Both are unchanged; feature modules reference
  their ids, they don't replace their ordering logic.
- **Finishing `docs/prd/style-migration.md`'s step 5.** That step (moving each feature's remaining
  hand-picked "decision attributes" — heightmap scheme, halo width, scale-bar geometry, … — off the
  DOM one at a time) is independent of this proposal and already has its own plan; a module's `style`
  entry relocates whatever is already in `stylesSchema` today and does not require step 5 to be
  further along for any given feature first.
- **Changing `docs/architecture/configuration.md`'s validation timing, "replace not merge" policy, or
  the requests-vs-map distinction test.** Those rules govern what a module's `mapConfig`/
  `generationConfig` slice may contain and when it is trusted; this proposal composes the single
  object those rules already describe, it does not rewrite the rules.
- **A big-bang rewrite of `options-schema.ts`/`styles-schema.ts`.** Like `data`, migration is
  field-by-field: a shrinking hand-authored residual sits beside the composed module slices until it's
  empty, mirroring `save.ts`'s legacy array during the same transition.
- **Moving `options.app` (per-browser preferences) into modules.** `configuration.md` already gives
  preferences a home that has nothing to do with a specific map feature; nothing here changes that.
- **Runtime data isolation between modules.** A module boundary here is a code-ownership and IO
  boundary, not a sandbox — the shared `pack`/`grid` globals and the strict generation order in
  `generation-pipeline.md` remain the actual execution dependency graph, and one module's generator
  can still read another's output exactly as today.
- **Migrating every feature in one change.** The point of the descriptor approach is that this never
  has to happen; each feature's migration is its own reviewable PR.
- **A UI or debug panel listing modules.** `Modules.all` being useful for that later is a nice side
  effect, not a deliverable here.

## Possible Future Expansions

Not part of this proposal — v1 stops at descriptors that compose `data`, `options.map`/
`options.generation`, and `style`. They're recorded because the same shape of change keeps recurring
once a module exists, and it's the descriptor's shape specifically (a stable `id`, self-typed schema
slices) that would make each one cheap later, without revisiting an already-migrated module.

**The throughline is inverting the dependency, not just the storage.** Today `Save`/`Load` (and,
pre-migration, `optionsSchema`/`stylesSchema`) know about every feature by name — hand-written code per
feature. After migration they know about none of them: they iterate `Modules.all` and call the same
handful of methods on whichever modules happen to be registered. Adding module #31 means writing
`src/modules/thirty-first-feature.ts` and one line in `src/modules/index.ts` — `Save`, `Load`,
`optionsSchema` and `stylesSchema` need no edit. v1 scopes that inversion to storage. The same
inversion applies, in principle, to anything that today has a bespoke per-feature branch instead of a
loop over feature metadata:

- **A generic module inventory / debug surface.** The cheapest, most literal consumer of
  `Modules.all` — a panel or dev tool listing every registered module and what it owns, with zero
  per-feature code. Worth building first, specifically because it proves the inversion holds before
  betting real UI work on it.
- **A generic settings panel for map config.** `docs/architecture/configuration.md` already states this
  goal independent of modules: "a single planned controller can let users edit *any* value — basic and
  advanced alike — with no bespoke UI per setting," because every parameter is "a named, plainly-typed
  field on one object." A module's `mapConfig`/`generationConfig` schema slice *is* that named, typed
  field, so a panel that renders controls from it (number → slider, enum → select, boolean → toggle)
  would let the options menu stay agnostic to which modules exist — the same inversion `Save`/`Load`
  already get. Realistic for simple scalar/enum fields; a feature whose settings need bespoke
  interaction (adding/removing military unit rows, the label group configurator) keeps a hand-built
  panel and the module says so (e.g. a `customPanel` flag) rather than forcing every field through a
  renderer that can't express it.
- **A generic style editor surface.** Same argument, for `style`: `docs/architecture/architecture.md`'s
  Map Styling section already says each renderer owns "a small typed style shape for its feature,"
  which is exactly what a module's `style` schema slice is. A style-editor panel driven by that schema
  would let feature #31 gain style controls without the Style controller's own code changing.
- **Partial import/export between maps.** Once `data`, `mapConfig` and `style` share one module `id`,
  "bring just the Cultures setup from map A into map B" becomes reading three identically-keyed slices
  from one file and running them through one module's `deserialize` calls — expressible generically
  ("pick a module, pick a target map") instead of a bespoke field list per feature.
- **Feature toggles at generation or export time.** A module is, by the end of migration, the complete
  manifest of what a feature touches. "Generate a map without Military" or "export without Journeys"
  becomes a filter over `Modules.all` — skip the pipeline step and the serialize call — instead of a
  hand-maintained exception list.
- **A per-module `regenerate()` hook.** `docs/architecture/generation-pipeline.md` already states an
  unmet goal — "systems should be independently runnable" — met today only ad hoc
  (`Markets.expandTerritories`, `Population.regenerate()`). A fourth optional descriptor method is a
  small addition once `data`/`mapConfig`/`style` exist and are trusted.
- **Per-module migrations.** Once the legacy positional array and the schema residuals are fully
  retired, a module could own a small version-gated migration for its own key, in its own file, instead
  of one more `isOlderThan(...)` block in the 2083-line `auto-update.ts`. This one specifically has to
  wait for the legacy shim's retirement — `auto-update.ts` needs one place that understands the whole
  file's history until the old format is gone.
- **Physical colocation.** Flagged in Out of Scope above as deferred, not rejected: once descriptors
  have proven the boundaries are right for most of the ~30 features, moving each feature's
  generator/controller/renderer files into `src/modules/<feature>/` becomes a mechanical pass instead
  of a boundary-design exercise done under time pressure.
- **Lazy-loading a feature's generator, not just its controllers.** Only `Controllers` are lazy today;
  generators and renderers are eagerly bundled. For a genuinely rare feature (Ice, Measurers) a module
  that already names its generator cleanly is a much smaller step away from dynamic-importing it than
  today's ad hoc eager graph.

None of this is committed by writing the descriptor — it's what the descriptor's shape leaves open.
The generic-panel items especially are real UI projects, not incidental: they need a field-rendering
component that doesn't exist yet, and today's per-feature editors mix simple fields with bespoke
interaction, so "generic" will always coexist with "custom panel, module opts out." What v1 buys toward
all of it is the one thing that has to be true first — a stable, typed, self-describing slice per
feature that the rest of the app can iterate instead of name.

## Further Notes

- **The wiring-consistency test is the main new correctness guarantee**, not the registry itself —
  the registry's *data* (the list of feature modules) is configuration, same as `Controllers`,
  `Services` and the layer list; what's worth testing is that it stays truthful against the other
  three registries as all four evolve independently.
- **The legacy-array shim is the single riskiest piece of the whole migration**, precisely because it
  is a one-time, all-52-fields translation rather than 30 small independent changes. It deserves the
  same review weight `docs/prd/layers-management.md` gave the `data[50]` backfill block, and should
  ship (and be soak-tested against real old `.map` files) before the legacy array is deleted, not
  bundled into the same change.
- **This does not change the "imports point down" rule.** `src/modules/` sits above generators,
  controllers and renderers in the dependency direction (it imports their exports to build
  descriptors), the same position `controllers/index.ts` and `services/index.ts` already occupy for
  their registries.
- **The schema-composition equivalence test is a second risk on the same order as the legacy-array
  shim**, for the same reason: `z.strictObject` field order and `Object.fromEntries` insertion order
  are both observable if anything downstream ever depended on key order (nothing documented does, but
  the test exists to make that an assertion instead of an assumption) before the residual is ever
  allowed to reach zero.
