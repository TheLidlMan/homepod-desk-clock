import { css, svg, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Graph } from "./types";
import { displayColors } from "./color-field";

export type HistorySeries = {source:string;intervalSeconds:number;points:number;aggregation:string;bucket:number;values:(number|null)[]};

@customElement("mini-display-graph-preview")
export class GraphPreview extends LitElement {
  @property({attribute:false}) graph?: Graph;
  @property() source = "";
  @property({attribute:false}) series: HistorySeries[] = [];
  @property({type:Number}) width = 240;
  @property({type:Number}) height = 80;
  static styles=css`:host{position:absolute;inset:2px;display:block;pointer-events:none}svg{display:block;width:100%;height:100%;overflow:hidden}`;
  render() {
    const graph=this.graph;
    if(!graph) return nothing;
    const data=this.series.find(item=>item.source===(graph.source||this.source) && item.points===(graph.points??48) && item.intervalSeconds===(graph.intervalSeconds??300) && item.aggregation===(graph.aggregation??'mean'));
    if(!data) return nothing;
    const valid=data.values.filter((v):v is number=>v!==null && Number.isFinite(v));
    if(!valid.length) return nothing;
    let low=Math.min(...valid), high=Math.max(...valid);
    if ((graph.scale ?? (graph.type === 'line' ? 'fit' : 'zero')) === 'fit') {
      const padding=Math.max((high-low)*(graph.scalePadding??5)/100,0.01);
      low-=padding; high+=padding;
    } else { low=Math.min(0,low); high=Math.max(0,high); }
    low=graph.minimum??low; high=graph.maximum??high;
    if(high<=low)high=low+0.01;
    const w=Math.max(4,this.width-4), h=Math.max(6,this.height-4), top=graph.showValues?6:0;
    const y=(v:number)=>top+(h-top-1)*(1-Math.max(0,Math.min(1,(v-low)/(high-low))));
    const color=displayColors[graph.color??'accent']??graph.color??'#00ffff';
    const gridColor=displayColors[graph.gridColor??'muted']??graph.gridColor??'#808080';
    const baseline=y(0);
    let previous:{x:number;y:number}|undefined;
    return svg`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="Recorded values">
      ${Array.from({length:graph.gridLines??0},(_,i)=>{
        const py=top+(h-top-1)*(i+1)/((graph.gridLines??0)+1);
        return svg`<line x1="0" y1=${py} x2=${w} y2=${py} stroke=${gridColor} stroke-width="1" opacity=${(graph.gridOpacity??20)/100}/>`;
      })}
      ${data.values.map((v,i)=>{
        if(v===null || !Number.isFinite(v)){previous=undefined;return nothing;}
        const left=i*w/data.points,right=(i+1)*w/data.points,x=graph.type==='line'?i*(w-1)/(data.points-1):(left+right)/2;
        const py=y(v), prior=previous;previous={x,y:py};
        return svg`${graph.type==='line' ? svg`
          ${prior && (graph.fillOpacity??0)>0 ? svg`<polygon points="${prior.x},${baseline} ${prior.x},${prior.y} ${x},${py} ${x},${baseline}" fill=${color} stroke="none" opacity=${(graph.fillOpacity??0)/100}/>`:nothing}
          ${prior ? svg`<line x1=${prior.x} y1=${prior.y} x2=${x} y2=${py} stroke=${color} stroke-width=${graph.lineWidth??1} opacity=${(graph.opacity??50)/100}/>`:svg`<circle cx=${x} cy=${py} r=${Math.max(.6,(graph.lineWidth??1)/2)} fill=${color} opacity=${(graph.opacity??50)/100}/>`}
          ${graph.showPoints ? svg`<circle cx=${x} cy=${py} r=${graph.pointSize??1} fill=${color}/>`:nothing}
        ` : svg`<rect x=${left+Math.min((graph.barGap??1)/2,(right-left-1)/2)} y=${Math.min(py,baseline)} width=${Math.max(1,right-left-(graph.barGap??1))} height=${Math.max(1,Math.abs(baseline-py))} fill=${color} stroke="none" opacity=${(graph.opacity??50)/100}/>`}
        ${graph.showValues && i%(graph.labelEvery??6)===0 ? svg`<text x=${Math.max(10,Math.min(w-10,x))} y=${Math.max(5,py-1)} font-size="5" text-anchor="middle" fill=${color}>${v.toFixed(graph.decimals??1)}</text>`:nothing}`;
      })}
    </svg>`;
  }
}
