# Dashboard format

[dashboard.schema.json](dashboard.schema.json) is the version 1 contract shared
by the editor, integrations and firmware. The device serves the same schema at
`/schema/dashboard.schema.json`.

## Layout

- A dashboard contains ordered pages with configurable durations and transitions.
- `layout: "rows"`: row `weight` divides available height; cards share row width.
  Use positive integer weights.
- `layout: "free"`: each card has a percentage-based `frame` (`x`, `y`, `width`,
  `height`). Optional `titleFrame` and `valueFrame` position text independently.
- `showTitle: false` hides a title without deleting its name.
  `enabled: false` skips a page without deleting it.
- Styles, images, value mappings and visibility rules are defined in the schema.
  Free-layout text fits its frame rather than using the stored semantic font size.

## Data

`source` is an arbitrary key, not necessarily a Home Assistant entity ID.
Static text uses `text` instead. Send current values with `PATCH /api/v1/data`:

```json
{"values":{"power":{"state":"156","available":true}},"render":true}
```

`GET /api/v1/data` returns all retained values and histories.
`GET /api/v1/data/latest` returns only the last received payload.
These endpoints use panel/API authentication when protection is enabled.

## Charts

Charts can be separate cards or backgrounds behind values. Configure line/bar
style, color, opacity, point count, bucket duration and aggregation.
`scale: "zero"` includes zero; `scale: "fit"` emphasizes changes by fitting the range.

HA supplies Recorder history every minute and on resynchronization. Standalone
clients can send the same snapshot format alongside values:

```json
{"values":{},"series":{"source":"power","points":3,"intervalSeconds":120,"aggregation":"mean","bucket":15000000,"values":[120,null,156]},"render":true}
```

The series must match a configured graph. Values run oldest to newest, including
the current partial bucket. Its UTC start is `bucket * intervalSeconds`.
Missing values are `null`, not zero. HA's `mean` is time-weighted; `min`, `max`
and `last` use recorded states. Recorder retention limits available history.

The display stores snapshots in RAM, not flash. Each series allocates its actual
point count, up to 120 points; identical histories share a buffer. There is no
fixed four-history limit. Configuration allocation keeps an 8 KiB free-heap
reserve and preserves previous histories if allocation fails. Dashboard and
request-size limits still apply.

Invalid history snapshots return 422 without replacing existing data. Busy
animation handling can return 503; retry later. Invalid dashboard uploads do
not replace the saved dashboard.
