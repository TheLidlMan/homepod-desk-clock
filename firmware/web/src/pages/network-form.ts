import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { pageStyles } from "../styles";
import type { NetworkFormState } from "./shared";

export type Ipv4Values = {
  staticIp: string;
  gateway: string;
  subnet: string;
  dns1: string;
  dns2: string;
};

export abstract class NetworkFormPage extends LitElement {
  @property({ attribute: false }) networkState: NetworkFormState = {
    recoveryProtected: false,
    staticIp: false,
    ntpFromDhcp: false,
  };
  @property({ attribute: false }) onNetworkState?: (
    state: NetworkFormState,
  ) => void;

  static styles = pageStyles;

  protected updateNetworkState_(change: Partial<NetworkFormState>) {
    this.onNetworkState?.({ ...this.networkState, ...change });
  }

  protected networkPayload_(data: FormData) {
    return {
      ssid: data.get("ssid"),
      password: data.get("password"),
      hostname: data.get("hostname"),
      retryLimit: Number(data.get("retryLimit")),
      resetApiAuthOnRecovery: data.has("resetApiAuthOnRecovery"),
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
    };
  }

  protected ipv4Fields_(values: Ipv4Values) {
    const fields: [keyof Ipv4Values, string, string, boolean][] = [
      ["staticIp", "IP address", "192.168.1.50", true],
      ["gateway", "Gateway", "192.168.1.1", true],
      ["subnet", "Subnet mask", "255.255.255.0", true],
      ["dns1", "Primary DNS", "192.168.1.1", false],
      ["dns2", "Secondary DNS", "1.1.1.1", false],
    ];
    return fields.map(
      ([name, label, placeholder, required]) =>
        html`<label class="field"
          >${label}<input
            name=${name}
            type="text"
            inputmode="decimal"
            maxlength="15"
            placeholder=${placeholder}
            ?required=${this.networkState.staticIp && required}
            ?disabled=${!this.networkState.staticIp}
            .value=${values[name]}
        /></label>`,
    );
  }

  protected ntpMode_(ntpServer: string) {
    return html`<fieldset class="choice">
        <legend>NTP server</legend>
        <label class="check"
          ><input
            type="radio"
            name="ntpMode"
            value="custom"
            .checked=${!this.networkState.ntpFromDhcp}
            @change=${() => this.updateNetworkState_({ ntpFromDhcp: false })}
          />Custom</label
        >
        <label class="check"
          ><input
            type="radio"
            name="ntpMode"
            value="dhcp"
            ?disabled=${this.networkState.staticIp}
            .checked=${this.networkState.ntpFromDhcp}
            @change=${() => this.updateNetworkState_({ ntpFromDhcp: true })}
          />From DHCP</label
        >
      </fieldset>
      <label
        class="field dependent ${
          this.networkState.ntpFromDhcp ? "disabled" : ""
        }"
        >NTP server address
        <small
          >Hostname or IP address. DHCP mode uses option 42 and requires DHCP
          address assignment.</small
        ><input
          name="ntpServer"
          type="text"
          maxlength="63"
          required
          ?disabled=${this.networkState.ntpFromDhcp}
          .value=${ntpServer || "pool.ntp.org"}
      /></label>`;
  }

  protected setupMode_(options: {
    retryLimit: number;
    recoverySsid?: string;
    recoveryPasswordSet: boolean;
    resetApiAuthOnRecovery: boolean;
  }) {
    return html`<section class="form-section">
      <h3>Setup mode</h3>
      <label class="field"
        >Attempts before activation
        <small
          >Each attempt lasts up to 20
          seconds${
            options.recoverySsid
              ? `. The display then opens ${options.recoverySsid}.`
              : ""
          }</small
        ><input
          name="retryLimit"
          type="number"
          min="1"
          max="10"
          required
          .value=${String(options.retryLimit)}
      /></label>
      <label class="check"
        ><input
          type="checkbox"
          .checked=${this.networkState.recoveryProtected}
          @change=${(event: Event) =>
            this.updateNetworkState_({
              recoveryProtected: (event.target as HTMLInputElement).checked,
            })}
        />Protect Wi-Fi with password</label
      >
      <div
        class="dependent ${
          this.networkState.recoveryProtected ? "" : "disabled"
        }"
      >
        <label class="field"
          >Wi-Fi password
          <small
            >Shown on the physical display while active. Leave empty to keep the
            current password.</small
          ><input
            name="recoveryPassword"
            type="password"
            minlength="8"
            maxlength="63"
            ?required=${
              this.networkState.recoveryProtected &&
              !options.recoveryPasswordSet
            }
            ?disabled=${!this.networkState.recoveryProtected}
            autocomplete="new-password"
        /></label>
      </div>
      <label class="check"
        ><input
          type="checkbox"
          name="resetApiAuthOnRecovery"
          .checked=${options.resetApiAuthOnRecovery}
        />Disable panel/API password when activated</label
      >
    </section>`;
  }
}
