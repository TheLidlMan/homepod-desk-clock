import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { NumberValueTransform } from "./types";

@customElement("mini-display-value-transform-editor")
export class ValueTransformEditor extends LitElement {
  @property({ attribute: false }) value?: NumberValueTransform;
  @property({ attribute: false }) onValueChange?: (
    value: NumberValueTransform | undefined,
  ) => void;

  static styles = css`
    :host { display:block; color:var(--primary-text-color); font:inherit; }
    * { box-sizing:border-box; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    label { display:grid; gap:6px; font-size:14px; }
    input,select { width:100%; min-height:40px; border:1px solid var(--divider-color); border-radius:8px; padding:8px; font:inherit; color:inherit; background:var(--card-background-color); }
    input:focus,select:focus { outline:2px solid var(--primary-color); }
    .sign { display:grid; gap:6px; font-size:14px; }
    .segments { display:flex; gap:4px; }
    .segments button { flex:1; min-height:40px; border:1px solid var(--divider-color); border-radius:8px; background:var(--card-background-color); color:inherit; font:inherit; cursor:pointer; }
    .segments button[aria-pressed=true] { border-color:var(--primary-color); background:var(--primary-color); color:var(--text-primary-color,#fff); }
    button:focus-visible { outline:2px solid var(--primary-color); outline-offset:2px; }
    @media(max-width:450px) { .grid { grid-template-columns:1fr; } }
  `;

  private patch(patch: Partial<NumberValueTransform>) {
    const next = { ...this.value, ...patch };
    for (const key of Object.keys(next) as (keyof NumberValueTransform)[]) {
      if (next[key] === undefined) delete next[key];
    }
    this.onValueChange?.(Object.keys(next).length ? next : undefined);
  }

  private number(
    label: string,
    key: "multiply" | "add" | "minimum" | "maximum",
    placeholder: string,
  ) {
    const value = this.value?.[key];
    return html`<label>${label}<input type="number" step="any"
      placeholder=${placeholder} .value=${value === undefined ? "" : String(value)}
      @input=${(event: Event) => {
        const input = event.target as HTMLInputElement;
        this.patch({ [key]: input.value === "" ? undefined : input.valueAsNumber });
      }}></label>`;
  }

  render() {
    const absolute = this.value?.absolute ?? false;
    return html`<div class="grid">
      <label>Precision<select
        @input=${(event: Event) => {
          const value = (event.target as HTMLSelectElement).value;
          this.patch({ precision: value === "source" ? undefined : Number(value) });
        }}>
        <option value="source" ?selected=${this.value?.precision === undefined}>Keep source</option>
        ${[0,1,2,3,4,5,6].map((value) => html`<option value=${value}
          ?selected=${this.value?.precision === value}>${value} decimal${value === 1 ? "" : "s"}</option>`)}
      </select></label>
      <div class="sign">Sign<div class="segments" role="group" aria-label="Number sign">
        <button type="button" aria-pressed=${!absolute}
          @click=${() => this.patch({ absolute: undefined })}>Keep sign</button>
        <button type="button" aria-pressed=${absolute}
          @click=${() => this.patch({ absolute: true })}>Absolute</button>
      </div></div>
      ${this.number("Multiply by", "multiply", "1")}
      ${this.number("Add", "add", "0")}
      ${this.number("Minimum output", "minimum", "No limit")}
      ${this.number("Maximum output", "maximum", "No limit")}
    </div>`;
  }
}
