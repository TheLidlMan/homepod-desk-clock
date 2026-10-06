import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Display, Scene } from "./types";

const emit = (element: HTMLElement, type: string, detail?: unknown) => {
  element.dispatchEvent(
    new CustomEvent(type, { detail, bubbles: true, composed: true }),
  );
};

@customElement("mini-display-scene-sidebar")
export class MiniDisplaySceneSidebar extends LitElement {
  @property({ attribute: false }) displays: Display[] = [];
  @property({ attribute: false }) scenes: Scene[] = [];
  @property() selectedDisplayId = "";
  @property() selectedSceneId = "";
  @property() section: "scenes" | "images" = "scenes";
  @property({ type: Number }) imageCount = 0;
  @property() form: "rename" | null = null;
  @property() sceneName = "";

  static styles = css`
    :host {
      display: block;
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
    }
    ha-card {
      overflow: visible;
      border: 1px solid var(--divider-color);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 52px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--divider-color);
    }
    h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }
    .picker,
    .form {
      display: grid;
      gap: 8px;
      padding: 12px;
      border-bottom: 1px solid var(--divider-color);
    }
    label {
      display: grid;
      gap: 5px;
      color: var(--secondary-text-color);
      font-size: 12px;
    }
    select {
      width: 100%;
      min-height: 40px;
      padding: 8px;
      color: var(--primary-text-color);
      font: inherit;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }
    .status i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--error-color);
    }
    .status.online i {
      background: var(--success-color);
    }
    .list {
      display: grid;
      gap: 4px;
      padding: 8px;
    }
    .navigation {
      display: grid;
      gap: 4px;
      padding: 8px;
      border-bottom: 1px solid var(--divider-color);
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 8px 10px;
      color: var(--primary-text-color);
      font: inherit;
      text-align: left;
      background: transparent;
      border: 0;
      border-radius: 10px;
      cursor: pointer;
    }
    .nav-item:hover,
    .nav-item.active {
      background: var(--secondary-background-color);
    }
    .nav-item ha-icon {
      flex-shrink: 0;
      color: var(--secondary-text-color);
    }
    .nav-item.active ha-icon {
      color: var(--primary-color);
    }
    .row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 36px;
      align-items: center;
      border-radius: 10px;
    }
    .row.active {
      background: var(--secondary-background-color);
    }
    .scene {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 8px 10px;
      color: var(--primary-text-color);
      font: inherit;
      text-align: left;
      background: transparent;
      border: 0;
      cursor: pointer;
    }
    .scene span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .scene .default {
      flex: none;
      color: var(--primary-color);
    }
    .scene ha-icon {
      flex-shrink: 0;
      color: var(--secondary-text-color);
    }
    .active .scene ha-icon {
      color: var(--primary-color);
    }
    .icon {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      padding: 0;
      color: var(--primary-text-color);
      background: transparent;
      border: 0;
      border-radius: 50%;
      cursor: pointer;
    }
    .icon:hover {
      background: var(--card-background-color);
    }
    details {
      position: relative;
    }
    summary {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      list-style: none;
      cursor: pointer;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    .menu {
      position: absolute;
      right: 0;
      z-index: 20;
      display: grid;
      width: 150px;
      padding: 6px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 10px;
      box-shadow: var(--ha-card-box-shadow);
    }
    .menu button {
      min-height: 38px;
      padding: 8px;
      color: var(--primary-text-color);
      font: inherit;
      text-align: left;
      background: transparent;
      border: 0;
      cursor: pointer;
    }
    .menu .danger {
      color: var(--error-color);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .form strong {
      font-size: 14px;
    }
    .form small {
      color: var(--secondary-text-color);
      line-height: 1.4;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(
      "pointerdown",
      this.closeActionMenusOnOutsideClick,
      true,
    );
  }

  disconnectedCallback() {
    window.removeEventListener(
      "pointerdown",
      this.closeActionMenusOnOutsideClick,
      true,
    );
    super.disconnectedCallback();
  }

  private closeActionMenusOnOutsideClick = (event: PointerEvent) => {
    const path = event.composedPath();
    this.renderRoot
      .querySelectorAll<HTMLDetailsElement>("details.action-menu[open]")
      .forEach((menu) => {
        if (!path.includes(menu)) menu.open = false;
      });
  };

  private actionMenuToggled(event: Event) {
    const current = event.currentTarget as HTMLDetailsElement;
    if (!current.open) return;
    this.renderRoot
      .querySelectorAll<HTMLDetailsElement>("details.action-menu[open]")
      .forEach((menu) => {
        if (menu !== current) menu.open = false;
      });
  }

  private closeActionMenu(event: Event) {
    const button = event
      .composedPath()
      .find(
        (item): item is HTMLButtonElement => item instanceof HTMLButtonElement,
      );
    if (!button || button.disabled) return;
    const menu = (event.currentTarget as HTMLElement).closest("details");
    if (menu) menu.open = false;
  }

  private actionMenuKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    const menu = (event.currentTarget as HTMLElement).closest("details");
    if (!menu) return;
    menu.open = false;
    menu.querySelector<HTMLElement>("summary")?.focus();
    event.preventDefault();
    event.stopPropagation();
  }

  render() {
    const display = this.displays.find(
      (item) => item.config_entry_id === this.selectedDisplayId,
    );
    return html`
      <ha-card>
        <header><h2>Display</h2></header>
        <div class="picker">
          <label>
            Display
            <select
              .value=${this.selectedDisplayId}
              @change=${(event: Event) => emit(this, "display-selected", (event.target as HTMLSelectElement).value)}
            >
              ${this.displays.map((item) => html`<option value=${item.config_entry_id}>${item.title}</option>`)}
            </select>
          </label>
          <span class="status ${display?.available ? "online" : ""}"
            ><i></i>${display?.available ? "Online" : "Offline"}</span
          >
        </div>
        <div class="navigation">
          <button
            class="nav-item ${this.section === "images" ? "active" : ""}"
            @click=${() => emit(this, "images-selected")}
          >
            <ha-icon icon="mdi:image-multiple-outline"></ha-icon>
            <span>Images (${this.imageCount})</span>
          </button>
        </div>
        <header>
          <h2>Scenes</h2>
          <button
            class="icon"
            title="Add scene"
            aria-label="Add scene"
            @click=${() => emit(this, "scene-create")}
          >
            <ha-icon icon="mdi:plus"></ha-icon>
          </button>
        </header>
        <div class="list">
          ${this.scenes.map(
            (scene) => html`
              <div
                class="row ${this.section === "scenes" && scene.id === this.selectedSceneId ? "active" : ""}"
              >
                <button
                  class="scene"
                  @click=${() => emit(this, "scene-selected", scene.id)}
                >
                  <ha-icon icon="mdi:layers-outline"></ha-icon>
                  <span>${scene.name}</span>
                  ${scene.is_default ? html`<ha-icon class="default" icon="mdi:star" title="Default scene"></ha-icon>` : nothing}
                </button>
                ${
                  scene.id === this.selectedSceneId
                    ? html`
                        <details
                          class="action-menu"
                          @toggle=${this.actionMenuToggled}
                          @keydown=${this.actionMenuKeydown}
                        >
                          <summary
                            aria-label="Scene actions"
                            aria-haspopup="menu"
                          >
                            <ha-icon icon="mdi:dots-vertical"></ha-icon>
                          </summary>
                          <div
                            class="menu"
                            role="menu"
                            @click=${this.closeActionMenu}
                          >
                            <button @click=${() => emit(this, "scene-rename")}>
                              Rename
                            </button>
                            <button
                              @click=${() => emit(this, "scene-duplicate")}
                            >
                              Duplicate
                            </button>
                            ${!scene.is_default ? html`<button @click=${() => emit(this, "scene-default")}>Set as default</button>` : nothing}
                            ${!scene.is_default ? html`<button class="danger" @click=${() => emit(this, "scene-delete")}>Delete</button>` : nothing}
                          </div>
                        </details>
                      `
                    : nothing
                }
              </div>
            `,
          )}
        </div>
        ${
          this.form
            ? html`
                <div class="form">
                  <strong>Rename scene</strong>
                  <ha-textfield
                    label="Scene name"
                    .value=${this.sceneName}
                    @input=${(event: Event) => emit(this, "scene-name", (event.target as HTMLInputElement).value)}
                    @keydown=${(event: KeyboardEvent) => {
                      if (event.key === "Enter") emit(this, "scene-save");
                    }}
                  ></ha-textfield>
                  <div class="actions">
                    <ha-button @click=${() => emit(this, "scene-cancel")}
                      >Cancel</ha-button
                    >
                    <ha-button
                      .disabled=${!this.sceneName.trim()}
                      @click=${() => emit(this, "scene-save")}
                      >Save</ha-button
                    >
                  </div>
                </div>
              `
            : nothing
        }
      </ha-card>
    `;
  }
}
