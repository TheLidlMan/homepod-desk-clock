import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { live } from "lit/directives/live.js";
import type { DeviceStatus } from "../api";
import { defaultTimezone, timezoneGroups, timezonePreset } from "../format";
import { pageStyles } from "../styles";
import type { SubmitRequest } from "./shared";
import "./fonts";
import "./notifications";

@customElement("mini-display-display-page")
export class DisplayPage extends LitElement {
  @property({ attribute: false }) status?: DeviceStatus;
  @property({ attribute: false }) saving = false;
  @property({ attribute: false }) submit?: SubmitRequest;

  @state() private brightness_ = 100;
  @state() private pixelShift_ = 0;
  @state() private refreshRate_ = 60;
  @state() private timezone_ = defaultTimezone;
  @state() private selectedTimezone_ = defaultTimezone;
  private initialized_ = false;

  static styles = pageStyles;

  protected willUpdate() {
    if (!this.status || this.initialized_) return;
    this.brightness_ = this.status.brightness;
    this.pixelShift_ = this.status.pixelShift;
    this.refreshRate_ = this.status.refreshRateHz ?? 60;
    this.timezone_ = timezonePreset(this.status.timezone);
    this.selectedTimezone_ = this.timezone_;
    this.initialized_ = true;
  }

  render() {
    const status = this.status;
    if (!status) return nothing;
    return html`<div class="grid">
        <section class="card">
          <h2>Screen</h2>
          <form
            class="stack"
            @submit=${(event: SubmitEvent) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget as HTMLFormElement);
              this.submit?.(
                "/api/v1/display",
                {
                  on: data.has("on"),
                  brightness: this.brightness_,
                  pixelShift: this.pixelShift_,
                  refreshRateHz: this.refreshRate_,
                  timezone: this.timezone_,
                },
                "Display settings saved.",
              );
            }}
          >
            <label class="check"
              ><input
                type="checkbox"
                name="on"
                .checked=${status.displayOn}
              />Screen enabled</label
            >
            <label class="field"
              >Brightness <small>${this.brightness_}%</small
              ><input
                type="range"
                min="0"
                max="100"
                .value=${String(this.brightness_)}
                @input=${(event: Event) =>
                  (this.brightness_ = Number(
                    (event.target as HTMLInputElement).value,
                  ))}
            /></label>
            <label class="field"
              >Pixel shift
              <small
                >${this.pixelShift_}px · periodically moves content to reduce
                image retention</small
              ><input
                type="range"
                min="0"
                max="10"
                .value=${String(this.pixelShift_)}
                @input=${(event: Event) =>
                  (this.pixelShift_ = Number(
                    (event.target as HTMLInputElement).value,
                  ))}
            /></label>
            <label class="field"
              >Maximum refresh rate (Hz)
              <small
                >Limits data, scrolling and transitions. Slow rates skip
                animations.</small
              >
              <input
                type="number"
                min="0.1"
                max="60"
                step="0.1"
                required
                .value=${String(this.refreshRate_)}
                @input=${(event: Event) => (this.refreshRate_ = (event.target as HTMLInputElement).valueAsNumber)}
              />
            </label>
            <label class="field"
              >Time zone
              <small
                >Used by clock cards. Time stays synchronized over NTP.</small
              >
              <select
                @change=${(event: Event) => {
                  const value = (event.target as HTMLSelectElement).value;
                  this.selectedTimezone_ = value;
                  this.timezone_ = value;
                }}
              >
                ${timezoneGroups.map(
                  (group) =>
                    html`<optgroup label=${group.label}>
                      ${group.zones.map(
                        (timezone) =>
                          html`<option
                            value=${timezone.value}
                            ?selected=${timezone.value === this.selectedTimezone_}
                          >
                            ${timezone.label}
                          </option>`,
                      )}
                    </optgroup>`,
                )}
              </select>
            </label>
            <button type="submit" ?disabled=${this.saving}>
              Save display settings
            </button>
          </form>
        </section>
        <section class="card">
          <h2>Page control</h2>
          <p class="muted">
            Next and Previous keep the selected rotation mode.
          </p>
          <label class="check">
            <input
              type="checkbox"
              role="switch"
              .checked=${live(status.rotation === "auto")}
              ?disabled=${this.saving}
              @change=${(event: Event) =>
                this.submit?.(
                  "/api/v1/page",
                  {
                    mode: (event.target as HTMLInputElement).checked
                      ? "auto"
                      : "manual",
                  },
                  "Page rotation updated.",
                  "POST",
                )}
            />
            Automatic page rotation
          </label>
          <div class="actions">
            ${[
              ["previous", "Previous"],
              ["next", "Next"],
            ].map(
              ([command, label]) =>
                html`<button
                  class="secondary"
                  ?disabled=${this.saving}
                  @click=${() =>
                    this.submit?.(
                      "/api/v1/page",
                      { command },
                      `${label} page selected.`,
                      "POST",
                    )}
                >
                  ${label}
                </button>`,
            )}
          </div>
        </section>
        <mini-display-notifications
          .status=${status}
          .saving=${this.saving}
          .submit=${this.submit}
        ></mini-display-notifications>
      </div>
      <mini-display-fonts></mini-display-fonts>`;
  }
}
