import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { type FirmwareSettings, request, uploadFirmware } from "../api";
import {
  compareInstalledVersion,
  downloadFirmwareRelease,
  type FirmwareRelease,
  newestStableRelease,
} from "../firmware-releases";
import { pageStyles } from "../styles";

@customElement("mini-display-firmware-page")
export class FirmwarePage extends LitElement {
  @property({ attribute: false }) saving = false;
  @property({ attribute: false }) endpoint = "/api/v1/firmware";
  @property({ attribute: false }) currentVersion = "";
  @property({ attribute: false }) hardwareProfile = "";
  @property({ attribute: false }) releases: FirmwareRelease[] = [];
  @property({ attribute: false }) releasesLoading = false;
  @property({ attribute: false }) releasesError = "";
  @property({ attribute: false }) settings?: FirmwareSettings;
  @property({ attribute: false }) onRefreshReleases?: () => void;
  @property({ attribute: false }) onStart?: () => void;
  @property({ attribute: false }) onSuccess?: (message: string) => void;
  @property({ attribute: false }) onError?: (message: string) => void;
  @property({ attribute: false }) onSettingsStart?: () => void;
  @property({ attribute: false }) onSettingsSuccess?: (
    message: string,
    settings: FirmwareSettings,
  ) => void;
  @property({ attribute: false }) onSettingsError?: (message: string) => void;
  @property({ attribute: false }) compact = false;

  @state() private selectedVersion_ = "";
  @state() private downgradeConfirmed_ = false;
  @state() private transferStage_ = "";
  @state() private transferPercent_?: number;

  static styles = pageStyles;

  protected willUpdate() {
    if (
      this.releases.length &&
      !this.releases.some(
        (release) => release.version === this.selectedVersion_,
      )
    ) {
      this.selectedVersion_ = this.releases[0].version;
    }
  }

  private async upload_(event: SubmitEvent) {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const file = data.get("firmware");
    if (!(file instanceof File) || !file.size) return;
    await this.install_(file);
  }

  private async installSelected_() {
    const release = this.releases.find(
      (candidate) => candidate.version === this.selectedVersion_,
    );
    if (!release) return;
    if (this.isDowngrade_() && !this.downgradeConfirmed_) return;
    this.onStart?.();
    this.transferStage_ = "Downloading firmware";
    this.transferPercent_ = 0;
    try {
      const file = await downloadFirmwareRelease(
        release,
        (downloaded, total) => {
          this.transferPercent_ = Math.min(
            100,
            Math.round((downloaded / total) * 100),
          );
        },
      );
      this.transferStage_ = "Uploading firmware to the display";
      this.transferPercent_ = undefined;
      this.onSuccess?.(await uploadFirmware(file, this.endpoint));
    } catch (error) {
      this.transferStage_ = "";
      this.onError?.(
        error instanceof Error ? error.message : "Firmware update failed",
      );
    }
  }

  private isDowngrade_() {
    return (
      !!this.currentVersion &&
      !!this.selectedVersion_ &&
      compareInstalledVersion(this.selectedVersion_, this.currentVersion) < 0
    );
  }

  private async install_(file: File) {
    this.onStart?.();
    try {
      this.onSuccess?.(await uploadFirmware(file, this.endpoint));
    } catch (error) {
      this.onError?.(
        error instanceof Error ? error.message : "Firmware upload failed",
      );
    }
  }

  private async saveSettings_(event: SubmitEvent) {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    this.onSettingsStart?.();
    try {
      const notificationsEnabled = data.has("notificationsEnabled");
      const notificationDurationSeconds = Number(
        data.get("notificationDurationSeconds"),
      );
      const reminderHours = Number(data.get("reminderHours"));
      await request("/api/v1/firmware", {
        method: "PUT",
        body: JSON.stringify({
          notificationsEnabled,
          notificationDurationSeconds,
          reminderHours,
        }),
      });
      if (this.settings) {
        const settings = {
          ...this.settings,
          notificationsEnabled,
          notificationDurationSeconds,
          reminderHours,
        };
        this.settings = settings;
        this.onSettingsSuccess?.(
          "Firmware notification settings saved.",
          settings,
        );
      } else {
        this.onSettingsSuccess?.("Firmware notification settings saved.", {
          notificationsEnabled,
          notificationDurationSeconds,
          reminderHours,
          availableVersion: "",
          updateAvailable: false,
        });
      }
    } catch (error) {
      this.onSettingsError?.(
        error instanceof Error ? error.message : "Could not save settings",
      );
    }
  }

  private manualUpload_() {
    return html`<form class="stack" @submit=${this.upload_}>
      <label class="field"
        >Firmware image<input
          type="file"
          name="firmware"
          accept=".bin"
          required
          ?disabled=${this.saving} /></label
      ><button type="submit" ?disabled=${this.saving}>Upload firmware</button>
    </form>`;
  }

  private onlineUpdate_() {
    if (this.hardwareProfile !== "juzipi-sd-pro") {
      return html`<section class="card">
        <h2>Install from GitHub</h2>
        <p class="muted">
          No hardware-tested release images are available for this profile.
        </p>
      </section>`;
    }
    const latest = newestStableRelease(this.releases);
    const updateAvailable =
      latest &&
      compareInstalledVersion(latest.version, this.currentVersion) > 0;
    const downgrade = this.isDowngrade_();
    return html`<section class="card">
      <h2>Install from GitHub</h2>
      <p class="muted">Installed: ${this.currentVersion || "unknown"}</p>
      ${
        this.releasesLoading
          ? html`<p class="muted">Checking available releases…</p>`
          : this.releasesError
            ? html`<div class="error" role="alert">${this.releasesError}</div>
                <button
                  class="secondary"
                  type="button"
                  ?disabled=${this.saving}
                  @click=${() => this.onRefreshReleases?.()}
                >
                  Check again
                </button>`
            : this.releases.length
              ? html`${
                    updateAvailable
                      ? html`<div class="notice">
                          Update available: ${latest?.version}
                        </div>`
                      : html`<p class="muted">Firmware is up to date.</p>`
                  }
                  <div class="stack">
                    <label class="field"
                      >Version
                      <select
                        ?disabled=${this.saving || !this.releases.length}
                        @change=${(event: Event) => {
                          this.selectedVersion_ = (
                            event.currentTarget as HTMLSelectElement
                          ).value;
                          this.downgradeConfirmed_ = false;
                        }}
                      >
                        ${this.releases.map((release, index) => {
                          const older =
                            compareInstalledVersion(
                              release.version,
                              this.currentVersion,
                            ) < 0;
                          return html`<option
                            value=${release.version}
                            class=${older ? "older-version" : nothing}
                            ?selected=${release.version === this.selectedVersion_}
                          >
                            ${release.version}${index === 0 ? " - latest" : ""}${
                              release.version === this.currentVersion
                                ? " - installed"
                                : ""
                            }${release.prerelease ? " - pre-release" : ""}
                          </option>`;
                        })}
                      </select></label
                    >
                    ${
                      downgrade
                        ? html`<div class="warning" role="alert">
                            Installing older firmware may make the display
                            unusable or require manual recovery.
                            <label class="check"
                              ><input
                                type="checkbox"
                                .checked=${this.downgradeConfirmed_}
                                ?disabled=${this.saving}
                                @change=${(event: Event) =>
                                  (this.downgradeConfirmed_ = (
                                    event.currentTarget as HTMLInputElement
                                  ).checked)}
                              />I’m sure, I accept the risk and confirm the
                              downgrade to older firmware.</label
                            >
                          </div>`
                        : nothing
                    }
                    <button
                      type="button"
                      ?disabled=${
                        this.saving ||
                        !this.selectedVersion_ ||
                        (downgrade && !this.downgradeConfirmed_)
                      }
                      @click=${this.installSelected_}
                    >
                      Install ${this.selectedVersion_}
                    </button>
                    ${this.transferProgress_()}
                  </div>`
              : html`<p class="muted">No compatible releases found.</p>`
      }
    </section>`;
  }

  private transferProgress_() {
    if (!this.transferStage_) return nothing;
    const percent = this.transferPercent_;
    return html`<div class="transfer-progress" role="status" aria-live="polite">
      <span
        >${this.transferStage_}${percent === undefined ? "" : ` - ${percent}%`}</span
      >
      ${
        percent === undefined
          ? html`<progress max="100"></progress>`
          : html`<progress max="100" .value=${percent}></progress>`
      }
    </div>`;
  }

  private notifications_() {
    const settings = this.settings;
    if (!settings) return nothing;
    return html`<section class="card">
      <h2>Update notifications</h2>
      <form class="stack" @submit=${this.saveSettings_}>
        <label class="check"
          ><input
            type="checkbox"
            name="notificationsEnabled"
            ?checked=${settings.notificationsEnabled}
            ?disabled=${this.saving}
          />Show a notification on the display when a newer version is
          available</label
        >
        <label class="field"
          >Notification duration (seconds)<input
            type="number"
            name="notificationDurationSeconds"
            min="5"
            max="300"
            required
            .value=${String(settings.notificationDurationSeconds)}
            ?disabled=${this.saving}
        /></label>
        <label class="field"
          >Remind every (hours)<input
            type="number"
            name="reminderHours"
            min="1"
            max="720"
            required
            .value=${String(settings.reminderHours)}
            ?disabled=${this.saving}
        /></label>
        <button type="submit" ?disabled=${this.saving}>Save settings</button>
      </form>
    </section>`;
  }

  render() {
    if (this.compact) return this.manualUpload_();
    return html`<div class="grid">
      <div class="stack">${this.onlineUpdate_()} ${this.notifications_()}</div>
      <section class="card">
        <h2>Upload manually</h2>
        <p class="muted">Upload a compatible OTA image from this device.</p>
        ${this.manualUpload_()}
      </section>
    </div>`;
  }
}
