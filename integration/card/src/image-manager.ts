import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { Hass, ImageAsset } from "./types";

@customElement("mini-display-image-manager")
export class MiniDisplayImageManager extends LitElement {
  @property({ attribute: false }) hass?: Hass;
  @property({ attribute: false }) assets: ImageAsset[] = [];
  @property() displayId = "";
  @property() displayName = "";
  @property({ type: Number }) maximumWidth = 240;
  @property({ type: Number }) maximumHeight = 240;
  @state() private busy = false;
  @state() private error = "";
  @state() private pendingDelete?: ImageAsset;

  static styles = css`
    :host {
      display: block;
      min-width: 0;
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
    }
    * {
      box-sizing: border-box;
    }
    ha-card {
      min-height: 360px;
      overflow: hidden;
      border: 1px solid var(--divider-color);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 64px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--divider-color);
    }
    h2,
    p {
      margin: 0;
    }
    h2 {
      font-size: 18px;
      font-weight: 500;
    }
    header p,
    .meta,
    .empty p {
      color: var(--secondary-text-color);
      font-size: 13px;
    }
    .uploader {
      padding: 16px 16px 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 16px;
      padding: 16px;
    }
    .asset {
      overflow: hidden;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 12px;
    }
    .preview {
      display: grid;
      place-items: center;
      width: 100%;
      aspect-ratio: 4 / 3;
      overflow: hidden;
      background:
        linear-gradient(
          45deg,
          var(--secondary-background-color) 25%,
          transparent 25%
        ),
        linear-gradient(
          -45deg,
          var(--secondary-background-color) 25%,
          transparent 25%
        ),
        linear-gradient(
          45deg,
          transparent 75%,
          var(--secondary-background-color) 75%
        ),
        linear-gradient(
          -45deg,
          transparent 75%,
          var(--secondary-background-color) 75%
        );
      background-size: 16px 16px;
      background-position:
        0 0,
        0 8px,
        8px -8px,
        -8px 0;
    }
    .preview img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .details {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 40px;
      gap: 8px;
      align-items: center;
      padding: 10px 10px 10px 12px;
    }
    .name {
      overflow: hidden;
      font-weight: 500;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta {
      margin-top: 3px;
    }
    .used {
      color: var(--primary-color);
    }
    button {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      padding: 0;
      color: var(--error-color);
      background: transparent;
      border: 0;
      border-radius: 50%;
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background: var(--secondary-background-color);
    }
    button:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .empty {
      display: grid;
      justify-items: center;
      gap: 10px;
      padding: 72px 24px;
      text-align: center;
    }
    .empty ha-icon {
      --mdc-icon-size: 54px;
      width: 54px;
      height: 54px;
      color: var(--secondary-text-color);
    }
    .error {
      margin: 16px 16px 0;
      padding: 12px;
      color: var(--error-color);
      background: color-mix(in srgb, var(--error-color), transparent 90%);
      border-radius: 10px;
    }
    .backdrop {
      position: fixed;
      z-index: 1000;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 16px;
      background: rgb(0 0 0 / 55%);
    }
    .dialog {
      width: min(420px, 100%);
      min-height: 0;
      padding: 20px;
    }
    .dialog h2 {
      margin-bottom: 10px;
    }
    .dialog p {
      color: var(--secondary-text-color);
      line-height: 1.45;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 20px;
    }
    .dialog-actions ha-button.danger {
      --mdc-theme-primary: var(--error-color);
    }
  `;

  render() {
    return html`
      <ha-card>
        <header>
          <div>
            <h2>Images</h2>
            <p>
              ${this.displayName} · ${this.assets.length}
              ${this.assets.length === 1 ? "image" : "images"}
            </p>
          </div>
        </header>
        <div class="uploader">
          <mini-display-image-field
            .hass=${this.hass}
            .assets=${this.assets}
            .displayId=${this.displayId}
            label="Add image"
            .maximumWidth=${this.maximumWidth}
            .maximumHeight=${this.maximumHeight}
            .uploadOnly=${true}
            @asset-uploaded=${(event: CustomEvent<ImageAsset>) =>
              this.dispatchEvent(
                new CustomEvent("asset-uploaded", {
                  detail: event.detail,
                  bubbles: true,
                  composed: true,
                }),
              )}
          ></mini-display-image-field>
        </div>
        ${this.error ? html`<div class="error" role="alert">${this.error}</div>` : nothing}
        ${
          this.assets.length
            ? html`<div class="grid">
                ${this.assets.map((asset) => this.renderAsset(asset))}
              </div>`
            : html`<div class="empty">
                <ha-icon icon="mdi:image-multiple-outline"></ha-icon>
                <h2>No images</h2>
                <p>Add an image here or directly from an image field.</p>
              </div>`
        }
      </ha-card>
      ${
        this.pendingDelete
          ? html`<div
              class="backdrop"
              @click=${() => (this.pendingDelete = undefined)}
            >
              <ha-card
                class="dialog"
                role="dialog"
                aria-modal="true"
                @click=${(event: Event) => event.stopPropagation()}
              >
                <h2>Delete image?</h2>
                <p>
                  <strong>${this.pendingDelete.name}</strong> will be removed
                  from Home Assistant and the display.
                </p>
                <div class="dialog-actions">
                  <ha-button @click=${() => (this.pendingDelete = undefined)}
                    >Cancel</ha-button
                  >
                  <ha-button
                    class="danger"
                    @click=${() => void this.deletePending()}
                    >Delete</ha-button
                  >
                </div>
              </ha-card>
            </div>`
          : nothing
      }
    `;
  }

  private renderAsset(asset: ImageAsset) {
    const uses = asset.used_by ?? [];
    return html`<article class="asset">
      <div class="preview">
        ${asset.preview ? html`<img src=${asset.preview} alt=${asset.name} />` : html`<ha-icon icon="mdi:image-outline"></ha-icon>`}
      </div>
      <div class="details">
        <div>
          <div class="name" title=${asset.name}>${asset.name}</div>
          <div class="meta">
            ${asset.width}×${asset.height} · ${Math.ceil(asset.bytes / 1024)} KB${asset.animated
              ? ` · ${asset.frameCount} frames`
              : ""}
          </div>
          <div class="meta ${uses.length ? "used" : ""}">
            ${uses.length ? `Used in ${uses.join(", ")}` : "Not used"}
          </div>
        </div>
        <button
          title=${uses.length ? "Detach this image before deleting it" : "Delete image"}
          aria-label="Delete image"
          ?disabled=${uses.length > 0 || this.busy}
          @click=${() => (this.pendingDelete = asset)}
        >
          <ha-icon icon="mdi:delete-outline"></ha-icon>
        </button>
      </div>
    </article>`;
  }

  private async deletePending() {
    const asset = this.pendingDelete;
    if (!asset || !this.hass || !this.displayId) return;
    this.busy = true;
    this.error = "";
    try {
      await this.hass.callWS({
        type: "mini_display/asset/delete",
        config_entry_id: this.displayId,
        asset_id: asset.id,
      });
      this.dispatchEvent(
        new CustomEvent("asset-deleted", {
          detail: asset.id,
          bubbles: true,
          composed: true,
        }),
      );
      this.pendingDelete = undefined;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.busy = false;
    }
  }
}
