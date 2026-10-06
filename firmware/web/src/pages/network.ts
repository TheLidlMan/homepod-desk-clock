import { html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { NetworkStatus } from "../api";
import { signalQuality } from "../format";
import { NetworkFormPage } from "./network-form";
import type { SubmitRequest } from "./shared";

@customElement("mini-display-network-page")
export class NetworkPage extends NetworkFormPage {
  @property({ attribute: false }) network?: NetworkStatus;
  @property({ attribute: false }) saving = false;
  @property({ attribute: false }) submit?: SubmitRequest;

  render() {
    const network = this.network;
    if (!network) return nothing;
    return html`<div class="stack">
      <section class="card">
        <h2>Connection</h2>
        <div class="facts">
          <div class="fact">
            <strong>Signal</strong
            ><span
              >${signalQuality(network.rssiDbm)} · ${network.rssiDbm} dBm</span
            >
          </div>
          <div class="fact">
            <strong>IP address</strong><span>${network.ip}</span>
          </div>
          <div class="fact">
            <strong>Gateway</strong><span>${network.gateway}</span>
          </div>
          <div class="fact">
            <strong>DNS</strong
            ><span
              >${network.dns1Current}${
                network.dns2Current !== "0.0.0.0"
                  ? `, ${network.dns2Current}`
                  : ""
              }</span
            >
          </div>
          <div class="fact">
            <strong>Channel</strong><span>${network.channel}</span>
          </div>
          <div class="fact">
            <strong>BSSID</strong><span>${network.bssid || "Unavailable"}</span>
          </div>
          <div class="fact">
            <strong>Device MAC</strong><span>${network.mac}</span>
          </div>
          <div class="fact">
            <strong>Reconnects</strong
            ><span
              >${network.reconnectCount} · ${network.lastDisconnectReason}</span
            >
          </div>
          <div class="fact">
            <strong>NTP source</strong
            ><span
              >${
                network.ntpFromDhcp ? "DHCP option 42" : network.ntpServer
              }</span
            >
          </div>
        </div>
      </section>
      <section class="card">
        <h2>Wi-Fi settings</h2>
        <form
          class="stack"
          @submit=${(event: SubmitEvent) => {
            event.preventDefault();
            this.submit?.(
              "/api/v1/network",
              this.networkPayload_(
                new FormData(event.currentTarget as HTMLFormElement),
              ),
              "Network settings saved. The display is restarting.",
            );
          }}
        >
          <label class="field"
            >Network name<input
              name="ssid"
              type="text"
              maxlength="32"
              required
              .value=${network.ssid}
          /></label>
          <label class="field"
            >Wi-Fi password
            <small>Leave empty to keep the current password</small
            ><input
              name="password"
              type="password"
              maxlength="64"
              autocomplete="new-password"
          /></label>
          <label class="field"
            >Device hostname
            <small>Available as ${network.hostname}.local</small
            ><input
              name="hostname"
              type="text"
              minlength="1"
              maxlength="32"
              pattern="[A-Za-z0-9](?:[A-Za-z0-9-]{0,30}[A-Za-z0-9])?"
              required
              .value=${network.hostname}
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
              staticIp: network.staticIp,
              gateway: network.staticGateway,
              subnet: network.staticSubnet,
              dns1: network.staticDns1,
              dns2: network.staticDns2,
            })}
          </div>
          ${this.ntpMode_(network.ntpServer)}
          ${this.setupMode_({
            retryLimit: network.retryLimit,
            recoverySsid: network.recoverySsid,
            recoveryPasswordSet: network.recoveryPasswordSet,
            resetApiAuthOnRecovery: network.resetApiAuthOnRecovery,
          })}
          <p class="muted">Firmware update protection remains unchanged.</p>
          <div class="actions">
            <button type="submit" ?disabled=${this.saving}>
              Save and restart
            </button>
            <button
              type="button"
              class="secondary"
              ?disabled=${this.saving}
              @click=${(event: Event) => {
                const form = (event.currentTarget as HTMLButtonElement).form!;
                if (!form.reportValidity()) return;
                this.submit?.(
                  "/api/v1/network/test",
                  this.networkPayload_(new FormData(form)),
                  "Settings are valid. Connection will be verified after save.",
                  "POST",
                );
              }}
            >
              Test settings
            </button>
          </div>
        </form>
      </section>
    </div>`;
  }
}
