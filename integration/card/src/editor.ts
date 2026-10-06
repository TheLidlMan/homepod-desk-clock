import { css, html, LitElement, nothing } from "lit";
import "./marquee-field";
import { customElement, property, state } from "lit/decorators.js";
import type {
  Dashboard,
  Display,
  DisplayCard,
  DisplayPage,
  DisplayRow,
  Hass,
  ImageAsset,
  NumberColorMapping,
  NumberValueMapping,
  PageTransition,
  Scene,
  Style,
  TextColorMapping,
  TextValueMapping,
  Visibility,
} from "./types";
import { newCard, newDashboard, newPage, newRow } from "./types";
import { freezeTextFrames } from "./free-text";
import "./preview";
import "./color-field";
import "./preview-list";
import "./scene-sidebar";
import "./visibility-dialog";
import "./image-field";
import "./image-manager";
import "./graph-editor";
import "./weather-editor";
import "./value-transform-editor";

@customElement("mini-display-editor")
export class MiniDisplayEditor extends LitElement {
  @property({ attribute: false }) hass?: Hass;
  @state() private displays: Display[] = [];
  @state() private scenes: Scene[] = [];
  @state() private dashboards: Record<string, Dashboard | null> = {};
  @state() private assets: Record<string, ImageAsset[]> = {};
  @state() private savedDashboards: Record<string, Dashboard | null> = {};
  @state() private selectedDisplayId = "";
  @state() private selectedSceneId = "";
  @state() private section: "scenes" | "images" = "scenes";
  @state() private pageIndex = 0;
  @state() private cardSection: "content" | "appearance" | "rules" = "content";
  @state() private editingRowTitle?: number;
  @state() private previewPages: Record<string, number> = {};
  @state() private schemaViewOpen = false;
  @state() private selected?: { row: number; card: number };
  @state() private syncState: "idle" | "syncing" | "success" | "error" = "idle";
  @state() private syncMessage = "";
  @state() private loaded = false;
  @state() private sceneForm: "rename" | null = null;
  @state() private sceneName = "";
  @state() private dirtyDisplays = new Set<string>();
  @state() private visibilityTarget?: {
    kind: "page" | "row" | "card";
    row?: number;
    card?: number;
  };
  @state() private confirmation?:
    { kind: "delete-row"; row: number } | { kind: "leave"; href: string };
  private previewsStarted = new Set<string>();
  private previewTimers = new Map<string, number>();
  private previewUpdates = new Map<string, Promise<void>>();
  private previewSentAt = new Map<string, number>();
  private draggedMapping?: { kind: "value" | "color"; index: number };
  private draggedCard?: { row: number; index: number };
  private allowNavigation = false;

  static styles = css`
    :host {
      display: block;
      color: var(--primary-text-color);
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
    }
    * {
      box-sizing: border-box;
    }
    button,
    input,
    select {
      font: inherit;
    }
    .segment:disabled { opacity: .5; cursor: not-allowed; }
    button {
      cursor: pointer;
    }
    ha-icon {
      flex-shrink: 0;
      vertical-align: middle;
    }
    .layout {
      display: grid;
      grid-template-columns: 220px minmax(420px, 1fr) var(--preview-column-width, 288px);
      gap: 16px;
      align-items: start;
      min-width: 0;
    }
    .layout.schema-open {
      grid-template-columns: 220px minmax(360px, 1fr) clamp(440px, 44vw, 720px);
    }
    .images-view {
      grid-column: 2 / -1;
    }
    ha-card {
      overflow: hidden;
      border: 1px solid var(--divider-color);
      box-shadow: var(--ha-card-box-shadow, none);
    }
    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 52px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--divider-color);
    }
    .section-heading h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }
    .icon-button {
      display: inline-grid;
      place-items: center;
      width: 40px;
      height: 40px;
      padding: 0;
      color: var(--primary-text-color);
      background: transparent;
      border: 0;
      border-radius: 50%;
    }
    .icon-button:hover {
      background: var(--secondary-background-color);
    }
    .icon-button.danger {
      color: var(--error-color);
    }
    .icon-button:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .scene-list {
      display: grid;
      gap: 4px;
      padding: 8px;
    }
    .scene-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 36px;
      gap: 4px;
      align-items: center;
      border-radius: 10px;
    }
    .scene-row.active {
      background: var(--secondary-background-color);
    }
    .scene-select {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      min-height: 44px;
      padding: 8px 10px;
      color: var(--primary-text-color);
      text-align: left;
      background: transparent;
      border: 0;
      border-radius: 10px;
    }
    .scene-select ha-icon {
      color: var(--secondary-text-color);
    }
    .scene-row.active .scene-select ha-icon {
      color: var(--primary-color);
    }
    .scene-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .scene-menu,
    .menu {
      position: relative;
    }
    .scene-menu > summary,
    .menu > summary {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      list-style: none;
      cursor: pointer;
      border-radius: 50%;
    }
    .menu > summary {
      width: 40px;
      height: 40px;
    }
    .scene-menu > summary::-webkit-details-marker,
    .menu > summary::-webkit-details-marker {
      display: none;
    }
    .scene-menu > summary:hover,
    .menu > summary:hover {
      background: var(--card-background-color);
    }
    .scene-popover,
    .menu-popover {
      position: absolute;
      right: 0;
      z-index: 10;
      display: grid;
      width: 150px;
      padding: 6px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 10px;
      box-shadow: var(--ha-card-box-shadow);
    }
    .menu-popover {
      width: 160px;
    }
    .scene-popover button,
    .menu-popover button {
      min-height: 38px;
      padding: 8px;
      color: var(--primary-text-color);
      text-align: left;
      background: transparent;
      border: 0;
      border-radius: 6px;
    }
    .scene-popover button:hover,
    .menu-popover button:hover {
      background: var(--secondary-background-color);
    }
    .scene-popover .danger,
    .menu-popover .danger {
      color: var(--error-color);
    }
    .display-picker {
      display: grid;
      gap: 8px;
      padding: 12px;
      border-bottom: 1px solid var(--divider-color);
    }
    .display-picker label {
      display: grid;
      gap: 5px;
      color: var(--secondary-text-color);
      font-size: 12px;
    }
    .display-picker select {
      width: 100%;
      min-height: 40px;
      padding: 8px;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
    }
    .scene-form {
      display: grid;
      gap: 10px;
      padding: 12px;
      border-top: 1px solid var(--divider-color);
    }
    .scene-form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .editor-card {
      min-width: 0;
    }
    .editor-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--divider-color);
    }
    .editor-title {
      min-width: 0;
    }
    .editor-title strong,
    .editor-title small {
      display: block;
    }
    .editor-title strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .editor-title small {
      margin-top: 2px;
      color: var(--secondary-text-color);
    }
    .save-area,
    .save-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .save-area {
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .sync {
      display: flex;
      align-items: center;
      gap: 7px;
      min-height: 20px;
      color: var(--secondary-text-color);
      font-size: 12px;
      white-space: nowrap;
    }
    .sync i {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--disabled-text-color);
    }
    .sync.syncing i {
      background: var(--warning-color);
    }
    .sync.success i {
      background: var(--success-color);
    }
    .sync.error {
      color: var(--error-color);
    }
    .sync.error i {
      background: var(--error-color);
    }
    .editor-content {
      display: grid;
      gap: 14px;
      padding: 16px;
    }
    .tabs,
    .card-tabs {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      padding: 2px;
      scrollbar-width: thin;
    }
    .tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 40px;
      padding: 7px 12px;
      color: var(--primary-text-color);
      white-space: nowrap;
      background: var(--secondary-background-color);
      border: 1px solid transparent;
      border-radius: 9px;
    }
    .tab ha-icon {
      --mdc-icon-size: 16px;
      width: 16px;
      height: 16px;
    }
    .tab.inactive {
      color: var(--secondary-text-color);
      opacity: 0.72;
    }
    .card-tabs .tab {
      cursor: grab;
    }
    .card-tabs .tab:active {
      cursor: grabbing;
    }
    .tab.active {
      color: var(--text-primary-color);
      background: var(--primary-color);
      opacity: 1;
    }
    .tab.dragging {
      opacity: 0.4;
    }
    .page-settings,
    .row-panel,
    .card-settings {
      padding: 12px;
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      scroll-margin-top: 16px;
    }
    .page-settings[open],
    .card-settings {
      display: grid;
      gap: 10px;
    }
    .page-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      cursor: pointer;
    }
    .page-summary::marker {
      content: "";
    }
    .page-summary-copy {
      display: grid;
      gap: 2px;
    }
    .page-summary-copy > span {
      font-weight: 500;
    }
    .page-summary-copy > small {
      color: var(--secondary-text-color);
      font-size: 12px;
      font-weight: 400;
    }
    .rows {
      display: grid;
      gap: 12px;
    }
    .row-panel {
      display: grid;
      gap: 12px;
      background: color-mix(
        in srgb,
        var(--card-background-color),
        var(--primary-color) 2%
      );
    }
    .page-settings-grid {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) 130px auto;
      gap: 8px;
      align-items: end;
    }
    .page-settings .field input {
      min-height: 36px;
    }
    .page-options {
      display: flex;
      align-items: center;
      gap: 16px;
      min-height: 36px;
      padding: 0 4px;
    }
    .page-options .check {
      white-space: nowrap;
    }
    .page-title-position {
      grid-column: 1/-1;
      max-width: 460px;
    }
    .page-visibility {
      grid-column: 1/-1;
      padding: 8px 4px;
    }
    .page-appearance,
    .advanced-settings {
      grid-column: 1/-1;
      padding: 8px 10px;
      border: 1px solid var(--divider-color);
      border-radius: 9px;
    }
    .page-appearance > summary,
    .advanced-settings > summary {
      width: max-content;
      color: var(--secondary-text-color);
      font-size: 13px;
      cursor: pointer;
    }
    .page-appearance-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 10px;
    }
    .advanced-settings-content {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) 130px;
      gap: 8px;
      margin-top: 10px;
    }
    .row-head,
    .card-head,
    .row-title,
    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .row-head,
    .card-head {
      justify-content: space-between;
    }
    .row-title,
    .card-title {
      min-width: 0;
      flex-wrap: wrap;
    }
    .card-title strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-head > .menu {
      flex: none;
    }
    .row-title small {
      color: var(--secondary-text-color);
    }
    .inline-icon-button {
      display: inline-grid;
      flex: none;
      place-items: center;
      width: 30px;
      height: 30px;
      padding: 0;
      color: var(--secondary-text-color);
      background: transparent;
      border: 0;
      border-radius: 50%;
    }
    .inline-icon-button:hover {
      color: var(--primary-color);
      background: var(--secondary-background-color);
    }
    .inline-icon-button ha-icon {
      --mdc-icon-size: 17px;
      width: 17px;
      height: 17px;
    }
    .row-title-input {
      width: min(220px, 45vw);
      min-height: 34px;
      padding: 6px 9px;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--primary-color);
      border-radius: 7px;
    }
    .card-settings {
      border-color: var(--primary-color);
      background: var(--card-background-color);
      padding: 0;
      overflow: hidden;
    }
    .card-settings > .card-head {
      min-height: 52px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--divider-color);
    }
    .card-section-tabs {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 4px;
      padding: 6px;
      background: var(--secondary-background-color);
      border-bottom: 1px solid var(--divider-color);
    }
    .card-section-tab {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-width: 0;
      min-height: 40px;
      padding: 7px 10px;
      color: var(--secondary-text-color);
      background: transparent;
      border: 0;
      border-radius: 8px;
      transition:
        color 150ms ease,
        background-color 150ms ease;
    }
    .card-section-tab:hover {
      color: var(--primary-text-color);
      background: color-mix(
        in srgb,
        var(--card-background-color),
        transparent 20%
      );
    }
    .card-section-tab.active {
      color: var(--primary-color);
      background: var(--card-background-color);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
    }
    .card-section-tab ha-icon {
      --mdc-icon-size: 19px;
      width: 19px;
      height: 19px;
    }
    .section-count {
      display: inline-grid;
      place-items: center;
      min-width: 20px;
      height: 20px;
      padding: 0 5px;
      color: var(--text-primary-color);
      font-size: 11px;
      font-weight: 600;
      background: var(--primary-color);
      border-radius: 10px;
    }
    .card-pane {
      display: grid;
      gap: 12px;
      padding: 12px;
    }
    .settings-group {
      display: grid;
      gap: 12px;
      min-width: 0;
      padding: 12px;
      background: color-mix(
        in srgb,
        var(--secondary-background-color),
        transparent 45%
      );
      border: 1px solid var(--divider-color);
      border-radius: 10px;
    }
    .settings-heading {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .settings-heading > ha-icon,
    .setting-action > ha-icon {
      --mdc-icon-size: 22px;
      flex: none;
      width: 22px;
      height: 22px;
      color: var(--primary-color);
    }
    .settings-heading > div,
    .setting-action > div {
      display: grid;
      gap: 2px;
      min-width: 0;
    }
    .settings-heading strong,
    .setting-action strong {
      font-size: 14px;
      font-weight: 500;
    }
    .settings-heading small,
    .setting-action small {
      color: var(--secondary-text-color);
      font-size: 12px;
      line-height: 1.35;
    }
    .setting-action {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
    }
    .compact-grid {
      align-items: end;
    }
    .inline-option {
      display: flex;
      align-items: center;
      min-height: 40px;
    }
    .appearance-grid {
      gap: 12px;
    }
    .appearance-section {
      display: grid;
      grid-column: 1 / -1;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 12px;
      border: 1px solid var(--divider-color);
      border-radius: 9px;
    }
    .appearance-section > header {
      display: flex;
      grid-column: 1 / -1;
      align-items: center;
      gap: 8px;
      color: var(--primary-text-color);
      font-size: 13px;
      font-weight: 600;
    }
    .appearance-section > header ha-icon {
      --mdc-icon-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--secondary-text-color);
    }
    .appearance-section > mini-display-image-field,
    .appearance-section > .text-layout-controls,
    .appearance-section > .segmented-field,
    .appearance-section > details {
      grid-column: 1 / -1;
    }
    .text-layout-controls { display:flex; flex-wrap:wrap; align-items:end; gap:12px; }
    .text-layout-controls > .segmented-field,
    .text-layout-controls > details { flex:1 1 190px; }
    .text-layout-controls > mini-display-marquee-field { flex:1 1 240px; }
    .rule-groups .mappings {
      padding: 0;
    }
    .rule-groups .mappings + .mappings {
      padding-top: 10px;
      border-top: 1px solid var(--divider-color);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .grid > ha-form {
      grid-column: 1/-1;
    }
    .field {
      display: grid;
      gap: 5px;
      color: var(--secondary-text-color);
      font-size: 12px;
    }
    .field input,
    .field select {
      width: 100%;
      min-height: 40px;
      padding: 8px 11px;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--primary-text-color);
      font-size: 14px;
    }
    .check input {
      width: 18px;
      height: 18px;
    }
    .hint {
      grid-column: 1/-1;
      margin: 0;
      color: var(--secondary-text-color);
      font-size: 12px;
      line-height: 1.5;
    }
    .add-button {
      width: 100%;
      min-height: 42px;
      color: var(--primary-color);
      background: transparent;
      border: 1px dashed var(--primary-color);
      border-radius: 10px;
    }
    .style {
      padding-top: 4px;
    }
    .style > summary {
      cursor: pointer;
    }
    .previews {
      display: grid;
      gap: 12px;
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      padding-right: 2px;
      position: sticky;
      top: 16px;
    }
    .preview-title {
      margin: 0;
      padding: 0 2px;
      font-size: 16px;
      font-weight: 500;
    }
    .display-card {
      display: grid;
      gap: 10px;
      padding: 12px;
      border: 2px solid transparent;
      transition:
        border-color 150ms ease,
        background-color 150ms ease;
      cursor: pointer;
    }
    .display-card.selected {
      border-color: var(--primary-color);
    }
    .display-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }
    .display-name {
      min-width: 0;
    }
    .display-name strong,
    .display-name small {
      display: block;
    }
    .display-name strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .display-name small {
      margin-top: 3px;
      color: var(--secondary-text-color);
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
    }
    .status i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--error-color);
    }
    .status.online i {
      background: var(--success-color);
    }
    .preview-eye.active {
      color: var(--primary-color);
      background: var(--secondary-background-color);
    }
    mini-display-preview {
      margin: 0 auto;
    }
    .preview-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: var(--secondary-text-color);
      font-size: 12px;
    }
    .preview-nav .icon-button {
      width: 32px;
      height: 32px;
    }
    .activate {
      width: 100%;
    }
    .condition-mark {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--primary-color);
      font-size: 12px;
    }
    .condition-mark ha-icon {
      --mdc-icon-size: 16px;
      width: 16px;
      height: 16px;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: grid;
      place-items: center;
      padding: 16px;
      background: rgba(0, 0, 0, 0.48);
    }
    .visibility-modal {
      width: min(620px, 100%);
      max-height: min(760px, calc(100vh - 32px));
      overflow: auto;
    }
    .confirm-modal {
      width: min(440px, 100%);
    }
    .confirm-heading {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid var(--divider-color);
    }
    .confirm-heading ha-icon {
      color: var(--warning-color);
    }
    .confirm-heading h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }
    .modal-body {
      display: grid;
      gap: 14px;
      padding: 16px;
    }
    .modal-copy {
      margin: 0;
      color: var(--secondary-text-color);
      font-size: 13px;
      line-height: 1.5;
    }
    .condition {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) 150px minmax(120px, 0.7fr) 40px;
      gap: 8px;
      align-items: end;
      padding: 12px;
      border: 1px solid var(--divider-color);
      border-radius: 10px;
    }
    .condition ha-form {
      min-width: 0;
    }
    .condition .icon-button {
      align-self: center;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--divider-color);
    }
    .danger-action {
      --mdc-theme-primary: var(--error-color);
      color: var(--error-color);
    }
    .mappings {
      display: grid;
      gap: 10px;
      padding-top: 4px;
    }
    .mappings > summary {
      cursor: pointer;
    }
    .mapping-list {
      display: grid;
      gap: 8px;
      margin-top: 10px;
    }
    .mapping-rule {
      display: grid;
      grid-template-columns: 28px 1fr 1fr 1.4fr 40px;
      gap: 8px;
      align-items: end;
      padding: 10px;
      border: 1px solid var(--divider-color);
      border-radius: 10px;
    }
    .mapping-rule.text {
      grid-template-columns: 28px 140px 1fr 1fr 40px;
    }
    .mapping-rule.colors {
      grid-template-columns: 28px 1fr 1fr 1.2fr 1.2fr 40px;
    }
    .mapping-rule.colors.text {
      grid-template-columns: 28px 130px 1fr 1.2fr 1.2fr 40px;
    }
    .mapping-rule.dragging {
      opacity: 0.45;
    }
    .drag-handle {
      align-self: center;
      display: grid;
      place-items: center;
      width: 28px;
      height: 40px;
      color: var(--secondary-text-color);
      cursor: grab;
    }
    .drag-handle:active {
      cursor: grabbing;
    }
    .mapping-copy {
      margin: 0;
      color: var(--secondary-text-color);
      font-size: 12px;
    }
    .segmented-field {
      display: grid;
      gap: 7px;
    }
    .segmented-field > span {
      color: var(--secondary-text-color);
      font-size: 12px;
    }
    .segmented {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 3px;
      background: var(--secondary-background-color);
      border-radius: 10px;
    }
    .segment {
      display: flex;
      flex: 1 0 auto;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-width: 68px;
      min-height: 36px;
      padding: 6px 9px;
      font: inherit;
      line-height: 20px;
      white-space: nowrap;
      color: var(--primary-text-color);
      background: transparent;
      border: 0;
      border-radius: 7px;
    }
    .segment:hover {
      background: color-mix(
        in srgb,
        var(--card-background-color),
        transparent 20%
      );
    }
    .segment.active {
      color: var(--text-primary-color);
      background: var(--primary-color);
    }
    .segment ha-icon {
      --mdc-icon-size: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 18px;
      width: 18px;
      height: 18px;
      line-height: 0;
    }
    .segment > span {
      line-height: 20px;
    }
    .position-field {
      grid-column: 1/-1;
      padding: 8px 10px;
      border: 1px solid var(--divider-color);
      border-radius: 9px;
    }
    .position-field > summary {
      cursor: pointer;
      color: var(--secondary-text-color);
      font-size: 13px;
    }
    .effect-grid {
      margin-top: 10px;
    }
    .position-grid {
      display: grid;
      grid-template-columns: repeat(3, 38px);
      grid-template-rows: repeat(3, 34px);
      gap: 4px;
      width: max-content;
      margin-top: 9px;
      padding: 5px;
      background: var(--secondary-background-color);
      border-radius: 10px;
    }
    .position-button {
      display: grid;
      place-items: center;
      padding: 0;
      background: transparent;
      border: 0;
      border-radius: 6px;
    }
    .position-button:hover {
      background: var(--card-background-color);
    }
    .position-button.active {
      background: var(--primary-color);
    }
    .position-dot {
      width: 7px;
      height: 7px;
      background: var(--secondary-text-color);
      border-radius: 50%;
    }
    .position-button.active .position-dot {
      background: var(--text-primary-color);
    }
    .transition-settings {
      padding: 12px;
      border: 1px solid var(--divider-color);
      border-radius: 12px;
    }
    .transition-settings[open] {
      display: grid;
      gap: 14px;
    }
    .transition-summary {
      cursor: pointer;
      font-weight: 500;
    }
    .transition-summary::marker {
      content: "";
    }
    .effect-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    .effect {
      display: grid;
      justify-items: center;
      gap: 5px;
      min-height: 68px;
      padding: 9px;
      color: var(--primary-text-color);
      background: var(--secondary-background-color);
      border: 1px solid transparent;
      border-radius: 10px;
    }
    .effect:hover {
      border-color: var(--primary-color);
    }
    .effect.active {
      color: var(--primary-color);
      border-color: var(--primary-color);
      background: color-mix(in srgb, var(--primary-color), transparent 90%);
    }
    .effect ha-icon {
      --mdc-icon-size: 22px;
      width: 22px;
      height: 22px;
    }
    .transition-options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .transition-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 12px;
      border-top: 1px solid var(--divider-color);
    }
    .transition-actions ha-icon {
      --mdc-icon-size: 18px;
      margin-right: 6px;
    }
    .empty {
      display: grid;
      justify-items: center;
      gap: 14px;
      padding: 64px 24px;
      text-align: center;
    }
    .empty ha-icon {
      --mdc-icon-size: 56px;
      width: 56px;
      height: 56px;
      color: var(--secondary-text-color);
    }
    .empty h2 {
      margin: 0;
      font-size: 20px;
    }
    .empty p {
      max-width: 440px;
      margin: 0;
      color: var(--secondary-text-color);
    }
    .loading {
      padding: 48px;
      text-align: center;
      color: var(--secondary-text-color);
    }
    input:focus-visible,
    select:focus-visible,
    button:focus-visible,
    summary:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    @media (max-width: 1250px) {
      .page-settings-grid {
        grid-template-columns: minmax(160px, 1fr) 130px;
      }
      .page-options {
        grid-column: 1/-1;
      }
    }
    @media (max-width: 1100px) {
      .layout,
      .layout.schema-open {
        grid-template-columns: 200px minmax(0, 1fr);
      }
      .previews {
        grid-column: 1/-1;
        grid-template-columns: repeat(auto-fit, minmax(272px, 1fr));
        max-height: none;
        position: static;
        overflow: visible;
      }
      .preview-title {
        grid-column: 1/-1;
      }
    }
    @media (max-width: 700px) {
      .layout,
      .layout.schema-open {
        grid-template-columns: 1fr;
      }
      .images-view {
        grid-column: 1;
      }
      .scene-list {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      }
      .previews {
        grid-column: auto;
        grid-template-columns: 1fr;
      }
      .grid,
      .page-settings-grid,
      .page-appearance-grid,
      .advanced-settings-content,
      .condition,
      .mapping-rule,
      .mapping-rule.text,
      .mapping-rule.colors,
      .mapping-rule.colors.text,
      .transition-options {
        grid-template-columns: 1fr;
      }
      .page-options {
        grid-column: auto;
        flex-wrap: wrap;
        gap: 12px 20px;
      }
      .effect-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .card-section-tab {
        gap: 4px;
        padding: 6px 4px;
        font-size: 12px;
      }
      .card-section-tab ha-icon {
        --mdc-icon-size: 16px;
        width: 16px;
        height: 16px;
      }
      .section-count {
        min-width: 17px;
        height: 17px;
        padding: 0 4px;
        font-size: 10px;
      }
      .card-pane,
      .settings-group {
        padding: 10px;
      }
      .drag-handle {
        display: none;
      }
      .editor-heading {
        align-items: flex-start;
        flex-direction: column;
      }
      .condition .icon-button,
      .mapping-rule .icon-button {
        justify-self: end;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      * {
        scroll-behavior: auto !important;
        transition: none !important;
      }
    }
  `;

  updated(changed: Map<string, unknown>) {
    if (changed.has("hass") && !this.loaded) void this.load();
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("beforeunload", this.beforeUnload);
    window.addEventListener("click", this.interceptNavigation, true);
    window.addEventListener(
      "pointerdown",
      this.closeActionMenusOnOutsideClick,
      true,
    );
  }

  disconnectedCallback() {
    this.stopPanelPreviews();
    window.removeEventListener("beforeunload", this.beforeUnload);
    window.removeEventListener("click", this.interceptNavigation, true);
    window.removeEventListener(
      "pointerdown",
      this.closeActionMenusOnOutsideClick,
      true,
    );
    super.disconnectedCallback();
  }

  private closeActionMenusOnOutsideClick = (event: PointerEvent) => {
    const path = event.composedPath();
    this.renderRoot
      .querySelectorAll<HTMLDetailsElement>("details.menu[open]")
      .forEach((menu) => {
        if (!path.includes(menu)) menu.open = false;
      });
  };

  private actionMenuToggled(event: Event) {
    const current = event.currentTarget as HTMLDetailsElement;
    if (!current.open) return;
    this.renderRoot
      .querySelectorAll<HTMLDetailsElement>("details.menu[open]")
      .forEach((menu) => {
        if (menu !== current) menu.open = false;
      });
  }

  private closeActionMenu(event: Event) {
    const button = event
      .composedPath()
      .find(
        (item): item is HTMLButtonElement => item instanceof HTMLButtonElement,
      );
    if (!button || button.disabled) return;
    const menu = (event.currentTarget as HTMLElement).closest("details");
    if (menu) menu.open = false;
  }

  private actionMenuKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    const menu = (event.currentTarget as HTMLElement).closest("details");
    if (!menu) return;
    menu.open = false;
    menu.querySelector<HTMLElement>("summary")?.focus();
    event.preventDefault();
    event.stopPropagation();
  }

  private beforeUnload = (event: BeforeUnloadEvent) => {
    this.stopPanelPreviews();
    if (!this.dirtyDisplays.size || this.allowNavigation) return;
    event.preventDefault();
    event.returnValue = "";
  };

  private interceptNavigation = (event: MouseEvent) => {
    if (
      !this.dirtyDisplays.size ||
      this.allowNavigation ||
      event.defaultPrevented ||
      event.button !== 0
    )
      return;
    const anchor = event
      .composedPath()
      .find(
        (item): item is HTMLAnchorElement => item instanceof HTMLAnchorElement,
      );
    if (
      !anchor?.href ||
      anchor.target === "_blank" ||
      anchor.hasAttribute("download")
    )
      return;
    const destination = new URL(anchor.href, window.location.href);
    if (
      destination.pathname === window.location.pathname &&
      destination.search === window.location.search &&
      destination.hash === window.location.hash
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.confirmation = { kind: "leave", href: destination.href };
  };

  private stopPanelPreviews() {
    for (const timer of this.previewTimers.values()) window.clearTimeout(timer);
    this.previewTimers.clear();
    if (!this.hass) return;
    const displayIds = new Set(this.previewsStarted);
    for (const display of this.displays) {
      if (display.preview_scene_id) displayIds.add(display.config_entry_id);
    }
    for (const displayId of displayIds) {
      void (this.previewUpdates.get(displayId) ?? Promise.resolve()).then(() => this.hass!.callWS({
        type: "mini_display/scene/preview/stop",
        config_entry_id: displayId,
      }));
    }
    this.previewsStarted.clear();
  }

  private get selectedDisplay() {
    return this.displays.find(
      (item) => item.config_entry_id === this.selectedDisplayId,
    );
  }
  private get selectedScene() {
    return this.scenes.find((item) => item.id === this.selectedSceneId);
  }
  private get dashboard() {
    return this.dashboards[this.selectedDisplayId];
  }

  private errorMessage(error: unknown) {
    if (typeof error === "string") return error;
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object") {
      const value = error as { message?: unknown; code?: unknown };
      if (typeof value.message === "string") {
        return typeof value.code === "string"
          ? `${value.message} (${value.code})`
          : value.message;
      }
      try {
        return JSON.stringify(error);
      } catch {
        return "Unknown error";
      }
    }
    return String(error);
  }

  private retryableSaveError(error: unknown) {
    if (!error || typeof error !== "object") return false;
    const value = error as { code?: unknown; message?: unknown };
    if (value.code === "display_unavailable") return true;
    if (typeof value.message !== "string") return false;
    const message = value.message.toLowerCase();
    return message.includes("did not respond") || message.includes("timeout");
  }

  private async saveDashboardWithRetry(message: Record<string, unknown>) {
    if (!this.hass) return;
    const retryDelays = [0, 300, 800];
    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      if (retryDelays[attempt]) {
        this.syncMessage = `Retrying save (${attempt + 1}/${retryDelays.length})`;
        await new Promise((resolve) =>
          window.setTimeout(resolve, retryDelays[attempt]),
        );
      }
      try {
        await this.hass.callWS(message);
        return;
      } catch (error) {
        if (
          attempt === retryDelays.length - 1 ||
          !this.retryableSaveError(error)
        ) {
          throw error;
        }
      }
    }
  }

  private async load(preferredSceneId?: string) {
    if (!this.hass) return;
    this.loaded = true;
    try {
      const [displays, scenes] = await Promise.all([
        this.hass.callWS<Display[]>({ type: "mini_display/displays" }),
        this.hass.callWS<Scene[]>({ type: "mini_display/scenes" }),
      ]);
      this.displays = displays;
      this.scenes = scenes;
      if (
        !displays.some(
          (item) => item.config_entry_id === this.selectedDisplayId,
        )
      )
        this.selectedDisplayId = displays[0]?.config_entry_id ?? "";
      const active =
        this.selectedDisplay?.active_scene_id ?? scenes[0]?.id ?? "";
      const wanted = preferredSceneId ?? this.selectedSceneId;
      this.selectedSceneId = scenes.some((item) => item.id === wanted)
        ? wanted
        : active;
      await Promise.all([this.loadSceneDashboards(), this.loadAssets()]);
      this.syncState = "idle";
      this.syncMessage = "";
    } catch (error) {
      this.syncState = "error";
      this.syncMessage = this.errorMessage(error);
    }
  }

  private async loadAssets() {
    if (!this.hass) return;
    const entries = await Promise.all(
      this.displays.map(
        async (display) =>
          [
            display.config_entry_id,
            await this.hass!.callWS<ImageAsset[]>({
              type: "mini_display/assets",
              config_entry_id: display.config_entry_id,
              include_data: false,
            }),
          ] as const,
      ),
    );
    this.assets = Object.fromEntries(entries);
  }

  private imageField(
    label: string,
    value: string | undefined,
    changed: (id: string) => void,
  ) {
    return html`<mini-display-image-field
      .hass=${this.hass}
      .assets=${this.assets[this.selectedDisplayId] ?? []}
      .displayId=${this.selectedDisplayId}
      .label=${label}
      .value=${value ?? ""}
      .maximumWidth=${this.selectedDisplay?.width ?? 240}
      .maximumHeight=${this.selectedDisplay?.height ?? 240}
      @image-changed=${(event: CustomEvent<string>) => changed(event.detail)}
      @asset-uploaded=${(event: CustomEvent<ImageAsset>) => {
        const current = this.assets[this.selectedDisplayId] ?? [];
        this.assets = {
          ...this.assets,
          [this.selectedDisplayId]: [
            ...current.filter((asset) => asset.id !== event.detail.id),
            event.detail,
          ],
        };
      }}
    ></mini-display-image-field>`;
  }

  private async loadSceneDashboards() {
    if (!this.hass || !this.selectedSceneId) {
      this.dashboards = {};
      return;
    }
    const entries = await Promise.all(
      this.displays.map(async (display) => {
        const dashboard = await this.hass!.callWS<Dashboard | null>({
          type: "mini_display/dashboard/get",
          config_entry_id: display.config_entry_id,
          scene_id: this.selectedSceneId,
        });
        return [display.config_entry_id, dashboard] as const;
      }),
    );
    this.dashboards = Object.fromEntries(entries);
    this.savedDashboards = structuredClone(this.dashboards);
    this.dirtyDisplays = new Set();
    this.previewPages = Object.fromEntries(
      this.displays.map((item) => [item.config_entry_id, 0]),
    );
    this.pageIndex = 0;
    this.selected = { row: 0, card: 0 };
  }

  private async selectScene(sceneId: string) {
    this.section = "scenes";
    if (sceneId === this.selectedSceneId) return;
    if (
      this.dirtyDisplays.size &&
      !window.confirm("Discard unsaved changes and switch scene?")
    )
      return;
    this.stopPanelPreviews();
    this.displays = this.displays.map((item) => ({
      ...item,
      preview_scene_id: null,
    }));
    this.selectedSceneId = sceneId;
    this.syncState = "idle";
    this.syncMessage = "";
    await this.loadSceneDashboards();
  }

  private selectDisplay(displayId: string) {
    this.selectedDisplayId = displayId;
    this.pageIndex = this.previewPages[displayId] ?? 0;
    this.selected = { row: 0, card: 0 };
  }

  private changed() {
    this.changedDisplay(this.selectedDisplayId);
  }

  private changedDisplay(displayId: string) {
    const dashboard = this.dashboards[displayId];
    if (!dashboard) return;
    this.dashboards = {
      ...this.dashboards,
      [displayId]: structuredClone(dashboard),
    };
    this.dirtyDisplays = new Set(this.dirtyDisplays).add(displayId);
    this.syncState = "idle";
    this.syncMessage = "Unsaved changes";
    this.schedulePreviewUpdate(displayId);
  }

  private schedulePreviewUpdate(displayId: string) {
    window.clearTimeout(this.previewTimers.get(displayId));
    if (!this.previewsStarted.has(displayId)) return;
    this.previewTimers.set(displayId, window.setTimeout(() => {
      this.previewTimers.delete(displayId);
      if (!this.previewsStarted.has(displayId) || !this.hass) return;
      if (this.previewUpdates.has(displayId)) {
        void this.previewUpdates.get(displayId)!.then(() => this.schedulePreviewUpdate(displayId));
        return;
      }
      this.previewSentAt.set(displayId, Date.now());
      const dashboard = this.dashboards[displayId];
      const pageIndex = this.previewPages[displayId] ?? 0;
      const update = this.hass.callWS({
        type: "mini_display/scene/preview/start",
        config_entry_id: displayId,
        scene_id: this.selectedSceneId,
        page_id: dashboard?.pages[pageIndex]?.id,
        dashboard,
        update: true,
      }).then(() => {}, error => {
        this.syncState = "error";
        this.syncMessage = this.errorMessage(error);
      }).finally(() => this.previewUpdates.delete(displayId));
      this.previewUpdates.set(displayId, update);
    }, Math.max(0, 1000 - (Date.now() - (this.previewSentAt.get(displayId) ?? 0)))));
  }

  private async save() {
    if (
      !this.hass ||
      !this.dashboard ||
      !this.selectedDisplayId ||
      !this.selectedSceneId
    )
      return;
    try {
      this.syncState = "syncing";
      this.syncMessage = "Saving";
      await this.saveDashboardWithRetry({
        type: "mini_display/dashboard/set",
        config_entry_id: this.selectedDisplayId,
        scene_id: this.selectedSceneId,
        dashboard: this.dashboard,
      });
      this.savedDashboards = {
        ...this.savedDashboards,
        [this.selectedDisplayId]: structuredClone(this.dashboard),
      };
      const dirty = new Set(this.dirtyDisplays);
      dirty.delete(this.selectedDisplayId);
      this.dirtyDisplays = dirty;
      this.syncState = "success";
      this.syncMessage = "Saved";
    } catch (error) {
      this.syncState = "error";
      this.syncMessage = this.errorMessage(error);
    }
  }

  private async showPage(index: number) {
    await this.stopPreviewFor(this.selectedDisplayId);
    this.pageIndex = index;
    this.previewPages = {
      ...this.previewPages,
      [this.selectedDisplayId]: index,
    };
    this.selected = { row: 0, card: 0 };
  }

  private discard() {
    void this.stopPreviewFor(this.selectedDisplayId);
    const saved = this.savedDashboards[this.selectedDisplayId];
    if (saved === undefined) return;
    this.dashboards = {
      ...this.dashboards,
      [this.selectedDisplayId]: saved ? structuredClone(saved) : null,
    };
    const dirty = new Set(this.dirtyDisplays);
    dirty.delete(this.selectedDisplayId);
    this.dirtyDisplays = dirty;
    this.pageIndex = 0;
    this.previewPages = { ...this.previewPages, [this.selectedDisplayId]: 0 };
    this.selected = { row: 0, card: 0 };
    this.syncState = "idle";
    this.syncMessage = "Changes discarded";
  }

  private async stopPreviewFor(displayId: string) {
    window.clearTimeout(this.previewTimers.get(displayId));
    this.previewTimers.delete(displayId);
    this.previewsStarted.delete(displayId);
    const display = this.displays.find(
      (item) => item.config_entry_id === displayId,
    );
    if (!this.hass || !display?.preview_scene_id) return;
    try {
      await this.previewUpdates.get(displayId);
      await this.hass.callWS({
        type: "mini_display/scene/preview/stop",
        config_entry_id: displayId,
      });
      this.previewsStarted.delete(displayId);
      this.displays = this.displays.map((item) =>
        item.config_entry_id === displayId
          ? { ...item, preview_scene_id: null }
          : item,
      );
    } catch (error) {
      this.syncState = "error";
      this.syncMessage = this.errorMessage(error);
    }
  }

  private async activateScene(display: Display) {
    if (!this.hass) return;
    try {
      await this.hass.callWS({
        type: "mini_display/scene/activate",
        config_entry_id: display.config_entry_id,
        scene_id: this.selectedSceneId,
      });
      this.previewsStarted.delete(display.config_entry_id);
      this.displays = this.displays.map((item) =>
        item.config_entry_id === display.config_entry_id
          ? {
              ...item,
              active_scene_id: this.selectedSceneId,
              active_scene_name: this.selectedScene?.name ?? null,
              preview_scene_id: null,
            }
          : item,
      );
      this.syncState = "success";
      this.syncMessage = "Scene activated";
    } catch (error) {
      this.syncState = "error";
      this.syncMessage = this.errorMessage(error);
    }
  }

  private async togglePreview(display: Display) {
    if (!this.hass) return;
    const isPreviewing = display.preview_scene_id === this.selectedSceneId;
    try {
      if (isPreviewing) {
        await this.stopPreviewFor(display.config_entry_id);
      } else {
        const dashboard = this.dashboards[display.config_entry_id];
        const pageIndex = this.previewPages[display.config_entry_id] ?? 0;
        await this.hass.callWS({
          type: "mini_display/scene/preview/start",
          config_entry_id: display.config_entry_id,
          scene_id: this.selectedSceneId,
          page_id: dashboard?.pages[pageIndex]?.id,
          dashboard,
        });
        this.previewsStarted.add(display.config_entry_id);
      }
      this.displays = this.displays.map((item) =>
        item.config_entry_id === display.config_entry_id
          ? {
              ...item,
              preview_scene_id: isPreviewing ? null : this.selectedSceneId,
            }
          : item,
      );
      this.syncState = "success";
      this.syncMessage = isPreviewing
        ? "Preview stopped"
        : "Preview shown for 5 minutes";
    } catch (error) {
      this.syncState = "error";
      this.syncMessage = this.errorMessage(error);
    }
  }

  private async createScene() {
    if (!this.hass) return;
    if (
      this.dirtyDisplays.size &&
      !window.confirm("Discard unsaved changes and create a scene?")
    )
      return;
    const existing = new Set(
      this.scenes.map((scene) => scene.name.toLocaleLowerCase()),
    );
    let name = "New scene";
    let suffix = 1;
    while (existing.has(name.toLocaleLowerCase()))
      name = `New scene (${suffix++})`;
    try {
      this.section = "scenes";
      const scene = await this.hass.callWS<Scene>({
        type: "mini_display/scene/create",
        name,
      });
      await this.load(scene.id);
      this.syncState = "success";
      this.syncMessage = "Scene created";
    } catch (error) {
      this.syncState = "error";
      this.syncMessage = this.errorMessage(error);
    }
  }
  private openRenameScene() {
    this.sceneForm = "rename";
    this.sceneName = this.selectedScene?.name ?? "";
  }

  private async saveSceneForm() {
    const name = this.sceneName.trim();
    if (!this.hass || !name) return;
    try {
      if (this.sceneForm === "rename" && this.selectedSceneId) {
        await this.hass.callWS({
          type: "mini_display/scene/rename",
          scene_id: this.selectedSceneId,
          name,
        });
        this.sceneForm = null;
        await this.load(this.selectedSceneId);
      }
    } catch (error) {
      this.syncState = "error";
      this.syncMessage = this.errorMessage(error);
    }
  }

  private async deleteScene() {
    if (
      !this.hass ||
      this.selectedScene?.is_default ||
      !window.confirm(`Delete scene "${this.selectedScene?.name}"?`)
    )
      return;
    try {
      await this.hass.callWS({
        type: "mini_display/scene/delete",
        scene_id: this.selectedSceneId,
      });
      await this.load(this.scenes.find((scene) => scene.is_default)?.id);
    } catch (error) {
      this.syncState = "error";
      this.syncMessage = this.errorMessage(error);
    }
  }

  private async duplicateScene() {
    if (!this.hass || !this.selectedSceneId) return;
    try {
      const scene = await this.hass.callWS<Scene>({
        type: "mini_display/scene/duplicate",
        source_scene_id: this.selectedSceneId,
      });
      await this.load(scene.id);
      this.syncState = "success";
      this.syncMessage = "Scene duplicated";
    } catch (error) {
      this.syncState = "error";
      this.syncMessage = this.errorMessage(error);
    }
  }

  private async setDefaultScene() {
    if (!this.hass || !this.selectedSceneId || this.selectedScene?.is_default)
      return;
    try {
      await this.hass.callWS({
        type: "mini_display/scene/default",
        scene_id: this.selectedSceneId,
      });
      await this.load(this.selectedSceneId);
      this.syncState = "success";
      this.syncMessage = "Default scene changed";
    } catch (error) {
      this.syncState = "error";
      this.syncMessage = this.errorMessage(error);
    }
  }

  private createLayout() {
    if (!this.selectedDisplayId || this.dashboard) return;
    this.dashboards = {
      ...this.dashboards,
      [this.selectedDisplayId]: newDashboard(),
    };
    this.pageIndex = 0;
    this.previewPages = { ...this.previewPages, [this.selectedDisplayId]: 0 };
    this.selected = { row: 0, card: 0 };
    this.dirtyDisplays = new Set(this.dirtyDisplays).add(
      this.selectedDisplayId,
    );
    this.syncState = "idle";
    this.syncMessage = "Unsaved changes";
  }

  private deletePage() {
    if (!this.dashboard || this.dashboard.pages.length <= 1) return;
    const page = this.dashboard.pages[this.pageIndex];
    if (!window.confirm(`Delete page "${page.title || page.id}"?`)) return;
    this.dashboard.pages.splice(this.pageIndex, 1);
    this.pageIndex = Math.min(this.pageIndex, this.dashboard.pages.length - 1);
    this.previewPages = {
      ...this.previewPages,
      [this.selectedDisplayId]: this.pageIndex,
    };
    this.selected = { row: 0, card: 0 };
    this.changed();
  }

  private visibilityObject(): DisplayPage | DisplayRow | DisplayCard | undefined {
    if (!this.visibilityTarget || !this.dashboard) return undefined;
    if (this.visibilityTarget.kind === "page") {
      return this.dashboard.pages[this.pageIndex];
    }
    const row =
      this.dashboard.pages[this.pageIndex]?.rows[this.visibilityTarget.row ?? -1];
    if (!row) return undefined;
    return this.visibilityTarget.kind === "row"
      ? row
      : row.cards[this.visibilityTarget.card ?? -1];
  }

  private openVisibility(kind: "page" | "row" | "card", row?: number, card?: number) {
    this.visibilityTarget = { kind, row, card };
  }

  private saveVisibility(visibility: Visibility) {
    const target = this.visibilityObject();
    if (!target) return;
    target.visibility = visibility;
    this.visibilityTarget = undefined;
    this.changed();
  }

  private clearVisibility() {
    const target = this.visibilityObject();
    if (target) delete target.visibility;
    this.visibilityTarget = undefined;
    this.changed();
  }

  private requestDeleteRow(row: number) {
    this.confirmation = { kind: "delete-row", row };
  }

  private closeConfirmation() {
    this.confirmation = undefined;
  }

  private async confirmAction() {
    const confirmation = this.confirmation;
    this.confirmation = undefined;
    if (!confirmation) return;
    if (confirmation.kind === "delete-row") {
      const page = this.dashboard?.pages[this.pageIndex];
      if (!page || page.rows.length <= 1 || !page.rows[confirmation.row])
        return;
      page.rows.splice(confirmation.row, 1);
      this.selected = undefined;
      this.changed();
      return;
    }
    this.allowNavigation = true;
    this.stopPanelPreviews();
    const destination = new URL(confirmation.href);
    if (destination.origin === window.location.origin) {
      history.pushState(
        null,
        "",
        `${destination.pathname}${destination.search}${destination.hash}`,
      );
      window.dispatchEvent(new Event("location-changed"));
    } else {
      window.location.assign(destination.href);
    }
  }

  private async previewPage(displayId: string, delta: number) {
    await this.stopPreviewFor(displayId);
    const dashboard = this.dashboards[displayId];
    if (!dashboard) return;
    const current = this.previewPages[displayId] ?? 0;
    const next =
      (current + delta + dashboard.pages.length) % dashboard.pages.length;
    this.previewPages = { ...this.previewPages, [displayId]: next };
    if (displayId === this.selectedDisplayId) {
      this.pageIndex = next;
      this.selected = { row: 0, card: 0 };
    }
  }

  private async openFromPreview(detail: {
    displayId: string;
    page: number;
    kind: "page-title" | "row" | "card" | "title" | "value";
    row?: number;
    card?: number;
  }) {
    this.selectedDisplayId = detail.displayId;
    this.pageIndex = detail.page;
    this.previewPages = {
      ...this.previewPages,
      [detail.displayId]: detail.page,
    };
    this.selected =
      detail.row !== undefined && detail.card !== undefined
        ? { row: detail.row, card: detail.card }
        : undefined;
    await this.updateComplete;

    let target: HTMLElement | null = null;
    if (detail.kind === "page-title") {
      const settings =
        this.shadowRoot?.querySelector<HTMLDetailsElement>(".page-settings");
      if (settings) settings.open = true;
      const appearance =
        this.shadowRoot?.querySelector<HTMLDetailsElement>(".page-appearance");
      if (appearance) appearance.open = true;
      target = appearance ?? settings ?? null;
    } else if (detail.row !== undefined) {
      target =
        this.shadowRoot?.querySelectorAll<HTMLElement>(".row-panel")[
          detail.row
        ] ?? null;
      if (detail.card !== undefined) {
        const cardEditor =
          target?.querySelector<HTMLElement>(".card-settings") ?? null;
        if (detail.kind === "title" || detail.kind === "value") {
          const appearance =
            cardEditor?.querySelector<HTMLDetailsElement>(".style");
          if (appearance) appearance.open = true;
          target = appearance ?? cardEditor ?? target;
        } else {
          target = cardEditor ?? target;
        }
      }
    }
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  private updateFromPreview(detail: {
    displayId: string;
    page: number;
    kind: "page-title" | "title" | "value";
    row?: number;
    card?: number;
    position?: "top" | "right" | "bottom" | "left";
    horizontalAlign?: NonNullable<Style["horizontalAlign"]>;
    verticalAlign?: NonNullable<Style["verticalAlign"]>;
  }) {
    const page = this.dashboards[detail.displayId]?.pages[detail.page];
    if (!page) return;
    if (detail.kind === "page-title" && detail.position) {
      page.titlePosition = detail.position;
    } else if (
      detail.row !== undefined &&
      detail.card !== undefined &&
      detail.horizontalAlign &&
      detail.verticalAlign
    ) {
      const card = page.rows[detail.row]?.cards[detail.card];
      if (!card) return;
      const key = detail.kind === "title" ? "titleStyle" : "valueStyle";
      card[key] = {
        ...(card[key] ?? {}),
        horizontalAlign: detail.horizontalAlign,
        verticalAlign: detail.verticalAlign,
      };
    }
    this.changedDisplay(detail.displayId);
  }

  private field(
    label: string,
    value: unknown,
    update: (value: string) => void,
    type = "text",
  ) {
    return html`<label class="field"
      >${label}<input
        type=${type}
        .value=${String(value ?? "")}
        @input=${(event: Event) => update((event.target as HTMLInputElement).value)}
    /></label>`;
  }

  private select(
    label: string,
    value: string,
    values: string[],
    update: (value: string) => void,
  ) {
    return html`<label class="field"
      >${label}<select
        @change=${(event: Event) => update((event.target as HTMLSelectElement).value)}
      >
        ${values.map((item) => html`<option value=${item} ?selected=${item === value}>${item}</option>`)}
      </select></label
    >`;
  }

  private numberField(
    label: string,
    value: number | undefined,
    fallback: number,
    minimum: number,
    maximum: number,
    update: (value: number) => void,
  ) {
    return html`<label class="field"
      >${label}<input
        type="number"
        min=${minimum}
        max=${maximum}
        step="1"
        .value=${String(value ?? fallback)}
        @change=${(event: Event) => {
          const input = event.target as HTMLInputElement;
          const parsed = Number(input.value);
          const next = Math.max(
            minimum,
            Math.min(maximum, Number.isFinite(parsed) ? parsed : fallback),
          );
          input.value = String(next);
          update(next);
        }}
    /></label>`;
  }

  private fontSelect(
    label: string,
    value: Style["fontFamily"] | undefined,
    update: (value: NonNullable<Style["fontFamily"]>) => void,
  ) {
    const display = this.selectedDisplay;
    const selected = value === "font1" || value === "font2" ? value : "default";
    const slots = new Map(
      (display?.fonts ?? []).map((font) => [font.id, font]),
    );
    const defaultSlot = display?.default_font;
    const defaultName =
      defaultSlot &&
      defaultSlot !== "builtin" &&
      slots.get(defaultSlot)?.installed
        ? slots.get(defaultSlot)?.name ||
          (defaultSlot === "font1" ? "Font 1" : "Font 2")
        : "Inter Tight Bold";
    const options = [
      { value: "default" as const, label: `Default · ${defaultName}` },
      ...(["font1", "font2"] as const).map((id, index) => {
        const slot = slots.get(id);
        return {
          value: id,
          label: `Font ${index + 1} · ${slot?.installed ? slot.name || "Installed" : "Empty"}`,
        };
      }),
    ];
    return html`<label class="field"
      >${label}<select
        @change=${(event: Event) =>
          update(
            (event.target as HTMLSelectElement).value as NonNullable<
              Style["fontFamily"]
            >,
          )}
      >
        ${options.map(
          (option) =>
            html`<option
              value=${option.value}
              ?selected=${option.value === selected}
            >
              ${option.label}
            </option>`,
        )}
      </select></label
    >`;
  }

  private checkbox(
    label: string,
    value: boolean,
    update: (value: boolean) => void,
    disabled = false,
    title = "",
  ) {
    return html`<label class="check" title=${title}
      ><input
        type="checkbox"
        .checked=${value}
        ?disabled=${disabled}
        @change=${(event: Event) => update((event.target as HTMLInputElement).checked)}
      />${label}</label
    >`;
  }

  private segmented<T extends string>(
    label: string,
    value: T,
    options: { value: T; label: string; icon?: string }[],
    update: (value: T) => void,
    disabled = false,
  ) {
    return html`<div class="segmented-field">
      <span>${label}</span>
      <div class="segmented" role="radiogroup" aria-label=${label}>
        ${options.map((option) => html`<button class="segment ${option.value === value ? "active" : ""}" role="radio" aria-checked=${option.value === value} title=${option.label} ?disabled=${disabled} @click=${() => { if (!disabled) update(option.value); }}>${option.icon ? html`<ha-icon icon=${option.icon}></ha-icon>` : nothing}<span>${option.label}</span></button>`)}
      </div>
    </div>`;
  }

  private textPosition(
    label: string,
    style: Style,
    defaultHorizontal: NonNullable<Style["horizontalAlign"]> = "center",
    defaultVertical: NonNullable<Style["verticalAlign"]> = "middle",
  ) {
    const horizontal = style.horizontalAlign ?? defaultHorizontal;
    const vertical = style.verticalAlign ?? defaultVertical;
    const positions: {
      horizontal: NonNullable<Style["horizontalAlign"]>;
      vertical: NonNullable<Style["verticalAlign"]>;
      label: string;
    }[] = [
      { horizontal: "left", vertical: "top", label: "Top left" },
      { horizontal: "center", vertical: "top", label: "Top center" },
      { horizontal: "right", vertical: "top", label: "Top right" },
      { horizontal: "left", vertical: "middle", label: "Middle left" },
      { horizontal: "center", vertical: "middle", label: "Center" },
      { horizontal: "right", vertical: "middle", label: "Middle right" },
      { horizontal: "left", vertical: "bottom", label: "Bottom left" },
      { horizontal: "center", vertical: "bottom", label: "Bottom center" },
      { horizontal: "right", vertical: "bottom", label: "Bottom right" },
    ];
    const selected = positions.find(
      (position) =>
        position.horizontal === horizontal && position.vertical === vertical,
    )!;
    return html`<details class="position-field">
      <summary>${label} · ${selected.label}</summary>
      <div class="position-grid" role="radiogroup" aria-label=${label}>
        ${positions.map((position) => {
          const active =
            position.horizontal === horizontal &&
            position.vertical === vertical;
          return html`<button
            class="position-button ${active ? "active" : ""}"
            role="radio"
            aria-checked=${active}
            aria-label=${position.label}
            title=${position.label}
            @click=${() => {
              style.horizontalAlign = position.horizontal;
              style.verticalAlign = position.vertical;
              this.changed();
            }}
          >
            <span class="position-dot"></span>
          </button>`;
        })}
      </div>
    </details>`;
  }

  private textAlignment(
    style: Style,
    fallback: NonNullable<Style["horizontalAlign"]>,
  ) {
    return this.segmented(
      "Alignment",
      style.horizontalAlign ?? fallback,
      [
        { value: "left", label: "Left", icon: "mdi:format-align-left" },
        { value: "center", label: "Center", icon: "mdi:format-align-center" },
        { value: "right", label: "Right", icon: "mdi:format-align-right" },
      ],
      (input) => {
        style.horizontalAlign = input;
        this.changed();
      },
    );
  }

  private textLayoutControls(style: Style, free: boolean, title: boolean, defaultMarquee: boolean) {
    return html`<div class="text-layout-controls">
      ${free ? this.textAlignment(style, title ? "left" : "center")
        : this.textPosition("Position", style, title ? "left" : "center", title ? "top" : "middle")}
      <mini-display-marquee-field .value=${{...style}} .defaultEnabled=${defaultMarquee}
        @marquee-changed=${(event: CustomEvent<Partial<Style>>) => {
          Object.assign(style, event.detail);
          this.changed();
        }}></mini-display-marquee-field>
    </div>`;
  }

  private textEffectEditor(label: string, style: Style) {
    const effect = style.textEffect ?? "none";
    const effectName =
      effect === "shadow"
        ? "Shadow"
        : effect === "outline"
          ? "Outline"
          : "None";
    return html`<details class="position-field effect-field">
      <summary>${label} · ${effectName}</summary>
      <div class="grid effect-grid">
        ${this.select(
          "Effect",
          effect,
          ["none", "shadow", "outline"],
          (input) => {
            style.textEffect = input as NonNullable<Style["textEffect"]>;
            this.changed();
          },
        )}
        ${
          effect !== "none"
            ? html`<mini-display-color-field
                  label="Effect color"
                  .value=${style.effectColor ?? "background"}
                  @color-changed=${(event: CustomEvent<string>) => {
                    style.effectColor = event.detail || "background";
                    this.changed();
                  }}
                ></mini-display-color-field>
                ${this.numberField(
                  "Thickness",
                  style.effectThickness,
                  1,
                  1,
                  3,
                  (input) => {
                    style.effectThickness = input;
                    this.changed();
                  },
                )}
                ${
                  effect === "shadow"
                    ? html`${this.numberField(
                        "Horizontal offset",
                        style.effectOffsetX,
                        2,
                        -6,
                        6,
                        (input) => {
                          style.effectOffsetX = input;
                          this.changed();
                        },
                      )}${this.numberField(
                        "Vertical offset",
                        style.effectOffsetY,
                        2,
                        -6,
                        6,
                        (input) => {
                          style.effectOffsetY = input;
                          this.changed();
                        },
                      )}`
                    : nothing
                }`
            : nothing
        }
      </div>
    </details>`;
  }

  private entity(card: DisplayCard) {
    const domains: Record<DisplayCard["type"], string[]> = {
      weather: ["weather"],
      number: ["sensor", "number", "input_number", "counter"],
      chart: ["sensor", "number", "input_number", "counter"],
      status: [
        "binary_sensor",
        "switch",
        "input_boolean",
        "lock",
        "cover",
        "person",
        "device_tracker",
      ],
      text: ["sensor", "text", "input_text", "select", "input_select"],
      clock: [],
      image: [],
    };
    return html`<ha-form
      .hass=${this.hass}
      .data=${{ entity: card.source ?? "" }}
      .schema=${[{ name: "entity", required: card.type !== "text", selector: { entity: { domain: domains[card.type] } } }]}
      .computeLabel=${() => (card.type === "number" ? "Numeric entity" : card.type === "status" ? "State entity" : "Text entity (optional)")}
      @value-changed=${(event: CustomEvent) => {
        card.source = event.detail.value.entity;
        this.changed();
      }}
    ></ha-form>`;
  }

  private menu(items: unknown) {
    return html`<details
      class="menu"
      @toggle=${this.actionMenuToggled}
      @keydown=${this.actionMenuKeydown}
    >
      <summary aria-label="More actions" aria-haspopup="menu">
        <ha-icon icon="mdi:dots-vertical"></ha-icon>
      </summary>
      <div class="menu-popover" role="menu" @click=${this.closeActionMenu}>
        ${items}
      </div>
    </details>`;
  }

  private cardName(card: DisplayCard) {
    return card.title?.trim() || `${card.type[0].toUpperCase()}${card.type.slice(1)} card`;
  }

  private appearanceEditor(card: DisplayCard) {
    const freeLayout = this.dashboard?.pages[this.pageIndex]?.layout === "free";
    const transparentCards = this.dashboard?.pages[this.pageIndex]?.transparentCards === true;
    const style = (card.style ??= {});
    const value = (card.valueStyle ??= {});
    const title = (card.titleStyle ??= {});
    const backgroundMode =
      transparentCards ? "transparent" : card.backgroundMode ??
      (card.transparentBackground
        ? "transparent"
        : card.backgroundImage
          ? "image"
          : "color");
    const hasTitle = Boolean(card.title?.trim() && card.showTitle !== false);
    return html`<div class="grid appearance-grid">
      <section class="appearance-section">
        <header><ha-icon icon="mdi:card-outline"></ha-icon>Card</header>
        ${this.segmented(
          "Background",
          backgroundMode,
          [
            { value: "color", label: "Color", icon: "mdi:palette" },
            { value: "transparent", label: "Page", icon: "mdi:checkerboard" },
            { value: "image", label: "Image", icon: "mdi:image-outline" },
          ],
          (input) => {
            card.backgroundMode = input as DisplayCard["backgroundMode"];
            card.transparentBackground = input === "transparent";
            this.changed();
          },
          transparentCards,
        )}
        ${
          backgroundMode === "image"
            ? this.imageField(
                "Card background image",
                card.backgroundImage,
                (id) => {
                  card.backgroundImage = id || undefined;
                  this.changed();
                },
              )
            : nothing
        }
        ${
          backgroundMode === "color"
            ? html`<mini-display-color-field
                label="Background color"
                .value=${style.background ?? ""}
                @color-changed=${(event: CustomEvent<string>) => {
                  style.background = event.detail || undefined;
                  this.changed();
                }}
              ></mini-display-color-field>`
            : nothing
        }
        <mini-display-color-field
          label="Accent"
          .value=${style.accent ?? ""}
          @color-changed=${(event: CustomEvent<string>) => {
            style.accent = event.detail || undefined;
            this.changed();
          }}
        ></mini-display-color-field>
      </section>
      ${
        card.type !== "image"
          ? html`<section class="appearance-section">
              <header><ha-icon icon="mdi:format-text"></ha-icon>Value</header>
              <mini-display-color-field
                label="Text color"
                .value=${style.foreground ?? ""}
                @color-changed=${(event: CustomEvent<string>) => {
                  style.foreground = event.detail || undefined;
                  this.changed();
                }}
              ></mini-display-color-field>
              ${this.fontSelect("Font", value.fontFamily, (input) => {
                value.fontFamily = input;
                this.changed();
              })}
              ${freeLayout ? nothing : this.select(
                "Font size",
                value.fontSize ?? "auto",
                ["auto", "small", "medium", "large", "xlarge"],
                (input) => {
                  value.fontSize = input as Style["fontSize"];
                  this.changed();
                },
              )}
              ${this.textLayoutControls(value, freeLayout, false, freeLayout && card.type === "text")}
              ${this.select("Text flow", value.textFlow ?? "default", ["default", "overflow", "wrap"], input => { value.textFlow = input as Style["textFlow"]; this.changed(); })}
              ${this.textEffectEditor("Effect", value)}
            </section>`
          : nothing
      }
      ${
        hasTitle
          ? html`<section class="appearance-section">
              <header><ha-icon icon="mdi:format-title"></ha-icon>Title</header>
              <mini-display-color-field
                label="Text color"
                .value=${title.foreground ?? ""}
                @color-changed=${(event: CustomEvent<string>) => {
                  title.foreground = event.detail || undefined;
                  this.changed();
                }}
              ></mini-display-color-field>
              ${this.fontSelect("Font", title.fontFamily, (input) => {
                title.fontFamily = input;
                this.changed();
              })}
              ${freeLayout ? nothing : this.select(
                "Font size",
                title.fontSize ?? "auto",
                ["auto", "small", "medium", "large", "xlarge"],
                (input) => {
                  title.fontSize = input as Style["fontSize"];
                  this.changed();
                },
              )}
              ${this.textLayoutControls(title, freeLayout, true, true)}
              ${this.select("Text flow", title.textFlow ?? "default", ["default", "overflow", "wrap"], input => { title.textFlow = input as Style["textFlow"]; this.changed(); })}
              ${this.textEffectEditor("Effect", title)}
            </section>`
          : nothing
      }
    </div>`;
  }

  private transitionEditor(page: Dashboard["pages"][number]) {
    const transition = page.transition ?? { type: "none" as const };
    const set = (next: PageTransition) => {
      page.transition = next;
      this.changed();
    };
    const patch = (values: Partial<PageTransition>) =>
      set({ ...transition, ...values });
    const applyToAllPages = () => {
      if (!this.dashboard) return;
      const selected: PageTransition = structuredClone(
        page.transition ?? { type: "none" },
      );
      this.dashboard.pages.forEach((item) => {
        item.transition = structuredClone(selected);
      });
      this.changed();
    };
    const effects: {
      type: PageTransition["type"];
      label: string;
      icon: string;
    }[] = [
      { type: "none", label: "None", icon: "mdi:cancel" },
      { type: "random", label: "Random", icon: "mdi:shuffle-variant" },
      { type: "slide", label: "Slide", icon: "mdi:arrow-right-bold" },
      {
        type: "bounce",
        label: "Bounce",
        icon: "mdi:arrow-up-bold-circle-outline",
      },
      { type: "fade", label: "Fade", icon: "mdi:brightness-6" },
      { type: "wipe", label: "Wipe", icon: "mdi:transition-masked" },
      { type: "dissolve", label: "Dissolve", icon: "mdi:dots-grid" },
      { type: "curtain", label: "Curtain", icon: "mdi:curtains" },
      { type: "blinds", label: "Blinds", icon: "mdi:blinds-horizontal" },
      { type: "mosaic", label: "Mosaic", icon: "mdi:view-grid-plus" },
      { type: "cascade", label: "Cascade", icon: "mdi:chart-waterfall" },
      { type: "spiral", label: "Spiral", icon: "mdi:reload" },
    ];
    const defaults = (type: PageTransition["type"]): PageTransition =>
      type === "none"
        ? { type }
        : type === "random"
          ? { type, speed: "normal" }
          : ["dissolve", "mosaic", "cascade", "spiral"].includes(type)
            ? { type, speed: "normal", tileSize: "medium" }
            : type === "fade"
              ? { type, speed: "normal", intensity: "strong" }
              : type === "bounce"
                ? {
                    type,
                    direction: "up",
                    speed: "normal",
                    intensity: "subtle",
                  }
                : ["curtain", "blinds"].includes(type)
                  ? { type, direction: "left", speed: "normal" }
                  : { type, direction: type === "slide" ? "up" : "left", speed: "normal" };
    const directions = [
      { value: "random" as const, label: "Random", icon: "mdi:shuffle-variant" },
      { value: "left" as const, label: "Left", icon: "mdi:arrow-left" },
      { value: "right" as const, label: "Right", icon: "mdi:arrow-right" },
      { value: "up" as const, label: "Up", icon: "mdi:arrow-up" },
      { value: "down" as const, label: "Down", icon: "mdi:arrow-down" },
    ];
    const speeds = [
      { value: "slow" as const, label: "Slow" },
      { value: "normal" as const, label: "Normal" },
      { value: "fast" as const, label: "Fast" },
    ];
    const scrollsWholePage = ["slide", "bounce"].includes(transition.type);
    const availableDirections = scrollsWholePage
      ? directions.filter((direction) => ["random", "up", "down"].includes(direction.value))
      : directions;
    const selectedDirection =
      scrollsWholePage && ["left", "right"].includes(transition.direction ?? "")
        ? transition.direction === "right"
          ? "down"
          : "up"
        : (transition.direction ?? "left");
    return html`<details class="transition-settings">
      <summary class="transition-summary">
        Transition to next page ·
        ${effects.find((effect) => effect.type === transition.type)?.label ?? "None"}
      </summary>
      <div class="effect-grid">
        ${effects.map((effect) => html`<button class="effect ${transition.type === effect.type ? "active" : ""}" aria-pressed=${effect.type === transition.type} @click=${() => set(defaults(effect.type))}><ha-icon icon=${effect.icon}></ha-icon><span>${effect.label}</span></button>`)}
      </div>
      ${
        transition.type !== "none"
          ? html`<div class="transition-options">
              ${["slide", "bounce", "wipe", "curtain", "blinds"].includes(transition.type) ? this.segmented("Direction", selectedDirection, availableDirections, (value) => patch({ direction: value })) : nothing}${this.segmented("Speed", transition.speed ?? "normal", speeds, (value) => patch({ speed: value }))}${
                ["bounce", "fade"].includes(transition.type)
                  ? this.segmented(
                      "Intensity",
                      transition.intensity ?? "subtle",
                      [
                        { value: "subtle" as const, label: "Subtle" },
                        { value: "strong" as const, label: "Strong" },
                      ],
                      (value) => patch({ intensity: value }),
                    )
                  : nothing
              }${
                ["dissolve", "mosaic", "cascade", "spiral"].includes(transition.type)
                  ? this.segmented(
                      "Tile size",
                      transition.tileSize ?? "medium",
                      [
                        { value: "small" as const, label: "Small" },
                        { value: "medium" as const, label: "Medium" },
                        { value: "large" as const, label: "Large" },
                      ],
                      (value) => patch({ tileSize: value }),
                    )
                  : nothing
              }
            </div>`
          : nothing
      }
      <div class="transition-actions">
        <ha-button
          .disabled=${(this.dashboard?.pages.length ?? 0) < 2}
          @click=${applyToAllPages}
        >
          <ha-icon icon="mdi:content-copy"></ha-icon>
          Apply to all pages
        </ha-button>
      </div>
    </details>`;
  }

  private dragMapping(
    kind: "value" | "color",
    index: number,
    event: DragEvent,
  ) {
    this.draggedMapping = { kind, index };
    event.dataTransfer?.setData("text/plain", `${kind}:${index}`);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    this.requestUpdate();
  }

  private dropMapping(
    card: DisplayCard,
    kind: "value" | "color",
    index: number,
    event: DragEvent,
  ) {
    event.preventDefault();
    const dragged = this.draggedMapping;
    this.draggedMapping = undefined;
    if (!dragged || dragged.kind !== kind || dragged.index === index) {
      this.requestUpdate();
      return;
    }
    const mappings = (
      kind === "value" ? card.valueMappings : card.colorMappings
    ) as unknown[] | undefined;
    if (!mappings) return;
    const [mapping] = mappings.splice(dragged.index, 1);
    mappings.splice(index, 0, mapping);
    this.changed();
  }

  private dragHandle(kind: "value" | "color", index: number) {
    return html`<span
      class="drag-handle"
      draggable="true"
      title="Drag to reorder"
      aria-label="Drag to reorder"
      @dragstart=${(event: DragEvent) => this.dragMapping(kind, index, event)}
      @dragend=${() => {
        this.draggedMapping = undefined;
        this.requestUpdate();
      }}
      ><ha-icon icon="mdi:drag-vertical"></ha-icon
    ></span>`;
  }

  private dragCard(row: number, index: number, event: DragEvent) {
    this.draggedCard = { row, index };
    event.dataTransfer?.setData("text/plain", `card:${row}:${index}`);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    this.requestUpdate();
  }

  private dropCard(row: number, index: number, event: DragEvent) {
    event.preventDefault();
    const dragged = this.draggedCard;
    this.draggedCard = undefined;
    if (!dragged || dragged.row !== row || dragged.index === index) {
      this.requestUpdate();
      return;
    }
    const cards = this.dashboard?.pages[this.pageIndex]?.rows[row]?.cards;
    if (!cards) return;
    const [card] = cards.splice(dragged.index, 1);
    cards.splice(index, 0, card);
    this.selected = { row, card: index };
    this.changed();
  }

  private valueMappingsEditor(card: DisplayCard) {
    if (card.type !== "number" && card.type !== "text") return nothing;
    const mappings = card.valueMappings ?? [];
    const updateNumber = (
      index: number,
      key: "minimum" | "maximum",
      input: string,
    ) => {
      const mapping = mappings[index] as NumberValueMapping;
      if (input.trim() === "") delete mapping[key];
      else mapping[key] = Number(input);
      this.changed();
    };
    const remove = (index: number) => {
      mappings.splice(index, 1);
      if (!mappings.length) delete card.valueMappings;
      this.changed();
    };
    return html`<details class="mappings">
      <summary>
        Value mappings${mappings.length ? ` (${mappings.length})` : ""}
      </summary>
      <div class="mapping-list">
        <p class="mapping-copy">
          Rules are checked from top to bottom. The first match wins.
        </p>
        ${mappings.map((mapping, index) =>
          card.type === "number"
            ? html`
                <div
                  class="mapping-rule ${this.draggedMapping?.kind === "value" && this.draggedMapping.index === index ? "dragging" : ""}"
                  @dragover=${(event: DragEvent) => event.preventDefault()}
                  @drop=${(event: DragEvent) => this.dropMapping(card, "value", index, event)}
                >
                  ${this.dragHandle("value", index)}
                  ${this.field("From", (mapping as NumberValueMapping).minimum, (value) => updateNumber(index, "minimum", value), "number")}
                  ${this.field("To", (mapping as NumberValueMapping).maximum, (value) => updateNumber(index, "maximum", value), "number")}
                  ${this.field("Display as", mapping.value, (value) => {
                    mapping.value = value;
                    this.changed();
                  })}
                  <button
                    class="icon-button danger"
                    title="Delete mapping"
                    aria-label="Delete mapping"
                    @click=${() => remove(index)}
                  >
                    <ha-icon icon="mdi:delete-outline"></ha-icon>
                  </button>
                </div>
              `
            : html`
                <div
                  class="mapping-rule text ${this.draggedMapping?.kind === "value" && this.draggedMapping.index === index ? "dragging" : ""}"
                  @dragover=${(event: DragEvent) => event.preventDefault()}
                  @drop=${(event: DragEvent) => this.dropMapping(card, "value", index, event)}
                >
                  ${this.dragHandle("value", index)}
                  ${this.select(
                    "Match",
                    (mapping as TextValueMapping).operator,
                    ["equals", "starts_with", "ends_with", "contains"],
                    (value) => {
                      (mapping as TextValueMapping).operator =
                        value as TextValueMapping["operator"];
                      this.changed();
                    },
                  )}
                  ${this.field(
                    "Text",
                    (mapping as TextValueMapping).match,
                    (value) => {
                      (mapping as TextValueMapping).match = value;
                      this.changed();
                    },
                  )}
                  ${this.field("Display as", mapping.value, (value) => {
                    mapping.value = value;
                    this.changed();
                  })}
                  <button
                    class="icon-button danger"
                    title="Delete mapping"
                    aria-label="Delete mapping"
                    @click=${() => remove(index)}
                  >
                    <ha-icon icon="mdi:delete-outline"></ha-icon>
                  </button>
                </div>
              `,
        )}
        ${
          mappings.length < 12
            ? html`<button
                class="add-button"
                @click=${() => {
                  const mapping =
                    card.type === "number"
                      ? { minimum: 0, maximum: 100, value: "" }
                      : { operator: "equals" as const, match: "", value: "" };
                  card.valueMappings = [...mappings, mapping] as
                    NumberValueMapping[] | TextValueMapping[];
                  this.changed();
                }}
              >
                Add mapping
              </button>`
            : nothing
        }
      </div>
    </details>`;
  }

  private colorMappingsEditor(card: DisplayCard) {
    if (card.type !== "number" && card.type !== "text") return nothing;
    const transparentCards = this.dashboard?.pages[this.pageIndex]?.transparentCards === true;
    const mappings = card.colorMappings ?? [];
    const updateNumber = (
      index: number,
      key: "minimum" | "maximum",
      input: string,
    ) => {
      const mapping = mappings[index] as NumberColorMapping;
      if (input.trim() === "") delete mapping[key];
      else mapping[key] = Number(input);
      this.changed();
    };
    const updateColor = (
      mapping: NumberColorMapping | TextColorMapping,
      key: "background" | "foreground",
      value: string,
    ) => {
      if (value) mapping[key] = value;
      else delete mapping[key];
      this.changed();
    };
    const remove = (index: number) => {
      mappings.splice(index, 1);
      if (!mappings.length) delete card.colorMappings;
      this.changed();
    };
    return html`<details class="mappings">
      <summary>
        Color mappings${mappings.length ? ` (${mappings.length})` : ""}
      </summary>
      <div class="mapping-list">
        <p class="mapping-copy">
          The first matching rule sets the card colors.
        </p>
        ${mappings.map((mapping, index) =>
          card.type === "number"
            ? html`
                <div
                  class="mapping-rule colors ${this.draggedMapping?.kind === "color" && this.draggedMapping.index === index ? "dragging" : ""}"
                  @dragover=${(event: DragEvent) => event.preventDefault()}
                  @drop=${(event: DragEvent) => this.dropMapping(card, "color", index, event)}
                >
                  ${this.dragHandle("color", index)}
                  ${this.field("From", (mapping as NumberColorMapping).minimum, (value) => updateNumber(index, "minimum", value), "number")}
                  ${this.field("To", (mapping as NumberColorMapping).maximum, (value) => updateNumber(index, "maximum", value), "number")}
                  <mini-display-color-field
                    label="Background"
                    .disabled=${transparentCards}
                    .value=${mapping.background ?? ""}
                    @color-changed=${(event: CustomEvent<string>) => updateColor(mapping, "background", event.detail)}
                  ></mini-display-color-field>
                  <mini-display-color-field
                    label="Text color"
                    .value=${mapping.foreground ?? ""}
                    @color-changed=${(event: CustomEvent<string>) => updateColor(mapping, "foreground", event.detail)}
                  ></mini-display-color-field>
                  <button
                    class="icon-button danger"
                    title="Delete color mapping"
                    aria-label="Delete color mapping"
                    @click=${() => remove(index)}
                  >
                    <ha-icon icon="mdi:delete-outline"></ha-icon>
                  </button>
                </div>
              `
            : html`
                <div
                  class="mapping-rule colors text ${this.draggedMapping?.kind === "color" && this.draggedMapping.index === index ? "dragging" : ""}"
                  @dragover=${(event: DragEvent) => event.preventDefault()}
                  @drop=${(event: DragEvent) => this.dropMapping(card, "color", index, event)}
                >
                  ${this.dragHandle("color", index)}
                  ${this.select(
                    "Match",
                    (mapping as TextColorMapping).operator,
                    ["equals", "starts_with", "ends_with", "contains"],
                    (value) => {
                      (mapping as TextColorMapping).operator =
                        value as TextColorMapping["operator"];
                      this.changed();
                    },
                  )}
                  ${this.field(
                    "Text",
                    (mapping as TextColorMapping).match,
                    (value) => {
                      (mapping as TextColorMapping).match = value;
                      this.changed();
                    },
                  )}
                  <mini-display-color-field
                    label="Background"
                    .disabled=${transparentCards}
                    .value=${mapping.background ?? ""}
                    @color-changed=${(event: CustomEvent<string>) => updateColor(mapping, "background", event.detail)}
                  ></mini-display-color-field>
                  <mini-display-color-field
                    label="Text color"
                    .value=${mapping.foreground ?? ""}
                    @color-changed=${(event: CustomEvent<string>) => updateColor(mapping, "foreground", event.detail)}
                  ></mini-display-color-field>
                  <button
                    class="icon-button danger"
                    title="Delete color mapping"
                    aria-label="Delete color mapping"
                    @click=${() => remove(index)}
                  >
                    <ha-icon icon="mdi:delete-outline"></ha-icon>
                  </button>
                </div>
              `,
        )}
        ${
          mappings.length < 12
            ? html`<button
                class="add-button"
                @click=${() => {
                  const mapping =
                    card.type === "number"
                      ? { minimum: 0, maximum: 100 }
                      : { operator: "equals" as const, match: "" };
                  card.colorMappings = [...mappings, mapping] as
                    NumberColorMapping[] | TextColorMapping[];
                  this.changed();
                }}
              >
                Add color mapping
              </button>`
            : nothing
        }
      </div>
    </details>`;
  }

  private cardSettings(card: DisplayCard, rowIndex: number, cardIndex: number) {
    const cards = this.dashboard!.pages[this.pageIndex].rows[rowIndex].cards;
    const hints = {
      number:
        "Displays a numeric value with an optional unit and progress visualization.",
      text: "Displays text from an entity or the static text below.",
      status: "Maps a state entity to two readable labels.",
      clock: "Displays local time without using an entity.",
      image: "Displays an optimized image without an entity.",
      chart: "Displays recorded values as a chart.",
      weather: "Current conditions and forecasts from Home Assistant.",
    };
    const rulesCount =
      (card.visibility ? 1 : 0) +
      (card.valueMappings?.length ?? 0) +
      (card.colorMappings?.length ?? 0);
    const selectType = (input: DisplayCard["type"]) => {
      const {frame, titleFrame, valueFrame} = card;
      Object.keys(card).forEach(
        (key) => delete (card as unknown as Record<string, unknown>)[key],
      );
      Object.assign(card, newCard(input));
      if (frame) card.frame = frame;
      if (titleFrame) card.titleFrame = titleFrame;
      if (valueFrame) card.valueFrame = valueFrame;
      this.changed();
    };
    return html`<section class="card-settings">
      <div class="card-head">
        <div class="card-title">
          <strong>${this.cardName(card)}</strong
          >${card.title?.trim() && card.showTitle === false ? html`<span class="condition-mark"><ha-icon icon="mdi:eye-off-outline"></ha-icon>Title hidden</span>` : nothing}${card.visibility ? html`<span class="condition-mark"><ha-icon icon="mdi:eye-settings-outline"></ha-icon>Conditional</span>` : nothing}
        </div>
        ${this.menu(
          html`<button
              @click=${() => {
                cards.splice(cardIndex + 1, 0, structuredClone(card));
                this.selected = { row: rowIndex, card: cardIndex + 1 };
                this.changed();
              }}
            >
              Duplicate</button
            ><button
              class="danger"
              ?disabled=${cards.length === 1 && this.dashboard!.pages[this.pageIndex].layout !== "free"}
              @click=${() => {
                if (cards.length > 1 || this.dashboard!.pages[this.pageIndex].layout === "free") {
                  cards.splice(cardIndex, 1);
                  this.selected = undefined;
                  this.changed();
                }
              }}
            >
              Delete
            </button>`,
        )}
      </div>
      <nav class="card-section-tabs" aria-label="Card settings sections">
        ${(
          [
            ["content", "Content", "mdi:text-box-outline"],
            ["appearance", "Appearance", "mdi:palette-outline"],
            ["rules", "Rules", "mdi:source-branch"],
          ] as const
        ).map(
          ([section, label, icon]) =>
            html`<button
              class="card-section-tab ${
                this.cardSection === section ? "active" : ""
              }"
              role="tab"
              aria-selected=${this.cardSection === section}
              @click=${() => (this.cardSection = section)}
            >
              <ha-icon icon=${icon}></ha-icon><span>${label}</span>${
                section === "rules" && rulesCount
                  ? html`<span class="section-count">${rulesCount}</span>`
                  : nothing
              }
            </button>`,
        )}
      </nav>
      <div class="card-pane" role="tabpanel">
        ${
          this.cardSection === "content"
            ? html`
                <section class="settings-group">
                  <div class="settings-heading">
                    <ha-icon icon="mdi:card-text-outline"></ha-icon>
                    <div>
                      <strong>Card</strong><small>${hints[card.type]}</small>
                    </div>
                  </div>
                  ${this.segmented(
                    "Card type",
                    card.type,
                    [
                      { value: "number", label: "Number", icon: "mdi:numeric" },
                      { value: "text", label: "Text", icon: "mdi:format-text" },
                      { value: "chart", label: "Chart", icon: "mdi:chart-bar" },
                      { value: "weather", label: "Weather", icon: "mdi:weather-partly-cloudy" },
                      {
                        value: "status",
                        label: "Status",
                        icon: "mdi:toggle-switch-outline",
                      },
                      {
                        value: "clock",
                        label: "Clock",
                        icon: "mdi:clock-outline",
                      },
                      {
                        value: "image",
                        label: "Image",
                        icon: "mdi:image-outline",
                      },
                    ],
                    selectType,
                  )}
                  <div class="grid compact-grid">
                    ${this.field("Title", card.title, (input) => {
                      card.title = input;
                      this.changed();
                    })}
                    <div class="inline-option">
                      ${this.checkbox(
                        "Show title on display",
                        card.showTitle !== false,
                        (input) => {
                          if (this.dashboard?.pages[this.pageIndex]?.layout === "free") freezeTextFrames(card);
                          card.showTitle = input;
                          this.changed();
                        },
                        !card.title?.trim(),
                      )}
                    </div>
                  </div>
                </section>
                ${
                  card.type === "image"
                    ? html`<section class="settings-group">
                        <div class="settings-heading">
                          <ha-icon icon="mdi:image-outline"></ha-icon>
                          <div>
                            <strong>Image</strong
                            ><small>Displayed without an entity value</small>
                          </div>
                        </div>
                        ${this.imageField("Image", card.image, (id) => {
                          card.image = id;
                          this.changed();
                        })}
                        ${this.segmented(
                          "Fit",
                          card.imageFit ?? "cover",
                          [
                            {
                              value: "cover",
                              label: "Cover",
                              icon: "mdi:image-size-select-actual",
                            },
                            {
                              value: "contain",
                              label: "Contain",
                              icon: "mdi:image-size-select-large",
                            },
                            {
                              value: "stretch",
                              label: "Stretch",
                              icon: "mdi:fit-to-screen-outline",
                            },
                          ],
                          (input) => {
                            card.imageFit = input as DisplayCard["imageFit"];
                            this.changed();
                          },
                        )}
                      </section>`
                    : nothing
                }
                ${
                  ["number", "status", "text", "chart", "weather"].includes(card.type)
                    ? html`<section class="settings-group">
                        <div class="settings-heading">
                          <ha-icon icon="mdi:database-outline"></ha-icon>
                          <div>
                            <strong>Data</strong
                            ><small>Value shown by this card</small>
                          </div>
                        </div>
                        <div class="grid">
                          ${this.entity(card)}
                          ${card.type === "weather" ? html`<mini-display-weather-editor style="grid-column:1/-1" .settings=${card.weather??{}}
                            @weather-changed=${(e:CustomEvent)=>{card.weather=e.detail;this.changed();}}></mini-display-weather-editor>`:nothing}
                          ${
                            card.type === "number"
                              ? html`${this.field(
                                  "Unit",
                                  card.unit,
                                  (input) => {
                                    card.unit = input;
                                    this.changed();
                                  },
                                )}${this.select(
                                  "Progress",
                                  card.progress ?? "none",
                                  ["none", "bar", "ring"],
                                  (input) => {
                                    card.progress =
                                      input as DisplayCard["progress"];
                                    this.changed();
                                  },
                                )}${
                                  card.progress && card.progress !== "none"
                                    ? html`${this.field(
                                        "Minimum",
                                        card.minimum,
                                        (input) => {
                                          card.minimum = Number(input);
                                          this.changed();
                                        },
                                        "number",
                                      )}${this.field(
                                        "Maximum",
                                        card.maximum,
                                        (input) => {
                                          card.maximum = Number(input);
                                          this.changed();
                                        },
                                        "number",
                                      )}`
                                    : nothing
                                }`
                              : nothing
                          }
                          ${
                            card.type === "text"
                              ? html`${this.field(
                                  "Static text",
                                  card.text,
                                  (input) => {
                                    card.text = input;
                                    this.changed();
                                  },
                                )}${this.field("Unit", card.unit, (input) => {
                                  card.unit = input;
                                  this.changed();
                                })}`
                              : nothing
                          }
                          ${
                            card.type === "status"
                              ? html`${this.field(
                                  "On text",
                                  card.onText,
                                  (input) => {
                                    card.onText = input;
                                    this.changed();
                                  },
                                )}${this.field(
                                  "Off text",
                                  card.offText,
                                  (input) => {
                                    card.offText = input;
                                    this.changed();
                                  },
                                )}`
                              : nothing
                          }
                        </div>
                      </section>`
                    : nothing
                }
                ${card.type === "number" ? html`<section class="settings-group">
                  <div class="settings-heading">
                    <ha-icon icon="mdi:tune-vertical"></ha-icon>
                    <div><strong>Value transformers</strong
                      ><small>Format or adjust the numeric value before display</small></div>
                  </div>
                  <mini-display-value-transform-editor
                    .value=${card.valueTransform}
                    .onValueChange=${(value: DisplayCard["valueTransform"]) => {
                      card.valueTransform = value;
                      this.changed();
                    }}
                  ></mini-display-value-transform-editor>
                </section>` : nothing}
                <section class="settings-group"><mini-display-graph-editor .card=${card} .hass=${this.hass}
                  @graph-changed=${(event: CustomEvent) => {
                    const graphWasEnabled = card.graph !== undefined && card.graph !== null;
                    card.graph = event.detail;
                    if (graphWasEnabled && !event.detail) {
                      card.backgroundMode = "transparent";
                      card.transparentBackground = true;
                    }
                    this.changed();
                  }}
                ></mini-display-graph-editor></section>
              `
            : this.cardSection === "appearance"
              ? html`<section class="settings-group">
                  <div class="settings-heading">
                    <ha-icon icon="mdi:palette-outline"></ha-icon>
                    <div>
                      <strong>Appearance</strong
                      ><small>Colors, typography and placement</small>
                    </div>
                  </div>
                  ${this.appearanceEditor(card)}
                </section>`
              : html`
                  <section class="settings-group">
                    <div class="setting-action">
                      <ha-icon icon="mdi:eye-settings-outline"></ha-icon>
                      <div>
                        <strong>Visibility</strong>
                        <small
                          >${
                            card.visibility
                              ? "Shown when configured conditions match"
                              : "Always visible"
                          }</small
                        >
                      </div>
                      <ha-button
                        @click=${() =>
                          this.openVisibility("card", rowIndex, cardIndex)}
                        >${card.visibility ? "Edit" : "Configure"}</ha-button
                      >
                    </div>
                  </section>
                  <section class="settings-group rule-groups">
                    <div class="settings-heading">
                      <ha-icon icon="mdi:swap-horizontal"></ha-icon>
                      <div>
                        <strong>Mappings</strong
                        ><small
                          >Transform values and colors in rule order</small
                        >
                      </div>
                    </div>
                    ${this.valueMappingsEditor(card)}${this.colorMappingsEditor(card)}
                  </section>
                `
        }
      </div>
    </section>`;
  }

  private rowEditor(row: DisplayRow, rowIndex: number) {
    const page = this.dashboard!.pages[this.pageIndex];
    return html`<section class="row-panel">
      <div class="row-head">
        <div class="row-title">
          ${
            this.editingRowTitle === rowIndex
              ? html`<input
                  class="row-title-input"
                  aria-label="Row title"
                  autofocus
                  .value=${row.title ?? ""}
                  placeholder=${`Row ${rowIndex + 1}`}
                  @input=${(event: Event) => {
                    row.title = (event.target as HTMLInputElement).value;
                    this.changed();
                  }}
                  @blur=${() => (this.editingRowTitle = undefined)}
                  @keydown=${(event: KeyboardEvent) => {
                    if (event.key === "Enter" || event.key === "Escape") {
                      (event.currentTarget as HTMLInputElement).blur();
                    }
                  }}
                />`
              : html`<strong
                    >${row.title?.trim() || `Row ${rowIndex + 1}`}</strong
                  ><button
                    class="inline-icon-button"
                    aria-label="Edit row title"
                    title="Edit row title"
                    @click=${() => (this.editingRowTitle = rowIndex)}
                  >
                    <ha-icon icon="mdi:pencil-outline"></ha-icon>
                  </button>`
          }<small
            >${row.cards.length}
            ${row.cards.length === 1 ? "card" : "cards"}</small
          >${row.visibility ? html`<span class="condition-mark"><ha-icon icon="mdi:eye-settings-outline"></ha-icon>Conditional</span>` : nothing}
        </div>
        ${this.menu(
          html`<button @click=${() => this.openVisibility("row", rowIndex)}>
              Visibility</button
            ><button
              @click=${() => {
                page.rows.splice(rowIndex + 1, 0, structuredClone(row));
                this.changed();
              }}
            >
              Duplicate</button
            ><button
              class="danger"
              ?disabled=${page.rows.length === 1}
              @click=${() => {
                if (page.rows.length > 1) this.requestDeleteRow(rowIndex);
              }}
            >
              Delete
            </button>`,
        )}
      </div>
      ${
        row.title?.trim()
          ? this.fontSelect(
              "Row title font",
              row.titleStyle?.fontFamily,
              (input) => {
                row.titleStyle = {
                  ...(row.titleStyle ?? {}),
                  fontFamily: input,
                };
                this.changed();
              },
            )
          : nothing
      }
      <nav class="card-tabs" aria-label=${`Cards in row ${rowIndex + 1}`}>
        ${row.cards.map((card, cardIndex) => {
          const active =
            this.selected?.row === rowIndex &&
            this.selected?.card === cardIndex;
          return html`<button
            draggable="true"
            class="tab ${active ? "active" : ""} ${this.draggedCard?.row === rowIndex && this.draggedCard.index === cardIndex ? "dragging" : ""}"
            aria-label=${this.cardName(card)}
            aria-expanded=${active}
            @dragstart=${(event: DragEvent) => this.dragCard(rowIndex, cardIndex, event)}
            @dragover=${(event: DragEvent) => event.preventDefault()}
            @drop=${(event: DragEvent) => this.dropCard(rowIndex, cardIndex, event)}
            @dragend=${() => {
              this.draggedCard = undefined;
              this.requestUpdate();
            }}
            @click=${() => (this.selected = active ? undefined : { row: rowIndex, card: cardIndex })}
          >
            ${this.cardName(card)}
          </button>`;
        })}${
          row.cards.length < 3
            ? html`<button
                class="icon-button"
                title="Add card"
                aria-label="Add card"
                @click=${() => {
                  row.cards.push(newCard());
                  this.selected = { row: rowIndex, card: row.cards.length - 1 };
                  this.changed();
                }}
              >
                <ha-icon icon="mdi:plus"></ha-icon>
              </button>`
            : nothing
        }
      </nav>
      ${this.selected?.row === rowIndex ? this.cardSettings(row.cards[this.selected.card], rowIndex, this.selected.card) : nothing}
    </section>`;
  }

  private setLayout(mode: "rows" | "free") {
    const page = this.dashboard!.pages[this.pageIndex];
    if (mode === "free") {
      page.rows.forEach((row, ri) => row.cards.forEach((card, ci) => {
        card.frame ??= {x:ci*100/row.cards.length,y:ri*100/page.rows.length,width:100/row.cards.length,height:100/page.rows.length};
      }));
    } else {
      const cards = page.rows.flatMap(row => row.cards);
      page.rows = [];
      for (let i=0;i<cards.length;i+=3) page.rows.push({weight:1,gap:"small",cards:cards.slice(i,i+3)});
      if (!page.rows.length) page.rows = [newRow()];
    }
    page.layout = mode;
    this.selected = undefined;
    this.changed();
  }

  private freeEditor(page: Dashboard["pages"][number]) {
    const items = page.rows.flatMap((row, ri) => row.cards.map((card, ci) => ({card,ri,ci})));
    const selected = this.selected && page.rows[this.selected.row]?.cards[this.selected.card];
    const add = (type: DisplayCard["type"]) => {
      if (items.length >= 18) { this.syncState="error"; this.syncMessage="This display supports up to 18 items per page"; return; }
      const card = newCard(type);
      card.frame={x:5,y:5,width:50,height:30};
      card.backgroundMode="transparent";
      page.rows[0].cards.push(card);
      this.selected={row:0,card:page.rows[0].cards.length-1};
      this.changed();
    };
    const move = (delta: number) => {
      if (!selected) return;
      const cards=items.map(item=>item.card);
      const from=cards.indexOf(selected), to=from+delta;
      if (to<0 || to>=cards.length) return;
      cards.splice(to,0,cards.splice(from,1)[0]);
      page.rows=[{cards}]; this.selected={row:0,card:to}; this.changed();
    };
    return html`<section class="row-panel">
      <nav class="tabs" aria-label="Add item">${(["number","text","image","chart","weather","clock","status"] as const).map(type=>html`<button class="tab" @click=${()=>add(type)}><ha-icon icon="mdi:plus"></ha-icon>${type}</button>`)}</nav>
      <nav class="card-tabs" aria-label="Items">${items.map(({card,ri,ci})=>html`<button class="tab ${this.selected?.row===ri && this.selected.card===ci ? "active":""}" @click=${()=>this.selected={row:ri,card:ci}}>${this.cardName(card)}</button>`)}</nav>
      ${selected?.frame ? html`<div class="tabs"><button class="tab" @click=${()=>move(-1)}>Send backward</button><button class="tab" @click=${()=>move(1)}>Bring forward</button></div>` : nothing}
      ${selected && this.selected ? this.cardSettings(selected,this.selected.row,this.selected.card):nothing}
    </section>`;
  }

  private renderEditor() {
    const dashboard = this.dashboard;
    const page = dashboard?.pages[this.pageIndex];
    const dirty = this.dirtyDisplays.has(this.selectedDisplayId);
    const enabledPages =
      dashboard?.pages.filter((item) => item.enabled !== false).length ?? 0;
    const pageStyle = page?.style ?? {};
    const pageTitleStyle = page?.titleStyle ?? {};
    return html`
      <ha-card class="editor-card">
        <div class="editor-heading">
          <div class="editor-title">
            <strong>${this.selectedDisplay?.title}</strong
            ><small>${this.selectedScene?.name}</small>
          </div>
          <div class="save-area">
            <div
              class="sync ${this.syncState}"
              role=${this.syncState === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              <i></i><span>${this.syncMessage}</span>
            </div>
            <div class="save-actions">
              <ha-button .disabled=${!dirty} @click=${this.discard}
                >Discard</ha-button
              ><ha-button
                .disabled=${!dirty || this.syncState === "syncing"}
                @click=${() => void this.save()}
                >Save</ha-button
              >
            </div>
          </div>
        </div>
        ${
          page && dashboard
            ? html`
                <div class="editor-content">
                  <nav class="tabs" aria-label="Dashboard pages">
                    ${dashboard.pages.map(
                      (item, index) => html`
                        <button
                          class="tab ${index === this.pageIndex ? "active" : ""} ${item.enabled === false ? "inactive" : ""}"
                          aria-pressed=${index === this.pageIndex}
                          @click=${() => void this.showPage(index)}
                        >
                          ${item.enabled === false ? html`<ha-icon icon="mdi:eye-off-outline"></ha-icon>` : nothing}${item.title || item.id}
                        </button>
                      `,
                    )}
                    <button
                      class="icon-button"
                      aria-label="Add page"
                      title="Add page"
                      @click=${() => {
                        dashboard.pages.push(
                          newPage(dashboard.pages.length + 1),
                        );
                        this.pageIndex = dashboard.pages.length - 1;
                        this.previewPages = {
                          ...this.previewPages,
                          [this.selectedDisplayId]: this.pageIndex,
                        };
                        this.selected = { row: 0, card: 0 };
                        this.changed();
                      }}
                    >
                      <ha-icon icon="mdi:plus"></ha-icon>
                    </button>
                  </nav>
                  <details class="page-settings">
                    <summary class="page-summary">
                      <span class="page-summary-copy"
                        ><span>Page settings</span
                        ><small
                          >${page.durationSeconds ?? 10}s ·
                          ${page.enabled === false ? "Disabled" : "Enabled"}${page.visibility ? " · conditional" : ""}${page.showTitle === false ? " · title hidden" : ""}</small
                        ></span
                      ><button
                        class="icon-button danger"
                        aria-label="Delete page"
                        title="Delete page"
                        ?disabled=${dashboard.pages.length <= 1}
                        @click=${(event: Event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          this.deletePage();
                        }}
                      >
                        <ha-icon icon="mdi:delete-outline"></ha-icon>
                      </button>
                    </summary>
                    <div class="page-settings-grid">
                      ${this.field("Page title", page.title, (input) => {
                        page.title = input;
                        this.changed();
                      })}
                      ${this.field(
                        "Duration (seconds)",
                        page.durationSeconds,
                        (input) => {
                          page.durationSeconds = Number(input);
                          this.changed();
                        },
                        "number",
                      )}
                      <div class="page-options">
                        ${this.checkbox(
                          "Enabled",
                          page.enabled !== false,
                          (input) => {
                            page.enabled = input;
                            this.changed();
                          },
                          page.enabled !== false && enabledPages <= 1,
                          "At least one page must stay enabled",
                        )}
                        ${this.checkbox(
                          "Show title",
                          page.showTitle !== false,
                          (input) => {
                            page.showTitle = input;
                            this.changed();
                          },
                        )}
                      </div>
                      <div class="setting-action page-visibility">
                        <ha-icon icon="mdi:eye-settings-outline"></ha-icon>
                        <div><strong>Visibility</strong><small>${page.visibility ? "Shown when configured conditions match" : "Always visible"}</small></div>
                        <ha-button @click=${() => this.openVisibility("page")}>${page.visibility ? "Edit" : "Configure"}</ha-button>
                      </div>
                      ${
                        page.showTitle !== false
                          ? html`<div class="page-title-position">
                              ${this.segmented(
                                "Title position",
                                page.titlePosition ?? "top",
                                [
                                  {
                                    value: "top" as const,
                                    label: "Top",
                                    icon: "mdi:format-vertical-align-top",
                                  },
                                  {
                                    value: "right" as const,
                                    label: "Right",
                                    icon: "mdi:format-horizontal-align-right",
                                  },
                                  {
                                    value: "bottom" as const,
                                    label: "Bottom",
                                    icon: "mdi:format-vertical-align-bottom",
                                  },
                                  {
                                    value: "left" as const,
                                    label: "Left",
                                    icon: "mdi:format-horizontal-align-left",
                                  },
                                ],
                                (input) => {
                                  page.titlePosition = input;
                                  this.changed();
                                },
                              )}
                            </div>`
                          : nothing
                      }
                      <details class="page-appearance">
                        <summary>Page appearance</summary>
                        <div class="page-appearance-grid">
                          <mini-display-color-field
                            label="Page background"
                            .value=${pageStyle.background ?? ""}
                            @color-changed=${(event: CustomEvent<string>) => {
                              page.style = {
                                ...(page.style ?? {}),
                                background: event.detail || undefined,
                              };
                              this.changed();
                            }}
                          ></mini-display-color-field>
                          ${this.imageField(
                            "Page background image",
                            page.backgroundImage,
                            (id) => {
                              page.backgroundImage = id || undefined;
                              this.changed();
                            },
                          )}
                          <div class="inline-option">
                            ${this.checkbox(
                              "Transparent card backgrounds",
                              page.transparentCards === true,
                              (input) => {
                                page.transparentCards = input;
                                this.changed();
                              },
                              false,
                              "Keeps each card background setting but does not render it on this page",
                            )}
                          </div>
                          ${
                            page.showTitle !== false
                              ? html`
                                  <mini-display-color-field
                                    label="Title background"
                                    .value=${pageTitleStyle.background ?? ""}
                                    @color-changed=${(
                                      event: CustomEvent<string>,
                                    ) => {
                                      page.titleStyle = {
                                        ...(page.titleStyle ?? {}),
                                        background: event.detail || undefined,
                                      };
                                      this.changed();
                                    }}
                                  ></mini-display-color-field>
                                  <mini-display-color-field
                                    label="Title text"
                                    .value=${pageTitleStyle.foreground ?? ""}
                                    @color-changed=${(
                                      event: CustomEvent<string>,
                                    ) => {
                                      page.titleStyle = {
                                        ...(page.titleStyle ?? {}),
                                        foreground: event.detail || undefined,
                                      };
                                      this.changed();
                                    }}
                                  ></mini-display-color-field>
                                  ${this.fontSelect(
                                    "Title font",
                                    pageTitleStyle.fontFamily,
                                    (input) => {
                                      page.titleStyle = {
                                        ...(page.titleStyle ?? {}),
                                        fontFamily: input,
                                      };
                                      this.changed();
                                    },
                                  )}
                                  ${this.select(
                                    "Title font size",
                                    pageTitleStyle.fontSize ?? "small",
                                    ["small", "medium", "large", "xlarge"],
                                    (input) => {
                                      page.titleStyle = {
                                        ...(page.titleStyle ?? {}),
                                        fontSize: input as Style["fontSize"],
                                      };
                                      this.changed();
                                    },
                                  )}
                                `
                              : nothing
                          }
                        </div>
                      </details>
                      <details class="advanced-settings">
                        <summary>Advanced</summary>
                        <div class="advanced-settings-content">
                          ${this.field("Page ID", page.id, (input) => {
                            page.id = input;
                            this.changed();
                          })}
                        </div>
                      </details>
                    </div>
                  </details>
                  ${this.transitionEditor(page)}
                  ${this.segmented("Layout",page.layout ?? "rows",[{value:"rows",label:"Rows",icon:"mdi:view-agenda-outline"},{value:"free",label:"Free layout",icon:"mdi:vector-square"}], value=>this.setLayout(value as "rows"|"free"))}
                  <div class="rows">
                    ${page.layout === "free" ? this.freeEditor(page) : page.rows.map((row, index) => this.rowEditor(row, index))}
                  </div>
                  ${
                    page.layout !== "free" && page.rows.length < 6
                      ? html`<button
                          class="add-button"
                          @click=${() => {
                            page.rows.push(newRow());
                            this.changed();
                          }}
                        >
                          Add row
                        </button>`
                      : nothing
                  }
                </div>
              `
            : html`<div class="loading">
                <p>No layout configured for this display.</p>
                <ha-button @click=${this.createLayout}>Create layout</ha-button>
              </div>`
        }
      </ha-card>
    `;
  }

  render() {
    if (!this.loaded) return html`<div class="loading">Loading displays…</div>`;
    if (this.displays.length === 0)
      return html`<ha-card class="empty"
        ><ha-icon icon="mdi:monitor-off"></ha-icon>
        <h2>No Mini Displays yet</h2>
        <p>
          Add a Mini Display integration first. Configured displays will appear
          here automatically.
        </p>
        <ha-button
          @click=${() => {
            history.pushState(null, "", "/config/integrations");
            window.dispatchEvent(new Event("location-changed"));
          }}
          ><ha-icon icon="mdi:plus"></ha-icon>Add integration</ha-button
        ></ha-card
      >`;
    const visibility = this.visibilityObject()?.visibility;
    const visibilityName = this.visibilityTarget?.kind === "page"
      ? "Page"
      : this.visibilityTarget?.kind === "row" ? "Row" : "Card";
    const visibilityCard =
      this.visibilityTarget?.kind === "card"
        ? (this.visibilityObject() as DisplayCard)
        : undefined;
    return html`
      <div
        class="layout ${this.schemaViewOpen ? "schema-open" : ""}"
        style=${`--preview-column-width:${Math.min(640, Math.max(288, ...this.displays.map((display) => display.width + 28)))}px`}
      >
        <mini-display-scene-sidebar
          .displays=${this.displays}
          .scenes=${this.scenes}
          .selectedDisplayId=${this.selectedDisplayId}
          .selectedSceneId=${this.selectedSceneId}
          .section=${this.section}
          .imageCount=${this.assets[this.selectedDisplayId]?.length ?? 0}
          .form=${this.sceneForm}
          .sceneName=${this.sceneName}
          @display-selected=${(event: CustomEvent<string>) => this.selectDisplay(event.detail)}
          @scene-selected=${(event: CustomEvent<string>) => void this.selectScene(event.detail)}
          @images-selected=${() => (this.section = "images")}
          @scene-create=${() => void this.createScene()}
          @scene-rename=${this.openRenameScene}
          @scene-duplicate=${() => void this.duplicateScene()}
          @scene-default=${() => void this.setDefaultScene()}
          @scene-delete=${() => void this.deleteScene()}
          @scene-name=${(event: CustomEvent<string>) => (this.sceneName = event.detail)}
          @scene-cancel=${() => (this.sceneForm = null)}
          @scene-save=${() => void this.saveSceneForm()}
        ></mini-display-scene-sidebar>

        ${
          this.section === "images"
            ? html`<mini-display-image-manager
                class="images-view"
                .hass=${this.hass}
                .assets=${this.assets[this.selectedDisplayId] ?? []}
                .displayId=${this.selectedDisplayId}
                .displayName=${this.selectedDisplay?.title ?? "Display"}
                .maximumWidth=${this.selectedDisplay?.width ?? 240}
                .maximumHeight=${this.selectedDisplay?.height ?? 240}
                @asset-uploaded=${(event: CustomEvent<ImageAsset>) => {
                const current = this.assets[this.selectedDisplayId] ?? [];
                this.assets = {
                  ...this.assets,
                  [this.selectedDisplayId]: [
                    ...current.filter((asset) => asset.id !== event.detail.id),
                    event.detail,
                  ],
                };
              }}
                @asset-deleted=${(event: CustomEvent<string>) => {
                this.assets = {
                  ...this.assets,
                  [this.selectedDisplayId]: (
                    this.assets[this.selectedDisplayId] ?? []
                  ).filter((asset) => asset.id !== event.detail),
                };
              }}
              ></mini-display-image-manager>`
            : html`${this.renderEditor()}

                <mini-display-preview-list
                  .hass=${this.hass}
                  .displays=${this.displays}
                  .dashboards=${this.dashboards}
                  .pages=${this.previewPages}
                  .dirtyDisplays=${this.dirtyDisplays}
                  .selectedDisplayId=${this.selectedDisplayId}
                  .selectedSceneId=${this.selectedSceneId}
                  .selectedSceneName=${this.selectedScene?.name ?? ""}
                  .assets=${this.assets}
                  @preview-frame=${(event: CustomEvent) => {
                    const d=event.detail;
                    const card=this.dashboards[d.displayId]?.pages[d.page]?.rows[d.row]?.cards[d.card];
                    if (!card) return;
                    freezeTextFrames(card);
                    if (d.part === "title") card.titleFrame = d.frame;
                    else if (d.part === "value") card.valueFrame = d.frame;
                    else card.frame=d.frame;
                    this.selectedDisplayId=d.displayId;
                    this.pageIndex=d.page;
                    this.selected={row:d.row,card:d.card};
                    this.changed();
                  }}
                  @display-selected=${(event: CustomEvent<string>) => this.selectDisplay(event.detail)}
                  @preview-toggle=${(event: CustomEvent<Display>) => void this.togglePreview(event.detail)}
                  @preview-page=${(event: CustomEvent<{ displayId: string; delta: number }>) => this.previewPage(event.detail.displayId, event.detail.delta)}
                  @schema-view-changed=${(event: CustomEvent<boolean>) => { this.schemaViewOpen = event.detail; }}
                  @preview-select=${(event: CustomEvent<{ displayId: string; page: number; kind: "page-title" | "row" | "card" | "title" | "value"; row?: number; card?: number }>) => void this.openFromPreview(event.detail)}
                  @preview-position=${(event: CustomEvent<{ displayId: string; page: number; kind: "page-title" | "title" | "value"; row?: number; card?: number; position?: "top" | "right" | "bottom" | "left"; horizontalAlign?: NonNullable<Style["horizontalAlign"]>; verticalAlign?: NonNullable<Style["verticalAlign"]> }>) => void this.updateFromPreview(event.detail)}
                  @scene-activate=${(event: CustomEvent<Display>) => void this.activateScene(event.detail)}
                ></mini-display-preview-list>`
        }
      </div>

      ${
        this.visibilityTarget
          ? html`
              <mini-display-visibility-dialog
                .hass=${this.hass}
                .targetName=${visibilityName}
                .targetKind=${this.visibilityTarget.kind}
                .card=${visibilityCard}
                .value=${visibility}
                @visibility-save=${(event: CustomEvent<Visibility>) => this.saveVisibility(event.detail)}
                @visibility-clear=${this.clearVisibility}
                @visibility-cancel=${() => (this.visibilityTarget = undefined)}
              ></mini-display-visibility-dialog>
            `
          : nothing
      }
      ${
        this.confirmation
          ? html`
              <div class="modal-backdrop" @click=${this.closeConfirmation}>
                <ha-card
                  class="confirm-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="confirm-title"
                  @click=${(event: Event) => event.stopPropagation()}
                >
                  <div class="confirm-heading">
                    <ha-icon
                      icon=${this.confirmation.kind === "delete-row" ? "mdi:delete-alert-outline" : "mdi:content-save-alert-outline"}
                    ></ha-icon>
                    <h2 id="confirm-title">
                      ${this.confirmation.kind === "delete-row" ? "Delete row?" : "Discard changes?"}
                    </h2>
                  </div>
                  <div class="modal-body">
                    <p class="modal-copy">
                      ${
                        this.confirmation.kind === "delete-row"
                          ? "This row and all cards inside it will be removed."
                          : "You have unsaved changes. Leaving Mini Displays will discard them."
                      }
                    </p>
                  </div>
                  <div class="modal-actions">
                    <ha-button @click=${this.closeConfirmation}
                      >Cancel</ha-button
                    >
                    <ha-button
                      class="danger-action"
                      @click=${() => void this.confirmAction()}
                      >${this.confirmation.kind === "delete-row" ? "Delete" : "Discard and leave"}</ha-button
                    >
                  </div>
                </ha-card>
              </div>
            `
          : nothing
      }
    `;
  }
}
