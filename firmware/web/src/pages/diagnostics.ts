import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { request, type DeviceStatus } from "../api";
import { pageStyles } from "../styles";
import { features } from "../features";

const jsonToken =
  /"(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b/g;

const jsonView = (value: unknown) => {
  if (value === undefined) return "Waiting for data…";
  const source = JSON.stringify(value, null, 2);
  const parts: unknown[] = [];
  let offset = 0;
  for (const match of source.matchAll(jsonToken)) {
    const index = match.index;
    const token = match[0];
    parts.push(source.slice(offset, index));
    let type = "number";
    if (token.startsWith('"'))
      type = /^\s*:/.test(source.slice(index + token.length))
        ? "key"
        : "string";
    else if (token === "true" || token === "false") type = "boolean";
    else if (token === "null") type = "null";
    parts.push(html`<span class="json-${type}">${token}</span>`);
    offset = index + token.length;
  }
  parts.push(source.slice(offset));
  return parts;
};

@customElement("mini-display-diagnostics-page")
export class DiagnosticsPage extends LitElement {
  @property() recoverySsid = "Mini-Display-Setup";
  @property({ attribute: false }) status?: DeviceStatus;

  @state() private dashboard_?: unknown;
  @state() private latestData_?: unknown;
  @state() private dashboardError_ = "";
  @state() private dataError_ = "";
  @state() private actionError_ = "";
  @state() private frozen_ = false;
  @state() private acting_ = false;
  private pollTimer_?: number;

  static styles = [
    pageStyles,
    css`
      .card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 12px;
      }
      .card-header h2,
      .card-header p {
        margin: 0;
      }
      .card-header p {
        margin-top: 3px;
      }
      .schema-link {
        color: var(--accent);
        font-size: 13px;
        font-weight: 650;
        text-decoration: none;
        white-space: nowrap;
      }
      .schema-link:hover {
        text-decoration: underline;
      }
      .live-state {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: var(--muted);
        font-size: 13px;
        white-space: nowrap;
      }
      .live-state::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--good);
      }
      .live-state.frozen::before {
        background: var(--warning);
      }
      pre {
        min-height: 96px;
        max-height: 420px;
        margin: 0;
        padding: 14px;
        overflow: auto;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: color-mix(in srgb, var(--bg) 82%, #000);
        color: var(--text);
        font:
          12px/1.55 ui-monospace,
          SFMono-Regular,
          Consolas,
          monospace;
        tab-size: 2;
        white-space: pre;
      }
      .json-key {
        color: #7dd3fc;
      }
      .json-string {
        color: #86efac;
      }
      .json-number {
        color: #fbbf24;
      }
      .json-boolean {
        color: #c4b5fd;
      }
      .json-null {
        color: #94a3b8;
      }
      .danger-zone {
        border-color: color-mix(in srgb, var(--danger) 55%, var(--line));
      }
      .fingerprint {
        display: grid;
        gap: 5px;
        margin-top: 14px;
      }
      .fingerprint strong {
        color: var(--muted);
        font-size: 12px;
      }
      .fingerprint code {
        overflow-wrap: anywhere;
        font-size: 12px;
      }
      .danger-zone .actions {
        margin-top: 12px;
      }
      button.warning {
        background: var(--warning);
        color: #1f1700;
      }
      dialog {
        width: min(440px, calc(100vw - 32px));
        padding: 0;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: var(--panel);
        color: var(--text);
        box-shadow: 0 20px 70px rgb(0 0 0 / 45%);
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 62%);
      }
      .dialog-body {
        padding: 20px;
      }
      .dialog-body h2 {
        margin: 0 0 8px;
      }
      .dialog-body p {
        margin: 0;
        color: var(--muted);
      }
      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 14px 20px;
        border-top: 1px solid var(--line);
      }
      @media (max-width: 520px) {
        .card-header {
          align-items: stretch;
          flex-direction: column;
        }
        .card-header button {
          align-self: flex-start;
        }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    void this.load_();
    this.pollTimer_ = window.setInterval(() => void this.pollData_(), 2000);
  }

  disconnectedCallback() {
    if (this.pollTimer_ !== undefined) window.clearInterval(this.pollTimer_);
    super.disconnectedCallback();
  }

  private async load_() {
    try {
      this.dashboard_ = await request<unknown>("/api/v1/dashboard");
    } catch (error) {
      this.dashboardError_ =
        error instanceof Error ? error.message : "Could not load dashboard";
    }
    await this.pollData_();
  }

  private async pollData_() {
    if (this.frozen_) return;
    try {
      const data = await request<unknown>("/api/v1/data/latest");
      if (data !== undefined) this.latestData_ = data;
      this.dataError_ = "";
    } catch (error) {
      this.dataError_ =
        error instanceof Error ? error.message : "Could not load data";
    }
  }

  private toggleFreeze_() {
    this.frozen_ = !this.frozen_;
    if (!this.frozen_) {
      this.latestData_ = undefined;
      void this.pollData_();
    }
  }

  private showDialog_(id: string) {
    (this.renderRoot.querySelector(`#${id}`) as HTMLDialogElement)?.showModal();
  }

  private async runAction_(path: string) {
    this.acting_ = true;
    this.actionError_ = "";
    try {
      await request(path, { method: "POST", body: "{}" });
    } catch (error) {
      this.actionError_ =
        error instanceof Error ? error.message : "Request failed";
      this.acting_ = false;
    }
  }

  render() {
    return html`<div class="stack">
      ${
        features.tls
          ? html`<section class="card">
              <h2>TLS certificate</h2>
              <div class="facts">
                <div class="fact">
                  <strong>HTTPS preference</strong
                  ><span
                    >${this.status?.httpsEnabled ? "Enabled" : "Disabled"}</span
                  >
                </div>
                <div class="fact">
                  <strong>HTTPS listener</strong
                  ><span
                    >${this.status?.httpsAvailable ? "Available" : "Unavailable"}</span
                  >
                </div>
                <div class="fact">
                  <strong>Source</strong
                  ><span>${this.status?.tlsCertificateSource ?? "none"}</span>
                </div>
                <div class="fact">
                  <strong>Algorithm</strong
                  ><span
                    >${this.status?.tlsCertificateAlgorithm ?? "none"}</span
                  >
                </div>
              </div>
              ${
                this.status?.tlsCertificateFingerprint
                  ? html`<div class="fingerprint">
                      <strong>SHA-256 fingerprint</strong>
                      <code>${this.status.tlsCertificateFingerprint}</code>
                    </div>`
                  : nothing
              }
            </section>`
          : nothing
      }
      <section class="card">
        <div class="card-header">
          <div>
            <h2>Current dashboard JSON</h2>
            <p class="muted">Stored dashboard-v1 configuration.</p>
          </div>
          <a
            class="schema-link"
            href="/schema/dashboard.schema.json"
            target="_blank"
            rel="noopener noreferrer"
            >View JSON schema</a
          >
        </div>
        ${
          this.dashboardError_
            ? html`<div class="error">${this.dashboardError_}</div>`
            : html`<pre><code>${jsonView(this.dashboard_)}</code></pre>`
        }
      </section>

      <section class="card">
        <div class="card-header">
          <div>
            <h2>Latest data JSON</h2>
            <p class="muted">Last data payload received by the display.</p>
          </div>
          <div class="stack">
            <span class="live-state ${this.frozen_ ? "frozen" : ""}"
              >${this.frozen_ ? "Frozen" : "Live"}</span
            >
            <button class="secondary" @click=${this.toggleFreeze_}>
              ${this.frozen_ ? "Resume" : "Freeze"}
            </button>
          </div>
        </div>
        ${
          this.dataError_
            ? html`<div class="error">${this.dataError_}</div>`
            : html`<pre aria-live="polite"><code>${jsonView(
                this.latestData_,
              )}</code></pre>`
        }
      </section>

      <section class="card danger-zone">
        <h2>Device recovery</h2>
        <p class="muted">
          These actions disconnect the display from its current network.
        </p>
        ${
          this.actionError_
            ? html`<div class="error">${this.actionError_}</div>`
            : nothing
        }
        <div class="actions">
          <button
            class="secondary"
            ?disabled=${this.acting_}
            @click=${() => this.showDialog_("restart-confirm")}
          >
            Restart display
          </button>
          <button
            class="warning"
            ?disabled=${this.acting_}
            @click=${() => this.showDialog_("setup-confirm")}
          >
            Enter Setup mode
          </button>
          <button
            class="danger"
            ?disabled=${this.acting_}
            @click=${() => this.showDialog_("factory-confirm")}
          >
            Factory reset
          </button>
        </div>
      </section>

      <dialog id="restart-confirm">
        <div class="dialog-body">
          <h2>Restart display?</h2>
          <p>
            The display will be unavailable briefly. No settings are removed.
          </p>
        </div>
        <div class="dialog-actions">
          <form method="dialog"><button class="secondary">Cancel</button></form>
          <button
            @click=${() => {
              (
                this.renderRoot.querySelector(
                  "#restart-confirm",
                ) as HTMLDialogElement
              ).close();
              void this.runAction_("/api/v1/restart");
            }}
          >
            Restart display
          </button>
        </div>
      </dialog>

      <dialog id="setup-confirm">
        <div class="dialog-body">
          <h2>Enter Setup mode?</h2>
          <p>
            The saved Wi-Fi name and password will be removed. The display will
            disconnect and create <strong>${this.recoverySsid}</strong>. Other
            settings will remain unchanged.
          </p>
        </div>
        <div class="dialog-actions">
          <form method="dialog"><button class="secondary">Cancel</button></form>
          <button
            class="warning"
            @click=${() => {
              (
                this.renderRoot.querySelector(
                  "#setup-confirm",
                ) as HTMLDialogElement
              ).close();
              void this.runAction_("/api/v1/setup-mode");
            }}
          >
            Enter Setup mode
          </button>
        </div>
      </dialog>

      <dialog id="factory-confirm">
        <div class="dialog-body">
          <h2>Factory reset?</h2>
          <p>
            This permanently removes Wi-Fi, authentication, network and display
            settings, and the stored dashboard. The display will restart in
            Setup mode and create <strong>${this.recoverySsid}</strong>.
          </p>
        </div>
        <div class="dialog-actions">
          <form method="dialog"><button class="secondary">Cancel</button></form>
          <button
            class="danger"
            @click=${() => {
              (
                this.renderRoot.querySelector(
                  "#factory-confirm",
                ) as HTMLDialogElement
              ).close();
              void this.runAction_("/api/v1/factory-reset");
            }}
          >
            Factory reset
          </button>
        </div>
      </dialog>
    </div>`;
  }
}
