"""Pure time-weighted aggregation of recorded states."""

import math

def aggregate_history(states, start, end, interval, points, aggregation):
    """Integrate held states; unavailable periods are gaps, never zeroes."""
    totals = [0.0] * points
    durations = [0.0] * points
    values = [None] * points
    for index, state in enumerate(states):
        left = max(start, state.last_updated.timestamp())
        right = min(end, states[index + 1].last_updated.timestamp() if index + 1 < len(states) else end)
        try:
            value = float(state.state)
        except (ValueError, TypeError):
            continue
        if not math.isfinite(value) or abs(value) > 3.4028234e38:
            continue
        while left < right:
            slot = int((left - start) // interval)
            if slot < 0 or slot >= points:
                break
            edge = min(right, start + (slot + 1) * interval)
            duration = edge - left
            if aggregation == "mean":
                totals[slot] += value * duration
                durations[slot] += duration
                values[slot] = totals[slot] / durations[slot]
            elif values[slot] is None or aggregation == "last":
                values[slot] = value
            elif aggregation == "min":
                values[slot] = min(values[slot], value)
            else:
                values[slot] = max(values[slot], value)
            left = edge
    return [round(value, 5) if value is not None else None for value in values]
