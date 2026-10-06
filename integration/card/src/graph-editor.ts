import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { DisplayCard, Graph, Hass } from "./types";
import { newGraph } from "./types";
import "./color-field";
import "./duration-field";

@customElement("mini-display-graph-editor")
export class GraphEditor extends LitElement {
  @property({ attribute: false }) card!: DisplayCard;
  @property({ attribute: false }) hass?: Hass;
  static styles = css`
    :host { display:block; color:var(--primary-text-color); font:inherit; }
    * { box-sizing:border-box; } .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:12px; }
    label { display:grid; gap:6px; font-size:14px; } label.check { display:flex; align-items:center; }
    input,select { width:100%; min-height:40px; border:1px solid var(--divider-color); border-radius:8px; padding:8px; font:inherit; color:inherit; background:var(--card-background-color); }
    input[type=checkbox] { width:auto; min-height:0; } input:focus,select:focus { outline:2px solid var(--primary-color); }
    ha-form { display:block; margin-top:12px; } details { margin-top:12px; } summary { cursor:pointer; }
    .segments { display:flex; gap:4px; }
    .segments button { flex:1; min-height:40px; border:1px solid var(--divider-color); border-radius:8px; background:var(--card-background-color); color:inherit; font:inherit; cursor:pointer; }
    .segments button[aria-pressed=true] { border-color:var(--primary-color); background:var(--primary-color); color:var(--text-primary-color,#fff); }
    button:focus-visible { outline:2px solid var(--primary-color); outline-offset:2px; }
    @media(max-width:450px) { .grid { grid-template-columns:1fr; } }
  `;
  private patchGraph(patch: Partial<Graph>) {
    this.dispatchEvent(new CustomEvent("graph-changed", {detail:{...this.card.graph,...patch}, bubbles:true, composed:true}));
  }
  private numeric(label: string, key: keyof Graph, value: number | undefined, min: number, max: number) {
    return html`<label>${label}<input type="number" min=${min} max=${max} .value=${value === undefined ? "" : String(value)} placeholder="Auto" @change=${(event: Event) => {
      const text = (event.target as HTMLInputElement).value;
      this.patchGraph({[key]: text === "" ? undefined : Math.min(max,Math.max(min,Number(text)))});
    }}></label>`;
  }
  private select(label: string, key: keyof Graph, value: string, choices: [string,string][]) {
    return html`<label>${label}<select aria-label=${label} @change=${(event: Event) => this.patchGraph({[key]:(event.target as HTMLSelectElement).value})}>${choices.map(([id,name])=>html`<option value=${id} .selected=${value===id}>${name}</option>`)}</select></label>`;
  }
  render() {
    const graph = this.card.graph;
    return html`
      ${this.card.type !== "chart" ? html`<label class="check"><input type="checkbox" .checked=${!!graph} @change=${(event: Event)=>this.dispatchEvent(new CustomEvent("graph-changed",{detail:(event.target as HTMLInputElement).checked ? newGraph() : undefined,bubbles:true,composed:true}))}>Background chart</label>` : nothing}
      ${graph ? html`
        ${this.card.type === "number" || this.card.type === "chart" ? html`<label class="check"><input type="checkbox" .checked=${!graph.source} @change=${(event: Event)=>this.patchGraph({source:(event.target as HTMLInputElement).checked ? undefined : this.card.source || ""})}>Use this card’s data</label>`: nothing}
        ${graph.source ? html`<ha-form .hass=${this.hass} .data=${{entity:graph.source}}
          .schema=${[{name:"entity",selector:{entity:{domain:["sensor","number","input_number","counter"]}}}]}
          .computeLabel=${()=>"Chart entity"} @value-changed=${(event: CustomEvent)=>this.patchGraph({source:event.detail.value.entity})}></ha-form>` : nothing}
        <div class="grid">
          <div><label>${this.card.type === "chart" ? "Chart style" : "Background chart style"}</label><div class="segments" role="group" aria-label="Chart type">
            ${([['bar','Columns'],['line','Line']] as const).map(([type,label]) => html`<button type="button" aria-pressed=${(graph.type??'bar')===type} @click=${()=>this.patchGraph({type})}>${label}</button>`)}
          </div></div>
          ${this.select("Aggregation", "aggregation", graph.aggregation ?? "mean", [["mean","Average"],["min","Minimum"],["max","Maximum"],["last","Last value"]])}
          ${this.numeric("Points","points",graph.points ?? 48,2,120)}
          <mini-display-duration-field .seconds=${graph.intervalSeconds ?? 300}
            @duration-changed=${(event: CustomEvent<number>) => this.patchGraph({ intervalSeconds: event.detail })}></mini-display-duration-field>
          <mini-display-color-field label="Color" .value=${graph.color ?? "accent"} @color-changed=${(event: CustomEvent<string>)=>this.patchGraph({color:event.detail || "accent"})}></mini-display-color-field>
          ${this.numeric("Opacity (%)","opacity",graph.opacity ?? 50,0,100)}
        </div>
        ${graph.type === "line" ? html`
          <div class="grid">
            ${this.numeric("Line width","lineWidth",graph.lineWidth ?? 1,1,4)}
            ${this.numeric("Area fill (%)","fillOpacity",graph.fillOpacity ?? 0,0,100)}
          </div>
          <label class="check"><input type="checkbox" .checked=${graph.showPoints ?? false} @change=${(event: Event)=>this.patchGraph({showPoints:(event.target as HTMLInputElement).checked})}>Show points</label>
          ${graph.showPoints ? html`<div class="grid">${this.numeric("Point size","pointSize",graph.pointSize ?? 1,1,4)}</div>` : nothing}
        ` : html`<div class="grid">${this.numeric("Column gap","barGap",graph.barGap ?? 1,0,8)}</div>`}
        <label class="check"><input type="checkbox" .checked=${graph.showValues ?? false} @change=${(event: Event)=>this.patchGraph({showValues:(event.target as HTMLInputElement).checked})}>Show values</label>
        ${graph.showValues ? html`<div class="grid">${this.numeric("Label every N points","labelEvery",graph.labelEvery ?? 6,1,120)}${this.numeric("Decimal places","decimals",graph.decimals ?? 1,0,3)}</div>` : nothing}
        <details><summary>Grid and scale</summary><div class="grid">
          ${this.select("Scale", "scale", graph.scale ?? (graph.type==='line'?'fit':'zero'), [["zero","Include zero"],["fit","Fit to data"]])}
          ${(graph.scale ?? (graph.type==='line'?'fit':'zero')) === "fit" ? this.numeric("Scale padding (%)","scalePadding",graph.scalePadding ?? 5,0,50) : nothing}
          ${this.numeric("Grid lines","gridLines",graph.gridLines ?? 0,0,8)}
          ${graph.gridLines ? this.numeric("Grid opacity (%)","gridOpacity",graph.gridOpacity ?? 20,0,100) : nothing}
          ${graph.gridLines ? html`<mini-display-color-field label="Grid color" .value=${graph.gridColor ?? "muted"} @color-changed=${(event: CustomEvent<string>)=>this.patchGraph({gridColor:event.detail || "muted"})}></mini-display-color-field>` : nothing}
          ${this.numeric("Minimum","minimum",graph.minimum,-1e12,1e12)}
          ${this.numeric("Maximum","maximum",graph.maximum,-1e12,1e12)}
        </div></details>
      `: nothing}`;
  }
}
