import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";

export const displayColors: Record<string, string> = {
  background: "#000000",
  surface: "#1e222a",
  primary: "#ffffff",
  secondary: "#9e9e9e",
  muted: "#666666",
  accent: "#00ffff",
  success: "#00ff00",
  warning: "#ffa500",
  error: "#ff0000",
};

export class MiniDisplayColorField extends LitElement {
  @property() label = "Color";
  @property() value = "";
  @property({type: Boolean, reflect: true}) disabled = false;

  static styles = css`
    :host { display: grid; gap: 5px; color: var(--secondary-text-color); font: 12px var(--ha-font-family-body,Roboto,sans-serif); }
    .control { display: grid; grid-template-columns: minmax(0,1fr) 42px; gap: 8px; }
    select, input { width: 100%; min-height: 40px; color: var(--primary-text-color); background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 8px; }
    select { padding: 8px; font: inherit; font-size: 14px; }
    input { height: 40px; padding: 3px; cursor: pointer; }
    :host([disabled]) { opacity: .5; }
    :disabled { cursor: not-allowed; }
  `;

  render() {
    const custom = this.value.startsWith("#");
    const option = custom ? "custom" : this.value || "default";
    return html`
      <span>${this.label}</span>
      <div class="control">
        <select .value=${option} ?disabled=${this.disabled} @change=${this.selectColor}>
          <option value="default">Default</option>
          <option value="background">Black</option>
          <option value="surface">Charcoal</option>
          <option value="primary">White</option>
          <option value="secondary">Light gray</option>
          <option value="muted">Gray</option>
          <option value="accent">Cyan</option>
          <option value="success">Green</option>
          <option value="warning">Orange</option>
          <option value="error">Red</option>
          <option value="custom">Custom</option>
        </select>
        <input type="color" aria-label="Custom color" .value=${custom ? this.value : displayColors[option] ?? "#ffffff"} ?disabled=${this.disabled || !custom} @input=${this.customColor}>
      </div>
    `;
  }

  private selectColor(event: Event) {
    const selected = (event.target as HTMLSelectElement).value;
    this.emit(selected === "default" ? "" : selected === "custom" ? "#ffffff" : selected);
  }

  private customColor(event: Event) {
    this.emit((event.target as HTMLInputElement).value);
  }

  private emit(value: string) {
    if (this.disabled) return;
    this.dispatchEvent(new CustomEvent("color-changed", { detail: value, bubbles: true, composed: true }));
  }
}

if (!customElements.get("mini-display-color-field")) {
  customElements.define("mini-display-color-field", MiniDisplayColorField);
}
