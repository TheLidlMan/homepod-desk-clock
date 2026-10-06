import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { request, type SecurityStatus, uploadTlsCredential } from "../api";
import { features } from "../features";
import { pageStyles } from "../styles";
import type { SubmitRequest } from "./shared";

@customElement("mini-display-security-page")
export class SecurityPage extends LitElement {
  @property({ attribute: false }) security?: SecurityStatus;
  @property({ attribute: false }) saving = false;
  @property({ attribute: false }) submit?: SubmitRequest;
  @property({ attribute: false }) onStart?: () => void;
  @property({ attribute: false }) onSuccess?: (message: string) => void;
  @property({ attribute: false }) onError?: (message: string) => void;

  @state() private apiAuth_ = true;
  @state() private otaAuth_ = true;
  @state() private directOta_ = true;
  @state() private https_ = false;
  private initialized_ = false;

  protected willUpdate() {
    if (!this.security || this.initialized_) return;
    this.apiAuth_ = this.security.apiAuthEnabled;
    this.otaAuth_ = this.security.otaAuthEnabled;
    this.directOta_ = this.security.directOtaEnabled;
    this.https_ = this.security.httpsEnabled;
    this.initialized_ = true;
  }

  render() {
    const security = this.security;
    if (!security) return nothing;
    return html`<div class="stack">
      <section class="card">
        <h2>Authentication</h2>
        <p class="muted">
          Panel/API and firmware updates can be protected independently. Empty
          password fields keep existing passwords.
        </p>
        <form
          class="stack"
          @submit=${(event: SubmitEvent) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget as HTMLFormElement);
            this.submit?.(
              "/api/v1/security",
              {
                username: data.get("username"),
                apiAuthEnabled: data.has("apiAuthEnabled"),
                apiPassword: data.get("apiPassword"),
                directOtaEnabled: this.directOta_,
                otaAuthEnabled: this.otaAuth_,
                otaPassword: data.get("otaPassword"),
                ...(features.tls ? { httpsEnabled: this.https_ } : {}),
              },
              "Security settings saved. Reload if login credentials changed.",
            );
          }}
        >
          <label class="check"
            ><input
              type="checkbox"
              name="apiAuthEnabled"
              .checked=${this.apiAuth_}
              @change=${(event: Event) =>
                (this.apiAuth_ = (event.target as HTMLInputElement).checked)}
            />Protect panel and Home Assistant API</label
          >
          <div class="dependent ${this.apiAuth_ ? "" : "disabled"}">
            <label class="field"
              >Username <small>Used for panel login and direct OTA</small
              ><input
                name="username"
                type="text"
                minlength="1"
                maxlength="32"
                pattern="[A-Za-z0-9._-]+"
                required
                ?disabled=${!this.apiAuth_}
                autocomplete="username"
                .value=${security.username || "admin"}
            /></label>
            <label class="field"
              >New panel/API password
              <small
                >Leave empty to keep the current password · 8-32
                characters</small
              ><input
                name="apiPassword"
                type="password"
                minlength="8"
                maxlength="32"
                ?disabled=${!this.apiAuth_}
                autocomplete="new-password"
            /></label>
          </div>
          <label class="check"
            ><input
              type="checkbox"
              .checked=${this.directOta_}
              @change=${(event: Event) =>
                (this.directOta_ = (event.target as HTMLInputElement).checked)}
            />Allow direct OTA firmware updates</label
          >
          <div class="dependent ${this.directOta_ ? "" : "disabled"}">
            <label class="check"
              ><input
                type="checkbox"
                .checked=${this.otaAuth_}
                ?disabled=${!this.directOta_}
                @change=${(event: Event) =>
                  (this.otaAuth_ = (event.target as HTMLInputElement).checked)}
              />Protect direct OTA with password</label
            >
            <div
              class="dependent ${
                this.directOta_ && this.otaAuth_ ? "" : "disabled"
              }"
            >
              <label class="field"
                >OTA firmware update password
                <small
                  >Leave empty to keep the current password · 8-32
                  characters</small
                ><input
                  name="otaPassword"
                  type="password"
                  minlength="8"
                  maxlength="32"
                  ?disabled=${!this.directOta_ || !this.otaAuth_}
                  autocomplete="new-password"
              /></label>
            </div>
          </div>
          <button type="submit" ?disabled=${this.saving}>
            Save security settings
          </button>
        </form>
      </section>
      ${
        features.tls && security.httpsSupported
          ? html`<section class="card">
              <h2>HTTPS</h2>
              <p class="muted">
                When enabled, browser pages redirect from HTTP to HTTPS. The API
                remains available on both transports so Home Assistant can
                switch safely.
              </p>
              <label class="check"
                ><input
                  type="checkbox"
                  .checked=${this.https_}
                  ?disabled=${!security.httpsAvailable}
                  @change=${(event: Event) =>
                    (this.https_ = (event.target as HTMLInputElement).checked)}
                />Use HTTPS for the device panel</label
              >
              <div class="actions">
                <button
                  type="button"
                  ?disabled=${this.saving || !security.httpsAvailable}
                  @click=${() =>
                    this.submit?.(
                      "/api/v1/security",
                      { httpsEnabled: this.https_ },
                      this.https_
                        ? "HTTPS enabled. HTTP panel requests now redirect to HTTPS."
                        : "HTTPS preference disabled.",
                    )}
                >
                  Save HTTPS preference
                </button>
              </div>
              <div class="facts certificate-facts">
                <div class="fact">
                  <strong>Certificate</strong
                  ><span
                    >${security.httpsAvailable ? "Ready" : "Not configured"}</span
                  >
                </div>
                <div class="fact">
                  <strong>Source</strong
                  ><span>${security.tlsCertificateSource ?? "none"}</span>
                </div>
                <div class="fact">
                  <strong>Algorithm</strong
                  ><span>${security.tlsCertificateAlgorithm ?? "none"}</span>
                </div>
              </div>
              ${
                security.tlsCertificateFingerprint
                  ? html`<div class="fingerprint">
                      <strong>SHA-256 fingerprint</strong>
                      <code>${security.tlsCertificateFingerprint}</code>
                    </div>`
                  : nothing
              }
              <div class="actions">
                <button
                  type="button"
                  class="secondary"
                  ?disabled=${this.saving}
                  @click=${() =>
                    this.renderRoot
                      .querySelector<HTMLDialogElement>("#generate-tls")
                      ?.showModal()}
                >
                  Generate self-signed certificate
                </button>
              </div>
              <form class="form-section" @submit=${this.uploadCertificate_}>
                <h3>Upload certificate</h3>
                <label class="field"
                  >Certificate
                  <small>PEM or DER X.509 certificate</small>
                  <input name="certificate" type="file" required />
                </label>
                <label class="field"
                  >Private key
                  <small>PEM or DER EC private key</small>
                  <input name="privateKey" type="file" required />
                </label>
                <button type="submit" ?disabled=${this.saving}>
                  Upload and restart
                </button>
              </form>
              <dialog id="generate-tls">
                <form method="dialog" class="stack">
                  <h3>Replace TLS certificate?</h3>
                  <p class="muted">
                    The display will generate a new ECDSA P-256 certificate and
                    restart. Browsers will ask you to trust this self-signed
                    certificate.
                  </p>
                  <div class="actions">
                    <button value="cancel" class="secondary">Cancel</button>
                    <button value="confirm" @click=${this.generateCertificate_}>
                      Generate and restart
                    </button>
                  </div>
                </form>
              </dialog>
            </section>`
          : nothing
      }
    </div>`;
  }

  private generateCertificate_ = async (event: Event) => {
    event.preventDefault();
    this.renderRoot.querySelector<HTMLDialogElement>("#generate-tls")?.close();
    this.onStart?.();
    try {
      await request("/api/v1/tls/generate", { method: "POST" });
      this.onSuccess?.("Certificate generated. The display is restarting.");
    } catch (error) {
      this.onError?.(
        error instanceof Error
          ? error.message
          : "Certificate generation failed",
      );
    }
  };

  private uploadCertificate_ = async (event: SubmitEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const certificate = data.get("certificate");
    const privateKey = data.get("privateKey");
    if (!(certificate instanceof File) || !(privateKey instanceof File)) return;
    this.onStart?.();
    try {
      await uploadTlsCredential("certificate", certificate);
      await uploadTlsCredential("private-key", privateKey);
      await request("/api/v1/tls/install", { method: "POST" });
      this.onSuccess?.("Certificate installed. The display is restarting.");
      form.reset();
    } catch (error) {
      this.onError?.(
        error instanceof Error
          ? error.message
          : "Certificate installation failed",
      );
    }
  };

  static styles = [
    pageStyles,
    css`
      .certificate-facts {
        margin-top: 16px;
      }
      .fingerprint {
        display: grid;
        gap: 5px;
        margin-top: 14px;
      }
      .fingerprint strong {
        font-size: 12px;
        color: var(--muted);
      }
      .fingerprint code {
        overflow-wrap: anywhere;
        font-size: 12px;
      }
      dialog {
        max-width: 430px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: var(--panel);
        color: var(--text);
        padding: 18px;
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 55%);
      }
      dialog h3,
      dialog p {
        margin: 0;
      }
    `,
  ];
}
