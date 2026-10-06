import { html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { SetupStatus } from "../api";
import "./firmware";
import { NetworkFormPage } from "./network-form";
import type { SecurityFormState, SubmitRequest } from "./shared";

@customElement("mini-display-setup-page")
export class SetupPage extends NetworkFormPage {
  @property({ attribute: false }) setup?: SetupStatus;
  @property({ attribute: false }) saving = false;
  @property({ attribute: false }) message = "";
  @property({ attribute: false }) error = "";
  @property({ attribute: false }) securityState: SecurityFormState = {
    apiAuth: true,
    otaAuth: true,
    directOta: true,
  };
  @property({ attribute: false }) onSecurityState?: (
    state: SecurityFormState,
  ) => void;
  @property({ attribute: false }) submit?: SubmitRequest;
  @property({ attribute: false }) onUploadStart?: () => void;
  @property({ attribute: false }) onUploadSuccess?: (message: string) => void;
  @property({ attribute: false }) onUploadError?: (message: string) => void;

  private updateSecurityState_(change: Partial<SecurityFormState>) {
    this.onSecurityState?.({ ...this.securityState, ...change });
  }

  render() {
    const setup = this.setup;
    return html`<main class="center">
      <section class="card">
        <h1>Set up Mini Display</h1>
        <p class="muted">
          Connect to Wi-Fi and configure local access. Current setup network:
          ${setup?.recoverySsid ?? "SDPRO-Setup"}.
        </p>
        ${
          this.message
            ? html`<div class="notice">${this.message}</div>`
            : nothing
        }
        ${this.error ? html`<div class="error">${this.error}</div>` : nothing}
        <form
          class="stack"
          @submit=${(event: SubmitEvent) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget as HTMLFormElement);
            this.submit?.(
              "/api/v1/setup",
              {
                ssid: data.get("ssid"),
                wifiPassword: data.get("wifiPassword"),
                hostname: data.get("hostname"),
                recoveryPasswordEnabled: this.networkState.recoveryProtected,
                recoveryPassword: data.get("recoveryPassword"),
                ntpServer: data.get("ntpServer"),
                ntpFromDhcp: this.networkState.ntpFromDhcp,
                staticIpEnabled: this.networkState.staticIp,
                staticIp: data.get("staticIp"),
                gateway: data.get("gateway"),
                subnet: data.get("subnet"),
                dns1: data.get("dns1"),
                dns2: data.get("dns2"),
                username: data.get("username"),
                retryLimit: Number(data.get("retryLimit")),
                resetApiAuthOnRecovery: data.has("resetApiAuthOnRecovery"),
                apiAuthEnabled: this.securityState.apiAuth,
                apiPassword: data.get("apiPassword"),
                directOtaEnabled: this.securityState.directOta,
                otaAuthEnabled: this.securityState.otaAuth,
                otaPassword: data.get("otaPassword"),
              },
              "Configuration saved. Reconnect after the display restarts.",
            );
          }}
        >
          <label class="field"
            >Wi-Fi name<input
              name="ssid"
              type="text"
              maxlength="32"
              required
              .value=${setup?.ssid ?? ""}
          /></label>
          <label class="field"
            >Wi-Fi password
            <small
              >${
                setup?.configured
                  ? "Leave empty to keep the current password"
                  : "Leave empty for an open network"
              }</small
            ><input
              name="wifiPassword"
              type="password"
              maxlength="64"
              autocomplete="new-password"
          /></label>
          <label class="field"
            >Device hostname<input
              name="hostname"
              type="text"
              minlength="1"
              maxlength="32"
              pattern="[A-Za-z0-9](?:[A-Za-z0-9-]{0,30}[A-Za-z0-9])?"
              required
              .value=${setup?.hostname ?? "mini-display"}
          /></label>
          <fieldset class="choice">
            <legend>IP address assignment</legend>
            <label class="check"
              ><input
                type="radio"
                name="ipMode"
                value="dhcp"
                .checked=${!this.networkState.staticIp}
                @change=${() => this.updateNetworkState_({ staticIp: false })}
              />DHCP</label
            >
            <label class="check"
              ><input
                type="radio"
                name="ipMode"
                value="static"
                .checked=${this.networkState.staticIp}
                @change=${() =>
                  this.updateNetworkState_({
                    staticIp: true,
                    ntpFromDhcp: false,
                  })}
              />Static</label
            >
          </fieldset>
          <div
            class="dependent ${this.networkState.staticIp ? "" : "disabled"}"
          >
            ${this.ipv4Fields_({
              staticIp: setup?.staticIp ?? "",
              gateway: setup?.gateway ?? "",
              subnet: setup?.subnet ?? "",
              dns1: setup?.dns1 ?? "",
              dns2: setup?.dns2 ?? "",
            })}
          </div>
          ${this.ntpMode_(setup?.ntpServer ?? "pool.ntp.org")}
          ${this.setupMode_({
            retryLimit: setup?.retryLimit ?? 3,
            recoveryPasswordSet: setup?.recoveryPasswordSet ?? false,
            resetApiAuthOnRecovery: setup?.resetApiAuthOnRecovery ?? false,
          })}
          <label class="check"
            ><input
              type="checkbox"
              .checked=${this.securityState.apiAuth}
              @change=${(event: Event) =>
                this.updateSecurityState_({
                  apiAuth: (event.target as HTMLInputElement).checked,
                })}
            />Protect panel and Home Assistant API</label
          >
          <div
            class="dependent ${this.securityState.apiAuth ? "" : "disabled"}"
          >
            <label class="field"
              >Username <small>Used for panel login and direct OTA</small
              ><input
                name="username"
                type="text"
                minlength="1"
                maxlength="32"
                pattern="[A-Za-z0-9._-]+"
                required
                ?disabled=${!this.securityState.apiAuth}
                autocomplete="username"
                .value=${setup?.username ?? "admin"}
            /></label>
            <label class="field"
              >Panel/API password
              <small
                >${
                  setup?.apiPasswordSet
                    ? "Leave empty to keep the current password"
                    : "8-32 characters"
                }</small
              ><input
                name="apiPassword"
                type="password"
                minlength="8"
                maxlength="32"
                ?required=${
                  this.securityState.apiAuth && !setup?.apiPasswordSet
                }
                ?disabled=${!this.securityState.apiAuth}
                autocomplete="new-password"
            /></label>
          </div>
          <label class="check"
            ><input
              type="checkbox"
              .checked=${this.securityState.directOta}
              @change=${(event: Event) =>
                this.updateSecurityState_({
                  directOta: (event.target as HTMLInputElement).checked,
                })}
            />Allow direct OTA firmware updates</label
          >
          <div
            class="dependent ${this.securityState.directOta ? "" : "disabled"}"
          >
            <label class="check"
              ><input
                type="checkbox"
                .checked=${this.securityState.otaAuth}
                ?disabled=${!this.securityState.directOta}
                @change=${(event: Event) =>
                  this.updateSecurityState_({
                    otaAuth: (event.target as HTMLInputElement).checked,
                  })}
              />Protect direct OTA with password</label
            >
            <div
              class="dependent ${
                this.securityState.directOta && this.securityState.otaAuth
                  ? ""
                  : "disabled"
              }"
            >
              <label class="field"
                >OTA firmware update password
                <small
                  >${
                    setup?.otaPasswordSet
                      ? "Leave empty to keep the current password"
                      : "8-32 characters"
                  }</small
                ><input
                  name="otaPassword"
                  type="password"
                  minlength="8"
                  maxlength="32"
                  ?required=${
                    this.securityState.directOta &&
                    this.securityState.otaAuth &&
                    !setup?.otaPasswordSet
                  }
                  ?disabled=${
                    !this.securityState.directOta || !this.securityState.otaAuth
                  }
                  autocomplete="new-password"
              /></label>
            </div>
          </div>
          <button type="submit" ?disabled=${this.saving}>
            Save and restart
          </button>
        </form>
      </section>
      ${
        !setup?.configured || setup.directOtaEnabled
          ? html`<section class="card">
              <h2>Firmware update</h2>
              <p class="muted">
                Upload firmware without leaving setup mode. Existing direct OTA
                protection remains active after prior configuration.
              </p>
              <mini-display-firmware-page
                .compact=${true}
                .endpoint=${"/update"}
                .saving=${this.saving}
                .onStart=${this.onUploadStart}
                .onSuccess=${this.onUploadSuccess}
                .onError=${this.onUploadError}
              ></mini-display-firmware-page>
            </section>`
          : nothing
      }
    </main>`;
  }
}
