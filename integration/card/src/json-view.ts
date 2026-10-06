import { html } from "lit";

const jsonToken =
  /"(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b/g;

export const jsonView = (value: unknown) => {
  const source = JSON.stringify(value, null, 2);
  const parts: unknown[] = [];
  let offset = 0;
  for (const match of source.matchAll(jsonToken)) {
    const index = match.index;
    const token = match[0];
    parts.push(source.slice(offset, index));
    let type = "number";
    if (token.startsWith('"'))
      type = /^\s*:/.test(source.slice(index + token.length)) ? "key" : "string";
    else if (token === "true" || token === "false") type = "boolean";
    else if (token === "null") type = "null";
    parts.push(html`<span class="json-${type}">${token}</span>`);
    offset = index + token.length;
  }
  parts.push(source.slice(offset));
  return parts;
};
