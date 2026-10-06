import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { WeatherSettings } from "./types";

@customElement("mini-display-weather-editor")
export class WeatherEditor extends LitElement {
  @property({ attribute: false }) settings: WeatherSettings = {};
  static styles = css`
    :host {
      display: block;
      font: inherit;
      color: var(--primary-text-color);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 13px;
    }
    select,
    input {
      font: inherit;
      color: inherit;
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 10px;
      min-width: 0;
    }
    .fields {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 16px 0;
    }
    .fields label {
      flex-direction: row;
      align-items: center;
    }
    .presets {
      display: flex;
      gap: 8px;
      margin: 16px 0;
      flex-wrap: wrap;
    }
    button {
      font: inherit;
      color: var(--primary-color);
      background: transparent;
      border: 1px solid var(--divider-color);
      padding: 8px 12px;
      border-radius: 18px;
      cursor: pointer;
    }
    button:focus-visible,
    select:focus-visible,
    input:focus-visible {
      outline: 2px solid var(--primary-color);
    }
  `;
  private patch(changes: Partial<WeatherSettings>) {
    this.dispatchEvent(
      new CustomEvent("weather-changed", {
        detail: { ...this.settings, ...changes },
        bubbles: true,
        composed: true,
      }),
    );
  }
  private choice(
    label: string,
    key: keyof WeatherSettings,
    choices: [string, string][],
    fallback: string,
  ) {
    return html`<label
      >${label}<select
        aria-label=${label}
        @change=${(e: Event) => this.patch({ [key]: (e.target as HTMLSelectElement).value })}
      >
        ${choices.map(([value, name]) => html`<option value=${value} ?selected=${(this.settings[key] ?? fallback) === value}>${name}</option>`)}
      </select></label
    >`;
  }
  private number(
    label: string,
    key: "count" | "offset" | "step",
    fallback: number,
    min: number,
    max: number,
  ) {
    return html`<label
      >${label}<input
        type="number"
        min=${min}
        max=${max}
        step="1"
        .value=${String(this.settings[key] ?? fallback)}
        @change=${(e: Event) => {
        const input = e.target as HTMLInputElement;
        if (input.reportValidity()) this.patch({ [key]: Number(input.value) });
      }}
    /></label>`;
  }
  render() {
    const w = this.settings,
      fields = w.fields ?? ["icon", "condition", "temperature"];
    return html`<div class="grid">
        <label
          >Weather data<select
            aria-label="Weather data"
            @change=${(e: Event) => {
              const period = (e.target as HTMLSelectElement)
                .value as WeatherSettings["period"];
              this.patch({
                period,
                ...(period === "current" ? { offset: 0, count: 1 } : {}),
              });
            }}
          >
            ${[
              ["current", "Current weather"],
              ["daily", "Daily forecast"],
              ["hourly", "Hourly forecast"],
              ["twice_daily", "Day / night forecast"],
            ].map(
              ([value, label]) =>
                html`<option
                  value=${value}
                  ?selected=${(w.period ?? "current") === value}
                >
                  ${label}
                </option>`,
            )}
          </select></label
        >
        ${this.choice(
        "Arrangement",
        "layout",
        [
          ["vertical", "Icon above text"],
          ["horizontal", "Icon beside text"],
          ["compact", "Compact"],
        ],
        "vertical",
      )}
        ${
        (w.period ?? "current") !== "current"
          ? html` ${this.number(w.period === "daily" ? "Start day (0 today, 1 tomorrow)" : w.period === "hourly" ? "Hour offset (0 first available)" : "Period offset (0 current)", "offset", 0, 0, 14)}
            ${this.number("Number of forecasts", "count", 1, 1, 5)}
            ${this.number(w.period === "hourly" ? "Step (hours)" : "Step", "step", 1, 1, 24)}`
          : nothing
      }
        ${this.choice(
        "Icons",
        "iconStyle",
        [
          ["color", "Weather colors"],
          ["mono", "Use text color"],
        ],
        "color",
      )}
        ${this.choice(
        "Descriptions",
        "language",
        [
          ["en", "English"],
          ["pl", "Polski"],
        ],
        "en",
      )}
      </div>
      <div class="presets" aria-label="Weather presets">
        <button @click=${() => this.patch({ fields: ["icon"] })}>
          Icon only
        </button>
        <button
          @click=${() => this.patch({ fields: ["condition", "temperature"] })}
        >
          Text only
        </button>
        <button @click=${() => this.patch({ fields: ["icon", "temperature"] })}>
          Icon + temperature
        </button>
        <button
          @click=${() => this.patch({ fields: ["label", "icon", "condition", "temperature", "low"] })}
        >
          Forecast
        </button>
      </div>
      <div class="fields">
        ${[
      ["icon", "Icon"],
      ["condition", "Description"],
      ["temperature", "Temperature / high"],
      ["low", "Low temperature"],
      ["label", "Time / date"],
      ["humidity", "Humidity"],
      ["precipitation", "Rain probability"],
      ["wind", "Wind speed"],
    ].map(
      ([key, label]) =>
        html`<label>
          <input
            type="checkbox"
            .checked=${fields.includes(key)}
            @change=${(e: Event) => {
        const selected = (e.target as HTMLInputElement).checked;
        const next = selected
          ? [...fields, key]
          : fields.filter((x) => x !== key);
        if (next.length) this.patch({ fields: next });
        else (e.target as HTMLInputElement).checked = true;
      }}
          />${label}</label
        >`,
    )}
      </div>`;
  }
}
