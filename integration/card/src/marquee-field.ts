import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Style } from "./types";
import "./duration-field";

@customElement("mini-display-marquee-field")
export class MarqueeField extends LitElement {
  @property({ attribute: false }) value: Style = {};
  @property({ type: Boolean }) defaultEnabled = false;

  static styles = css`
    :host { display: block; font: inherit; color: var(--primary-text-color); }
    .controls { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
    label { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
    mini-display-duration-field { flex: 1 1 150px; max-width: 230px; }
    select { font:inherit; color:inherit; background:var(--card-background-color); border:1px solid var(--divider-color); border-radius:6px; padding:7px; min-height:40px; cursor:pointer; }
    .step { display:grid; gap:6px; cursor:default; }
    .step-field { display:flex; align-items:center; min-height:40px; border:1px solid var(--divider-color); border-radius:8px; background:var(--card-background-color); }
    .step-field:focus-within { outline:2px solid var(--primary-color); }
    .step input { width:54px; border:0; outline:0; padding:8px; color:inherit; background:none; font:inherit; }
    .step-unit { padding-right:9px; color:var(--secondary-text-color); }
  `;

  private patch(value: Partial<Style>) {
    this.dispatchEvent(new CustomEvent("marquee-changed", {
      detail: value, bubbles: true, composed: true,
    }));
  }

  render() {
    const enabled = (this.value.marquee ?? this.defaultEnabled) &&
      (this.value.textFlow ?? "default") === "default";
    return html`<div class="controls">
      <label><ha-switch aria-label="Marquee" .checked=${enabled}
        @change=${(event: Event) => {
          const checked = (event.target as HTMLInputElement).checked;
          this.patch({ marquee: checked, ...(checked ? { textFlow: "default" as const } : {}) });
        }}></ha-switch>Marquee</label>
      ${enabled ? html`<select aria-label="Marquee effect"
        @change=${(event: Event) => this.patch({ marqueeEffect: (event.target as HTMLSelectElement).value as Style["marqueeEffect"] })}>
        <option value="bounce" ?selected=${this.value.marqueeEffect !== "loop"}>Back and forth</option>
        <option value="loop" ?selected=${this.value.marqueeEffect === "loop"}>Loop</option>
      </select><mini-display-duration-field label="Step interval"
        .subsecond=${true} .min=${0.05} .max=${10}
        .seconds=${(this.value.marqueeIntervalMs ?? 100) / 1000}
        @duration-changed=${(event: CustomEvent<number>) =>
          this.patch({ marqueeIntervalMs: Math.round(event.detail * 1000) })}
      ></mini-display-duration-field><label class="step">Step size
        <span class="step-field"><input type="number" inputmode="numeric" min="1" max="16" step="1"
          aria-label="Marquee step size"
          .value=${String(this.value.marqueeStepPixels ?? 1)}
          @change=${(event: Event) => {
            const input = event.target as HTMLInputElement;
            if (!input.reportValidity()) return;
            this.patch({ marqueeStepPixels: Math.round(input.valueAsNumber) });
          }}><span class="step-unit">px</span></span>
      </label>` : nothing}
    </div>`;
  }
}
