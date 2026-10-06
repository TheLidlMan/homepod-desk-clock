import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { DeviceStatus } from "../api";
import { pageStyles } from "../styles";
import type { SubmitRequest } from "./shared";

const positionLabels: Record<string, string> = {
  top: "Top",
  bottom: "Bottom",
  left: "Left",
  right: "Right",
  top_left: "Top left",
  top_right: "Top right",
  bottom_left: "Bottom left",
  bottom_right: "Bottom right",
};

@customElement("mini-display-notifications")
export class NotificationsSettings extends LitElement {
  @property({ attribute: false }) status?: DeviceStatus;
  @property({ attribute: false }) saving = false;
  @property({ attribute: false }) submit?: SubmitRequest;
  @state() private position_?: string;
  @state() private maxVisible_?: number;
  @state() private protect_?: boolean;
  static styles = pageStyles;

  render() {
    if (!this.status?.notificationPositions?.length) return nothing;
    const selected =
      this.position_ ?? this.status.notificationPosition ?? "top";
    const maxVisible =
      this.maxVisible_ ?? this.status.notificationMaxVisible ?? 3;
    const protect =
      this.protect_ ?? this.status.notificationAuthEnabled ?? true;
    return html`<section class="card">
      <h2>Notifications</h2>
      <p class="muted">Messages appear above every dashboard.</p>
      <form
        class="stack"
        @submit=${(event: SubmitEvent) => {
          event.preventDefault();
          this.submit?.(
            "/api/v1/display",
            {
              notificationPosition: selected,
              notificationMaxVisible: maxVisible,
              notificationAuthEnabled: protect,
            },
            "Notification settings saved.",
          );
        }}
      >
        <label class="field">
          Default position
          <select
            ?disabled=${this.saving}
            @change=${(event: Event) => {
              this.position_ = (event.target as HTMLSelectElement).value;
            }}
          >
            ${this.status.notificationPositions.map(
              (position) =>
                html`<option
                  value=${position}
                  ?selected=${selected === position}
                >
                  ${positionLabels[position] ?? position}
                </option>`,
            )}
          </select>
        </label>
        <label class="field">
          Visible at once
          <select
            ?disabled=${this.saving}
            @change=${(event: Event) => {
              this.maxVisible_ = Number(
                (event.target as HTMLSelectElement).value,
              );
            }}
          >
            ${[1, 2, 3].map((count) => html`<option value=${count} ?selected=${count === maxVisible}>${count}</option>`)}
          </select>
          <small
            >Each message disappears independently. Extra messages wait their
            turn.</small
          >
        </label>
        <label class="check">
          <input
            type="checkbox"
            .checked=${protect}
            ?disabled=${this.saving}
            @change=${(event: Event) => {
              this.protect_ = (event.target as HTMLInputElement).checked;
            }}
          />Protect notification API
        </label>
        <p class="muted">
          ${
            protect
              ? this.status.apiPasswordSet
                ? "Uses the panel/API password, even when panel protection is off."
                : "Set a panel/API password in Security before sending notifications."
              : "Anyone with network access can send and clear notifications. Other API protection stays unchanged."
          }
        </p>
        <div class="actions">
          <button type="submit" ?disabled=${this.saving}>Save settings</button>
          <button
            type="button"
            class="secondary"
            ?disabled=${this.saving || !this.status.displayOn || !this.status.brightness}
            @click=${() =>
              this.submit?.(
                "/api/v1/notifications",
                {
                  title: "Mini-Display",
                  message: "Your notification appears here.",
                  icon: "bell",
                  position: selected,
                },
                "Test notification sent.",
                "POST",
              )}
          >
            Test notification
          </button>
          <button
            type="button"
            class="secondary"
            ?disabled=${this.saving}
            @click=${() =>
              this.submit?.(
                "/api/v1/notifications",
                {},
                "All notifications dismissed.",
                "DELETE",
              )}
          >
            Dismiss all
          </button>
        </div>
      </form>
    </section>`;
  }
}
