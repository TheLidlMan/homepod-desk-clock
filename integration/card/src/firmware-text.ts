import {css, html, LitElement} from "lit";
import {property} from "lit/decorators.js";
import data from "./firmware-fonts.generated.json";

type Font = {height:number; ascent:number; space:number; smooth:boolean; glyphs:Record<string,number[]>; atlas:string};
const fonts = data as Record<string, Font>;
const images = new Map<number, Promise<HTMLImageElement>>();
export const firmwareFontHeight = (size:number) => fonts[size]?.height ?? size;
export function firmwareTextWidth(text:string, size:number) {
  const font = fonts[size];
  if (!font) return 0;
  const characters = [...text];
  let width = 0;
  characters.forEach((character, index) => {
    if (character === ' ' && font.smooth) { width += font.space; return; }
    const glyph = font.glyphs[character.codePointAt(0)!];
    if (!glyph) { if (font.smooth) width += font.space + 1; return; }
    if (font.smooth && width === 0 && glyph[5] < 0) width -= glyph[5];
    width += index < characters.length - 1 ? glyph[4] : glyph[5] + glyph[2];
  });
  return width;
}

class FirmwareText extends LitElement {
  @property() text = '';
  @property({type:Number}) size = 13;
  @property() color = '#d3d3d3';
  private generation = 0;
  static styles = css`:host {display:block; pointer-events:none} canvas {display:block; max-width:none; image-rendering:pixelated}`;
  render() {
    return html`<canvas aria-hidden="true" width=${Math.max(1, firmwareTextWidth(this.text, this.size))} height=${firmwareFontHeight(this.size)}></canvas>`;
  }
  updated() { void this.paint(); }
  private async paint() {
    const generation = ++this.generation;
    const font = fonts[this.size];
    if (!font) return;
    if (!images.has(this.size)) images.set(this.size, new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = font.atlas;
    }));
    const image = await images.get(this.size)!;
    if (generation !== this.generation || !this.isConnected) return;
    const canvas = this.shadowRoot!.querySelector('canvas')!;
    const context = canvas.getContext('2d')!;
    context.clearRect(0,0,canvas.width,canvas.height);
    let x = 0;
    for (const character of this.text) {
      if (character === ' ' && font.smooth) { x += font.space; continue; }
      const glyph = font.glyphs[character.codePointAt(0)!];
      if (!glyph) { if (font.smooth) x += font.space + 1; continue; }
      const [sx,sy,w,h,advance,dx,dy] = glyph;
      if (font.smooth && x === 0 && dx < 0) x -= dx;
      if (w && h) context.drawImage(image,sx,sy,w,h,x+dx,font.ascent+dy,w,h);
      x += advance;
    }
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = this.color;
    context.fillRect(0,0,canvas.width,canvas.height);
    context.globalCompositeOperation = 'source-over';
  }
}
customElements.define('mini-display-firmware-text', FirmwareText);
