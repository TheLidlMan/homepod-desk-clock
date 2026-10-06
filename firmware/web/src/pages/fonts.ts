import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { request, type UserFontsStatus, uploadUserFont } from "../api";
import {
  createFontPack,
  cyrillicCharacters,
  greekCharacters,
  latinExtendedCharacters,
  latinPolishCharacters,
} from "../font-tools";
import { pageStyles } from "../styles";

const bytes = (value: number) =>
  value < 1024
    ? `${value} B`
    : `${(value / 1024).toFixed(value < 10240 ? 1 : 0)} KB`;

@customElement("mini-display-fonts")
export class FontsPanel extends LitElement {
  @state() private status_?: UserFontsStatus;
  @state() private loading_ = true;
  @state() private busy_ = false;
  @state() private error_ = "";
  @state() private dialogError_ = "";
  @state() private message_ = "";
  @state() private selected_ = -1;
  @state() private editingSlot_ = 0;
  @state() private file_?: File;
  @state() private name_ = "";
  @state() private latinExtended_ = false;
  @state() private greek_ = false;
  @state() private cyrillic_ = false;
  @state() private extraCharacters_ = "";
  @state() private progress_ = 0;
  @state() private progressLabel_ = "";
  @state() private deleteSlot_?: number;

  static styles = [
    pageStyles,
    css`
      :host {
        margin-top: 12px;
      }
      .subcard {
        display: grid;
        gap: 10px;
        padding: 12px;
        border: 1px solid var(--line);
        border-radius: 9px;
      }
      .subcard .actions {
        margin-top: 0;
      }
      .row-between {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .row-between strong,
      .row-between small {
        display: block;
      }
      .row-between small {
        margin-top: 3px;
        color: var(--muted);
      }
      .badge {
        padding: 3px 8px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--good) 18%, var(--panel));
        color: var(--good);
        font-size: 12px;
        font-weight: 700;
      }
      fieldset {
        display: grid;
        gap: 10px;
        margin: 0;
        padding: 12px;
        border: 1px solid var(--line);
        border-radius: 9px;
      }
      fieldset legend {
        padding: 0 5px;
        font-weight: 700;
      }
      fieldset p {
        margin: 0;
      }
      textarea {
        width: 100%;
        resize: vertical;
        padding: 10px 11px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel);
        color: var(--text);
        font: inherit;
      }
      progress {
        display: block;
        width: 100%;
        height: 9px;
        margin-top: 6px;
        accent-color: var(--accent);
      }
      dialog {
        width: min(520px, calc(100vw - 32px));
        max-height: calc(100vh - 32px);
        padding: 0;
        overflow: auto;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: var(--panel);
        color: var(--text);
        box-shadow: 0 20px 70px rgb(0 0 0 / 45%);
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 62%);
      }
      .dialog-card {
        display: grid;
        gap: 14px;
        padding: 20px;
      }
      .dialog-card h2,
      .dialog-card p {
        margin: 0;
      }
      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding-top: 4px;
      }
      button.danger.secondary {
        background: color-mix(in srgb, var(--danger) 14%, var(--panel));
        color: var(--danger);
      }
      @media (max-width: 520px) {
        .row-between {
          align-items: flex-start;
        }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    void this.load_();
  }

  private async load_() {
    this.loading_ = true;
    this.error_ = "";
    this.dialogError_ = "";
    try {
      this.status_ = await request<UserFontsStatus>("/api/v1/fonts");
      this.selected_ = this.status_.active;
    } catch (error) {
      this.error_ =
        error instanceof Error ? error.message : "Could not load fonts.";
    } finally {
      this.loading_ = false;
    }
  }

  private openUpload_(slot: number) {
    this.editingSlot_ = slot;
    this.file_ = undefined;
    this.name_ = this.status_?.slots[slot]?.name ?? "";
    this.latinExtended_ = false;
    this.greek_ = false;
    this.cyrillic_ = false;
    this.extraCharacters_ = "";
    this.error_ = "";
    this.progress_ = 0;
    this.progressLabel_ = "";
    (
      this.renderRoot.querySelector("#font-dialog") as HTMLDialogElement
    ).showModal();
  }

  private characterSet_() {
    return (
      latinPolishCharacters +
      (this.latinExtended_ ? latinExtendedCharacters : "") +
      (this.greek_ ? greekCharacters : "") +
      (this.cyrillic_ ? cyrillicCharacters : "") +
      this.extraCharacters_
    );
  }

  private async install_() {
    if (!this.file_ || !this.status_) return;
    this.busy_ = true;
    this.dialogError_ = "";
    this.message_ = "";
    try {
      this.progressLabel_ = "Preparing font in this browser…";
      const pack = await createFontPack(
        this.file_,
        this.name_,
        this.status_.sizes,
        this.characterSet_(),
        this.status_.maxGlyphs,
        (completed, total) => {
          this.progress_ = (completed / total) * 50;
        },
      );
      if (pack.bytes > this.status_.maxPackBytes)
        throw new Error(
          `Generated font is ${bytes(pack.bytes)}; device limit is ${bytes(this.status_.maxPackBytes)}. Select fewer characters.`,
        );
      const oversized = pack.files.findIndex((file) => file.size > 180000);
      if (oversized >= 0)
        throw new Error(
          `The ${this.status_.sizes[oversized]} px font is too large. Select fewer characters.`,
        );
      for (let index = 0; index < pack.files.length; ++index) {
        this.progressLabel_ = `Uploading ${this.status_.sizes[index]} px font…`;
        await uploadUserFont(this.editingSlot_, index, pack.files[index]);
        this.progress_ = 50 + ((index + 1) / pack.files.length) * 45;
      }
      await request(`/api/v1/fonts/${this.editingSlot_}`, {
        method: "PUT",
        body: JSON.stringify({
          name: pack.name,
          glyphs: pack.glyphs,
          bytes: pack.bytes,
        }),
      });
      this.progress_ = 100;
      this.progressLabel_ = "Font installed.";
      this.message_ = `${pack.name} installed in slot ${this.editingSlot_ + 1}.`;
      (
        this.renderRoot.querySelector("#font-dialog") as HTMLDialogElement
      ).close();
      await this.load_();
    } catch (error) {
      this.dialogError_ =
        error instanceof Error ? error.message : "Font installation failed.";
    } finally {
      this.busy_ = false;
    }
  }

  private async apply_() {
    this.busy_ = true;
    this.error_ = "";
    try {
      await request("/api/v1/fonts", {
        method: "PUT",
        body: JSON.stringify({ active: this.selected_ }),
      });
      this.message_ = "Display font changed.";
      await this.load_();
    } catch (error) {
      this.error_ =
        error instanceof Error ? error.message : "Could not change font.";
    } finally {
      this.busy_ = false;
    }
  }

  private async remove_() {
    if (this.deleteSlot_ === undefined) return;
    this.busy_ = true;
    this.error_ = "";
    try {
      await request(`/api/v1/fonts/${this.deleteSlot_}`, { method: "DELETE" });
      this.message_ = `Font slot ${this.deleteSlot_ + 1} cleared.`;
      this.deleteSlot_ = undefined;
      (
        this.renderRoot.querySelector("#delete-dialog") as HTMLDialogElement
      ).close();
      await this.load_();
    } catch (error) {
      this.error_ =
        error instanceof Error ? error.message : "Could not remove font.";
    } finally {
      this.busy_ = false;
    }
  }

  render() {
    if (this.loading_)
      return html`<section class="card">
        <p class="muted">Loading fonts…</p>
      </section>`;
    const status = this.status_;
    if (!status) return nothing;
    return html`<section class="card">
        <h2>Typography</h2>
        <p class="muted">
          The device keeps at most two custom fonts. Font conversion and
          character subsetting happen in this browser.
        </p>
        ${this.message_ ? html`<div class="notice">${this.message_}</div>` : nothing}
        ${this.error_ ? html`<div class="error" role="alert">${this.error_}</div>` : nothing}
        <div class="stack">
          <label class="field"
            >Dashboard font
            <small
              >Used for sans-serif dashboard text. Other families keep their
              built-in font.</small
            >
            <select
              @change=${(event: Event) =>
                (this.selected_ = Number(
                  (event.target as HTMLSelectElement).value,
                ))}
            >
              <option value="-1" ?selected=${this.selected_ === -1}>
                Built-in · Inter Tight Bold
              </option>
              ${status.slots.map(
                (slot) =>
                  html`<option
                    value=${slot.slot}
                    ?disabled=${!slot.installed}
                    ?selected=${this.selected_ === slot.slot}
                  >
                    Slot
                    ${slot.slot + 1}${slot.installed ? ` · ${slot.name}` : " · Empty"}
                  </option>`,
              )}
            </select>
          </label>
          <div class="actions">
            <button
              class="secondary"
              ?disabled=${this.busy_}
              @click=${this.apply_}
            >
              Apply font
            </button>
          </div>
          <div class="grid">
            ${status.slots.map(
              (slot) =>
                html`<div class="subcard">
                  <div class="row-between">
                    <div>
                      <strong>Custom font ${slot.slot + 1}</strong>
                      <small>
                        ${
                          slot.installed
                            ? `${slot.name} · ${slot.glyphs} glyphs · ${bytes(slot.bytes)}`
                            : "Empty slot"
                        }
                      </small>
                    </div>
                    ${status.active === slot.slot ? html`<span class="badge">Active</span>` : nothing}
                  </div>
                  <div class="actions">
                    <button
                      class="secondary"
                      ?disabled=${this.busy_}
                      @click=${() => this.openUpload_(slot.slot)}
                    >
                      ${slot.installed ? "Replace" : "Install"}
                    </button>
                    ${
                      slot.installed
                        ? html`<button
                            class="danger secondary"
                            ?disabled=${this.busy_}
                            @click=${() => {
                              this.deleteSlot_ = slot.slot;
                              (
                                this.renderRoot.querySelector(
                                  "#delete-dialog",
                                ) as HTMLDialogElement
                              ).showModal();
                            }}
                          >
                            Remove
                          </button>`
                        : nothing
                    }
                  </div>
                </div>`,
            )}
          </div>
        </div>
      </section>

      <dialog id="font-dialog">
        <form
          method="dialog"
          class="dialog-card"
          @submit=${(event: SubmitEvent) => event.preventDefault()}
        >
          <h2>Install custom font</h2>
          <p class="muted">
            TTF, OTF, WOFF and WOFF2 are processed locally and never leave this
            network.
          </p>
          ${
            this.dialogError_
              ? html`<div class="error" role="alert">${this.dialogError_}</div>`
              : nothing
          }
          <label class="field"
            >Font file
            <input
              type="file"
              accept=".ttf,.otf,.woff,.woff2,font/*"
              ?disabled=${this.busy_}
              @change=${(event: Event) => {
                this.dialogError_ = "";
                this.file_ = (event.target as HTMLInputElement).files?.[0];
                if (this.file_ && !this.name_)
                  this.name_ = this.file_.name.replace(/\.[^.]+$/, "");
              }}
            />
          </label>
          <label class="field"
            >Display name
            <input
              maxlength="32"
              .value=${this.name_}
              ?disabled=${this.busy_}
              @input=${(event: Event) => (this.name_ = (event.target as HTMLInputElement).value)}
            />
          </label>
          <fieldset>
            <legend>Characters</legend>
            <p class="muted">
              Basic Latin and Polish characters are always included.
            </p>
            <label class="check"
              ><input
                type="checkbox"
                .checked=${this.latinExtended_}
                @change=${(event: Event) => (this.latinExtended_ = (event.target as HTMLInputElement).checked)}
              />Extended Latin</label
            >
            <label class="check"
              ><input
                type="checkbox"
                .checked=${this.greek_}
                @change=${(event: Event) => (this.greek_ = (event.target as HTMLInputElement).checked)}
              />Greek</label
            >
            <label class="check"
              ><input
                type="checkbox"
                .checked=${this.cyrillic_}
                @change=${(event: Event) => (this.cyrillic_ = (event.target as HTMLInputElement).checked)}
              />Cyrillic</label
            >
            <label class="field"
              >Additional characters
              <small
                >Paste only the extra glyphs you need, including Chinese
                characters.</small
              >
              <textarea
                rows="2"
                .value=${this.extraCharacters_}
                @input=${(event: Event) => (this.extraCharacters_ = (event.target as HTMLTextAreaElement).value)}
              ></textarea>
            </label>
          </fieldset>
          ${
            this.progressLabel_
              ? html`<div aria-live="polite">
                  <div class="row-between">
                    <small>${this.progressLabel_}</small
                    ><small>${Math.round(this.progress_)}%</small>
                  </div>
                  <progress max="100" .value=${this.progress_}></progress>
                </div>`
              : nothing
          }
          <div class="dialog-actions">
            <button
              type="button"
              class="secondary"
              ?disabled=${this.busy_}
              @click=${() => (this.renderRoot.querySelector("#font-dialog") as HTMLDialogElement).close()}
            >
              Cancel
            </button>
            <button
              type="button"
              ?disabled=${this.busy_ || !this.file_ || !this.name_.trim()}
              @click=${this.install_}
            >
              Process and install
            </button>
          </div>
        </form>
      </dialog>

      <dialog id="delete-dialog">
        <div class="dialog-card">
          <h2>Remove custom font?</h2>
          <p>
            The font files will be deleted from the display. Dashboards will
            fall back to the built-in font if this slot is active.
          </p>
          <div class="dialog-actions">
            <button
              class="secondary"
              @click=${() => (this.renderRoot.querySelector("#delete-dialog") as HTMLDialogElement).close()}
            >
              Cancel
            </button>
            <button
              class="danger"
              ?disabled=${this.busy_}
              @click=${this.remove_}
            >
              Remove font
            </button>
          </div>
        </div>
      </dialog>`;
  }
}
