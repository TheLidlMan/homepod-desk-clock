import { css } from "lit";

export const shellStyles = css`
  :host {
    --bg: #f4f6f9;
    --panel: #fff;
    --text: #17212b;
    --muted: #637083;
    --line: #d9e0e8;
    --accent: #03a9f4;
    --accent-text: #062131;
    --good: #2e9d57;
    --warning: #d49a00;
    --danger: #d64545;
    display: block;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font:
      15px system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    line-height: 1.45;
  }
  * {
    box-sizing: border-box;
  }
  header {
    background: #151a21;
    color: #fff;
  }
  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    max-width: 860px;
    margin: auto;
    padding: 20px 18px 12px;
  }
  .head h1 {
    margin: 0;
    font-size: 22px;
  }
  .head p {
    margin: 3px 0 0;
    color: #aeb8c5;
    font-size: 13px;
  }
  .head-status {
    color: #cbd3dc;
    font-size: 13px;
    text-align: right;
    white-space: nowrap;
  }
  nav {
    display: flex;
    gap: 3px;
    max-width: 860px;
    margin: auto;
    padding: 0 14px;
    overflow-x: auto;
  }
  nav a {
    color: #cbd3dc;
    text-decoration: none;
    padding: 10px 12px;
    border-bottom: 3px solid transparent;
    white-space: nowrap;
  }
  nav a[aria-current="page"] {
    color: #fff;
    border-color: var(--accent);
  }
  main {
    max-width: 860px;
    margin: 20px auto;
    padding: 0 16px 32px;
  }
  .notice,
  .warning,
  .error {
    padding: 10px 12px;
    border-left: 4px solid var(--good);
    background: color-mix(in srgb, var(--good) 12%, var(--panel));
    border-radius: 6px;
    margin-bottom: 14px;
  }
  .update-warning {
    position: sticky;
    top: 12px;
    z-index: 10;
    display: grid;
    gap: 2px;
    padding: 14px 16px;
    border: 1px solid var(--warning);
    border-left-width: 5px;
    border-radius: 8px;
    margin-bottom: 14px;
    background: color-mix(in srgb, var(--warning) 18%, var(--panel));
    box-shadow: 0 8px 24px rgb(0 0 0 / 18%);
  }
  [inert] {
    opacity: 0.55;
  }
  .error {
    border-color: var(--danger);
    background: color-mix(in srgb, var(--danger) 12%, var(--panel));
  }
  .warning {
    border-color: var(--warning);
    background: color-mix(in srgb, var(--warning) 12%, var(--panel));
  }
  .warning .check {
    margin-top: 10px;
  }
  .loading {
    color: var(--muted);
    text-align: center;
    padding: 48px;
  }
  @media (prefers-color-scheme: dark) {
    :host {
      --bg: #0d1117;
      --panel: #171c24;
      --text: #edf2f7;
      --muted: #9aa7b5;
      --line: #303946;
    }
  }
  @media (max-width: 520px) {
    .head {
      align-items: flex-start;
      padding-top: 16px;
    }
    .head-status {
      padding-top: 4px;
    }
    main {
      margin-top: 14px;
    }
  }
`;

export const pageStyles = css`
  :host {
    display: block;
  }
  * {
    box-sizing: border-box;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 12px;
  }
  .card {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 16px;
  }
  .card h2 {
    font-size: 16px;
    margin: 0 0 12px;
  }
  .metric {
    font-size: 25px;
    font-weight: 650;
    margin: 2px 0;
  }
  .age-fresh {
    color: var(--good);
  }
  .age-warning {
    color: var(--warning);
  }
  .age-stale {
    color: var(--danger);
  }
  .muted {
    color: var(--muted);
    font-size: 13px;
  }
  .dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--good);
    margin-right: 7px;
  }
  .dot.off {
    background: var(--danger);
  }
  .stack {
    display: grid;
    gap: 14px;
  }
  .transfer-progress {
    display: grid;
    gap: 6px;
    color: var(--muted);
    font-size: 13px;
  }
  progress {
    width: 100%;
    height: 12px;
    accent-color: var(--accent);
  }
  .dependent {
    display: grid;
    gap: 14px;
    margin-left: 28px;
    transition: opacity 160ms ease;
  }
  .dependent.disabled {
    opacity: 0.42;
  }
  .field {
    display: grid;
    gap: 6px;
    font-weight: 600;
  }
  .field small {
    font-weight: 400;
    color: var(--muted);
  }
  input,
  select,
  button {
    font: inherit;
  }
  input:not([type]),
  input[type="text"],
  input[type="password"],
  input[type="number"],
  input[type="file"],
  select {
    width: 100%;
    padding: 10px 11px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    color: var(--text);
  }
  input[type="range"] {
    width: 100%;
    accent-color: var(--accent);
  }
  option.older-version {
    color: var(--muted);
  }
  .check {
    display: flex;
    align-items: center;
    gap: 9px;
    font-weight: 600;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 16px;
  }
  .actions form {
    margin: 0;
  }
  .choice {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .choice legend {
    width: 100%;
    margin-bottom: 4px;
    font-weight: 600;
  }
  .form-section {
    display: grid;
    gap: 14px;
    margin-top: 4px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
  }
  .form-section h3 {
    margin: 0;
    font-size: 15px;
  }
  .facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }
  .fact {
    min-width: 0;
  }
  .fact strong,
  .fact span {
    display: block;
    overflow-wrap: anywhere;
  }
  .fact strong {
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
  }
  .notice,
  .error {
    padding: 10px 12px;
    border-left: 4px solid var(--good);
    background: color-mix(in srgb, var(--good) 12%, var(--panel));
    border-radius: 6px;
    margin-bottom: 14px;
  }
  .error {
    border-color: var(--danger);
    background: color-mix(in srgb, var(--danger) 12%, var(--panel));
  }
  button {
    border: 0;
    border-radius: 8px;
    padding: 10px 14px;
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
    cursor: pointer;
  }
  button.secondary {
    background: #e2e8ef;
    color: #263442;
  }
  button.danger {
    background: var(--danger);
    color: #fff;
  }
  button:disabled {
    opacity: 0.55;
    cursor: wait;
  }
  .center {
    display: grid;
    gap: 12px;
    max-width: 460px;
    margin: 8vh auto;
  }
  @media (prefers-color-scheme: dark) {
    .secondary,
    button.secondary {
      background: #303946;
      color: #edf2f7;
    }
  }
  @media (max-width: 520px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      scroll-behavior: auto !important;
    }
  }
`;
