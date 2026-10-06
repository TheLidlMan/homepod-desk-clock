import { html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  DeviceApiError,
  type DeviceInfo,
  type DeviceStatus,
  type FirmwareSettings,
  type NetworkStatus,
  type SecurityStatus,
  type SetupStatus,
  request,
} from "./api";
import {
  fetchFirmwareReleases,
  type FirmwareRelease,
  compareInstalledVersion,
  newestStableRelease,
} from "./firmware-releases";
import "./pages/display";
import "./pages/diagnostics";
import "./pages/firmware";
import "./pages/network";
import "./pages/overview";
import "./pages/security";
import "./pages/setup";
import type {
  NetworkFormState,
  SecurityFormState,
  SubmitRequest,
} from "./pages/shared";
import { shellStyles } from "./styles";

type Page =
  "overview" | "display" | "network" | "security" | "diagnostics" | "firmware";

const pageFromPath = (): Page =>
  (({
    "/display": "display",
    "/network": "network",
    "/security": "security",
    "/diagnostics": "diagnostics",
    "/update": "firmware",
  })[location.pathname] as Page | undefined) ?? "overview";

@customElement("mini-display-device")
class MiniDisplayDevice extends LitElement {
  @state() private configured_ = true;
  @state() private loading_ = true;
  @state() private saving_ = false;
  @state() private firmwareUpdating_ = false;
  @state() private message_ = "";
  @state() private error_ = "";
  @state() private info_?: DeviceInfo;
  @state() private status_?: DeviceStatus;
  @state() private network_?: NetworkStatus;
  @state() private security_?: SecurityStatus;
  @state() private setup_?: SetupStatus;
  @state() private firmwareSettings_?: FirmwareSettings;
  @state() private releases_: FirmwareRelease[] = [];
  @state() private releasesLoading_ = false;
  @state() private releasesError_ = "";
  @state() private networkState_: NetworkFormState = {
    recoveryProtected: false,
    staticIp: false,
    ntpFromDhcp: false,
  };
  @state() private securityState_: SecurityFormState = {
    apiAuth: true,
    otaAuth: true,
    directOta: true,
  };

  private readonly page_ = pageFromPath();
  private statusTimer_?: number;
  private releasesTimer_?: number;

  static styles = shellStyles;

  connectedCallback() {
    super.connectedCallback();
    void this.load_();
    this.statusTimer_ = window.setInterval(
      () => void this.refreshStatus_(),
      5000,
    );
    this.releasesTimer_ = window.setInterval(
      () => void this.refreshReleases_(),
      6 * 60 * 60 * 1000,
    );
  }

  disconnectedCallback() {
    if (this.statusTimer_ !== undefined)
      window.clearInterval(this.statusTimer_);
    if (this.releasesTimer_ !== undefined)
      window.clearInterval(this.releasesTimer_);
    super.disconnectedCallback();
  }

  private async refreshStatus_() {
    if (!this.configured_ || this.loading_ || this.saving_ || !this.status_)
      return;
    try {
      this.status_ = await request<DeviceStatus>("/api/v1/status");
    } catch {
      // Keep the last known state; the next interval retries.
    }
  }

  private async load_() {
    this.loading_ = true;
    this.error_ = "";
    try {
      // ESP8266 serves one request at a time. Loading both endpoints in
      // parallel can leave one browser fetch waiting on a reused connection.
      this.info_ = await request<DeviceInfo>("/api/v1/info");
      this.status_ = await request<DeviceStatus>("/api/v1/status");
      if (this.page_ === "network") {
        this.network_ = await request<NetworkStatus>("/api/v1/network");
        this.networkState_ = {
          recoveryProtected: this.network_.recoveryPasswordSet,
          staticIp: this.network_.staticIpEnabled,
          ntpFromDhcp: this.network_.ntpFromDhcp,
        };
      }
      if (this.page_ === "security")
        this.security_ = await request<SecurityStatus>("/api/v1/security");
      if (this.page_ === "firmware")
        this.firmwareSettings_ =
          await request<FirmwareSettings>("/api/v1/firmware");
    } catch (error) {
      if (error instanceof DeviceApiError && error.status === 403) {
        try {
          this.setup_ = await request<SetupStatus>("/api/v1/setup");
          this.configured_ = false;
          this.networkState_ = {
            recoveryProtected: this.setup_.recoveryPasswordSet,
            staticIp: this.setup_.staticIpEnabled,
            ntpFromDhcp: this.setup_.ntpFromDhcp,
          };
          this.securityState_ = {
            apiAuth: this.setup_.apiAuthEnabled,
            otaAuth: this.setup_.otaAuthEnabled,
            directOta: this.setup_.directOtaEnabled,
          };
        } catch (setupError) {
          this.error_ =
            setupError instanceof Error
              ? setupError.message
              : "Could not load setup mode";
        }
      } else {
        this.error_ =
          error instanceof Error ? error.message : "Could not load device";
      }
    } finally {
      this.loading_ = false;
    }
    if (this.configured_) void this.refreshReleases_();
  }

  private async refreshReleases_() {
    this.releasesLoading_ = true;
    this.releasesError_ = "";
    try {
      this.releases_ = await fetchFirmwareReleases();
      const latest = newestStableRelease(this.releases_);
      if (latest && this.info_?.hardwareProfile === "juzipi-sd-pro") {
        await request("/api/v1/firmware", {
          method: "PUT",
          body: JSON.stringify({ availableVersion: latest.version }),
        });
        if (this.firmwareSettings_)
          this.firmwareSettings_ = {
            ...this.firmwareSettings_,
            availableVersion: latest.version,
            updateAvailable:
              compareInstalledVersion(
                latest.version,
                this.info_?.firmwareVersion ?? "",
              ) > 0,
          };
      }
    } catch (error) {
      this.releasesError_ =
        error instanceof Error ? error.message : "Could not check releases";
    } finally {
      this.releasesLoading_ = false;
    }
  }

  private readonly submit_: SubmitRequest = async (
    path,
    body,
    success,
    method = "PUT",
  ) => {
    this.saving_ = true;
    this.message_ = "";
    this.error_ = "";
    try {
      await request(path, { method, body: JSON.stringify(body) });
      if (path === "/api/v1/page" || path === "/api/v1/notifications") {
        this.status_ = await request<DeviceStatus>("/api/v1/status");
      }
      this.message_ = success;
    } catch (error) {
      this.error_ = error instanceof Error ? error.message : "Request failed";
    } finally {
      this.saving_ = false;
    }
  };

  private uploadStart_ = () => {
    this.saving_ = true;
    this.message_ = "";
    this.error_ = "";
  };

  private uploadSuccess_ = (message: string) => {
    this.saving_ = false;
    this.message_ = message;
  };

  private uploadError_ = (message: string) => {
    this.saving_ = false;
    this.error_ = message;
  };

  private firmwareUpdateStart_ = () => {
    this.firmwareUpdating_ = true;
    this.saving_ = true;
    this.message_ = "";
    this.error_ = "";
  };

  private firmwareUpdateSuccess_ = (message: string) => {
    this.message_ = message;
  };

  private firmwareUpdateError_ = (message: string) => {
    this.firmwareUpdating_ = false;
    this.saving_ = false;
    this.error_ = message;
  };

  private firmwareSettingsSuccess_ = (
    message: string,
    settings: FirmwareSettings,
  ) => {
    this.firmwareSettings_ = settings;
    this.uploadSuccess_(message);
  };

  private navigation_() {
    const items: [Page, string, string][] = [
      ["overview", "/", "Overview"],
      ["display", "/display", "Display"],
      ["network", "/network", "Network"],
      ["security", "/security", "Security"],
      ["diagnostics", "/diagnostics", "Diagnostics"],
      ["firmware", "/update", "Firmware"],
    ];
    return html`<nav>
      ${items.map(
        ([page, path, label]) =>
          html`<a
            href=${path}
            aria-current=${this.page_ === page ? "page" : nothing}
            >${label}</a
          >`,
      )}
    </nav>`;
  }

  private shell_(content: unknown) {
    return html`<header ?inert=${this.firmwareUpdating_}>
        <div class="head">
          <div>
            <h1>Mini Display</h1>
            <p>${this.info_?.model ?? "Local display control"}</p>
          </div>
          <div class="head-status">
            ${this.status_?.ip ?? "0.0.0.0"}<br />${
              this.status_?.wifiRssiDbm ?? -127
            }
            dBm
          </div>
        </div>
        ${this.navigation_()}
      </header>
      <main>
        ${
          this.firmwareUpdating_
            ? html`<div
                class="update-warning"
                role="status"
                aria-live="assertive"
              >
                <strong>Firmware update in progress</strong>
                <span>Do not disconnect the display from power.</span>
              </div>`
            : nothing
        }
        <div ?inert=${this.firmwareUpdating_}>
          ${
            this.message_
              ? html`<div class="notice">${this.message_}</div>`
              : nothing
          }
          ${this.error_ ? html`<div class="error">${this.error_}</div>` : nothing}
          ${content}
        </div>
      </main>`;
  }

  private pageContent_() {
    if (!this.status_)
      return html`<mini-display-overview
        .info=${this.info_}
      ></mini-display-overview>`;
    if (this.page_ === "display")
      return html`<mini-display-display-page
        .status=${this.status_}
        .saving=${this.saving_}
        .submit=${this.submit_}
      ></mini-display-display-page>`;
    if (this.page_ === "network")
      return html`<mini-display-network-page
        .network=${this.network_}
        .networkState=${this.networkState_}
        .saving=${this.saving_}
        .submit=${this.submit_}
        .onNetworkState=${(state: NetworkFormState) =>
          (this.networkState_ = state)}
      ></mini-display-network-page>`;
    if (this.page_ === "security")
      return html`<mini-display-security-page
        .security=${this.security_}
        .saving=${this.saving_}
        .submit=${this.submit_}
        .onStart=${this.uploadStart_}
        .onSuccess=${this.uploadSuccess_}
        .onError=${this.uploadError_}
      ></mini-display-security-page>`;
    if (this.page_ === "firmware")
      return html`<mini-display-firmware-page
        .saving=${this.saving_}
        .currentVersion=${this.info_?.firmwareVersion ?? ""}
        .hardwareProfile=${this.info_?.hardwareProfile ?? ""}
        .releases=${this.releases_}
        .releasesLoading=${this.releasesLoading_}
        .releasesError=${this.releasesError_}
        .settings=${this.firmwareSettings_}
        .onRefreshReleases=${() => void this.refreshReleases_()}
        .onStart=${this.firmwareUpdateStart_}
        .onSuccess=${this.firmwareUpdateSuccess_}
        .onError=${this.firmwareUpdateError_}
        .onSettingsStart=${this.uploadStart_}
        .onSettingsSuccess=${this.firmwareSettingsSuccess_}
        .onSettingsError=${this.uploadError_}
      ></mini-display-firmware-page>`;
    if (this.page_ === "diagnostics")
      return html`<mini-display-diagnostics-page
        .recoverySsid=${this.status_.recoverySsid}
        .status=${this.status_}
      ></mini-display-diagnostics-page>`;
    return html`<mini-display-overview
      .info=${this.info_}
      .status=${this.status_}
      .latestRelease=${
        this.info_?.hardwareProfile === "juzipi-sd-pro"
          ? newestStableRelease(this.releases_)
          : undefined
      }
    ></mini-display-overview>`;
  }

  render() {
    if (this.loading_) return html`<div class="loading">Loading device…</div>`;
    if (!this.configured_)
      return html`<mini-display-setup-page
        .setup=${this.setup_}
        .saving=${this.saving_}
        .message=${this.message_}
        .error=${this.error_}
        .networkState=${this.networkState_}
        .securityState=${this.securityState_}
        .submit=${this.submit_}
        .onNetworkState=${(state: NetworkFormState) =>
          (this.networkState_ = state)}
        .onSecurityState=${(state: SecurityFormState) =>
          (this.securityState_ = state)}
        .onUploadStart=${this.firmwareUpdateStart_}
        .onUploadSuccess=${this.firmwareUpdateSuccess_}
        .onUploadError=${this.firmwareUpdateError_}
      ></mini-display-setup-page>`;
    return this.shell_(this.pageContent_());
  }
}
