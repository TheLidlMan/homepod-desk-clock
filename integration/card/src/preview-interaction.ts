import { html, type LitElement, type ReactiveController } from "lit";
import type { Dashboard, DisplayCard, Hass } from "./types";
import { freeTextFrame, type FreePart } from "./free-text";
import { visibilityMatches } from "./visibility";

interface PreviewHost extends LitElement {
  dashboard?: Dashboard;
  hass?: Hass;
  page: number;
  autoPage: number;
  autoRotate: boolean;
  interactive: boolean;
  showHidden: boolean;
  emit(type: string, detail: Record<string, unknown>): void;
}

export class PreviewInteraction implements ReactiveController {
  constructor(private host: PreviewHost) {
    host.addController(this);
  }
  get dashboard() {
    return this.host.dashboard;
  }
  get hass() {
    return this.host.hass;
  }
  get page() {
    return this.host.page;
  }
  get autoPage() {
    return this.host.autoPage;
  }
  get autoRotate() {
    return this.host.autoRotate;
  }
  get interactive() {
    return this.host.interactive;
  }
  get showHidden() {
    return this.host.showHidden;
  }
  get shadowRoot() {
    return this.host.shadowRoot;
  }
  private emit(type: string, detail: Record<string, unknown>) {
    this.host.emit(type, detail);
  }

  private down = (event: PointerEvent) => {
    this.pointerDown(event);
    this.host.requestUpdate();
  };
  private move = (event: PointerEvent) => {
    if (!this.freeDrag && !this.pointerCandidate) return;
    this.pointerMove(event);
    this.host.requestUpdate();
  };
  private up = (event: PointerEvent) => {
    if (!this.freeDrag && !this.pointerCandidate) return;
    this.pointerUp(event);
    this.host.requestUpdate();
  };
  private cancel = (event: PointerEvent) => {
    if (!this.freeDrag && !this.pointerCandidate) return;
    this.pointerCancel(event);
    this.host.requestUpdate();
  };
  hostConnected() {
    this.host.addEventListener("pointerdown", this.down);
    this.host.addEventListener("click", this.preventClickAfterDrag, true);
    window.addEventListener("pointermove", this.move, { passive: false });
    window.addEventListener("pointerup", this.up, true);
    window.addEventListener("pointercancel", this.cancel, true);
  }
  hostDisconnected() {
    this.host.removeEventListener("pointerdown", this.down);
    this.host.removeEventListener("click", this.preventClickAfterDrag, true);
    window.removeEventListener("pointermove", this.move);
    window.removeEventListener("pointerup", this.up, true);
    window.removeEventListener("pointercancel", this.cancel, true);
    this.freeDrag = undefined;
    this.stopDrag();
  }
  dragging?: {
    kind: "value" | "title" | "page-title";
    row?: number;
    card?: number;
    label: string;
  };
  dragTarget = "";
  dragPoint = { x: 0, y: 0 };
  private pointerCandidate?: {
    pointerId: number;
    startX: number;
    startY: number;
    kind: "value" | "title" | "page-title";
    row?: number;
    card?: number;
    label: string;
    cardElement?: HTMLElement;
  };
  private suppressClickUntil = 0;
  freeDrag?: {
    row: number;
    card: number;
    part: FreePart;
    pointerId: number;
    startX: number;
    startY: number;
    resize: boolean;
    moved: boolean;
    start: NonNullable<DisplayCard["frame"]>;
    frame: NonNullable<DisplayCard["frame"]>;
  };

  clickSelect(event: Event, detail: Record<string, unknown>) {
    event.stopPropagation();
    if (Date.now() < this.suppressClickUntil) return;
    this.emit("preview-select", detail);
  }

  private readonly preventClickAfterDrag = (event: Event) => {
    if (Date.now() >= this.suppressClickUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private readonly pointerDown = (event: PointerEvent) => {
    if (!this.interactive) return;
    const freePage = this.dashboard?.pages[this.page];
    if (freePage?.layout === "free") {
      const elements = event
        .composedPath()
        .filter((item): item is HTMLElement => item instanceof HTMLElement);
      const element = elements.find((item) => item.classList.contains("card"));
      if (!element || (event.pointerType === "mouse" && event.button !== 0))
        return;
      const row = Number(element.dataset.row),
        card = Number(element.dataset.card);
      const item = freePage.rows[row]?.cards[card];
      if (!item?.frame) return;
      const part = (elements.find((item) => item.dataset.part)?.dataset.part ??
        "card") as FreePart;
      const frame = freeTextFrame(item, part);
      event.preventDefault();
      this.freeDrag = {
        row,
        card,
        part,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        resize: elements.some((item) =>
          item.classList.contains("resize-handle"),
        ),
        moved: false,
        start: { ...frame },
        frame: { ...frame },
      };
      return;
    }
    const path = event
      .composedPath()
      .filter((item): item is HTMLElement => item instanceof HTMLElement);
    const handle = path.find((item) =>
      item.matches?.(".card-label,.value,.page-title span"),
    );
    if (!handle) return;
    if (handle.matches(".page-title span")) {
      this.startPointer(event, {
        kind: "page-title",
        label: handle.textContent?.trim() || "Page title",
      });
      return;
    }
    const cardElement = path.find((item) => item.classList?.contains("card"));
    const groupElement = path.find((item) => item.classList?.contains("group"));
    if (!cardElement || !groupElement) return;
    const groups = Array.from(
      this.shadowRoot?.querySelectorAll<HTMLElement>(".group") ?? [],
    );
    const cards = Array.from(
      groupElement.querySelectorAll<HTMLElement>(".card"),
    );
    const visibleRow = groups.indexOf(groupElement);
    const visibleCard = cards.indexOf(cardElement);
    const page =
      this.dashboard?.pages[this.autoRotate ? this.autoPage : this.page];
    if (!page || visibleRow < 0 || visibleCard < 0) return;
    const renderedRows = page.rows
      .map((row, rowIndex) => {
        const rowVisible = visibilityMatches(this.hass, row.visibility);
        const renderedCards = row.cards
          .map((card, cardIndex) => ({
            cardIndex,
            hidden:
              !rowVisible ||
              !visibilityMatches(this.hass, card.visibility, card),
          }))
          .filter(({ hidden }) => this.showHidden || !hidden);
        return { rowIndex, cards: renderedCards };
      })
      .filter(({ cards: renderedCards }) => renderedCards.length > 0);
    const rowIndex = renderedRows[visibleRow]?.rowIndex;
    const cardIndex = renderedRows[visibleRow]?.cards[visibleCard]?.cardIndex;
    if (rowIndex === undefined || cardIndex === undefined) return;
    this.startPointer(
      event,
      {
        kind: handle.classList.contains("card-label") ? "title" : "value",
        row: rowIndex,
        card: cardIndex,
        label:
          handle.getAttribute("aria-label") ||
          handle.textContent?.trim() ||
          (handle.classList.contains("card-label") ? "Title" : "Value"),
      },
      cardElement,
    );
  };

  private startPointer(
    event: PointerEvent,
    dragging: NonNullable<PreviewInteraction["dragging"]>,
    cardElement?: HTMLElement,
  ) {
    if (
      !this.interactive ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    this.pointerCandidate = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      ...dragging,
      cardElement,
    };
  }

  startDrag(event: DragEvent, _dragging?: unknown) {
    event.preventDefault();
  }

  private readonly pointerMove = (event: PointerEvent) => {
    if (this.freeDrag?.pointerId === event.pointerId) {
      const d = this.freeDrag,
        rect =
          this.shadowRoot!.querySelector(".screen")!.getBoundingClientRect();
      const dx = ((event.clientX - d.startX) * 100) / rect.width,
        dy = ((event.clientY - d.startY) * 100) / rect.height;
      if (
        !d.moved &&
        Math.hypot(event.clientX - d.startX, event.clientY - d.startY) < 4
      )
        return;
      event.preventDefault();
      const snap = (value: number) => Math.round(value * 2) / 2;
      const frame = d.resize
        ? {
            ...d.start,
            width: Math.min(
              100 - d.start.x,
              Math.max(2, snap(d.start.width + dx)),
            ),
            height: Math.min(
              100 - d.start.y,
              Math.max(2, snap(d.start.height + dy)),
            ),
          }
        : {
            ...d.start,
            x: Math.min(100 - d.start.width, Math.max(0, snap(d.start.x + dx))),
            y: Math.min(
              100 - d.start.height,
              Math.max(0, snap(d.start.y + dy)),
            ),
          };
      this.freeDrag = { ...d, moved: true, frame };
      return;
    }
    const candidate = this.pointerCandidate;
    if (!candidate || candidate.pointerId !== event.pointerId) return;
    const distance = Math.hypot(
      event.clientX - candidate.startX,
      event.clientY - candidate.startY,
    );
    if (!this.dragging && distance < 5) return;
    event.preventDefault();
    if (!this.dragging)
      this.dragging = {
        kind: candidate.kind,
        row: candidate.row,
        card: candidate.card,
        label: candidate.label,
      };
    this.dragPoint = { x: event.clientX, y: event.clientY };
    const screen = this.shadowRoot?.querySelector<HTMLElement>(".screen");
    if (!screen) return;
    const screenRect = screen.getBoundingClientRect();
    if (
      event.clientX < screenRect.left ||
      event.clientX > screenRect.right ||
      event.clientY < screenRect.top ||
      event.clientY > screenRect.bottom
    ) {
      this.dragTarget = "";
      return;
    }
    if (candidate.kind === "page-title") {
      const distances = [
        { target: "top", value: event.clientY - screenRect.top },
        { target: "right", value: screenRect.right - event.clientX },
        { target: "bottom", value: screenRect.bottom - event.clientY },
        { target: "left", value: event.clientX - screenRect.left },
      ];
      this.dragTarget = distances.reduce((closest, item) =>
        item.value < closest.value ? item : closest,
      ).target;
      return;
    }
    const card = candidate.cardElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      this.dragTarget = "";
      return;
    }
    const horizontal = ["left", "center", "right"][
      Math.min(2, Math.floor((event.clientX - rect.left) / (rect.width / 3)))
    ];
    const vertical = ["top", "middle", "bottom"][
      Math.min(2, Math.floor((event.clientY - rect.top) / (rect.height / 3)))
    ];
    this.dragTarget = `${horizontal}-${vertical}`;
  };

  private readonly pointerUp = (event: PointerEvent) => {
    if (this.freeDrag?.pointerId === event.pointerId) {
      const d = this.freeDrag;
      this.freeDrag = undefined;
      this.suppressClickUntil = Date.now() + 350;
      this.emit(
        d.moved ? "preview-frame" : "preview-select",
        d.moved
          ? { row: d.row, card: d.card, part: d.part, frame: d.frame }
          : { row: d.row, card: d.card, kind: d.part },
      );
      return;
    }
    const candidate = this.pointerCandidate;
    if (!candidate || candidate.pointerId !== event.pointerId) return;
    if (this.dragging) {
      event.preventDefault();
      event.stopPropagation();
      if (
        candidate.kind === "page-title" &&
        ["top", "right", "bottom", "left"].includes(this.dragTarget)
      ) {
        this.emit("preview-position", {
          kind: "page-title",
          position: this.dragTarget,
        });
      } else {
        const [horizontalAlign, verticalAlign] = this.dragTarget.split("-");
        if (
          ["left", "center", "right"].includes(horizontalAlign) &&
          ["top", "middle", "bottom"].includes(verticalAlign)
        ) {
          this.emit("preview-position", {
            kind: candidate.kind,
            row: candidate.row,
            card: candidate.card,
            horizontalAlign,
            verticalAlign,
          });
        }
      }
      this.suppressClickUntil = Date.now() + 350;
    } else {
      this.emit("preview-select", {
        kind: candidate.kind,
        row: candidate.row,
        card: candidate.card,
      });
      this.suppressClickUntil = Date.now() + 100;
    }
    this.stopDrag();
  };

  private readonly pointerCancel = (event: PointerEvent) => {
    if (this.freeDrag?.pointerId === event.pointerId) this.freeDrag = undefined;
    if (this.pointerCandidate?.pointerId === event.pointerId) this.stopDrag();
  };

  stopDrag() {
    this.pointerCandidate = undefined;
    this.dragging = undefined;
    this.dragTarget = "";
  }

  positionGrid(row: number, card: number) {
    if (
      !this.dragging ||
      this.dragging.kind === "page-title" ||
      this.dragging.row !== row ||
      this.dragging.card !== card
    )
      return null;
    const horizontal = ["left", "center", "right"] as const;
    const vertical = ["top", "middle", "bottom"] as const;
    return html`<div class="drop-grid" aria-label="Choose text position">
      ${vertical.flatMap((v) =>
        horizontal.map((h) => {
          const key = `${h}-${v}`;
          return html`<div
            class="drop-cell ${this.dragTarget === key ? "active" : ""}"
          ></div>`;
        }),
      )}
    </div>`;
  }

  pageDropzones() {
    const ghost = this.dragging
      ? html`<div
          class="drag-ghost"
          style=${`left:${this.dragPoint.x}px;top:${this.dragPoint.y}px`}
        >
          ${this.dragging.label}
        </div>`
      : null;
    if (this.dragging?.kind !== "page-title") return ghost;
    const positions = ["top", "right", "bottom", "left"] as const;
    const icons = {
      top: "mdi:arrow-up",
      right: "mdi:arrow-right",
      bottom: "mdi:arrow-down",
      left: "mdi:arrow-left",
    };
    return html`${ghost}
      <div class="page-dropzones">
        ${positions.map((position) => html`<div class="page-dropzone ${position} ${this.dragTarget === position ? "active" : ""}"><ha-icon icon=${icons[position]}></ha-icon></div>`)}
      </div>`;
  }
}
