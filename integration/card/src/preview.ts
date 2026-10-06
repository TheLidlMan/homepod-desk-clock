import { html, LitElement, nothing } from "lit";
import { marqueeEnabled, marqueeMotion } from "./preview-marquee";
import { property, state } from "lit/decorators.js";
import type { Dashboard, Hass, ImageAsset } from "./types";
import type { HistorySeries } from "./graph-preview";
import "./graph-preview";
import "./weather-preview";
import { mapCardColors, mapCardValue, transformCardNumber } from "./types";
import { visibilityMatches } from "./visibility";
import { displayColors } from "./color-field";
import {firmwareTextWidth} from "./firmware-text";
import { freeTextFrame, type FreePart } from "./free-text";
import { previewStyles } from "./preview-styles";
import { PreviewTypography } from "./preview-typography";
import { PreviewInteraction } from "./preview-interaction";

export class MiniDisplayPreview extends LitElement {
  @property({ attribute: false }) dashboard?: Dashboard;
  @property({ attribute: false }) hass?: Hass;
  @property({ attribute: false }) assets: ImageAsset[] = [];
  @property({ type: Number }) page = 0;
  @property({ type: Boolean }) autoRotate = false;
  @property({ type: Number }) width = 240;
  @property({ type: Number }) height = 240;
  @property({ type: Number }) refreshRateHz = 60;
  @property() displayId = "";
  @property({ type: Boolean }) interactive = false;
  @property({ type: Boolean }) showHidden = false;
  @state() private now = new Date();
  @state() autoPage = 0;
  private clockTimer?: number;
  private pageShownAt = Date.now();
  @state() private historySeries: HistorySeries[] = [];
  private historyPending = false;
  private historyFetched = 0;

  private interaction = new PreviewInteraction(this);
  private typography = new PreviewTypography();
  static styles = previewStyles;

  connectedCallback() {
    super.connectedCallback();
    this.clockTimer = window.setInterval(() => {
      this.now = new Date();
      if (Date.now()-this.historyFetched>30000) void this.fetchData();
      const pages = this.dashboard?.pages ?? [];
      const duration = (pages[this.autoPage]?.durationSeconds ?? 10) * 1000;
      if (
        this.autoRotate &&
        pages.length > 1 &&
        Date.now() - this.pageShownAt >= duration
      ) {
        this.autoPage = (this.autoPage + 1) % pages.length;
        this.pageShownAt = Date.now();
      }
    }, 1000);
  }
  disconnectedCallback() {
    window.clearInterval(this.clockTimer);
    super.disconnectedCallback();
  }

  emit(type: string, detail: Record<string, unknown>) {
    this.dispatchEvent(
      new CustomEvent(type, {
        detail: {
          displayId: this.displayId,
          page: this.autoRotate ? this.autoPage : this.page,
          ...detail,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private cardValue(
    card: Dashboard["pages"][number]["rows"][number]["cards"][number],
  ) {
    if (card.type === "image" || card.type === "chart" || card.type === "weather") return "";
    if (card.type === "clock")
      return this.now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: card.showSeconds ? "2-digit" : undefined,
        hour12: card.format === "12h",
      });
    const raw = card.source
      ? (this.hass?.states[card.source]?.state ?? "-")
      : (card.text ?? "-");
    if (card.type === "status")
      return ["on", "true", "1", "open", "home"].includes(raw.toLowerCase())
        ? (card.onText ?? "On")
        : (card.offText ?? "Off");
    const mapped = mapCardValue(card, raw);
    return `${mapped.value}${!mapped.mapped && card.unit ? card.unit : ""}`;
  }

  private imageUrl(id?: string) {
    return this.assets.find((asset) => asset.id === id)?.preview ?? "";
  }

  private async fetchData() {
    if(!this.hass || !this.displayId || this.historyPending) return;
    this.historyFetched=Date.now();
    if(!this.dashboard?.pages.some(page=>page.rows.some(row=>row.cards.some(card=>card.graph))))return;
    this.historyPending=true;
    try {
      const response=await this.hass.callWS<{series:HistorySeries[]}>({type:'mini_display/data',config_entry_id:this.displayId});
      if(this.isConnected)this.historySeries=response.series;
    } catch { /* Retain the last successful history while the display reconnects. */ }
    finally {this.historyPending=false;}
  }

  render() {
    const page =
      this.dashboard?.pages[this.autoRotate ? this.autoPage : this.page];
    const screenStyle = `aspect-ratio:${Math.max(1, this.width)}/${Math.max(1, this.height)}`;
    if (!page)
      return html`<div class="screen-frame" style=${screenStyle}>
        <div class="screen loading" aria-label="Loading display preview"></div>
      </div>`;
    const free=page.layout==='free';
    const rows = page.rows
      .map((row, rowIndex) => {
        const rowVisible = visibilityMatches(this.hass, row.visibility);
        const cards = row.cards
          .map((card, cardIndex) => ({
            card,
            cardIndex,
            hidden:
              !rowVisible ||
              !visibilityMatches(this.hass, card.visibility, card),
          }))
          .filter(({ hidden }) => this.showHidden || !hidden);
        return { row, rowIndex, hidden: !rowVisible, cards };
      })
      .filter(({ cards }) => cards.length > 0);
    if (rows.length === 0 && !free)
      return html`<div class="screen-frame" style=${screenStyle}>
        <div class="screen">
          <div class="card"><div class="value">No visible content</div></div>
        </div>
      </div>`;
    const showPageTitle = !free && Boolean(page.title && page.showTitle !== false);
    const titlePosition = page.titlePosition ?? "top";
    const pageBackgroundValue = page.style?.background ?? "";
    const pageBackground =
      (displayColors[pageBackgroundValue] ?? pageBackgroundValue) || "#000000";
    const titleBackgroundValue = page.titleStyle?.background ?? "";
    const titleForegroundValue = page.titleStyle?.foreground ?? "";
    const titleBackground =
      (displayColors[titleBackgroundValue] ?? titleBackgroundValue) ||
      pageBackground;
    const titleForeground =
      (displayColors[titleForegroundValue] ?? titleForegroundValue) ||
      "#ffffff";
    const titleSize = page.titleStyle?.fontSize ?? "small";
    const titleThickness = {
      small: 25,
      medium: 32,
      large: 46,
      xlarge: 61,
      auto: 25,
    }[titleSize];
    const titleFontSize = {
      small: 18,
      medium: 24,
      large: 36,
      xlarge: 48,
      auto: 18,
    }[titleSize];
    const horizontalTitle =
      showPageTitle && (titlePosition === "top" || titlePosition === "bottom")
        ? titleThickness
        : 0;
    const verticalTitle =
      showPageTitle && (titlePosition === "left" || titlePosition === "right")
        ? titleThickness
        : 0;
    const contentWidth = this.width - 12 - verticalTitle;
    const availableRowsHeight =
      this.height - 12 - horizontalTitle - 4 * Math.max(0, rows.length - 1);
    const totalWeight =
      rows.reduce((sum, item) => sum + (item.row.weight ?? 1), 0) || 1;
    const contentStyle = !showPageTitle
      ? "inset:6px"
      : titlePosition === "top"
        ? `top:${titleThickness + 6}px;right:6px;bottom:6px;left:6px`
        : titlePosition === "bottom"
          ? `top:6px;right:6px;bottom:${titleThickness + 6}px;left:6px`
          : titlePosition === "left"
            ? `top:6px;right:6px;bottom:6px;left:${titleThickness + 6}px`
            : `top:6px;right:${titleThickness + 6}px;bottom:6px;left:6px`;
    const pageImage = this.imageUrl(page.backgroundImage);
    const titleStyle = `${titlePosition === "top" || titlePosition === "bottom" ? `height:${titleThickness}px` : `width:${titleThickness}px`};background:${titleBackground};color:${titleForeground};font-size:${titleFontSize}px`;
    return html`<div class="screen-frame" style=${screenStyle}>
      <div
        class="screen"
        style=${`background-color:${pageBackground};${pageImage ? `background-image:url(${pageImage});background-size:cover;background-position:center` : ""}`}
      >
        ${
          showPageTitle
            ? html`<div
                class="page-title ${titlePosition} ${this.interactive ? "interactive" : ""}"
                style=${titleStyle}
                @click=${(event: Event) => {
                  event.stopPropagation();
                  this.emit("preview-select", { kind: "page-title" });
                }}
              >
                <span
                  .draggable=${this.interactive}
                  @dragstart=${(event: DragEvent) => this.interaction.startDrag(event, { kind: "page-title" })}
                  @dragend=${() => this.interaction.stopDrag()}
                  >${page.title}</span
                >
              </div>`
            : null
        }${this.interaction.pageDropzones()}
        <div class="page-content ${free?'free-layout':''}" style=${free?'inset:0':contentStyle}>
          ${rows.map(({ row, rowIndex, hidden: rowHidden, cards }) => {
            const rowHeight =
              (availableRowsHeight * (row.weight ?? 1)) / totalWeight;
            const cardHeight =
              rowHeight -
              (row.title && row.showTitle !== false && rowHeight >= 24
                ? 17
                : 0);
            const cardWidth =
              (contentWidth - 4 * Math.max(0, cards.length - 1)) / cards.length;
            return html`<div
              class="group ${rowHidden ? "hidden-item" : ""}"
              style="flex:${row.weight ?? 1}"
            >
              ${
                row.title && row.showTitle !== false
                  ? html`<div
                      class="title ${this.interactive ? "interactive" : ""}"
                      @click=${(event: Event) => {
                        event.stopPropagation();
                        this.emit("preview-select", {
                          kind: "row",
                          row: rowIndex,
                        });
                      }}
                    >
                      ${row.title}
                    </div>`
                  : null
              }
              <div
                class="row"
                style="grid-template-columns:repeat(${cards.length},minmax(0,1fr))"
              >
                ${cards.map(({ card, cardIndex, hidden }) => {
                  const moving=this.interaction.freeDrag?.row===rowIndex && this.interaction.freeDrag.card===cardIndex;
                  const frame=moving && this.interaction.freeDrag!.part === "card"?this.interaction.freeDrag!.frame:card.frame;
                  const partFrame = (part: FreePart) => moving && this.interaction.freeDrag!.part === part ? this.interaction.freeDrag!.frame : freeTextFrame(card, part);
                  const titleFrame = partFrame("title"), valueFrame = partFrame("value");
                  const partArea = (part: FreePart) => {
                    const box = partFrame(part);
                    return `left:${(box.x-(frame?.x??0))*this.width/100}px;top:${(box.y-(frame?.y??0))*this.height/100}px;width:${box.width*this.width/100}px;height:${box.height*this.height/100}px;`;
                  };
                  const cardWidth=free?(frame?.width??50)*this.width/100:(contentWidth-4*Math.max(0,cards.length-1))/cards.length;
                  const cardHeight=free?(frame?.height??25)*this.height/100:rowHeight-(row.title && row.showTitle!==false && rowHeight>=24?17:0);
                  const raw = card.source
                    ? (this.hass?.states[card.source]?.state ?? "-")
                    : (card.text ?? "-");
                  const numeric = transformCardNumber(card, raw);
                  const min = card.minimum ?? 0;
                  const max = card.maximum ?? 100;
                  const progress =
                    Number.isFinite(numeric) && max > min
                      ? Math.max(
                          0,
                          Math.min(100, ((numeric - min) / (max - min)) * 100),
                        )
                      : 0;
                  const family = "sans-serif";
                  const displayValue = this.cardValue(card);
                  const hasTitle = Boolean(
                    card.title && card.showTitle !== false && (free || cardHeight >= 28),
                  );
                  const titleVerticalKey =
                    card.titleStyle?.verticalAlign ?? "top";
                  const reservesTitle =
                    hasTitle &&
                    (titleVerticalKey === "top" ||
                      titleVerticalKey === "bottom");
                  const baseContentBottom = card.progress === "bar" ? 14 : 5;
                  const contentHeight =
                    cardHeight - (card.progress === "bar" ? 9 : 0);
                  const provisionalValueSize = this.typography.valueFontSize(
                    card,
                    displayValue,
                    cardWidth,
                    Math.max(1, contentHeight - 17),
                  );
                  const maximumTitleHeight = (card.titleStyle?.fontSize ?? "auto") !== "auto" ? contentHeight : Math.max(
                    1,
                    Math.min(
                      contentHeight / 2,
                      contentHeight - this.typography.fontLineHeight(provisionalValueSize),
                    ),
                  );
                  const titleSize = free ? this.typography.freeFontSize(card.title ?? "", card.titleStyle, titleFrame.width*this.width/100, titleFrame.height*this.height/100, marqueeEnabled(card.titleStyle, true)) : hasTitle
                    ? this.typography.titleFontSize(
                        card,
                        card.title ?? "",
                        cardWidth - 10,
                        reservesTitle ? maximumTitleHeight : contentHeight,
                        provisionalValueSize,
                      )
                    : 13;
                  const titleBand = reservesTitle && card.titleStyle?.textFlow === "wrap" ? maximumTitleHeight : reservesTitle
                    ? Math.min(
                        maximumTitleHeight,
                        this.typography.fontLineHeight(titleSize),
                      )
                    : 0;
                  const valueHeight =
                    card.progress === "ring"
                      ? Math.min(
                          22,
                          Math.max(12, (contentHeight - titleBand) / 4),
                        )
                      : contentHeight - titleBand;
                  const size = free ? this.typography.freeFontSize(displayValue, card.valueStyle, valueFrame.width*this.width/100, valueFrame.height*this.height/100, marqueeEnabled(card.valueStyle, card.type === "text")) : this.typography.valueFontSize(
                    card,
                    displayValue,
                    cardWidth,
                    valueHeight,
                  );
                  const colorMapping = mapCardColors(card, raw);
                  const backgroundValue =
                    colorMapping?.background ?? card.style?.background ?? "";
                  const foregroundValue =
                    colorMapping?.foreground ?? card.style?.foreground ?? "";
                  const background =
                    (displayColors[backgroundValue] ?? backgroundValue) ||
                    "#20242d";
                  const backgroundMode =
                    card.backgroundMode ??
                    (card.transparentBackground
                      ? "transparent"
                      : card.backgroundImage
                        ? "image"
                        : "color");
                  const cardImage = this.imageUrl(
                    card.type === "image"
                      ? card.image
                      : backgroundMode === "image"
                        ? card.backgroundImage
                        : undefined,
                  );
                  const accent =
                    displayColors[card.style?.accent ?? ""] ??
                    card.style?.accent ??
                    "#42a5f5";
                  const foreground =
                    (displayColors[foregroundValue] ?? foregroundValue) ||
                    "white";
                  const horizontal = {
                    left: "flex-start",
                    center: "center",
                    right: "flex-end",
                  }[card.valueStyle?.horizontalAlign ?? "center"];
                  const vertical = {
                    top: "flex-start",
                    middle: "center",
                    bottom: "flex-end",
                  }[card.valueStyle?.verticalAlign ?? "middle"];
                  const textAlign =
                    card.valueStyle?.horizontalAlign ?? "center";
                  const titleHorizontal = {
                    left: "flex-start",
                    center: "center",
                    right: "flex-end",
                  }[card.titleStyle?.horizontalAlign ?? "left"];
                  const titleVertical = {
                    top: "flex-start",
                    middle: "center",
                    bottom: "flex-end",
                  }[titleVerticalKey];
                  const valueTop =
                    5 + (titleVerticalKey === "top" ? titleBand : 0);
                  const valueBottom =
                    baseContentBottom +
                    (titleVerticalKey === "bottom" ? titleBand : 0);
                  const valueArea = free ? partArea("value") : `top:${valueTop}px;right:5px;bottom:${valueBottom}px;left:5px`;
                  const titleArea = free ? partArea("title") :
                    titleVerticalKey === "top"
                      ? `top:0;right:4px;height:${titleBand}px;left:4px`
                      : titleVerticalKey === "bottom"
                        ? `right:4px;bottom:${card.progress === "bar" ? 9 : 0}px;height:${titleBand}px;left:4px`
                        : `top:0;right:4px;bottom:${card.progress === "bar" ? 9 : 0}px;left:4px`;
                  const titleOverflow = card.title
                    ? Math.max(
                        0,
                        firmwareTextWidth(card.title, titleSize) -
                          (free ? titleFrame.width*this.width/100 - 8 : cardWidth - 8),
                      )
                    : 0;
                  const titleMarquee = marqueeEnabled(card.titleStyle, true) && titleOverflow > 0;
                  const valueOverflow = Math.max(0, firmwareTextWidth(displayValue, size) -
                    (free ? valueFrame.width*this.width/100 - 8 : cardWidth - 8));
                  const valueMarquee = marqueeEnabled(card.valueStyle, free && card.type === "text") && valueOverflow > 0;
                  const valueContent = free && ["default", "sans", "sans-bold"].includes(card.valueStyle?.fontFamily ?? "default") && card.valueStyle?.textFlow !== "wrap" && (!card.valueStyle?.textEffect || card.valueStyle.textEffect === "none")
                      ? html`<mini-display-firmware-text .text=${displayValue} .size=${size} .color=${foreground}></mini-display-firmware-text>`
                      : displayValue;
                  const cardTitleColor = colorMapping?.foreground ?? card.titleStyle?.foreground ?? foreground;
                  const titleContent = ["default","sans","sans-bold"].includes(card.titleStyle?.fontFamily ?? "default") && card.titleStyle?.textFlow !== "wrap" && (!card.titleStyle?.textEffect || card.titleStyle.textEffect === "none")
                      ? html`<mini-display-firmware-text .text=${card.title ?? ""} .size=${titleSize} .color=${displayColors[cardTitleColor] ?? cardTitleColor}></mini-display-firmware-text>`
                      : card.title;
                  const value = html`<div
                    class="value ${valueMarquee ? "marquee" : ""}"
                    ${marqueeMotion(valueMarquee ? (card.valueStyle?.marqueeEffect === "loop" ? firmwareTextWidth(displayValue, size) + 24 : valueOverflow) : 0, card.valueStyle, displayValue, this.refreshRateHz)}
                    .draggable=${this.interactive}
                    style=${`font-family:${family};font-size:${size}px;font-weight:700;${this.typography.textEffectCss(card.valueStyle)};${this.typography.textFlowCss(card.valueStyle,size)}`}
                    @click=${(event: Event) => {
                      event.stopPropagation();
                      this.emit("preview-select", {
                        kind: "value",
                        row: rowIndex,
                        card: cardIndex,
                      });
                    }}
                    @dragstart=${(event: DragEvent) => this.interaction.startDrag(event, { kind: "value", row: rowIndex, card: cardIndex })}
                    @dragend=${() => this.interaction.stopDrag()}
                  >
                    <span class="marquee-copy">${valueContent}</span>
                    ${valueMarquee && card.valueStyle?.marqueeEffect === "loop" ? html`<span class="marquee-copy" aria-hidden="true">${valueContent}</span>` : nothing}
                  </div>`;
                  const textOnlyFrame = free && (page.transparentCards || backgroundMode === "transparent") && !card.graph && card.type !== "image";
                  return html`<div
                    class="card ${textOnlyFrame ? 'text-only-frame' : ''} ${card.valueStyle?.textFlow === 'overflow' || card.titleStyle?.textFlow === 'overflow' ? 'flow-overflow' : ''} ${moving?'moving':''} ${card.type === "image" ? "image-card" : ""} ${this.interactive ? "interactive" : ""} ${hidden && !rowHidden ? "hidden-item" : ""}"
                    data-row=${rowIndex} data-card=${cardIndex}
                    tabindex=${free && this.interactive ? 0 : -1}
                    aria-label=${card.title || card.text || card.source || 'Item'}
                    @keydown=${(event: KeyboardEvent)=>{
                      if(!free || !frame || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
                      event.preventDefault();
                      const step=event.shiftKey?5:.5;
                      this.emit('preview-frame',{row:rowIndex,card:cardIndex,frame:{...frame,x:Math.max(0,Math.min(100-frame.width,frame.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0))),y:Math.max(0,Math.min(100-frame.height,frame.y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)))}});
                    }}
                    style=${`${free && frame?`left:${frame.x}%;top:${frame.y}%;width:${frame.width}%;height:${frame.height}%;`:''}${page.transparentCards || backgroundMode === "transparent" ? "background:transparent" : `background-color:${background}`};${!page.transparentCards && cardImage ? `background-image:url(${cardImage});background-size:${card.imageFit === "contain" ? "contain" : card.imageFit === "stretch" ? "100% 100%" : "cover"};background-position:center;background-repeat:no-repeat;` : ""}color:${foreground}`}
                    @click=${(event: Event) => {
                      event.stopPropagation();
                      this.emit("preview-select", {
                        kind: "card",
                        row: rowIndex,
                        card: cardIndex,
                      });
                    }}
                  >
                    ${card.graph?html`<mini-display-graph-preview .graph=${card.graph} .source=${card.source??''} .series=${this.historySeries} .width=${cardWidth} .height=${cardHeight}></mini-display-graph-preview>`:nothing}
                    ${free && this.interactive && !textOnlyFrame?html`<button class="resize-handle" aria-label="Resize item" @click=${(event:Event)=>event.stopPropagation()}></button>`:nothing}
                    ${
                      card.title && card.showTitle !== false
                        ? html`<small
                            data-part=${free ? "title" : nothing}
                            style=${`${titleArea};overflow:${card.titleStyle?.textFlow === "overflow" ? "visible" : "hidden"};align-items:${titleVertical};justify-content:${titleMarquee ? "flex-start" : titleHorizontal};text-align:${titleMarquee ? "left" : (card.titleStyle?.horizontalAlign ?? "left")};font-size:${titleSize}px;line-height:${this.typography.fontLineHeight(titleSize)}px`}
                            ><span
                              class="card-label ${titleMarquee ? "marquee" : ""}"
                              ${marqueeMotion(titleMarquee ? (card.titleStyle?.marqueeEffect === "loop" ? firmwareTextWidth(card.title ?? "", titleSize) + 24 : titleOverflow) : 0, card.titleStyle, card.title ?? "", this.refreshRateHz)}
                              aria-label=${card.title ?? ""}
                              style=${`${this.typography.textEffectCss(card.titleStyle)};${this.typography.textFlowCss(card.titleStyle,titleSize)}`}
                              .draggable=${this.interactive}
                              @click=${(event: Event) => {
                                event.stopPropagation();
                                this.emit("preview-select", {
                                  kind: "title",
                                  row: rowIndex,
                                  card: cardIndex,
                                });
                              }}
                              @dragstart=${(event: DragEvent) => this.interaction.startDrag(event, { kind: "title", row: rowIndex, card: cardIndex })}
                              @dragend=${() => this.interaction.stopDrag()}
                              ><span class="marquee-copy">${titleContent}</span>
                              ${titleMarquee && card.titleStyle?.marqueeEffect === "loop" ? html`<span class="marquee-copy" aria-hidden="true">${titleContent}</span>` : nothing}</span
                            >${free && this.interactive ? html`<button class="resize-handle" aria-label="Resize title"></button>` : nothing}</small
                          >`
                        : null
                    }${
                      card.type === "weather"
                        ? html`<div class="value-wrap" data-part=${free ? "value" : nothing} style=${valueArea}><mini-display-weather-preview style="position:absolute;inset:0" .hass=${this.hass} .card=${card} .signature=${JSON.stringify([card.source,card.weather])}></mini-display-weather-preview>${free && this.interactive ? html`<button class="resize-handle" aria-label="Resize value"></button>` : nothing}</div>`
                        : card.type === "image" || card.type === "chart"
                        ? nothing
                        : card.progress === "ring"
                          ? html`<div class="ring-stack" data-part=${free ? "value" : nothing} style=${valueArea}>
                              <div
                                class="ring"
                                style=${`background:conic-gradient(${accent} ${progress}%,#3d424e 0);--ring-bg:${background}`}
                              ></div>
                              ${value}
                              ${free && this.interactive ? html`<button class="resize-handle" aria-label="Resize value"></button>` : nothing}
                            </div>`
                          : html`<div
                              class="value-wrap"
                              data-part=${free ? "value" : nothing}
                              style=${`${valueArea};align-items:${vertical};justify-content:${valueMarquee ? "flex-start" : horizontal};text-align:${textAlign};${valueMarquee ? "overflow:hidden;padding-inline:4px" : ""}`}
                            >
                              ${value}
                              ${free && this.interactive ? html`<button class="resize-handle" aria-label="Resize value"></button>` : nothing}
                            </div>`
                    }${this.interaction.positionGrid(rowIndex, cardIndex)}${card.type !== "image" && card.progress === "bar" ? html`<div class="bar"><i style=${`width:${progress}%;background:${accent}`}></i></div>` : null}
                  </div>`;
                })}
              </div>
            </div>`;
          })}
        </div>
      </div>
    </div>`;
  }
}

if (!customElements.get("mini-display-preview")) {
  customElements.define("mini-display-preview", MiniDisplayPreview);
}
