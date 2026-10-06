import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { Dashboard, Display, Hass, ImageAsset } from "./types";
import { jsonView } from "./json-view";
import "./preview";

const emit = (element: HTMLElement, type: string, detail: unknown) => {
  element.dispatchEvent(
    new CustomEvent(type, { detail, bubbles: true, composed: true }),
  );
};

@customElement("mini-display-preview-list")
export class MiniDisplayPreviewList extends LitElement {
  @property({ attribute: false }) hass?: Hass;
  @property({ attribute: false }) displays: Display[] = [];
  @property({ attribute: false }) dashboards: Record<string, Dashboard | null> =
    {};
  @property({ attribute: false }) pages: Record<string, number> = {};
  @property({ attribute: false }) dirtyDisplays = new Set<string>();
  @property({ attribute: false }) assets: Record<string, ImageAsset[]> = {};
  @property() selectedDisplayId = "";
  @property() selectedSceneId = "";
  @property() selectedSceneName = "";
  @state() private showHidden = false;
  @state() private tabs: Record<string, "preview" | "schema"> = {};

  private selectTab(displayId: string, tab: "preview" | "schema") {
    this.tabs = { ...this.tabs, [displayId]: tab };
    emit(this, "schema-view-changed", Object.values(this.tabs).includes("schema"));
  }

  static styles = css`
    :host {
      display: grid;
      gap: 12px;
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      position: sticky;
      top: 16px;
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
    }
    .preview-footer {
      display: flex;
      justify-content: center;
    }
    .show-hidden {
      display: flex;
      align-items: center;
      gap: 7px;
      min-height: 40px;
      color: var(--secondary-text-color);
      font-size: 12px;
      cursor: pointer;
    }
    .show-hidden input {
      width: 18px;
      height: 18px;
      margin: 0;
    }
    ha-card {
      display: grid;
      gap: 10px;
      padding: 12px;
      border: 2px solid transparent;
      cursor: pointer;
    }
    ha-card.selected {
      border-color: var(--primary-color);
    }
    .tabs {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      border-bottom: 1px solid var(--divider-color);
    }
    .tab-list {
      display: flex;
      gap: 4px;
    }
    .tab {
      min-height: 38px;
      padding: 0 10px;
      color: var(--secondary-text-color);
      background: transparent;
      border: 0;
      border-bottom: 2px solid transparent;
      font: inherit;
      cursor: pointer;
    }
    .tab.active {
      color: var(--primary-color);
      border-bottom-color: var(--primary-color);
    }
    .icon {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      padding: 0;
      color: var(--secondary-text-color);
      background: transparent;
      border: 0;
      border-radius: 50%;
      cursor: pointer;
    }
    .icon:hover,
    .icon.active {
      color: var(--primary-color);
      background: var(--secondary-background-color);
    }
    mini-display-preview {
      margin: auto;
    }
    pre {
      max-height: min(520px, calc(100vh - 260px));
      margin: 0;
      padding: 10px;
      overflow: auto;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--primary-background-color);
      color: var(--primary-text-color);
      font: 11px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace;
      tab-size: 2;
      white-space: pre;
    }
    .json-key { color: #7dd3fc; }
    .json-string { color: #86efac; }
    .json-number { color: #fbbf24; }
    .json-boolean { color: #c4b5fd; }
    .json-null { color: #94a3b8; }
    nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: var(--secondary-text-color);
      font-size: 12px;
    }
    nav .icon {
      width: 32px;
      height: 32px;
    }
    ha-button {
      width: 100%;
    }
    @media (max-width: 1100px) {
      :host {
        grid-column: 1/-1;
        grid-template-columns: repeat(auto-fit, minmax(272px, 1fr));
        max-height: none;
        overflow: visible;
        position: static;
      }
      .preview-footer {
        grid-column: 1/-1;
      }
    }
    @media (max-width: 700px) {
      :host {
        grid-column: auto;
        grid-template-columns: 1fr;
      }
    }
  `;

  render() {
    return html`
      ${this.displays.map((display) => this.renderDisplay(display))}
      <div class="preview-footer">
        <label class="show-hidden"
          ><input
            type="checkbox"
            .checked=${this.showHidden}
            @change=${(event: Event) => (this.showHidden = (event.target as HTMLInputElement).checked)}
          />Show hidden cards</label
        >
      </div>
    `;
  }

  private renderDisplay(display: Display) {
    const dashboard = this.dashboards[display.config_entry_id];
    const page = Math.min(
      this.pages[display.config_entry_id] ?? 0,
      Math.max(0, (dashboard?.pages.length ?? 1) - 1),
    );
    const previewing = display.preview_scene_id === this.selectedSceneId;
    const active = display.active_scene_id === this.selectedSceneId;
    const canShow = Boolean(dashboard);
    const tab = this.tabs[display.config_entry_id] ?? "preview";

    return html`
      <ha-card
        class=${display.config_entry_id === this.selectedDisplayId ? "selected" : ""}
        @click=${() => emit(this, "display-selected", display.config_entry_id)}
      >
        <div class="tabs">
          <div class="tab-list" role="tablist">
            ${(["preview", "schema"] as const).map((value) => html`
              <button
                class="tab ${tab === value ? "active" : ""}"
                role="tab"
                aria-selected=${tab === value}
                @click=${(event: Event) => {
                  event.stopPropagation();
                  this.selectTab(display.config_entry_id, value);
                }}
              >${value === "preview" ? "Preview" : "Schema"}</button>
            `)}
          </div>
          <button
            class="icon ${previewing ? "active" : ""}"
            title=${previewing ? "Stop temporary preview" : !dashboard ? "Add a layout first" : "Show temporarily for 5 minutes"}
            aria-label=${previewing ? "Stop temporary preview" : "Show temporary preview"}
            ?disabled=${!previewing && !canShow}
            @click=${(event: Event) => {
              event.stopPropagation();
              emit(this, "preview-toggle", display);
            }}
          >
            <ha-icon
              icon=${previewing ? "mdi:eye" : "mdi:eye-off-outline"}
            ></ha-icon>
          </button>
        </div>
        ${
          dashboard
            ? html`
                ${tab === "preview" ? html`
                  <mini-display-preview
                    .dashboard=${dashboard}
                    .hass=${this.hass}
                    .assets=${this.assets[display.config_entry_id] ?? []}
                    .page=${page}
                    .width=${display.width}
                    .height=${display.height}
                    .refreshRateHz=${display.refresh_rate_hz ?? 60}
                    .displayId=${display.config_entry_id}
                    .interactive=${true}
                  .showHidden=${this.showHidden}
                  style=${`width:${Math.max(1, display.width)}px;max-width:100%`}
                  @click=${(event: Event) => event.stopPropagation()}
                  ></mini-display-preview>
                ` : html`<pre @click=${(event: Event) => event.stopPropagation()}><code>${jsonView(dashboard.pages[page])}</code></pre>`}
                ${
            dashboard.pages.length > 1
              ? html`
                  <nav>
                    <button
                      class="icon"
                      aria-label="Previous page"
                      @click=${(event: Event) => {
                event.stopPropagation();
                emit(this, "preview-page", {
                  displayId: display.config_entry_id,
                  delta: -1,
                });
              }}
                    >
                      <ha-icon icon="mdi:chevron-left"></ha-icon>
                    </button>
                    <span>${page + 1} / ${dashboard.pages.length}</span>
                    <button
                      class="icon"
                      aria-label="Next page"
                      @click=${(event: Event) => {
                event.stopPropagation();
                emit(this, "preview-page", {
                  displayId: display.config_entry_id,
                  delta: 1,
                });
              }}
                    >
                      <ha-icon icon="mdi:chevron-right"></ha-icon>
                    </button>
                  </nav>
                `
              : nothing
          }
              `
            : html`<ha-alert alert-type="info"
                >No layout in this scene.</ha-alert
              >`
        }
        ${
          !active && dashboard
            ? html`<ha-button
                .disabled=${this.dirtyDisplays.has(display.config_entry_id)}
                @click=${(event: Event) => {
                  event.stopPropagation();
                  emit(this, "scene-activate", display);
                }}
                >Activate ${this.selectedSceneName}</ha-button
              >`
            : nothing
        }
      </ha-card>
    `;
  }
}
