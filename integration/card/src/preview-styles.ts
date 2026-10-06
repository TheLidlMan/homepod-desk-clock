import { css } from "lit";

export const previewStyles = css`
  .free-layout .group,
  .free-layout .row {
    display: contents;
  }
  .free-layout .card {
    position: absolute;
    margin: 0;
    cursor: move;
    touch-action: none;
    overflow: visible;
  }
  .free-layout [data-part] {
    pointer-events: auto;
    touch-action: none;
    cursor: move;
    outline: 1px dashed transparent;
  }
  .free-layout .text-only-frame {
    pointer-events: none;
    outline: none;
    background-image: none;
  }
  .free-layout .text-only-frame.hidden-item [data-part] {
    outline: 1px dashed rgba(255, 255, 255, 0.85);
  }
  .free-layout small[data-part] {
    padding: 0 4px;
    box-sizing: border-box;
  }
  .free-layout [data-part]:hover,
  .free-layout [data-part]:focus-within {
    outline-color: var(--primary-color, #03a9f4);
  }
  .free-layout [data-part] .resize-handle {
    opacity: 0;
  }
  .free-layout [data-part]:hover > .resize-handle,
  .free-layout [data-part]:focus-within > .resize-handle {
    opacity: 1;
  }
  .free-layout .card:focus {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: -2px;
  }
  .free-layout .card.moving {
    outline: 2px dashed #03a9f4;
    outline-offset: -2px;
    opacity: 0.8;
  }
  .resize-handle {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 18px;
    height: 18px;
    z-index: 10;
    cursor: nwse-resize;
    background: linear-gradient(135deg, transparent 50%, #03a9f4 50%);
    border: 0;
    opacity: 0;
  }
  .card:hover > .resize-handle,
  .card:focus-within > .resize-handle,
  .card.moving > .resize-handle {
    opacity: 1;
  }
  :host {
    display: block;
    width: 240px;
    max-width: 100%;
  }
  .screen-frame {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  }
  .screen {
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    padding: 6px;
    background: #090b10;
    color: white;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
  }
  .page-content {
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .page-title {
    position: absolute;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-family: sans-serif;
    font-weight: 700;
    white-space: nowrap;
  }
  .page-title.interactive,
  .card.interactive,
  .title.interactive {
    cursor: pointer;
  }
  .page-title.interactive span,
  .card-label,
  .value {
    cursor: grab;
  }
  .page-title.interactive span:active,
  .card-label:active,
  .value:active {
    cursor: grabbing;
  }
  .page-title.top {
    top: 0;
    right: 0;
    left: 0;
  }
  .page-title.bottom {
    right: 0;
    bottom: 0;
    left: 0;
  }
  .page-title.left,
  .page-title.right {
    top: 0;
    bottom: 0;
  }
  .page-title.left {
    left: 0;
  }
  .page-title.right {
    right: 0;
  }
  .page-title.left span {
    transform: rotate(-90deg);
  }
  .page-title.right span {
    transform: rotate(90deg);
  }
  .loading {
    background: linear-gradient(110deg, #090b10 30%, #181c24 45%, #090b10 60%);
    background-size: 220% 100%;
    animation: loading 1.4s linear infinite;
  }
  h3 {
    font: 700 13px sans-serif;
    text-align: center;
    margin: 0;
  }
  .row {
    display: grid;
    gap: 4px;
    min-height: 0;
    flex: 1;
  }
  .group {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .title {
    font: 700 13px/17px sans-serif;
    color: #aaa;
  }
  .card {
    position: relative;
    min-width: 0;
    background: #20242d;
    border-radius: 6px;
    overflow: hidden;
  }
  .card.image-card {
    background-position: center;
    background-repeat: no-repeat;
  }
  .card.flow-overflow {
    overflow: visible;
  }
  .card-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }
  .card.image-card small {
    background: rgba(0, 0, 0, 0.45);
    border-radius: 3px;
    padding: 0 2px;
  }
  .card small,
  .value-wrap {
    position: absolute;
    display: flex;
    min-width: 0;
    min-height: 0;
    pointer-events: none;
  }
  .card small {
    z-index: 2;
    height: auto;
    font: 700 13px/17px sans-serif;
    color: #bbb;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-label,
  .value {
    pointer-events: auto;
  }
  .card-label.marquee,
  .value.marquee {
    display: inline-flex;
    flex-shrink: 0;
    gap: 24px;
    width: max-content;
    max-width: none;
    overflow: visible;
    text-overflow: clip;
  }
  .marquee > .marquee-copy { flex: none; white-space: nowrap; }
  .value-wrap {
    z-index: 1;
  }
  .value {
    max-width: 100%;
    font: 700 14px sans-serif;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hidden-item {
    opacity: 0.48;
    outline: 1px dashed rgba(255, 255, 255, 0.85);
    outline-offset: -2px;
  }
  .hidden-item.card {
    background-image: repeating-linear-gradient(
      135deg,
      transparent 0,
      transparent 7px,
      rgba(255, 255, 255, 0.08) 7px,
      rgba(255, 255, 255, 0.08) 9px
    );
  }
  .drop-grid {
    position: absolute;
    inset: 3px;
    z-index: 8;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 2px;
    padding: 2px;
    background: rgba(0, 0, 0, 0.24);
    border: 1px dashed rgba(255, 255, 255, 0.7);
    border-radius: 5px;
  }
  .drop-cell {
    display: grid;
    place-items: center;
    min-width: 0;
    min-height: 0;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid transparent;
    border-radius: 3px;
  }
  .drop-cell::after {
    content: "";
    width: 5px;
    height: 5px;
    background: rgba(255, 255, 255, 0.58);
    border-radius: 50%;
  }
  .drop-cell.active {
    background: rgba(3, 169, 244, 0.38);
    border-color: #29b6f6;
  }
  .drop-cell.active::after {
    background: white;
  }
  .page-dropzones {
    position: absolute;
    inset: 0;
    z-index: 10;
    pointer-events: none;
  }
  .page-dropzone {
    position: absolute;
    display: grid;
    place-items: center;
    color: white;
    background: rgba(0, 0, 0, 0.45);
    border: 1px dashed rgba(255, 255, 255, 0.75);
    pointer-events: auto;
  }
  .page-dropzone ha-icon {
    --mdc-icon-size: 18px;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
  }
  .page-dropzone.active {
    background: rgba(3, 169, 244, 0.58);
    border-color: #4fc3f7;
  }
  .page-dropzone.top,
  .page-dropzone.bottom {
    right: 18%;
    left: 18%;
    height: 25%;
  }
  .page-dropzone.top {
    top: 3px;
  }
  .page-dropzone.bottom {
    bottom: 3px;
  }
  .page-dropzone.left,
  .page-dropzone.right {
    top: 26%;
    bottom: 26%;
    width: 25%;
  }
  .page-dropzone.left {
    left: 3px;
  }
  .page-dropzone.right {
    right: 3px;
  }
  .bar {
    position: absolute;
    right: 5px;
    bottom: 5px;
    left: 5px;
    height: 5px;
    background: #3d424e;
    border-radius: 2px;
  }
  .bar i {
    display: block;
    height: 100%;
    background: #42a5f5;
    border-radius: 2px;
  }
  .ring-stack {
    position: absolute;
    inset: 5px;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    pointer-events: none;
  }
  .ring {
    width: min(42px, calc(100% - 8px));
    max-height: calc(100% - 18px);
    aspect-ratio: 1;
    border-radius: 50%;
    flex: 0 1 auto;
  }
  .ring:after {
    content: "";
    display: block;
    width: 72%;
    aspect-ratio: 1;
    margin: 14%;
    border-radius: 50%;
    background: var(--ring-bg, #20242d);
  }
  .ring-stack .value {
    flex: none;
    pointer-events: auto;
  }
  .page-title.interactive span,
  .card-label,
  .value {
    touch-action: none;
    user-select: none;
  }
  .drag-ghost {
    position: fixed;
    z-index: 10000;
    max-width: 180px;
    padding: 6px 10px;
    color: white;
    background: rgba(30, 34, 42, 0.94);
    border: 1px solid #4fc3f7;
    border-radius: 6px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
    font: 600 13px sans-serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
    transform: translate(-50%, -50%);
  }
  @keyframes loading {
    to {
      background-position: -220% 0;
    }
  }
  @keyframes card-title-marquee {
    0%,
    22% {
      transform: translateX(0);
    }
    78%,
    100% {
      transform: translateX(var(--marquee-distance));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .loading {
      animation: none;
    }
    .drag-ghost {
      box-shadow: none;
    }
  }
`;
