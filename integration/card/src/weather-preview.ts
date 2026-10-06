import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { DisplayCard, Hass } from "./types";

const icons = [
  "night",
  "cloudy",
  "fog",
  "hail",
  "lightning",
  "lightning-rainy",
  "partly-cloudy",
  "pouring",
  "rainy",
  "snowy",
  "snowy-rainy",
  "sunny",
  "windy",
  "windy-variant",
  "cloudy-alert",
  "cloudy-alert",
];
const en = [
  "Clear night",
  "Cloudy",
  "Fog",
  "Hail",
  "Thunder",
  "Thunder / rain",
  "Partly cloudy",
  "Heavy rain",
  "Rain",
  "Snow",
  "Sleet",
  "Sunny",
  "Windy",
  "Wind / clouds",
  "Exceptional",
  "Unavailable",
];
const pl = [
  "Pogodna noc",
  "Pochmurno",
  "Mgła",
  "Grad",
  "Burza",
  "Burza / deszcz",
  "Zachmurzenie",
  "Ulewa",
  "Deszcz",
  "Śnieg",
  "Deszcz / śnieg",
  "Słonecznie",
  "Wiatr",
  "Wiatr / chmury",
  "Ekstremalnie",
  "Brak danych",
];
type WeatherResponse = {
  weather: { sources: string[]; temperatureUnit: string; windUnit: string };
  values: Record<string, { state: string; available: boolean }>;
};

@customElement("mini-display-weather-preview")
export class WeatherPreview extends LitElement {
  @property({ attribute: false }) hass?: Hass;
  @property({ attribute: false }) card?: DisplayCard;
  @property() signature = "";
  @state() private data?: WeatherResponse;
  private timer?: number;
  private generation = 0;
  private pending = false;
  static styles = css`
    :host {
      position: absolute;
      inset: 5px;
      display: flex;
      pointer-events: none;
      overflow: hidden;
    }
    .cell {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      flex-direction: column;
    }
    .cell.horizontal {
      flex-direction: row;
    }
    .lines {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 0;
      flex: 1;
      gap: 1px;
      overflow: hidden;
    }
    .line {
      font-size: 12px;
      line-height: 1.2;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .temperature {
      font-size: clamp(13px, 1.5em, 36px);
      font-weight: 600;
    }
    ha-icon {
      --mdc-icon-size: 48px;
      flex-shrink: 0;
    }
    .compact ha-icon {
      --mdc-icon-size: 24px;
    }
    .solo ha-icon {
      --mdc-icon-size: 96px;
    }
  `;
  connectedCallback() {
    super.connectedCallback();
    this.timer = window.setInterval(() => void this.refresh(), 60000);
    void this.refresh();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearInterval(this.timer);
    this.generation++;
  }
  protected updated(changes: PropertyValues) {
    if (changes.has("signature")) {
      this.generation++;
      this.data = undefined;
      void this.refresh();
    }
  }
  private async refresh() {
    if (!this.hass || !this.card?.source || this.pending) return;
    const generation = this.generation;
    this.pending = true;
    try {
      const data = await this.hass.callWS<WeatherResponse>({
        type: "mini_display/weather",
        card: { source: this.card.source, weather: this.card.weather },
      });
      if (this.isConnected && generation === this.generation) this.data = data;
    } catch {
      if (generation === this.generation) this.data = undefined;
    } finally {
      this.pending = false;
      if (this.isConnected && generation !== this.generation)
        void this.refresh();
    }
  }
  render() {
    const w = this.card?.weather ?? {},
      fields = w.fields ?? ["icon", "condition", "temperature"];
    const count = w.period === "current" ? 1 : (w.count ?? 1),
      labels = w.language === "pl" ? pl : en;
    return html`${Array.from({ length: count }, (_, i) => {
      const value = this.data?.values[this.data.weather.sources[i]],
        available = value?.available;
      const f = available ? value.state.split("|") : [],
        code = available ? Number(f[0]) : 15;
      const tempUnit = this.data?.weather.temperatureUnit ?? "",
        windUnit = this.data?.weather.windUnit ?? "";
      const line = (field: string, text: string) =>
        fields.includes(field)
          ? html`<div class="line ${field}" title=${text}>${text}</div>`
          : nothing;
      return html`<div
        class="cell ${w.layout ?? "vertical"} ${fields.length === 1 && fields[0] === "icon" ? "solo" : ""}"
      >
        ${fields.includes("icon") ? html`<ha-icon icon=${`mdi:weather-${icons[code] ?? icons[15]}`} style=${w.iconStyle === "mono" ? "" : `color:${code === 11 ? "#ffff00" : code === 0 ? "#d3d3d3" : code === 4 || code === 5 ? "#ffa500" : "#00ffff"}`}></ha-icon>` : nothing}
        ${
          fields.some((f) => f !== "icon")
            ? html`<div class="lines">
                ${line("label", f[6] || "--")}${line("condition", labels[code] ?? labels[15])}
                ${line("temperature", (f[1] || "--") + tempUnit)}${line("low", "Min " + (f[2] || "--") + tempUnit)}
                ${line("humidity", "RH " + (f[3] || "--") + "%")}${line("precipitation", (w.language === "pl" ? "Deszcz " : "Rain ") + (f[4] || "--") + "%")}
                ${line("wind", (f[5] || "--") + " " + windUnit)}
              </div>`
            : nothing
        }
      </div>`;
    })}`;
  }
}
