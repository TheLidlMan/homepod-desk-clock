//#region node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: f, getOwnPropertySymbols: p, getPrototypeOf: m } = Object, h = globalThis, g = h.trustedTypes, _ = g ? g.emptyScript : "", v = h.reactiveElementPolyfillSupport, y = (e, t) => e, ee = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? _ : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, b = (e, t) => !l(e, t), te = {
	attribute: !0,
	type: String,
	converter: ee,
	reflect: !1,
	useDefault: !1,
	hasChanged: b
};
Symbol.metadata ??= Symbol("metadata"), h.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var x = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = te) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = d(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? te;
	}
	static _$Ei() {
		if (this.hasOwnProperty(y("elementProperties"))) return;
		let e = m(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(y("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(y("properties"))) {
			let e = this.properties, t = [...f(e), ...p(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return s(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? ee : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? ee : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? b)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
x.elementStyles = [], x.shadowRootOptions = { mode: "open" }, x[y("elementProperties")] = /* @__PURE__ */ new Map(), x[y("finalized")] = /* @__PURE__ */ new Map(), v?.({ ReactiveElement: x }), (h.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var S = globalThis, ne = (e) => e, C = S.trustedTypes, re = C ? C.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ie = "$lit$", w = `lit$${Math.random().toFixed(9).slice(2)}$`, ae = "?" + w, oe = `<${ae}>`, T = document, E = () => T.createComment(""), se = (e) => e === null || typeof e != "object" && typeof e != "function", D = Array.isArray, ce = (e) => D(e) || typeof e?.[Symbol.iterator] == "function", le = "[ 	\n\f\r]", O = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ue = /-->/g, de = />/g, k = RegExp(`>|${le}(?:([^\\s"'>=/]+)(${le}*=${le}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), fe = /'/g, pe = /"/g, me = /^(?:script|style|textarea|title)$/i, he = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), A = he(1), j = he(2), M = Symbol.for("lit-noChange"), N = Symbol.for("lit-nothing"), ge = /* @__PURE__ */ new WeakMap(), P = T.createTreeWalker(T, 129);
function _e(e, t) {
	if (!D(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return re === void 0 ? t : re.createHTML(t);
}
var ve = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = O;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === O ? c[1] === "!--" ? o = ue : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = k) : (me.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = k) : o = de : o === k ? c[0] === ">" ? (o = i ?? O, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? k : c[3] === "\"" ? pe : fe) : o === pe || o === fe ? o = k : o === ue || o === de ? o = O : (o = k, i = void 0);
		let d = o === k && e[t + 1].startsWith("/>") ? " " : "";
		a += o === O ? n + oe : l >= 0 ? (r.push(s), n.slice(0, l) + ie + n.slice(l) + w + d) : n + w + (l === -2 ? t : d);
	}
	return [_e(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, ye = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = ve(t, n);
		if (this.el = e.createElement(l, r), P.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = P.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ie)) {
					let t = u[o++], n = i.getAttribute(e).split(w), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Se : r[1] === "?" ? Ce : r[1] === "@" ? we : I
					}), i.removeAttribute(e);
				} else e.startsWith(w) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (me.test(i.tagName)) {
					let e = i.textContent.split(w), t = e.length - 1;
					if (t > 0) {
						i.textContent = C ? C.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], E()), P.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], E());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === ae) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(w, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += w.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = T.createElement("template");
		return n.innerHTML = e, n;
	}
};
function F(e, t, n = e, r) {
	if (t === M) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = se(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = F(e, i._$AS(e, t.values), i, r)), t;
}
var be = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? T).importNode(t, !0);
		P.currentNode = r;
		let i = P.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new xe(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Te(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = P.nextNode(), a++);
		}
		return P.currentNode = T, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, xe = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = N, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = F(this, e, t), se(e) ? e === N || e == null || e === "" ? (this._$AH !== N && this._$AR(), this._$AH = N) : e !== this._$AH && e !== M && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ce(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== N && se(this._$AH) ? this._$AA.nextSibling.data = e : this.T(T.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = ye.createElement(_e(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new be(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = ge.get(e.strings);
		return t === void 0 && ge.set(e.strings, t = new ye(e)), t;
	}
	k(t) {
		D(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(E()), this.O(E()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ne(e).nextSibling;
			ne(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, I = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = N, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = N;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = F(this, e, t, 0), a = !se(e) || e !== this._$AH && e !== M, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = F(this, r[n + o], t, o), s === M && (s = this._$AH[o]), a ||= !se(s) || s !== this._$AH[o], s === N ? e = N : e !== N && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === N ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Se = class extends I {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === N ? void 0 : e;
	}
}, Ce = class extends I {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== N);
	}
}, we = class extends I {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = F(this, e, t, 0) ?? N) === M) return;
		let n = this._$AH, r = e === N && n !== N || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== N && (n === N || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Te = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		F(this, e);
	}
}, Ee = {
	M: ie,
	P: w,
	A: ae,
	C: 1,
	L: ve,
	R: be,
	D: ce,
	V: F,
	I: xe,
	H: I,
	N: Ce,
	U: we,
	B: Se,
	F: Te
}, De = S.litHtmlPolyfillSupport;
De?.(ye, xe), (S.litHtmlVersions ??= []).push("3.3.3");
var Oe = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new xe(t.insertBefore(E(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, ke = globalThis, L = class extends x {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Oe(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return M;
	}
};
L._$litElement$ = !0, L.finalized = !0, ke.litElementHydrateSupport?.({ LitElement: L });
var Ae = ke.litElementPolyfillSupport;
Ae?.({ LitElement: L }), (ke.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/@lit/reactive-element/decorators/custom-element.js
var R = (e) => (t, n) => {
	n === void 0 ? customElements.define(e, t) : n.addInitializer(() => {
		customElements.define(e, t);
	});
}, je = {
	attribute: !0,
	type: String,
	converter: ee,
	reflect: !1,
	hasChanged: b
}, Me = (e = je, t, n) => {
	let { kind: r, metadata: i } = n, a = globalThis.litPropertyMetadata.get(i);
	if (a === void 0 && globalThis.litPropertyMetadata.set(i, a = /* @__PURE__ */ new Map()), r === "setter" && ((e = Object.create(e)).wrapped = !0), a.set(n.name, e), r === "accessor") {
		let { name: r } = n;
		return {
			set(n) {
				let i = t.get.call(this);
				t.set.call(this, n), this.requestUpdate(r, i, e, !0, n);
			},
			init(t) {
				return t !== void 0 && this.C(r, void 0, e, t), t;
			}
		};
	}
	if (r === "setter") {
		let { name: r } = n;
		return function(n) {
			let i = this[r];
			t.call(this, n), this.requestUpdate(r, i, e, !0, n);
		};
	}
	throw Error("Unsupported decorator location: " + r);
};
function z(e) {
	return (t, n) => typeof n == "object" ? Me(e, t, n) : ((e, t, n) => {
		let r = t.hasOwnProperty(n);
		return t.constructor.createProperty(n, e), r ? Object.getOwnPropertyDescriptor(t, n) : void 0;
	})(e, t, n);
}
//#endregion
//#region node_modules/@lit/reactive-element/decorators/state.js
function B(e) {
	return z({
		...e,
		state: !0,
		attribute: !1
	});
}
//#endregion
//#region \0@oxc-project+runtime@0.148.0/helpers/esm/decorate.js
function V(e, t, n, r) {
	var i = arguments.length, a = i < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, o;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
	return i > 3 && a && Object.defineProperty(t, n, a), a;
}
//#endregion
//#region src/duration-field.ts
var Ne = [
	{
		label: "s",
		name: "Seconds",
		scale: 1
	},
	{
		label: "min",
		name: "Minutes",
		scale: 60
	},
	{
		label: "h",
		name: "Hours",
		scale: 3600
	},
	{
		label: "d",
		name: "Days",
		scale: 86400
	}
], H = class extends L {
	constructor(...e) {
		super(...e), this.seconds = 300, this.min = 30, this.max = 86400, this.label = "Bucket duration", this.subsecond = !1;
	}
	get unitOptions() {
		return this.subsecond ? [{
			label: "ms",
			name: "Milliseconds",
			scale: .001
		}, Ne[0]] : Ne;
	}
	willUpdate(e) {
		this.unit === void 0 && (this.unit = [...this.unitOptions].reverse().find((e) => this.seconds >= e.scale && Number.isInteger(this.seconds / e.scale))?.scale ?? this.unitOptions[0].scale);
	}
	static {
		this.styles = o`
    :host { display:block; min-width:0; font:inherit; color:var(--primary-text-color); }
    * { box-sizing:border-box; }
    label { display:block; margin-bottom:6px; font-size:14px; }
    .field { display:flex; align-items:center; border:1px solid var(--divider-color); border-radius:8px; background:var(--card-background-color); }
    .field:focus-within { outline:2px solid var(--primary-color); }
    input[type=number] { min-width:0; width:100%; min-height:42px; border:0; background:none; color:inherit; font:inherit; padding:8px; outline:none; }
    .units { display:flex; flex-shrink:0; gap:2px; margin:4px; }
    .units label { position:relative; display:grid; place-items:center; min-width:30px; min-height:34px; margin:0; padding:0 5px; border-radius:5px; cursor:pointer; font-size:12px; font-weight:600; }
    .units input { position:absolute; opacity:0; width:1px; height:1px; }
    .units label:has(:checked) { background:var(--primary-color); color:var(--text-primary-color,#fff); }
    .units label:hover:not(:has(:checked)) { background:var(--secondary-background-color); }
    .units label:has(:focus-visible) { outline:2px solid var(--primary-color); outline-offset:2px; }
  `;
	}
	render() {
		let e = this.unit ?? 1;
		return A`<label for="duration">${this.label}</label><div class="field">
      <input id="duration" type="number" inputmode="decimal" step="any"
        min=${this.min / e} max=${this.max / e}
        aria-label=${`${this.label} (${this.unitOptions.find((t) => t.scale === e)?.name})`}
        .value=${String(Number((this.seconds / e).toFixed(8)))}
        @change=${(t) => {
			let n = t.target;
			if (!n.value || !n.reportValidity()) return;
			let r = this.subsecond ? 1e3 : 1, i = Math.round(n.valueAsNumber * e * r) / r;
			!Number.isFinite(i) || i < this.min || i > this.max || this.dispatchEvent(new CustomEvent("duration-changed", {
				detail: i,
				bubbles: !0,
				composed: !0
			}));
		}}>
      <div class="units" role="radiogroup" aria-label="Time unit">
        ${this.unitOptions.map((t) => A`<label title=${t.name}><input type="radio" name="unit" aria-label=${t.name}
          .checked=${e === t.scale} @change=${() => {
			this.unit = t.scale;
		}}>${t.label}</label>`)}
      </div>
    </div>`;
	}
};
V([z({ type: Number })], H.prototype, "seconds", void 0), V([z({ type: Number })], H.prototype, "min", void 0), V([z({ type: Number })], H.prototype, "max", void 0), V([z()], H.prototype, "label", void 0), V([z({ type: Boolean })], H.prototype, "subsecond", void 0), V([B()], H.prototype, "unit", void 0), H = V([R("mini-display-duration-field")], H);
//#endregion
//#region src/marquee-field.ts
var Pe = class extends L {
	constructor(...e) {
		super(...e), this.value = {}, this.defaultEnabled = !1;
	}
	static {
		this.styles = o`
    :host { display: block; font: inherit; color: var(--primary-text-color); }
    .controls { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
    label { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
    mini-display-duration-field { flex: 1 1 150px; max-width: 230px; }
    select { font:inherit; color:inherit; background:var(--card-background-color); border:1px solid var(--divider-color); border-radius:6px; padding:7px; min-height:40px; cursor:pointer; }
    .step { display:grid; gap:6px; cursor:default; }
    .step-field { display:flex; align-items:center; min-height:40px; border:1px solid var(--divider-color); border-radius:8px; background:var(--card-background-color); }
    .step-field:focus-within { outline:2px solid var(--primary-color); }
    .step input { width:54px; border:0; outline:0; padding:8px; color:inherit; background:none; font:inherit; }
    .step-unit { padding-right:9px; color:var(--secondary-text-color); }
  `;
	}
	patch(e) {
		this.dispatchEvent(new CustomEvent("marquee-changed", {
			detail: e,
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		let e = (this.value.marquee ?? this.defaultEnabled) && (this.value.textFlow ?? "default") === "default";
		return A`<div class="controls">
      <label><ha-switch aria-label="Marquee" .checked=${e}
        @change=${(e) => {
			let t = e.target.checked;
			this.patch({
				marquee: t,
				...t ? { textFlow: "default" } : {}
			});
		}}></ha-switch>Marquee</label>
      ${e ? A`<select aria-label="Marquee effect"
        @change=${(e) => this.patch({ marqueeEffect: e.target.value })}>
        <option value="bounce" ?selected=${this.value.marqueeEffect !== "loop"}>Back and forth</option>
        <option value="loop" ?selected=${this.value.marqueeEffect === "loop"}>Loop</option>
      </select><mini-display-duration-field label="Step interval"
        .subsecond=${!0} .min=${.05} .max=${10}
        .seconds=${(this.value.marqueeIntervalMs ?? 100) / 1e3}
        @duration-changed=${(e) => this.patch({ marqueeIntervalMs: Math.round(e.detail * 1e3) })}
      ></mini-display-duration-field><label class="step">Step size
        <span class="step-field"><input type="number" inputmode="numeric" min="1" max="16" step="1"
          aria-label="Marquee step size"
          .value=${String(this.value.marqueeStepPixels ?? 1)}
          @change=${(e) => {
			let t = e.target;
			t.reportValidity() && this.patch({ marqueeStepPixels: Math.round(t.valueAsNumber) });
		}}><span class="step-unit">px</span></span>
      </label>` : N}
    </div>`;
	}
};
V([z({ attribute: !1 })], Pe.prototype, "value", void 0), V([z({ type: Boolean })], Pe.prototype, "defaultEnabled", void 0), Pe = V([R("mini-display-marquee-field")], Pe);
//#endregion
//#region src/types.ts
var Fe = (e = "number") => e === "weather" ? {
	type: e,
	source: "",
	weather: {
		period: "current",
		fields: [
			"icon",
			"condition",
			"temperature"
		],
		layout: "vertical"
	}
} : e === "chart" ? {
	type: e,
	source: "",
	graph: Ie()
} : e === "clock" ? {
	type: e,
	format: "24h",
	showDate: !0
} : e === "image" ? {
	type: e,
	image: "",
	imageFit: "cover",
	showTitle: !1
} : e === "text" ? {
	type: e,
	text: "Text"
} : e === "status" ? {
	type: e,
	source: "",
	onText: "On",
	offText: "Off"
} : {
	type: e,
	source: "",
	progress: "none"
}, Ie = () => ({
	type: "bar",
	points: 48,
	intervalSeconds: 300,
	aggregation: "mean",
	color: "accent",
	opacity: 50,
	labelEvery: 6,
	decimals: 1
}), Le = () => ({
	weight: 1,
	gap: "small",
	cards: [Fe("clock")]
}), Re = (e) => ({
	id: `page_${e}`,
	title: `Page ${e}`,
	durationSeconds: 10,
	enabled: !0,
	transition: { type: "none" },
	rows: [Le()]
}), ze = () => ({
	version: 1,
	defaults: {
		pageDurationSeconds: 10,
		theme: "dark"
	},
	pages: [Re(1)]
}), Be = (e, t) => {
	if (e.type === "number") {
		let n = He(e, t);
		if (Number.isFinite(n)) {
			for (let t of e.valueMappings ?? []) if ((t.minimum === void 0 || n >= t.minimum) && (t.maximum === void 0 || n <= t.maximum)) return {
				value: t.value,
				mapped: !0
			};
			return {
				value: Ue(e, n),
				mapped: !1
			};
		}
	}
	if (e.type === "text") {
		for (let n of e.valueMappings ?? []) if (n.operator === "equals" ? t === n.match : n.operator === "starts_with" ? t.startsWith(n.match) : n.operator === "ends_with" ? t.endsWith(n.match) : t.includes(n.match)) return {
			value: n.value,
			mapped: !0
		};
	}
	return {
		value: t,
		mapped: !1
	};
}, Ve = (e, t) => {
	if (e.type === "number") {
		let n = He(e, t);
		if (Number.isFinite(n)) return (e.colorMappings ?? []).find((e) => (e.minimum === void 0 || n >= e.minimum) && (e.maximum === void 0 || n <= e.maximum));
	}
	if (e.type === "text") return (e.colorMappings ?? []).find((e) => e.operator === "equals" ? t === e.match : e.operator === "starts_with" ? t.startsWith(e.match) : e.operator === "ends_with" ? t.endsWith(e.match) : t.includes(e.match));
}, He = (e, t) => {
	let n = Number(t);
	if (!Number.isFinite(n)) return NaN;
	let r = e.valueTransform;
	return r ? (n = n * (r.multiply ?? 1) + (r.add ?? 0), r.absolute && (n = Math.abs(n)), r.minimum !== void 0 && (n = Math.max(r.minimum, n)), r.maximum !== void 0 && (n = Math.min(r.maximum, n)), n) : n;
}, Ue = (e, t) => {
	let n = e.valueTransform?.precision;
	return n === void 0 ? e.valueTransform ? Number(t.toFixed(4)).toString() : String(t) : t.toFixed(n);
};
//#endregion
//#region src/free-text.ts
function We(e, t) {
	let n = e.frame ?? {
		x: 0,
		y: 0,
		width: 50,
		height: 25
	};
	if (t === "card") return n;
	let r = t === "title" ? e.titleFrame : e.valueFrame;
	if (r) return r;
	let i = Math.min(n.height, Math.max(2, n.height * .3));
	return t === "title" ? {
		...n,
		height: i
	} : e.title && e.showTitle !== !1 && n.height >= 4 ? {
		...n,
		y: n.y + i,
		height: Math.max(2, n.height - i)
	} : { ...n };
}
function Ge(e) {
	e.titleFrame ??= { ...We(e, "title") }, e.valueFrame ??= { ...We(e, "value") };
}
//#endregion
//#region node_modules/lit-html/directive-helpers.js
var { I: Ke } = Ee, qe = (e) => e.strings === void 0, Je = {}, Ye = (e, t = Je) => e._$AH = t, Xe = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, Ze = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), Qe = class {
	constructor(e) {}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AT(e, t, n) {
		this._$Ct = e, this._$AM = t, this._$Ci = n;
	}
	_$AS(e, t) {
		return this.update(e, t);
	}
	update(e, t) {
		return this.render(...t);
	}
}, $e = (e, t) => {
	let n = e._$AN;
	if (n === void 0) return !1;
	for (let e of n) e._$AO?.(t, !1), $e(e, t);
	return !0;
}, et = (e) => {
	let t, n;
	do {
		if ((t = e._$AM) === void 0) break;
		n = t._$AN, n.delete(e), e = t;
	} while (n?.size === 0);
}, tt = (e) => {
	for (let t; t = e._$AM; e = t) {
		let n = t._$AN;
		if (n === void 0) t._$AN = n = /* @__PURE__ */ new Set();
		else if (n.has(e)) break;
		n.add(e), it(t);
	}
};
function nt(e) {
	this._$AN === void 0 ? this._$AM = e : (et(this), this._$AM = e, tt(this));
}
function rt(e, t = !1, n = 0) {
	let r = this._$AH, i = this._$AN;
	if (i !== void 0 && i.size !== 0) {
		if (t) {
			if (Array.isArray(r)) for (let e = n; e < r.length; e++) $e(r[e], !1), et(r[e]);
			else r != null && ($e(r, !1), et(r));
		} else $e(this, e);
	}
}
var it = (e) => {
	e.type == Xe.CHILD && (e._$AP ??= rt, e._$AQ ??= nt);
}, at = class extends Qe {
	constructor() {
		super(...arguments), this._$AN = void 0;
	}
	_$AT(e, t, n) {
		super._$AT(e, t, n), tt(this), this.isConnected = e._$AU;
	}
	_$AO(e, t = !0) {
		e !== this.isConnected && (this.isConnected = e, e ? this.reconnected?.() : this.disconnected?.()), t && ($e(this, e), et(this));
	}
	setValue(e) {
		if (qe(this._$Ct)) this._$Ct._$AI(e, this);
		else {
			let t = [...this._$Ct._$AH];
			t[this._$Ci] = e, this._$Ct._$AI(t, this, 0);
		}
	}
	disconnected() {}
	reconnected() {}
}, ot = /* @__PURE__ */ new WeakMap(), st = Ze(class extends at {
	render(e) {
		return N;
	}
	update(e, [t]) {
		let n = t !== this.G;
		return n && this.rt(void 0), (n || this.lt !== this.ct) && (this.G = t, this.ht = e.options?.host, this.rt(this.ct = e.element)), N;
	}
	rt(e) {
		if (this.G !== void 0) {
			if (this.isConnected || (e = void 0), typeof this.G == "function") {
				let t = this.ht ?? globalThis, n = ot.get(t);
				n === void 0 && (n = /* @__PURE__ */ new WeakMap(), ot.set(t, n)), n.get(this.G) !== void 0 && this.G.call(this.ht, void 0), n.set(this.G, e), e !== void 0 && this.G.call(this.ht, e);
			} else this.G.value = e;
		}
	}
	get lt() {
		return typeof this.G == "function" ? ot.get(this.ht ?? globalThis)?.get(this.G) : this.G?.value;
	}
	disconnected() {
		this.lt === this.ct && this.rt(void 0);
	}
	reconnected() {
		this.rt(this.ct);
	}
}), ct = (e, t = !1) => (e?.marquee ?? t) && (e?.textFlow ?? "default") === "default", lt = /* @__PURE__ */ new WeakMap();
function ut(e, t, n, r = 60) {
	return st((i) => {
		if (!i) return;
		let a = Math.max(50, 1e3 / Math.max(.1, r), Math.min(1e4, t?.marqueeIntervalMs ?? 100)), o = Math.max(1, Math.min(16, Math.round(t?.marqueeStepPixels ?? 1))), s = t?.marqueeEffect === "loop", c = JSON.stringify([
			e,
			a,
			o,
			s,
			n
		]);
		if (lt.get(i)?.key === c) return;
		if (lt.get(i)?.animation?.cancel(), e <= 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) {
			lt.set(i, { key: c });
			return;
		}
		let l = [{
			x: 0,
			time: 0
		}, {
			x: 0,
			time: 1e3
		}], u = 1e3;
		for (let t = o; t < e; t += o) l.push({
			x: t,
			time: u += a
		});
		if (l.push({
			x: e,
			time: u += a
		}), !s) {
			l.push({
				x: e,
				time: u += 700
			});
			for (let t = e - o; t > 0; t -= o) l.push({
				x: t,
				time: u += a
			});
			l.push({
				x: 0,
				time: u += a
			});
		}
		let d = i.animate(l.map((e) => ({
			transform: `translateX(${-e.x}px)`,
			offset: e.time / u,
			easing: "steps(1,end)"
		})), {
			duration: u,
			iterations: Infinity
		});
		lt.set(i, {
			key: c,
			animation: d
		});
	});
}
//#endregion
//#region src/color-field.ts
var U = {
	background: "#000000",
	surface: "#1e222a",
	primary: "#ffffff",
	secondary: "#9e9e9e",
	muted: "#666666",
	accent: "#00ffff",
	success: "#00ff00",
	warning: "#ffa500",
	error: "#ff0000"
}, dt = class extends L {
	constructor(...e) {
		super(...e), this.label = "Color", this.value = "", this.disabled = !1;
	}
	static {
		this.styles = o`
    :host { display: grid; gap: 5px; color: var(--secondary-text-color); font: 12px var(--ha-font-family-body,Roboto,sans-serif); }
    .control { display: grid; grid-template-columns: minmax(0,1fr) 42px; gap: 8px; }
    select, input { width: 100%; min-height: 40px; color: var(--primary-text-color); background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 8px; }
    select { padding: 8px; font: inherit; font-size: 14px; }
    input { height: 40px; padding: 3px; cursor: pointer; }
    :host([disabled]) { opacity: .5; }
    :disabled { cursor: not-allowed; }
  `;
	}
	render() {
		let e = this.value.startsWith("#"), t = e ? "custom" : this.value || "default";
		return A`
      <span>${this.label}</span>
      <div class="control">
        <select .value=${t} ?disabled=${this.disabled} @change=${this.selectColor}>
          <option value="default">Default</option>
          <option value="background">Black</option>
          <option value="surface">Charcoal</option>
          <option value="primary">White</option>
          <option value="secondary">Light gray</option>
          <option value="muted">Gray</option>
          <option value="accent">Cyan</option>
          <option value="success">Green</option>
          <option value="warning">Orange</option>
          <option value="error">Red</option>
          <option value="custom">Custom</option>
        </select>
        <input type="color" aria-label="Custom color" .value=${e ? this.value : U[t] ?? "#ffffff"} ?disabled=${this.disabled || !e} @input=${this.customColor}>
      </div>
    `;
	}
	selectColor(e) {
		let t = e.target.value;
		this.emit(t === "default" ? "" : t === "custom" ? "#ffffff" : t);
	}
	customColor(e) {
		this.emit(e.target.value);
	}
	emit(e) {
		this.disabled || this.dispatchEvent(new CustomEvent("color-changed", {
			detail: e,
			bubbles: !0,
			composed: !0
		}));
	}
};
V([z()], dt.prototype, "label", void 0), V([z()], dt.prototype, "value", void 0), V([z({
	type: Boolean,
	reflect: !0
})], dt.prototype, "disabled", void 0), customElements.get("mini-display-color-field") || customElements.define("mini-display-color-field", dt);
//#endregion
//#region src/graph-preview.ts
var ft = class extends L {
	constructor(...e) {
		super(...e), this.source = "", this.series = [], this.width = 240, this.height = 80;
	}
	static {
		this.styles = o`:host{position:absolute;inset:2px;display:block;pointer-events:none}svg{display:block;width:100%;height:100%;overflow:hidden}`;
	}
	render() {
		let e = this.graph;
		if (!e) return N;
		let t = this.series.find((t) => t.source === (e.source || this.source) && t.points === (e.points ?? 48) && t.intervalSeconds === (e.intervalSeconds ?? 300) && t.aggregation === (e.aggregation ?? "mean"));
		if (!t) return N;
		let n = t.values.filter((e) => e !== null && Number.isFinite(e));
		if (!n.length) return N;
		let r = Math.min(...n), i = Math.max(...n);
		if ((e.scale ?? (e.type === "line" ? "fit" : "zero")) === "fit") {
			let t = Math.max((i - r) * (e.scalePadding ?? 5) / 100, .01);
			r -= t, i += t;
		} else r = Math.min(0, r), i = Math.max(0, i);
		r = e.minimum ?? r, i = e.maximum ?? i, i <= r && (i = r + .01);
		let a = Math.max(4, this.width - 4), o = Math.max(6, this.height - 4), s = e.showValues ? 6 : 0, c = (e) => s + (o - s - 1) * (1 - Math.max(0, Math.min(1, (e - r) / (i - r)))), l = U[e.color ?? "accent"] ?? e.color ?? "#00ffff", u = U[e.gridColor ?? "muted"] ?? e.gridColor ?? "#808080", d = c(0), f;
		return j`<svg viewBox="0 0 ${a} ${o}" preserveAspectRatio="none" aria-label="Recorded values">
      ${Array.from({ length: e.gridLines ?? 0 }, (t, n) => {
			let r = s + (o - s - 1) * (n + 1) / ((e.gridLines ?? 0) + 1);
			return j`<line x1="0" y1=${r} x2=${a} y2=${r} stroke=${u} stroke-width="1" opacity=${(e.gridOpacity ?? 20) / 100}/>`;
		})}
      ${t.values.map((n, r) => {
			if (n === null || !Number.isFinite(n)) return f = void 0, N;
			let i = r * a / t.points, o = (r + 1) * a / t.points, s = e.type === "line" ? r * (a - 1) / (t.points - 1) : (i + o) / 2, u = c(n), p = f;
			return f = {
				x: s,
				y: u
			}, j`${e.type === "line" ? j`
          ${p && (e.fillOpacity ?? 0) > 0 ? j`<polygon points="${p.x},${d} ${p.x},${p.y} ${s},${u} ${s},${d}" fill=${l} stroke="none" opacity=${(e.fillOpacity ?? 0) / 100}/>` : N}
          ${p ? j`<line x1=${p.x} y1=${p.y} x2=${s} y2=${u} stroke=${l} stroke-width=${e.lineWidth ?? 1} opacity=${(e.opacity ?? 50) / 100}/>` : j`<circle cx=${s} cy=${u} r=${Math.max(.6, (e.lineWidth ?? 1) / 2)} fill=${l} opacity=${(e.opacity ?? 50) / 100}/>`}
          ${e.showPoints ? j`<circle cx=${s} cy=${u} r=${e.pointSize ?? 1} fill=${l}/>` : N}
        ` : j`<rect x=${i + Math.min((e.barGap ?? 1) / 2, (o - i - 1) / 2)} y=${Math.min(u, d)} width=${Math.max(1, o - i - (e.barGap ?? 1))} height=${Math.max(1, Math.abs(d - u))} fill=${l} stroke="none" opacity=${(e.opacity ?? 50) / 100}/>`}
        ${e.showValues && r % (e.labelEvery ?? 6) === 0 ? j`<text x=${Math.max(10, Math.min(a - 10, s))} y=${Math.max(5, u - 1)} font-size="5" text-anchor="middle" fill=${l}>${n.toFixed(e.decimals ?? 1)}</text>` : N}`;
		})}
    </svg>`;
	}
};
V([z({ attribute: !1 })], ft.prototype, "graph", void 0), V([z()], ft.prototype, "source", void 0), V([z({ attribute: !1 })], ft.prototype, "series", void 0), V([z({ type: Number })], ft.prototype, "width", void 0), V([z({ type: Number })], ft.prototype, "height", void 0), ft = V([R("mini-display-graph-preview")], ft);
//#endregion
//#region src/weather-preview.ts
var pt = [
	"night",
	"cloudy",
	"fog",
	"hail",
	"lightning",
	"lightning-rainy",
	"partly-cloudy",
	"pouring",
	"rainy",
	"snowy",
	"snowy-rainy",
	"sunny",
	"windy",
	"windy-variant",
	"cloudy-alert",
	"cloudy-alert"
], mt = [
	"Clear night",
	"Cloudy",
	"Fog",
	"Hail",
	"Thunder",
	"Thunder / rain",
	"Partly cloudy",
	"Heavy rain",
	"Rain",
	"Snow",
	"Sleet",
	"Sunny",
	"Windy",
	"Wind / clouds",
	"Exceptional",
	"Unavailable"
], ht = [
	"Pogodna noc",
	"Pochmurno",
	"Mgła",
	"Grad",
	"Burza",
	"Burza / deszcz",
	"Zachmurzenie",
	"Ulewa",
	"Deszcz",
	"Śnieg",
	"Deszcz / śnieg",
	"Słonecznie",
	"Wiatr",
	"Wiatr / chmury",
	"Ekstremalnie",
	"Brak danych"
], gt = class extends L {
	constructor(...e) {
		super(...e), this.signature = "", this.generation = 0, this.pending = !1;
	}
	static {
		this.styles = o`
    :host {
      position: absolute;
      inset: 5px;
      display: flex;
      pointer-events: none;
      overflow: hidden;
    }
    .cell {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      flex-direction: column;
    }
    .cell.horizontal {
      flex-direction: row;
    }
    .lines {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 0;
      flex: 1;
      gap: 1px;
      overflow: hidden;
    }
    .line {
      font-size: 12px;
      line-height: 1.2;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .temperature {
      font-size: clamp(13px, 1.5em, 36px);
      font-weight: 600;
    }
    ha-icon {
      --mdc-icon-size: 48px;
      flex-shrink: 0;
    }
    .compact ha-icon {
      --mdc-icon-size: 24px;
    }
    .solo ha-icon {
      --mdc-icon-size: 96px;
    }
  `;
	}
	connectedCallback() {
		super.connectedCallback(), this.timer = window.setInterval(() => void this.refresh(), 6e4), this.refresh();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), window.clearInterval(this.timer), this.generation++;
	}
	updated(e) {
		e.has("signature") && (this.generation++, this.data = void 0, this.refresh());
	}
	async refresh() {
		if (!this.hass || !this.card?.source || this.pending) return;
		let e = this.generation;
		this.pending = !0;
		try {
			let t = await this.hass.callWS({
				type: "mini_display/weather",
				card: {
					source: this.card.source,
					weather: this.card.weather
				}
			});
			this.isConnected && e === this.generation && (this.data = t);
		} catch {
			e === this.generation && (this.data = void 0);
		} finally {
			this.pending = !1, this.isConnected && e !== this.generation && this.refresh();
		}
	}
	render() {
		let e = this.card?.weather ?? {}, t = e.fields ?? [
			"icon",
			"condition",
			"temperature"
		], n = e.period === "current" ? 1 : e.count ?? 1, r = e.language === "pl" ? ht : mt;
		return A`${Array.from({ length: n }, (n, i) => {
			let a = this.data?.values[this.data.weather.sources[i]], o = a?.available, s = o ? a.state.split("|") : [], c = o ? Number(s[0]) : 15, l = this.data?.weather.temperatureUnit ?? "", u = this.data?.weather.windUnit ?? "", d = (e, n) => t.includes(e) ? A`<div class="line ${e}" title=${n}>${n}</div>` : N;
			return A`<div
        class="cell ${e.layout ?? "vertical"} ${t.length === 1 && t[0] === "icon" ? "solo" : ""}"
      >
        ${t.includes("icon") ? A`<ha-icon icon=${`mdi:weather-${pt[c] ?? pt[15]}`} style=${e.iconStyle === "mono" ? "" : `color:${c === 11 ? "#ffff00" : c === 0 ? "#d3d3d3" : c === 4 || c === 5 ? "#ffa500" : "#00ffff"}`}></ha-icon>` : N}
        ${t.some((e) => e !== "icon") ? A`<div class="lines">
                ${d("label", s[6] || "--")}${d("condition", r[c] ?? r[15])}
                ${d("temperature", (s[1] || "--") + l)}${d("low", "Min " + (s[2] || "--") + l)}
                ${d("humidity", "RH " + (s[3] || "--") + "%")}${d("precipitation", (e.language === "pl" ? "Deszcz " : "Rain ") + (s[4] || "--") + "%")}
                ${d("wind", (s[5] || "--") + " " + u)}
              </div>` : N}
      </div>`;
		})}`;
	}
};
V([z({ attribute: !1 })], gt.prototype, "hass", void 0), V([z({ attribute: !1 })], gt.prototype, "card", void 0), V([z()], gt.prototype, "signature", void 0), V([B()], gt.prototype, "data", void 0), gt = V([R("mini-display-weather-preview")], gt);
//#endregion
//#region src/visibility.ts
var _t = /* @__PURE__ */ new Set(["unknown", "unavailable"]), vt = /* @__PURE__ */ new Set([
	"range",
	"number_equals",
	"number_not_equals",
	"greater_than",
	"greater_than_or_equal",
	"less_than",
	"less_than_or_equal"
]);
function yt(e, t, n) {
	let r = t.source === "card" ? n?.source ? e?.states[n.source]?.state : n?.type === "text" ? n.text : void 0 : t.entity ? e?.states[t.entity]?.state : void 0, i = r !== void 0 && !_t.has(r);
	if (t.operator === "available") return i;
	if (t.operator === "unavailable") return !i;
	if (!i) return !1;
	if (vt.has(t.operator)) {
		let e = Number(r);
		if (!Number.isFinite(e)) return !1;
		if (t.operator === "range") return (t.minimum === void 0 || e >= t.minimum) && (t.maximum === void 0 || e <= t.maximum);
		let n = t.value;
		return Number.isFinite(n) ? t.operator === "number_equals" ? e === n : t.operator === "number_not_equals" ? e !== n : t.operator === "greater_than" ? e > n : t.operator === "greater_than_or_equal" ? e >= n : t.operator === "less_than" ? e < n : e <= n : !1;
	}
	let a = t.match ?? "";
	return t.operator === "equals" ? r === a : t.operator === "not_equals" ? r !== a : t.operator === "starts_with" ? r.startsWith(a) : t.operator === "ends_with" ? r.endsWith(a) : r.includes(a);
}
function bt(e, t, n) {
	if (!t) return !0;
	let r = new Map(t.rules.map((e) => [e.id, e])), i = (t) => {
		let a = t.type === "rule" ? yt(e, r.get(t.ruleId), n) : t.operator === "and" ? t.children.every(i) : t.children.some(i);
		return t.negate ? !a : a;
	};
	return i(t.expression);
}
//#endregion
//#region src/firmware-text.ts
var xt = {
	13: /*#__PURE__*/ JSON.parse("{\"height\":17,\"ascent\":13,\"space\":4,\"smooth\":true,\"glyphs\":{\"32\":[0,0,0,0,3,0,0],\"33\":[1,0,4,11,4,0,-10],\"34\":[6,0,7,10,7,0,-10],\"35\":[14,0,10,10,8,-1,-10],\"36\":[25,0,8,13,8,0,-11],\"37\":[34,0,11,11,11,0,-10],\"38\":[46,0,9,11,8,0,-10],\"39\":[56,0,4,10,4,0,-10],\"40\":[61,0,5,13,4,0,-11],\"41\":[67,0,4,13,4,0,-11],\"42\":[72,0,7,10,7,0,-10],\"43\":[80,0,8,8,8,0,-8],\"44\":[89,0,4,5,4,0,-2],\"45\":[94,0,6,5,6,0,-5],\"46\":[101,0,4,4,4,0,-3],\"47\":[106,0,6,12,5,-1,-10],\"48\":[113,0,9,11,9,0,-10],\"49\":[123,0,5,10,5,0,-10],\"50\":[129,0,8,10,8,0,-10],\"51\":[138,0,8,11,8,0,-10],\"52\":[147,0,9,10,8,0,-10],\"53\":[157,0,8,11,8,0,-10],\"54\":[166,0,8,11,8,0,-10],\"55\":[175,0,7,10,7,0,-10],\"56\":[183,0,8,11,8,0,-10],\"57\":[192,0,8,11,8,0,-10],\"58\":[201,0,4,9,4,0,-8],\"59\":[206,0,4,11,4,0,-8],\"60\":[211,0,8,8,8,0,-8],\"61\":[220,0,8,7,8,0,-7],\"62\":[229,0,8,8,8,0,-8],\"63\":[238,0,7,11,7,0,-10],\"64\":[246,0,13,13,13,0,-10],\"65\":[260,0,10,10,9,0,-10],\"66\":[271,0,8,10,8,0,-10],\"67\":[280,0,9,11,9,0,-10],\"68\":[290,0,9,10,9,0,-10],\"69\":[300,0,8,10,8,0,-10],\"70\":[309,0,7,10,7,0,-10],\"71\":[317,0,9,11,9,0,-10],\"72\":[327,0,9,10,9,0,-10],\"73\":[337,0,3,10,3,0,-10],\"74\":[341,0,7,11,7,0,-10],\"75\":[349,0,9,10,9,0,-10],\"76\":[359,0,7,10,7,0,-10],\"77\":[367,0,11,10,11,0,-10],\"78\":[379,0,9,10,9,0,-10],\"79\":[389,0,10,11,10,0,-10],\"80\":[400,0,8,10,8,0,-10],\"81\":[409,0,10,11,10,0,-10],\"82\":[420,0,9,10,8,0,-10],\"83\":[430,0,8,11,8,0,-10],\"84\":[439,0,9,10,8,0,-10],\"85\":[449,0,9,11,9,0,-10],\"86\":[459,0,10,10,9,0,-10],\"87\":[470,0,14,10,13,0,-10],\"88\":[485,0,9,10,9,0,-10],\"89\":[495,0,9,10,9,0,-10],\"90\":[0,14,8,10,8,0,-10],\"91\":[9,14,5,13,4,0,-11],\"92\":[15,14,6,12,5,-1,-10],\"93\":[22,14,4,13,4,0,-11],\"94\":[27,14,6,10,6,0,-10],\"95\":[34,14,7,2,6,-1,0],\"96\":[42,14,6,10,6,0,-10],\"97\":[49,14,7,9,7,0,-8],\"98\":[57,14,8,11,8,0,-10],\"99\":[66,14,7,9,7,0,-8],\"100\":[74,14,8,11,8,0,-10],\"101\":[83,14,8,9,7,0,-8],\"102\":[92,14,5,10,5,0,-10],\"103\":[98,14,8,11,8,0,-8],\"104\":[107,14,8,10,8,0,-10],\"105\":[116,14,3,10,3,0,-10],\"106\":[120,14,4,13,3,-1,-10],\"107\":[125,14,8,10,7,0,-10],\"108\":[134,14,3,10,3,0,-10],\"109\":[138,14,11,8,11,0,-8],\"110\":[150,14,8,8,8,0,-8],\"111\":[159,14,8,9,8,0,-8],\"112\":[168,14,8,11,8,0,-8],\"113\":[177,14,8,11,8,0,-8],\"114\":[186,14,5,8,5,0,-8],\"115\":[192,14,7,9,7,0,-8],\"116\":[200,14,5,10,5,0,-9],\"117\":[206,14,8,9,8,0,-8],\"118\":[215,14,8,8,7,0,-8],\"119\":[224,14,11,8,11,0,-8],\"120\":[236,14,7,8,7,0,-8],\"121\":[244,14,8,11,7,0,-8],\"122\":[253,14,7,8,7,0,-8],\"123\":[261,14,6,13,6,0,-11],\"124\":[268,14,4,17,4,0,-13],\"125\":[273,14,6,13,6,0,-11],\"126\":[280,14,8,6,8,0,-6],\"160\":[289,14,0,0,3,0,0],\"161\":[290,14,4,11,4,0,-8],\"162\":[295,14,7,10,7,0,-10],\"163\":[303,14,8,10,8,0,-10],\"164\":[312,14,10,10,10,0,-9],\"165\":[323,14,9,10,7,-1,-10],\"166\":[333,14,4,12,4,0,-10],\"167\":[338,14,7,12,7,0,-10],\"168\":[346,14,7,10,7,0,-10],\"169\":[354,14,11,11,11,0,-10],\"170\":[366,14,6,10,6,0,-10],\"171\":[373,14,8,7,8,0,-7],\"172\":[382,14,7,6,7,0,-6],\"173\":[390,14,0,0,1,0,0],\"174\":[391,14,8,10,8,0,-10],\"175\":[400,14,7,10,7,0,-10],\"176\":[408,14,6,10,6,0,-10],\"177\":[415,14,8,8,8,0,-8],\"178\":[424,14,5,11,5,0,-11],\"179\":[430,14,6,11,5,0,-11],\"180\":[437,14,6,10,6,0,-10],\"181\":[444,14,8,11,8,0,-8],\"182\":[453,14,8,10,8,0,-10],\"183\":[462,14,4,6,4,0,-6],\"184\":[467,14,4,4,4,0,-1],\"185\":[472,14,4,11,4,0,-11],\"186\":[477,14,6,10,6,0,-10],\"187\":[484,14,8,7,8,0,-7],\"188\":[493,14,11,10,11,0,-10],\"189\":[0,32,12,10,11,0,-10],\"190\":[13,32,12,10,12,0,-10],\"191\":[26,32,7,11,7,0,-8],\"192\":[34,32,10,12,9,0,-12],\"193\":[45,32,10,12,9,0,-12],\"194\":[56,32,10,13,9,0,-13],\"195\":[67,32,10,12,9,0,-12],\"196\":[78,32,10,12,9,0,-12],\"197\":[89,32,10,13,9,0,-13],\"198\":[100,32,13,10,13,0,-10],\"199\":[114,32,9,13,9,0,-10],\"200\":[124,32,8,12,8,0,-12],\"201\":[133,32,8,12,8,0,-12],\"202\":[142,32,8,13,8,0,-13],\"203\":[151,32,8,12,8,0,-12],\"204\":[160,32,4,12,3,-1,-12],\"205\":[165,32,4,12,3,0,-12],\"206\":[170,32,6,13,3,-1,-13],\"207\":[177,32,5,12,3,-1,-12],\"208\":[183,32,10,10,9,-1,-10],\"209\":[194,32,9,12,9,0,-12],\"210\":[204,32,10,13,10,0,-12],\"211\":[215,32,10,13,10,0,-12],\"212\":[226,32,10,14,10,0,-13],\"213\":[237,32,10,13,10,0,-12],\"214\":[248,32,10,13,10,0,-12],\"215\":[259,32,8,8,8,0,-8],\"216\":[268,32,10,11,10,0,-10],\"217\":[279,32,9,13,9,0,-12],\"218\":[289,32,9,13,9,0,-12],\"219\":[299,32,9,14,9,0,-13],\"220\":[309,32,9,13,9,0,-12],\"221\":[319,32,9,12,9,0,-12],\"222\":[329,32,8,10,8,0,-10],\"223\":[338,32,8,10,8,0,-10],\"224\":[347,32,7,11,7,0,-10],\"225\":[355,32,7,11,7,0,-10],\"226\":[363,32,7,12,7,0,-11],\"227\":[371,32,7,11,7,0,-10],\"228\":[379,32,7,11,7,0,-10],\"229\":[387,32,7,12,7,0,-11],\"230\":[395,32,12,9,11,0,-8],\"231\":[408,32,7,11,7,0,-8],\"232\":[416,32,8,11,7,0,-10],\"233\":[425,32,8,11,7,0,-10],\"234\":[434,32,8,12,7,0,-11],\"235\":[443,32,8,11,7,0,-10],\"236\":[452,32,4,10,3,-1,-10],\"237\":[457,32,4,10,3,0,-10],\"238\":[462,32,7,11,3,-2,-11],\"239\":[470,32,5,10,3,-1,-10],\"240\":[476,32,8,11,7,0,-10],\"241\":[485,32,8,10,8,0,-10],\"242\":[494,32,8,11,8,0,-10],\"243\":[503,32,8,11,8,0,-10],\"244\":[0,47,8,12,8,0,-11],\"245\":[9,47,8,11,8,0,-10],\"246\":[18,47,8,11,8,0,-10],\"247\":[27,47,8,8,8,0,-8],\"248\":[36,47,8,9,8,0,-8],\"249\":[45,47,8,11,8,0,-10],\"250\":[54,47,8,11,8,0,-10],\"251\":[63,47,8,12,8,0,-11],\"252\":[72,47,8,11,8,0,-10],\"253\":[81,47,8,13,7,0,-10],\"254\":[90,47,8,13,8,0,-10],\"255\":[99,47,8,13,7,0,-10],\"260\":[108,47,10,13,9,0,-10],\"261\":[119,47,7,11,7,0,-8],\"262\":[127,47,9,13,9,0,-12],\"263\":[137,47,7,11,7,0,-10],\"280\":[145,47,8,13,8,0,-10],\"281\":[154,47,8,11,7,0,-8],\"321\":[163,47,9,10,7,-1,-10],\"322\":[173,47,5,10,3,-1,-10],\"323\":[179,47,9,12,9,0,-12],\"324\":[189,47,8,10,8,0,-10],\"346\":[198,47,8,13,8,0,-12],\"347\":[207,47,7,11,7,0,-10],\"377\":[215,47,8,12,8,0,-12],\"378\":[224,47,7,10,7,0,-10],\"379\":[232,47,8,12,8,0,-12],\"380\":[241,47,7,10,7,0,-10],\"8211\":[249,47,7,5,6,0,-5],\"8212\":[257,47,13,5,13,0,-5],\"8226\":[271,47,5,6,5,0,-6],\"8230\":[277,47,10,4,10,0,-3],\"8364\":[288,47,9,11,8,0,-10],\"8592\":[298,47,12,10,12,0,-9],\"8593\":[311,47,12,10,12,0,-10],\"8594\":[324,47,12,10,12,0,-9],\"8595\":[337,47,12,11,12,0,-10],\"10003\":[350,47,11,8,11,0,-8],\"10005\":[362,47,7,17,6,0,-13]},\"atlas\":\"data:image/png;base64,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\"}"),
	18: /*#__PURE__*/ JSON.parse("{\"height\":23,\"ascent\":18,\"space\":5,\"smooth\":true,\"glyphs\":{\"32\":[0,0,0,0,4,0,0],\"33\":[1,0,6,15,6,0,-14],\"34\":[8,0,9,14,9,0,-14],\"35\":[18,0,13,14,11,-1,-14],\"36\":[32,0,11,17,11,0,-15],\"37\":[44,0,15,15,15,0,-14],\"38\":[60,0,12,15,12,0,-14],\"39\":[73,0,6,14,6,0,-14],\"40\":[80,0,6,17,6,0,-14],\"41\":[87,0,6,17,6,0,-14],\"42\":[94,0,10,14,10,0,-14],\"43\":[105,0,12,10,12,0,-10],\"44\":[118,0,6,7,6,0,-3],\"45\":[125,0,8,7,8,0,-7],\"46\":[134,0,5,4,5,0,-3],\"47\":[140,0,8,16,6,-1,-14],\"48\":[149,0,12,15,12,0,-14],\"49\":[162,0,7,14,7,0,-14],\"50\":[170,0,11,14,11,0,-14],\"51\":[182,0,11,15,11,0,-14],\"52\":[194,0,12,14,12,0,-14],\"53\":[207,0,11,15,11,0,-14],\"54\":[219,0,11,15,11,0,-14],\"55\":[231,0,10,14,10,0,-14],\"56\":[242,0,11,15,11,0,-14],\"57\":[254,0,11,15,11,0,-14],\"58\":[266,0,5,10,5,0,-9],\"59\":[272,0,6,13,6,0,-9],\"60\":[279,0,12,11,12,0,-11],\"61\":[292,0,12,9,12,0,-9],\"62\":[305,0,12,11,12,0,-11],\"63\":[318,0,10,15,10,0,-14],\"64\":[329,0,18,18,18,0,-14],\"65\":[348,0,13,14,13,0,-14],\"66\":[362,0,11,14,11,0,-14],\"67\":[374,0,13,15,13,0,-14],\"68\":[388,0,13,14,12,0,-14],\"69\":[402,0,10,14,10,0,-14],\"70\":[413,0,10,14,10,0,-14],\"71\":[424,0,13,15,13,0,-14],\"72\":[438,0,13,14,13,0,-14],\"73\":[452,0,4,14,4,0,-14],\"74\":[457,0,10,15,10,0,-14],\"75\":[468,0,12,14,12,0,-14],\"76\":[481,0,10,14,10,0,-14],\"77\":[492,0,16,14,16,0,-14],\"78\":[0,19,13,14,13,0,-14],\"79\":[14,19,13,15,13,0,-14],\"80\":[28,19,11,14,11,0,-14],\"81\":[40,19,14,16,14,0,-14],\"82\":[55,19,12,14,11,0,-14],\"83\":[68,19,11,15,11,0,-14],\"84\":[80,19,12,14,11,0,-14],\"85\":[93,19,13,15,13,0,-14],\"86\":[107,19,13,14,13,0,-14],\"87\":[121,19,19,14,18,0,-14],\"88\":[141,19,13,14,12,0,-14],\"89\":[155,19,13,14,12,0,-14],\"90\":[169,19,11,14,11,0,-14],\"91\":[181,19,6,17,6,0,-14],\"92\":[188,19,8,16,6,-1,-14],\"93\":[197,19,6,17,6,0,-14],\"94\":[204,19,8,13,8,0,-13],\"95\":[213,19,10,3,8,-1,0],\"96\":[224,19,8,14,8,0,-14],\"97\":[233,19,10,11,10,0,-10],\"98\":[244,19,11,15,11,0,-14],\"99\":[256,19,10,11,10,0,-10],\"100\":[267,19,11,15,11,0,-14],\"101\":[279,19,10,11,10,0,-10],\"102\":[290,19,7,14,6,0,-14],\"103\":[298,19,11,14,11,0,-10],\"104\":[310,19,11,14,11,0,-14],\"105\":[322,19,4,14,4,0,-14],\"106\":[327,19,5,18,4,-1,-14],\"107\":[333,19,11,14,10,0,-14],\"108\":[345,19,4,14,4,0,-14],\"109\":[350,19,16,10,16,0,-10],\"110\":[367,19,11,10,11,0,-10],\"111\":[379,19,11,11,10,0,-10],\"112\":[391,19,11,14,11,0,-10],\"113\":[403,19,11,14,11,0,-10],\"114\":[415,19,7,10,7,0,-10],\"115\":[423,19,10,11,10,0,-10],\"116\":[434,19,7,14,6,0,-13],\"117\":[442,19,11,11,11,0,-10],\"118\":[454,19,10,10,10,0,-10],\"119\":[465,19,15,10,15,0,-10],\"120\":[481,19,10,10,10,0,-10],\"121\":[492,19,10,14,10,0,-10],\"122\":[0,38,10,10,10,0,-10],\"123\":[11,38,8,17,8,0,-14],\"124\":[20,38,6,23,6,0,-18],\"125\":[27,38,8,17,8,0,-14],\"126\":[36,38,12,8,12,0,-8],\"160\":[49,38,0,0,4,0,0],\"161\":[50,38,6,14,6,0,-10],\"162\":[57,38,10,14,10,0,-14],\"163\":[68,38,12,14,12,0,-14],\"164\":[81,38,13,13,13,0,-12],\"165\":[95,38,11,14,10,-1,-14],\"166\":[107,38,6,17,6,0,-14],\"167\":[114,38,10,17,10,0,-14],\"168\":[125,38,9,14,9,0,-14],\"169\":[135,38,16,15,16,0,-14],\"170\":[152,38,8,13,8,0,-13],\"171\":[161,38,11,10,11,0,-10],\"172\":[173,38,10,8,10,0,-8],\"173\":[184,38,0,0,1,0,0],\"174\":[185,38,11,14,11,0,-14],\"175\":[197,38,10,14,10,0,-14],\"176\":[208,38,8,14,8,0,-14],\"177\":[217,38,12,11,12,0,-11],\"178\":[230,38,7,15,7,0,-15],\"179\":[238,38,8,15,7,0,-15],\"180\":[247,38,8,14,8,0,-14],\"181\":[256,38,11,14,11,0,-10],\"182\":[268,38,10,14,10,0,-14],\"183\":[279,38,5,7,5,0,-7],\"184\":[285,38,6,6,6,0,-1],\"185\":[292,38,5,15,5,0,-15],\"186\":[298,38,8,13,8,0,-13],\"187\":[307,38,11,10,11,0,-10],\"188\":[319,38,16,14,15,0,-14],\"189\":[336,38,16,14,16,0,-14],\"190\":[353,38,17,14,17,0,-14],\"191\":[371,38,10,14,10,0,-10],\"192\":[382,38,13,17,13,0,-17],\"193\":[396,38,13,17,13,0,-17],\"194\":[410,38,13,18,13,0,-18],\"195\":[424,38,13,17,13,0,-17],\"196\":[438,38,13,17,13,0,-17],\"197\":[452,38,13,18,13,0,-18],\"198\":[466,38,18,14,18,0,-14],\"199\":[485,38,13,19,13,0,-14],\"200\":[499,38,10,17,10,0,-17],\"201\":[0,62,10,17,10,0,-17],\"202\":[11,62,10,18,10,0,-18],\"203\":[22,62,10,17,10,0,-17],\"204\":[33,62,5,17,4,-1,-17],\"205\":[39,62,5,17,4,0,-17],\"206\":[45,62,8,18,4,-2,-18],\"207\":[54,62,8,17,4,-2,-17],\"208\":[63,62,14,14,12,-1,-14],\"209\":[78,62,13,17,13,0,-17],\"210\":[92,62,13,18,13,0,-17],\"211\":[106,62,13,18,13,0,-17],\"212\":[120,62,13,19,13,0,-18],\"213\":[134,62,13,18,13,0,-17],\"214\":[148,62,13,18,13,0,-17],\"215\":[162,62,12,10,12,0,-10],\"216\":[175,62,13,15,13,0,-14],\"217\":[189,62,13,18,13,0,-17],\"218\":[203,62,13,18,13,0,-17],\"219\":[217,62,13,19,13,0,-18],\"220\":[231,62,13,18,13,0,-17],\"221\":[245,62,13,17,12,0,-17],\"222\":[259,62,11,14,11,0,-14],\"223\":[271,62,11,14,11,0,-14],\"224\":[283,62,10,15,10,0,-14],\"225\":[294,62,10,15,10,0,-14],\"226\":[305,62,10,15,10,0,-14],\"227\":[316,62,10,15,10,0,-14],\"228\":[327,62,10,15,10,0,-14],\"229\":[338,62,10,17,10,0,-16],\"230\":[349,62,16,11,16,0,-10],\"231\":[366,62,10,15,10,0,-10],\"232\":[377,62,10,15,10,0,-14],\"233\":[388,62,10,15,10,0,-14],\"234\":[399,62,10,15,10,0,-14],\"235\":[410,62,10,15,10,0,-14],\"236\":[421,62,5,14,4,-1,-14],\"237\":[427,62,5,14,4,0,-14],\"238\":[433,62,8,14,4,-2,-14],\"239\":[442,62,8,14,4,-2,-14],\"240\":[451,62,10,15,10,0,-14],\"241\":[462,62,11,14,11,0,-14],\"242\":[474,62,11,15,10,0,-14],\"243\":[486,62,11,15,10,0,-14],\"244\":[498,62,11,15,10,0,-14],\"245\":[0,82,11,15,10,0,-14],\"246\":[12,82,11,15,10,0,-14],\"247\":[24,82,12,11,12,0,-11],\"248\":[37,82,11,12,10,0,-11],\"249\":[49,82,11,15,11,0,-14],\"250\":[61,82,11,15,11,0,-14],\"251\":[73,82,11,15,11,0,-14],\"252\":[85,82,11,15,11,0,-14],\"253\":[97,82,10,18,10,0,-14],\"254\":[108,82,11,18,11,0,-14],\"255\":[120,82,10,18,10,0,-14],\"260\":[131,82,13,18,13,0,-14],\"261\":[145,82,10,14,10,0,-10],\"262\":[156,82,13,18,13,0,-17],\"263\":[170,82,10,15,10,0,-14],\"280\":[181,82,10,18,10,0,-14],\"281\":[192,82,10,14,10,0,-10],\"321\":[203,82,11,14,10,-1,-14],\"322\":[215,82,6,14,4,-1,-14],\"323\":[222,82,13,17,13,0,-17],\"324\":[236,82,11,14,11,0,-14],\"346\":[248,82,11,18,11,0,-17],\"347\":[260,82,10,15,10,0,-14],\"377\":[271,82,11,17,11,0,-17],\"378\":[283,82,10,14,10,0,-14],\"379\":[294,82,11,17,11,0,-17],\"380\":[306,82,10,14,10,0,-14],\"8211\":[317,82,9,7,9,0,-7],\"8212\":[327,82,18,7,18,0,-7],\"8226\":[346,82,7,9,7,0,-9],\"8230\":[354,82,14,4,14,0,-3],\"8364\":[369,82,12,15,12,0,-14],\"8592\":[382,82,17,14,17,0,-13],\"8593\":[400,82,17,14,17,0,-14],\"8594\":[418,82,17,14,17,0,-13],\"8595\":[436,82,17,15,17,0,-14],\"10003\":[454,82,15,11,15,0,-11],\"10005\":[470,82,9,23,9,0,-18]},\"atlas\":\"data:image/png;base64,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\"}"),
	24: /*#__PURE__*/ JSON.parse("{\"height\":30,\"ascent\":24,\"space\":7,\"smooth\":true,\"glyphs\":{\"32\":[0,0,0,0,5,0,0],\"33\":[1,0,8,19,8,0,-18],\"34\":[10,0,13,18,13,0,-18],\"35\":[24,0,16,18,15,-1,-18],\"36\":[41,0,15,23,15,0,-20],\"37\":[57,0,20,20,20,0,-19],\"38\":[78,0,16,19,15,0,-18],\"39\":[95,0,7,18,7,0,-18],\"40\":[103,0,8,23,8,0,-19],\"41\":[112,0,8,23,8,0,-19],\"42\":[121,0,13,18,13,0,-18],\"43\":[135,0,16,14,16,0,-14],\"44\":[152,0,8,8,8,0,-3],\"45\":[161,0,10,9,10,0,-9],\"46\":[172,0,7,5,7,0,-4],\"47\":[180,0,10,22,9,-1,-19],\"48\":[191,0,16,19,16,0,-18],\"49\":[208,0,10,18,10,0,-18],\"50\":[219,0,14,18,14,0,-18],\"51\":[234,0,15,19,15,0,-18],\"52\":[250,0,15,18,15,0,-18],\"53\":[266,0,15,19,15,0,-18],\"54\":[282,0,15,19,15,0,-18],\"55\":[298,0,13,18,13,0,-18],\"56\":[312,0,15,19,15,0,-18],\"57\":[328,0,15,19,15,0,-18],\"58\":[344,0,7,14,7,0,-13],\"59\":[352,0,8,18,8,0,-13],\"60\":[361,0,16,14,16,0,-14],\"61\":[378,0,16,12,16,0,-12],\"62\":[395,0,16,14,16,0,-14],\"63\":[412,0,13,19,13,0,-18],\"64\":[426,0,24,24,24,0,-18],\"65\":[451,0,17,18,17,0,-18],\"66\":[469,0,15,18,15,0,-18],\"67\":[485,0,17,19,17,0,-18],\"68\":[0,25,17,18,17,0,-18],\"69\":[18,25,14,18,14,0,-18],\"70\":[33,25,13,18,13,0,-18],\"71\":[47,25,17,19,17,0,-18],\"72\":[65,25,17,18,17,0,-18],\"73\":[83,25,6,18,6,0,-18],\"74\":[90,25,13,19,13,0,-18],\"75\":[104,25,16,18,16,0,-18],\"76\":[121,25,13,18,13,0,-18],\"77\":[135,25,21,18,21,0,-18],\"78\":[157,25,17,18,17,0,-18],\"79\":[175,25,18,19,18,0,-18],\"80\":[194,25,15,18,15,0,-18],\"81\":[210,25,18,20,18,0,-18],\"82\":[229,25,15,18,15,0,-18],\"83\":[245,25,15,19,15,0,-18],\"84\":[261,25,15,18,15,0,-18],\"85\":[277,25,17,19,17,0,-18],\"86\":[295,25,17,18,17,0,-18],\"87\":[313,25,25,18,24,0,-18],\"88\":[339,25,17,18,16,0,-18],\"89\":[357,25,17,18,17,0,-18],\"90\":[375,25,15,18,15,0,-18],\"91\":[391,25,8,23,8,0,-19],\"92\":[400,25,10,22,9,-1,-19],\"93\":[411,25,8,23,8,0,-19],\"94\":[420,25,11,18,11,0,-18],\"95\":[432,25,13,3,11,-1,0],\"96\":[446,25,10,19,10,0,-19],\"97\":[457,25,13,15,13,0,-14],\"98\":[471,25,14,19,14,0,-18],\"99\":[486,25,13,15,13,0,-14],\"100\":[0,49,14,19,14,0,-18],\"101\":[15,49,14,15,14,0,-14],\"102\":[30,49,9,19,9,0,-19],\"103\":[40,49,14,20,14,0,-14],\"104\":[55,49,14,18,14,0,-18],\"105\":[70,49,6,19,6,0,-19],\"106\":[77,49,8,24,6,-2,-19],\"107\":[86,49,14,18,13,0,-18],\"108\":[101,49,6,18,6,0,-18],\"109\":[108,49,21,14,21,0,-14],\"110\":[130,49,14,14,14,0,-14],\"111\":[145,49,14,15,14,0,-14],\"112\":[160,49,14,19,14,0,-14],\"113\":[175,49,14,19,14,0,-14],\"114\":[190,49,9,14,9,0,-14],\"115\":[200,49,13,15,13,0,-14],\"116\":[214,49,9,18,9,0,-17],\"117\":[224,49,14,15,14,0,-14],\"118\":[239,49,14,14,13,0,-14],\"119\":[254,49,20,14,20,0,-14],\"120\":[275,49,13,14,13,0,-14],\"121\":[289,49,14,19,13,0,-14],\"122\":[304,49,13,14,13,0,-14],\"123\":[318,49,11,23,11,0,-19],\"124\":[330,49,8,30,8,0,-24],\"125\":[339,49,11,23,11,0,-19],\"126\":[351,49,16,10,16,0,-10],\"160\":[368,49,0,0,5,0,0],\"161\":[369,49,7,19,7,0,-14],\"162\":[377,49,13,18,13,0,-18],\"163\":[391,49,15,18,15,0,-18],\"164\":[407,49,18,16,18,0,-15],\"165\":[426,49,15,18,13,-1,-18],\"166\":[442,49,7,22,7,0,-18],\"167\":[450,49,13,22,13,0,-18],\"168\":[464,49,12,19,12,0,-19],\"169\":[477,49,21,19,21,0,-18],\"170\":[499,49,11,18,11,0,-18],\"171\":[0,80,15,13,15,0,-13],\"172\":[16,80,13,10,13,0,-10],\"173\":[30,80,0,0,1,0,0],\"174\":[31,80,15,18,15,0,-18],\"175\":[47,80,13,18,13,0,-18],\"176\":[61,80,10,18,10,0,-18],\"177\":[72,80,16,14,16,0,-14],\"178\":[89,80,9,20,9,0,-20],\"179\":[99,80,10,20,10,0,-20],\"180\":[110,80,10,19,10,0,-19],\"181\":[121,80,15,19,15,0,-14],\"182\":[137,80,14,18,14,0,-18],\"183\":[152,80,7,10,7,0,-10],\"184\":[160,80,8,7,8,0,-1],\"185\":[169,80,7,20,7,0,-20],\"186\":[177,80,11,18,11,0,-18],\"187\":[189,80,15,13,15,0,-13],\"188\":[205,80,21,18,20,0,-18],\"189\":[227,80,21,18,21,0,-18],\"190\":[249,80,23,18,22,0,-18],\"191\":[273,80,13,19,13,0,-14],\"192\":[287,80,17,23,17,0,-23],\"193\":[305,80,17,23,17,0,-23],\"194\":[323,80,17,23,17,0,-23],\"195\":[341,80,17,22,17,0,-22],\"196\":[359,80,17,23,17,0,-23],\"197\":[377,80,17,24,17,0,-24],\"198\":[395,80,24,18,24,0,-18],\"199\":[420,80,17,24,17,0,-18],\"200\":[438,80,14,23,14,0,-23],\"201\":[453,80,14,23,14,0,-23],\"202\":[468,80,14,23,14,0,-23],\"203\":[483,80,14,23,14,0,-23],\"204\":[498,80,7,23,6,-1,-23],\"205\":[0,105,7,23,6,0,-23],\"206\":[8,105,10,23,6,-2,-23],\"207\":[19,105,10,23,6,-2,-23],\"208\":[30,105,19,18,17,-2,-18],\"209\":[50,105,17,22,17,0,-22],\"210\":[68,105,18,24,18,0,-23],\"211\":[87,105,18,24,18,0,-23],\"212\":[106,105,18,24,18,0,-23],\"213\":[125,105,18,23,18,0,-22],\"214\":[144,105,18,24,18,0,-23],\"215\":[163,105,16,14,16,0,-14],\"216\":[180,105,18,20,18,0,-19],\"217\":[199,105,17,24,17,0,-23],\"218\":[217,105,17,24,17,0,-23],\"219\":[235,105,17,24,17,0,-23],\"220\":[253,105,17,24,17,0,-23],\"221\":[271,105,17,23,17,0,-23],\"222\":[289,105,15,18,15,0,-18],\"223\":[305,105,15,18,15,0,-18],\"224\":[321,105,13,20,13,0,-19],\"225\":[335,105,13,20,13,0,-19],\"226\":[349,105,13,20,13,0,-19],\"227\":[363,105,13,19,13,0,-18],\"228\":[377,105,13,20,13,0,-19],\"229\":[391,105,13,22,13,0,-21],\"230\":[405,105,21,15,21,0,-14],\"231\":[427,105,13,20,13,0,-14],\"232\":[441,105,14,20,14,0,-19],\"233\":[456,105,14,20,14,0,-19],\"234\":[471,105,14,20,14,0,-19],\"235\":[486,105,14,20,14,0,-19],\"236\":[501,105,7,19,6,-1,-19],\"237\":[0,130,7,19,6,0,-19],\"238\":[8,130,10,19,6,-2,-19],\"239\":[19,130,10,19,6,-2,-19],\"240\":[30,130,14,20,14,0,-19],\"241\":[45,130,14,18,14,0,-18],\"242\":[60,130,14,20,14,0,-19],\"243\":[75,130,14,20,14,0,-19],\"244\":[90,130,14,20,14,0,-19],\"245\":[105,130,14,19,14,0,-18],\"246\":[120,130,14,20,14,0,-19],\"247\":[135,130,16,14,16,0,-14],\"248\":[152,130,14,15,14,0,-14],\"249\":[167,130,14,20,14,0,-19],\"250\":[182,130,14,20,14,0,-19],\"251\":[197,130,14,20,14,0,-19],\"252\":[212,130,14,20,14,0,-19],\"253\":[227,130,14,24,13,0,-19],\"254\":[242,130,14,23,14,0,-18],\"255\":[257,130,14,24,13,0,-19],\"260\":[272,130,18,23,17,0,-18],\"261\":[291,130,13,19,13,0,-14],\"262\":[305,130,17,24,17,0,-23],\"263\":[323,130,13,20,13,0,-19],\"280\":[337,130,14,23,14,0,-18],\"281\":[352,130,14,19,14,0,-14],\"321\":[367,130,15,18,13,-1,-18],\"322\":[383,130,8,18,6,-1,-18],\"323\":[392,130,17,23,17,0,-23],\"324\":[410,130,14,19,14,0,-19],\"346\":[425,130,15,24,15,0,-23],\"347\":[441,130,13,20,13,0,-19],\"377\":[455,130,15,23,15,0,-23],\"378\":[471,130,13,19,13,0,-19],\"379\":[485,130,15,23,15,0,-23],\"380\":[0,155,13,19,13,0,-19],\"8211\":[14,155,12,9,12,0,-9],\"8212\":[27,155,24,9,24,0,-9],\"8226\":[52,155,10,11,10,0,-11],\"8230\":[63,155,18,5,18,0,-4],\"8364\":[82,155,16,19,16,0,-18],\"8592\":[99,155,22,18,22,0,-17],\"8593\":[122,155,22,18,22,0,-18],\"8594\":[145,155,22,18,22,0,-17],\"8595\":[168,155,22,19,22,0,-18],\"10003\":[191,155,20,15,20,0,-15],\"10005\":[212,155,12,30,12,0,-24]},\"atlas\":\"data:image/png;base64,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\"}"),
	36: /*#__PURE__*/ JSON.parse("{\"height\":44,\"ascent\":36,\"space\":7,\"smooth\":false,\"glyphs\":{\"32\":[0,0,7,0,7,0,0],\"33\":[8,0,11,28,11,0,-27],\"34\":[20,0,19,27,19,0,-27],\"35\":[40,0,24,27,22,-1,-27],\"36\":[65,0,22,34,22,0,-30],\"37\":[88,0,30,29,30,0,-28],\"38\":[119,0,24,28,23,0,-27],\"39\":[144,0,11,27,11,0,-27],\"40\":[156,0,12,33,12,0,-28],\"41\":[169,0,12,33,12,0,-28],\"42\":[182,0,19,27,19,0,-27],\"43\":[202,0,23,20,23,0,-20],\"44\":[226,0,12,12,12,0,-5],\"45\":[239,0,16,13,16,0,-13],\"46\":[256,0,11,7,11,0,-6],\"47\":[268,0,14,32,13,-1,-28],\"48\":[283,0,24,28,24,0,-27],\"49\":[308,0,14,27,14,0,-27],\"50\":[323,0,22,27,22,0,-27],\"51\":[346,0,23,28,23,0,-27],\"52\":[370,0,23,27,23,0,-27],\"53\":[394,0,22,28,22,0,-27],\"54\":[417,0,23,28,23,0,-27],\"55\":[441,0,20,27,20,0,-27],\"56\":[462,0,23,28,23,0,-27],\"57\":[486,0,23,28,23,0,-27],\"58\":[0,35,11,20,11,0,-19],\"59\":[12,35,11,26,11,0,-19],\"60\":[24,35,23,21,23,0,-21],\"61\":[48,35,23,17,23,0,-17],\"62\":[72,35,23,21,23,0,-21],\"63\":[96,35,19,28,19,0,-27],\"64\":[116,35,36,35,36,0,-27],\"65\":[153,35,26,27,26,0,-27],\"66\":[180,35,23,27,23,0,-27],\"67\":[204,35,26,28,26,0,-27],\"68\":[231,35,25,27,25,0,-27],\"69\":[257,35,21,27,21,0,-27],\"70\":[279,35,20,27,20,0,-27],\"71\":[300,35,26,28,26,0,-27],\"72\":[327,35,26,27,26,0,-27],\"73\":[354,35,9,27,9,0,-27],\"74\":[364,35,19,28,19,0,-27],\"75\":[384,35,24,27,24,0,-27],\"76\":[409,35,19,27,19,0,-27],\"77\":[429,35,32,27,32,0,-27],\"78\":[462,35,25,27,25,0,-27],\"79\":[0,71,27,28,27,0,-27],\"80\":[28,71,22,27,22,0,-27],\"81\":[51,71,27,30,27,0,-27],\"82\":[79,71,23,27,22,0,-27],\"83\":[103,71,22,28,22,0,-27],\"84\":[126,71,23,27,23,0,-27],\"85\":[150,71,25,28,25,0,-27],\"86\":[176,71,26,27,26,0,-27],\"87\":[203,71,37,27,36,0,-27],\"88\":[241,71,25,27,25,0,-27],\"89\":[267,71,25,27,25,0,-27],\"90\":[293,71,23,27,23,0,-27],\"91\":[317,71,12,33,12,0,-28],\"92\":[330,71,14,32,13,-1,-28],\"93\":[345,71,12,33,12,0,-28],\"94\":[358,71,16,26,16,0,-26],\"95\":[375,71,18,5,16,-1,0],\"96\":[394,71,16,28,16,0,-28],\"97\":[411,71,20,21,20,0,-20],\"98\":[432,71,22,28,22,0,-27],\"99\":[455,71,20,21,20,0,-20],\"100\":[476,71,22,28,22,0,-27],\"101\":[0,105,20,21,20,0,-20],\"102\":[21,105,14,28,13,0,-28],\"103\":[36,105,22,28,22,0,-20],\"104\":[59,105,21,27,21,0,-27],\"105\":[81,105,9,28,9,0,-28],\"106\":[91,105,11,36,9,-2,-28],\"107\":[103,105,21,27,20,0,-27],\"108\":[125,105,9,27,9,0,-27],\"109\":[135,105,32,20,32,0,-20],\"110\":[168,105,21,20,21,0,-20],\"111\":[190,105,21,21,21,0,-20],\"112\":[212,105,22,28,22,0,-20],\"113\":[235,105,22,28,22,0,-20],\"114\":[258,105,14,20,14,0,-20],\"115\":[273,105,19,21,19,0,-20],\"116\":[293,105,13,26,13,0,-25],\"117\":[307,105,21,21,21,0,-20],\"118\":[329,105,20,20,20,0,-20],\"119\":[350,105,30,20,29,0,-20],\"120\":[381,105,20,20,19,0,-20],\"121\":[402,105,20,28,20,0,-20],\"122\":[423,105,19,20,19,0,-20],\"123\":[443,105,16,33,16,0,-28],\"124\":[460,105,12,44,12,0,-35],\"125\":[473,105,16,33,16,0,-28],\"126\":[0,150,23,15,23,0,-15],\"127\":[24,150,18,44,18,0,-35],\"128\":[43,150,18,44,18,0,-35],\"129\":[62,150,18,44,18,0,-35],\"130\":[81,150,18,44,18,0,-35],\"131\":[100,150,18,44,18,0,-35],\"132\":[119,150,18,44,18,0,-35],\"133\":[138,150,18,44,18,0,-35],\"134\":[157,150,18,44,18,0,-35],\"135\":[176,150,18,44,18,0,-35],\"136\":[195,150,18,44,18,0,-35],\"137\":[214,150,18,44,18,0,-35],\"138\":[233,150,18,44,18,0,-35],\"139\":[252,150,18,44,18,0,-35],\"140\":[271,150,18,44,18,0,-35],\"141\":[290,150,18,44,18,0,-35],\"142\":[309,150,18,44,18,0,-35],\"143\":[328,150,18,44,18,0,-35],\"144\":[347,150,18,44,18,0,-35],\"145\":[366,150,18,44,18,0,-35],\"146\":[385,150,18,44,18,0,-35],\"147\":[404,150,18,44,18,0,-35],\"148\":[423,150,18,44,18,0,-35],\"149\":[442,150,18,44,18,0,-35],\"150\":[461,150,18,44,18,0,-35],\"151\":[480,150,18,44,18,0,-35],\"152\":[0,195,18,44,18,0,-35],\"153\":[19,195,18,44,18,0,-35],\"154\":[38,195,18,44,18,0,-35],\"155\":[57,195,18,44,18,0,-35],\"156\":[76,195,18,44,18,0,-35],\"157\":[95,195,18,44,18,0,-35],\"158\":[114,195,18,44,18,0,-35],\"159\":[133,195,18,44,18,0,-35],\"160\":[152,195,7,0,7,0,0],\"161\":[160,195,11,27,11,0,-20],\"162\":[172,195,20,27,20,0,-27],\"163\":[193,195,23,27,23,0,-27],\"164\":[217,195,26,24,26,0,-23],\"165\":[244,195,21,27,19,-1,-27],\"166\":[266,195,11,32,11,0,-27],\"167\":[278,195,20,33,20,0,-27],\"168\":[299,195,18,28,18,0,-28],\"169\":[318,195,32,28,32,0,-27],\"170\":[351,195,16,26,16,0,-26],\"171\":[368,195,22,19,22,0,-19],\"172\":[391,195,20,15,20,0,-15],\"173\":[412,195,0,0,1,0,0],\"174\":[413,195,23,27,23,0,-27],\"175\":[437,195,19,27,19,0,-27],\"176\":[457,195,15,27,15,0,-27],\"177\":[473,195,23,21,23,0,-21],\"178\":[497,195,14,29,14,0,-29],\"179\":[0,240,15,29,15,0,-29],\"180\":[16,240,16,28,16,0,-28],\"181\":[33,240,23,28,23,0,-20],\"182\":[57,240,21,27,21,0,-27],\"183\":[79,240,11,15,11,0,-15],\"184\":[91,240,12,10,12,0,-1],\"185\":[104,240,10,29,10,0,-29],\"186\":[115,240,16,26,16,0,-26],\"187\":[132,240,22,19,22,0,-19],\"188\":[155,240,31,27,30,0,-27],\"189\":[187,240,32,27,32,0,-27],\"190\":[220,240,34,27,34,0,-27],\"191\":[255,240,19,28,19,0,-20],\"192\":[275,240,26,35,26,0,-35],\"193\":[302,240,26,35,26,0,-35],\"194\":[329,240,26,35,26,0,-35],\"195\":[356,240,26,34,26,0,-34],\"196\":[383,240,26,35,26,0,-35],\"197\":[410,240,26,36,26,0,-36],\"198\":[437,240,36,27,36,0,-27],\"199\":[474,240,26,36,26,0,-27],\"200\":[0,277,21,35,21,0,-35],\"201\":[22,277,21,35,21,0,-35],\"202\":[44,277,21,35,21,0,-35],\"203\":[66,277,21,35,21,0,-35],\"204\":[88,277,10,35,9,-1,-35],\"205\":[99,277,10,35,9,0,-35],\"206\":[110,277,15,35,9,-3,-35],\"207\":[126,277,15,35,9,-3,-35],\"208\":[142,277,27,27,25,-2,-27],\"209\":[170,277,25,34,25,0,-34],\"210\":[196,277,27,36,27,0,-35],\"211\":[224,277,27,36,27,0,-35],\"212\":[252,277,27,36,27,0,-35],\"213\":[280,277,27,35,27,0,-34],\"214\":[308,277,27,36,27,0,-35],\"215\":[336,277,23,20,23,0,-20],\"216\":[360,277,27,30,27,0,-28],\"217\":[388,277,25,36,25,0,-35],\"218\":[414,277,25,36,25,0,-35],\"219\":[440,277,25,36,25,0,-35],\"220\":[466,277,25,36,25,0,-35],\"221\":[0,314,25,35,25,0,-35],\"222\":[26,314,23,27,23,0,-27],\"223\":[50,314,23,27,23,0,-27],\"224\":[74,314,20,29,20,0,-28],\"225\":[95,314,20,29,20,0,-28],\"226\":[116,314,20,29,20,0,-28],\"227\":[137,314,20,28,20,0,-27],\"228\":[158,314,20,29,20,0,-28],\"229\":[179,314,20,32,20,0,-31],\"230\":[200,314,32,21,32,0,-20],\"231\":[233,314,20,29,20,0,-20],\"232\":[254,314,20,29,20,0,-28],\"233\":[275,314,20,29,20,0,-28],\"234\":[296,314,20,29,20,0,-28],\"235\":[317,314,20,29,20,0,-28],\"236\":[338,314,11,28,9,-2,-28],\"237\":[350,314,10,28,9,0,-28],\"238\":[361,314,15,28,9,-3,-28],\"239\":[377,314,14,28,9,-3,-28],\"240\":[392,314,20,29,20,0,-28],\"241\":[413,314,21,27,21,0,-27],\"242\":[435,314,21,29,21,0,-28],\"243\":[457,314,21,29,21,0,-28],\"244\":[479,314,21,29,21,0,-28],\"245\":[0,350,21,28,21,0,-27],\"246\":[22,350,21,29,21,0,-28],\"247\":[44,350,23,21,23,0,-21],\"248\":[68,350,21,23,21,0,-21],\"249\":[90,350,21,29,21,0,-28],\"250\":[112,350,21,29,21,0,-28],\"251\":[134,350,21,29,21,0,-28],\"252\":[156,350,21,29,21,0,-28],\"253\":[178,350,20,36,20,0,-28],\"254\":[199,350,22,35,22,0,-27],\"255\":[222,350,20,36,20,0,-28],\"256\":[243,350,26,34,26,0,-34],\"257\":[270,350,20,28,20,0,-27],\"258\":[291,350,26,35,26,0,-35],\"259\":[318,350,20,29,20,0,-28],\"260\":[339,350,26,35,26,0,-27],\"261\":[366,350,20,28,20,0,-20],\"262\":[387,350,26,36,26,0,-35],\"263\":[414,350,20,29,20,0,-28],\"264\":[435,350,26,36,26,0,-35],\"265\":[462,350,20,29,20,0,-28],\"266\":[483,350,26,36,26,0,-35],\"267\":[0,387,20,29,20,0,-28],\"268\":[21,387,26,36,26,0,-35],\"269\":[48,387,20,29,20,0,-28],\"270\":[69,387,25,35,25,0,-35],\"271\":[95,387,27,29,25,0,-28],\"272\":[123,387,27,27,25,-2,-27],\"273\":[151,387,23,28,22,0,-27],\"274\":[175,387,21,34,21,0,-34],\"275\":[197,387,20,28,20,0,-27],\"276\":[218,387,21,35,21,0,-35],\"277\":[240,387,20,29,20,0,-28],\"278\":[261,387,21,35,21,0,-35],\"279\":[283,387,20,29,20,0,-28],\"280\":[304,387,21,35,21,0,-27],\"281\":[326,387,20,27,20,0,-20],\"282\":[347,387,21,35,21,0,-35],\"283\":[369,387,20,29,20,0,-28],\"284\":[390,387,26,36,26,0,-35],\"285\":[417,387,22,36,22,0,-28],\"286\":[440,387,26,36,26,0,-35],\"287\":[467,387,22,36,22,0,-28],\"288\":[0,424,26,36,26,0,-35],\"289\":[27,424,22,36,22,0,-28],\"290\":[50,424,26,36,26,0,-27],\"291\":[77,424,22,39,22,0,-31],\"292\":[100,424,26,35,26,0,-35],\"293\":[127,424,24,35,21,-3,-35],\"294\":[152,424,28,27,28,0,-27],\"295\":[181,424,24,27,21,-3,-27],\"296\":[206,424,13,34,9,-2,-34],\"297\":[220,424,13,27,9,-2,-27],\"298\":[234,424,13,34,9,-2,-34],\"299\":[248,424,13,27,9,-2,-27],\"300\":[262,424,13,35,9,-2,-35],\"301\":[276,424,14,28,9,-3,-28],\"302\":[291,424,9,35,9,0,-27],\"303\":[301,424,10,36,9,-1,-28],\"304\":[312,424,9,35,9,0,-35],\"305\":[322,424,9,20,9,0,-20],\"306\":[332,424,28,28,28,0,-27],\"307\":[361,424,17,36,17,0,-28],\"308\":[379,424,23,36,19,0,-35],\"309\":[403,424,15,36,9,-3,-28],\"310\":[419,424,24,36,24,0,-27],\"311\":[444,424,21,36,20,0,-27],\"312\":[466,424,23,20,23,0,-20],\"313\":[490,424,19,35,19,0,-35],\"314\":[0,464,10,35,9,0,-35],\"315\":[11,464,19,36,19,0,-27],\"316\":[31,464,9,36,9,0,-27],\"317\":[41,464,19,28,19,0,-28],\"318\":[61,464,14,28,12,0,-28],\"319\":[76,464,20,27,20,0,-27],\"320\":[97,464,15,27,14,0,-27],\"321\":[113,464,21,27,20,-1,-27],\"322\":[135,464,11,27,9,-1,-27],\"323\":[147,464,25,35,25,0,-35],\"324\":[173,464,21,28,21,0,-28],\"325\":[195,464,25,36,25,0,-27],\"326\":[221,464,21,29,21,0,-20],\"327\":[243,464,25,35,25,0,-35],\"328\":[269,464,21,28,21,0,-28],\"329\":[291,464,18,44,18,0,-35],\"330\":[310,464,25,35,25,0,-27],\"331\":[336,464,21,28,21,0,-20],\"332\":[358,464,27,35,27,0,-34],\"333\":[386,464,21,28,21,0,-27],\"334\":[408,464,27,36,27,0,-35],\"335\":[436,464,21,29,21,0,-28],\"336\":[458,464,27,35,27,0,-34],\"337\":[486,464,21,28,21,0,-27],\"338\":[0,509,36,27,36,0,-27],\"339\":[37,509,34,21,34,0,-20],\"340\":[72,509,23,35,22,0,-35],\"341\":[96,509,14,28,14,0,-28],\"342\":[111,509,23,36,22,0,-27],\"343\":[135,509,14,29,14,0,-20],\"344\":[150,509,23,35,22,0,-35],\"345\":[174,509,15,28,14,0,-28],\"346\":[190,509,22,36,22,0,-35],\"347\":[213,509,19,29,19,0,-28],\"348\":[233,509,22,36,22,0,-35],\"349\":[256,509,19,29,19,0,-28],\"350\":[276,509,22,36,22,0,-27],\"351\":[299,509,19,29,19,0,-20],\"352\":[319,509,22,36,22,0,-35],\"353\":[342,509,19,29,19,0,-28],\"354\":[362,509,23,36,23,0,-27],\"355\":[386,509,13,34,13,0,-25],\"356\":[400,509,23,35,23,0,-35],\"357\":[424,509,15,30,14,0,-29],\"358\":[440,509,23,27,23,0,-27],\"359\":[464,509,13,26,13,0,-25],\"360\":[478,509,25,35,25,0,-34],\"361\":[0,546,21,28,21,0,-27],\"362\":[22,546,25,35,25,0,-34],\"363\":[48,546,21,28,21,0,-27],\"364\":[70,546,25,36,25,0,-35],\"365\":[96,546,21,29,21,0,-28],\"366\":[118,546,25,37,25,0,-36],\"367\":[144,546,21,32,21,0,-31],\"368\":[166,546,25,35,25,0,-34],\"369\":[192,546,21,28,21,0,-27],\"370\":[214,546,25,35,25,0,-27],\"371\":[240,546,21,28,21,0,-20],\"372\":[262,546,37,35,36,0,-35],\"373\":[300,546,30,28,29,0,-28],\"374\":[331,546,25,35,25,0,-35],\"375\":[357,546,20,36,20,0,-28],\"376\":[378,546,25,35,25,0,-35],\"377\":[404,546,23,35,23,0,-35],\"378\":[428,546,19,28,19,0,-28],\"379\":[448,546,23,35,23,0,-35],\"380\":[472,546,19,28,19,0,-28],\"381\":[0,584,23,35,23,0,-35],\"382\":[24,584,19,28,19,0,-28],\"383\":[44,584,11,28,9,-1,-28]},\"atlas\":\"data:image/png;base64,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\"}"),
	48: /*#__PURE__*/ JSON.parse("{\"height\":59,\"ascent\":48,\"space\":10,\"smooth\":false,\"glyphs\":{\"32\":[0,0,10,0,10,0,0],\"33\":[11,0,15,36,15,0,-35],\"34\":[27,0,25,35,25,0,-35],\"35\":[53,0,31,35,30,-1,-35],\"36\":[85,0,30,45,30,0,-40],\"37\":[116,0,40,39,40,0,-37],\"38\":[157,0,32,37,31,0,-36],\"39\":[190,0,15,35,15,0,-35],\"40\":[206,0,17,45,16,0,-38],\"41\":[224,0,17,45,16,0,-38],\"42\":[242,0,26,35,26,0,-35],\"43\":[269,0,31,27,31,0,-27],\"44\":[301,0,15,15,15,0,-5],\"45\":[317,0,21,18,21,0,-18],\"46\":[339,0,15,9,15,0,-8],\"47\":[355,0,19,43,17,-1,-37],\"48\":[375,0,31,37,31,0,-36],\"49\":[407,0,19,35,19,0,-35],\"50\":[427,0,29,36,29,0,-36],\"51\":[457,0,30,37,30,0,-36],\"52\":[0,46,31,35,31,0,-35],\"53\":[32,46,29,36,29,0,-35],\"54\":[62,46,30,37,30,0,-36],\"55\":[93,46,26,35,26,0,-35],\"56\":[120,46,30,37,30,0,-36],\"57\":[151,46,30,37,30,0,-36],\"58\":[182,46,15,26,15,0,-25],\"59\":[198,46,15,35,15,0,-25],\"60\":[214,46,31,28,31,0,-28],\"61\":[246,46,31,23,31,0,-23],\"62\":[278,46,31,28,31,0,-28],\"63\":[310,46,25,37,25,0,-36],\"64\":[336,46,48,46,48,0,-35],\"65\":[385,46,34,35,34,0,-35],\"66\":[420,46,30,35,30,0,-35],\"67\":[451,46,35,37,35,0,-36],\"68\":[0,93,33,35,33,0,-35],\"69\":[34,93,28,35,28,0,-35],\"70\":[63,93,27,35,27,0,-35],\"71\":[91,93,35,37,35,0,-36],\"72\":[127,93,34,35,34,0,-35],\"73\":[162,93,12,35,12,0,-35],\"74\":[175,93,26,36,26,0,-35],\"75\":[202,93,32,35,32,0,-35],\"76\":[235,93,26,35,26,0,-35],\"77\":[262,93,42,35,42,0,-35],\"78\":[305,93,34,35,34,0,-35],\"79\":[340,93,36,37,36,0,-36],\"80\":[377,93,30,35,30,0,-35],\"81\":[408,93,36,39,36,0,-36],\"82\":[445,93,30,35,30,0,-35],\"83\":[476,93,30,37,30,0,-36],\"84\":[0,133,31,35,31,0,-35],\"85\":[32,133,33,36,33,0,-35],\"86\":[66,133,34,35,34,0,-35],\"87\":[101,133,49,35,48,0,-35],\"88\":[151,133,33,35,33,0,-35],\"89\":[185,133,33,35,33,0,-35],\"90\":[219,133,30,35,30,0,-35],\"91\":[250,133,17,45,16,0,-38],\"92\":[268,133,19,43,17,-1,-37],\"93\":[288,133,17,45,16,0,-38],\"94\":[306,133,22,35,22,0,-35],\"95\":[329,133,24,6,21,-1,0],\"96\":[354,133,21,37,21,0,-37],\"97\":[376,133,26,28,26,0,-27],\"98\":[403,133,29,36,29,0,-35],\"99\":[433,133,27,28,27,0,-27],\"100\":[461,133,29,36,29,0,-35],\"101\":[0,179,27,28,27,0,-27],\"102\":[28,179,18,37,17,0,-37],\"103\":[47,179,29,38,29,0,-27],\"104\":[77,179,29,35,28,0,-35],\"105\":[107,179,12,37,12,0,-37],\"106\":[120,179,15,47,12,-3,-37],\"107\":[136,179,27,35,26,0,-35],\"108\":[164,179,12,35,12,0,-35],\"109\":[177,179,42,27,42,0,-27],\"110\":[220,179,28,27,28,0,-27],\"111\":[249,179,28,28,28,0,-27],\"112\":[278,179,29,37,29,0,-27],\"113\":[308,179,29,37,29,0,-27],\"114\":[338,179,18,27,18,0,-27],\"115\":[357,179,25,28,25,0,-27],\"116\":[383,179,17,34,17,0,-33],\"117\":[401,179,28,28,28,0,-27],\"118\":[430,179,27,27,27,0,-27],\"119\":[458,179,40,27,39,0,-27],\"120\":[0,227,26,27,26,0,-27],\"121\":[27,227,27,37,27,0,-27],\"122\":[55,227,26,27,26,0,-27],\"123\":[82,227,21,45,21,0,-38],\"124\":[104,227,16,59,16,0,-47],\"125\":[121,227,21,45,21,0,-38],\"126\":[143,227,31,20,31,0,-20],\"127\":[175,227,24,59,24,0,-47],\"128\":[200,227,24,59,24,0,-47],\"129\":[225,227,24,59,24,0,-47],\"130\":[250,227,24,59,24,0,-47],\"131\":[275,227,24,59,24,0,-47],\"132\":[300,227,24,59,24,0,-47],\"133\":[325,227,24,59,24,0,-47],\"134\":[350,227,24,59,24,0,-47],\"135\":[375,227,24,59,24,0,-47],\"136\":[400,227,24,59,24,0,-47],\"137\":[425,227,24,59,24,0,-47],\"138\":[450,227,24,59,24,0,-47],\"139\":[475,227,24,59,24,0,-47],\"140\":[0,287,24,59,24,0,-47],\"141\":[25,287,24,59,24,0,-47],\"142\":[50,287,24,59,24,0,-47],\"143\":[75,287,24,59,24,0,-47],\"144\":[100,287,24,59,24,0,-47],\"145\":[125,287,24,59,24,0,-47],\"146\":[150,287,24,59,24,0,-47],\"147\":[175,287,24,59,24,0,-47],\"148\":[200,287,24,59,24,0,-47],\"149\":[225,287,24,59,24,0,-47],\"150\":[250,287,24,59,24,0,-47],\"151\":[275,287,24,59,24,0,-47],\"152\":[300,287,24,59,24,0,-47],\"153\":[325,287,24,59,24,0,-47],\"154\":[350,287,24,59,24,0,-47],\"155\":[375,287,24,59,24,0,-47],\"156\":[400,287,24,59,24,0,-47],\"157\":[425,287,24,59,24,0,-47],\"158\":[450,287,24,59,24,0,-47],\"159\":[475,287,24,59,24,0,-47],\"160\":[500,287,10,0,10,0,0],\"161\":[0,347,15,36,15,0,-27],\"162\":[16,347,27,35,27,0,-35],\"163\":[44,347,31,36,31,0,-36],\"164\":[76,347,35,31,35,0,-30],\"165\":[112,347,28,35,26,-1,-35],\"166\":[141,347,15,42,15,0,-35],\"167\":[157,347,27,44,27,0,-36],\"168\":[185,347,24,37,24,0,-37],\"169\":[210,347,42,37,42,0,-36],\"170\":[253,347,22,35,22,0,-35],\"171\":[276,347,29,25,29,0,-25],\"172\":[306,347,26,19,26,0,-19],\"173\":[333,347,0,0,1,0,0],\"174\":[334,347,30,36,30,0,-36],\"175\":[365,347,26,35,26,0,-35],\"176\":[392,347,20,36,20,0,-36],\"177\":[413,347,31,28,31,0,-28],\"178\":[445,347,19,39,19,0,-39],\"179\":[465,347,20,39,20,0,-39],\"180\":[486,347,21,37,21,0,-37],\"181\":[0,392,30,37,30,0,-27],\"182\":[31,392,28,35,28,0,-35],\"183\":[60,392,15,20,15,0,-20],\"184\":[76,392,16,13,16,0,-1],\"185\":[93,392,14,39,14,0,-39],\"186\":[108,392,22,35,22,0,-35],\"187\":[131,392,29,25,29,0,-25],\"188\":[161,392,41,35,41,0,-35],\"189\":[203,392,42,35,42,0,-35],\"190\":[246,392,45,35,45,0,-35],\"191\":[292,392,25,37,25,0,-27],\"192\":[318,392,34,46,34,0,-46],\"193\":[353,392,34,46,34,0,-46],\"194\":[388,392,34,46,34,0,-46],\"195\":[423,392,34,45,34,0,-45],\"196\":[458,392,34,46,34,0,-46],\"197\":[0,439,34,48,34,0,-48],\"198\":[35,439,48,35,48,0,-35],\"199\":[84,439,35,48,35,0,-36],\"200\":[120,439,28,46,28,0,-46],\"201\":[149,439,28,46,28,0,-46],\"202\":[178,439,28,46,28,0,-46],\"203\":[207,439,28,46,28,0,-46],\"204\":[236,439,14,46,12,-2,-46],\"205\":[251,439,14,46,12,0,-46],\"206\":[266,439,20,46,12,-4,-46],\"207\":[287,439,18,46,12,-3,-46],\"208\":[306,439,36,35,33,-3,-35],\"209\":[343,439,34,45,34,0,-45],\"210\":[378,439,36,47,36,0,-46],\"211\":[415,439,36,47,36,0,-46],\"212\":[452,439,36,47,36,0,-46],\"213\":[0,488,36,46,36,0,-45],\"214\":[37,488,36,47,36,0,-46],\"215\":[74,488,31,27,31,0,-27],\"216\":[106,488,36,39,36,0,-37],\"217\":[143,488,33,47,33,0,-46],\"218\":[177,488,33,47,33,0,-46],\"219\":[211,488,33,47,33,0,-46],\"220\":[245,488,33,47,33,0,-46],\"221\":[279,488,33,46,33,0,-46],\"222\":[313,488,31,35,31,0,-35],\"223\":[345,488,30,36,30,0,-36],\"224\":[376,488,26,38,26,0,-37],\"225\":[403,488,26,38,26,0,-37],\"226\":[430,488,26,39,26,0,-38],\"227\":[457,488,26,37,26,0,-36],\"228\":[484,488,26,38,26,0,-37],\"229\":[0,536,26,42,26,0,-41],\"230\":[27,536,42,28,42,0,-27],\"231\":[70,536,27,39,27,0,-27],\"232\":[98,536,27,38,27,0,-37],\"233\":[126,536,27,38,27,0,-37],\"234\":[154,536,27,39,27,0,-38],\"235\":[182,536,27,38,27,0,-37],\"236\":[210,536,14,37,12,-2,-37],\"237\":[225,536,13,37,12,0,-37],\"238\":[239,536,20,38,12,-4,-38],\"239\":[260,536,19,37,12,-4,-37],\"240\":[280,536,27,38,27,0,-37],\"241\":[308,536,28,36,28,0,-36],\"242\":[337,536,28,38,28,0,-37],\"243\":[366,536,28,38,28,0,-37],\"244\":[395,536,28,39,28,0,-38],\"245\":[424,536,28,37,28,0,-36],\"246\":[453,536,28,38,28,0,-37],\"247\":[0,579,31,28,31,0,-28],\"248\":[32,579,28,30,28,0,-28],\"249\":[61,579,28,38,28,0,-37],\"250\":[90,579,28,38,28,0,-37],\"251\":[119,579,28,39,28,0,-38],\"252\":[148,579,28,38,28,0,-37],\"253\":[177,579,27,47,27,0,-37],\"254\":[205,579,29,45,29,0,-35],\"255\":[235,579,27,47,27,0,-37],\"256\":[263,579,34,44,34,0,-44],\"257\":[298,579,26,36,26,0,-35],\"258\":[325,579,34,46,34,0,-46],\"259\":[360,579,26,38,26,0,-37],\"260\":[387,579,35,45,34,0,-35],\"261\":[423,579,26,37,26,0,-27],\"262\":[450,579,35,47,35,0,-46],\"263\":[0,627,27,38,27,0,-37],\"264\":[28,627,35,47,35,0,-46],\"265\":[64,627,27,39,27,0,-38],\"266\":[92,627,35,47,35,0,-46],\"267\":[128,627,27,38,27,0,-37],\"268\":[156,627,35,48,35,0,-47],\"269\":[192,627,27,39,27,0,-38],\"270\":[220,627,33,47,33,0,-47],\"271\":[254,627,36,38,34,0,-37],\"272\":[291,627,36,35,33,-3,-35],\"273\":[328,627,30,36,29,0,-35],\"274\":[359,627,28,44,28,0,-44],\"275\":[388,627,27,36,27,0,-35],\"276\":[416,627,28,46,28,0,-46],\"277\":[445,627,27,38,27,0,-37],\"278\":[473,627,28,46,28,0,-46],\"279\":[0,676,27,38,27,0,-37],\"280\":[28,676,28,45,28,0,-35],\"281\":[57,676,27,36,27,0,-27],\"282\":[85,676,28,47,28,0,-47],\"283\":[114,676,27,39,27,0,-38],\"284\":[142,676,35,47,35,0,-46],\"285\":[178,676,29,49,29,0,-38],\"286\":[208,676,35,47,35,0,-46],\"287\":[244,676,29,48,29,0,-37],\"288\":[274,676,35,47,35,0,-46],\"289\":[310,676,29,48,29,0,-37],\"290\":[340,676,35,48,35,0,-36],\"291\":[376,676,29,52,29,0,-41],\"292\":[406,676,34,46,34,0,-46],\"293\":[441,676,33,46,28,-4,-46],\"294\":[0,729,37,35,37,0,-35],\"295\":[38,729,32,35,28,-3,-35],\"296\":[71,729,18,45,12,-3,-45],\"297\":[90,729,18,36,12,-3,-36],\"298\":[109,729,18,44,12,-3,-44],\"299\":[128,729,18,35,12,-3,-35],\"300\":[147,729,18,46,12,-3,-46],\"301\":[166,729,18,37,12,-3,-37],\"302\":[185,729,12,45,12,0,-35],\"303\":[198,729,14,47,12,-2,-37],\"304\":[213,729,12,46,12,0,-46],\"305\":[226,729,12,27,12,0,-27],\"306\":[239,729,38,36,38,0,-35],\"307\":[278,729,23,47,23,0,-37],\"308\":[302,729,30,47,26,0,-46],\"309\":[333,729,20,48,12,-4,-38],\"310\":[354,729,32,47,32,0,-35],\"311\":[387,729,27,47,26,0,-35],\"312\":[415,729,30,27,30,0,-27],\"313\":[446,729,26,46,26,0,-46],\"314\":[473,729,13,46,12,0,-46],\"315\":[0,778,26,47,26,0,-35],\"316\":[27,778,12,47,12,0,-35],\"317\":[40,778,26,37,26,0,-37],\"318\":[67,778,18,37,16,0,-37],\"319\":[86,778,26,35,26,0,-35],\"320\":[113,778,20,35,18,0,-35],\"321\":[134,778,28,35,27,-1,-35],\"322\":[163,778,15,35,12,-2,-35],\"323\":[179,778,34,46,34,0,-46],\"324\":[214,778,28,37,28,0,-37],\"325\":[243,778,34,47,34,0,-35],\"326\":[278,778,28,39,28,0,-27],\"327\":[307,778,34,47,34,0,-47],\"328\":[342,778,28,38,28,0,-38],\"329\":[371,778,24,59,24,0,-47],\"330\":[396,778,34,46,34,0,-35],\"331\":[431,778,28,37,28,0,-27],\"332\":[460,778,36,45,36,0,-44],\"333\":[0,838,28,36,28,0,-35],\"334\":[29,838,36,47,36,0,-46],\"335\":[66,838,28,38,28,0,-37],\"336\":[95,838,36,46,36,0,-45],\"337\":[132,838,28,37,28,0,-36],\"338\":[161,838,48,35,48,0,-35],\"339\":[210,838,46,28,46,0,-27],\"340\":[257,838,30,46,30,0,-46],\"341\":[288,838,18,37,18,0,-37],\"342\":[307,838,30,47,30,0,-35],\"343\":[338,838,18,39,18,0,-27],\"344\":[357,838,30,47,30,0,-47],\"345\":[388,838,20,38,18,0,-38],\"346\":[409,838,30,47,30,0,-46],\"347\":[440,838,25,38,25,0,-37],\"348\":[466,838,30,47,30,0,-46],\"349\":[0,886,25,39,25,0,-38],\"350\":[26,886,30,48,30,0,-36],\"351\":[57,886,25,39,25,0,-27],\"352\":[83,886,30,48,30,0,-47],\"353\":[114,886,25,39,25,0,-38],\"354\":[140,886,31,47,31,0,-35],\"355\":[172,886,18,45,17,0,-33],\"356\":[191,886,31,47,31,0,-47],\"357\":[223,886,20,40,19,0,-39],\"358\":[244,886,31,35,31,0,-35],\"359\":[276,886,17,34,17,0,-33],\"360\":[294,886,33,46,33,0,-45],\"361\":[328,886,28,37,28,0,-36],\"362\":[357,886,33,45,33,0,-44],\"363\":[391,886,28,36,28,0,-35],\"364\":[420,886,33,47,33,0,-46],\"365\":[454,886,28,38,28,0,-37],\"366\":[0,935,33,49,33,0,-48],\"367\":[34,935,28,42,28,0,-41],\"368\":[63,935,33,46,33,0,-45],\"369\":[97,935,28,37,28,0,-36],\"370\":[126,935,33,45,33,0,-35],\"371\":[160,935,28,37,28,0,-27],\"372\":[189,935,49,46,48,0,-46],\"373\":[239,935,40,38,39,0,-38],\"374\":[280,935,33,46,33,0,-46],\"375\":[314,935,27,48,27,0,-38],\"376\":[342,935,33,46,33,0,-46],\"377\":[376,935,30,46,30,0,-46],\"378\":[407,935,26,37,26,0,-37],\"379\":[434,935,30,46,30,0,-46],\"380\":[465,935,26,37,26,0,-37],\"381\":[0,985,30,47,30,0,-47],\"382\":[31,985,26,38,26,0,-38],\"383\":[58,985,14,37,12,-1,-37]},\"atlas\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAQJCAYAAACwp7AIAAC06UlEQVR42u1d7bLcqK41u/Yr4oeEh+T+uOk5nU7bSEISAq9V1ZWZxLZA6AsBIh0MtNbe/zcfx1FuHj+P46iv/0kpfb5/HMfRLt6tf95/ofyhJ6XzDVftT3csUKR/1abj/XscDNJ2gaCN+UI+tNtAlUU1Pk/6zje5T6vIGHPs/unbl/fzQHMoep8/aJyKfL2yv+fAOKnoG4N+6YxBUrQb7L4I+ahG2xq/BxAF74a5XhkKBRr5i4DWt18U9AxDxDZTA+TP8SUHH4ui3DiWU4HPXQctlLEezg6Nb99vhPc4umxpFyx1rjeBtO7HoaxbM3g4jJ9FDIgFs7LS83URHrYbg/dSRqlClj/fb290RsalEcZntM0eAcCd46DIkKaRB/zHPzNn7t62Mnfswp3Ojciltt5K+pEVbNW77ePysEXQ7Z8NFK0G/VY0589RpFFDdzoaBouZhKXxr0y5GzW0WSDzowZ+54mD1gQjG3/f0glnoYxQg3vPYGKkTe2IFQg9MgCYmQGohm3Jigpi9c4353sO8CBPeNdbtq4CAO0sQBZkSd6NYdlAj3cN6I9jLCOpFeBJMgea0AxUuW1riuM4TddmBwDRFLQ6K/B7+qhc/FsbEPR83K+9Xq1FZqHSjKxtFWcFtgzmJE5JOwtQLhx7ZcxGVgkC4Pzp/dbO7vS+lw+bjJJF0E+V92bQlym69tRNgFnpnWqgMD1hH91A9Lnxql4IdD76G5wOxdl/r82VoPT5mG/4pcZZMwAoN39fGQYtL6zLlagLlgFI7sizd5+pTrMyZaAc1ydJrGSoEPtRGX3PQrt3x8OqSHsuWmvvv9zukd+f//L+0VorF+8WBq2DQIfa9rt3un3s0O/xi4PyjcYX2oXS5ovnCpN/mcB3rhxw2ttrs5Ys9mRsRCe4fLj6Tu58i4os1C/V8erQbxxdFrZfKlN5QHclMpY73xPZFaLtKhf9KZ13enL6rT9F2I+DqBcSeaPYwcLl4VMzANpRUCZGpRqZgeqQ4nl971Tkdx6Ivq2OtVx9tx5+s9M6IAvcb931626W1cuYcHl1Hmun0GugdqQP/tdJ/S6Ed8/OvxXFLNXJmB1zs2xnhy5l2UKyNNrTmx5t94zb7yJKNkKLk3Ivgm/3HJbV+s6slJFm6l+a0ox89n9EhquB3nACgdUcf6ijuTeFW6qTjI28dzJkies4OQ56FCfxmWaka9qTLVOsfgpgBWNlOdhlQl+0jvyNjGNecKxrcFmSfv+zBsS3392Mp/du2dQueAY9WYlf56D8n4dt4ScPGak3v+Vk0zIAqEGY4eksKsFhUhTjlTqkKEtx5FFxnjFyC6nUCQZB28hqbgaUFEhpxx5HABEA6M3+R+mch092yeP758VvyaDzyXUAIhionvC8AgFNI5iFymS57s85A182n/lpBACjjny1QODps//RGa3m89l4kvCyid9+50PHEAFAkBlCNXr+VGzP+7ncuzO6teOITye+lQ+nlJV5FE2xq4JMc8sQ10Vn2JbFuXYKerIjrScHUxSEmsD8BhXekb/7/PeTMKvsORDpxjdPp3BXYS4TeUCd/Z9GcnDVpkZ4tzrKYvTI/tsmp5cuXMl+dhrnGbYDExo/2cwLjMEMXaVsBn9cAMAx3Fqz4MxsR5SdxtK7ISU7Xs8b52915E+6M1drV3GkmwXvgiGqgX0/tkVJw75Sq+8ZoZCG/G23/Q43JWo4Lqu7JHbloeUsPB/0Y+fTg+2fhwrA7KibMgvXdq5Ux5M6bTwDtFPb+VvL1AxHWt/Gk+Mg3jc2UccsdX69PS53v6c5+Uiz1kjyrIVC0JnR7+eDdz1wmsVTbAKUCbTWkQ+vW9d6QnZ1RMc7JczNCJ0PlEeOvJwO4wDEnf3v7sw1nb83L7SORSIAMJ7NZ2Pl8rwb+vyYWb3/t+eu/9GAKNqxm6feSLckUkrqv4UmLxFtrJfzz8FsynRe/cIcTM0AXAnDe+qoTuizd+r/OHjr/3dlca8UfaWzutJNn5j1YfKymi2N4PxnZLzym92btpSJDIC90p0DQvt+XXB25JFn6j8fss1/5QCkBvqziAmwrt2yLmC1OtoxdneA1/i2GWPxs7nSUEuScsuQloNerlRDwPJbQGAtJJTUf7nhl9bVtZJAZZZBw05rYIZ8IZPTd/6UYFgTI5tZ3Sc1Pw9UmlmzLo2dnu+BgIfz/5z99yJVbvt6z/VmqJ9BQMS1eBhpYGYAUB3bE23y5+38NXyAaxDwo9ApGD3+zvXqIOCSb/bW/QvjW0VA75N2JSjq+3cwEwdgd+Y689m2n1pwZ1ba/3QeD9MA4OoM8Apns2cq7Xlc777nQDMI6KX+i7Iicjbl9DbplE5AgVk4sNvsf5ZTzsF5Fdn5hwsCfqA0U6Pez2BAw3FrfeMkzNZrJ6uRhWNUbzICEj4gAJhv8FDkR9eWVePvS5+vE/m0gvMPhV2PAWrcASC5M0Cz/fWgVZLKCorTS/1nAo/rRUZCcmSt3jgSyUbDmQHACrXRgb0DgEoIxle888LT+fdopBWF61dRQPOH84oQBFCcGLfqWnVs/4tWI4yBtF2FOdO+40PP0Gg4TW4QUJ3G6jH7DyYXvoHzlwUAPRuQBLYiQgBAsQUaM3/N2hxhbMWPgoC+H0+z3qVupUyhB4mgnHlAeTgBESUA0JjB9PrDUeYVU35R06xADFSDd0Y37c6QSy/nr9WWcHwcCQDuUiKeF914KlJlCsRVfYHspPRcQYziLLWuzjwDyBFOJgBek5YRXejZ82iz/xnOf/RulxKNj7+Gwhlp7TNPVr6IvJl993vv+t/XUcfPrAQnuFx1/R13CwB3cjCy6TgTdY5rBz3tB2e2LT0plQT8e7erlaHTSwYAO6AaPx81ING46Ccf9H0WUoPEdfhX79bJcoSNgECEIJC6fyYLvht9Qqel59T9Pnng+274gTKZCZhmxSfNtJFW6j8vYjjKMT8Nryl/CCQw+x+Bts6dD5NJq/5OOaL4M9hgj9lylNk/9x3KrLC3HyAbODBJ6r922na3Rtjjg8eWco8gwCs7hAAAAcAotHTufKg8avd7jfoErbXPX27fkT+fvXhf/XdB5xvKzXfKxTtc+lff0URh8LgweEDlCalthDaO8CoTv6Eii0xduJSdi+8Upe+Y6RfgYl+b1AYxZEJD545BmcwCnfUApR9ZgU5eRtc6jMhLdWa+ImshDwgrx/jnUedPbGNhfD9LHKihLrAUnRGsdnkKbGU3slMAwA0ESs/xW8pkwABAYrfIfPQAKnoYCeqXVLl5KiqldCU4+ZAX/JH05TKlddPGuxTo5ya6ofSbRiGbiz6UTur2JPCicVOPKMyznd24kiNyqpihZyZLDzvJpICP4CEiefVUUZhllptot1BSg5uOMXsZ4Mt32Ol/ZAC2tBuitDtkAgDiOgetPQGXTtYxAPi2/PMow3TTR3LQ9uU7e6wVAiMyNZz+h0wAQEznIF0zetTseuMgr9wEAFky+8e4PyYAKAgAAG38ggVT8F7w4f0ypW8XKuHY11q4q3CoeT0ysCdQOhoANs8A9NaPS8MRrZXHmJQF+PhOk6Z+ga1kanj9HzIBIAMAAOtkATD7B95lB3IAAMgAIAOw8BiX3myOMOtrGHcAAJAB2B9rlIMEODO5whh7zPoAAAAAAAAAALBFGkwhUivDXVYw+0LfqnJe6tCl9ndolvZG2zp3W1NK58wqVgFpf96EKKlWWD7aVZX6PqqHvYqQxVLWOvRdr0Nm8l+s0wbjTL36Wu2EkLAP1Mu10kBbRi/wqhxeKYyl6uVNblUAjSrCkXawXtC3ukBHWjCHemafXN/ZqZ51YfSTW4Nfqxa5Ru3/UbmiVlQkn89W0Csu70qHfjaWtUykX7i72RUva1KXOYVxzgr2boinwj6oXBjkfJGa9lhy5Yg1Tm4YFN62cQCQBwRtlQAgDyrUiGEpVgZP4ABHL+nJzS8AyL1bHQMHACpOa8CpFU1ZHxhnKxtXmn0AkK3aYxwAaI3laNAW5iKg4ziOn4F3y7EvykD/8p/0ft64jyP9HOVPFqQH8+R/10oPN4XUaAS8xtBTT0ZlTqOt1rbBw/Zko2e9ZW/EZmYF+iH8588AIyIImJVjzIG+E80YjvRTc3/HDo6Q2s+2ccDt0b82Wea8jb4lrWz8fNQgQNve5Ag6/SNs+K6GV7tvEZ1UmfjNYkA3byqH3jPkCH22yHCUyfqThX2qX36zswHZ6R0veZttZ6YHAb8BFIqjEKexQBSj735T3mTc3ioMcL4ZG8p7pTM+nDPxlUk3Eb6ZGf29ekZ1p+/N+OTFdKcq68ur/6fCtzOx7ZXBe+qphiyQ+8rkEVUvq9LYRAgAevJM1SPKOFpPMjLBdtrBafMKZxOg2gYXpV3ivX6w3hPwXDoW32iVgU07lM0/0pvuejuGWe2+4HFW2BBUBk4RWG7G9NyEKNEvjY1TEvpZKHMkeevwOWttCFPalKaxCbBp2v+BTYBFyUYW4cmfqz7mL9eki07KRQwAMoGZowFA1jpSorxLvCjwRtM4kwzbF1qjRpZsUBnKTB3bQjVwBMOcB44Ejb5vvps4YADgvoNawYl0HWqHz6pH5JTs84islAH7XyYFAMegXdYKbqjBYOgAoMeElQMAsnMZdVBKxllKS8MgSQKA5qDMalkW4/dHnCDXAUYLAFz48EZ/RN7LQABQnJ0/6w4KoaxQxmPIhhoFAEUYABQl5y/OoEbaA9Bba66Lb1a6azt1bYZT+11rjXSkvdJ1XO5YZwLfDgXartXmnPeYSDeCRUb9WHfPQh24W9+uA/IutWm9viTB+5yxP2/WrSn7ZaT7KChr6SvddUKxW5Up7z0f4W7DfhUE+nQ0GDMGmkP3DCCYdTJ9axnIAdtl4fy1nX4OqpvfNn1yd2hfbQo7J/CrCOxDr9/5w4lcyVN6o9MUnQx3I2Uk/ZRcta0R8Ej0JGwA4OXwMkPJ7mp4n8YCMtORjIyH9Qy6Gj9/RFMgw5mx9s56y+yU1i7zkaxAdMdxxSNuHY1G5PXVbFM7AKiMrIm3fkonS5pZy9CTmF8CA0eOT2mjEATseFOS00DRr4yTR5p2dPZ/J3yU9GAZoL3arN0b54Hrf7WyAhp2RttxjDp/rt7Ujk2vSrRq0BluL+g9hX2uCnoexu79DiiC93qOpPxrGzSslRl8aJ5f1p79f86wrnhchcYqwvLHyg4PiIE2MF6ZoRseRaw09mZxJx1eM1yqLY4yeQ2p77+LOP8R4ZFufOEahW+O9HTsv8YmoavZwUhKTHNWkBW/FQnvBqsea22WmjWDm0XvVJg1emU06o2ea+hcFQQdGjo6wr/e5Gz2HitX/AgYbBk9WSlFGaDXjA2K1+yfqwSU1GtVyHZQZ0I7Xz71yftdLv2R6oz33QfU2vmnYPZfhU7m/Phpbjrj7Dngfr8OftMqEDr/TASRbSNkALTXerUHszKjQe66l5bT0SrzaBGVnod8fZW736F3/KVXrlTLGX721fMEC/eYqHZWYNcjkl4BqHTmyJn9341zPeSnSbKz3Yl2GuDd/o9OYPcKIKSFE0YLUNwUXyjC4g/kcphvdLOwAIm4zOMFz1Wq7wmKfJhVZftC25K/lBKtxaA4CgoBxS4EpF6h7YYOtQBOGSw4lpnvF2a1UI0CXiKb9dGWEdvEHlOGT3DToRkBwEjnNQKAq7KrWrWf80AAoFKrXmCcxVUKb2gVS2USllvm0OMGACy5Ng4AzOvjBw8AVO89GOz/UKU3oh0RB6KCdmsGAHmENwo2g2JTr35UIAAYdeLGAYDkx5khZq6gjNQOF/Q5Kxkoj8jag3bPaRZhWU/KZTqWAYRqJiZgADDrMiAz3RoIADQci0cAMFoenf0+IwCwvAxoWC5WCgB+GGtTq6x9aLfzVHrO4ryvZE8DZUd/+vhR1lkbkUd1YByq89hTxqEqyVgSrvPPLpijJcvafBkdD63CRhY2qwYYr9L5ZQN50B7HVXTHJQCIduwvSgCgpcRZoICaO/8pO/qvdsm+70ruGQWKUnLr/78r8s4KWxkB18488NixvVIF0IjBWu78LAJCiwlcfvLY/xAHoxF+ueMY3p8tQQRbe0ZZHZVQu543p5DQqFL3HF39CDpGg7A60KcZszFJ3/9CSmnab1afATW59XDOedG+bjUB+YHQh43Atavuac14NDMd77O9zyWHb44gD4z7yfj7KLPFJ5xfjpb1qJP0fbUMwEp0NCdyGpUV7ybSjw0AijC7MDpAEQ2r9+x/VgDgGcTUj+CCuxQxW3bOY6/lgVnr++/0v/08s3ge3408w40SaHAzw8WoLe56/buIsbAsXemlPJz2R7h+WTu4u+OL+tjepKI1Ly2a4Ygj3ZgnbXsN1J4ZNPOFjoxmoyLMcFcMAKpgkiO9VTGUvv4EMw6jjCsGRiA7C/OMWtTZQWlHNgxRxrYGk1kP2istD+y8vl8ddVBDV6UBwCuLxvmdRvbkULIb0jEtBm3xn9wpF2kZqdiWiefALYrxjJ551aoDoHoG9YOWRq0DSbEljX5lzjlxRb24412ZXsQDoI4fpSBTMdKvrKjjXDtVGAVwLM/AS+zySB0ATiXRIqz9weEJu+JkREUZcQycUsAzyvHODD60i19IA4CiJMhZWAq4tMESz0YBQObKA7BEAJBH9YzosIrQXkhsXOG2h+F0m5FvaBNKAVMLImUG3/NFsFckgcRTA4DDaJCLUpU6qWJSqpSpR9+CDMsVHVY0PRDcUcr9dtvrFAAcCACWDQBUdI2hX1ZlscUOTzBJKAO+IQucsEcAQJmYFe8xeXoAkC2df2ewvRXObPav4ISHygE7BXfFygFz0qgIAJYLAIqGs2NkufIkx8KxhdYlcLlp+OLJi47MuI7JrFLAkTbUnJO+dRr0hbJBiFKlT2sjltUmrHMCf8+JMgoAVLkoyrooOUnRs4XWm4+jnDyQ+IUUpB2PCABejBnd3Sw55605IBz6WVnZvYMA6je1+FsNlZIyNggAAK6TK8o2qgreGbFB1kGzZ2lgiQ3SPm2jUYfEPFU2Ywlg5CYxzetCve4qN0u9dfqZrdJXRB4XbZqGSwCfvwNLALExmJLOA/pluZGYe6Kgaw//9MHrBrzbtn7RO60UO5UPGvsZ1HyUB1IERVWYkbGi1JQSlS7nrDqpyMlArXQr/nLP45P7qUybnD3w5jEQMwAgyN5Qav5Cxq++y/l+Zto1cZYKuiL2RSZ203tcEgbbP/hYNMCyCrK+0f2sssVKvcGoAQzZyyNydkGnEPQoREVP6MqwT1DzDQgAAAAA9nAaFG8yvTIiAoBn4wcsAAAAUAdlhv+6AK2XMbibdb5/AwCQAQAAAJicAXh30BxcXUzzuUSmYs+RAQAAAAAAYQBgeKJouKIcTqwAd8ASAAAAgC281vozWA1wgPwPAADAQAaACel6v4lNxxIAMgAAAACAXzYgKWcF6tt3AQAZAAAAgIAZgG94LyjDqck/XCYcGQAEAAAAAMC8AGCeA0AAAAAAAAAA8LAMwFsEO7I5pV78SY5CldpBaefpTPM8jqMKSuN+Qr3UJLH/I2VLe+egk7QtCvzs0fpvjdaYVxTZS07jJdVH7dK2lIHlyk4yas+VnEzXcQM7927fK5M2+CHjhwoPrjI9v0oK+239anqZyw1QOkLwKQwnWKaG7CC/FAN0LsIrbZm34PUZkG9mF8oYjnM2CvzADz4fhnhgeQrgVaISZ1Nls+bGEILXcyNlRYE5xr/n/OtC/YkWTHD57a3jXF2VvmfZDw0bD3787TM5/ckjvtbjGGA5UKeay6usoEwIAuIHeZTIfqU+RXX+1tmFWToexa6O9GdXfhRm+zUCKTYPfhyNA+pO2ikRAq/1xrrn/FdbztGYYecAvF9Jx/OxdhCwMz842dsyiwc/E4QEsFeEiAoB0HVg1b0co7O47NTGDB2fbt/BD7u2kmWcugnwLh2ZGcr/6rDUwI2mRWtAmtbp+lGeA75OYOVxypPelYxDCjbus3X8KuuUBTPaCn781ddTQeYr8x2SjP8KGnD395SIJh9jO6xnrItWQ0GlDuh5IQiUb4zyHPAZ6x1OzkjlzHtW7hUUc3dzR9Pxzzb1nHevDU/kh5QPdzv8Kb62K+M/BsxJBKZjg9r/Boji+NMXQahvUepJNETAPKe426Y/TTnLQcfEU8dPBR336M85OJY78kPi7zKDB3e+dkivfiYxJdKRnOjOn+IUqoJiAvPGesVNf5q6XRZqq3a/kqKOe+m51Nbsyo868ZtDduMnoJA8aVao4fwRBMD5r5wFyMHHx1rHD2UdLwvLxar80M4AVGPaLgFAr3FPdkbUtR8PQQRsncvOm/52CACsnISljs/Wc4uU98r8mI1086tRA4AnO6Q8yLeeQ7n6YROg7xjv7vw1AvxsoAMWYzV7tru6XQU/5srjV/xONBBPdw7akTB4Hmt8e7PKHQKyu6NJlGNIpfPt7NRWans1dXy0L9r8sZ7AgB88+S4eNuJ3sgHhHtMY2bm7yy7rGUAxIV0Z3UkW7wwZ5UiYJ3/O474i6S71MvLi31+tvUVZbz6/e1pN7n4nGwjvwazONKvgW/VhyvO0YGm3TX89B18FcmWpA+fNGGmdHffQ8ZVmvDvzowh1pAppfKuPsGwGYJXoUSpYCex7nKw8MaC6Mr5ZyIdq3NY7Z1E20VuLIjjU7NYu/OjJL7WgkSQYpdIdug4YAcBaMyqNoAQlgWNkCXbLAmRmX2du/pu9FBDZSVo6vJX4obUR7+z0WxIEfGunKBBAALD3bNNrZgDIlXaXAICTBSgBAlSPpYDZEwVvhzdzb0vEsTqJ7U6HzpXI+WAuMf4cAADMygLsBM5mvwhH/3rOKvr4RFxKOsGPv3hRmc9r7PrPx312yz0DkB2VdpfZYaQ+1s0UM1oQsMtSAHUz4Ky1/yujO2MpYMcs3Al+iJ3/N/+Wj7GsTDuUbwOM4lx2ug1wd+V+8p0PL2UuBP7sfiQwEwPCOkm2y4byWx3pnOCHOi/qIbsFkRXAWgcAOxh/bQGnVK3CGv0+MhOi4MfkAODVz7t/n7l23Gt3RGeTA4w1NSO7Kj+4x7izIa8PQXag257ZAQAcnVwg7tI7DTyfivPLDHPkDvWV5FJyJPCYPIukjJG2XaxBx4/jiHbmx9XErycnHst674FXG+HtzADgyY6oVz0NWDfATMzxfvVjl/0AEtmuwdsdUce1bat1Kl/Kj3YTtNUJvqa3b8TbfidCey77b3kKYNWCEREi7WJkGHYMAMrFb7Qoj+b+FOqNZfkBsh05ADgX0fEVbauUHyfheW9+jF5BXP447W+/7Kk/VgFAzwA/vS6/pTMoixmGWdkBb1DW+ctD5DuqXGraJSsdp7y3YgBw1a+7MSmT+GF5+6Cr3dIOADIxisE6tI0zeFrWZUQRc8D27hIEVKNnvQI16Hi8LMDVhrxZ/DiN9Dg7vcMOAPLN75XSoF6MgACAZmg4KSFK2vtpfL873jXDcDxlKYCj4+eiuumt49QCL5H3kYzw45w8lloZDe3AcMiOUQOAu7VW7u7Z0YIRbeBXFlSIdx7ni3GhGJEd7wCoRINSPoLVMpFX1ksBOYh+RDkeZh3AaOv4NydSiGOzgo6P8OM0oGXZF2kAQMmk50Ph5Ip3ISDcjvfd0FDOc2YFOrtmUooy/6rDuFPuAj8Xl+1VA4CXXDXoOGzeQF/uCn1RbcA3XclaPPhxHHQ4/3lR+843AGor+hmkzbssBawaAGjKgse58JV0fCd+aJ9u6NkD1YnMj9Ng4wrae6RFvx3JoNRA39GitfqGwLqw89cOLtNht69kRfuajnkb9GYE897tJNmyH2PGpAMb/mYpxNOyLqOB5oxyvLufCrgzjudCchUtUF3d+VvrXAmmx8V5/Mh8/VFW9JcRTpj1DzmxqvSdp6G+yR51DfqcGKg+YSmgXvxW08tIOl430nEtmzdTZygyXRwmypXLS6zLO6K1JhFi7oYP0uCnlJ7Cz+HyszvwCniejkeQXQd+3On4P85wAX5I1/pv5eKq37BscZWB6shYzgxODQCW03Hx7HCxAEDKj0ad5C4YEFECINh7AAAAIF5A5PDL7Rrl/VkAAAAAAPYJAHpBQEYAAAAAAAAA8AfpT1TkHRrV4zjOlNJ7VHZX1lB6XKJX8/08jqP+aUfvWY0jG10aKaWztdYr8cjdNXtHV9Kvnrykt7HV7gtFXj5ljPSsw7hS+WepZ3Jj8feYXo2l5Hta7dI3kDT5GSRx2f5ePfmqyJf88Wf9oMUZgzt+qe74F4z9VT/rJFkj+T2rNXzvUsCRYXnFI/Ub78LYqwNdlehmoz4cxL6Ug78ZlbJL9vz470b4Xh1QYipPIhzp4zq0RJQBKQ8plzPdtWfk+5F3R9Vj7FKZEb7ki4CjKtiISPKeLQOU6Pg5AM8gYNZtfVmxX5IAQLvineQyn9NobCnO/ynXMEetV5AVZc8bpwGvX5fNFOY75VirMBX1evpPeWjH+mW4EQAECwA4jlOzHTkADynONyvysQrH1uIu7ifdwhjRaPbGdQVDfyoGL6NOnHotcYRZf5n4PgIABADDM2eNtmSlZyjP1gFHmBmKeUxug0ZbIsizxXejOdSsMI4R7FJV4LVmhbzIQYDWno0dLuS6BfYAfFc2zfX3kQDAS/iyUR8kM/A66HAr4d/zQBtWmf1bLz14yqe1AZ+1NMfNArRBe1SI48qZOERb3tLesPm6lnvLfQG/AkPV21U/c2YSNQCQGJiqpHwc5269B+LsyM/dhkDuxj/p+FI3JRZhW7QuACkKvLAIHKRO4TSYlecLOt9kqVzxLKUUZR/HN/3RlNf6hX9FQVe8gz6ufFOWifbcGKhYbKFxizd80C/Uak6K7c1f2nG0PrjtKJR2MHnSFPr/tQ0D/bgaW843yigPCe0og7zI3D4IdE1Fni5oF0nfP76TR/WjwxOy3F98J9+8m6ntDmiH85/xe/9R+CuVd5LNV6J1GPqQnh8pgn5a63KxlkMsAfhkAaQpxtF2cNf2RzIAVH5IjuRlAm3OePTa0JvZzEwZa/NiREciz5jyTZuvloJWmOlJx/e84c3o0l1VGivR2XyGfToH7VIV9qk62AURsAlQLvTWzt8jHcZ5VrMf3M14FpvtpBsCZztgq9S/pp5E2BuQO7ypAt6ubtM+r22ffaXw+3HE8qZbr//nHFXUsE+ngi0tX/ok6Q8CAAQALsWJtL5Xmc/2ZpCZ4fyrQXuLkEeWBjWS8w85o7nhE/WUzSPOfyvK3IitKcTnKOfyNQKA2vlptTNMnQEsAdwLg8YywKhg9natazrzLDSM1YC/r01Zlg6XsinxZM7+LWdLEVL/1oGkFf1KHP+IG9s8+ZUdxpBb+fFdFy2C/VF7Iu3PdDlDBsB29q0VlWob4RrgexoVAk+FMebsoZg1A/e4p0JbR2YFAYUxzk/NArzkqR1/p6vL4XP2vRi8lyfzMlJ2BQFAkABAw7lL2yG5RCQ7K9c5yLvqMAaFyIMnpf4jO9HMHOOn7QV4d/RRAjTr92vQ/kwvNIQAwFZwtDbOac606qE/cxvh0+n8npQfs6r+RXb+0QKAIhibM1D7rQOjaDXuPzckUpdUo/SB6vyjbLpEAOCcBdBKm3MdNoVuVf6e50xeW4l632vO7aEauwjr/pE2Ambh2GiU2V1h5s/VyfOwW6d+d/pceto3mFpO8NLx72bCFEVvEADYBQARj/9F2U8w6kDrhLGe4YSjz/5nGd4rpC8/6vGvz/d2usSJkr06P/puWf62pzNJIFc1mGxT6g5MDwIQAOjPvi0CAG4gQgkAtFK31YHPHk7vNG73zs4fR+rWDcTqBGd0KuiVxY2o72f2P3+Z+c060XYgAAiQBbDYNU9pA5Wu9ve8ZouWTkWSibBQ4pWO/CEAWBtRa0dU5e9mpu59+2n3EwHApgGARfq/GvSDYrg9AgDO+qTlJqDZexHeZyG9GdsqOoIgYN/swcwAIA8+z7VD1aCP04MABAA2Bs47AMhCha3K37OY7Y4GDFYzIqT+g81mgCnyuJKdLgP9rDsGtggAbKJRq1kzJQjgbACsxnyxNDDFcKxH64Y/zfl7ziABH5nLx3znr52Re/XpM7Xfq4uwbXCLUsB6AUA1nP2/vyst1sO9cdDjFINGEQ2rEwHZ2RGvtu6vJUfAvLF5jU/baIZLKeHO7du5q2AgA6A7+/ZynNzZluTCIeu69xRF7ClemTDW3jOxVYwQ9gGsO4E5jvsNb7MCT4ncaJ9oOHcWjFUCgGz0nsVRPOuiORKHKq39bx0AUBR59L6AFbBL6h+nAeKOi1RfV3SAWkHA3Xe2WBb4CSak2kFAdm6fx+xfewPhjBMJnHT3qcD36MHtyqn/7YzippA4RQvZ0zruWwn9PZ35JfE7uAtAaZbEfd5iJ37EAKBO+qbm2JyRlWjQGK525M/aIAK2QQDFsdXDrm69Z70PSdndk/iOx22x5oi0CZAySI0owJTbrizusPfYSTpj05tnIPdt1kHNvqw2A91t138vQEaGIMYY3W1Yrg5yWDrf1J5MnV9sdP74TjXoYxrUf3u01ji/3O7B+t4X+r3vv1D+PPv5LvX91mnH3U8KKU++/QqDbjbol7QfeeDboncFMk7hR1aQ9aJNQ4l2NpLNwvweeZwHxpjEu4B2OFTbv/SBasOlel5m9ZHZzzJow837GW0JgBqFvVKn7e1XDt71jCNptNmzdotKU9WhLyMz3p02BFJmOJ/yLfmVQDqMZQDgUx7a8fe5fKoNj5IZO4V9DHMtc8Q6AKex4Rrd2DJj05xXoJAN+1IUxuU87q/mXWUpYIeTC9FkHVg3EMiLylc16qMbIm4CtNz4pPVt701zM2brmt/UXNObVRsA0DH2wLNxTn4/Un+mn/CJegrAIgjQ/GaEyx7qhHZaHYvhKALlOQQBMWdGCACAEaeZgsr66cyH7QOAF2O5RzjuBuhUblv0AKAG+aZGxT/u86vXBkAAAOwuHyfz+bRRf0I4/+gBwDuj0sEvzPDu+GemwncKACSwOOpGyRjA2cQLADAuwKd9roRnzkX6Q60foDGxVcH0qEp4xEH1vH1KCeoIbI0PPburk3FplFNKHH29ovHfbKnzvUa1Wzvor8VRL2++DPZBdP/AjLEn9pNaY2HqWE4/BSDsGHYaA0D8GRFm+w/CoJOqm/Vzif7gOmAAADyBoCDITBYAcB0wAABWGQAEAQCAAAAAgEXwrQKhdhCQv/y/Fk0AABAAAAAQNAuADAAAIAAAAOCBAQAAAAGATYAAAFjiBAsAAAEAAACLQ7BbHVkAAEAAAABAEFS0CQAAAAAAAAAeiMQo35i//HflRO+MUqL5C82/aAm/1Wtv7s1OPujelVRVrezxpb/57fdq38ng9+f7/9TXZ/RV5b4FCb2Pd7glojmy0ZPR7vuKbSXrHrN8r5jO7H4Gsgmc/v7T15RSFZSa1eIVu8T64Fhz+P1p+zXLwd9+S4me6fviQlKttd6vNBpKay3ffYtALxPpZcK3CqG91OfLRR/ucGj+PuhmSp9ueCR5/3Y8DPpIoiccj8yUDe67Wat/RJ0oAzrH0XHSWA/0sw2My7GYTfj67U4fMnOsuHLBtmcGNqLbhj80i5L9zURfU6RyqcCbXhvls64BotrGiGWEBM6tx/yVAgCJc7R0risFABw5G5HRotC/IpRlqs5Jdfx2zAX9zBq0F7IJt5ZceZw4crFSAJCV6HUDCSK9ET0rA20sIwHAVR2AcvSvcb1LVbSDV+yjMJ+/S9dx282lHR3Z+N9XRhHI5X+xMvPdPMhLyfuF+WwZ5GVRkldLnZV+31IGrfljNVaRoHUdODU1Xwdl3Orfh5ZefwwdIvU7XENXDRTlSZXJnrrbWuJQ86BcjTpYq/e0dFzLOVm9N2vstGQwK7YjH/vZuRro+3mSf1ENALRnw2WQcV4Ku5py1EGBqBOVamYA4JE10JBLS1nW1vE8yFtLnY9mE4qBzH7dwDshsxHNDmYF/lZlepK2mM3+j+PfOgC9Tnzb7d0zKHmQcaeiYJ+bKMR5wXfqbvzR91cPAF4GU2Lk39+lyO+oYahCw1aFTq1e0OwFFUmhn5XZ1nzT11VsQr0Z157xPwVZg/yFz1IHNdtWVKEeSJ1rPWRZxGNQZ+3A3fEq3aUo3HiisdGo1/7CeZ9B13IT4Dvfs2BTlOT91TcB3skBdbOddIOWpK13fC1CmsVQT4pBPw8j3ZxlEzgnRaw2nRXGTvqujBnYCE2ZLk1hZ/6gzR/ZdNx7/682jmYA8sAsvHaioyyMFqtChFU77T8Pv42A+YIn1SgCtn5fMxL2aMt58/dN+G5P9kfaWpVlNhvqSR6QwbuxT52xyYvZhB5tLRp1kp7PyAJIZDILZdLCz43o7BB+FIlYro9YOxZrBXml5d5/73/Xjv3W53r9/+TF7HThyL9r7UimOkUJTQ89kYzjaUA3sk04FXWqR+d8CyQ5ewVWCwAkfMoGup4HdSIrtZGdAbAOALQYIun47ACAcxqiHbR1+NlVqSTO38Mojjr4PPBuNMO3QqDMsS3ZmW6dPGa9Z8vGTl07C8BdW9fiZ2a2Nx/6/pYUAPQ6obnDkXtW+ZuzqEYKpz0TlZ7l7vWxdJxpFfBVwt9VnP9us5rZjkkrBaqlx3kRmyCZvPTS2Ffl0uvD9IUz0x9x/pwMgCQAkE6WzTIA0Y/H5cDtGjmDnDZQTIrzxy1wz9YT9FUvAPl2j0JvPbsyJgZPCJjr4LhQglHqviHzLMUPZlJhjdDqRgzOH3rytDZa9HnE8b4mIVd7jDh7A+oRey+BxsycEwBIbbj08ikTXdg9AMhBaNc3Za4LtF3D+Ut32QIA8G8QMKovmlUFVwsQOal5LVo9GlX4vmoA8DvYWaCPT+WtRCe5agCQj7HjZsCcMasLtPHJQcB74ao8wMOyqf5RAwBrx0oNAEbkXT0A6O2A1jQOnMpbJ6HzNbBxGD3LvYJh5s4y4PznGciMvm4RCHwLtjUuv9lhslU6tlTLsUpkjOK7tAIItQyAZ6Sm3dls9KxEWXc3VBTnnw5g9dm15syEGuBqFpGaaRO8AoKsxPfIcijJAowc9eXYbmqWhnoawAw/RMZFV4JRoSpB246ZPxBJTyyOyVo4hoh99Rrjc6Ku1QA8r0KnrFlfpjAyAFx/pOozqAEAdWDa8b8dp16V3ihn3rNS/57o3DUMNHb8PyNQloxxIbRLu4x0UXrGEt8qZr7sa4Sy2hIb4WGHNS//0bbx1TjwEAcA0ojm6pn85TfTuF0FAbvvjF3F+QAxZmjF2fn36GYh3dGrcaPYhCsbuuqy4ZUdLoo8lwQAdaLueS6JiwOA4ybyzAft2NdsB/MeQb9nKgAfxQfmo5caftfl9x8lizd6Xr190KY6hXOgr99oUmbYkYO1V79mBORSO5wntEODH97OW33cfj8+3tuUVoSN9ggARjfUPWmX9KyZDDIBMRyLdir2VJYTDYNYjWhGCAA+HX1lZAbqxDZ72eCqKEfLOXVpBuClyNoN8tqQck4eSABZgFWyANqlU+tAWyxtyzmpX962kxPEnEHabMlzz5m5RvEg1wuA7gIAbQORJiiMJP2DHeo+MwAEAXsFARq6I30/GbfvDKJPmu1ITm2uju/NdqoapYOn3Vj7Y2Qg6jHvzPfJaP95wPlr811rpgLMHy8P3eE6Oa5tkTjRSDZBIwjwtsdc/2ExCUMAMBAAvAYxCQfyDKI06U0Y60f70oHUv0XU3xt762OhAN8xcPTAQnco9e5HbAu1nzWoXagftkzy3igk+0Isx9TDMXsHI+5t/SUO5KcQ5C+NiupMcfGMr4BTNmSqbghM6b/JTRrsw8j7ybGtmt+g6nh11NNsZPzOG2dWA8iglEceY1Uu9Fx7TE8mvz30o0cvki7zAgAiIw9nYwCsjfO4P4q086Uk4bCgjtfFv+8xXhaTL0rg/k8bBO0FgmC364A/zxAX5rsQXt0ggDJWAADEgNWdCkBQ/G7Sj95sE7vT5xgTSl0JXBAEAOvoLIAMwFKR6919BNQqhsgA2GQBEHwBQDyd1bizHkAAEMbRvJf5/CwFvOLFGruNDQwJAMTSWezPeQB+NxPaYvBNBABjwFIAAKypt+lipg+biAAgpMBqBgFw/rqBVO+CEpwKAABHME6HwA4iAFgqCBhJK78XDeopzrLnPwVGInn00+k8NQAAAAKADfv0nnLmBAJdxw8AgEgfd2w/7ASwPJaeZbXWOI9nDUVmFlWJyqM7xv239LFaXwEAAICHZACEFc4AAAAA4PH4AQsAAAAAAAEAsD9QeAcAAADATuvd8WcPQJPIBPYAAAAAIAMAPAPYJwEAAIAMAPDADMBf8oAMAAAAADIAwP5AFT4AAAAA2CkD0O5R/jzzzw8AAADYF79gwSNQL/4Oa/4AAAAAAAAAAABPQfqT6s3M2eM33H4jpXS01jTocOhRnx+aVX+hpTM4198llzWe0La7dlZD+lqdTKABGqABGivS4OK1BFA6jq63QSx3vvF+r3SmdGaQ3udVvsUoABjdOPfOj0z89l3fue9ZXYAkbePRkZOr9zw2LIAGaIAGaKxCgxUAnDcGm+I4e8743fhrOOLeN6KvbVsEJKMBiEZAQ+lb/qMAZ2ec8sXfVQflTKABGqABGrvT+PmYCUocfC97UBmOmeoUNZcSvB1uC+L8LdrGuX65CIJOytimgd9BVCbQAA3QAI1VaHQDgJ5xzcJ/q0wjnolOZtXZ/wp1+Ivju9+WCjhBhHYk/f4naIAGaIDG1jR+bmbrFOPOmf3vFgBoblrcIQiQ9u+VeSidrID1uKpE1KABGqABGqvQ+KwDcN5EFK+ZWSXO1E6hIR9Z562KzqOX2bAIAKzP5p/EGXY24FfvmdmB3XtEnUADNEADNHan8XvhJArBOY+sw99tBuwFABK6XMfamwFLNsv12m1dird+/Km9ETHf8ErjRIZHBsB60w5ogAZogEYYGj9MQ5s/flIHabXfQMNJlMG+SWa3M+rwn4Ntpjrt2gkINNqqHVGDBmiABmhsT+NHYHBHnf/IbM569z+lb9oz0ZmbFmfRPhlO3atkMdYGQQM0QONRNH4ERvfOSXKMtSQLYBkA9IoLWTmiXQKAevG7ez51nuEECpgZgAZogAZoMPDbMdDcNHBlPsvZB2A9+7dY938SzsH3zMoGMyJqrA2CBmiAxmNo9AIAThDAnSGPHgfUdBZw/vMxu34DdgeDBmiAxqNo/Cg6PomT5AQBVhkAyqY/XJu7P7A2CBqgARqPovFzzIVGADDinHub/rw2oAHzgbVB0AAN0HgUjV4AwKkIJ6kep3LV8IDzH70FEUAGADRAAzRAY7sMALcmu7SG+0lw+hYBgOe6/0plgFduM2YGoAEaoAEaCgGAZEavnQXIHWe0gvNHAIAMAGiABmiAxjIZgJHz8JpBAGWNXuL8PTf9FWHfPVAH244MAGiABmiAxmYZgJ6D7FUK1AwANJ2nx6a/196C8mdwrOsXWAYBnzf17ZwVwMwANEADNB6fAejN/imOgztzlHxL4vw9Uv+UuxJe7Y+wyZCS8fjap5TStB9mBqABGqABGrqVADl1/jlXB1ODgMx8noOi9IxGwBCttsBJDJB2BiqEgQZogMajaPwyHOB58XflxplyGmcZAFAdm3WKO3JRoVdt/qcGAqgQBhqgARqPovHDcJJV4IStHLok/R8B+Yi9jh69fdYZgOPA2iBogAZoPITGD9FJnsJ/09wLMBIARHKwlM2BM9r12uz31AAAa4OgARqg8SgaPwRHTbnWVWtD4O4BwCdfIjjbp6/9Y2YAGqABGo/NAGicte8dC+TcKLi68z//DAplvT+C46WeVkjH3qWRMTMADdAAjUfR+E0pVaVIRSva6W0GJDuht+NilpHYXT8qYYbNPS3hGQA86SZE7A4GDdAAjUfRmH0bINchreiMIt8oiJsQMTMADdAAjYfSiBYAaFf+ixQEoM3xMwDHgbVB0AAN0HgIjUgBAGUz2tOcEoAMAGiABmiAxnYZgNdxuNcPzh9ABgA0QAM0QOMBGQDuEbidd6ADyACABmiABmg8IgMA5w8gAwAaoAEaoPHADAAnAHjSUTQAGQDQAA3QAI2tMwAU1Ic4/6eW3kUGADRAAzRAYyKN34nOvfdvmPUj+JiVAcBNZKABGqCxPQ3XAOCtMt/TiszUjhOeVQ0QAcDfETUqhIEGaIDGY2hEXgJ4ErwvBspHf+3oaRkYrA2CBmiAxqNoIACIkQV4BQGvmggWwUA+UHOhF1EfB9YGQQM0QOMhNBAAxAkAPp31Km1FBgA0QAM0QAMZAKDjVCvaiQwAaIAGaIAGMgDPQ/Rjja+jl08EZgagARqggQwAYB4ERAsE6lu7ngrMDEADNEDjUTRm1QF4Oj7T7Pnjv6sT3eNAvYVvETXOIIMGaIDG9jQQAGiFY2lonKulQ/7Ttqeu7XMiapwPBg3QAI3H0MASAAD8G1GDBmiABmhsTwMBAAD8L6I+DqwNggZogMZDaCAAAADMDEADNEADGQAAQAYANEADNEADGQAAQAYANEADNEADGQAAQAYANEADNEADGQAAQAYANEADNEADGQAAQAYANEADNEADGQAAQAYANEADNEADGQAAQAYANEADNEAjDg2UAgZ2ncmPvJ9AAzRAAzQ2oYEMAAAwI2vQAA3QAI2taXg0EBgJ79rXADFfPP7PZT+DlxStxJumrVApJdAADdAAjWVoAAAAAAAA9KMHRFegARqgARqgARrPywD8GDToDqABGqABGqABGqARAD9gImiABmiABmiAxvNo/PbSCsIGUd4HDdAADdAADdAADVsabhkAVFkCDdAADdAADdB4YCVAVFkCDdAADdAADdB44F0AiK5AAzRAAzRAAzSQAUAEBxqgARqgARqggQwAaIAGaIAGaIAGaCADABqgARqgARqgARrIAIAGaIAGaIAGaIAGMgCgARqgARqgARqggQwAaIAGaIAGaIAGaCADABqgARqgARqgARrIAIAGaIAGaIAGaIAGMgCgARqgARqgARqggQwAaIAGaIAGaIAGaCADABqgARqgARqggQwAoivQAA3QAA3QAA1kABBdgQZogAZogAZoIAOA6Ao0QAM0QAM0QAMZAERXoAEaoAEaoAEayAAgugIN0AAN0AAN0EAGANEVaIAGaIAGaIAGMgCI4EADNEADNEADNJABAA3QAA3QAA3QAA1kAEADNEADNEADNEADGQDQAA3QAA3QAA3QQAYANEADNEADNEADNJABAA3QAA3QAA3QAA1kAEADNEADNEADNEADGQDQAA3QAA3QAA3QQAYANEADNEADNEADNJABAA3QAA3QAA3QAA1kAEADNEADNEADNEADGQDQAA3QAA3QAA1kABBdgQZogAZogAZoIAOA6Ao0QAM0QAM0QAMZAERXoAEaoAEaoAEayAAgugIN0AAN0AAN0EAGANEVaIAGaIAGaIAGMgCIrkADNEADNEADNJABAA3QAA3QAA3QAA1kAEADNEADNEADNEADGQDQAA3QAA3QAA3QQAYANEADNEADNEADNJABAA3QAA3QAA3QAA1kAEADNEADNEADNEADGQDQAA3QAA3QAA3QQAYANEADNEADNEADNJABAA3QAA3QAA3QAA1kAEADNEADNEADNEADGQDQAA3QAA3QAA1kABBdgQZogAZogAZoIAOA6Ao0QAM0QAM0QAMZAERXoAEaoAEaoAEa+9D47UQXI9FJIjwDGqABGqABGqABGnY03DIAh0PkAxqgARqgARqgARqKewDAENAADdAADdAAjfVpAAAAAAAAXEQirV0uQeQ/v/rn9+/LKR037999t/z57/Pq24r03ul+gwb9zPmOsO31pj2l07+TSKf7nQseXL33D23BGGbDMctv36sdPbh8blAu1eVUQYfyl3bUXhsGvn1H4+7584LunRxL8J+dSun/J2/C8c6j43rB43ebqjYrVZZrs28q0r+S+0PoA/PFuN/qkoIenVff/Qettc9fbt/xz7MX7/d+79/PnHcF9HJrrbQ+CqUtHX4VQjvKF7o92uXq+2/tyZ3+Ufl1h3zDg3LDV8kYZuMxK5S2UnVBqAdcGWX1W6hDlHbkQf1sVFmhPv+FrjbyOy3GeKvaH4H+ccAdz8zR+0FdYdMx4l9m+gTKuGvr0a1+9gIAliMJHgCUUWUn0M+dAeW2ofd+uWmPqE+MtkoUqAiMShvkGXfM7owgieaAHhQtx6SgQ8M8J/ChMINU0vNBA4AilOW8QACg7TBnBQDD9uZLf8qoHhN4lKW2sBcAFOWGzggAsqbCC4SnKLSBFF1/tKdwFZw7+zcOAEZ4xplxFOK4Z8MAoCg6J1ZG4KKtKjoyENzlkeeDBQBZaUyjBgBlRE6CBQDD48O0wST+E3gksvHf8OO09PJaoyofa1Xvf6e1ZleUvtFrz9U6jsZ6XG8tnrzuQ1hbPoh99ZCPWe8fjnrQlNen86D+XK1Lp48fV2Y4elkZz1eCPKaBXzWSw9d+mM+fhg05B/ucFOyS5jse6MnXSdwXRN3bcnZktwzoK8X+T8kAFI2ZhTG90SUP7vptudkTMNqeIkyVk98zygAUi/FSWAIoirOa3OxRGj8DkInfyANLgoWp70Vhpir9FWEGIA8s02TqvhTlvmqlywvVhgTKAHC+dzk2b98rg99rTb5Pp1D77rUHIFsYMqXUW2E436xg4CgpWsp6sEY6V8K3EQdeBh0y1cBwDWZmKFBRWNfkymb+8isjuqPgQKQBQGa2lbtUECUAGHZOF33PQQKAQhyT2+eCBwCccfkMAPKHb+nZfUkAkJntZgcArEh2cAek1gycOovk7jLmrPVmJQFlfUcwmy6jzzsHAKXZBCzv38qMsZE61eGZO1O/cqAAgBuQaq2LewYApdPWbwGdiM8TAwCOnBVGAGCdGbuy4aNjUprOPjhOloQbZIgCgPdBLAJj4jF4Go6P7VCYO6izoqHlZAC4RwItNwZRAgDuznDWOx4GczAwzYqOqss74tEuarZBa8Ol9PkIAUAvMJJMTMod/SABQFFymLMCgFGZkAQAmTLBthrjb/jtbCyZsQHvqhiRdHNEbxNbVWijZKPS0dkwUr7w9iS+X2/48c7PbMgXS0RuG3dj0Lfnr4qRnB/6ebdZrDB1WHuzlmbBnxp4zPOg3XxtDE0f32gfY4PysfM2C44UcKJUPTpnyfevk8J/Kke5+P+rAbAW/nPA+BW1HZn3Tjwz36cEANyd2VbOnNLWVRwCdafxyXDA+c2YvL97F+xxgudGlIGs0Hfurn8NfRq1BZUYAPTksn4E3/lG1mvn36MFPk9z/hpjUZ1lm7wHoFDWGghrRN9SHLnzd9INJBZpVsn6dVZK2YxuCOqlbrlr77M2AWbD9LzlEgD1tIFG8SNt/lPP5Us2jamm/2ekxT/WkTn9utswVzr8zi3eJkDOvqq82BKAtAiVZP+Py0ZPagagl4qTRIMnMTLeIaqsht/hzALOTno4Soq9EqLwutCsv6cT58czRfjt9xT/eTGLz4J2avH5vMksfMvq3en/E1PgdUD3vTJ1+U0/KVkvaYYnG8/ED6JOSmbstaOP75k6/2yA0myOs/HsqhJgd0YaMANQqDNnpQ1JRTn61DpGNloHgDMLyItkACi6QBkLKi+kNQsKkb+SUwDmRwCDZQB6ulFujnXmjgyVyRmAkQ3eoxvcrO8CkMqrdn+ydwbgR2ltR2Mz2bfqY6/fKYiYdwR3bE5hpD9jdkGlWw79anpe41SJz7zL/Z38Z4XsHOX5LOQ39ZZFyvNlE/29qny6gv06jXV79np/uen3qczHquR7h/BzADsvJ9QJNL3a+goEIjoGaQBwlQa8+vvPq4olAcC3VHM7/i7TPXJC4OyM4ejzKwfoL6yyvMFNU8/f5Ea3JXclsSvxG58/L/kR49dB8KuhslF3yZdjbA1qNYPyyX/qd84BGtVAAak8asfEozTCICcz+U/hsWQfzUjmgLou3duPchKf55xsiOxAP9eZV+rTyyn2dHYFfdRc789E2f7mu6ZNvn6PdcFNS/Yuw6mLKJ9EmDmOWKLII7xrSrwpC804pMpv1bdEGIfzGF8KyAxe1BujmoLqY8+O1Iv+5aN/5DKafTq/2OEatK1Se1kY+ni1SbId9OO0CAAWRwYLhgOOz+ibkx3IB78ADuTgf0EAZV1eaqR6pwLOwedX0//PAOAzCFhlj4DHGr/Vbn9NHe7VMxmd4C0bAKycspMMumZ/V9wopKGE58VMoxC/ubPMzTS0ozzlpvbJz6c0LSnw2UZOxc4ru/EZiFXI5RJtPA95FnaKAP88aIC8BFNr9lfA53/6/toR3+NDDigXGnKjsdEoaoBRmM/noDbgm/O+2kV+vv3uztIjmF3LRlXBO1PglQGgPqdZgGFWFkBjBpoFs/8ej3qlWWug4C532lM78hI1Bd+Ti7vZI2X9fYWlB27Z7XOBfl1lASQZlcbQzR2gsXdJYhersTz0dDbGuI5cx/n2fmYUl8nMQibUAgnS2wCtSr6O0Bq5jtmUP0yakitGOW3qltsdba9iiWhq4StOgZxCkJviVTTHg9fka0797WYZLFpFsiOePLagxdCVSLcBzubRlNsAObMLSko2H7yiIKulNfOXSF6S2ikD0WIW/ttxzNmZ2ts40477MsCrzYzed7BXQr85elcmjB/wbxYgfxmTk2D7uMdCAcA1A9CLRjOxJGS++f+R2RynHLF2ZCa+yGTkUhwB/4fKeBpkAA5mJJ+5M+NJGYCDyM+sNbPxGj9kAI6RTGT7uGCNXfIaGQBkAGZlACizOe7sthAj6+izOkoRom9nZDMjA1KOuMU1Rq5ype6cfedR7xrpCDy66tdnFkCyc/hzXbNEWWecuBs/ciaAk4lbpZYFsAF+jYRfO72+qvM/GA6eSi9qECAtbiNxgr2AIwJ/qJv9uP3/dBCS2zsB+yCAYx/ebd0Tx6wu+u3tAoCswGzNIGC0FKOlENyVc7Qs4bvjGff3Eql54BvRDOjdOfbPIOC9EA/1noDeyRkYvxiBwPuYXlXNe/JRasjpLIyso395X2tdR3L1osY6/Oj6VWGsBVL6XhTXsyxPAYxeB/zJUwnvol0HbH06Jdwa8oPt5tLr8t7r2zuNnRWPZl4HrBXVpUN+Gx13Daw3c6yG/Twv2n0yefBe6OZbOvspa4NVwLvjiFsUp3d/A/dGw9c7q1/EAgDAZFgXAvpMgfWKInCMFqeAxEjo2dvVVDsG93O9luskXqnxJxp0ThngKPcAXMlHITj1b3X3ORtFkVIFACBMAPDNKL0b8+VmKhe7nDmzfO1Z5BPwvkbec6RR20/ZGzO6WRQ7yAEAIOMHLAAWDAR6TjRyELDq9wEAQAYAAFQhXRYpC/b1FcBwjodRgDV/AAAQAADLoQicWm9jXXRn+NrXMRrEYNYPAMC8AEBQ+Wvq9Ye7gcH/1RxF7+6IQxAcRMwG9DbIfntvaKMfqvU9RucB4D4A+BCm8M75rb0IJPbAXcGjzzLKuZM1WLX/3y7+yV+CGqT54YTRTwAA5kG5EJD2ZSCPLU4DAIDIfj22WBJOAQARZsARvwUAALA1sAkQiACtXf3YEAcAwC20lzVWXiZBBgCIkgUYdd5YrAQAAEAGAJjgwDl/f/Ws5Iw8jsIBAAAAwApg3HZ3t7kw44Y6AAAAOZA2BaYEAG4CjmNMAAAAAAAAAAAAfyZIb7Mxzepq3W+llKgzwfcqaZL66SeB5mcltvNqNjk6e+18I9/xnkj/W1W5buW4j2+Xm7GrBHpSur3vaq31fyvDm3Zop6Ct5LFSaPvtnQUD+pU5dopJp1jyS8OmEMb2dGiLKp8EbfmsqFlv7FWhyqSgLd/aIPY539qiirf10jtkZjGD7rc+aH8rDlOUCsPkTtGGQu1zp83lrgBO5xt3/ZXQZ4/jx7cLtdCO8HlpYSCtYhts+V6lnYPFloph24tBUZWiNJY9W2Q2zoI+c/W/OLSlcIpzGbQlM2S6GMpLIfI/S/mkjoABgJbjpwQAmSO4TAecicJEVp4b+hwUYru4TkLkVBiBRzMylEVgkMK2U9BWi/YXqXFTcjrZIdBQCZiUAgCVIEXYlmIhU4y2cIJbS7nMDHkUB+C7BwDazr8XABROvzuCwP1G5irOBX0JRkv0Zi2D/IdudnJMWfrNVdoplDFNx5YVMxcjRl/b0ZmMtVIAUDTstmJgNCxTg7Nu1TYR20K1f3nEdmgjUiEgzo1oEXG1llSYa2aj626v8/Tvvyrg9d36VWGuM0a5vKcYrdVHbWe+GKd32TiZe3i4bdfeWzBTvw9lXmnazsOZ7+WG7kncE2LR9/NGrkf3tmmgRmpPpACgCBhZD4XrURUH9rwQvGIkjJmofFIjz3XqWkHAaTCeFo5phXa+68e39mrqTiHK44qozAB/tt205HvuOH/vIOCbHa0Xkx8r3T0Ztl2jcNpWSwBlJLXfSa1I9wCUgbTU5bfevvGtjZwlAG6aOAv3FxTLpYCP1HoZXUe2SKmv1E7FVK5b6l/YbnFqdzDtrmEfNZcA1NqjsNattneCuRz0/qM857kfIWvvRdJElFLAs9Jor0h11sxFk04d/Pe7yLbdzD7S4POWs+mrWccIz1dpJ1Xfro6NaixbWM5ozkmz3/OIs1SZjTM6nBn8eTNG+SKDoNHOqvzcaFvSQTuWet6MoRt+gwjx7NRe+miHtO7BXWrMy5GMGhCusS1flJ/7fHWUrxEDuUo7e466V6fjFHzTywl9tjNPoBtlT4N3W+rBrx77xHs6qtGz22YAVhs0alR8p6R1Md7UC8fxLZrnPm+Fb84uokGK0E7pXpo8se27bDAEgCnAdcC2ODeKgLkb/CrzeYsZ9QrOP0o7X4FsO3hZuVVOVgD74yW/vR+AAMB0VvI6ilIXaCvHQWh85zj8Zv8rzBa92/l+WuXu6GreiMe7ORe0hW+jJM9tH4wgANAxqJ/nqmcYwWws9IWZHeA+b+lUo85MZ7Tz8+jsVZaKIk8zMxfZ2ahGci5oy9j3nzZGCAC0kFIa+hnP3jND0DhBykrOH6n/f2nko38REFeWnpT6j+Rc0Ba0RQ0RNgFiE88Y7/KH4/2WgSgDAQD3BjnPG+cowcpTU/9Xm1MTM2CjBpPePM5BacHRxW/L6/n6AL4skQFAECDD1ey7/fnzalMXx2DnhWb/q1Si82jn1fi+y8bdpr+7MtBRNi1GpZXRFte25GDykwPLcrgMwMuAYHemnHdFwXFzZ/8rpP7rQB+tZrWSdkqzKhLZuBsv6bKFNo97x24jOBcr2UFbYgcAkfjSh0ZpTeZNXVl4M59FKWB2SUhlnlPKelJKUmYi/wqz3CXnO1mRrqQ8raQcKrnNE9vJHtePtnJvBCySEtfGPBbf4Gl87fDwjZBoi3lZ6OES99H4MmMJwGNNI0JlvFXxvpv72yVJnBuypLN5jYyDZkq9DvZxdjvzQT+Tn28yaL1LUb7JEJVXp6E9+PYdyvHECBkAqxkm2sLX4frgMVLLAGhE+70MADeCQgZA8ceYNWbmuGfjy1CkF+iUgVm1RzvF95sT2kq9QGX0oh8tHudJMzpK+z3umkdb5JdC5dGZdzS+zAoAeg6A5bg7TM1WAUAELBAAcIVULNQKfdJO/VsFAJx25htj1tO5bCAnVpMBCo+LpvNf2LmgLcLl5tGJbTS+aOJ3MOVSjVIX7xf05KkpEv9UfgSczPadk/ojSf173Ek+2s5M4PHrG21C20/Be1La1A2L3ql/iqwVpeUvtEXelp6fyhvKi2kGYBTZaDa7QwbAerY85dtGdKWp/6vI2yoDIGlnZqTp/2m34lhqpv5z7w50xjKUZHOy9mZD7nNoi35bqLJBzRQswRdNUDcBRqz1DjwX0kp03qV3pe38tpGTOuvQ1L0imGlf1Qmog7S/jZv12FHsWx34DtpiP/t/4hipBwAcRcNtYIBHACBJ/XtXsLOkd7WUofX9MpHHGunUXZwL2jLell57dgtG1AOA46AdJcJRvoUxes+B090I0kp03lUCLSvmZeNsRg7OY4+iUis6F7Tlmq6l443EF7MA4KV450cEvtL1t8D6M38Nx2TtRCwv+ik3M3+r2b83jzWcQ7n45UH6kZzLU9siqQXxlDHigbihYoVNZ9gEGKDGgTE/JJvACnHTj+YmQJXNaoxNT1lRTorSkb/M/fZbu8ugPbp7v3dMUrphTLMCJ9py3xapfIjei8YX1azv20dbJ/2vnm5W7tBdWrS+aEYJAILw7K9vB+fHt9kbpdGNGIHfbairKaVq3E6JbP8l3wpy8o3ODB73jmr2lhrvOn92xrKXJUia73XGCm3hj+/dspNIrqLxBRkAZACelgGQHkfTOt6aHdrJnbUUZTmJxGPKEUDxLK/DH+mxQ9FMEG1ht2XoSJ+kH9H4oomfAwDiQ1rrf/V2Xs0SLI7A5UA8ptBtb/x5/Xp3J4yuvVbDb6Mt9m3p/fvKfBEhynXAAMBxqucD2tkYtEbpWp5YGAkCekYwMw2lZQDQa/MMR/fEtpTB9zlX80biCwIAYDtcnSvngLpo1gYcqUY73ZX/pu1nAB6fB33XPgWUI8orOZcntiU76M6qY4QAANh+9h+1zsQq7aRmLiLdSaGx8EktYhTFuaAt8wLjrPicZzAiAvYAAHBMz2gndYYSbXlltL4Idb/Eas4FbZnbnkh8kSvXzGOAT8XIMUAAeKhuvG/2o876zys9+kLH6yjMX9khtIXcFs9bPP+SnWh80cTvB6F8AAAAxMN7ZuXbFeGceuuzZpYvWhVtCd+WVeRlbCIOu4IMAAA8XAc1Nxuy7O6X2SXa8r0t0uI/d46VVBQoGl80gT0AAAA8Hb3aAYn5OwfooS38Gbdkhlw3GSMEAKvB8eY8AADGjKunc0Fb/NrSe2+VYAQAAADgQOFimZELidpFmVm05XtbpOV2peXj/yrHG40vyAAAAADYZwBGNl9JZnVoy790rWb/O4wRAgAAAAAD5/9kR/eUtvTejx6MAAAAAFwYp3MlNxOiLd/bYpX+Jy8DROMLMgAAAAC2GQCNs9ecWR3a8i9969n/ymMEAAAACDMAo/fKU3+3M1i05botkJf4fAEAAAAAYEEkpXWF4XKFF/WWOfCuzvSetjmV+pCFqSEpT8sNvTphHO9qvZ+KNAuXhoDme1/u+El97p0me9w67b3l+4AcUcdsiFc37RuxCfXiTys9yF/6dxL6lAzaom4XDOz9sN0w8kFDbfjWJuvUhubmCfGmDIO2eKEM9CETNn680ymcVBOhPVl7Q8vgOIo2+zBpqmzk6dAsxD5kThveaBZu+zvt5ZyDZqUsCe2hplMv7c1N+4qyrmcjPSgMHrLlVWiXrDa6adgJlvxOtl3DfjFiAKC+G3KQ+WWxACAPtpkUCBDbUzTXtAbGUWx0GDQLZzyFNDPDILHa8EGTNW6C9lLkWszPP9/kBDKUXdpediE7y+T7BEBTVt3sgmEAkLWcrqE/FAcB1vhRSrdUYirECivtjiwKyxX57TujOJnpLO8xPBX5nhm8tZbFUZmtSt+Vpi2t+UndfZ0n6rCn7aLYXU2ci9jaYmw3otiVMAFA+WDy6zKDk7gm4yUAUZ2/Jl+0hGq2sl/Ji9aa4xXfz4u+5wXkqt60fTQIOR/IT4nMNoVvfONhIsp9Ne7jqHytPmnY364MrnXcpUK81l9mg7oEUDzaoLwO6ZVGG6It5HthPqOxBDCUZr2gSeKd4rsq/PzzTU76NtISgJbu5c63soZeGiyvliBLAKptU9q3MWRXvJcAJKcA3l9INxHRyYlQhTswNSKq0VlmJfTB44TCPzNCAU/bRTRrPY5DdG9oXsnHt9lzuclCnMx+ftK9u6/8k+5lv29ofvvL1Hn3ijfphi6HR3ezo/r2zWFeCfWud9qAkwEb0T1KWn8o9a+wu33YLhi0iSy/Bm1S0wNKmyIHAO8d/hyQ5CAQjejYc8cQqKSMLvrACVLODwXPzLTbSQxIOKl4VoAUiOYd3xNTnv5RVmI/M8Ngd4/SdgKdWx5eBAAkvv95V5WfKaX6pT2VITOjgTdV76n6O6p7dkZex9kO6ehGbTK1KysEABSFYDtVoeMoRIXUMATSPjSu8dDi+wwjBJoxac561+ObxgEA5VshdC+SrKJNem2yhGQTICXK8tiE4VEnehTsmcNgUIVa0QBgg56eZugfsBp+B5QhfxF6tdn0YABQg/A3E/jIaeuLv6VDs0K0AcAkCGgC3bvLHoxM8ZqibZHYsZl2Bm3SgGI1Js9dodxCRIW7i1ehD1mye1iz6tRHe1xOIYCm+ymTotze0nROWUhPURTFHfcWek+yPSP8VrID2alCKbkwmUJ1wke2KdoSQPSZ9UqzfynqAF0AAGx0T6J/0c7VSwqVSd9DmxZcAqA2PhkK6YiC7hCknHD0ABAyAJCgGNpLbbtOCWa0loLRpoABAKfKmJWyaCroSC2BeswLOLDODwD3dikz36lK7ZB8p0x0BlYVSk+0ybxNrgFAdlCEGbP/kUGtju0EAOB+VjXyPOdETjZqv7dtsEpHjzg3tMkJP4LGejhV6TenplMAAAAGnfEOzv/TuaFN+m0KnwGwyAKssPlPmjWY3Z7q3B/QXFNWAHun7FVHJTPlV1KhlJPZQJuc9f2XKTASIauKigFDuVdQApoA8H02aB0EjBQpe3d0lNkrdZMj2uS8GfSHKZiaM3btb8HIAsBz8bpG9/1XO/aC87x3EGCZcqY4Nc6VxNQ7FdAmX585PQOglQWwXvuvzu+hWh8ArD1Lt4blbFDbnlIqlPb6gzZNyAL8MoSx17Fs6OwKQaCzcCCnn8UEAGAbaAb2FksBlEzqyF6Xnh2uaJO4Ter4URCaHiOyscC+BwBXv5WNAAAAz5r9Uyc2EWb/HLuX0aahNk0JADQiobKIwu1oRAAA8J1BS2aEFrZTMpkbnfhUtMmsTWEDgB5TsqHCRYV1VqTd/AAA8A8ApEa9N5ssD+Ad2jShTb+KAm+xrrGy4Pf4MbK+p22EZpRDBs2FZgoAyR6NjNXd5jCtM+IeJ6m4VRLRpon4VWQEZV2jKgvsqhmAEaW22teQDfsKmv40AX3nP7IXihrs5Rv6aQM+RjwB9dg2/RAawTFOmmlvCu1E/EW9sEcyM+y9gxMNAKBriJvTrHD2UkDEYBNtChoAVOGs90mOjtLGdtBPOrSnCCYAODn3q1/5o28Up6u5VHMS2hsZcNgLtelXcfZPDQCo9Ze9mEdxrD2kjkJTSkB+qyX9aaQeE5kCgJPz9wr0OY5h5aUAbPRbqE0/Bk5YYxlgp7K/1NnBa9bxmnm0txkIhW/ngQAAALxh4YxnLQXAUa7bJtcMQK/G9uhpgN3q/p+H7fE8rQ1IEQMj0ASiBvaWy5CUUwGr8g1tCtKmXwMHPLoMsOutf8koCNAyRLiZ71kGBhhzztVBZnpLARHlMKNN62QRfoxm4CPLANYX/8wOAjSF6zyw6x8APAM5z1NF3st6SLev2ybXDEAZZNDIBQw7zB5GisO8zw4wswQAO2f/7c8Z7chO39OgI1k6Rpsm+blfYec0Stn+08mU0ivCtnC6EWcS3AuL4PgB4AtSSivovdRWUE4SaQUUIxVKpcu3aNOkAOBnUnoDl+H8rdyvgkUn4d/h/AHgeXaiKn6rZ5sl9pnyXkWbhtq0TQCAIAAAAIAO7VoDIzNUi1kt2uTs/L8FAN53XQP3PHmvDQAAAIIAr+9oViil0ESb9AM9BACL4SrVN7ppEACAfe2DVRDwmnx8m5hwJicn2qTapikBAOfynas1bQQBfQV/rflXR169olPpr4BmKJoAsgBawcT7vQjvMkmtUMoJWtCmiQGAxcYEzcuBnhgMAAAAWAUB1jNOSZEytGmjAKD3HgIA8AYAAJvZOwVWhY1GnBraFCwAGK0zD0dHc/jva0YZGQEAABxmpdrHizWcGtrkGABYnktEAEBDOe7XjFDyFwAAyyBg1MHVQ7c8OdpkjF+HAOD1vmVZxZ1RDzh/AFgOb9UJrfRXu3Lq+wVEUSqUok2WMtpaO47784kaDqh3jO38UwZ4efzhp+jVLwHXkLBclEcFAOBhGLBLd5O0IduENgWw4a213O6RW2uHwu8OZSdFi/IDAAAAAAAAAAAAgP9lGAQzxc91j6t1jc/NbKSNE4I0zLe2jDyn0SbdQZpDP9/xiNGmuzWyMxBvrrJQ1UhuTfjDbEch0mLrTtBxuSvKYrLXRmjPrtqnSXum3A2Nsac9JNIqBH/4uQz+j7wxxqsn+91n/1taYKaVy10av5PyJ6etB5cVvi1ZZEJ7pW3Kg0sl3fcF4/SNxrcfhbdZoU2FKDOiZQ6F5ZI8ugQmbEdv+a0Y8SMz+lok7XIYFwk/VHmtPB6l0VAUZVJt2XdgvNlj7Gl7iLafwsfco39DKzP4QxrP/6BorN47VhwCgMIQHCvjngcVh/S+QLk4BuWbUSkDwso1NhECgOEARThG1LHR5geVljgwMh6XvEkAkNsYRscgOweeKkGIko/QCGRH/GFm0KK2n+wTJQFAGRDU4hwAZKKSjUSBedA4kd9n8CQrjBMpW6Lo8EqAAMDL8XKNx6jDk9CW6JhV1kp7XCIFAKXpoAyOwXCQZZABKwq0ioZvEszKqRj1M5Ss++V4vvAzsDb1urSGsl602zn2u2ONlMsfRt+/ek/6bq9dGuN3d9PhTBStNVcG2o2eVEWZWF3HdrUlmuM5elPoyeT/CmN8xd/K3AvBaXt984c922FlWyr734SRWmHMPK0iSU70qL0EUAZmbZkblRJ4ojWbIPdDOeWXJ2YAvNdAKXoiltfB2RFnCcByXLLRuETIAGQvPVWwpbn5L4GNynjPLxQlO1c677OzG4JskZimdA9AbwMZZ5OZhiBlhhIXZeGWBAFs50/giaXzbwYGPksciqOjKYbt0HC82SgQKQweZeNxKUbjQlmr/fYT27QvfOCk9gtTv7U3y1nugRHTE6TlqanyzKRFkQuy7DDtfB7xiSPHACMeecuMtErmpmBu2kRJ5b1SQpRU3dejSIP0NdJKp9I43aXdTkd5mdGOu7TkyUztJuVjZ9T7zsnpS4NjYRrj0hR1QnIMUWwDmLZGOgZivgegxdGXu2dHeWjt+zj6enuMe6cAYGabKIpZic+cSgJ/tfZeP4w5df3rn3WtKOOEdqAdEwKArs5e0O/Zit76ce/9v9oT0HlZ0uLWiyDVQdiZhxoBQMR6zDMGZnQmfmtILuhTmETZkEJte4KjQTsQAPD0jBkAUAq/k+9teVgAEIFW/vizcnzijADgV+Dwo99+pB6UEA2ANAiQVCCjzPwTYzypfN3iwiYAUEY5dK6IpT5nsew35LwC0/LwN4XoizT9oQ4Pnc+XW+0mLRZtMSg8obXpRevcuHhD4EebymgfBaclMtoRvh1FQ/4H2lI++GGNnu5qjAf5GwS7lbXsZjBa3zbhiTZ03tDKg/5wOg+pGQCNjWb5bQZ5KkZekjOc723Rzk5wMgFSXlD2ElTiuEpoIwsAcPShEXVROvPWmFVT9IZia8phX6cgK/RXUjtAasM9aXnNyjXqrTRiltaUhz/GHdXoyFW7tIreaF9FXJWf4wYAJ0M4uAHJ04rRADpBgIVMUZx/Feju1e8MoB+U4J9qO0ed1xGM1vvzhfkOp51ZcZzbbB7+ODp/rSAgalDC/Za0HxozgKsjON77NYD9UQnyrK0H1EBY0pc02C4r2yIN/K2c11aOkhF4coPPPJOHP87Of9TpRg1KpN+YUeJ15Iw1MgBAhCyAZupfO6jRLPH7PjstCg7H03lt5SiJfXovj08tlV9m8vBngJn1o6PvHa8MAY/iLEeCgJF3Of0aTQFepf5X3oULrJEFqIq2YMbs/3DWkfxmG3q1Ayj99XRe2zlKgtxd+T3pPgYXHv4Imfnu6OsXJmsJZfSghOr8tc7ia8/+JcKJLABg4TSLUIa9nX+0zIrGDFrbeW3nKD/83rvvo2wirAJ+ufDwV6CEiaHwJ+GbWck43DHl9SfFWZdDd3fmOx96KTPLs8Rl0kwGAN4nB3nAFvQC9KftYSkMw3/eOJdR51Un0hpxlEUgw16204WHv8zZ3SlgWI/RPYcbNSjh1vX2CgKohrMXMAGAhVFrA7ZAYxe8puM9gujPawPbne3wdF7bOUpDeZnKw1+mclVhR0Yi/4hBifRSjxlBwLe21gF+A8CowS4CWxBl9l8C89ZiAlGc2x852OjZ2c//zpNkwCQAGFlbkwYAUYMSapBxZwCtTjNQUmRPWicFYoGy3JccJgIS3fIMQs4Lh5KF/IvivJZ0lEJ5CB9sUAOAqqD0khrWEYOSXhaBuh5XbpyzZuopK/JsdpQNPCMLUL44wGwsk9yiM5668XmbZ28CQd1L4eG8tnCUBLu6JA9/gxgEybGLWUHJXRDA2YV5Hv+m53vOvwqEhjtDwRIA4JEFqAy9X2Hnv+cGxF4W8S4A8HRe2zjKt+97LwGZ8vCHaPSrkoKsBG49f8kxls9NglWxzSMFfwDAw2H2DB9FD6M4/zMQ//JNhsNr1u9F611erAOOwhyfl1ykqDz8CWQQMtMBRwlKOHUP7t6viopvVe0P6X/Aa8aciUZ3tkyO6L73TNLLeW3nKA/6pm9J/ZlpPPxlEHgiqBsBNZYjOM/2ThFIUv8rGFtgL/SOBTbC+0+a9Vs6L60lDE9aEkf53gbuRUNesuDGw19nhYn8vVuklKIos2QNX+uiEAQAgIU8Z+F73jalBtIDrdLJ2s5rS0fpHIi68fA3qMCuGpRENJqnojIBgHcWwHNCscqMXnOj2+k81ks6ykC+T7VPPxM6EE2RVjWaWrMk6vEnbCAEojiGJ19bTbn2VpM33rv4owYbo2MWkoeRNgHWwIK5qtF8v1Hs2wyCeoc2nD8QSfefII/lT2D++csG/IzivMI6SmG7Zx0bJOPXQGB2ctg1eNsoSwGj6cInz7YA34C2LK6TkewCx2GcBnZjNi3tYKNXt6IdvIuKQvCQugcgT1A8BCU0o9mMxwCzfyBSQAt55PPH03lt6SgZk62R9915+Msgaulsq/B7T58NWAYwcP7AjCCgd70rwNfXKM5rWUd5jFWOPZnvufHwh+GER9YypJtWqpABs4ISb5QJxgQALJ0YIHMwJ8F5aWUUjkC0KDb+qkSwZO9JdeCHGw85AYA0dTJyvjxiUBLZ+Y+u149WNdQM1LRrEqAdMdthjpTS63eH8+05tZ9hoPRe+Y3Ccy/ntaWj/BJsUWpGnIN07PnRWnv/ldbHwfz1UN6f/9KmHrKgTZnTzwgg8LV89I8ylu/vsvj40aZsMEak8UE7lmiH1vfZ7X06LmxfYdqD0huTybQ4tu7dVkr79dnHz59I9r15eBz/bgKkbCprxOiEegTiJEQ1vdK33FB7h6I36fj7iN95Ewnmyf3kjpHV+KAdMdsB+OHdNmTiGJ7BaZ0H7SZAUWXATianLj1ewtnx1awxM2efmRgFNaVMALVvxwIZgE+eH54/QaaGOkaF8x20Y5l2IAMAeNhD9Vn5ExnJTalIUJhpkKlBCdCVHY0xatwADe1Yph0IAAAgWhr5RkmmnC9PKV0prvVdz5ftCnQRULgAwFFm3tNbtSMvaEfMdpDEikpDIX0LAI/GXSngdNisb0iPmFkfS8PRNx0nYD1GFe1Yth0AAESbxSms/Q2l/Zmpw+K1HIE0okh2coAlI7QjbjuwBAAACwUAkmNl4mNmUYMSgCU72StAQzuWbAcCAABYKACYdb48TFACTMkedccI7Vi6HQgAAGAi0qCSqJ8vF2weopz//Gwba80SG4muA4DZY8SUF7QjZjv+Equbf8MmQADQDAAWdyxuQQmgNk6q9y8MOBq0w7gdAAAAAAAAAABEywAMzBbYqThmavL9z8qciQy9L1yGsKJ3l6IVHe8amCUex3U52MvU8CA97f598vPsjGsm9k80TsKxrymlqs3TL20pI3zq9K0cyscHiXKWL9r77drYz/5XAU22vhjrr4WcztBj7nh+1pFJQpokm8B4bm62TOECHa3d/XlwAxJ1U+CMjVSj9DQvc+GOO3WMtOgV6WmNgaNw1HbkDr2iuFv+jte5w9MyOE4cXS9X/WX0jbohN9/1YdDGlE6/ctM9tlya7qUxo5ssNTd1Zg2bNcDbb/wl6UGH5rBOhNuoOmiUNc73S48mFYVdzRKlHjlKlQ0Ml6cBKcbGY1jOOvSkxv+W3x/0WON009ZbxzGgT5RghNp/aZBSmDqSHfW2XLRvRLajB/Cl6Z7OIpeMHqDpPZ4qOrFiAFBGnFuHsRrHkUa/kZWEQHx2enAcspMBsTYeWco/Ir3MMEplQF5YfGIGK2Wwj9S2qPBpQI9eGYHMNaRGRx+LkWyLsgADAYDYISvrsAZN7/oVVJuQJXoXOQDgzJQ4g2lVmWw4CDAKVrj0OG3wMCDF0HjcGUi24RRkADQDABavmLKWBfpE5qFjADBSw6MoOYzMsEPZMLs1O4DXLNDGhWYAkBl2WkLzkQFAJjBOqiheM3y2MDIMukoQoJBey8YGxNJ49GZHRdEoU7/FWnK5oDeSbeIGjb32kmagwr0Ml3SVM4xF2WF4L2+x14YdAviiSPPOzokyIMw9JNQAMzfdperSBpd8nhgAFKpzFGYMJO+XgWDlPWVJvX64CBU6jxoRgQGxMh5UR1u4CsXoSxEaGemSgyQzdjdbp645FqYcSvn0H13FvR+kYJMQaFLuh2fdIa+0Oc46ABimK0zH5zawDKIwnll5PDPDBhaOb4x6DPDzKMy38wqtd1Tmy/EKabWvfHOs5vZ4x0V7v7770dbeNcR3twj23k0Dxw6z9EiggF4ZOYJ4Qe9uLL/JQKM+yzg+VIm8rkJ+dsfpy7uksX17rzF4eCWP55+jhVfjROXTX0dfGUeqqJUIz95xKm+DqqS77MqkgWjeyhTx2dqR8YhHD0U6Ee0YIKUOQPsiNPXCgCciY/MXJlEdy2ip0K7jYQQrVaO9wc7Je9Hjno8mn19eiZ/Sd/+8Jzljfin72nwjBEZXziBLdHyRAGAnmpKaAmSZfRJvIwcAlFm3Z3TeBpwx6Rtvbe31fTTgqBaGd5EAAPTGA4DQfLv5XrtxAJWgd5QiLtzSxqJiXgg6wmVX2GOIAIDG2CFHqMTYu5Q6JwC4+056aysphU+kdxn1CqskigU9OD1vw2HVP5IDkjqtCQEA+64AYtr47oIhVrAvXGakLENc2pZFnNSyjpFAs2ejrf2UCm+jBwBXimJxO1i+YW4P3FLBIwEAJ+DwFPTumASl5x1wWPeP5ICke2O0nTXhm+ylt04AcBBtBzkIEPCS4zy+9jOwk9rCMXZkvBwyjC4jqfN2GoQFJTSLV4ycCTapCfDW1qFjSUo7bDUqJUamJzkOlhfgp+QIqFbtCIsz7exvMu3L1W7tLORJr71SOZhaNTQoTfXy6ANn8of0eRZvnxoARHL83AAgN/sAQIM/OTA974DDs38IAA7SMWNKgRVSXQImL1UcRzAntZ1jNPYZJQpvZ+GHmdJ5pV3KwT/C8/mtJnz3KShK/KF+x5ve8SZLh4MMzegfcD92PV6WP89RblzjjuFI27OTjHDS3DNojuow931t3aPKzyzeTt8DwGnw7VopY33uas3y9e1GeHYE71etjh4BlK51WTiZFIieNs3e+viM/s3cAyA6Kuu0B0BqBK+OB/6nh0IbUy/Wrg+K7jvJ2gz5psibJt3eng6K3Fxd65wHdNmFt9GWALJhCol6EYjLzVoDbbXcAyBJmxVh2nkGPYuln0j8xBKA7/0fXF72eFGENDPRPnKrht7J9wya5uXRG796LKcqH7UaphtvIwUARdsgN/pFIxSn6umQC6ePnXXOb7/MFPTSZCU/74yWNz1vhzyjfwgAdEpqs24iZQYAvQlDUdYlKye1tWMkjifF9ocezygBgHaEPnLT2OiNbhoBQB40IqTboRiCProTNweg5+2QvfuHAEDmNPKoMVV2GKT2BnBSWztGJzs8fTyjbAIsxLUajfP20k0UGvTK2yakzx9nTwF1A4nG+iOV55XRXm96PZrnoOxF6B/A14PeWelzQnu5+4mywve49mYGTYpenQNjnSfx9gjC22kBQM/5n382S5wf/y1Vem0jQt2w8f5MPvqnGXrCWgba6x0AHJvTy5P7B8jGncLjU9GQVuc+ruykojvGqvRsDsBbd/wyZmb1JtrTcvTlQtE5x33KRRRKLfn5re+NEARwd59KFG80YsyT6UVyyN78RADw3ECM66TyDR/rZJoRg44njKd5AHDeMLwORnOVwZB2yI7mfPuO1sD2biiTOJOTKegWSpADKZ13wAHnvaYjjTpu+SE0Vw50ENzfBADVKdqmKDGF+efbjF8DvXUr7XPrmAnCIWPcn7HEUjeiCT3dSGZ/FL5RBMyrCgNQlb71cshV4RktWgAAAHCMCEjcMgBUJmcFxo/MqD8d6HmMVRc7mbRNbqEKqFy7BykIwgBPJ1UfQNNSV/PDx9M1ABip8891phQ6vdl+Pf7/VILaFa+ddzm0OI7/TtCrgdB50/N2yJH6B+wfUOYH0IwY6Gg8W4Pz1i0A8Lzs5N0IS47hfXO03zIWFvsbPjdNFqUA46lGEvx65rhznIaGjZjlGC2c1FMcI2UTtueZ+xnjaYKfj4aa3tCXUrr71YvfIfi9v39yvzdx9upddGb3Ijco4hMfWfm5iLJGbX9egOasoGOULrcmSzTemgcAhSl4r/XzdADfjp9JrsnsOSyqQLXje6XDHJyedwCg3T/AbhyinyRY1Umt4hg9C7LN4q0/jG/o+6vG8kpg3h/wfuEPu2b0B73RC4gKs2a6N73Rmt7Hx/dHLley6B/uApDdzudZI58rZxr3XOx0GZDVhW6jl4hpX0D0mMuALAf0CQFAb+AzIwCgXMiUb4IQrtHypuftkL37hwBAT67JYxAkAJjhpLZ2jG3uFcRuvI0cAKgpykMCgGMwALAS9BKE3gyH7M1PBAA+41CEGQfLAGCGk9rWMTa76+q/BiqzeLtyAEC+ZvEhAUBWCAAsBC8SvRkO2ZufCAD4fBGPQaAAYIaT2tYxCrMIoj7O5G2ETYBSlAPInY1/ks0emhUDUzB6FtUQz2D8BGTjtMMYaMkap1CZN01tHeYcAz4H5Yj7/ozxDBMAFOHOy6egtyv8nGhIKtNQetKb4ZC9+Qlc87BuPgbeTuppjlEiR+eA7M0YT7dUdyGmLt5/rLTOahjc9Pe+Btb9BpFeYaaZ8iL0ilMaz7t/WALoj0NmjENXnwLbiiJNgzvJ9yjNrJX2F/Tzsx3vJ7IyY7lnKm9nIf1pwOhs/q5S03kcRxUW2Jmq1IwMQH7jAzeddaSUuILweR8Dq9JhUHqcc/W3lRZn9C+YjDbJrM2iH4xx+HbHSKWOQdBx4MjaDHuhTVO1PPqTxnN2AMAdvM+BzA8OAMYHIe2fVX6CQwYA6PAejvFRgzqQji2E95ZcAgAAAACAnfHzZbZO2dhRj6ibGgAAAAAA6CJ1Zuf5wvnzCSGdAwAAAAAAAAAAAABxMwB3eG38E9/jLtjNymmbdIf41WmIWf3sbbD05u1IP9/7csfPzz5b9FODr6XzjerEWypfP+Vbg6+jQpYG+q4h4Gm23kTQYSEt6sbxZNwe71NR6nblsz1uUCp127jnLQ3Peea7NhFo5sF7ETT6Sa0zoEUzK5RN7dGk3pSYObwf4K0GXzXKzY7ydjZfVcv5KtcnYNMe6De3jSP9btr0hXqkdhZe2U5b1EUZ5QnLjkYOAJqWgyTS5xZdKIwLQ1Sdg4GAiYMRJk0VBb6hyQkwLIr+cPp8LBQARODrzADA+j4BLafu1W/xs8LJ2FDBLgNbYlk4bIQnhdt3L/wI0hsj/86l1Zjf/JaSkpZ9tO7fCL81T180IV815YbynCbviwNfZ8qHFs/DL2FOfD8ZLUlE77dEbrKi3pbBNluO0XJ2JWoAMDrQw+v2QYKArNwnqsBaBAHU8ZL8WzS+esGLXz1nMvKbSd8kqfrl55bQdaSdjZ/nrK1bTHoiTtamBwB18N+jOJqR4MHrAiTraPLu8qKkEDBQ21yJMlQX4WvUAKBu1O+VMxCagc8s2tnpHa7t4QTx2j6mrDipiBYAaDv/0ahxZhZA+2ZBCp/fBfZUjp5Pxt9VQ0Wy5OsMROErggAbp+35vagBQCHoQDr+V5wuEXS6OPAjvF2RHAO8ujiIfezpy/GLXmO+GazCURThRRp5xHAGo3nn/E/iWH81PsR+ZkawmA/ChSFM3hZFvoou3REpKu2I5Uy+2hmp+Mfh3uUhffnTsy0i2kxaI5OA6qhnvUvukpJ8Ddvrz75HDgC+GdJTQcB7s/+rO6MpHfjv3aDn471oSs6o5oO4Zv4E3g4aJvEFKZP7uWIA0CSzZAQ+JLvfs9OZacN77ck3s+2TKAeXOhppzFcKADyN6ZXgcJYM0iwFB83HBwCU67ZvjeMiAUDj6KJyWziNTQgAxLR6drpSZt2OfUcAcIPfIH3uOfHKmJne0agMuhqbSarC84fRN2aOqXY/NfmhzVuK8389145+SjNqP2ehDbyz4wUlln2j2Ome7JTDb23ca8N2XlWPPjMA2Zhpfxm3t8irN5OnnLmtnW98i/Y01nAbM+swg6aLM57YT4n8SJz1mVKqjD5KjdA//JncTwtnPLo+rTVl0ygF/JTMB1X+huWUMQ7flgcyR88G9mhR6FRGcPTYDAB39l9unsuMDMBTUBSc8XBaz1hGNE5mSDJRFjOQcsHTqP3UdMgzZsxp0XZ7ZweoE4menI7YYo7ztZjpSzLP730OdfLmJ0g7smAQJE4M2BNVSb400+KjmbSySD8jO7+0aLt732gT2sEJGrXk9JtOzKoTo0E7H3pF7rYKAKiC9S11ibPMQM/oZKJyas+K3989337Uo3p5sX56OMPee5+V/ijFb9qEfqwWjHDlZlROP59vx7wCcRb1aUIEAT+LCe1V/QEAiOoY351+fQsGkrBNEfsZxQmmhbIBlk7bewNgFcgR944Xjh3g6Ji38w8VBKwQAGQ4f2AwADgGlbgOvFcHDHVepJ/eTt6yln+0mTf1PcvMhyRo1JJT6vHZV385WbZZzj9MEPDzhZnJ8Cet865aaQlAFkBhhkOd/VsELtH6KZ2NNoVvzwwInpL5kGaNNJYBKMXhLOSWs9nvHAhCZm1oXCoDQJ3973K2GfANAHpyU5XbMiqXkfq5yhp4W1y2ZwY6Urtqma2iBtgjs38K/fRFd96XIc5B/oYNALJiiqQqDHw+AAQAvgbOIwDIwfspnZl6OXzvK3l3y3yM7BmxDgCsHCvV+Veifp+T+aAaALx2ZJa3IGB0h2ZlPiu5phcZAAQBOYhj3KWfWsfaRt//9rOe9T8l8zG6aVTzNICFI5e0i7vsEDYI+FFk6uhmBipDTzh/QNHgRHD+dcN+JuNMwKyZ/dMyHz3HVDq/PPh9iS8a2VynUe44YjbkK36VmTNS4akSmZ+/0KREbAACgKystOinntNKzOdXnlVL+sxpgxZ/stIzIz7jzi+8stFVsU2WvqTXl8cHAJQSklxGwfk/MwigloSOkAHID+hnOvyXDNKHo21O/dTu86zgJwegQZkY5sH3Dyc9OY9ge9W4SwB18N8pDNI0RjgqiCxAT8GXvclrcj9nzMIpNL+dh4+KFpznOQCdERt+BtXZq9/jAwBtRmP2jwBgVrSflZ6rwfvZmwV7fjeis9dqk+TWv5FTAp4zVe1Nd9LAIUqZ7LABwF1UpeFstY4Vngec/9NxEpR8hQAgYj8tZqJt8Bkv5/+UzEekAODdplMmoa9npxbZ2TUAeFULPI+/yzBaREfcKM6yLbOVZCbNY8F+UtLj1un/QuijxzErz2WOGfX4o8z8d8p89IJGbhVYjWNw7/7m/PJLH0GCxjXoW2cAflMSy47FusX5kQU4OzOaOjgwnE1UWk5qBs0ZzjhCP6/a4JXqex1HOm/+TaMds/upOdNNRu9FqFlg0fY0Qd+tjsFV5e/dBRFACI1v7dsv//kd2r8PmqXd464NufWxAs1C4FtZpJ+c7+Tetwnyw0F5k+tCfOcI0s/PX5N8U/r+W1vaAG0NeRrpN/tdQr8PLX4zdVdqf4uSvI/QuuNzNuo320dFXgLQzW2l9O1X//wO7Z8ghZsv/t7qFidvmr00tNU6mkc/qyA9bzUrzge9OAq3HZ79bIR/7/0sMwjeNLXabfVeE8qqRdZodnbTa1/PMvg5ng2KQJQvxiQvRnOGM47Sz1nrfKfz+09Yz0yT349IWzu4sVw2WvVugG2BAMD//ag0ZwQ6Hg5qpmOUBgEpaD89ZtJWNEaL8jwl85En6rWHg74rU/y4mjFPDwBGZ2rSjZDeNGc54xm8HWm7tgHgbjiqAzPFmf30nkknwTuzMwAzswec961rRnhlAerN96XLmlgC2DQLUB3fm0XzXIhH2idMqvJzkiCgEp45F+6ndxaA6tSSQnbhKZkPj1MjngGA9lXbGvcehNqnggDgf85R+3rHaDRnOeMZvI3mGO/OL6dDrwT2LgEANxtw96M+j8xH/3y/htxkQ1szansoulEM++6O3wN4F5Zeeki7brM3zc86C17OeAZvucoV+erfCP3szVCSwTf/9/GUjgeAUhOAOqPXyHxYwPt8/lVFwCtbQ8kaSC69C1mV8BFa9Y+W0c5aqm0QSSlFoylxxneBQwraz4PYfrIufNBryrOPqP3s9VVqR0jf9Hb+X/js6UCTYMw95UsjyOk6/8ljTpkkJUVZnybvjwwAEOjYOePA/WwamY4FAgDvfloFAH8FlhPlyTvzESnw8QoA/tGVRYI+io5TK36eM/qOJYCNQRSkJxx9ecotXzP6mQbfbSurGKyMmtxG08GT4LjL8XemtH70iZr2rxBgALCZuVAicLIeBM4AzOrnqA1p/aZMmw0+OfPhmQH4dIJnkL5r3U7LyiIgAwAAcnCVtqKf02fRK2YBnpz5GIH04qpZWYBmzIupeoljgMBuyAIlRz/ls1XAb5a8SwCgLdtRA70eH6bbHgQAAJw/+hnNOD4BT+XditfxatVAeNfHEDzAEgDw1ABAY42+7tzPP2uRHo4qojNE5sM2CEgH73z+bLzqCZTBfkftHwCsCcZ94+3PM3mFu7qf2s8g8uRxL/wtDWCKblF+maiDIl1EBgAA9GfkdfKsHf1cBA/PfAD0mfwLWaCnAAAAAAAAk4LdgZTDXZGD8yqyHkxxNM1I2rPUpiK9pjWLELZHTN+b35uO/+rtaN+bdNkmjYZGsQ+scrA3tJsFP7zHYIYcLqLzQzaeU0dgZAmgcJy/g/LMMl5DTliBftuQPpfP2uPiSV+LlqccutpsBd1vQXi0cs0D73Y3pnxrTIzaAD0t2XK18dJjgL1LZLydv8d9ym1ycPJ0+nfKoe0MkyN9DVqzHVs77O45b0ZtjTSBiI72gPZx9K1N6IcJTekSgMjoKaVDJMZ0tD1Ng/5g+knd+DPbM0zfiF4zao86fSG9NKp3ynJowi/jlLdIZwf4NJyiD7YEYEJTQR/YOiGgmUZm/4o2j2XXqJAsAbDW/Y2MSupEbMmhDYdnqiYoXUv6vbSj9XKMN/07mU7H/OUnK4eXDL+9gu5I2jSjvWkCvSaUhxREtsNDsgTwLQCwSP33DF5yEMq7NqRAAjPbgCXn73o5Q2/6s/sbUf48+hjNyON44LygI01sp3vQxw0Arnb+n8EUshm2IQ0YbAvhSJsq4+7BzSi9SE6iTfx2uvitHASgCpBMzlNgfQ0JyRJA7fy/N7N7qdNZgz2b/m5BwMwNcN70Z/dXu70zvk1dK/bWk6ed4tDm5/uSWHKysx40p8hAeuI5aEJ7TI6B4Rz88nUghugr0UsBx52zeenrUauBM+hJsZ1/fU84XkmDT4udkRftvUIdADualhmAp0WcK8zMMS570k8LjUsz1K2mzE9Ni9xu/j8p9aUFkjHOxljYxeDgBgD540/UHX8mGhT8ceM9MrO1zC5495XTrmYYeHj3V9L+nezEljaPEgCU4/ro3+ffa1yxeiWg3sc/NBVn5f4j4p87/rMNnuXM1jsDMCsoeclKxL5YOX+urjwhyxGpj8dx3J8CyH8azLl7vAjeuWNWYzJOq/rY1Tfbl3ZZ0IzS/zbQZmv+W1Sd8xz/pvA7DPvLeWa1DECa0J6ZFQhH+qPV7ha4j9Fsnht/f24ceRlozMj7kQRuhjBE6X+b3AfpN9pEpfI2Bi1Af0cdqqWzXiEYWSUD8IQ+toVlQy0DUJRm8FnwnSh1v9sxxwFG6P/siFYzeJg1W5sVCMwwYNZ9bZNkUNqO0XoEkYIaSQ2GiE4SWQ5iAKDl/CXfawsoBGYX6/WpPWwc2sKyJ1nmkC6LWDjndOMkLWd+oz+uTNy91+vvEyulhu3j75dZ+x2+lfztzfTz0d8Y6HWTn3eEqrmjOEr/uQVWIvBgVhtm3g1xKPd5ZmGdFYLTNLEfOI0j55GkzkQLqvNsur8fs/We8z8v/p5zUsBKyTwMUhLQ1RQIy/5LTxlEPuKkPQ6zxz/S7GKVcb/rU3PQSwt6K8xuvfmrbfModfmbos5PGccfoqO+cv4v9O4CyAqOJykw0OK+5WQohJ79nymg0vVVzfRqC8YXjb5qrG3uOrtsDrKxYiZjxDFatfkJdyNM6eMPcZZOOdt/CgMATQNkbYxnGMko/bei3ZT477HO6sV3Sl89NpklZ5mTBD1SfszQqzTZPmh8szH/3D3LsXQffxUDgLsrgavQ+EuvZpy10YSbEorS/8gbH5Ni360v8dBKCXKep4y3VP52nhnNyABYzdaTM288nf+MPqYJbZ6yVEipBMip7Hce8eHhBLxujtLqv1bQFOH2w5nV1rTG36tevua471QJMC3UF+xwtwvYKX8uPY7UJYAZEXgK1BbJQKZOP3bt/4ozyhnjrz0eaWK/G2RzagbgiTq7Y5ZjWgCglQGIEg1Jzr3uFPFq9j9NUuo0kX+rjn9aVF69v9024lM6+OvyWhtDR/9ElmNyH6NeBxwpbZ4e3v+nKxTGHxmAFWay0j+lztjL+T/FHk7pIyUDMGN54OnO7+n1zzH+aO8sXiTIY7j+PiXL4d3H/wKAegBPmIEAa4x/w3dNvt2gz0vrg+TPkf003lkOzz4ex0FbAqBmAO5KAtfgQUZ6uGHQ7H/0UxArjL9XPYcV5N6zjRGKXe0YLES0B0+3+X8FAPUYr+ffCxbqAoJq9Z30MIX/9mfC+LODKIt+pkVlKrLT7a2ntw31nHPqZEV78AibTV0CoGQByqLO/0kOepahThj/kBmAFWa2FEdz9dOkQy213SbwR/smQCrfYW//HvPmNObqAUDPSeeOg6dcJLSrc9s1yu8Ztqf0fcb4R1mrjzDusy750tCXXfhjHXztoPNLBgHvewDOTqNfQQD3OuBdNhjunhaSrok9ZR3Nc/w9MwDUUsKf77fgcmnB69G2rFYJMEp7Z1VmHNH5JWodpNba50w+Ww14Sul4ozc9ZfzRHqpRk9yLnjbqP8bffvxHeND63XYZd1ZfvrTJum3ebUqcMXeSFe8xSDf0ZvXRVL5m9ZGKzzoAp/KMfYW7AbgDwE11pc36Hz6q3WD8vfcApMDjbCGT3v1NhnxKC9iFUZ6vVmciBR3HbgCgGQSMfEcjKouwPpUW7H+ECnq7LCukhfo/kuqMXgfAogx4Ejy38l0AUv6lBfqYHqrz/ywBvKO38Y/t/AXpFysnki7aozkgafH+j/Dga7ud02HRx79tIPeJQ/f2QylmsqijH3aGecJyGcEe9OQuLd5H9ZMNs/qoEQC8wNkXcDvrd3SApO9OdoAr9H/EIWD8/QMgz34nzXGMGgAECT7CrR2v3Edlm3fbtuh7ABIz4ssff9aPPyXM146KpBttZjjAFfpvFfE/PQBaddzNZryAyDmmlccAWY7JGYCJAy6dbajNXAaEQXSTliAAMO//5PG32ETXFhl/zeAn/LgDprPjYZ/xpAwA+vg/RLgOWHoOWcWRCgUi7dL/RcZeKwCKOP6uzh8AFpSNhHGwwe9iTHp6+ckd+68RAD2t1jputAO8ZG11u7eK/Z/SxygBQKRqX+h/3P4/KQB8gtEDMLtGHyf28QeDhP4DAPDoDAD6+NA+RlsC0J4Jr1iJ7qn9T4bK+rTgCsEkAFlBH5cLADQdQVp8IBuEHoqPPj9YeP+3QRVjOj47TujjGgHAiCPcaZCf2n+NAOipBhOOAgCQAdgiAIBRgzOTBAIJsgEAiwjwA7IckfsIAwK4IlIFOhTEAQAAAAAAAADgUUiCGdn7CyOlUDmXDHFRj/+/mIhb7jV/+W+N+w7MZ7KeNBXoXb2cVuj/bLqb8qFpyMJge9oIfciDCl1v26BK764dEfE7ODjNglkTcBeM5I/AolKDgUFBGxVMycUTHsoQxUI2a6UfcHAWbeN+05M/7eLv0kR58KL/ohOtpHObRLfHJ2u5exR+Hs6s/KdfmfF8+fNjB4FM4zdqALQu0fF0/s1Bzu5oNEc5j6BPLUDbnsqHd1lrzHeaMz9m66XFeLQF5DJUALAbpI5cEjhIZ96jjjgxFPwpM//osJp5R5KFp49vW1CfUmD9sPrG9jbrqQGA1v4DzX0MzUjokpCeh/P3vNynBVT89uU30ylFM3g7XvIUMZiYyfPmbB8i2CIEABs4//fvaUXSV7O/UWcccc0/dfrnoXjJkb50HLWvnl5p9rdT1mFlR5Im0EsG/KTYokcFAb/MQfHaGCTdaPf+/hV6zv/88n4vaMjM9qZjTgrPe6NRU3g/TWyHxcYjztiniXLgZfw97cqsNnit2e944+WdvHL0kzrZuaK3ZTnhX4GieKEafLN06J03QUG+eb8IeNMzxDOMv5fzT4y2jSpeRMVPX77/+afXjG4G/Ygz/ehteMpyCMc2WAVgjwkCnrYEkDsz/5GsRFZWeG8jY+Hkrn7cdzyMzN3fN4fxSJNkYjb93dEYujJqK1YKEjxtQwRbhAAgsPOnZhu0A4BZgra9YA/wNj2IP8BamQfIIRAiAIi4Y3h2AAAAO85OwQe7787eFAo8HL+DQtw2Ec58jJ8MyIv2/ekVz2bxexYf7s79c09DJPAhnLxq6HNijo/Uf6TJ315lTKcFAE04IBGZl4X/FnmGlZTaYhnINQE/tMuQcp2MxcxtNh+aQH+bsU7szAcLGfJwTp57QrbcWb8SfoycF1KL9kiG46GxxBOl4tmsoCMSHyIE8uDDw2aX4MOaGYCmqPDSAb47ctfDaA2BVUDh76xz+FbVyZJxO7TSnpH40AK0HXxYY+Y74wImBAHBAoAoGEnLV+PnV4ieZwVykW/78wwC2sI8QBueM/OduRcCzj9YACBZt+qtLUcZ5HoTVKyYNbjjbXOk5WloqTO/2c47Ah+k1QYjz/xX5UNU+8Hl7yy7AjgEANLIriccGOR4s4hZtfcpbfdwvrP778EHKf20mTysxIc7+8n9UzMwe31Tu4Q5/MJkPKkQkEURHw0FkP6kyp06bZF+d/WKZ5513yPwwdr4gg96POT+acGrHW4eBG4yABoGNPKA9gIA6oU+7eJ73GWESGWAo9G2kqUUQIZX4IMHL8CHeQFFFCADECQAsC6IwF0GsFqTv9sHQLnQp3SyBtWQJ55KyV3Osap4Jj22NSuQ3YkPlo7mKXxY0fl77oVYaXl4ywJmvwyjT/nTa8ZuEQC8+vrtOuB89KsFctu74o1r0Sue7TRbi8CHlfgJPtjot+VeiJ2c/2oBDTkD8P7vI2tPEVAJQUAZ+O7s6LcpCDG3zZEqnrXARmJFPjTwwUSuIjqKNElnojvMtmGf/sPTrgM+Lmb4Gt/cNfp9QoRv3e60aN/Ah7l8kGwCtmpPeqB9iFQ8CgFA0CAg7S4kgWZOXuO0827nBj48jg8N9gH2eSQASEp/7hQE1CPuhR7IAIwpNGq/gw+j7faq1OnJdwt5kB51bBNkIB2b2e0fxqDv5Pzfg4DEDATqn/fOQdpt4Acg+gcfnsuHWachrDIhkZ3/N6efdtEdyimAJ+AkDJzF3oERxUmdiHq12ZdGxbMddn1H4gPkwVaOJBvGtDdZpkX0Ytb4bc2LHwWBewJWuStg1bHSmgG0xfkYaSbUNpCHFfjQJrelLSITqwUI2wQAXGHSUM58jKXIpVcJ310WtLpANigkjBwMuTsfqOlirVLbcHjoKxm/DEXhbGr5FgSg7OP6hjFt0C/IYZ8XDXyYwoe2qF0ANggALNarVnMcVzP98vFv56LjbXFTGAx+3BlMe/hYR+HD7HsVoq5XS/Z4tAN71twzAE8yGFeVAvMExbUwNp4OcMaMO6LjQ+YBfFjdaTVjeZD8iSBgED9ODmm1AKCHHJwvlFm+x/HCWRXPUrCxAR/AByt+rrzvBUFxsABAe1BWHODXOf8VI+poyrr6qYQdxnrEaYIP+nzQctqr3SOyk33YBr9GQk8RzhEnm4/rnf4aR/ZeVf6+3QCodSTQa8duM26r5d4R7/6nAeMUlQ/cfqVBOwA++MinRSDTJo4HECgAGHEgHoOab4KKf5xzSuImWZ7/X2U9dGYbPYv6JGW6UWdK3/R6lU2RO/LhyU4Qe2NmG/fWmtvgpZSOAXo9hfyauh9w/vLG/a+PzUPxiXxVm2lc0NOuUEb+HlOu7irHUemnDfigQR986PNhnnGXjctIMP2ND5Y2cHRMNNrWqDIZMgMw0LBZPVq9WM+s6DfdCG8K1l+PGdesoklR+DCbPvgwKS4Q9sdqTwgyADMDALBgqiKqRvuT28BZYxx1vh77J9pmfKBmPrRkB3xQns0a2Z6ZeyHg/HdyQiQpt1sC+MwCnAOOUauPzYP/k/s4Y6aUPvtPTPOpp/UC82HUoWik3MGHcZuWRuwCc2msR5PECwb/R20glgAeGgCUo38WPy0QAKiMXaAAwK3PCxj8yHyg8IPMR/BhiwDAyuliD0DgAODnWBNexXoiI+q6ZArOM6/zzmmBcbi7UAt88NOxVe7e2KkuBLB4AHA+fOzSg9rGKZ4yYvC1+zW78luUyp7gQzxd1r5KOS3Sb2DmABikpG6L9Wy8BPDf+AVbAtCO8rudMzjuRGrHwBqrJx/MjTz4IOKDeQYgyNIY9gAc2APwKDx8D4CG4deqLxHR4M/gwygv0gBd8EHGi2GlDrIXAnsAAgcAOAa4cJyxWAA3qxxwC9bu2WVwo1T2BB/sJwlcXVBry5vDm3npWc/5poXlGAFAWE/nI/xR+rhK4GEy41yID6YyCT4s0Q7LOw0ABAAAAIOPwOy5fFiA/5pBAIQNAQAAwPEBwGLBsPVtr8AC+AELAAAAHhkE4OgeMgAAAADAgwMBAAAAAAAA4DHRH7OAimnRhv/+R3auW/12PQJvEqGNaeBbn8+9f6uNdzEdTacyU9KsO274LcllJpdjoSU3kv46Flth69+gvJvwi9mf5CGbTmPZBPprbmeN7inQoq1WmElYhyB57WlabQnA4hjLiBJJz+I3xW9Fw4ihf3+eWxxltJhKYvaLOl7csdY2vimgTNzxwEs3mqOd0BqH6CWNXYMx5ngmp3YshZ/gg++htBpt59STb4xv7XBZhrQPyXn8JZcENYNvRuF/NPrNsU0WutcmfMMrMzRbfla0kyHaHCUDkIyEHRtc4gh7UlIAzW9pyIp0dpom6tbTZXGmo0pOY7nLTXuemZMIs39Xff0NpJRRDdVVSltSW/suPc6N1lNQgbtapmkOijrSL29H7iXz0XUrMcfVwknfyWxSkkeN8dBszyqBYa/P1lmO5CyHroiyBLDiLCUd92dpk/B7T53FJcV+aztyi3YgA2AX1EqM7pX+tYHvSvZ5jI7lTs6/11brZaFtZ/6fGYDZa/AtsHAmxcFLmylnrw9NgS+a39Kema2yhpomywLHuHKf97BbnA2LHEetnaXazflLeP+0iZNKALBS5Ncw2EsGAunLn7O+JZEfz2zEbhmAmYEVd2c+dTmAaoci1d5PC9sQD+evaU8i0VoyANCO5Hc5ZrdyIJAUDJHmt54gH0+Xe4t9HdxJyOgeA8rzbdPx83TIx4a0tgoAONE0ZSNa2lBZtAzh0zIt6BcwM6gY+Ua0436adigF7+vS+P3CtBmVAKnf1j4TKl2H0xRALX57npPGTAP9AmKMZQvYxsjfAwJmADib6JqDUnm3QYuHLeC3VslMJIP2u5WuDjwj4vLAi2ctMM+iZR5mTY48+uopB+FkbrdKgM2YfuSItOFbS800nlIJcNWZtvS9q59FuyKlw3dMzW+vO6vVAUgBBmun2cGTvzV7XFEHIC5W0HE4f3sa2+vOr/JAjwhQMqDP3TSYJvIAs/b5GQBvo/n0SoCRZ34pcLtasDZBDpABmJ4BeH/mvQpXWmgWilk7MgCYxSADMDqhSeAldGelAEBrD4BH6VVkAPbNAOw4c8IeAOj4rPakxXmDPQALZgCsBRIZAGQAkAFABgBBkq/ez1ieRQZgsQwAZgf4FjIAyAA8nWfWejJr5u8dBCADsFAG4OkzKmQAkAHAbBY8m+28kvH3PIMAZACQAUAGABkAZACQAUA/AvUhgX864B4DtCoFPLMSoCQqRCXA9b+FDACwOs+i2iKPsej1XeMIHzIAyAAgA4AMADIAyAAsG6SsLtdtYluwByCYMK94t/mK7cIeAGQAkAFYo30pYHub01gk6A4yAJgdIAOADAAyAE/hmfTCm1Xle+YsHhkAZACQAUAGYJsMgPVlNcgAPKNd6YiTwbI8FYAMADIAyAAgA/CIDACCgLV1PGKhnBZoLNpGcqCG3yDtwCmAWO3CKQBnmU8pWbUDewCekwGg6Mfo7vikpZNvMn8otwm6gwwAZgf4FjIAH3RGZmxPyhDgLgDdNjfIAQIArQwAZgf27cIegH3kiEvnm8Fui+rEE3U8bSzLkANkABAVIgOADMAAHc758aduENxdx9vG8o4MADIAmB3gW8gAONHZcZaEUwA2bWuQAwQAyAAgA4AMwNxTAFqGbVcDuYOO4/pcZACQAcDsAN9CBsCE/s6zo110fNejgcgAIAOAqBAZAGQABulINoxFLD0LHQd/wW8Bfj/OYlpGPazvfmmXVts0Zj7b1AEw5LMFv3AbIGbzu8/8ItSBgDw9RC9+oes+UeGFo9UUMmQmZO+miXwZon0jU9BDBDVAAB1FALDn7KChXbbtcshMUL83Wn716Q4qPYQmANlFAICZB9q1SLtmG4ftZxcTA8sn8LYZymZk2sgAKOLnAHaJCtGutfoE5z/PSe28uStB19EfZAAw00a7+G1Ljm1HBsBeVtrHuFK+jzFZV5+j9TW8LCEDgJk2oujrdibwxcXIUkrTjozPU0oap4k0IM/IACAqRLuWnTE0RgaAc8MeMgDryEZapP0NYwYgA4AZLdpl2w5kAGKMSer8G/ZkYO0fQAbgGRGwQ02BXWcMV2vBabB/yfE96NL12LZBuYCDxOwfAQBw62gR7foZZqtxTMz2Wxg/yFFfNkZq30fZ8KdNowWTJcgxAgAAWC4zoeGsUocPMI7zHMquF4fB2evaqrQTLURvAAAAhmitvc/G05c/tQJnAAAAAAAAAFDOAHxEs7fPDhFK6SDSShfviIJ1aj8GaLUv34rIVzKtC17k4ziKUz9eKH/ofsN5HEdVlJX3ft7RlPbFlL5Ev5T0yUJv32klB57rGtUJbflCU/MGTsgYn6ZLEaHR7NGvZmMeiNENOZ58XXEM8wSaZcT5GwYgdSMduZPJdvP/yVlftW+QlHxPYmOetls/kowthV8Gg1PgQdYeuJHolsMrT77i2Jnc+VcnBzycfVhUDhrzOQtdpxaBGr0BshHHpAUamwQZe3YAEJ0ZadG2IAOwRsbh3Iz+6sGgtP3UI53NUIc4QYAG/TRJTp4qY8gAYLBCthsZgNjO/6oNVtmHKPLQgrS/Hfd1CTRp9YKAFmhcdggCZsjYErb2Z5POpEX7gQxAHBRH50ul7x2APAVX5YNbAH1sjPZ6tA92Y2NQA4Dom0raov1om9LC7F+nDefmMtEWaf8TnWBbbIxWl7EpeNoeAGQAgCvUzv9bO/86MfsQWQ+aA902SW/SRNrUtiXIGAIA7AFYv93YA3Dv/OtD6c/e9RxZJr3uCojogDT2AEDGkAGYOsDRb/lCBgB4MhLxmba5bqSgY7PDpGG2jHE2drrzGhmAmO1uBoKBDMAc5M7M/+r5/PFM3VCHIJOxbZP2GD1JxtqNPae849Jm1AGI1+4GHg3jroSwVZnS88JJF+I7+fheCCh/BAyWGwO9jSWcf9zgyCoDsLuMtZX49LRTANHb3W6es9jN2pS+/W0W61XGl0urBA1YCqEf+c9Y5QPoyfrVz/u7nHc+/027/dIMADDHD5mP+dPqADy53b1So6PC9rosqBGdmYbTlNDyDE6s2lMMZQ4GP7bz8D76mCBj+05CkQF4TrubMV0Pp6/Z1tXbUgbk4MlBQNugTc2xTQ0yNn08zDIByADEancy7CPWW+MFASNtkGYyUOEtlvNpQfugkQGAzfmXL1c/ZACQATB13hIefab1OZDuWi/MiFd6hj7aUkD9+FH7YCUHuy8FNLTBNAPwFBmjHu/TuOhJnV84BRCv3SkQjzhOn+u8Rp2axo74EkR27k4QZOUAIH38d28DG2ZxvvYgyoVAI6cAIGMyu+s+7sgAPKfdlDOmI4p4Hr7V7LRozV4KuOObBU8takwgCzDuJD7T5mly+zUzAOmh8hN+AyX2ADyn3enC6Exfh5qMPDEIoGRMKqH9ljKHUwHzbEAK0C4LJwYZC+IXkAF4ZgaA46DOPwLpdTPe+UbTMwiIeoKhOsjB008FRO5fmsgXrQzAjjLWJo6bGq+wB+C5GQCqM17d4VExYz9ADSRzUS+lwUxvXts09gA8UcbSKt9HBgAZAODvIGB3NMgP9GNCBuBJY9BW+T72ACADAPwPkZcCPOQgHdgUCPwtJwkyNsXWuvAIGQBkAJ6G3sa73bMAkAMgagYAcAYyAMgAPBG9vQ07BwHp4bKCuxDmZgBgjxYMAJABQAbgSUHAzksBT5eDp9+FgAwAgAwAMgCPx1OXApKzvGjUP9esoY469TEyANFkDAEAMgDIAAxgxRnzE5cCOHKQHtx/ZEp8MgBw0gsEAK9Blf4wu53PV2selcDyIQ0CdlwKSA/SrV5/sBQwNwOAIGChAAAzafBoRzxtKaAFbZNXYIi7EGJlAKATE9v0s5nArjgDjTrzexKetBSQgslOC97/pwbOyVlePO0Tx/6nTXR4+wAAgCGzCgJ2WgpYRQ6SY/+xFPDsDMBqOuZeCRBABmB3PGUpID1cfhL0I2QGYLUxmBk0IgMAICo3ygJUyMF0Ax1xyeFp+jMrA5ACyX9aUEdZ+J3U2e2j7ZSSW18taL19832GnJz6MVNO6rF+uj9Bd0XtTwiW/+LFXdGktHi/NGS89y3JbYqusocMAAD8GwCcYMNeM50Hz+RnZABWDnrSRHlrxDaaZAAwk3akBYQPAoYyAcqy9CR5jHCX+lPurR/JAETyDTNljCIrjUC3zdANTgDQFBvVYOyA4Dgf4gRm6mKa1N/VJhNpolx4BwHtobo2BdGWAOD8gWhBwJNngEMO0PNn0K+n2yLcmRDHb5nda7DLXQAAYIHe0UBg71lYAp9Mbf9ORdmWlJXR2wDT0xkIIAsAbG2o08P5lBYdtx3aaH6j4YwMALIJAIKA2LPhnZ0e7E+cDMCugdMy+z5+ojcQAALgSUsBCf2DrQuUAUiL8l/S7uTdX8opAFznCwDPORXwhJkt7A0vAzCLXzuMU+g+/Dp3qm06yMBzgoACNjzSID+tNoBHHYDlbP9A7YGY/WmtuTGOS2s3ZgOA6ZStxfBPs/T2rf+WV7x2900E67/GZC3BHiMaBgAAAOIHgBoBwPGZAUAAsB9wFwAAAABwlQHAvhcEAAAAAMCDgEqACAAAAAAAZAAABAAAAAAAMgAAAgAAAAAAGQAAAQAAAACADACAAAAAAABABgBAAAAAAAAgAwCEwS9YAAAAsP1MfuR9BAHIAAAAAAAPzQQACAAAAAAAOG0AAAAAAABgzUjx5gax0bWjr1Go5FZAcyZMaJMCzUbgezMem+E2DPJhtiCN9qEpzthEa7VKsi+65ltT3j6+1TTH11GX00z7aEFb4Zv5z+8bTiPaLJpCOm1E5t5pjyD6JkCuYWkjzAzcBk3hSZPGRrMNESLIpNhmicy0SbI3ayyasTz3aCYFfiTC+CVFnZPyjPue5dgUifNfkOZQIL9rALCaU2gTaSTHtrSB59LC4ytV1Cbsa1L6jncguiM0DXMzGIMktBNXz1ADFEvnfzULr39+ns5fi2ZzlrX7gQ6+BEB1IENC2GnTSBuSkOYoT6xTsmptINKM6GjSgPxIaDXNNivI4XCAp2kLjJYAJDxsI+OYUkpCfRAv/Qn7IRkXq8mOpo1l01SQ40PaT8slgAg7Sb8pTNNinkMbZsy42kZtiDzDlKRrZ/Mh6izWNNAInAmwaJfWjLwXrFiPv2jdPzDNJuCzuaytcAwwLdqGNKFtV4YyPaANT5TLaI7ba5khbcxDKp/VM6GM9xqzXVrO2DL1fxzf0/+WNCnVFk1lbZU9AJwUaNq0DREMoWcbmlCZON+Y2XatPRvJ22hsHrxx9rckY5mOEJSlCe2+2oW/4uy/BebzUpsA0xfl+/xz5zZ47vCf3YbmQCeS83//O401Qsm3pI7BS/a1aCSmjkd0yt5Oo0fHYuxr5/+PhWkmJp/N9Ct5n19GHQDwgUBTa+bukgFgbkBLg23mtL1rtHc5d648BqzvCDYgam8OVjtT3qHdnPqzlD2b3UfrDID2+WVgT2hFqV5p+xmyOnIES9L2KWnF4EjMZ9tE+tFkGfZ9M/QCAK3zyzs7Pc/+tgAKu0tAaJFWa4vJbnqg/mmfhIBT1Mfd+X9revmDVt2Z0b9GxkzbMfaOuHg4nZmOrw3ybVY7uHLguWnPaibmde7/ag/KyLp8U2izRaGn0Qp6UYLSJwQLUhnIx30J3s9AYHR3fo9e/kLT8jjgFHlJgvXXIaE3LJogZuDA2peY/qQCOEnIB7Pa6kZrt64BxVsfvNae1eTBoYAOVQcoAUC764iRHDVFHnKLcc2802AkIPvvGYKdK0Snf4XzKhC4oJ2P62p/InqG/oOkQyOIWgegKQn/7G+0I1ZauE3iYcTZUwrc/p1mitGKQqWFZWjUDrVAY5v/vJ8H21AYDn3U+XPpafogEzv8I2hs+vhpM6AZCf9MprcoA878biSDYWkUub9VnOZuAf3q8o+ATM8Rc7+nSZO6VBHefv4InP9VQADD9zwjkBwCwifynHpWffTPJwKb9ubqoLbzpzpl7b0FJTCPyfh1UhzKxhCvGvZaTopbya0dug4yGfNxZN+DFi9goPcKAqTj3hzb0B4kYzNu5uSk/CvznXLTp9yhcwqClXwRLLSg43abARh1/p5nUZNw9qltfLUzIZwlGOm/awgppQ2YXe7Xt+Sgfx66r7G8s8NYe9c4oKTOX844/fnzfBtjyi78Igg6TmZgIAlmOLrkngFoCwiiVhGV0QjKKhOifcRxdhEYFKFZZBagSPMp2Z+0QDuakywlRpsojrh2goOejGVlHn8uCVQCP639mJoO/Soba6urDaM4vjSRflIej12M8Y7O3cJxj9btn119cAWnG6kdK91pQHWu74GC9ibCKsgQrOrH/sOPsoBYHDOzMFbNyfjCCc2lQZETyW+kz1p3rDfGM1d/Wo3XrkFlepiOavOitw6vFShk5vOvo3158zG7zAAsFbUYtmVWJsSyYM3MMYm8DJCC9Vn6jvVmUAt+cbMQaWN5WXE2ueJ41KN/SiB/CRpGKw6OtNmcz9qFgLTP/FsyoBkazdVqwlsJZZvYzshjpFlbwKtWAbJja+tt9LGlnq2XogrbU/7wRyNDEE6HfpQbvVKVLcto7InVxlZre3pov6Xt2yWtH2L39UPtAiUVnw1pj6zlfwYDWwQBszMAMxnVFv32bGNhWUnN06i1hXge4Vu7pJDbJjq9YkaGWmCnGWUEXkHAaEr/rj4A9Qh2iPFLWpdYUL+heXGGQZu8LhFJwfmg2SYOH1zHQE2JfC+TGq3fcNd2jzE3kTfFb7WZPDS0C1P0X6DfV46bfT1vRy85tw/eBhQXdJqSvnf7iAAgXgDgeoPYony4uy3MbRycAgCuQdCumqlxIx9ndkNqz8Rb9JKmzATtx9SA7EY3NEoBk0r2Mm+efQ8GMk/91QIAkbxECQCmCVnAoKSBD6YBgIZMemYAem1MSuObBttubQP++k7gmTPr/cHx3zIj0+GN1n0At4HA4LhQMwRnSql6X6PuHQD0GjIl6kcAMI0PGrPU3n3hGjNmtwzAyjC4fz5yAKAmu5MDgNFMxswA4AWtTX9fN/gpjUsvWLkLALR1Kmnbnt+Pj1udX35StTlcJqIjDxx5nLGxCxUU1+RZqFKsAWzNzH6ch85afO6Myd39AJTywxr8bUrjrTpevw4Ct5Oh7N0ouJPzl9Z1RwAERLYD1uPWFuBBpPa8p/BHg4G7sc03f1+ded2iyO+PsUCsaCAtj0nN4kcz5AW3AA23nkLaTE6e6PjTguO2uy2MKL/fbgLkOufCnMXfpfgzwabVAZ2YXoMieW9ecF77lq5Dm19mYrTbV5sPFryQrp9GzCz8x7elUxm2ewA0TiDssHueRJPZD9UxmbAHgANOdiAN8LJ2Mgb/BCyae0AY7VSxPcnx/HK0ACB1hNR880aQACARlbU58ME6o2FiRB8SAHy7UbBFsQWTzs//Id2lLXWYywZkBgEAZ0zO4zjqB22tkwfUiZPb5HUEP1Jh6aQ2PCMhUwZ7OxMDXjSnNnrJhcX3IspnuDjhjeeJIRO7V9BrD5aJ6cH3Tbbg62zdsQ2RfQI5AHg3tt/WLEbXMdJE45EYfV/ZUR0ThZ7U/5SS9Dcby8/+FcY+BW2rVs1/y+uhrfoYEa8Sv99+kk1/VfjOaBBQj/7xS63LuexvAxw0vuz3Fo30Z2ZCRvrTnAzPoRQQArEzABED+d2CZmvdjjgW2ZHWy4FzNxi+vyfhbYs4Vr9BFET7zK3n2pnWsQzpsbsRHmgVloCzhyOTffR/8pbAM7Vvr1LHYCQAGA0aPo8ffn6XfffAIa+lMw2/i7QzquPTVnJqENALSOC0AW8dXM3p3OlKCmALNG1ihICsdpx2Oejp+UKgxbHr9eK/I/sxlfH5CaKIWlco7lCVkCMgWmtNAICAcdBxavwUxyPaePUc6+vMfe48o1U+OFrQ+RylNq494Dn7t+CDBy9SJ/oHnjS1970N0Oz4JPMoltpRQcN+uN9pYCxfXOddP5w/9Z3T254536fx39gN1wF4kONLXgqsaLDaE/gALBEAaN0+Fz0AcL+T3Xg8pgVkF+Ni7SD/29w3KQBw9WXWdQAekZF4EMBfQGzjgn0H47EmTuNv183HXdWG/+zewWPtI2kabcexPADB4359TIv2SbsgT1Tnb2Fz1cfyJ7Bwp4cptAU/4PSBGTPO6HUB2sPGIxovXmfqq9K3MPNfyUEa136fvoZnyAdbCcMegGd6dru7Odq9uE3bA9CU+meiNzPvNJhk5yTXANfj77P8U+3ZoOyJx3i3TYBwfAAALGVXAp8CYDkeqwiAOS69IKDOGpcnyB4AAAAAAA9A8ohcjK5LtKTdq7a3Qx9H6LQ53dTr58zxUqDfOvxZenwE36Gm9BtnBs1oB/W7rfcMkabJ1dyMdjQL2rN1cmY7Zs3kfweVjOUkB+lY0m6DhkWbdxq85rbda3y1jVUzkA+t8YrCv93Gh6q7HrxvxAkEjj/a8TspPh+dvip+BpVMS7ClpWxHyt+O0NQykM3ZEbcJNL2DQkuH1phte8oCXQtK17pMNoc+sJ/8aQcLIQOAtsDgcZWsTWjzSBlV6RFAb5ozZpgRgoAnO/9V+5om2IAnykbU4Nzahy0R9P0qCXkTCnYzGAivM8haKcbXdzwFpkcz4q1ts4KAtgH/dh2fK763ibQ96KcgfF4xE5AMbcJy+BHODJPTYM0UkGTQhyveNWOBTczxxQxTngl44uwuBWzPnZ1KE/mB2f88eUub0DfPAEiNW2M+F202ki7+bIsJeqR27bBGTs3QJIxPuH6mSbTh6GPopNV4cOiHlYXfAedv6RxnBBBJUdiotFowgV3BaI3u9UhG/LPOiq3iUGaND/DsTMD7slw6fJalZtMfxo+go6NGQMMJza41bn3BzozvwvDGG69V6ANAFB1Mk3RiNn21DEASdtzbkHlvnEuLfBPOYn/eYQyfAauMEPe7Gu3AcdlFAoDZAp8mKxuEEQDWcIIj+rq6E1wixQzsFwBYCt7M7MOVku6qZDAgwOpI6PsjAz9kP5wCgMb8e43iGslYaUYr/3kfgbQul7qacUnKytUC9GFnx2Rp/J4cxKLvgGkA0CYNTMQg4BtftO9Ht6A3cxyBvtPDjnkEUug7+j4NPxeGZtRBaszKWnAB4rRRoz+ScsfNkR5gF5AB4CX6jr6bZwC8GEudhVuux3uV7mxQEACzF/ASfUffI2cALOryWzg2ixu2Rs71twk88OQ7gol9+dkMv9sO/m19DbKJvqPv8zIAkohLOhga5/gtju6lSQLH4Yd0jT5BqR49e/HYANsewkvMgtH3xwQAUsfVc1RaxXysz/BrnB6gCDJnWUJ7o97IOD7FmGjvaPfcMa8VQESSA+yER9+ByQHAu/MYMYLNQTC+1Wu2MK5a5Y69Z+UJygUsNPPCLBh9BwbwE2hQtOrr9868ty/PNQg6lAsYDmw/9Tgxn00G7XnyWKDvgEoGwLtMrsU6/MiMuhn3zVtx4OQxc6LI9g7XAWMWjL4DgwHAnbHwDgqoxwejzia4bfModwylAladCWIdHH0HhPhRcAAWx/J6DnHkTvfdo9FVxhEAMBNE39H3IAGABmM9nUgitMVaeDzL83oqCIIBYJWZIPqOvgNKAcDoDJsySO0YLwAy6ug0+pcGv+9R7jhB2QDMBNF39B2gBgCaTG4MZ9IUvu/hIJOyAFpVN7QcRwDATBB9p7YD1UmDorcJUHs3fgo4eL1iLMm5rxb3H6SHKlH7GAvMHPYan7RgXzELRt+XyAD0ZsBpspK0BYTE+9bBKOMY1fhi5rDX+Kw0C941A3DXFivb9eTsx/QA4JsT2VWwNYQ4BWmH9zhGDLIwc9hrfKKVJfYO4CONYfsI5KJf5w4c/1sCiFYMJGLUNJJC9ip33KA0ZmMIxBsfz/GkLOk1yLILDyL1/aotS2QbfwjOwWLtKjko62j7rGoGaHxfcsRx5/Q3nPozxyct1o/00L6nhfseLfthEgCMRHXRN/VFN4xS5dA+NbF6gPCU/QwYnzVlVnsD9Gr6+oS+L2dDf5md+3aTntQZJwOmrewAkpMgaY9jVD62zTIEu5xoSA/U92QUBETQrRl9n5H9aI48mxIAcNa4WmDh3CGSGxGa1cfRMujZpS9h+5RSWmFcZx1lbo60LG0bpV3JgO6q+hzWzv4aCdzIzt9mRGd0oGZdzdsEijBjHKPPyFcwGpxxS0oOeCeezJhscGyGxTIAd9PkrAnX6gF4lOyHaQAQobF3ymUpRFrOP0oQEUnoorVjlyUB7HmY6wQjOEJq/9lLfc7ZHA/7tUP2wzwA4ES4O0V5SWmWeicg0mpnGnclRBpHD0ecoivfQjPeJwVDkZwgVR56/W8Yc2Q/OAEAJZqZWR8g8rGiqHWvZ47jlRHzmMWu6FBXDV5mO8E7ed6dl03ZPuwUBKyW/fALAIKvGaoYb+fB1HQ45FTTAmu/V04Nqey9jPLKjjAFloP2UPlH9mNyBiDibGhlp0GdeUNw58+KbAU7wb/DCYbof3q4nj9WEX8PIEIg0AQKDu8hMwbgG5zgqjJh0X+cAnkwfsCC6RH1U87kX5XITEHHBVhft9D/++8kjPmz5WmFDEBbWFGRspt7LHL1qnmArW7tUk2xPaTPT8t+PDYA2CWNC6H170eCkj9uJtweqkNPk/GnB36PCQCuBjpBaJ9tqLBxDtjdoEPGWWONfVMPyQA8+aKftJHCAgCcIAD78iTmtTZnKd/TkDyhjwAAAAAAAAAAAMCqGYBZs9bPGax3OwZoUne1N8Izkna0Adp/SP5F02rDZZdPi427xrgsrTPObVTjpzevmPQ494+wyncr9btc/H3989Omnf/8vuE0opXf+lONZau89a9e9emKVqQAQG2dXjiAQ/QNAgC28x80FnffveUNIwAYkThuAKDRjllBh/upFaV+mB7RdAiyrR2ytW3h2DD2zagKMlIunHHXcRmM/XnlnIW0rvp2coIABu18E0yRAzpt/CgbjnbYn9tvHfrWtNWcv5YvMOQBKnDp8Kgt2O72wHY1R7pUG3Zl7zzGhzUTN6THnpkPZBmKc98saZoEANF36HsbrqT0jJWjGan4hd2Fzw6QWlB6bRLtJwXExdn5e9LMg/9uQXOZAIDiXJqDgUgfvxkGIgme8c48wMH5O6srnWgLtH2WDHAzZ21zfsxGdpiJz8w23KE+ZIxV7wJIjgYiOdOPmPVIhH9Pwcd0R6TgvJMsUc1eWrMMAppAf5qjXs+QoxnO2DPgqBOc/wyargFA1BmMV3s8Z//JiR/IAOg50QiZAKmjjcBLC2dMedcqCEiDz1qOVZng/LMjzatNjNWQ5tXmQtamQ238GimyxyUv0WbbM/uaNuHzbs4/BQqkOI72atNZmqxvmndrcJZwIlxD7KmL1Wkm3qNpTS99BB7WNE9nen2hUjp+NySsA8dmEvHfRmjaDsD8s/BR6gCsfAwwutxopv1TZNlmtEOLJwm2ZS7tJ/UzQgbA8ppbLm3vI3dPA/j43HFM4An0AdgbvwPKE/U4oKQN02bBg88fRt94/xaMHgAAo9A+BlfRz3kBwExn/21dNRk6qyc7wF37bhHwNYdvrTgmzUHOWkA5jtZvr6ztt410xcgxnkK+79DP6QFANOeUDBX5qUHArn3vLWNx+90cedgO+ubCNNDuNNjvROS1VzCnGSSs1G+LWelTsgzb49dh1rH6bAYZACDqmMzcj6MZcK3Eq7ZYvwHgEj8GQr/jLBh9B3bjeTP89+TU5/bQsYZeAq4BQHJWiquf5zcQTe/dd2+ZjtaPaLU0mgNPrasdpqD99kTdjM7W/fxlCB3WwdF3YK5B5p4cuRu/3WeRafGxXjFovyoYJHFiWUAH/eQKC+6FR9/RdzOa3O+RN3Yp9GOk3U3QRm15I39HecylxaZm91tjg1wRyqeETkY//+0nMgCYBT+x75R2NIz78jNZKs/bJPqWwbJ1v0dnkj2nqHVUrecUT/RTDxH3AEQD+o7+RXCk6SE8H92cOHJvh+V+itn9HkE+fFLVPTrWF+c8pZ//ExrUhEffF+j7XVtYqewvKbsRnnMDALVz+YP9aINtHlkCGOU7W16VxnxkbKL02yrQ1aCdO7Pvy4I4T+onMgCYBe/ad+5Vuh7X6rYHjWEKJC9tgb5Gkjfvq4E/Z6sr0Xl6P0UBAM7Co+9ol227mxPN5vy+ZjakbSBbUft9NVv1SInPdopP6ScyAMgAhO57Gnw3wg1vs+6jWHH2q7X7fWa/0qb9FqeqBU5x9rr/E/r5XXiwDo6+G/Sd9E3BcaneNz2PaDVhW4bXmAX9SIxnmvD9f9pJXB/VqOV/K6MKY64xNlH67RJ4EGmrON8n9RMZAGQAdu+fZCafAvUlorxYXhrk0e8WdJzS5HGzgkeq2mvmjX4iA4AMQGcW7HVTGmU2PtKuNkCTy3vJTFrSbo0MACcr0UYyLMKZ2Yij68qmwpizsjkL9DvCrFzN5jypn9r41RI2zJCXmOmNfDdN4KdJhTQnPl85zBRM/hLT0Vu1YcY9HRS6bcN+z54VR9gM95R+3gKnANbp++wLZXrH7lpQOYl4lDFSX3GzHODtFGdvhntKP9UCAGQAYgcBns535JbFyKcKrG+KW12+rTMs0WyM1+77KP32OArnddwO/aQKH9bBQ/XdZYYoXBNVN3YOFby469Laa8KU74nkXXEMk9E3JOM7WqHwELZDsu8hDdCL0u93h6W6Ue0L7R4NsZ19Uj9nBQC4Fc4vABh1xF2jNeAEVWc5mwUAaaBt2k5Gw6EMZ3WE46t+4kBhoxaL/kL9NpsACSc23Fnx+bR+amO12wBxK5zc+Xt+IwqaUiBnLV8z5QV4NiJshnufPaOfngZgsQwApS2SIjQ7ZADIM0qlQiWzZkqa4y6ZsTdBX5vy97QyABr7HpLB+Krqo4G8W8m1d7/NzqgLLvoS25cn9XNWADDiCFe4FS5aNTyJMCUhvy1mqUnJQGm3MRmkgzWdKQIABACe/Tbb6BgsANimn9qIeApgxq1wEVOh6aBVxft8Jhm2RaO91vyaRTua7Iw+g+WBvfkS/ow6+mmP1fYAaM3WJHTSxHZFKx4T2Sh+28MAZwZnKJGbXbHMMTX0M0YAsJIyUlLhHkEA2XBapHacgq3hhhv1PTnKXgrW/ic6NAQ8PKfoUpv+TbcT+hlUoBlHGJ5+KxyFF+z3Zzl/xWNKSUFxovXdYs+DalCxSNC40h4Asr1SpDej3y4Fjrzl8yn9nJkB8E6DS2byyWn2Y3qJB2ZE4AEwbSx3zppg3X+vfg7jh/l8U3wuMZSS8kwStBPGfDwQ4pYDhlMHIsvzrjLRWw9/Oc42+Cvo57oZAOrtWN510z03waUj7v3jmB3tzz8EH/Gc/xNmxejnA/E7SVm+lmiFs9vCiD7JgcFZw9kDwLL4gVEzN+5pI54+6ew49ACALACPzABYzoDToorfNu6npF84aw9HgzEBgA0DAKsgIMEQBOnM+JLL0w1jEr6D9PNcNMg4APwR8CiXwgAAAJh5fX699uXqWwCAZgbgShEQQQMAsOyk582OpS9/AgAyAK6NQMQMAAAAAAAAAAAAAJtmAJTvgjejhewEAAAAsCPu9gBwL3/RKKPJvXFO44Ial0sjAAAAACASfgSOrxk5/zsHzaGZGN/EkSwAAAAAAYDSbH/E+VOr5o06/8Oo/QAAAACwRQBACQLU74kPQo8bLAAAAADAVgGAJBMw6oyvMgGjDhnlfAEAAADg4N0GGPk60xTsOwAAAACwRQaA6iC1HWhypAnnDwAAACAAWMSBah73AwAAAIDH4Ffwzsopfsz+AQAAAEA5A7AykB0AAAAAEAA8EMgAAAAAAI/C76RZ8MgVwxaOHVeBAgAAAMgAPHBWD+cPAAAAIADYBM3oWQAAAABAAIAMAAAAAAAgAFjV2SIDAAAAACAAmOD83yv+Uf/cPSgBAAAAADP8KjvB0Zm0lvNPgnYjCAAAAACQATBw/l4ONjm9AwAAAAAIABzRDBw59gAAAAAACAACz/6bEQ1kAAAAAAAEAAs6/8jfBgAAAIBtMwCznX8K0k4AAAAAeEQA4DFz9sgwIAMAAAAAIAAI5Ji9gAwAAAAAgAAgkPPfYX8BAAAAAGyVAbCGZ4YBGQAAAAAAAUAAx+y9vIAMAAAAAIAAIPhMGncBAAAAAIBzABBh1/8uNAEAAABgGn6VnGT0Sn/IAAAAAACAIACIMPOXtCExaCMIAAAAAB4DyhLAEwrxwPkDAAAACAAeCOwBAAAAABAAOM/+IwAZAAAAAAABwMOcPzIAAAAAwOPwK3xvOeefUsIsHwAAAAA6AYDLjPjNJ8M5AwAAAIAjfgTOH84aAAAAADYLAOD8AQAAAOAB4O4B0FoaQCABAAAAAEEyANgJDwAAAAAPDAAAAAAAAEAAAAAAAAAAAgAAAAAAABAAAAAAAAAAAAAAAACwEP4PnPRw5LZtfucAAAAASUVORK5CYII=\"}")
}, St = /* @__PURE__ */ new Map(), Ct = (e) => xt[e]?.height ?? e;
function W(e, t) {
	let n = xt[t];
	if (!n) return 0;
	let r = [...e], i = 0;
	return r.forEach((e, t) => {
		if (e === " " && n.smooth) {
			i += n.space;
			return;
		}
		let a = n.glyphs[e.codePointAt(0)];
		if (!a) {
			n.smooth && (i += n.space + 1);
			return;
		}
		n.smooth && i === 0 && a[5] < 0 && (i -= a[5]), i += t < r.length - 1 ? a[4] : a[5] + a[2];
	}), i;
}
var wt = class extends L {
	constructor(...e) {
		super(...e), this.text = "", this.size = 13, this.color = "#d3d3d3", this.generation = 0;
	}
	static {
		this.styles = o`:host {display:block; pointer-events:none} canvas {display:block; max-width:none; image-rendering:pixelated}`;
	}
	render() {
		return A`<canvas aria-hidden="true" width=${Math.max(1, W(this.text, this.size))} height=${Ct(this.size)}></canvas>`;
	}
	updated() {
		this.paint();
	}
	async paint() {
		let e = ++this.generation, t = xt[this.size];
		if (!t) return;
		St.has(this.size) || St.set(this.size, new Promise((e, n) => {
			let r = new Image();
			r.onload = () => e(r), r.onerror = n, r.src = t.atlas;
		}));
		let n = await St.get(this.size);
		if (e !== this.generation || !this.isConnected) return;
		let r = this.shadowRoot.querySelector("canvas"), i = r.getContext("2d");
		i.clearRect(0, 0, r.width, r.height);
		let a = 0;
		for (let e of this.text) {
			if (e === " " && t.smooth) {
				a += t.space;
				continue;
			}
			let r = t.glyphs[e.codePointAt(0)];
			if (!r) {
				t.smooth && (a += t.space + 1);
				continue;
			}
			let [o, s, c, l, u, d, f] = r;
			t.smooth && a === 0 && d < 0 && (a -= d), c && l && i.drawImage(n, o, s, c, l, a + d, t.ascent + f, c, l), a += u;
		}
		i.globalCompositeOperation = "source-in", i.fillStyle = this.color, i.fillRect(0, 0, r.width, r.height), i.globalCompositeOperation = "source-over";
	}
};
V([z()], wt.prototype, "text", void 0), V([z({ type: Number })], wt.prototype, "size", void 0), V([z()], wt.prototype, "color", void 0), customElements.define("mini-display-firmware-text", wt);
//#endregion
//#region src/preview-styles.ts
var Tt = o`
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
`, Et = class {
	valueFontSize(e, t, n, r) {
		let i = [
			18,
			24,
			36,
			48
		], a = i.map(Ct), o = e.valueStyle?.fontSize ?? "auto", s = o === "small" ? 0 : o === "medium" ? 1 : o === "large" ? 2 : o === "xlarge" || r >= 58 ? 3 : r >= 42 ? 2 : +(r >= 28);
		if ((e.valueStyle?.textFlow ?? "default") !== "default") return i[o === "auto" ? Math.min(s, 1) : s];
		for (; s > 0 && !(a[s] <= r && (ct(e.valueStyle) || W(t, i[s]) <= n - 6));) --s;
		return i[s];
	}
	fontLineHeight(e) {
		return Ct(e);
	}
	titleFontSize(e, t, n, r, i) {
		let a = e.titleStyle?.fontSize ?? "auto", o = e.titleStyle?.fontFamily ?? "sans", s = [
			"default",
			"sans",
			"sans-bold"
		].includes(o);
		if (a !== "auto") return {
			small: s ? 13 : 18,
			medium: 24,
			large: 36,
			xlarge: 48
		}[a];
		if ((e.titleStyle?.textFlow ?? "default") !== "default") return s ? 13 : 24;
		let c = i >= 48 ? 24 : i >= 24 ? 18 : 13, l = [
			48,
			36,
			24,
			18,
			13
		].filter((e) => e <= c && (e !== 13 || s));
		for (let i of l) if (!(this.fontLineHeight(i) > r) && (ct(e.titleStyle, !0) || W(t, i) <= n - 6)) return i;
		return s ? 13 : 18;
	}
	freeFontSize(e, t, n, r, i = !1) {
		let a = [
			"default",
			"sans",
			"sans-bold"
		].includes(t?.fontFamily ?? "default");
		return [
			48,
			36,
			24,
			18,
			...a ? [13] : []
		].find((a) => this.fontLineHeight(a) <= r && (i || t?.textFlow === "overflow" || W(e, a) <= n - 8)) ?? (a ? 13 : 18);
	}
	textEffectCss(e) {
		let t = e?.textEffect ?? "none";
		if (t === "none") return "";
		let n = e?.effectColor ?? "background", r = U[n] ?? n, i = Math.max(1, Math.min(3, Math.round(e?.effectThickness ?? 1))), a = [];
		if (t === "outline") for (let e = 1; e <= i; e += 1) for (let [t, n] of [
			[-e, 0],
			[e, 0],
			[0, -e],
			[0, e],
			[-e, -e],
			[e, -e],
			[-e, e],
			[e, e]
		]) a.push(`${t}px ${n}px 0 ${r}`);
		else {
			let t = Math.max(-6, Math.min(6, e?.effectOffsetX ?? 2)), n = Math.max(-6, Math.min(6, e?.effectOffsetY ?? 2)), o = i - 1;
			for (let e = -o; e <= o; e += 1) for (let i = -o; i <= o; i += 1) a.push(`${t + e}px ${n + i}px 0 ${r}`);
		}
		return `text-shadow:${a.join(",")}`;
	}
	textFlowCss(e, t) {
		return e?.textFlow === "overflow" ? "white-space:pre;overflow:visible;max-width:none;flex-shrink:0;text-overflow:clip" : e?.textFlow === "wrap" ? `white-space:pre-wrap;overflow-wrap:anywhere;overflow:hidden;max-width:100%;max-height:min(100%,${6 * this.fontLineHeight(t)}px);line-height:${this.fontLineHeight(t)}px;text-overflow:clip` : "";
	}
}, Dt = class {
	constructor(e) {
		this.host = e, this.down = (e) => {
			this.pointerDown(e), this.host.requestUpdate();
		}, this.move = (e) => {
			(this.freeDrag || this.pointerCandidate) && (this.pointerMove(e), this.host.requestUpdate());
		}, this.up = (e) => {
			(this.freeDrag || this.pointerCandidate) && (this.pointerUp(e), this.host.requestUpdate());
		}, this.cancel = (e) => {
			(this.freeDrag || this.pointerCandidate) && (this.pointerCancel(e), this.host.requestUpdate());
		}, this.dragTarget = "", this.dragPoint = {
			x: 0,
			y: 0
		}, this.suppressClickUntil = 0, this.preventClickAfterDrag = (e) => {
			Date.now() >= this.suppressClickUntil || (e.preventDefault(), e.stopImmediatePropagation());
		}, this.pointerDown = (e) => {
			if (!this.interactive) return;
			let t = this.dashboard?.pages[this.page];
			if (t?.layout === "free") {
				let n = e.composedPath().filter((e) => e instanceof HTMLElement), r = n.find((e) => e.classList.contains("card"));
				if (!r || e.pointerType === "mouse" && e.button !== 0) return;
				let i = Number(r.dataset.row), a = Number(r.dataset.card), o = t.rows[i]?.cards[a];
				if (!o?.frame) return;
				let s = n.find((e) => e.dataset.part)?.dataset.part ?? "card", c = We(o, s);
				e.preventDefault(), this.freeDrag = {
					row: i,
					card: a,
					part: s,
					pointerId: e.pointerId,
					startX: e.clientX,
					startY: e.clientY,
					resize: n.some((e) => e.classList.contains("resize-handle")),
					moved: !1,
					start: { ...c },
					frame: { ...c }
				};
				return;
			}
			let n = e.composedPath().filter((e) => e instanceof HTMLElement), r = n.find((e) => e.matches?.(".card-label,.value,.page-title span"));
			if (!r) return;
			if (r.matches(".page-title span")) {
				this.startPointer(e, {
					kind: "page-title",
					label: r.textContent?.trim() || "Page title"
				});
				return;
			}
			let i = n.find((e) => e.classList?.contains("card")), a = n.find((e) => e.classList?.contains("group"));
			if (!i || !a) return;
			let o = Array.from(this.shadowRoot?.querySelectorAll(".group") ?? []), s = Array.from(a.querySelectorAll(".card")), c = o.indexOf(a), l = s.indexOf(i), u = this.dashboard?.pages[this.autoRotate ? this.autoPage : this.page];
			if (!u || c < 0 || l < 0) return;
			let d = u.rows.map((e, t) => {
				let n = bt(this.hass, e.visibility);
				return {
					rowIndex: t,
					cards: e.cards.map((e, t) => ({
						cardIndex: t,
						hidden: !n || !bt(this.hass, e.visibility, e)
					})).filter(({ hidden: e }) => this.showHidden || !e)
				};
			}).filter(({ cards: e }) => e.length > 0), f = d[c]?.rowIndex, p = d[c]?.cards[l]?.cardIndex;
			f !== void 0 && p !== void 0 && this.startPointer(e, {
				kind: r.classList.contains("card-label") ? "title" : "value",
				row: f,
				card: p,
				label: r.getAttribute("aria-label") || r.textContent?.trim() || (r.classList.contains("card-label") ? "Title" : "Value")
			}, i);
		}, this.pointerMove = (e) => {
			if (this.freeDrag?.pointerId === e.pointerId) {
				let t = this.freeDrag, n = this.shadowRoot.querySelector(".screen").getBoundingClientRect(), r = (e.clientX - t.startX) * 100 / n.width, i = (e.clientY - t.startY) * 100 / n.height;
				if (!t.moved && Math.hypot(e.clientX - t.startX, e.clientY - t.startY) < 4) return;
				e.preventDefault();
				let a = (e) => Math.round(e * 2) / 2, o = t.resize ? {
					...t.start,
					width: Math.min(100 - t.start.x, Math.max(2, a(t.start.width + r))),
					height: Math.min(100 - t.start.y, Math.max(2, a(t.start.height + i)))
				} : {
					...t.start,
					x: Math.min(100 - t.start.width, Math.max(0, a(t.start.x + r))),
					y: Math.min(100 - t.start.height, Math.max(0, a(t.start.y + i)))
				};
				this.freeDrag = {
					...t,
					moved: !0,
					frame: o
				};
				return;
			}
			let t = this.pointerCandidate;
			if (!t || t.pointerId !== e.pointerId) return;
			let n = Math.hypot(e.clientX - t.startX, e.clientY - t.startY);
			if (!this.dragging && n < 5) return;
			e.preventDefault(), this.dragging ||= {
				kind: t.kind,
				row: t.row,
				card: t.card,
				label: t.label
			}, this.dragPoint = {
				x: e.clientX,
				y: e.clientY
			};
			let r = this.shadowRoot?.querySelector(".screen");
			if (!r) return;
			let i = r.getBoundingClientRect();
			if (e.clientX < i.left || e.clientX > i.right || e.clientY < i.top || e.clientY > i.bottom) {
				this.dragTarget = "";
				return;
			}
			if (t.kind === "page-title") {
				let t = [
					{
						target: "top",
						value: e.clientY - i.top
					},
					{
						target: "right",
						value: i.right - e.clientX
					},
					{
						target: "bottom",
						value: i.bottom - e.clientY
					},
					{
						target: "left",
						value: e.clientX - i.left
					}
				];
				this.dragTarget = t.reduce((e, t) => t.value < e.value ? t : e).target;
				return;
			}
			let a = t.cardElement;
			if (!a) return;
			let o = a.getBoundingClientRect();
			if (e.clientX < o.left || e.clientX > o.right || e.clientY < o.top || e.clientY > o.bottom) {
				this.dragTarget = "";
				return;
			}
			let s = [
				"left",
				"center",
				"right"
			][Math.min(2, Math.floor((e.clientX - o.left) / (o.width / 3)))], c = [
				"top",
				"middle",
				"bottom"
			][Math.min(2, Math.floor((e.clientY - o.top) / (o.height / 3)))];
			this.dragTarget = `${s}-${c}`;
		}, this.pointerUp = (e) => {
			if (this.freeDrag?.pointerId === e.pointerId) {
				let e = this.freeDrag;
				this.freeDrag = void 0, this.suppressClickUntil = Date.now() + 350, this.emit(e.moved ? "preview-frame" : "preview-select", e.moved ? {
					row: e.row,
					card: e.card,
					part: e.part,
					frame: e.frame
				} : {
					row: e.row,
					card: e.card,
					kind: e.part
				});
				return;
			}
			let t = this.pointerCandidate;
			if (t && t.pointerId === e.pointerId) {
				if (this.dragging) {
					if (e.preventDefault(), e.stopPropagation(), t.kind === "page-title" && [
						"top",
						"right",
						"bottom",
						"left"
					].includes(this.dragTarget)) this.emit("preview-position", {
						kind: "page-title",
						position: this.dragTarget
					});
					else {
						let [e, n] = this.dragTarget.split("-");
						[
							"left",
							"center",
							"right"
						].includes(e) && [
							"top",
							"middle",
							"bottom"
						].includes(n) && this.emit("preview-position", {
							kind: t.kind,
							row: t.row,
							card: t.card,
							horizontalAlign: e,
							verticalAlign: n
						});
					}
					this.suppressClickUntil = Date.now() + 350;
				} else this.emit("preview-select", {
					kind: t.kind,
					row: t.row,
					card: t.card
				}), this.suppressClickUntil = Date.now() + 100;
				this.stopDrag();
			}
		}, this.pointerCancel = (e) => {
			this.freeDrag?.pointerId === e.pointerId && (this.freeDrag = void 0), this.pointerCandidate?.pointerId === e.pointerId && this.stopDrag();
		}, e.addController(this);
	}
	get dashboard() {
		return this.host.dashboard;
	}
	get hass() {
		return this.host.hass;
	}
	get page() {
		return this.host.page;
	}
	get autoPage() {
		return this.host.autoPage;
	}
	get autoRotate() {
		return this.host.autoRotate;
	}
	get interactive() {
		return this.host.interactive;
	}
	get showHidden() {
		return this.host.showHidden;
	}
	get shadowRoot() {
		return this.host.shadowRoot;
	}
	emit(e, t) {
		this.host.emit(e, t);
	}
	hostConnected() {
		this.host.addEventListener("pointerdown", this.down), this.host.addEventListener("click", this.preventClickAfterDrag, !0), window.addEventListener("pointermove", this.move, { passive: !1 }), window.addEventListener("pointerup", this.up, !0), window.addEventListener("pointercancel", this.cancel, !0);
	}
	hostDisconnected() {
		this.host.removeEventListener("pointerdown", this.down), this.host.removeEventListener("click", this.preventClickAfterDrag, !0), window.removeEventListener("pointermove", this.move), window.removeEventListener("pointerup", this.up, !0), window.removeEventListener("pointercancel", this.cancel, !0), this.freeDrag = void 0, this.stopDrag();
	}
	clickSelect(e, t) {
		e.stopPropagation(), !(Date.now() < this.suppressClickUntil) && this.emit("preview-select", t);
	}
	startPointer(e, t, n) {
		!this.interactive || e.pointerType === "mouse" && e.button !== 0 || (e.preventDefault(), e.stopPropagation(), this.pointerCandidate = {
			pointerId: e.pointerId,
			startX: e.clientX,
			startY: e.clientY,
			...t,
			cardElement: n
		});
	}
	startDrag(e, t) {
		e.preventDefault();
	}
	stopDrag() {
		this.pointerCandidate = void 0, this.dragging = void 0, this.dragTarget = "";
	}
	positionGrid(e, t) {
		if (!this.dragging || this.dragging.kind === "page-title" || this.dragging.row !== e || this.dragging.card !== t) return null;
		let n = [
			"left",
			"center",
			"right"
		];
		return A`<div class="drop-grid" aria-label="Choose text position">
      ${[
			"top",
			"middle",
			"bottom"
		].flatMap((e) => n.map((t) => {
			let n = `${t}-${e}`;
			return A`<div
            class="drop-cell ${this.dragTarget === n ? "active" : ""}"
          ></div>`;
		}))}
    </div>`;
	}
	pageDropzones() {
		let e = this.dragging ? A`<div
          class="drag-ghost"
          style=${`left:${this.dragPoint.x}px;top:${this.dragPoint.y}px`}
        >
          ${this.dragging.label}
        </div>` : null;
		if (this.dragging?.kind !== "page-title") return e;
		let t = [
			"top",
			"right",
			"bottom",
			"left"
		], n = {
			top: "mdi:arrow-up",
			right: "mdi:arrow-right",
			bottom: "mdi:arrow-down",
			left: "mdi:arrow-left"
		};
		return A`${e}
      <div class="page-dropzones">
        ${t.map((e) => A`<div class="page-dropzone ${e} ${this.dragTarget === e ? "active" : ""}"><ha-icon icon=${n[e]}></ha-icon></div>`)}
      </div>`;
	}
}, G = class extends L {
	constructor(...e) {
		super(...e), this.assets = [], this.page = 0, this.autoRotate = !1, this.width = 240, this.height = 240, this.refreshRateHz = 60, this.displayId = "", this.interactive = !1, this.showHidden = !1, this.now = /* @__PURE__ */ new Date(), this.autoPage = 0, this.pageShownAt = Date.now(), this.historySeries = [], this.historyPending = !1, this.historyFetched = 0, this.interaction = new Dt(this), this.typography = new Et();
	}
	static {
		this.styles = Tt;
	}
	connectedCallback() {
		super.connectedCallback(), this.clockTimer = window.setInterval(() => {
			this.now = /* @__PURE__ */ new Date(), Date.now() - this.historyFetched > 3e4 && this.fetchData();
			let e = this.dashboard?.pages ?? [], t = (e[this.autoPage]?.durationSeconds ?? 10) * 1e3;
			this.autoRotate && e.length > 1 && Date.now() - this.pageShownAt >= t && (this.autoPage = (this.autoPage + 1) % e.length, this.pageShownAt = Date.now());
		}, 1e3);
	}
	disconnectedCallback() {
		window.clearInterval(this.clockTimer), super.disconnectedCallback();
	}
	emit(e, t) {
		this.dispatchEvent(new CustomEvent(e, {
			detail: {
				displayId: this.displayId,
				page: this.autoRotate ? this.autoPage : this.page,
				...t
			},
			bubbles: !0,
			composed: !0
		}));
	}
	cardValue(e) {
		if (e.type === "image" || e.type === "chart" || e.type === "weather") return "";
		if (e.type === "clock") return this.now.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
			second: e.showSeconds ? "2-digit" : void 0,
			hour12: e.format === "12h"
		});
		let t = e.source ? this.hass?.states[e.source]?.state ?? "-" : e.text ?? "-";
		if (e.type === "status") return [
			"on",
			"true",
			"1",
			"open",
			"home"
		].includes(t.toLowerCase()) ? e.onText ?? "On" : e.offText ?? "Off";
		let n = Be(e, t);
		return `${n.value}${!n.mapped && e.unit ? e.unit : ""}`;
	}
	imageUrl(e) {
		return this.assets.find((t) => t.id === e)?.preview ?? "";
	}
	async fetchData() {
		if (this.hass && this.displayId && !this.historyPending && (this.historyFetched = Date.now(), this.dashboard?.pages.some((e) => e.rows.some((e) => e.cards.some((e) => e.graph))))) {
			this.historyPending = !0;
			try {
				let e = await this.hass.callWS({
					type: "mini_display/data",
					config_entry_id: this.displayId
				});
				this.isConnected && (this.historySeries = e.series);
			} catch {} finally {
				this.historyPending = !1;
			}
		}
	}
	render() {
		let e = this.dashboard?.pages[this.autoRotate ? this.autoPage : this.page], t = `aspect-ratio:${Math.max(1, this.width)}/${Math.max(1, this.height)}`;
		if (!e) return A`<div class="screen-frame" style=${t}>
        <div class="screen loading" aria-label="Loading display preview"></div>
      </div>`;
		let n = e.layout === "free", r = e.rows.map((e, t) => {
			let n = bt(this.hass, e.visibility), r = e.cards.map((e, t) => ({
				card: e,
				cardIndex: t,
				hidden: !n || !bt(this.hass, e.visibility, e)
			})).filter(({ hidden: e }) => this.showHidden || !e);
			return {
				row: e,
				rowIndex: t,
				hidden: !n,
				cards: r
			};
		}).filter(({ cards: e }) => e.length > 0);
		if (r.length === 0 && !n) return A`<div class="screen-frame" style=${t}>
        <div class="screen">
          <div class="card"><div class="value">No visible content</div></div>
        </div>
      </div>`;
		let i = !n && !!(e.title && e.showTitle !== !1), a = e.titlePosition ?? "top", o = e.style?.background ?? "", s = (U[o] ?? o) || "#000000", c = e.titleStyle?.background ?? "", l = e.titleStyle?.foreground ?? "", u = (U[c] ?? c) || s, d = (U[l] ?? l) || "#ffffff", f = e.titleStyle?.fontSize ?? "small", p = {
			small: 25,
			medium: 32,
			large: 46,
			xlarge: 61,
			auto: 25
		}[f], m = {
			small: 18,
			medium: 24,
			large: 36,
			xlarge: 48,
			auto: 18
		}[f], h = i && (a === "top" || a === "bottom") ? p : 0, g = i && (a === "left" || a === "right") ? p : 0, _ = this.width - 12 - g, v = this.height - 12 - h - 4 * Math.max(0, r.length - 1), y = r.reduce((e, t) => e + (t.row.weight ?? 1), 0) || 1, ee = i ? a === "top" ? `top:${p + 6}px;right:6px;bottom:6px;left:6px` : a === "bottom" ? `top:6px;right:6px;bottom:${p + 6}px;left:6px` : a === "left" ? `top:6px;right:6px;bottom:6px;left:${p + 6}px` : `top:6px;right:${p + 6}px;bottom:6px;left:6px` : "inset:6px", b = this.imageUrl(e.backgroundImage), te = `${a === "top" || a === "bottom" ? `height:${p}px` : `width:${p}px`};background:${u};color:${d};font-size:${m}px`;
		return A`<div class="screen-frame" style=${t}>
      <div
        class="screen"
        style=${`background-color:${s};${b ? `background-image:url(${b});background-size:cover;background-position:center` : ""}`}
      >
        ${i ? A`<div
                class="page-title ${a} ${this.interactive ? "interactive" : ""}"
                style=${te}
                @click=${(e) => {
			e.stopPropagation(), this.emit("preview-select", { kind: "page-title" });
		}}
              >
                <span
                  .draggable=${this.interactive}
                  @dragstart=${(e) => this.interaction.startDrag(e, { kind: "page-title" })}
                  @dragend=${() => this.interaction.stopDrag()}
                  >${e.title}</span
                >
              </div>` : null}${this.interaction.pageDropzones()}
        <div class="page-content ${n ? "free-layout" : ""}" style=${n ? "inset:0" : ee}>
          ${r.map(({ row: t, rowIndex: r, hidden: i, cards: a }) => {
			let o = v * (t.weight ?? 1) / y;
			return o - (t.title && t.showTitle !== !1 && o >= 24 ? 17 : 0), (_ - 4 * Math.max(0, a.length - 1)) / a.length, A`<div
              class="group ${i ? "hidden-item" : ""}"
              style="flex:${t.weight ?? 1}"
            >
              ${t.title && t.showTitle !== !1 ? A`<div
                      class="title ${this.interactive ? "interactive" : ""}"
                      @click=${(e) => {
				e.stopPropagation(), this.emit("preview-select", {
					kind: "row",
					row: r
				});
			}}
                    >
                      ${t.title}
                    </div>` : null}
              <div
                class="row"
                style="grid-template-columns:repeat(${a.length},minmax(0,1fr))"
              >
                ${a.map(({ card: s, cardIndex: c, hidden: l }) => {
				let u = this.interaction.freeDrag?.row === r && this.interaction.freeDrag.card === c, d = u && this.interaction.freeDrag.part === "card" ? this.interaction.freeDrag.frame : s.frame, f = (e) => u && this.interaction.freeDrag.part === e ? this.interaction.freeDrag.frame : We(s, e), p = f("title"), m = f("value"), h = (e) => {
					let t = f(e);
					return `left:${(t.x - (d?.x ?? 0)) * this.width / 100}px;top:${(t.y - (d?.y ?? 0)) * this.height / 100}px;width:${t.width * this.width / 100}px;height:${t.height * this.height / 100}px;`;
				}, g = n ? (d?.width ?? 50) * this.width / 100 : (_ - 4 * Math.max(0, a.length - 1)) / a.length, v = n ? (d?.height ?? 25) * this.height / 100 : o - (t.title && t.showTitle !== !1 && o >= 24 ? 17 : 0), y = s.source ? this.hass?.states[s.source]?.state ?? "-" : s.text ?? "-", ee = He(s, y), b = s.minimum ?? 0, te = s.maximum ?? 100, x = Number.isFinite(ee) && te > b ? Math.max(0, Math.min(100, (ee - b) / (te - b) * 100)) : 0, S = this.cardValue(s), ne = !!(s.title && s.showTitle !== !1 && (n || v >= 28)), C = s.titleStyle?.verticalAlign ?? "top", re = ne && (C === "top" || C === "bottom"), ie = s.progress === "bar" ? 14 : 5, w = v - (s.progress === "bar" ? 9 : 0), ae = this.typography.valueFontSize(s, S, g, Math.max(1, w - 17)), oe = (s.titleStyle?.fontSize ?? "auto") === "auto" ? Math.max(1, Math.min(w / 2, w - this.typography.fontLineHeight(ae))) : w, T = n ? this.typography.freeFontSize(s.title ?? "", s.titleStyle, p.width * this.width / 100, p.height * this.height / 100, ct(s.titleStyle, !0)) : ne ? this.typography.titleFontSize(s, s.title ?? "", g - 10, re ? oe : w, ae) : 13, E = re && s.titleStyle?.textFlow === "wrap" ? oe : re ? Math.min(oe, this.typography.fontLineHeight(T)) : 0, se = s.progress === "ring" ? Math.min(22, Math.max(12, (w - E) / 4)) : w - E, D = n ? this.typography.freeFontSize(S, s.valueStyle, m.width * this.width / 100, m.height * this.height / 100, ct(s.valueStyle, s.type === "text")) : this.typography.valueFontSize(s, S, g, se), ce = Ve(s, y), le = ce?.background ?? s.style?.background ?? "", O = ce?.foreground ?? s.style?.foreground ?? "", ue = (U[le] ?? le) || "#20242d", de = s.backgroundMode ?? (s.transparentBackground ? "transparent" : s.backgroundImage ? "image" : "color"), k = this.imageUrl(s.type === "image" ? s.image : de === "image" ? s.backgroundImage : void 0), fe = U[s.style?.accent ?? ""] ?? s.style?.accent ?? "#42a5f5", pe = (U[O] ?? O) || "white", me = {
					left: "flex-start",
					center: "center",
					right: "flex-end"
				}[s.valueStyle?.horizontalAlign ?? "center"], he = {
					top: "flex-start",
					middle: "center",
					bottom: "flex-end"
				}[s.valueStyle?.verticalAlign ?? "middle"], j = s.valueStyle?.horizontalAlign ?? "center", M = {
					left: "flex-start",
					center: "center",
					right: "flex-end"
				}[s.titleStyle?.horizontalAlign ?? "left"], ge = {
					top: "flex-start",
					middle: "center",
					bottom: "flex-end"
				}[C], P = 5 + (C === "top" ? E : 0), _e = ie + (C === "bottom" ? E : 0), ve = n ? h("value") : `top:${P}px;right:5px;bottom:${_e}px;left:5px`, ye = n ? h("title") : C === "top" ? `top:0;right:4px;height:${E}px;left:4px` : C === "bottom" ? `right:4px;bottom:${s.progress === "bar" ? 9 : 0}px;height:${E}px;left:4px` : `top:0;right:4px;bottom:${s.progress === "bar" ? 9 : 0}px;left:4px`, F = s.title ? Math.max(0, W(s.title, T) - (n ? p.width * this.width / 100 - 8 : g - 8)) : 0, be = ct(s.titleStyle, !0) && F > 0, xe = Math.max(0, W(S, D) - (n ? m.width * this.width / 100 - 8 : g - 8)), I = ct(s.valueStyle, n && s.type === "text") && xe > 0, Se = n && [
					"default",
					"sans",
					"sans-bold"
				].includes(s.valueStyle?.fontFamily ?? "default") && s.valueStyle?.textFlow !== "wrap" && (!s.valueStyle?.textEffect || s.valueStyle.textEffect === "none") ? A`<mini-display-firmware-text .text=${S} .size=${D} .color=${pe}></mini-display-firmware-text>` : S, Ce = ce?.foreground ?? s.titleStyle?.foreground ?? pe, we = [
					"default",
					"sans",
					"sans-bold"
				].includes(s.titleStyle?.fontFamily ?? "default") && s.titleStyle?.textFlow !== "wrap" && (!s.titleStyle?.textEffect || s.titleStyle.textEffect === "none") ? A`<mini-display-firmware-text .text=${s.title ?? ""} .size=${T} .color=${U[Ce] ?? Ce}></mini-display-firmware-text>` : s.title, Te = A`<div
                    class="value ${I ? "marquee" : ""}"
                    ${ut(I ? s.valueStyle?.marqueeEffect === "loop" ? W(S, D) + 24 : xe : 0, s.valueStyle, S, this.refreshRateHz)}
                    .draggable=${this.interactive}
                    style=${`font-family:sans-serif;font-size:${D}px;font-weight:700;${this.typography.textEffectCss(s.valueStyle)};${this.typography.textFlowCss(s.valueStyle, D)}`}
                    @click=${(e) => {
					e.stopPropagation(), this.emit("preview-select", {
						kind: "value",
						row: r,
						card: c
					});
				}}
                    @dragstart=${(e) => this.interaction.startDrag(e, {
					kind: "value",
					row: r,
					card: c
				})}
                    @dragend=${() => this.interaction.stopDrag()}
                  >
                    <span class="marquee-copy">${Se}</span>
                    ${I && s.valueStyle?.marqueeEffect === "loop" ? A`<span class="marquee-copy" aria-hidden="true">${Se}</span>` : N}
                  </div>`, Ee = n && (e.transparentCards || de === "transparent") && !s.graph && s.type !== "image";
				return A`<div
                    class="card ${Ee ? "text-only-frame" : ""} ${s.valueStyle?.textFlow === "overflow" || s.titleStyle?.textFlow === "overflow" ? "flow-overflow" : ""} ${u ? "moving" : ""} ${s.type === "image" ? "image-card" : ""} ${this.interactive ? "interactive" : ""} ${l && !i ? "hidden-item" : ""}"
                    data-row=${r} data-card=${c}
                    tabindex=${n && this.interactive ? 0 : -1}
                    aria-label=${s.title || s.text || s.source || "Item"}
                    @keydown=${(e) => {
					if (!n || !d || ![
						"ArrowLeft",
						"ArrowRight",
						"ArrowUp",
						"ArrowDown"
					].includes(e.key)) return;
					e.preventDefault();
					let t = e.shiftKey ? 5 : .5;
					this.emit("preview-frame", {
						row: r,
						card: c,
						frame: {
							...d,
							x: Math.max(0, Math.min(100 - d.width, d.x + (e.key === "ArrowLeft" ? -t : e.key === "ArrowRight" ? t : 0))),
							y: Math.max(0, Math.min(100 - d.height, d.y + (e.key === "ArrowUp" ? -t : e.key === "ArrowDown" ? t : 0)))
						}
					});
				}}
                    style=${`${n && d ? `left:${d.x}%;top:${d.y}%;width:${d.width}%;height:${d.height}%;` : ""}${e.transparentCards || de === "transparent" ? "background:transparent" : `background-color:${ue}`};${!e.transparentCards && k ? `background-image:url(${k});background-size:${s.imageFit === "contain" ? "contain" : s.imageFit === "stretch" ? "100% 100%" : "cover"};background-position:center;background-repeat:no-repeat;` : ""}color:${pe}`}
                    @click=${(e) => {
					e.stopPropagation(), this.emit("preview-select", {
						kind: "card",
						row: r,
						card: c
					});
				}}
                  >
                    ${s.graph ? A`<mini-display-graph-preview .graph=${s.graph} .source=${s.source ?? ""} .series=${this.historySeries} .width=${g} .height=${v}></mini-display-graph-preview>` : N}
                    ${n && this.interactive && !Ee ? A`<button class="resize-handle" aria-label="Resize item" @click=${(e) => e.stopPropagation()}></button>` : N}
                    ${s.title && s.showTitle !== !1 ? A`<small
                            data-part=${n ? "title" : N}
                            style=${`${ye};overflow:${s.titleStyle?.textFlow === "overflow" ? "visible" : "hidden"};align-items:${ge};justify-content:${be ? "flex-start" : M};text-align:${be ? "left" : s.titleStyle?.horizontalAlign ?? "left"};font-size:${T}px;line-height:${this.typography.fontLineHeight(T)}px`}
                            ><span
                              class="card-label ${be ? "marquee" : ""}"
                              ${ut(be ? s.titleStyle?.marqueeEffect === "loop" ? W(s.title ?? "", T) + 24 : F : 0, s.titleStyle, s.title ?? "", this.refreshRateHz)}
                              aria-label=${s.title ?? ""}
                              style=${`${this.typography.textEffectCss(s.titleStyle)};${this.typography.textFlowCss(s.titleStyle, T)}`}
                              .draggable=${this.interactive}
                              @click=${(e) => {
					e.stopPropagation(), this.emit("preview-select", {
						kind: "title",
						row: r,
						card: c
					});
				}}
                              @dragstart=${(e) => this.interaction.startDrag(e, {
					kind: "title",
					row: r,
					card: c
				})}
                              @dragend=${() => this.interaction.stopDrag()}
                              ><span class="marquee-copy">${we}</span>
                              ${be && s.titleStyle?.marqueeEffect === "loop" ? A`<span class="marquee-copy" aria-hidden="true">${we}</span>` : N}</span
                            >${n && this.interactive ? A`<button class="resize-handle" aria-label="Resize title"></button>` : N}</small
                          >` : null}${s.type === "weather" ? A`<div class="value-wrap" data-part=${n ? "value" : N} style=${ve}><mini-display-weather-preview style="position:absolute;inset:0" .hass=${this.hass} .card=${s} .signature=${JSON.stringify([s.source, s.weather])}></mini-display-weather-preview>${n && this.interactive ? A`<button class="resize-handle" aria-label="Resize value"></button>` : N}</div>` : s.type === "image" || s.type === "chart" ? N : s.progress === "ring" ? A`<div class="ring-stack" data-part=${n ? "value" : N} style=${ve}>
                              <div
                                class="ring"
                                style=${`background:conic-gradient(${fe} ${x}%,#3d424e 0);--ring-bg:${ue}`}
                              ></div>
                              ${Te}
                              ${n && this.interactive ? A`<button class="resize-handle" aria-label="Resize value"></button>` : N}
                            </div>` : A`<div
                              class="value-wrap"
                              data-part=${n ? "value" : N}
                              style=${`${ve};align-items:${he};justify-content:${I ? "flex-start" : me};text-align:${j};${I ? "overflow:hidden;padding-inline:4px" : ""}`}
                            >
                              ${Te}
                              ${n && this.interactive ? A`<button class="resize-handle" aria-label="Resize value"></button>` : N}
                            </div>`}${this.interaction.positionGrid(r, c)}${s.type !== "image" && s.progress === "bar" ? A`<div class="bar"><i style=${`width:${x}%;background:${fe}`}></i></div>` : null}
                  </div>`;
			})}
              </div>
            </div>`;
		})}
        </div>
      </div>
    </div>`;
	}
};
V([z({ attribute: !1 })], G.prototype, "dashboard", void 0), V([z({ attribute: !1 })], G.prototype, "hass", void 0), V([z({ attribute: !1 })], G.prototype, "assets", void 0), V([z({ type: Number })], G.prototype, "page", void 0), V([z({ type: Boolean })], G.prototype, "autoRotate", void 0), V([z({ type: Number })], G.prototype, "width", void 0), V([z({ type: Number })], G.prototype, "height", void 0), V([z({ type: Number })], G.prototype, "refreshRateHz", void 0), V([z()], G.prototype, "displayId", void 0), V([z({ type: Boolean })], G.prototype, "interactive", void 0), V([z({ type: Boolean })], G.prototype, "showHidden", void 0), V([B()], G.prototype, "now", void 0), V([B()], G.prototype, "autoPage", void 0), V([B()], G.prototype, "historySeries", void 0), customElements.get("mini-display-preview") || customElements.define("mini-display-preview", G);
//#endregion
//#region src/json-view.ts
var Ot = /"(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b/g, kt = (e) => {
	let t = JSON.stringify(e, null, 2), n = [], r = 0;
	for (let e of t.matchAll(Ot)) {
		let i = e.index, a = e[0];
		n.push(t.slice(r, i));
		let o = "number";
		a.startsWith("\"") ? o = /^\s*:/.test(t.slice(i + a.length)) ? "key" : "string" : a === "true" || a === "false" ? o = "boolean" : a === "null" && (o = "null"), n.push(A`<span class="json-${o}">${a}</span>`), r = i + a.length;
	}
	return n.push(t.slice(r)), n;
}, At = (e, t, n) => {
	e.dispatchEvent(new CustomEvent(t, {
		detail: n,
		bubbles: !0,
		composed: !0
	}));
}, K = class extends L {
	constructor(...e) {
		super(...e), this.displays = [], this.dashboards = {}, this.pages = {}, this.dirtyDisplays = /* @__PURE__ */ new Set(), this.assets = {}, this.selectedDisplayId = "", this.selectedSceneId = "", this.selectedSceneName = "", this.showHidden = !1, this.tabs = {};
	}
	selectTab(e, t) {
		this.tabs = {
			...this.tabs,
			[e]: t
		}, At(this, "schema-view-changed", Object.values(this.tabs).includes("schema"));
	}
	static {
		this.styles = o`
    :host {
      display: grid;
      gap: 12px;
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      position: sticky;
      top: 16px;
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
    }
    .preview-footer {
      display: flex;
      justify-content: center;
    }
    .show-hidden {
      display: flex;
      align-items: center;
      gap: 7px;
      min-height: 40px;
      color: var(--secondary-text-color);
      font-size: 12px;
      cursor: pointer;
    }
    .show-hidden input {
      width: 18px;
      height: 18px;
      margin: 0;
    }
    ha-card {
      display: grid;
      gap: 10px;
      padding: 12px;
      border: 2px solid transparent;
      cursor: pointer;
    }
    ha-card.selected {
      border-color: var(--primary-color);
    }
    .tabs {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      border-bottom: 1px solid var(--divider-color);
    }
    .tab-list {
      display: flex;
      gap: 4px;
    }
    .tab {
      min-height: 38px;
      padding: 0 10px;
      color: var(--secondary-text-color);
      background: transparent;
      border: 0;
      border-bottom: 2px solid transparent;
      font: inherit;
      cursor: pointer;
    }
    .tab.active {
      color: var(--primary-color);
      border-bottom-color: var(--primary-color);
    }
    .icon {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      padding: 0;
      color: var(--secondary-text-color);
      background: transparent;
      border: 0;
      border-radius: 50%;
      cursor: pointer;
    }
    .icon:hover,
    .icon.active {
      color: var(--primary-color);
      background: var(--secondary-background-color);
    }
    mini-display-preview {
      margin: auto;
    }
    pre {
      max-height: min(520px, calc(100vh - 260px));
      margin: 0;
      padding: 10px;
      overflow: auto;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--primary-background-color);
      color: var(--primary-text-color);
      font: 11px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace;
      tab-size: 2;
      white-space: pre;
    }
    .json-key { color: #7dd3fc; }
    .json-string { color: #86efac; }
    .json-number { color: #fbbf24; }
    .json-boolean { color: #c4b5fd; }
    .json-null { color: #94a3b8; }
    nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: var(--secondary-text-color);
      font-size: 12px;
    }
    nav .icon {
      width: 32px;
      height: 32px;
    }
    ha-button {
      width: 100%;
    }
    @media (max-width: 1100px) {
      :host {
        grid-column: 1/-1;
        grid-template-columns: repeat(auto-fit, minmax(272px, 1fr));
        max-height: none;
        overflow: visible;
        position: static;
      }
      .preview-footer {
        grid-column: 1/-1;
      }
    }
    @media (max-width: 700px) {
      :host {
        grid-column: auto;
        grid-template-columns: 1fr;
      }
    }
  `;
	}
	render() {
		return A`
      ${this.displays.map((e) => this.renderDisplay(e))}
      <div class="preview-footer">
        <label class="show-hidden"
          ><input
            type="checkbox"
            .checked=${this.showHidden}
            @change=${(e) => this.showHidden = e.target.checked}
          />Show hidden cards</label
        >
      </div>
    `;
	}
	renderDisplay(e) {
		let t = this.dashboards[e.config_entry_id], n = Math.min(this.pages[e.config_entry_id] ?? 0, Math.max(0, (t?.pages.length ?? 1) - 1)), r = e.preview_scene_id === this.selectedSceneId, i = e.active_scene_id === this.selectedSceneId, a = !!t, o = this.tabs[e.config_entry_id] ?? "preview";
		return A`
      <ha-card
        class=${e.config_entry_id === this.selectedDisplayId ? "selected" : ""}
        @click=${() => At(this, "display-selected", e.config_entry_id)}
      >
        <div class="tabs">
          <div class="tab-list" role="tablist">
            ${["preview", "schema"].map((t) => A`
              <button
                class="tab ${o === t ? "active" : ""}"
                role="tab"
                aria-selected=${o === t}
                @click=${(n) => {
			n.stopPropagation(), this.selectTab(e.config_entry_id, t);
		}}
              >${t === "preview" ? "Preview" : "Schema"}</button>
            `)}
          </div>
          <button
            class="icon ${r ? "active" : ""}"
            title=${r ? "Stop temporary preview" : t ? "Show temporarily for 5 minutes" : "Add a layout first"}
            aria-label=${r ? "Stop temporary preview" : "Show temporary preview"}
            ?disabled=${!r && !a}
            @click=${(t) => {
			t.stopPropagation(), At(this, "preview-toggle", e);
		}}
          >
            <ha-icon
              icon=${r ? "mdi:eye" : "mdi:eye-off-outline"}
            ></ha-icon>
          </button>
        </div>
        ${t ? A`
                ${o === "preview" ? A`
                  <mini-display-preview
                    .dashboard=${t}
                    .hass=${this.hass}
                    .assets=${this.assets[e.config_entry_id] ?? []}
                    .page=${n}
                    .width=${e.width}
                    .height=${e.height}
                    .refreshRateHz=${e.refresh_rate_hz ?? 60}
                    .displayId=${e.config_entry_id}
                    .interactive=${!0}
                  .showHidden=${this.showHidden}
                  style=${`width:${Math.max(1, e.width)}px;max-width:100%`}
                  @click=${(e) => e.stopPropagation()}
                  ></mini-display-preview>
                ` : A`<pre @click=${(e) => e.stopPropagation()}><code>${kt(t.pages[n])}</code></pre>`}
                ${t.pages.length > 1 ? A`
                  <nav>
                    <button
                      class="icon"
                      aria-label="Previous page"
                      @click=${(t) => {
			t.stopPropagation(), At(this, "preview-page", {
				displayId: e.config_entry_id,
				delta: -1
			});
		}}
                    >
                      <ha-icon icon="mdi:chevron-left"></ha-icon>
                    </button>
                    <span>${n + 1} / ${t.pages.length}</span>
                    <button
                      class="icon"
                      aria-label="Next page"
                      @click=${(t) => {
			t.stopPropagation(), At(this, "preview-page", {
				displayId: e.config_entry_id,
				delta: 1
			});
		}}
                    >
                      <ha-icon icon="mdi:chevron-right"></ha-icon>
                    </button>
                  </nav>
                ` : N}
              ` : A`<ha-alert alert-type="info"
                >No layout in this scene.</ha-alert
              >`}
        ${!i && t ? A`<ha-button
                .disabled=${this.dirtyDisplays.has(e.config_entry_id)}
                @click=${(t) => {
			t.stopPropagation(), At(this, "scene-activate", e);
		}}
                >Activate ${this.selectedSceneName}</ha-button
              >` : N}
      </ha-card>
    `;
	}
};
V([z({ attribute: !1 })], K.prototype, "hass", void 0), V([z({ attribute: !1 })], K.prototype, "displays", void 0), V([z({ attribute: !1 })], K.prototype, "dashboards", void 0), V([z({ attribute: !1 })], K.prototype, "pages", void 0), V([z({ attribute: !1 })], K.prototype, "dirtyDisplays", void 0), V([z({ attribute: !1 })], K.prototype, "assets", void 0), V([z()], K.prototype, "selectedDisplayId", void 0), V([z()], K.prototype, "selectedSceneId", void 0), V([z()], K.prototype, "selectedSceneName", void 0), V([B()], K.prototype, "showHidden", void 0), V([B()], K.prototype, "tabs", void 0), K = V([R("mini-display-preview-list")], K);
//#endregion
//#region src/scene-sidebar.ts
var q = (e, t, n) => {
	e.dispatchEvent(new CustomEvent(t, {
		detail: n,
		bubbles: !0,
		composed: !0
	}));
}, J = class extends L {
	constructor(...e) {
		super(...e), this.displays = [], this.scenes = [], this.selectedDisplayId = "", this.selectedSceneId = "", this.section = "scenes", this.imageCount = 0, this.form = null, this.sceneName = "", this.closeActionMenusOnOutsideClick = (e) => {
			let t = e.composedPath();
			this.renderRoot.querySelectorAll("details.action-menu[open]").forEach((e) => {
				t.includes(e) || (e.open = !1);
			});
		};
	}
	static {
		this.styles = o`
    :host {
      display: block;
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
    }
    ha-card {
      overflow: visible;
      border: 1px solid var(--divider-color);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 52px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--divider-color);
    }
    h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }
    .picker,
    .form {
      display: grid;
      gap: 8px;
      padding: 12px;
      border-bottom: 1px solid var(--divider-color);
    }
    label {
      display: grid;
      gap: 5px;
      color: var(--secondary-text-color);
      font-size: 12px;
    }
    select {
      width: 100%;
      min-height: 40px;
      padding: 8px;
      color: var(--primary-text-color);
      font: inherit;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
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
    .list {
      display: grid;
      gap: 4px;
      padding: 8px;
    }
    .navigation {
      display: grid;
      gap: 4px;
      padding: 8px;
      border-bottom: 1px solid var(--divider-color);
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 8px 10px;
      color: var(--primary-text-color);
      font: inherit;
      text-align: left;
      background: transparent;
      border: 0;
      border-radius: 10px;
      cursor: pointer;
    }
    .nav-item:hover,
    .nav-item.active {
      background: var(--secondary-background-color);
    }
    .nav-item ha-icon {
      flex-shrink: 0;
      color: var(--secondary-text-color);
    }
    .nav-item.active ha-icon {
      color: var(--primary-color);
    }
    .row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 36px;
      align-items: center;
      border-radius: 10px;
    }
    .row.active {
      background: var(--secondary-background-color);
    }
    .scene {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 8px 10px;
      color: var(--primary-text-color);
      font: inherit;
      text-align: left;
      background: transparent;
      border: 0;
      cursor: pointer;
    }
    .scene span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .scene .default {
      flex: none;
      color: var(--primary-color);
    }
    .scene ha-icon {
      flex-shrink: 0;
      color: var(--secondary-text-color);
    }
    .active .scene ha-icon {
      color: var(--primary-color);
    }
    .icon {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      padding: 0;
      color: var(--primary-text-color);
      background: transparent;
      border: 0;
      border-radius: 50%;
      cursor: pointer;
    }
    .icon:hover {
      background: var(--card-background-color);
    }
    details {
      position: relative;
    }
    summary {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      list-style: none;
      cursor: pointer;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    .menu {
      position: absolute;
      right: 0;
      z-index: 20;
      display: grid;
      width: 150px;
      padding: 6px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 10px;
      box-shadow: var(--ha-card-box-shadow);
    }
    .menu button {
      min-height: 38px;
      padding: 8px;
      color: var(--primary-text-color);
      font: inherit;
      text-align: left;
      background: transparent;
      border: 0;
      cursor: pointer;
    }
    .menu .danger {
      color: var(--error-color);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .form strong {
      font-size: 14px;
    }
    .form small {
      color: var(--secondary-text-color);
      line-height: 1.4;
    }
  `;
	}
	connectedCallback() {
		super.connectedCallback(), window.addEventListener("pointerdown", this.closeActionMenusOnOutsideClick, !0);
	}
	disconnectedCallback() {
		window.removeEventListener("pointerdown", this.closeActionMenusOnOutsideClick, !0), super.disconnectedCallback();
	}
	actionMenuToggled(e) {
		let t = e.currentTarget;
		t.open && this.renderRoot.querySelectorAll("details.action-menu[open]").forEach((e) => {
			e !== t && (e.open = !1);
		});
	}
	closeActionMenu(e) {
		let t = e.composedPath().find((e) => e instanceof HTMLButtonElement);
		if (!t || t.disabled) return;
		let n = e.currentTarget.closest("details");
		n && (n.open = !1);
	}
	actionMenuKeydown(e) {
		if (e.key !== "Escape") return;
		let t = e.currentTarget.closest("details");
		t && (t.open = !1, t.querySelector("summary")?.focus(), e.preventDefault(), e.stopPropagation());
	}
	render() {
		let e = this.displays.find((e) => e.config_entry_id === this.selectedDisplayId);
		return A`
      <ha-card>
        <header><h2>Display</h2></header>
        <div class="picker">
          <label>
            Display
            <select
              .value=${this.selectedDisplayId}
              @change=${(e) => q(this, "display-selected", e.target.value)}
            >
              ${this.displays.map((e) => A`<option value=${e.config_entry_id}>${e.title}</option>`)}
            </select>
          </label>
          <span class="status ${e?.available ? "online" : ""}"
            ><i></i>${e?.available ? "Online" : "Offline"}</span
          >
        </div>
        <div class="navigation">
          <button
            class="nav-item ${this.section === "images" ? "active" : ""}"
            @click=${() => q(this, "images-selected")}
          >
            <ha-icon icon="mdi:image-multiple-outline"></ha-icon>
            <span>Images (${this.imageCount})</span>
          </button>
        </div>
        <header>
          <h2>Scenes</h2>
          <button
            class="icon"
            title="Add scene"
            aria-label="Add scene"
            @click=${() => q(this, "scene-create")}
          >
            <ha-icon icon="mdi:plus"></ha-icon>
          </button>
        </header>
        <div class="list">
          ${this.scenes.map((e) => A`
              <div
                class="row ${this.section === "scenes" && e.id === this.selectedSceneId ? "active" : ""}"
              >
                <button
                  class="scene"
                  @click=${() => q(this, "scene-selected", e.id)}
                >
                  <ha-icon icon="mdi:layers-outline"></ha-icon>
                  <span>${e.name}</span>
                  ${e.is_default ? A`<ha-icon class="default" icon="mdi:star" title="Default scene"></ha-icon>` : N}
                </button>
                ${e.id === this.selectedSceneId ? A`
                        <details
                          class="action-menu"
                          @toggle=${this.actionMenuToggled}
                          @keydown=${this.actionMenuKeydown}
                        >
                          <summary
                            aria-label="Scene actions"
                            aria-haspopup="menu"
                          >
                            <ha-icon icon="mdi:dots-vertical"></ha-icon>
                          </summary>
                          <div
                            class="menu"
                            role="menu"
                            @click=${this.closeActionMenu}
                          >
                            <button @click=${() => q(this, "scene-rename")}>
                              Rename
                            </button>
                            <button
                              @click=${() => q(this, "scene-duplicate")}
                            >
                              Duplicate
                            </button>
                            ${e.is_default ? N : A`<button @click=${() => q(this, "scene-default")}>Set as default</button>`}
                            ${e.is_default ? N : A`<button class="danger" @click=${() => q(this, "scene-delete")}>Delete</button>`}
                          </div>
                        </details>
                      ` : N}
              </div>
            `)}
        </div>
        ${this.form ? A`
                <div class="form">
                  <strong>Rename scene</strong>
                  <ha-textfield
                    label="Scene name"
                    .value=${this.sceneName}
                    @input=${(e) => q(this, "scene-name", e.target.value)}
                    @keydown=${(e) => {
			e.key === "Enter" && q(this, "scene-save");
		}}
                  ></ha-textfield>
                  <div class="actions">
                    <ha-button @click=${() => q(this, "scene-cancel")}
                      >Cancel</ha-button
                    >
                    <ha-button
                      .disabled=${!this.sceneName.trim()}
                      @click=${() => q(this, "scene-save")}
                      >Save</ha-button
                    >
                  </div>
                </div>
              ` : N}
      </ha-card>
    `;
	}
};
V([z({ attribute: !1 })], J.prototype, "displays", void 0), V([z({ attribute: !1 })], J.prototype, "scenes", void 0), V([z()], J.prototype, "selectedDisplayId", void 0), V([z()], J.prototype, "selectedSceneId", void 0), V([z()], J.prototype, "section", void 0), V([z({ type: Number })], J.prototype, "imageCount", void 0), V([z()], J.prototype, "form", void 0), V([z()], J.prototype, "sceneName", void 0), J = V([R("mini-display-scene-sidebar")], J);
//#endregion
//#region node_modules/lit-html/directives/live.js
var jt = Ze(class extends Qe {
	constructor(e) {
		if (super(e), e.type !== Xe.PROPERTY && e.type !== Xe.ATTRIBUTE && e.type !== Xe.BOOLEAN_ATTRIBUTE) throw Error("The `live` directive is not allowed on child or event bindings");
		if (!qe(e)) throw Error("`live` bindings can only contain a single expression");
	}
	render(e) {
		return e;
	}
	update(e, [t]) {
		if (t === M || t === N) return t;
		let n = e.element, r = e.name;
		if (e.type === Xe.PROPERTY) {
			if (t === n[r]) return M;
		} else if (e.type === Xe.BOOLEAN_ATTRIBUTE) {
			if (!!t === n.hasAttribute(r)) return M;
		} else if (e.type === Xe.ATTRIBUTE && n.getAttribute(r) === t + "") return M;
		return Ye(e), t;
	}
}), Mt = {
	range: "is in number range",
	number_equals: "equals",
	number_not_equals: "does not equal",
	greater_than: "is greater than",
	greater_than_or_equal: "is greater than or equal to",
	less_than: "is less than",
	less_than_or_equal: "is less than or equal to",
	equals: "equals",
	not_equals: "does not equal",
	starts_with: "starts with",
	ends_with: "ends with",
	contains: "contains",
	available: "is available",
	unavailable: "is unavailable"
}, Nt = [
	"number_equals",
	"number_not_equals",
	"greater_than",
	"greater_than_or_equal",
	"less_than",
	"less_than_or_equal",
	"range"
], Pt = new Set(Nt.filter((e) => e !== "range")), Ft = [
	"equals",
	"not_equals",
	"starts_with",
	"ends_with",
	"contains"
], It = ["available", "unavailable"], Lt = (e) => Nt.includes(e), Rt = () => ({
	rules: [{
		id: "rule_a",
		source: "entity",
		entity: "",
		operator: "equals",
		match: ""
	}],
	expression: {
		type: "group",
		operator: "and",
		children: [{
			type: "rule",
			ruleId: "rule_a"
		}]
	}
}), zt = [
	"#039be5",
	"#8e24aa",
	"#fb8c00",
	"#43a047",
	"#e53935",
	"#00897b",
	"#d81b60",
	"#3949ab",
	"#f9a825",
	"#00acc1",
	"#f4511e",
	"#7cb342"
], Y = (e) => e.replace("rule_", "").toUpperCase(), Bt = (e) => zt[Math.max(0, e.charCodeAt(e.length - 1) - 97) % zt.length], Vt = (e, t, n) => {
	e.dispatchEvent(new CustomEvent(t, {
		detail: n,
		bubbles: !0,
		composed: !0
	}));
}, X = class extends L {
	constructor(...e) {
		super(...e), this.targetName = "", this.targetKind = "card", this.draft = Rt(), this.advanced = !1, this.draftInitialized = !1;
	}
	static {
		this.styles = o`
    :host{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:16px;font-family:var(--ha-font-family-body,Roboto,sans-serif);background:rgba(0,0,0,.48)}
    ha-card{width:min(760px,100%);max-height:min(880px,calc(100vh - 32px));overflow:auto}header{padding:16px;border-bottom:1px solid var(--divider-color)}
    h2,h3{margin:0;font-weight:500}h2{font-size:20px}h3{font-size:16px}main{display:grid;gap:20px;padding:16px}section{display:grid;gap:10px}
    .section-head{display:flex;align-items:center;justify-content:space-between;gap:12px}p{margin:0;color:var(--secondary-text-color);font-size:13px;line-height:1.45}
    .mode-switch{display:grid;grid-template-columns:1fr 1fr;padding:3px;background:var(--secondary-background-color);border-radius:10px}.mode-switch button{min-height:36px;padding:6px 16px;color:var(--secondary-text-color);font:inherit;background:transparent;border:0;border-radius:8px;cursor:pointer}.mode-switch button.active{color:var(--primary-text-color);font-weight:500;background:var(--card-background-color);box-shadow:0 1px 3px rgba(0,0,0,.18)}
    label{display:grid;gap:5px;color:var(--secondary-text-color);font-size:12px}select,input{box-sizing:border-box;width:100%;min-height:40px;padding:8px;color:var(--primary-text-color);font:inherit;background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:8px}
    select:focus-visible,input:focus-visible,button:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}.rule-list{display:grid;gap:10px}
    .rule{display:grid;gap:10px;padding:12px;border:1px solid var(--divider-color);border-radius:12px;background:var(--card-background-color)}
    .rule-head{display:grid;grid-template-columns:34px 1fr 40px;gap:8px;align-items:end}.rule-fields{display:grid;grid-template-columns:150px minmax(180px,1fr) minmax(180px,1fr);gap:8px;align-items:end}.range{display:grid;grid-template-columns:1fr 1fr;gap:8px}.entity-source{display:grid;gap:4px}.current-value{min-height:18px;padding:0 4px;color:var(--secondary-text-color);font-size:12px;line-height:18px}.current-value strong{color:var(--primary-text-color);font-weight:500}.current-value.unavailable strong{color:var(--warning-color)}
    .rule-marker{display:grid;place-items:center;align-self:center;width:28px;height:28px;color:#fff;font-size:13px;font-weight:700;border-radius:50%}.rule-reference{display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:end}.rule-reference .rule-marker{margin-bottom:6px}
    .icon{display:grid;place-items:center;width:40px;height:40px;padding:0;color:var(--secondary-text-color);background:transparent;border:0;border-radius:50%;cursor:pointer}.icon.danger{color:var(--error-color)}.icon:disabled{opacity:.38;cursor:default}
    .logic{padding:12px;border:1px solid var(--divider-color);border-radius:12px;background:color-mix(in srgb,var(--secondary-background-color) 60%,transparent)}.group{display:grid;gap:8px}.group.nested{margin-left:18px;padding:10px 0 4px 12px;border-left:3px solid var(--primary-color)}
    .group-head{display:flex;align-items:end;gap:8px}.group-head label:first-child{width:170px}.invert{display:flex;align-items:center;gap:7px;min-height:40px;color:var(--primary-text-color);font-size:13px}.invert input{width:18px;min-height:18px}
    .logic-child{display:grid;grid-template-columns:28px minmax(180px,1fr) auto 40px;gap:6px;align-items:center}.logic-index{display:grid;place-items:center;width:24px;height:24px;color:var(--text-primary-color);font-size:12px;font-weight:600;background:var(--primary-color);border-radius:50%}
    .move{display:flex}.move .icon{width:34px;height:34px}.group-actions{display:flex;flex-wrap:wrap;gap:8px;padding-top:4px}.error{color:var(--error-color)}
    .actions{display:flex;justify-content:space-between;gap:8px;padding:12px 16px;border-top:1px solid var(--divider-color)}.right{display:flex;gap:8px}
    @media(max-width:700px){.rule-head,.rule-fields{grid-template-columns:1fr}.rule-head .icon{justify-self:end}.logic-child{grid-template-columns:28px minmax(0,1fr) 40px}.move{grid-column:2}.group.nested{margin-left:8px}.actions{align-items:stretch;flex-direction:column}.right{justify-content:flex-end}}
  `;
	}
	connectedCallback() {
		super.connectedCallback(), this.valueRefreshTimer = window.setInterval(() => this.requestUpdate(), 3e3);
	}
	willUpdate() {
		this.draftInitialized || (this.draftInitialized = !0, this.draft = structuredClone(this.value ?? Rt()), !this.value && this.canUseCardValue && (this.draft.rules[0].source = "card", this.card?.type === "number" && (this.draft.rules[0].operator = "range")));
	}
	disconnectedCallback() {
		this.valueRefreshTimer !== void 0 && window.clearInterval(this.valueRefreshTimer), this.valueRefreshTimer = void 0, super.disconnectedCallback();
	}
	render() {
		let e = this.validationError;
		return A`
      <ha-card role="dialog" aria-modal="true" aria-labelledby="visibility-title" @click=${(e) => e.stopPropagation()}>
        <header><h2 id="visibility-title">${this.targetName} visibility</h2></header>
        <main>
          <div class="mode-switch" role="tablist" aria-label="Visibility editor mode"><button class=${this.advanced ? "" : "active"} role="tab" aria-selected=${!this.advanced} @click=${() => this.advanced = !1}>Simple</button><button class=${this.advanced ? "active" : ""} role="tab" aria-selected=${this.advanced} @click=${() => this.advanced = !0}>Advanced</button></div>
          <p>${this.advanced ? "Name reusable conditions, then combine them in a nested logic tree." : "Show this item when the selected conditions match."}</p>
          ${!this.advanced && this.draft.rules.length > 1 ? A`<label>Match<select .value=${jt(this.draft.expression.operator)} @change=${(e) => this.updateGroup([], { operator: e.target.value })}><option value="and">All conditions</option><option value="or">Any condition</option></select></label>` : N}
          ${!this.advanced && this.hasAdvancedLogic ? A`<p class="error">Nested or inverted logic is active. Use Advanced mode to edit it.</p>` : N}
          <section><div class="section-head"><h3>Conditions</h3><ha-button .disabled=${this.draft.rules.length >= 12} @click=${this.addRule}>Add condition</ha-button></div><div class="rule-list">${this.draft.rules.map((e, t) => this.renderRule(e, t))}</div></section>
          ${this.advanced ? A`<section><div class="section-head"><h3>Logic</h3></div><div class="logic">${this.renderGroup(this.draft.expression, [])}</div></section>` : N}
          ${e ? A`<p class="error" role="alert">${e}</p>` : N}
        </main>
        <footer class="actions"><ha-button @click=${() => Vt(this, "visibility-clear")}>Always visible</ha-button><div class="right"><ha-button @click=${() => Vt(this, "visibility-cancel")}>Cancel</ha-button><ha-button .disabled=${!!e} @click=${this.save}>Save</ha-button></div></footer>
      </ha-card>`;
	}
	get canUseCardValue() {
		return this.targetKind === "card" && !!(this.card?.source || this.card?.type === "text" && this.card.text !== void 0);
	}
	renderRule(e, t) {
		let n = e.source === "entity", r = Ft.includes(e.operator), i = Pt.has(e.operator);
		return A`<article class="rule">
      <div class="rule-head">
        <span class="rule-marker" style=${`background:${Bt(e.id)}`}>${Y(e.id)}</span>
        <label>Value source<select .value=${jt(e.source)} @change=${(e) => this.changeSource(t, e.target.value)}>${this.canUseCardValue ? A`<option value="card">This card</option>` : N}<option value="entity">${this.canUseCardValue ? "Another entity" : "Entity"}</option></select></label>
        <button class="icon danger" ?disabled=${this.draft.rules.length === 1} aria-label=${`Remove condition ${Y(e.id)}`} @click=${() => this.removeRule(t)}><ha-icon icon="mdi:delete-outline"></ha-icon></button>
      </div>
      <div class="rule-fields">
        <label>Comparison<select .value=${jt(e.operator)} @change=${(e) => this.changeOperator(t, e.target.value)}>${this.operatorOptions(e).map((e) => A`<option value=${e}>${Mt[e]}</option>`)}</select></label>
        ${n ? A`<div class="entity-source"><ha-form .hass=${this.hass} .data=${{ entity: e.entity ?? "" }} .schema=${[{
			name: "entity",
			required: !0,
			selector: { entity: this.entitySelector(e) }
		}]} .computeLabel=${() => "Entity"} @value-changed=${(e) => this.updateRule(t, { entity: e.detail.value.entity })}></ha-form>${this.currentValue(e)}</div>` : A`<div class="entity-source">${this.currentValue(e)}</div>`}
        ${e.operator === "range" ? A`<div class="range">${this.numberField("From", e.minimum, (e) => this.updateRule(t, { minimum: e }))}${this.numberField("To", e.maximum, (e) => this.updateRule(t, { maximum: e }))}</div>` : i ? this.numberField("Value", e.value, (e) => this.updateRule(t, { value: e })) : r ? this.matchField(e, t) : N}
      </div>
    </article>`;
	}
	numberField(e, t, n) {
		return A`<label>${e}<input type="number" .value=${t === void 0 ? "" : String(t)} @input=${(e) => {
			let t = e.target.value;
			n(t === "" ? void 0 : Number(t));
		}}></label>`;
	}
	renderGroup(e, t) {
		return A`<div class="group ${t.length ? "nested" : ""}">
      <div class="group-head"><label>Group logic<select .value=${jt(e.operator)} @change=${(e) => this.updateGroup(t, { operator: e.target.value })}><option value="and">All must match (AND)</option><option value="or">Any may match (OR)</option></select></label><label class="invert"><input type="checkbox" .checked=${e.negate === !0} @change=${(e) => this.updateGroup(t, { negate: e.target.checked })}>Invert result</label></div>
      ${e.children.map((n, r) => this.renderExpression(n, [...t, r], r, e.children.length))}
      <div class="group-actions"><ha-button @click=${() => this.addRuleReference(t)}>Add condition</ha-button><ha-button .disabled=${t.length >= 3} @click=${() => this.addGroup(t)}>Add group</ha-button></div>
    </div>`;
	}
	renderExpression(e, t, n, r) {
		return e.type === "group" ? A`<div class="logic-child"><span class="logic-index">${n + 1}</span>${this.renderGroup(e, t)}${this.moveButtons(t, n, r)}<button class="icon danger" ?disabled=${r === 1} aria-label="Remove group" @click=${() => this.removeExpression(t)}><ha-icon icon="mdi:delete-outline"></ha-icon></button></div>` : A`<div class="logic-child"><span class="logic-index">${n + 1}</span><div><div class="rule-reference"><span class="rule-marker" style=${`background:${Bt(e.ruleId)}`}>${Y(e.ruleId)}</span><label>Condition<select .value=${jt(e.ruleId)} @change=${(n) => this.updateExpression(t, {
			...e,
			ruleId: n.target.value
		})}>${this.draft.rules.map((e) => A`<option value=${e.id}>Condition ${Y(e.id)}</option>`)}</select></label></div><label class="invert"><input type="checkbox" .checked=${e.negate === !0} @change=${(n) => this.updateExpression(t, {
			...e,
			negate: n.target.checked
		})}>Invert condition</label></div>${this.moveButtons(t, n, r)}<button class="icon danger" ?disabled=${r === 1} aria-label="Remove condition from logic" @click=${() => this.removeExpression(t)}><ha-icon icon="mdi:delete-outline"></ha-icon></button></div>`;
	}
	moveButtons(e, t, n) {
		return A`<div class="move"><button class="icon" ?disabled=${t === 0} aria-label="Move up" @click=${() => this.moveExpression(e, -1)}><ha-icon icon="mdi:chevron-up"></ha-icon></button><button class="icon" ?disabled=${t === n - 1} aria-label="Move down" @click=${() => this.moveExpression(e, 1)}><ha-icon icon="mdi:chevron-down"></ha-icon></button></div>`;
	}
	updateRule(e, t) {
		this.draft = {
			...this.draft,
			rules: this.draft.rules.map((n, r) => r === e ? {
				...n,
				...t
			} : n)
		};
	}
	changeSource(e, t) {
		let n = this.draft.rules[e];
		if (t === "card" && this.card?.type === "number" && ![...Nt, ...It].includes(n.operator)) {
			this.changeOperator(e, "range"), this.updateRule(e, { source: t });
			return;
		}
		if (t === "card" && this.card?.type !== "number" && Lt(n.operator)) {
			this.changeOperator(e, "equals"), this.updateRule(e, { source: t });
			return;
		}
		this.updateRule(e, { source: t });
	}
	operatorOptions(e) {
		return e.source === "card" ? this.card?.type === "number" ? [...Nt, ...It] : [...Ft, ...It] : Object.keys(Mt);
	}
	entitySelector(e) {
		if (["available", "unavailable"].includes(e.operator)) return {};
		let t = Lt(e.operator);
		return { include_entities: Object.entries(this.hass?.states ?? {}).filter(([n, r]) => n === e.entity || this.isNumericState(n, r) === t).map(([e]) => e) };
	}
	isNumericState(e, t) {
		if ([
			"number",
			"input_number",
			"counter"
		].includes(e.split(".", 1)[0]) || t.attributes?.unit_of_measurement !== void 0) return !0;
		let n = t.state.trim();
		return n !== "" && !["unknown", "unavailable"].includes(n) && Number.isFinite(Number(n));
	}
	sourceState(e) {
		let t = e.source === "card" ? this.card?.source : e.entity;
		return t ? this.hass?.states[t] : void 0;
	}
	currentValue(e) {
		if (e.source === "entity" && !e.entity) return A`<div class="current-value">Select an entity to see its current value.</div>`;
		if (e.source === "card" && this.card?.type === "text" && !this.card.source) return A`<div class="current-value"><span>Current value: </span><strong>${this.card.text ?? ""}</strong></div>`;
		let t = e.source === "card" ? this.card?.source : e.entity, n = t ? this.hass?.states[t] : void 0;
		if (!n) return A`<div class="current-value unavailable"><span>Current value: </span><strong>not available</strong></div>`;
		let r = typeof n.attributes?.unit_of_measurement == "string" ? ` ${n.attributes.unit_of_measurement}` : "";
		return A`<div class="current-value ${["unknown", "unavailable"].includes(n.state) ? "unavailable" : ""}"><span>Current value: </span><strong>${n.state}${r}</strong></div>`;
	}
	knownValues(e) {
		if (!["equals", "not_equals"].includes(e.operator)) return [];
		if (e.source === "card" && this.card?.type === "status") return ["on", "off"];
		let t = e.source === "card" ? this.card?.source : e.entity, n = this.sourceState(e)?.attributes?.options;
		if (Array.isArray(n)) return [...new Set(n.map(String))];
		let r = t?.split(".", 1)[0];
		return r && [
			"binary_sensor",
			"switch",
			"input_boolean",
			"light",
			"fan",
			"lock",
			"cover"
		].includes(r) ? ["on", "off"] : [];
	}
	matchField(e, t) {
		let n = this.knownValues(e);
		if (n.length) {
			let r = e.match && !n.includes(e.match) ? [e.match, ...n] : n;
			return A`<label>Value<select .value=${jt(e.match ?? "")} @change=${(e) => this.updateRule(t, { match: e.target.value })}><option value="" disabled>Select value</option>${r.map((e) => A`<option value=${e}>${e}</option>`)}</select></label>`;
		}
		let r = this.sourceState(e)?.state;
		return A`<label>Value<input maxlength="64" placeholder=${r ? `Current: ${r}` : "Value"} .value=${e.match ?? ""} @input=${(e) => this.updateRule(t, { match: e.target.value })}></label>`;
	}
	changeOperator(e, t) {
		let n = this.draft.rules[e], r = {
			id: n.id,
			source: n.source,
			entity: n.entity,
			operator: t
		};
		t === "range" ? (r.minimum = n.minimum, r.maximum = n.maximum) : Pt.has(t) ? r.value = n.value : It.includes(t) || (r.match = n.match ?? "");
		let i = r.entity ? this.hass?.states[r.entity] : void 0;
		r.source === "entity" && r.entity && i && !It.includes(t) && this.isNumericState(r.entity, i) !== Lt(t) && delete r.entity, this.draft = {
			...this.draft,
			rules: this.draft.rules.map((t, n) => n === e ? r : t)
		};
	}
	addRule() {
		let e = new Set(this.draft.rules.map((e) => e.id)), t = 97;
		for (; e.has(`rule_${String.fromCharCode(t)}`);) t += 1;
		let n = this.canUseCardValue && this.card?.type === "number", r = {
			id: `rule_${String.fromCharCode(t)}`,
			source: this.canUseCardValue ? "card" : "entity",
			entity: "",
			operator: n ? "range" : "equals",
			...n ? {} : { match: "" }
		};
		this.draft = {
			rules: [...this.draft.rules, r],
			expression: {
				...this.draft.expression,
				children: [...this.draft.expression.children, {
					type: "rule",
					ruleId: r.id
				}]
			}
		};
	}
	removeRule(e) {
		if (this.draft.rules.length === 1) return;
		let t = this.draft.rules[e].id, n = this.draft.rules.filter((t, n) => n !== e), r = n[0].id, i = (e) => e.type === "rule" ? e.ruleId === t ? {
			...e,
			ruleId: r
		} : e : {
			...e,
			children: e.children.map(i)
		};
		this.draft = {
			rules: n,
			expression: i(this.draft.expression)
		};
	}
	groupAt(e, t) {
		let n = e;
		for (let e of t) {
			let t = n.children[e];
			if (!t || t.type !== "group") throw Error("Invalid visibility group path");
			n = t;
		}
		return n;
	}
	parentAt(e, t) {
		return this.groupAt(e, t.slice(0, -1));
	}
	mutateExpression(e) {
		let t = structuredClone(this.draft.expression);
		e(t), this.draft = {
			...this.draft,
			expression: t
		};
	}
	updateGroup(e, t) {
		this.mutateExpression((n) => Object.assign(this.groupAt(n, e), t));
	}
	updateExpression(e, t) {
		this.mutateExpression((n) => {
			this.parentAt(n, e).children[e.at(-1)] = t;
		});
	}
	addRuleReference(e) {
		this.mutateExpression((t) => this.groupAt(t, e).children.push({
			type: "rule",
			ruleId: this.draft.rules[0].id
		}));
	}
	addGroup(e) {
		this.mutateExpression((t) => this.groupAt(t, e).children.push({
			type: "group",
			operator: "and",
			children: [{
				type: "rule",
				ruleId: this.draft.rules[0].id
			}]
		}));
	}
	removeExpression(e) {
		this.mutateExpression((t) => {
			let n = this.parentAt(t, e);
			n.children.length > 1 && n.children.splice(e.at(-1), 1);
		});
	}
	moveExpression(e, t) {
		this.mutateExpression((n) => {
			let r = this.parentAt(n, e), i = e.at(-1), a = i + t;
			a < 0 || a >= r.children.length || ([r.children[i], r.children[a]] = [r.children[a], r.children[i]]);
		});
	}
	get hasAdvancedLogic() {
		let e = (t) => t.negate === !0 || t.type === "group" && t.children.some((t) => t.type === "group" || e(t));
		return e(this.draft.expression);
	}
	get validationError() {
		for (let e of this.draft.rules) {
			if (e.source === "card" && !this.canUseCardValue) return "This item has no card value to test.";
			if (e.source === "entity" && !e.entity?.trim()) return `Condition ${Y(e.id)} needs an entity.`;
			if (e.operator === "range") {
				if (e.minimum === void 0 && e.maximum === void 0) return `Condition ${Y(e.id)} needs a lower or upper limit.`;
				if (e.minimum !== void 0 && !Number.isFinite(e.minimum) || e.maximum !== void 0 && !Number.isFinite(e.maximum)) return `Condition ${Y(e.id)} needs valid number limits.`;
				if (e.minimum !== void 0 && e.maximum !== void 0 && e.minimum > e.maximum) return `Condition ${Y(e.id)} has an invalid range.`;
			}
			if (Pt.has(e.operator) && !Number.isFinite(e.value)) return `Condition ${Y(e.id)} needs a numeric value.`;
			if (Ft.includes(e.operator) && !e.match?.length) return `Condition ${Y(e.id)} needs a value.`;
		}
	}
	save() {
		if (this.validationError) return;
		let e = structuredClone(this.draft);
		for (let t of e.rules) t.entity !== void 0 && (t.entity = t.entity.trim());
		Vt(this, "visibility-save", e);
	}
};
V([z({ attribute: !1 })], X.prototype, "hass", void 0), V([z()], X.prototype, "targetName", void 0), V([z()], X.prototype, "targetKind", void 0), V([z({ attribute: !1 })], X.prototype, "card", void 0), V([z({ attribute: !1 })], X.prototype, "value", void 0), V([B()], X.prototype, "draft", void 0), V([B()], X.prototype, "advanced", void 0), X = V([R("mini-display-visibility-dialog")], X);
//#endregion
//#region src/image-field.ts
var Ht = [
	77,
	68,
	65,
	50
], Ut = 16, Wt = 18, Gt = 120, Kt = 786432, qt = 100, Jt = (e) => {
	let t = "";
	for (let n = 0; n < e.length; n += 32768) t += String.fromCharCode(...e.subarray(n, n + 32768));
	return btoa(t);
}, Yt = (e) => {
	let t = 14695981039346656037n;
	for (let n of e) t ^= BigInt(n), t = BigInt.asUintN(64, t * 1099511628211n);
	return t.toString(16).padStart(16, "0");
}, Xt = (e, t, n) => {
	let r = 8 + e.length + n * (2 + Math.ceil(t / 128)), i = new Uint8Array(r), a = new DataView(i.buffer);
	i.set([
		77,
		68,
		73,
		50
	], 0), i[4] = t & 255, i[5] = t >> 8, i[6] = n & 255, i[7] = n >> 8;
	let o = (t, n) => e[t * 2] === e[n * 2] && e[t * 2 + 1] === e[n * 2 + 1], s = 8;
	for (let r = 0; r < n; r += 1) {
		let n = (r + 1) * t, c = r * t, l = s;
		for (s += 2; c < n;) {
			let t = 1;
			for (; t < 128 && c + t < n && o(c, c + t);) t += 1;
			if (t >= 2) {
				i[s++] = 128 | t - 1, i[s++] = e[c * 2], i[s++] = e[c * 2 + 1], c += t;
				continue;
			}
			let r = c++;
			for (; c - r < 128 && c < n;) {
				for (t = 1; t < 2 && c + t < n && o(c, c + t);) t += 1;
				if (t >= 2) break;
				c += 1;
			}
			let a = c - r;
			i[s++] = a - 1;
			let l = e.subarray(r * 2, c * 2);
			i.set(l, s), s += l.length;
		}
		a.setUint16(l, s - l - 2, !0);
	}
	return i.slice(0, s);
}, Zt = (e, t, n) => {
	let r = e.getImageData(0, 0, t, n).data, i = new Uint8Array(t * n * 2), a = new DataView(i.buffer);
	for (let e = 0, t = 0; e < r.length; e += 4, t += 2) {
		let n = (r[e] & 248) << 8 | (r[e + 1] & 252) << 3 | r[e + 2] >> 3;
		a.setUint16(t, n, !0);
	}
	return i;
}, Qt = (e, t, n) => {
	if (e.length < 2 || e.length > Gt) throw Error("Animated GIF requires 2-120 optimized frames");
	let r = e.length * Wt, i = Ut + r + e.reduce((e, t) => e + t.bytes.length, 0), a = new Uint8Array(i), o = new DataView(a.buffer);
	a.set(Ht, 0), o.setUint16(4, t, !0), o.setUint16(6, n, !0), o.setUint16(8, e.length, !0);
	let s = e.reduce((e, t) => e + t.durationMs, 0);
	o.setUint32(12, s, !0);
	let c = Ut + r;
	return e.forEach((e, r) => {
		let i = Ut + r * Wt;
		o.setUint16(i, e.durationMs, !0), o.setUint32(i + 2, c, !0), o.setUint32(i + 6, e.bytes.length, !0);
		let s = e.dirty ?? {
			x: 0,
			y: 0,
			width: t,
			height: n
		};
		o.setUint16(i + 10, s.x, !0), o.setUint16(i + 12, s.y, !0), o.setUint16(i + 14, s.width, !0), o.setUint16(i + 16, s.height, !0), a.set(e.bytes, c), c += e.bytes.length;
	}), a;
}, $t = (e, t, n, r) => {
	let i = n, a = r, o = 0, s = 0;
	for (let c = 0; c < n * r; c += 1) {
		let r = c * 2;
		if (e[r] === t[r] && e[r + 1] === t[r + 1]) continue;
		let l = c % n, u = Math.floor(c / n);
		i = Math.min(i, l), a = Math.min(a, u), o = Math.max(o, l + 1), s = Math.max(s, u + 1);
	}
	return { dirty: {
		x: o ? i : 0,
		y: s ? a : 0,
		width: Math.max(1, o - i),
		height: Math.max(1, s - a)
	} };
}, en = async (e) => {
	if (e.type.toLowerCase() === "image/gif") return !0;
	let t = new Uint8Array(await e.slice(0, 6).arrayBuffer());
	return new TextDecoder().decode(t).startsWith("GIF8");
}, tn = async (e, t, n, r) => {
	let i = globalThis.ImageDecoder;
	if (!i) throw Error("Animated GIF upload requires a browser with ImageDecoder support");
	let a = new i({
		data: e.slice(0),
		type: "image/gif"
	});
	try {
		await a.tracks.ready;
		let e = a.tracks.selectedTrack?.frameCount ?? 0;
		if (e < 1) throw Error("GIF does not contain an image");
		let i = Math.max(1, Math.ceil(e / Gt)), o = await a.decode({
			frameIndex: 0,
			completeFramesOnly: !0
		}), s = o.image.displayWidth, c = o.image.displayHeight, l = Math.min(1, t / s, n / c, r), u = Math.max(1, Math.round(s * l)), d = Math.max(1, Math.round(c * l)), f = document.createElement("canvas");
		f.width = u, f.height = d;
		let p = f.getContext("2d", { alpha: !1 });
		if (!p) throw Error("This browser cannot optimize images");
		p.imageSmoothingEnabled = !0, p.imageSmoothingQuality = "high";
		let m = [], h, g, _, v = "";
		for (let t = 0; t < e; t += i) {
			let e = t === 0 ? o : await a.decode({
				frameIndex: t,
				completeFramesOnly: !0
			});
			p.fillStyle = "#000", p.fillRect(0, 0, u, d), p.drawImage(e.image, 0, 0, u, d);
			let n = Zt(p, u, d);
			g ??= n;
			let r = Xt(n, u, d);
			h ??= r;
			let s = Math.max(qt, Math.round((e.image.duration ?? 1e5) / 1e3) * i), c = m.at(-1), l = r.subarray(8);
			if (c && c.bytes.length === l.length && c.bytes.every((e, t) => e === l[t]) && c.durationMs + s <= 6e4) c.durationMs += s;
			else {
				let e = _ ? $t(n, _, u, d) : { dirty: {
					x: 0,
					y: 0,
					width: u,
					height: d
				} };
				m.push({
					durationMs: Math.min(6e4, s),
					bytes: l,
					...e
				}), _ = n;
			}
			v ||= f.toDataURL("image/webp", .82), e.image.close();
		}
		m.length > 1 && g && _ && Object.assign(m[0], $t(g, _, u, d));
		let y = m.length > 1;
		return {
			width: u,
			height: d,
			frames: m,
			preview: v,
			animated: y,
			bytes: y ? Qt(m, u, d) : h
		};
	} finally {
		a.close();
	}
}, nn = async (e, t, n) => {
	let r = await e.arrayBuffer(), i = 1;
	for (let a = 0; a < 6; a += 1) {
		let a = await tn(r, t, n, i);
		if (a.bytes.length <= Kt) return {
			id: Yt(a.bytes),
			name: e.name,
			width: a.width,
			height: a.height,
			bytes: a.bytes.length,
			data: Jt(a.bytes),
			preview: a.preview,
			animated: a.animated,
			frameCount: a.animated ? a.frames.length : 1,
			durationMs: a.animated ? a.frames.reduce((e, t) => e + t.durationMs, 0) : 0
		};
		i *= Math.max(.5, Math.min(.82, Math.sqrt(Kt / a.bytes.length) * .9));
	}
	throw Error("GIF is too complex for this display");
}, rn = async (e, t, n) => {
	if (await en(e)) return nn(e, t, n);
	let r = await createImageBitmap(e), i = Math.min(1, t / r.width, n / r.height), a = Math.max(1, Math.round(r.width * i)), o = Math.max(1, Math.round(r.height * i)), s = document.createElement("canvas");
	s.width = a, s.height = o;
	let c = s.getContext("2d", { alpha: !1 });
	if (!c) throw Error("This browser cannot optimize images");
	c.fillStyle = "#000", c.fillRect(0, 0, a, o), c.imageSmoothingEnabled = !0, c.imageSmoothingQuality = "high", c.drawImage(r, 0, 0, a, o), r.close();
	let l = Xt(Zt(c, a, o), a, o);
	return {
		id: Yt(l),
		name: e.name,
		width: a,
		height: o,
		bytes: l.length,
		data: Jt(l),
		preview: s.toDataURL("image/webp", .82)
	};
}, Z = class extends L {
	constructor(...e) {
		super(...e), this.assets = [], this.displayId = "", this.label = "Image", this.value = "", this.uploadOnly = !1, this.maximumWidth = 240, this.maximumHeight = 240, this.busy = !1, this.error = "", this.upload = async (e) => {
			let t = e.target, n = t.files?.[0];
			if (n && this.hass && this.displayId) {
				this.busy = !0, this.error = "";
				try {
					let e = await rn(n, Math.max(1, this.maximumWidth), Math.max(1, this.maximumHeight));
					await this.hass.callWS({
						type: "mini_display/asset/upload",
						config_entry_id: this.displayId,
						asset_id: e.id,
						name: e.name,
						width: e.width,
						height: e.height,
						data: e.data,
						preview: e.preview
					}), this.dispatchEvent(new CustomEvent("asset-uploaded", {
						detail: e,
						bubbles: !0,
						composed: !0
					})), this.uploadOnly || this.select(e.id);
				} catch (e) {
					this.error = e instanceof Error ? e.message : String(e);
				} finally {
					this.busy = !1, t.value = "";
				}
			}
		};
	}
	static {
		this.styles = o`
    :host {
      display: block;
    }
    .field {
      display: grid;
      gap: 8px;
    }
    .label {
      font-size: 12px;
      color: var(--secondary-text-color);
    }
    .picker {
      display: grid;
      grid-template-columns: 64px minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      min-height: 72px;
      padding: 8px;
      border: 1px solid var(--divider-color);
      border-radius: 10px;
    }
    .thumb {
      width: 56px;
      height: 56px;
      object-fit: cover;
      background: var(--secondary-background-color);
      border-radius: 7px;
    }
    .empty {
      display: grid;
      place-items: center;
      color: var(--secondary-text-color);
    }
    select {
      width: 100%;
      min-height: 40px;
      padding: 0 10px;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
    }
    .upload {
      position: relative;
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: 50%;
      color: var(--primary-color);
      background: var(--secondary-background-color);
      cursor: pointer;
    }
    .actions {
      display: flex;
      gap: 4px;
    }
    .detach {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      padding: 0;
      color: var(--secondary-text-color);
      background: transparent;
      border: 0;
      border-radius: 50%;
      cursor: pointer;
    }
    .detach:hover {
      color: var(--primary-text-color);
      background: var(--secondary-background-color);
    }
    .upload input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
    .error {
      font-size: 12px;
      color: var(--error-color);
    }
    small {
      color: var(--secondary-text-color);
    }
  `;
	}
	render() {
		let e = this.assets.find((e) => e.id === this.value);
		return A`<div class="field">
      <span class="label">${this.label}</span>
      <div class="picker">
        ${e?.preview ? A`<img class="thumb" src=${e.preview} alt="" />` : A`<div class="thumb empty"><ha-icon icon="mdi:image-outline"></ha-icon></div>`}
        <div>
          ${this.uploadOnly ? A`<strong>Add a new image</strong><br /><small
                    >Optimized for this display before upload</small
                  >` : A`<select
                    .value=${this.value}
                    ?disabled=${this.busy}
                    @change=${(e) => this.select(e.target.value)}
                  >
                    <option value="">No image</option>
                    ${this.assets.map((e) => A`<option value=${e.id}>${e.name} · ${e.width}×${e.height}</option>`)}</select
                  >${e ? A`<small
                      >${Math.ceil(e.bytes / 1024)} KB on display${e.animated ? ` · ${e.frameCount} frames` : ""}</small
                    >` : N}`}
        </div>
        <div class="actions">
          ${e && !this.uploadOnly ? A`<button
                  class="detach"
                  title="Detach image"
                  aria-label="Detach image"
                  ?disabled=${this.busy}
                  @click=${() => this.select("")}
                >
                  <ha-icon icon="mdi:image-remove-outline"></ha-icon>
                </button>` : N}
          <label class="upload" title="Upload image"
            ><ha-icon icon=${this.busy ? "mdi:loading" : "mdi:upload"}></ha-icon
            ><input
              type="file"
              accept="image/*,.gif"
              ?disabled=${this.busy}
              @change=${this.upload}
          /></label>
        </div>
      </div>
      ${this.error ? A`<div class="error" role="alert">${this.error}</div>` : N}
    </div>`;
	}
	select(e) {
		this.dispatchEvent(new CustomEvent("image-changed", {
			detail: e,
			bubbles: !0,
			composed: !0
		}));
	}
};
V([z({ attribute: !1 })], Z.prototype, "hass", void 0), V([z({ attribute: !1 })], Z.prototype, "assets", void 0), V([z()], Z.prototype, "displayId", void 0), V([z()], Z.prototype, "label", void 0), V([z()], Z.prototype, "value", void 0), V([z({ type: Boolean })], Z.prototype, "uploadOnly", void 0), V([z({ type: Number })], Z.prototype, "maximumWidth", void 0), V([z({ type: Number })], Z.prototype, "maximumHeight", void 0), V([B()], Z.prototype, "busy", void 0), V([B()], Z.prototype, "error", void 0), Z = V([R("mini-display-image-field")], Z);
//#endregion
//#region src/image-manager.ts
var Q = class extends L {
	constructor(...e) {
		super(...e), this.assets = [], this.displayId = "", this.displayName = "", this.maximumWidth = 240, this.maximumHeight = 240, this.busy = !1, this.error = "";
	}
	static {
		this.styles = o`
    :host {
      display: block;
      min-width: 0;
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
    }
    * {
      box-sizing: border-box;
    }
    ha-card {
      min-height: 360px;
      overflow: hidden;
      border: 1px solid var(--divider-color);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 64px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--divider-color);
    }
    h2,
    p {
      margin: 0;
    }
    h2 {
      font-size: 18px;
      font-weight: 500;
    }
    header p,
    .meta,
    .empty p {
      color: var(--secondary-text-color);
      font-size: 13px;
    }
    .uploader {
      padding: 16px 16px 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 16px;
      padding: 16px;
    }
    .asset {
      overflow: hidden;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 12px;
    }
    .preview {
      display: grid;
      place-items: center;
      width: 100%;
      aspect-ratio: 4 / 3;
      overflow: hidden;
      background:
        linear-gradient(
          45deg,
          var(--secondary-background-color) 25%,
          transparent 25%
        ),
        linear-gradient(
          -45deg,
          var(--secondary-background-color) 25%,
          transparent 25%
        ),
        linear-gradient(
          45deg,
          transparent 75%,
          var(--secondary-background-color) 75%
        ),
        linear-gradient(
          -45deg,
          transparent 75%,
          var(--secondary-background-color) 75%
        );
      background-size: 16px 16px;
      background-position:
        0 0,
        0 8px,
        8px -8px,
        -8px 0;
    }
    .preview img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .details {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 40px;
      gap: 8px;
      align-items: center;
      padding: 10px 10px 10px 12px;
    }
    .name {
      overflow: hidden;
      font-weight: 500;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta {
      margin-top: 3px;
    }
    .used {
      color: var(--primary-color);
    }
    button {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      padding: 0;
      color: var(--error-color);
      background: transparent;
      border: 0;
      border-radius: 50%;
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background: var(--secondary-background-color);
    }
    button:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .empty {
      display: grid;
      justify-items: center;
      gap: 10px;
      padding: 72px 24px;
      text-align: center;
    }
    .empty ha-icon {
      --mdc-icon-size: 54px;
      width: 54px;
      height: 54px;
      color: var(--secondary-text-color);
    }
    .error {
      margin: 16px 16px 0;
      padding: 12px;
      color: var(--error-color);
      background: color-mix(in srgb, var(--error-color), transparent 90%);
      border-radius: 10px;
    }
    .backdrop {
      position: fixed;
      z-index: 1000;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 16px;
      background: rgb(0 0 0 / 55%);
    }
    .dialog {
      width: min(420px, 100%);
      min-height: 0;
      padding: 20px;
    }
    .dialog h2 {
      margin-bottom: 10px;
    }
    .dialog p {
      color: var(--secondary-text-color);
      line-height: 1.45;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 20px;
    }
    .dialog-actions ha-button.danger {
      --mdc-theme-primary: var(--error-color);
    }
  `;
	}
	render() {
		return A`
      <ha-card>
        <header>
          <div>
            <h2>Images</h2>
            <p>
              ${this.displayName} · ${this.assets.length}
              ${this.assets.length === 1 ? "image" : "images"}
            </p>
          </div>
        </header>
        <div class="uploader">
          <mini-display-image-field
            .hass=${this.hass}
            .assets=${this.assets}
            .displayId=${this.displayId}
            label="Add image"
            .maximumWidth=${this.maximumWidth}
            .maximumHeight=${this.maximumHeight}
            .uploadOnly=${!0}
            @asset-uploaded=${(e) => this.dispatchEvent(new CustomEvent("asset-uploaded", {
			detail: e.detail,
			bubbles: !0,
			composed: !0
		}))}
          ></mini-display-image-field>
        </div>
        ${this.error ? A`<div class="error" role="alert">${this.error}</div>` : N}
        ${this.assets.length ? A`<div class="grid">
                ${this.assets.map((e) => this.renderAsset(e))}
              </div>` : A`<div class="empty">
                <ha-icon icon="mdi:image-multiple-outline"></ha-icon>
                <h2>No images</h2>
                <p>Add an image here or directly from an image field.</p>
              </div>`}
      </ha-card>
      ${this.pendingDelete ? A`<div
              class="backdrop"
              @click=${() => this.pendingDelete = void 0}
            >
              <ha-card
                class="dialog"
                role="dialog"
                aria-modal="true"
                @click=${(e) => e.stopPropagation()}
              >
                <h2>Delete image?</h2>
                <p>
                  <strong>${this.pendingDelete.name}</strong> will be removed
                  from Home Assistant and the display.
                </p>
                <div class="dialog-actions">
                  <ha-button @click=${() => this.pendingDelete = void 0}
                    >Cancel</ha-button
                  >
                  <ha-button
                    class="danger"
                    @click=${() => void this.deletePending()}
                    >Delete</ha-button
                  >
                </div>
              </ha-card>
            </div>` : N}
    `;
	}
	renderAsset(e) {
		let t = e.used_by ?? [];
		return A`<article class="asset">
      <div class="preview">
        ${e.preview ? A`<img src=${e.preview} alt=${e.name} />` : A`<ha-icon icon="mdi:image-outline"></ha-icon>`}
      </div>
      <div class="details">
        <div>
          <div class="name" title=${e.name}>${e.name}</div>
          <div class="meta">
            ${e.width}×${e.height} · ${Math.ceil(e.bytes / 1024)} KB${e.animated ? ` · ${e.frameCount} frames` : ""}
          </div>
          <div class="meta ${t.length ? "used" : ""}">
            ${t.length ? `Used in ${t.join(", ")}` : "Not used"}
          </div>
        </div>
        <button
          title=${t.length ? "Detach this image before deleting it" : "Delete image"}
          aria-label="Delete image"
          ?disabled=${t.length > 0 || this.busy}
          @click=${() => this.pendingDelete = e}
        >
          <ha-icon icon="mdi:delete-outline"></ha-icon>
        </button>
      </div>
    </article>`;
	}
	async deletePending() {
		let e = this.pendingDelete;
		if (e && this.hass && this.displayId) {
			this.busy = !0, this.error = "";
			try {
				await this.hass.callWS({
					type: "mini_display/asset/delete",
					config_entry_id: this.displayId,
					asset_id: e.id
				}), this.dispatchEvent(new CustomEvent("asset-deleted", {
					detail: e.id,
					bubbles: !0,
					composed: !0
				})), this.pendingDelete = void 0;
			} catch (e) {
				this.error = e instanceof Error ? e.message : String(e);
			} finally {
				this.busy = !1;
			}
		}
	}
};
V([z({ attribute: !1 })], Q.prototype, "hass", void 0), V([z({ attribute: !1 })], Q.prototype, "assets", void 0), V([z()], Q.prototype, "displayId", void 0), V([z()], Q.prototype, "displayName", void 0), V([z({ type: Number })], Q.prototype, "maximumWidth", void 0), V([z({ type: Number })], Q.prototype, "maximumHeight", void 0), V([B()], Q.prototype, "busy", void 0), V([B()], Q.prototype, "error", void 0), V([B()], Q.prototype, "pendingDelete", void 0), Q = V([R("mini-display-image-manager")], Q);
//#endregion
//#region src/graph-editor.ts
var an = class extends L {
	static {
		this.styles = o`
    :host { display:block; color:var(--primary-text-color); font:inherit; }
    * { box-sizing:border-box; } .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:12px; }
    label { display:grid; gap:6px; font-size:14px; } label.check { display:flex; align-items:center; }
    input,select { width:100%; min-height:40px; border:1px solid var(--divider-color); border-radius:8px; padding:8px; font:inherit; color:inherit; background:var(--card-background-color); }
    input[type=checkbox] { width:auto; min-height:0; } input:focus,select:focus { outline:2px solid var(--primary-color); }
    ha-form { display:block; margin-top:12px; } details { margin-top:12px; } summary { cursor:pointer; }
    .segments { display:flex; gap:4px; }
    .segments button { flex:1; min-height:40px; border:1px solid var(--divider-color); border-radius:8px; background:var(--card-background-color); color:inherit; font:inherit; cursor:pointer; }
    .segments button[aria-pressed=true] { border-color:var(--primary-color); background:var(--primary-color); color:var(--text-primary-color,#fff); }
    button:focus-visible { outline:2px solid var(--primary-color); outline-offset:2px; }
    @media(max-width:450px) { .grid { grid-template-columns:1fr; } }
  `;
	}
	patchGraph(e) {
		this.dispatchEvent(new CustomEvent("graph-changed", {
			detail: {
				...this.card.graph,
				...e
			},
			bubbles: !0,
			composed: !0
		}));
	}
	numeric(e, t, n, r, i) {
		return A`<label>${e}<input type="number" min=${r} max=${i} .value=${n === void 0 ? "" : String(n)} placeholder="Auto" @change=${(e) => {
			let n = e.target.value;
			this.patchGraph({ [t]: n === "" ? void 0 : Math.min(i, Math.max(r, Number(n))) });
		}}></label>`;
	}
	select(e, t, n, r) {
		return A`<label>${e}<select aria-label=${e} @change=${(e) => this.patchGraph({ [t]: e.target.value })}>${r.map(([e, t]) => A`<option value=${e} .selected=${n === e}>${t}</option>`)}</select></label>`;
	}
	render() {
		let e = this.card.graph;
		return A`
      ${this.card.type === "chart" ? N : A`<label class="check"><input type="checkbox" .checked=${!!e} @change=${(e) => this.dispatchEvent(new CustomEvent("graph-changed", {
			detail: e.target.checked ? Ie() : void 0,
			bubbles: !0,
			composed: !0
		}))}>Background chart</label>`}
      ${e ? A`
        ${this.card.type === "number" || this.card.type === "chart" ? A`<label class="check"><input type="checkbox" .checked=${!e.source} @change=${(e) => this.patchGraph({ source: e.target.checked ? void 0 : this.card.source || "" })}>Use this card’s data</label>` : N}
        ${e.source ? A`<ha-form .hass=${this.hass} .data=${{ entity: e.source }}
          .schema=${[{
			name: "entity",
			selector: { entity: { domain: [
				"sensor",
				"number",
				"input_number",
				"counter"
			] } }
		}]}
          .computeLabel=${() => "Chart entity"} @value-changed=${(e) => this.patchGraph({ source: e.detail.value.entity })}></ha-form>` : N}
        <div class="grid">
          <div><label>${this.card.type === "chart" ? "Chart style" : "Background chart style"}</label><div class="segments" role="group" aria-label="Chart type">
            ${[["bar", "Columns"], ["line", "Line"]].map(([t, n]) => A`<button type="button" aria-pressed=${(e.type ?? "bar") === t} @click=${() => this.patchGraph({ type: t })}>${n}</button>`)}
          </div></div>
          ${this.select("Aggregation", "aggregation", e.aggregation ?? "mean", [
			["mean", "Average"],
			["min", "Minimum"],
			["max", "Maximum"],
			["last", "Last value"]
		])}
          ${this.numeric("Points", "points", e.points ?? 48, 2, 120)}
          <mini-display-duration-field .seconds=${e.intervalSeconds ?? 300}
            @duration-changed=${(e) => this.patchGraph({ intervalSeconds: e.detail })}></mini-display-duration-field>
          <mini-display-color-field label="Color" .value=${e.color ?? "accent"} @color-changed=${(e) => this.patchGraph({ color: e.detail || "accent" })}></mini-display-color-field>
          ${this.numeric("Opacity (%)", "opacity", e.opacity ?? 50, 0, 100)}
        </div>
        ${e.type === "line" ? A`
          <div class="grid">
            ${this.numeric("Line width", "lineWidth", e.lineWidth ?? 1, 1, 4)}
            ${this.numeric("Area fill (%)", "fillOpacity", e.fillOpacity ?? 0, 0, 100)}
          </div>
          <label class="check"><input type="checkbox" .checked=${e.showPoints ?? !1} @change=${(e) => this.patchGraph({ showPoints: e.target.checked })}>Show points</label>
          ${e.showPoints ? A`<div class="grid">${this.numeric("Point size", "pointSize", e.pointSize ?? 1, 1, 4)}</div>` : N}
        ` : A`<div class="grid">${this.numeric("Column gap", "barGap", e.barGap ?? 1, 0, 8)}</div>`}
        <label class="check"><input type="checkbox" .checked=${e.showValues ?? !1} @change=${(e) => this.patchGraph({ showValues: e.target.checked })}>Show values</label>
        ${e.showValues ? A`<div class="grid">${this.numeric("Label every N points", "labelEvery", e.labelEvery ?? 6, 1, 120)}${this.numeric("Decimal places", "decimals", e.decimals ?? 1, 0, 3)}</div>` : N}
        <details><summary>Grid and scale</summary><div class="grid">
          ${this.select("Scale", "scale", e.scale ?? (e.type === "line" ? "fit" : "zero"), [["zero", "Include zero"], ["fit", "Fit to data"]])}
          ${(e.scale ?? (e.type === "line" ? "fit" : "zero")) === "fit" ? this.numeric("Scale padding (%)", "scalePadding", e.scalePadding ?? 5, 0, 50) : N}
          ${this.numeric("Grid lines", "gridLines", e.gridLines ?? 0, 0, 8)}
          ${e.gridLines ? this.numeric("Grid opacity (%)", "gridOpacity", e.gridOpacity ?? 20, 0, 100) : N}
          ${e.gridLines ? A`<mini-display-color-field label="Grid color" .value=${e.gridColor ?? "muted"} @color-changed=${(e) => this.patchGraph({ gridColor: e.detail || "muted" })}></mini-display-color-field>` : N}
          ${this.numeric("Minimum", "minimum", e.minimum, -0xe8d4a51000, 0xe8d4a51000)}
          ${this.numeric("Maximum", "maximum", e.maximum, -0xe8d4a51000, 0xe8d4a51000)}
        </div></details>
      ` : N}`;
	}
};
V([z({ attribute: !1 })], an.prototype, "card", void 0), V([z({ attribute: !1 })], an.prototype, "hass", void 0), an = V([R("mini-display-graph-editor")], an);
//#endregion
//#region src/weather-editor.ts
var on = class extends L {
	constructor(...e) {
		super(...e), this.settings = {};
	}
	static {
		this.styles = o`
    :host {
      display: block;
      font: inherit;
      color: var(--primary-text-color);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 13px;
    }
    select,
    input {
      font: inherit;
      color: inherit;
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 10px;
      min-width: 0;
    }
    .fields {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 16px 0;
    }
    .fields label {
      flex-direction: row;
      align-items: center;
    }
    .presets {
      display: flex;
      gap: 8px;
      margin: 16px 0;
      flex-wrap: wrap;
    }
    button {
      font: inherit;
      color: var(--primary-color);
      background: transparent;
      border: 1px solid var(--divider-color);
      padding: 8px 12px;
      border-radius: 18px;
      cursor: pointer;
    }
    button:focus-visible,
    select:focus-visible,
    input:focus-visible {
      outline: 2px solid var(--primary-color);
    }
  `;
	}
	patch(e) {
		this.dispatchEvent(new CustomEvent("weather-changed", {
			detail: {
				...this.settings,
				...e
			},
			bubbles: !0,
			composed: !0
		}));
	}
	choice(e, t, n, r) {
		return A`<label
      >${e}<select
        aria-label=${e}
        @change=${(e) => this.patch({ [t]: e.target.value })}
      >
        ${n.map(([e, n]) => A`<option value=${e} ?selected=${(this.settings[t] ?? r) === e}>${n}</option>`)}
      </select></label
    >`;
	}
	number(e, t, n, r, i) {
		return A`<label
      >${e}<input
        type="number"
        min=${r}
        max=${i}
        step="1"
        .value=${String(this.settings[t] ?? n)}
        @change=${(e) => {
			let n = e.target;
			n.reportValidity() && this.patch({ [t]: Number(n.value) });
		}}
    /></label>`;
	}
	render() {
		let e = this.settings, t = e.fields ?? [
			"icon",
			"condition",
			"temperature"
		];
		return A`<div class="grid">
        <label
          >Weather data<select
            aria-label="Weather data"
            @change=${(e) => {
			let t = e.target.value;
			this.patch({
				period: t,
				...t === "current" ? {
					offset: 0,
					count: 1
				} : {}
			});
		}}
          >
            ${[
			["current", "Current weather"],
			["daily", "Daily forecast"],
			["hourly", "Hourly forecast"],
			["twice_daily", "Day / night forecast"]
		].map(([t, n]) => A`<option
                  value=${t}
                  ?selected=${(e.period ?? "current") === t}
                >
                  ${n}
                </option>`)}
          </select></label
        >
        ${this.choice("Arrangement", "layout", [
			["vertical", "Icon above text"],
			["horizontal", "Icon beside text"],
			["compact", "Compact"]
		], "vertical")}
        ${(e.period ?? "current") === "current" ? N : A` ${this.number(e.period === "daily" ? "Start day (0 today, 1 tomorrow)" : e.period === "hourly" ? "Hour offset (0 first available)" : "Period offset (0 current)", "offset", 0, 0, 14)}
            ${this.number("Number of forecasts", "count", 1, 1, 5)}
            ${this.number(e.period === "hourly" ? "Step (hours)" : "Step", "step", 1, 1, 24)}`}
        ${this.choice("Icons", "iconStyle", [["color", "Weather colors"], ["mono", "Use text color"]], "color")}
        ${this.choice("Descriptions", "language", [["en", "English"], ["pl", "Polski"]], "en")}
      </div>
      <div class="presets" aria-label="Weather presets">
        <button @click=${() => this.patch({ fields: ["icon"] })}>
          Icon only
        </button>
        <button
          @click=${() => this.patch({ fields: ["condition", "temperature"] })}
        >
          Text only
        </button>
        <button @click=${() => this.patch({ fields: ["icon", "temperature"] })}>
          Icon + temperature
        </button>
        <button
          @click=${() => this.patch({ fields: [
			"label",
			"icon",
			"condition",
			"temperature",
			"low"
		] })}
        >
          Forecast
        </button>
      </div>
      <div class="fields">
        ${[
			["icon", "Icon"],
			["condition", "Description"],
			["temperature", "Temperature / high"],
			["low", "Low temperature"],
			["label", "Time / date"],
			["humidity", "Humidity"],
			["precipitation", "Rain probability"],
			["wind", "Wind speed"]
		].map(([e, n]) => A`<label>
          <input
            type="checkbox"
            .checked=${t.includes(e)}
            @change=${(n) => {
			let r = n.target.checked ? [...t, e] : t.filter((t) => t !== e);
			r.length ? this.patch({ fields: r }) : n.target.checked = !0;
		}}
          />${n}</label
        >`)}
      </div>`;
	}
};
V([z({ attribute: !1 })], on.prototype, "settings", void 0), on = V([R("mini-display-weather-editor")], on);
//#endregion
//#region src/value-transform-editor.ts
var sn = class extends L {
	static {
		this.styles = o`
    :host { display:block; color:var(--primary-text-color); font:inherit; }
    * { box-sizing:border-box; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    label { display:grid; gap:6px; font-size:14px; }
    input,select { width:100%; min-height:40px; border:1px solid var(--divider-color); border-radius:8px; padding:8px; font:inherit; color:inherit; background:var(--card-background-color); }
    input:focus,select:focus { outline:2px solid var(--primary-color); }
    .sign { display:grid; gap:6px; font-size:14px; }
    .segments { display:flex; gap:4px; }
    .segments button { flex:1; min-height:40px; border:1px solid var(--divider-color); border-radius:8px; background:var(--card-background-color); color:inherit; font:inherit; cursor:pointer; }
    .segments button[aria-pressed=true] { border-color:var(--primary-color); background:var(--primary-color); color:var(--text-primary-color,#fff); }
    button:focus-visible { outline:2px solid var(--primary-color); outline-offset:2px; }
    @media(max-width:450px) { .grid { grid-template-columns:1fr; } }
  `;
	}
	patch(e) {
		let t = {
			...this.value,
			...e
		};
		for (let e of Object.keys(t)) t[e] === void 0 && delete t[e];
		this.onValueChange?.(Object.keys(t).length ? t : void 0);
	}
	number(e, t, n) {
		let r = this.value?.[t];
		return A`<label>${e}<input type="number" step="any"
      placeholder=${n} .value=${r === void 0 ? "" : String(r)}
      @input=${(e) => {
			let n = e.target;
			this.patch({ [t]: n.value === "" ? void 0 : n.valueAsNumber });
		}}></label>`;
	}
	render() {
		let e = this.value?.absolute ?? !1;
		return A`<div class="grid">
      <label>Precision<select
        @input=${(e) => {
			let t = e.target.value;
			this.patch({ precision: t === "source" ? void 0 : Number(t) });
		}}>
        <option value="source" ?selected=${this.value?.precision === void 0}>Keep source</option>
        ${[
			0,
			1,
			2,
			3,
			4,
			5,
			6
		].map((e) => A`<option value=${e}
          ?selected=${this.value?.precision === e}>${e} decimal${e === 1 ? "" : "s"}</option>`)}
      </select></label>
      <div class="sign">Sign<div class="segments" role="group" aria-label="Number sign">
        <button type="button" aria-pressed=${!e}
          @click=${() => this.patch({ absolute: void 0 })}>Keep sign</button>
        <button type="button" aria-pressed=${e}
          @click=${() => this.patch({ absolute: !0 })}>Absolute</button>
      </div></div>
      ${this.number("Multiply by", "multiply", "1")}
      ${this.number("Add", "add", "0")}
      ${this.number("Minimum output", "minimum", "No limit")}
      ${this.number("Maximum output", "maximum", "No limit")}
    </div>`;
	}
};
V([z({ attribute: !1 })], sn.prototype, "value", void 0), V([z({ attribute: !1 })], sn.prototype, "onValueChange", void 0), sn = V([R("mini-display-value-transform-editor")], sn);
//#endregion
//#region src/editor.ts
var $ = class extends L {
	constructor(...e) {
		super(...e), this.displays = [], this.scenes = [], this.dashboards = {}, this.assets = {}, this.savedDashboards = {}, this.selectedDisplayId = "", this.selectedSceneId = "", this.section = "scenes", this.pageIndex = 0, this.cardSection = "content", this.previewPages = {}, this.schemaViewOpen = !1, this.syncState = "idle", this.syncMessage = "", this.loaded = !1, this.sceneForm = null, this.sceneName = "", this.dirtyDisplays = /* @__PURE__ */ new Set(), this.previewsStarted = /* @__PURE__ */ new Set(), this.previewTimers = /* @__PURE__ */ new Map(), this.previewUpdates = /* @__PURE__ */ new Map(), this.previewSentAt = /* @__PURE__ */ new Map(), this.allowNavigation = !1, this.closeActionMenusOnOutsideClick = (e) => {
			let t = e.composedPath();
			this.renderRoot.querySelectorAll("details.menu[open]").forEach((e) => {
				t.includes(e) || (e.open = !1);
			});
		}, this.beforeUnload = (e) => {
			this.stopPanelPreviews(), this.dirtyDisplays.size && !this.allowNavigation && (e.preventDefault(), e.returnValue = "");
		}, this.interceptNavigation = (e) => {
			if (!this.dirtyDisplays.size || this.allowNavigation || e.defaultPrevented || e.button !== 0) return;
			let t = e.composedPath().find((e) => e instanceof HTMLAnchorElement);
			if (!t?.href || t.target === "_blank" || t.hasAttribute("download")) return;
			let n = new URL(t.href, window.location.href);
			(n.pathname !== window.location.pathname || n.search !== window.location.search || n.hash !== window.location.hash) && (e.preventDefault(), e.stopImmediatePropagation(), this.confirmation = {
				kind: "leave",
				href: n.href
			});
		};
	}
	static {
		this.styles = o`
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
	}
	updated(e) {
		e.has("hass") && !this.loaded && this.load();
	}
	connectedCallback() {
		super.connectedCallback(), window.addEventListener("beforeunload", this.beforeUnload), window.addEventListener("click", this.interceptNavigation, !0), window.addEventListener("pointerdown", this.closeActionMenusOnOutsideClick, !0);
	}
	disconnectedCallback() {
		this.stopPanelPreviews(), window.removeEventListener("beforeunload", this.beforeUnload), window.removeEventListener("click", this.interceptNavigation, !0), window.removeEventListener("pointerdown", this.closeActionMenusOnOutsideClick, !0), super.disconnectedCallback();
	}
	actionMenuToggled(e) {
		let t = e.currentTarget;
		t.open && this.renderRoot.querySelectorAll("details.menu[open]").forEach((e) => {
			e !== t && (e.open = !1);
		});
	}
	closeActionMenu(e) {
		let t = e.composedPath().find((e) => e instanceof HTMLButtonElement);
		if (!t || t.disabled) return;
		let n = e.currentTarget.closest("details");
		n && (n.open = !1);
	}
	actionMenuKeydown(e) {
		if (e.key !== "Escape") return;
		let t = e.currentTarget.closest("details");
		t && (t.open = !1, t.querySelector("summary")?.focus(), e.preventDefault(), e.stopPropagation());
	}
	stopPanelPreviews() {
		for (let e of this.previewTimers.values()) window.clearTimeout(e);
		if (this.previewTimers.clear(), !this.hass) return;
		let e = new Set(this.previewsStarted);
		for (let t of this.displays) t.preview_scene_id && e.add(t.config_entry_id);
		for (let t of e) (this.previewUpdates.get(t) ?? Promise.resolve()).then(() => this.hass.callWS({
			type: "mini_display/scene/preview/stop",
			config_entry_id: t
		}));
		this.previewsStarted.clear();
	}
	get selectedDisplay() {
		return this.displays.find((e) => e.config_entry_id === this.selectedDisplayId);
	}
	get selectedScene() {
		return this.scenes.find((e) => e.id === this.selectedSceneId);
	}
	get dashboard() {
		return this.dashboards[this.selectedDisplayId];
	}
	errorMessage(e) {
		if (typeof e == "string") return e;
		if (e instanceof Error) return e.message;
		if (e && typeof e == "object") {
			let t = e;
			if (typeof t.message == "string") return typeof t.code == "string" ? `${t.message} (${t.code})` : t.message;
			try {
				return JSON.stringify(e);
			} catch {
				return "Unknown error";
			}
		}
		return String(e);
	}
	retryableSaveError(e) {
		if (!e || typeof e != "object") return !1;
		let t = e;
		if (t.code === "display_unavailable") return !0;
		if (typeof t.message != "string") return !1;
		let n = t.message.toLowerCase();
		return n.includes("did not respond") || n.includes("timeout");
	}
	async saveDashboardWithRetry(e) {
		if (!this.hass) return;
		let t = [
			0,
			300,
			800
		];
		for (let n = 0; n < t.length; n += 1) {
			t[n] && (this.syncMessage = `Retrying save (${n + 1}/${t.length})`, await new Promise((e) => window.setTimeout(e, t[n])));
			try {
				await this.hass.callWS(e);
				return;
			} catch (e) {
				if (n === t.length - 1 || !this.retryableSaveError(e)) throw e;
			}
		}
	}
	async load(e) {
		if (this.hass) {
			this.loaded = !0;
			try {
				let [t, n] = await Promise.all([this.hass.callWS({ type: "mini_display/displays" }), this.hass.callWS({ type: "mini_display/scenes" })]);
				this.displays = t, this.scenes = n, t.some((e) => e.config_entry_id === this.selectedDisplayId) || (this.selectedDisplayId = t[0]?.config_entry_id ?? "");
				let r = this.selectedDisplay?.active_scene_id ?? n[0]?.id ?? "", i = e ?? this.selectedSceneId;
				this.selectedSceneId = n.some((e) => e.id === i) ? i : r, await Promise.all([this.loadSceneDashboards(), this.loadAssets()]), this.syncState = "idle", this.syncMessage = "";
			} catch (e) {
				this.syncState = "error", this.syncMessage = this.errorMessage(e);
			}
		}
	}
	async loadAssets() {
		if (!this.hass) return;
		let e = await Promise.all(this.displays.map(async (e) => [e.config_entry_id, await this.hass.callWS({
			type: "mini_display/assets",
			config_entry_id: e.config_entry_id,
			include_data: !1
		})]));
		this.assets = Object.fromEntries(e);
	}
	imageField(e, t, n) {
		return A`<mini-display-image-field
      .hass=${this.hass}
      .assets=${this.assets[this.selectedDisplayId] ?? []}
      .displayId=${this.selectedDisplayId}
      .label=${e}
      .value=${t ?? ""}
      .maximumWidth=${this.selectedDisplay?.width ?? 240}
      .maximumHeight=${this.selectedDisplay?.height ?? 240}
      @image-changed=${(e) => n(e.detail)}
      @asset-uploaded=${(e) => {
			let t = this.assets[this.selectedDisplayId] ?? [];
			this.assets = {
				...this.assets,
				[this.selectedDisplayId]: [...t.filter((t) => t.id !== e.detail.id), e.detail]
			};
		}}
    ></mini-display-image-field>`;
	}
	async loadSceneDashboards() {
		if (!this.hass || !this.selectedSceneId) {
			this.dashboards = {};
			return;
		}
		let e = await Promise.all(this.displays.map(async (e) => {
			let t = await this.hass.callWS({
				type: "mini_display/dashboard/get",
				config_entry_id: e.config_entry_id,
				scene_id: this.selectedSceneId
			});
			return [e.config_entry_id, t];
		}));
		this.dashboards = Object.fromEntries(e), this.savedDashboards = structuredClone(this.dashboards), this.dirtyDisplays = /* @__PURE__ */ new Set(), this.previewPages = Object.fromEntries(this.displays.map((e) => [e.config_entry_id, 0])), this.pageIndex = 0, this.selected = {
			row: 0,
			card: 0
		};
	}
	async selectScene(e) {
		this.section = "scenes", e !== this.selectedSceneId && (!this.dirtyDisplays.size || window.confirm("Discard unsaved changes and switch scene?")) && (this.stopPanelPreviews(), this.displays = this.displays.map((e) => ({
			...e,
			preview_scene_id: null
		})), this.selectedSceneId = e, this.syncState = "idle", this.syncMessage = "", await this.loadSceneDashboards());
	}
	selectDisplay(e) {
		this.selectedDisplayId = e, this.pageIndex = this.previewPages[e] ?? 0, this.selected = {
			row: 0,
			card: 0
		};
	}
	changed() {
		this.changedDisplay(this.selectedDisplayId);
	}
	changedDisplay(e) {
		let t = this.dashboards[e];
		t && (this.dashboards = {
			...this.dashboards,
			[e]: structuredClone(t)
		}, this.dirtyDisplays = new Set(this.dirtyDisplays).add(e), this.syncState = "idle", this.syncMessage = "Unsaved changes", this.schedulePreviewUpdate(e));
	}
	schedulePreviewUpdate(e) {
		window.clearTimeout(this.previewTimers.get(e)), this.previewsStarted.has(e) && this.previewTimers.set(e, window.setTimeout(() => {
			if (this.previewTimers.delete(e), !this.previewsStarted.has(e) || !this.hass) return;
			if (this.previewUpdates.has(e)) {
				this.previewUpdates.get(e).then(() => this.schedulePreviewUpdate(e));
				return;
			}
			this.previewSentAt.set(e, Date.now());
			let t = this.dashboards[e], n = this.previewPages[e] ?? 0, r = this.hass.callWS({
				type: "mini_display/scene/preview/start",
				config_entry_id: e,
				scene_id: this.selectedSceneId,
				page_id: t?.pages[n]?.id,
				dashboard: t,
				update: !0
			}).then(() => {}, (e) => {
				this.syncState = "error", this.syncMessage = this.errorMessage(e);
			}).finally(() => this.previewUpdates.delete(e));
			this.previewUpdates.set(e, r);
		}, Math.max(0, 1e3 - (Date.now() - (this.previewSentAt.get(e) ?? 0)))));
	}
	async save() {
		if (this.hass && this.dashboard && this.selectedDisplayId && this.selectedSceneId) try {
			this.syncState = "syncing", this.syncMessage = "Saving", await this.saveDashboardWithRetry({
				type: "mini_display/dashboard/set",
				config_entry_id: this.selectedDisplayId,
				scene_id: this.selectedSceneId,
				dashboard: this.dashboard
			}), this.savedDashboards = {
				...this.savedDashboards,
				[this.selectedDisplayId]: structuredClone(this.dashboard)
			};
			let e = new Set(this.dirtyDisplays);
			e.delete(this.selectedDisplayId), this.dirtyDisplays = e, this.syncState = "success", this.syncMessage = "Saved";
		} catch (e) {
			this.syncState = "error", this.syncMessage = this.errorMessage(e);
		}
	}
	async showPage(e) {
		await this.stopPreviewFor(this.selectedDisplayId), this.pageIndex = e, this.previewPages = {
			...this.previewPages,
			[this.selectedDisplayId]: e
		}, this.selected = {
			row: 0,
			card: 0
		};
	}
	discard() {
		this.stopPreviewFor(this.selectedDisplayId);
		let e = this.savedDashboards[this.selectedDisplayId];
		if (e === void 0) return;
		this.dashboards = {
			...this.dashboards,
			[this.selectedDisplayId]: e ? structuredClone(e) : null
		};
		let t = new Set(this.dirtyDisplays);
		t.delete(this.selectedDisplayId), this.dirtyDisplays = t, this.pageIndex = 0, this.previewPages = {
			...this.previewPages,
			[this.selectedDisplayId]: 0
		}, this.selected = {
			row: 0,
			card: 0
		}, this.syncState = "idle", this.syncMessage = "Changes discarded";
	}
	async stopPreviewFor(e) {
		window.clearTimeout(this.previewTimers.get(e)), this.previewTimers.delete(e), this.previewsStarted.delete(e);
		let t = this.displays.find((t) => t.config_entry_id === e);
		if (this.hass && t?.preview_scene_id) try {
			await this.previewUpdates.get(e), await this.hass.callWS({
				type: "mini_display/scene/preview/stop",
				config_entry_id: e
			}), this.previewsStarted.delete(e), this.displays = this.displays.map((t) => t.config_entry_id === e ? {
				...t,
				preview_scene_id: null
			} : t);
		} catch (e) {
			this.syncState = "error", this.syncMessage = this.errorMessage(e);
		}
	}
	async activateScene(e) {
		if (this.hass) try {
			await this.hass.callWS({
				type: "mini_display/scene/activate",
				config_entry_id: e.config_entry_id,
				scene_id: this.selectedSceneId
			}), this.previewsStarted.delete(e.config_entry_id), this.displays = this.displays.map((t) => t.config_entry_id === e.config_entry_id ? {
				...t,
				active_scene_id: this.selectedSceneId,
				active_scene_name: this.selectedScene?.name ?? null,
				preview_scene_id: null
			} : t), this.syncState = "success", this.syncMessage = "Scene activated";
		} catch (e) {
			this.syncState = "error", this.syncMessage = this.errorMessage(e);
		}
	}
	async togglePreview(e) {
		if (!this.hass) return;
		let t = e.preview_scene_id === this.selectedSceneId;
		try {
			if (t) await this.stopPreviewFor(e.config_entry_id);
			else {
				let t = this.dashboards[e.config_entry_id], n = this.previewPages[e.config_entry_id] ?? 0;
				await this.hass.callWS({
					type: "mini_display/scene/preview/start",
					config_entry_id: e.config_entry_id,
					scene_id: this.selectedSceneId,
					page_id: t?.pages[n]?.id,
					dashboard: t
				}), this.previewsStarted.add(e.config_entry_id);
			}
			this.displays = this.displays.map((n) => n.config_entry_id === e.config_entry_id ? {
				...n,
				preview_scene_id: t ? null : this.selectedSceneId
			} : n), this.syncState = "success", this.syncMessage = t ? "Preview stopped" : "Preview shown for 5 minutes";
		} catch (e) {
			this.syncState = "error", this.syncMessage = this.errorMessage(e);
		}
	}
	async createScene() {
		if (!this.hass || this.dirtyDisplays.size && !window.confirm("Discard unsaved changes and create a scene?")) return;
		let e = new Set(this.scenes.map((e) => e.name.toLocaleLowerCase())), t = "New scene", n = 1;
		for (; e.has(t.toLocaleLowerCase());) t = `New scene (${n++})`;
		try {
			this.section = "scenes";
			let e = await this.hass.callWS({
				type: "mini_display/scene/create",
				name: t
			});
			await this.load(e.id), this.syncState = "success", this.syncMessage = "Scene created";
		} catch (e) {
			this.syncState = "error", this.syncMessage = this.errorMessage(e);
		}
	}
	openRenameScene() {
		this.sceneForm = "rename", this.sceneName = this.selectedScene?.name ?? "";
	}
	async saveSceneForm() {
		let e = this.sceneName.trim();
		if (this.hass && e) try {
			this.sceneForm === "rename" && this.selectedSceneId && (await this.hass.callWS({
				type: "mini_display/scene/rename",
				scene_id: this.selectedSceneId,
				name: e
			}), this.sceneForm = null, await this.load(this.selectedSceneId));
		} catch (e) {
			this.syncState = "error", this.syncMessage = this.errorMessage(e);
		}
	}
	async deleteScene() {
		if (this.hass && !this.selectedScene?.is_default && window.confirm(`Delete scene "${this.selectedScene?.name}"?`)) try {
			await this.hass.callWS({
				type: "mini_display/scene/delete",
				scene_id: this.selectedSceneId
			}), await this.load(this.scenes.find((e) => e.is_default)?.id);
		} catch (e) {
			this.syncState = "error", this.syncMessage = this.errorMessage(e);
		}
	}
	async duplicateScene() {
		if (this.hass && this.selectedSceneId) try {
			let e = await this.hass.callWS({
				type: "mini_display/scene/duplicate",
				source_scene_id: this.selectedSceneId
			});
			await this.load(e.id), this.syncState = "success", this.syncMessage = "Scene duplicated";
		} catch (e) {
			this.syncState = "error", this.syncMessage = this.errorMessage(e);
		}
	}
	async setDefaultScene() {
		if (this.hass && this.selectedSceneId && !this.selectedScene?.is_default) try {
			await this.hass.callWS({
				type: "mini_display/scene/default",
				scene_id: this.selectedSceneId
			}), await this.load(this.selectedSceneId), this.syncState = "success", this.syncMessage = "Default scene changed";
		} catch (e) {
			this.syncState = "error", this.syncMessage = this.errorMessage(e);
		}
	}
	createLayout() {
		this.selectedDisplayId && !this.dashboard && (this.dashboards = {
			...this.dashboards,
			[this.selectedDisplayId]: ze()
		}, this.pageIndex = 0, this.previewPages = {
			...this.previewPages,
			[this.selectedDisplayId]: 0
		}, this.selected = {
			row: 0,
			card: 0
		}, this.dirtyDisplays = new Set(this.dirtyDisplays).add(this.selectedDisplayId), this.syncState = "idle", this.syncMessage = "Unsaved changes");
	}
	deletePage() {
		if (!this.dashboard || this.dashboard.pages.length <= 1) return;
		let e = this.dashboard.pages[this.pageIndex];
		window.confirm(`Delete page "${e.title || e.id}"?`) && (this.dashboard.pages.splice(this.pageIndex, 1), this.pageIndex = Math.min(this.pageIndex, this.dashboard.pages.length - 1), this.previewPages = {
			...this.previewPages,
			[this.selectedDisplayId]: this.pageIndex
		}, this.selected = {
			row: 0,
			card: 0
		}, this.changed());
	}
	visibilityObject() {
		if (!this.visibilityTarget || !this.dashboard) return;
		if (this.visibilityTarget.kind === "page") return this.dashboard.pages[this.pageIndex];
		let e = this.dashboard.pages[this.pageIndex]?.rows[this.visibilityTarget.row ?? -1];
		if (e) return this.visibilityTarget.kind === "row" ? e : e.cards[this.visibilityTarget.card ?? -1];
	}
	openVisibility(e, t, n) {
		this.visibilityTarget = {
			kind: e,
			row: t,
			card: n
		};
	}
	saveVisibility(e) {
		let t = this.visibilityObject();
		t && (t.visibility = e, this.visibilityTarget = void 0, this.changed());
	}
	clearVisibility() {
		let e = this.visibilityObject();
		e && delete e.visibility, this.visibilityTarget = void 0, this.changed();
	}
	requestDeleteRow(e) {
		this.confirmation = {
			kind: "delete-row",
			row: e
		};
	}
	closeConfirmation() {
		this.confirmation = void 0;
	}
	async confirmAction() {
		let e = this.confirmation;
		if (this.confirmation = void 0, !e) return;
		if (e.kind === "delete-row") {
			let t = this.dashboard?.pages[this.pageIndex];
			if (!t || t.rows.length <= 1 || !t.rows[e.row]) return;
			t.rows.splice(e.row, 1), this.selected = void 0, this.changed();
			return;
		}
		this.allowNavigation = !0, this.stopPanelPreviews();
		let t = new URL(e.href);
		t.origin === window.location.origin ? (history.pushState(null, "", `${t.pathname}${t.search}${t.hash}`), window.dispatchEvent(new Event("location-changed"))) : window.location.assign(t.href);
	}
	async previewPage(e, t) {
		await this.stopPreviewFor(e);
		let n = this.dashboards[e];
		if (!n) return;
		let r = ((this.previewPages[e] ?? 0) + t + n.pages.length) % n.pages.length;
		this.previewPages = {
			...this.previewPages,
			[e]: r
		}, e === this.selectedDisplayId && (this.pageIndex = r, this.selected = {
			row: 0,
			card: 0
		});
	}
	async openFromPreview(e) {
		this.selectedDisplayId = e.displayId, this.pageIndex = e.page, this.previewPages = {
			...this.previewPages,
			[e.displayId]: e.page
		}, this.selected = e.row !== void 0 && e.card !== void 0 ? {
			row: e.row,
			card: e.card
		} : void 0, await this.updateComplete;
		let t = null;
		if (e.kind === "page-title") {
			let e = this.shadowRoot?.querySelector(".page-settings");
			e && (e.open = !0);
			let n = this.shadowRoot?.querySelector(".page-appearance");
			n && (n.open = !0), t = n ?? e ?? null;
		} else if (e.row !== void 0 && (t = this.shadowRoot?.querySelectorAll(".row-panel")[e.row] ?? null, e.card !== void 0)) {
			let n = t?.querySelector(".card-settings") ?? null;
			if (e.kind === "title" || e.kind === "value") {
				let e = n?.querySelector(".style");
				e && (e.open = !0), t = e ?? n ?? t;
			} else t = n ?? t;
		}
		t?.scrollIntoView({
			behavior: "smooth",
			block: "center"
		});
	}
	updateFromPreview(e) {
		let t = this.dashboards[e.displayId]?.pages[e.page];
		if (t) {
			if (e.kind === "page-title" && e.position) t.titlePosition = e.position;
			else if (e.row !== void 0 && e.card !== void 0 && e.horizontalAlign && e.verticalAlign) {
				let n = t.rows[e.row]?.cards[e.card];
				if (!n) return;
				let r = e.kind === "title" ? "titleStyle" : "valueStyle";
				n[r] = {
					...n[r] ?? {},
					horizontalAlign: e.horizontalAlign,
					verticalAlign: e.verticalAlign
				};
			}
			this.changedDisplay(e.displayId);
		}
	}
	field(e, t, n, r = "text") {
		return A`<label class="field"
      >${e}<input
        type=${r}
        .value=${String(t ?? "")}
        @input=${(e) => n(e.target.value)}
    /></label>`;
	}
	select(e, t, n, r) {
		return A`<label class="field"
      >${e}<select
        @change=${(e) => r(e.target.value)}
      >
        ${n.map((e) => A`<option value=${e} ?selected=${e === t}>${e}</option>`)}
      </select></label
    >`;
	}
	numberField(e, t, n, r, i, a) {
		return A`<label class="field"
      >${e}<input
        type="number"
        min=${r}
        max=${i}
        step="1"
        .value=${String(t ?? n)}
        @change=${(e) => {
			let t = e.target, o = Number(t.value), s = Math.max(r, Math.min(i, Number.isFinite(o) ? o : n));
			t.value = String(s), a(s);
		}}
    /></label>`;
	}
	fontSelect(e, t, n) {
		let r = this.selectedDisplay, i = t === "font1" || t === "font2" ? t : "default", a = new Map((r?.fonts ?? []).map((e) => [e.id, e])), o = r?.default_font;
		return A`<label class="field"
      >${e}<select
        @change=${(e) => n(e.target.value)}
      >
        ${[{
			value: "default",
			label: `Default · ${o && o !== "builtin" && a.get(o)?.installed ? a.get(o)?.name || (o === "font1" ? "Font 1" : "Font 2") : "Inter Tight Bold"}`
		}, ...["font1", "font2"].map((e, t) => {
			let n = a.get(e);
			return {
				value: e,
				label: `Font ${t + 1} · ${n?.installed ? n.name || "Installed" : "Empty"}`
			};
		})].map((e) => A`<option
              value=${e.value}
              ?selected=${e.value === i}
            >
              ${e.label}
            </option>`)}
      </select></label
    >`;
	}
	checkbox(e, t, n, r = !1, i = "") {
		return A`<label class="check" title=${i}
      ><input
        type="checkbox"
        .checked=${t}
        ?disabled=${r}
        @change=${(e) => n(e.target.checked)}
      />${e}</label
    >`;
	}
	segmented(e, t, n, r, i = !1) {
		return A`<div class="segmented-field">
      <span>${e}</span>
      <div class="segmented" role="radiogroup" aria-label=${e}>
        ${n.map((e) => A`<button class="segment ${e.value === t ? "active" : ""}" role="radio" aria-checked=${e.value === t} title=${e.label} ?disabled=${i} @click=${() => {
			i || r(e.value);
		}}>${e.icon ? A`<ha-icon icon=${e.icon}></ha-icon>` : N}<span>${e.label}</span></button>`)}
      </div>
    </div>`;
	}
	textPosition(e, t, n = "center", r = "middle") {
		let i = t.horizontalAlign ?? n, a = t.verticalAlign ?? r, o = [
			{
				horizontal: "left",
				vertical: "top",
				label: "Top left"
			},
			{
				horizontal: "center",
				vertical: "top",
				label: "Top center"
			},
			{
				horizontal: "right",
				vertical: "top",
				label: "Top right"
			},
			{
				horizontal: "left",
				vertical: "middle",
				label: "Middle left"
			},
			{
				horizontal: "center",
				vertical: "middle",
				label: "Center"
			},
			{
				horizontal: "right",
				vertical: "middle",
				label: "Middle right"
			},
			{
				horizontal: "left",
				vertical: "bottom",
				label: "Bottom left"
			},
			{
				horizontal: "center",
				vertical: "bottom",
				label: "Bottom center"
			},
			{
				horizontal: "right",
				vertical: "bottom",
				label: "Bottom right"
			}
		];
		return A`<details class="position-field">
      <summary>${e} · ${o.find((e) => e.horizontal === i && e.vertical === a).label}</summary>
      <div class="position-grid" role="radiogroup" aria-label=${e}>
        ${o.map((e) => {
			let n = e.horizontal === i && e.vertical === a;
			return A`<button
            class="position-button ${n ? "active" : ""}"
            role="radio"
            aria-checked=${n}
            aria-label=${e.label}
            title=${e.label}
            @click=${() => {
				t.horizontalAlign = e.horizontal, t.verticalAlign = e.vertical, this.changed();
			}}
          >
            <span class="position-dot"></span>
          </button>`;
		})}
      </div>
    </details>`;
	}
	textAlignment(e, t) {
		return this.segmented("Alignment", e.horizontalAlign ?? t, [
			{
				value: "left",
				label: "Left",
				icon: "mdi:format-align-left"
			},
			{
				value: "center",
				label: "Center",
				icon: "mdi:format-align-center"
			},
			{
				value: "right",
				label: "Right",
				icon: "mdi:format-align-right"
			}
		], (t) => {
			e.horizontalAlign = t, this.changed();
		});
	}
	textLayoutControls(e, t, n, r) {
		return A`<div class="text-layout-controls">
      ${t ? this.textAlignment(e, n ? "left" : "center") : this.textPosition("Position", e, n ? "left" : "center", n ? "top" : "middle")}
      <mini-display-marquee-field .value=${{ ...e }} .defaultEnabled=${r}
        @marquee-changed=${(t) => {
			Object.assign(e, t.detail), this.changed();
		}}></mini-display-marquee-field>
    </div>`;
	}
	textEffectEditor(e, t) {
		let n = t.textEffect ?? "none";
		return A`<details class="position-field effect-field">
      <summary>${e} · ${n === "shadow" ? "Shadow" : n === "outline" ? "Outline" : "None"}</summary>
      <div class="grid effect-grid">
        ${this.select("Effect", n, [
			"none",
			"shadow",
			"outline"
		], (e) => {
			t.textEffect = e, this.changed();
		})}
        ${n === "none" ? N : A`<mini-display-color-field
                  label="Effect color"
                  .value=${t.effectColor ?? "background"}
                  @color-changed=${(e) => {
			t.effectColor = e.detail || "background", this.changed();
		}}
                ></mini-display-color-field>
                ${this.numberField("Thickness", t.effectThickness, 1, 1, 3, (e) => {
			t.effectThickness = e, this.changed();
		})}
                ${n === "shadow" ? A`${this.numberField("Horizontal offset", t.effectOffsetX, 2, -6, 6, (e) => {
			t.effectOffsetX = e, this.changed();
		})}${this.numberField("Vertical offset", t.effectOffsetY, 2, -6, 6, (e) => {
			t.effectOffsetY = e, this.changed();
		})}` : N}`}
      </div>
    </details>`;
	}
	entity(e) {
		return A`<ha-form
      .hass=${this.hass}
      .data=${{ entity: e.source ?? "" }}
      .schema=${[{
			name: "entity",
			required: e.type !== "text",
			selector: { entity: { domain: {
				weather: ["weather"],
				number: [
					"sensor",
					"number",
					"input_number",
					"counter"
				],
				chart: [
					"sensor",
					"number",
					"input_number",
					"counter"
				],
				status: [
					"binary_sensor",
					"switch",
					"input_boolean",
					"lock",
					"cover",
					"person",
					"device_tracker"
				],
				text: [
					"sensor",
					"text",
					"input_text",
					"select",
					"input_select"
				],
				clock: [],
				image: []
			}[e.type] } }
		}]}
      .computeLabel=${() => e.type === "number" ? "Numeric entity" : e.type === "status" ? "State entity" : "Text entity (optional)"}
      @value-changed=${(t) => {
			e.source = t.detail.value.entity, this.changed();
		}}
    ></ha-form>`;
	}
	menu(e) {
		return A`<details
      class="menu"
      @toggle=${this.actionMenuToggled}
      @keydown=${this.actionMenuKeydown}
    >
      <summary aria-label="More actions" aria-haspopup="menu">
        <ha-icon icon="mdi:dots-vertical"></ha-icon>
      </summary>
      <div class="menu-popover" role="menu" @click=${this.closeActionMenu}>
        ${e}
      </div>
    </details>`;
	}
	cardName(e) {
		return e.title?.trim() || `${e.type[0].toUpperCase()}${e.type.slice(1)} card`;
	}
	appearanceEditor(e) {
		let t = this.dashboard?.pages[this.pageIndex]?.layout === "free", n = this.dashboard?.pages[this.pageIndex]?.transparentCards === !0, r = e.style ??= {}, i = e.valueStyle ??= {}, a = e.titleStyle ??= {}, o = n ? "transparent" : e.backgroundMode ?? (e.transparentBackground ? "transparent" : e.backgroundImage ? "image" : "color"), s = !!(e.title?.trim() && e.showTitle !== !1);
		return A`<div class="grid appearance-grid">
      <section class="appearance-section">
        <header><ha-icon icon="mdi:card-outline"></ha-icon>Card</header>
        ${this.segmented("Background", o, [
			{
				value: "color",
				label: "Color",
				icon: "mdi:palette"
			},
			{
				value: "transparent",
				label: "Page",
				icon: "mdi:checkerboard"
			},
			{
				value: "image",
				label: "Image",
				icon: "mdi:image-outline"
			}
		], (t) => {
			e.backgroundMode = t, e.transparentBackground = t === "transparent", this.changed();
		}, n)}
        ${o === "image" ? this.imageField("Card background image", e.backgroundImage, (t) => {
			e.backgroundImage = t || void 0, this.changed();
		}) : N}
        ${o === "color" ? A`<mini-display-color-field
                label="Background color"
                .value=${r.background ?? ""}
                @color-changed=${(e) => {
			r.background = e.detail || void 0, this.changed();
		}}
              ></mini-display-color-field>` : N}
        <mini-display-color-field
          label="Accent"
          .value=${r.accent ?? ""}
          @color-changed=${(e) => {
			r.accent = e.detail || void 0, this.changed();
		}}
        ></mini-display-color-field>
      </section>
      ${e.type === "image" ? N : A`<section class="appearance-section">
              <header><ha-icon icon="mdi:format-text"></ha-icon>Value</header>
              <mini-display-color-field
                label="Text color"
                .value=${r.foreground ?? ""}
                @color-changed=${(e) => {
			r.foreground = e.detail || void 0, this.changed();
		}}
              ></mini-display-color-field>
              ${this.fontSelect("Font", i.fontFamily, (e) => {
			i.fontFamily = e, this.changed();
		})}
              ${t ? N : this.select("Font size", i.fontSize ?? "auto", [
			"auto",
			"small",
			"medium",
			"large",
			"xlarge"
		], (e) => {
			i.fontSize = e, this.changed();
		})}
              ${this.textLayoutControls(i, t, !1, t && e.type === "text")}
              ${this.select("Text flow", i.textFlow ?? "default", [
			"default",
			"overflow",
			"wrap"
		], (e) => {
			i.textFlow = e, this.changed();
		})}
              ${this.textEffectEditor("Effect", i)}
            </section>`}
      ${s ? A`<section class="appearance-section">
              <header><ha-icon icon="mdi:format-title"></ha-icon>Title</header>
              <mini-display-color-field
                label="Text color"
                .value=${a.foreground ?? ""}
                @color-changed=${(e) => {
			a.foreground = e.detail || void 0, this.changed();
		}}
              ></mini-display-color-field>
              ${this.fontSelect("Font", a.fontFamily, (e) => {
			a.fontFamily = e, this.changed();
		})}
              ${t ? N : this.select("Font size", a.fontSize ?? "auto", [
			"auto",
			"small",
			"medium",
			"large",
			"xlarge"
		], (e) => {
			a.fontSize = e, this.changed();
		})}
              ${this.textLayoutControls(a, t, !0, !0)}
              ${this.select("Text flow", a.textFlow ?? "default", [
			"default",
			"overflow",
			"wrap"
		], (e) => {
			a.textFlow = e, this.changed();
		})}
              ${this.textEffectEditor("Effect", a)}
            </section>` : N}
    </div>`;
	}
	transitionEditor(e) {
		let t = e.transition ?? { type: "none" }, n = (t) => {
			e.transition = t, this.changed();
		}, r = (e) => n({
			...t,
			...e
		}), i = () => {
			if (!this.dashboard) return;
			let t = structuredClone(e.transition ?? { type: "none" });
			this.dashboard.pages.forEach((e) => {
				e.transition = structuredClone(t);
			}), this.changed();
		}, a = [
			{
				type: "none",
				label: "None",
				icon: "mdi:cancel"
			},
			{
				type: "random",
				label: "Random",
				icon: "mdi:shuffle-variant"
			},
			{
				type: "slide",
				label: "Slide",
				icon: "mdi:arrow-right-bold"
			},
			{
				type: "bounce",
				label: "Bounce",
				icon: "mdi:arrow-up-bold-circle-outline"
			},
			{
				type: "fade",
				label: "Fade",
				icon: "mdi:brightness-6"
			},
			{
				type: "wipe",
				label: "Wipe",
				icon: "mdi:transition-masked"
			},
			{
				type: "dissolve",
				label: "Dissolve",
				icon: "mdi:dots-grid"
			},
			{
				type: "curtain",
				label: "Curtain",
				icon: "mdi:curtains"
			},
			{
				type: "blinds",
				label: "Blinds",
				icon: "mdi:blinds-horizontal"
			},
			{
				type: "mosaic",
				label: "Mosaic",
				icon: "mdi:view-grid-plus"
			},
			{
				type: "cascade",
				label: "Cascade",
				icon: "mdi:chart-waterfall"
			},
			{
				type: "spiral",
				label: "Spiral",
				icon: "mdi:reload"
			}
		], o = (e) => e === "none" ? { type: e } : e === "random" ? {
			type: e,
			speed: "normal"
		} : [
			"dissolve",
			"mosaic",
			"cascade",
			"spiral"
		].includes(e) ? {
			type: e,
			speed: "normal",
			tileSize: "medium"
		} : e === "fade" ? {
			type: e,
			speed: "normal",
			intensity: "strong"
		} : e === "bounce" ? {
			type: e,
			direction: "up",
			speed: "normal",
			intensity: "subtle"
		} : ["curtain", "blinds"].includes(e) ? {
			type: e,
			direction: "left",
			speed: "normal"
		} : {
			type: e,
			direction: e === "slide" ? "up" : "left",
			speed: "normal"
		}, s = [
			{
				value: "random",
				label: "Random",
				icon: "mdi:shuffle-variant"
			},
			{
				value: "left",
				label: "Left",
				icon: "mdi:arrow-left"
			},
			{
				value: "right",
				label: "Right",
				icon: "mdi:arrow-right"
			},
			{
				value: "up",
				label: "Up",
				icon: "mdi:arrow-up"
			},
			{
				value: "down",
				label: "Down",
				icon: "mdi:arrow-down"
			}
		], c = [
			{
				value: "slow",
				label: "Slow"
			},
			{
				value: "normal",
				label: "Normal"
			},
			{
				value: "fast",
				label: "Fast"
			}
		], l = ["slide", "bounce"].includes(t.type), u = l ? s.filter((e) => [
			"random",
			"up",
			"down"
		].includes(e.value)) : s, d = l && ["left", "right"].includes(t.direction ?? "") ? t.direction === "right" ? "down" : "up" : t.direction ?? "left";
		return A`<details class="transition-settings">
      <summary class="transition-summary">
        Transition to next page ·
        ${a.find((e) => e.type === t.type)?.label ?? "None"}
      </summary>
      <div class="effect-grid">
        ${a.map((e) => A`<button class="effect ${t.type === e.type ? "active" : ""}" aria-pressed=${e.type === t.type} @click=${() => n(o(e.type))}><ha-icon icon=${e.icon}></ha-icon><span>${e.label}</span></button>`)}
      </div>
      ${t.type === "none" ? N : A`<div class="transition-options">
              ${[
			"slide",
			"bounce",
			"wipe",
			"curtain",
			"blinds"
		].includes(t.type) ? this.segmented("Direction", d, u, (e) => r({ direction: e })) : N}${this.segmented("Speed", t.speed ?? "normal", c, (e) => r({ speed: e }))}${["bounce", "fade"].includes(t.type) ? this.segmented("Intensity", t.intensity ?? "subtle", [{
			value: "subtle",
			label: "Subtle"
		}, {
			value: "strong",
			label: "Strong"
		}], (e) => r({ intensity: e })) : N}${[
			"dissolve",
			"mosaic",
			"cascade",
			"spiral"
		].includes(t.type) ? this.segmented("Tile size", t.tileSize ?? "medium", [
			{
				value: "small",
				label: "Small"
			},
			{
				value: "medium",
				label: "Medium"
			},
			{
				value: "large",
				label: "Large"
			}
		], (e) => r({ tileSize: e })) : N}
            </div>`}
      <div class="transition-actions">
        <ha-button
          .disabled=${(this.dashboard?.pages.length ?? 0) < 2}
          @click=${i}
        >
          <ha-icon icon="mdi:content-copy"></ha-icon>
          Apply to all pages
        </ha-button>
      </div>
    </details>`;
	}
	dragMapping(e, t, n) {
		this.draggedMapping = {
			kind: e,
			index: t
		}, n.dataTransfer?.setData("text/plain", `${e}:${t}`), n.dataTransfer && (n.dataTransfer.effectAllowed = "move"), this.requestUpdate();
	}
	dropMapping(e, t, n, r) {
		r.preventDefault();
		let i = this.draggedMapping;
		if (this.draggedMapping = void 0, !i || i.kind !== t || i.index === n) {
			this.requestUpdate();
			return;
		}
		let a = t === "value" ? e.valueMappings : e.colorMappings;
		if (!a) return;
		let [o] = a.splice(i.index, 1);
		a.splice(n, 0, o), this.changed();
	}
	dragHandle(e, t) {
		return A`<span
      class="drag-handle"
      draggable="true"
      title="Drag to reorder"
      aria-label="Drag to reorder"
      @dragstart=${(n) => this.dragMapping(e, t, n)}
      @dragend=${() => {
			this.draggedMapping = void 0, this.requestUpdate();
		}}
      ><ha-icon icon="mdi:drag-vertical"></ha-icon
    ></span>`;
	}
	dragCard(e, t, n) {
		this.draggedCard = {
			row: e,
			index: t
		}, n.dataTransfer?.setData("text/plain", `card:${e}:${t}`), n.dataTransfer && (n.dataTransfer.effectAllowed = "move"), this.requestUpdate();
	}
	dropCard(e, t, n) {
		n.preventDefault();
		let r = this.draggedCard;
		if (this.draggedCard = void 0, !r || r.row !== e || r.index === t) {
			this.requestUpdate();
			return;
		}
		let i = this.dashboard?.pages[this.pageIndex]?.rows[e]?.cards;
		if (!i) return;
		let [a] = i.splice(r.index, 1);
		i.splice(t, 0, a), this.selected = {
			row: e,
			card: t
		}, this.changed();
	}
	valueMappingsEditor(e) {
		if (e.type !== "number" && e.type !== "text") return N;
		let t = e.valueMappings ?? [], n = (e, n, r) => {
			let i = t[e];
			r.trim() === "" ? delete i[n] : i[n] = Number(r), this.changed();
		}, r = (n) => {
			t.splice(n, 1), t.length || delete e.valueMappings, this.changed();
		};
		return A`<details class="mappings">
      <summary>
        Value mappings${t.length ? ` (${t.length})` : ""}
      </summary>
      <div class="mapping-list">
        <p class="mapping-copy">
          Rules are checked from top to bottom. The first match wins.
        </p>
        ${t.map((t, i) => e.type === "number" ? A`
                <div
                  class="mapping-rule ${this.draggedMapping?.kind === "value" && this.draggedMapping.index === i ? "dragging" : ""}"
                  @dragover=${(e) => e.preventDefault()}
                  @drop=${(t) => this.dropMapping(e, "value", i, t)}
                >
                  ${this.dragHandle("value", i)}
                  ${this.field("From", t.minimum, (e) => n(i, "minimum", e), "number")}
                  ${this.field("To", t.maximum, (e) => n(i, "maximum", e), "number")}
                  ${this.field("Display as", t.value, (e) => {
			t.value = e, this.changed();
		})}
                  <button
                    class="icon-button danger"
                    title="Delete mapping"
                    aria-label="Delete mapping"
                    @click=${() => r(i)}
                  >
                    <ha-icon icon="mdi:delete-outline"></ha-icon>
                  </button>
                </div>
              ` : A`
                <div
                  class="mapping-rule text ${this.draggedMapping?.kind === "value" && this.draggedMapping.index === i ? "dragging" : ""}"
                  @dragover=${(e) => e.preventDefault()}
                  @drop=${(t) => this.dropMapping(e, "value", i, t)}
                >
                  ${this.dragHandle("value", i)}
                  ${this.select("Match", t.operator, [
			"equals",
			"starts_with",
			"ends_with",
			"contains"
		], (e) => {
			t.operator = e, this.changed();
		})}
                  ${this.field("Text", t.match, (e) => {
			t.match = e, this.changed();
		})}
                  ${this.field("Display as", t.value, (e) => {
			t.value = e, this.changed();
		})}
                  <button
                    class="icon-button danger"
                    title="Delete mapping"
                    aria-label="Delete mapping"
                    @click=${() => r(i)}
                  >
                    <ha-icon icon="mdi:delete-outline"></ha-icon>
                  </button>
                </div>
              `)}
        ${t.length < 12 ? A`<button
                class="add-button"
                @click=${() => {
			let n = e.type === "number" ? {
				minimum: 0,
				maximum: 100,
				value: ""
			} : {
				operator: "equals",
				match: "",
				value: ""
			};
			e.valueMappings = [...t, n], this.changed();
		}}
              >
                Add mapping
              </button>` : N}
      </div>
    </details>`;
	}
	colorMappingsEditor(e) {
		if (e.type !== "number" && e.type !== "text") return N;
		let t = this.dashboard?.pages[this.pageIndex]?.transparentCards === !0, n = e.colorMappings ?? [], r = (e, t, r) => {
			let i = n[e];
			r.trim() === "" ? delete i[t] : i[t] = Number(r), this.changed();
		}, i = (e, t, n) => {
			n ? e[t] = n : delete e[t], this.changed();
		}, a = (t) => {
			n.splice(t, 1), n.length || delete e.colorMappings, this.changed();
		};
		return A`<details class="mappings">
      <summary>
        Color mappings${n.length ? ` (${n.length})` : ""}
      </summary>
      <div class="mapping-list">
        <p class="mapping-copy">
          The first matching rule sets the card colors.
        </p>
        ${n.map((n, o) => e.type === "number" ? A`
                <div
                  class="mapping-rule colors ${this.draggedMapping?.kind === "color" && this.draggedMapping.index === o ? "dragging" : ""}"
                  @dragover=${(e) => e.preventDefault()}
                  @drop=${(t) => this.dropMapping(e, "color", o, t)}
                >
                  ${this.dragHandle("color", o)}
                  ${this.field("From", n.minimum, (e) => r(o, "minimum", e), "number")}
                  ${this.field("To", n.maximum, (e) => r(o, "maximum", e), "number")}
                  <mini-display-color-field
                    label="Background"
                    .disabled=${t}
                    .value=${n.background ?? ""}
                    @color-changed=${(e) => i(n, "background", e.detail)}
                  ></mini-display-color-field>
                  <mini-display-color-field
                    label="Text color"
                    .value=${n.foreground ?? ""}
                    @color-changed=${(e) => i(n, "foreground", e.detail)}
                  ></mini-display-color-field>
                  <button
                    class="icon-button danger"
                    title="Delete color mapping"
                    aria-label="Delete color mapping"
                    @click=${() => a(o)}
                  >
                    <ha-icon icon="mdi:delete-outline"></ha-icon>
                  </button>
                </div>
              ` : A`
                <div
                  class="mapping-rule colors text ${this.draggedMapping?.kind === "color" && this.draggedMapping.index === o ? "dragging" : ""}"
                  @dragover=${(e) => e.preventDefault()}
                  @drop=${(t) => this.dropMapping(e, "color", o, t)}
                >
                  ${this.dragHandle("color", o)}
                  ${this.select("Match", n.operator, [
			"equals",
			"starts_with",
			"ends_with",
			"contains"
		], (e) => {
			n.operator = e, this.changed();
		})}
                  ${this.field("Text", n.match, (e) => {
			n.match = e, this.changed();
		})}
                  <mini-display-color-field
                    label="Background"
                    .disabled=${t}
                    .value=${n.background ?? ""}
                    @color-changed=${(e) => i(n, "background", e.detail)}
                  ></mini-display-color-field>
                  <mini-display-color-field
                    label="Text color"
                    .value=${n.foreground ?? ""}
                    @color-changed=${(e) => i(n, "foreground", e.detail)}
                  ></mini-display-color-field>
                  <button
                    class="icon-button danger"
                    title="Delete color mapping"
                    aria-label="Delete color mapping"
                    @click=${() => a(o)}
                  >
                    <ha-icon icon="mdi:delete-outline"></ha-icon>
                  </button>
                </div>
              `)}
        ${n.length < 12 ? A`<button
                class="add-button"
                @click=${() => {
			let t = e.type === "number" ? {
				minimum: 0,
				maximum: 100
			} : {
				operator: "equals",
				match: ""
			};
			e.colorMappings = [...n, t], this.changed();
		}}
              >
                Add color mapping
              </button>` : N}
      </div>
    </details>`;
	}
	cardSettings(e, t, n) {
		let r = this.dashboard.pages[this.pageIndex].rows[t].cards, i = {
			number: "Displays a numeric value with an optional unit and progress visualization.",
			text: "Displays text from an entity or the static text below.",
			status: "Maps a state entity to two readable labels.",
			clock: "Displays local time without using an entity.",
			image: "Displays an optimized image without an entity.",
			chart: "Displays recorded values as a chart.",
			weather: "Current conditions and forecasts from Home Assistant."
		}, a = +!!e.visibility + (e.valueMappings?.length ?? 0) + (e.colorMappings?.length ?? 0);
		return A`<section class="card-settings">
      <div class="card-head">
        <div class="card-title">
          <strong>${this.cardName(e)}</strong
          >${e.title?.trim() && e.showTitle === !1 ? A`<span class="condition-mark"><ha-icon icon="mdi:eye-off-outline"></ha-icon>Title hidden</span>` : N}${e.visibility ? A`<span class="condition-mark"><ha-icon icon="mdi:eye-settings-outline"></ha-icon>Conditional</span>` : N}
        </div>
        ${this.menu(A`<button
              @click=${() => {
			r.splice(n + 1, 0, structuredClone(e)), this.selected = {
				row: t,
				card: n + 1
			}, this.changed();
		}}
            >
              Duplicate</button
            ><button
              class="danger"
              ?disabled=${r.length === 1 && this.dashboard.pages[this.pageIndex].layout !== "free"}
              @click=${() => {
			(r.length > 1 || this.dashboard.pages[this.pageIndex].layout === "free") && (r.splice(n, 1), this.selected = void 0, this.changed());
		}}
            >
              Delete
            </button>`)}
      </div>
      <nav class="card-section-tabs" aria-label="Card settings sections">
        ${[
			[
				"content",
				"Content",
				"mdi:text-box-outline"
			],
			[
				"appearance",
				"Appearance",
				"mdi:palette-outline"
			],
			[
				"rules",
				"Rules",
				"mdi:source-branch"
			]
		].map(([e, t, n]) => A`<button
              class="card-section-tab ${this.cardSection === e ? "active" : ""}"
              role="tab"
              aria-selected=${this.cardSection === e}
              @click=${() => this.cardSection = e}
            >
              <ha-icon icon=${n}></ha-icon><span>${t}</span>${e === "rules" && a ? A`<span class="section-count">${a}</span>` : N}
            </button>`)}
      </nav>
      <div class="card-pane" role="tabpanel">
        ${this.cardSection === "content" ? A`
                <section class="settings-group">
                  <div class="settings-heading">
                    <ha-icon icon="mdi:card-text-outline"></ha-icon>
                    <div>
                      <strong>Card</strong><small>${i[e.type]}</small>
                    </div>
                  </div>
                  ${this.segmented("Card type", e.type, [
			{
				value: "number",
				label: "Number",
				icon: "mdi:numeric"
			},
			{
				value: "text",
				label: "Text",
				icon: "mdi:format-text"
			},
			{
				value: "chart",
				label: "Chart",
				icon: "mdi:chart-bar"
			},
			{
				value: "weather",
				label: "Weather",
				icon: "mdi:weather-partly-cloudy"
			},
			{
				value: "status",
				label: "Status",
				icon: "mdi:toggle-switch-outline"
			},
			{
				value: "clock",
				label: "Clock",
				icon: "mdi:clock-outline"
			},
			{
				value: "image",
				label: "Image",
				icon: "mdi:image-outline"
			}
		], (t) => {
			let { frame: n, titleFrame: r, valueFrame: i } = e;
			Object.keys(e).forEach((t) => delete e[t]), Object.assign(e, Fe(t)), n && (e.frame = n), r && (e.titleFrame = r), i && (e.valueFrame = i), this.changed();
		})}
                  <div class="grid compact-grid">
                    ${this.field("Title", e.title, (t) => {
			e.title = t, this.changed();
		})}
                    <div class="inline-option">
                      ${this.checkbox("Show title on display", e.showTitle !== !1, (t) => {
			this.dashboard?.pages[this.pageIndex]?.layout === "free" && Ge(e), e.showTitle = t, this.changed();
		}, !e.title?.trim())}
                    </div>
                  </div>
                </section>
                ${e.type === "image" ? A`<section class="settings-group">
                        <div class="settings-heading">
                          <ha-icon icon="mdi:image-outline"></ha-icon>
                          <div>
                            <strong>Image</strong
                            ><small>Displayed without an entity value</small>
                          </div>
                        </div>
                        ${this.imageField("Image", e.image, (t) => {
			e.image = t, this.changed();
		})}
                        ${this.segmented("Fit", e.imageFit ?? "cover", [
			{
				value: "cover",
				label: "Cover",
				icon: "mdi:image-size-select-actual"
			},
			{
				value: "contain",
				label: "Contain",
				icon: "mdi:image-size-select-large"
			},
			{
				value: "stretch",
				label: "Stretch",
				icon: "mdi:fit-to-screen-outline"
			}
		], (t) => {
			e.imageFit = t, this.changed();
		})}
                      </section>` : N}
                ${[
			"number",
			"status",
			"text",
			"chart",
			"weather"
		].includes(e.type) ? A`<section class="settings-group">
                        <div class="settings-heading">
                          <ha-icon icon="mdi:database-outline"></ha-icon>
                          <div>
                            <strong>Data</strong
                            ><small>Value shown by this card</small>
                          </div>
                        </div>
                        <div class="grid">
                          ${this.entity(e)}
                          ${e.type === "weather" ? A`<mini-display-weather-editor style="grid-column:1/-1" .settings=${e.weather ?? {}}
                            @weather-changed=${(t) => {
			e.weather = t.detail, this.changed();
		}}></mini-display-weather-editor>` : N}
                          ${e.type === "number" ? A`${this.field("Unit", e.unit, (t) => {
			e.unit = t, this.changed();
		})}${this.select("Progress", e.progress ?? "none", [
			"none",
			"bar",
			"ring"
		], (t) => {
			e.progress = t, this.changed();
		})}${e.progress && e.progress !== "none" ? A`${this.field("Minimum", e.minimum, (t) => {
			e.minimum = Number(t), this.changed();
		}, "number")}${this.field("Maximum", e.maximum, (t) => {
			e.maximum = Number(t), this.changed();
		}, "number")}` : N}` : N}
                          ${e.type === "text" ? A`${this.field("Static text", e.text, (t) => {
			e.text = t, this.changed();
		})}${this.field("Unit", e.unit, (t) => {
			e.unit = t, this.changed();
		})}` : N}
                          ${e.type === "status" ? A`${this.field("On text", e.onText, (t) => {
			e.onText = t, this.changed();
		})}${this.field("Off text", e.offText, (t) => {
			e.offText = t, this.changed();
		})}` : N}
                        </div>
                      </section>` : N}
                ${e.type === "number" ? A`<section class="settings-group">
                  <div class="settings-heading">
                    <ha-icon icon="mdi:tune-vertical"></ha-icon>
                    <div><strong>Value transformers</strong
                      ><small>Format or adjust the numeric value before display</small></div>
                  </div>
                  <mini-display-value-transform-editor
                    .value=${e.valueTransform}
                    .onValueChange=${(t) => {
			e.valueTransform = t, this.changed();
		}}
                  ></mini-display-value-transform-editor>
                </section>` : N}
                <section class="settings-group"><mini-display-graph-editor .card=${e} .hass=${this.hass}
                  @graph-changed=${(t) => {
			let n = e.graph !== void 0 && e.graph !== null;
			e.graph = t.detail, n && !t.detail && (e.backgroundMode = "transparent", e.transparentBackground = !0), this.changed();
		}}
                ></mini-display-graph-editor></section>
              ` : this.cardSection === "appearance" ? A`<section class="settings-group">
                  <div class="settings-heading">
                    <ha-icon icon="mdi:palette-outline"></ha-icon>
                    <div>
                      <strong>Appearance</strong
                      ><small>Colors, typography and placement</small>
                    </div>
                  </div>
                  ${this.appearanceEditor(e)}
                </section>` : A`
                  <section class="settings-group">
                    <div class="setting-action">
                      <ha-icon icon="mdi:eye-settings-outline"></ha-icon>
                      <div>
                        <strong>Visibility</strong>
                        <small
                          >${e.visibility ? "Shown when configured conditions match" : "Always visible"}</small
                        >
                      </div>
                      <ha-button
                        @click=${() => this.openVisibility("card", t, n)}
                        >${e.visibility ? "Edit" : "Configure"}</ha-button
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
                    ${this.valueMappingsEditor(e)}${this.colorMappingsEditor(e)}
                  </section>
                `}
      </div>
    </section>`;
	}
	rowEditor(e, t) {
		let n = this.dashboard.pages[this.pageIndex];
		return A`<section class="row-panel">
      <div class="row-head">
        <div class="row-title">
          ${this.editingRowTitle === t ? A`<input
                  class="row-title-input"
                  aria-label="Row title"
                  autofocus
                  .value=${e.title ?? ""}
                  placeholder=${`Row ${t + 1}`}
                  @input=${(t) => {
			e.title = t.target.value, this.changed();
		}}
                  @blur=${() => this.editingRowTitle = void 0}
                  @keydown=${(e) => {
			(e.key === "Enter" || e.key === "Escape") && e.currentTarget.blur();
		}}
                />` : A`<strong
                    >${e.title?.trim() || `Row ${t + 1}`}</strong
                  ><button
                    class="inline-icon-button"
                    aria-label="Edit row title"
                    title="Edit row title"
                    @click=${() => this.editingRowTitle = t}
                  >
                    <ha-icon icon="mdi:pencil-outline"></ha-icon>
                  </button>`}<small
            >${e.cards.length}
            ${e.cards.length === 1 ? "card" : "cards"}</small
          >${e.visibility ? A`<span class="condition-mark"><ha-icon icon="mdi:eye-settings-outline"></ha-icon>Conditional</span>` : N}
        </div>
        ${this.menu(A`<button @click=${() => this.openVisibility("row", t)}>
              Visibility</button
            ><button
              @click=${() => {
			n.rows.splice(t + 1, 0, structuredClone(e)), this.changed();
		}}
            >
              Duplicate</button
            ><button
              class="danger"
              ?disabled=${n.rows.length === 1}
              @click=${() => {
			n.rows.length > 1 && this.requestDeleteRow(t);
		}}
            >
              Delete
            </button>`)}
      </div>
      ${e.title?.trim() ? this.fontSelect("Row title font", e.titleStyle?.fontFamily, (t) => {
			e.titleStyle = {
				...e.titleStyle ?? {},
				fontFamily: t
			}, this.changed();
		}) : N}
      <nav class="card-tabs" aria-label=${`Cards in row ${t + 1}`}>
        ${e.cards.map((e, n) => {
			let r = this.selected?.row === t && this.selected?.card === n;
			return A`<button
            draggable="true"
            class="tab ${r ? "active" : ""} ${this.draggedCard?.row === t && this.draggedCard.index === n ? "dragging" : ""}"
            aria-label=${this.cardName(e)}
            aria-expanded=${r}
            @dragstart=${(e) => this.dragCard(t, n, e)}
            @dragover=${(e) => e.preventDefault()}
            @drop=${(e) => this.dropCard(t, n, e)}
            @dragend=${() => {
				this.draggedCard = void 0, this.requestUpdate();
			}}
            @click=${() => this.selected = r ? void 0 : {
				row: t,
				card: n
			}}
          >
            ${this.cardName(e)}
          </button>`;
		})}${e.cards.length < 3 ? A`<button
                class="icon-button"
                title="Add card"
                aria-label="Add card"
                @click=${() => {
			e.cards.push(Fe()), this.selected = {
				row: t,
				card: e.cards.length - 1
			}, this.changed();
		}}
              >
                <ha-icon icon="mdi:plus"></ha-icon>
              </button>` : N}
      </nav>
      ${this.selected?.row === t ? this.cardSettings(e.cards[this.selected.card], t, this.selected.card) : N}
    </section>`;
	}
	setLayout(e) {
		let t = this.dashboard.pages[this.pageIndex];
		if (e === "free") t.rows.forEach((e, n) => e.cards.forEach((r, i) => {
			r.frame ??= {
				x: i * 100 / e.cards.length,
				y: n * 100 / t.rows.length,
				width: 100 / e.cards.length,
				height: 100 / t.rows.length
			};
		}));
		else {
			let e = t.rows.flatMap((e) => e.cards);
			t.rows = [];
			for (let n = 0; n < e.length; n += 3) t.rows.push({
				weight: 1,
				gap: "small",
				cards: e.slice(n, n + 3)
			});
			t.rows.length || (t.rows = [Le()]);
		}
		t.layout = e, this.selected = void 0, this.changed();
	}
	freeEditor(e) {
		let t = e.rows.flatMap((e, t) => e.cards.map((e, n) => ({
			card: e,
			ri: t,
			ci: n
		}))), n = this.selected && e.rows[this.selected.row]?.cards[this.selected.card], r = (n) => {
			if (t.length >= 18) {
				this.syncState = "error", this.syncMessage = "This display supports up to 18 items per page";
				return;
			}
			let r = Fe(n);
			r.frame = {
				x: 5,
				y: 5,
				width: 50,
				height: 30
			}, r.backgroundMode = "transparent", e.rows[0].cards.push(r), this.selected = {
				row: 0,
				card: e.rows[0].cards.length - 1
			}, this.changed();
		}, i = (r) => {
			if (!n) return;
			let i = t.map((e) => e.card), a = i.indexOf(n), o = a + r;
			o < 0 || o >= i.length || (i.splice(o, 0, i.splice(a, 1)[0]), e.rows = [{ cards: i }], this.selected = {
				row: 0,
				card: o
			}, this.changed());
		};
		return A`<section class="row-panel">
      <nav class="tabs" aria-label="Add item">${[
			"number",
			"text",
			"image",
			"chart",
			"weather",
			"clock",
			"status"
		].map((e) => A`<button class="tab" @click=${() => r(e)}><ha-icon icon="mdi:plus"></ha-icon>${e}</button>`)}</nav>
      <nav class="card-tabs" aria-label="Items">${t.map(({ card: e, ri: t, ci: n }) => A`<button class="tab ${this.selected?.row === t && this.selected.card === n ? "active" : ""}" @click=${() => this.selected = {
			row: t,
			card: n
		}}>${this.cardName(e)}</button>`)}</nav>
      ${n?.frame ? A`<div class="tabs"><button class="tab" @click=${() => i(-1)}>Send backward</button><button class="tab" @click=${() => i(1)}>Bring forward</button></div>` : N}
      ${n && this.selected ? this.cardSettings(n, this.selected.row, this.selected.card) : N}
    </section>`;
	}
	renderEditor() {
		let e = this.dashboard, t = e?.pages[this.pageIndex], n = this.dirtyDisplays.has(this.selectedDisplayId), r = e?.pages.filter((e) => e.enabled !== !1).length ?? 0, i = t?.style ?? {}, a = t?.titleStyle ?? {};
		return A`
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
              <ha-button .disabled=${!n} @click=${this.discard}
                >Discard</ha-button
              ><ha-button
                .disabled=${!n || this.syncState === "syncing"}
                @click=${() => void this.save()}
                >Save</ha-button
              >
            </div>
          </div>
        </div>
        ${t && e ? A`
                <div class="editor-content">
                  <nav class="tabs" aria-label="Dashboard pages">
                    ${e.pages.map((e, t) => A`
                        <button
                          class="tab ${t === this.pageIndex ? "active" : ""} ${e.enabled === !1 ? "inactive" : ""}"
                          aria-pressed=${t === this.pageIndex}
                          @click=${() => void this.showPage(t)}
                        >
                          ${e.enabled === !1 ? A`<ha-icon icon="mdi:eye-off-outline"></ha-icon>` : N}${e.title || e.id}
                        </button>
                      `)}
                    <button
                      class="icon-button"
                      aria-label="Add page"
                      title="Add page"
                      @click=${() => {
			e.pages.push(Re(e.pages.length + 1)), this.pageIndex = e.pages.length - 1, this.previewPages = {
				...this.previewPages,
				[this.selectedDisplayId]: this.pageIndex
			}, this.selected = {
				row: 0,
				card: 0
			}, this.changed();
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
                          >${t.durationSeconds ?? 10}s ·
                          ${t.enabled === !1 ? "Disabled" : "Enabled"}${t.visibility ? " · conditional" : ""}${t.showTitle === !1 ? " · title hidden" : ""}</small
                        ></span
                      ><button
                        class="icon-button danger"
                        aria-label="Delete page"
                        title="Delete page"
                        ?disabled=${e.pages.length <= 1}
                        @click=${(e) => {
			e.preventDefault(), e.stopPropagation(), this.deletePage();
		}}
                      >
                        <ha-icon icon="mdi:delete-outline"></ha-icon>
                      </button>
                    </summary>
                    <div class="page-settings-grid">
                      ${this.field("Page title", t.title, (e) => {
			t.title = e, this.changed();
		})}
                      ${this.field("Duration (seconds)", t.durationSeconds, (e) => {
			t.durationSeconds = Number(e), this.changed();
		}, "number")}
                      <div class="page-options">
                        ${this.checkbox("Enabled", t.enabled !== !1, (e) => {
			t.enabled = e, this.changed();
		}, t.enabled !== !1 && r <= 1, "At least one page must stay enabled")}
                        ${this.checkbox("Show title", t.showTitle !== !1, (e) => {
			t.showTitle = e, this.changed();
		})}
                      </div>
                      <div class="setting-action page-visibility">
                        <ha-icon icon="mdi:eye-settings-outline"></ha-icon>
                        <div><strong>Visibility</strong><small>${t.visibility ? "Shown when configured conditions match" : "Always visible"}</small></div>
                        <ha-button @click=${() => this.openVisibility("page")}>${t.visibility ? "Edit" : "Configure"}</ha-button>
                      </div>
                      ${t.showTitle === !1 ? N : A`<div class="page-title-position">
                              ${this.segmented("Title position", t.titlePosition ?? "top", [
			{
				value: "top",
				label: "Top",
				icon: "mdi:format-vertical-align-top"
			},
			{
				value: "right",
				label: "Right",
				icon: "mdi:format-horizontal-align-right"
			},
			{
				value: "bottom",
				label: "Bottom",
				icon: "mdi:format-vertical-align-bottom"
			},
			{
				value: "left",
				label: "Left",
				icon: "mdi:format-horizontal-align-left"
			}
		], (e) => {
			t.titlePosition = e, this.changed();
		})}
                            </div>`}
                      <details class="page-appearance">
                        <summary>Page appearance</summary>
                        <div class="page-appearance-grid">
                          <mini-display-color-field
                            label="Page background"
                            .value=${i.background ?? ""}
                            @color-changed=${(e) => {
			t.style = {
				...t.style ?? {},
				background: e.detail || void 0
			}, this.changed();
		}}
                          ></mini-display-color-field>
                          ${this.imageField("Page background image", t.backgroundImage, (e) => {
			t.backgroundImage = e || void 0, this.changed();
		})}
                          <div class="inline-option">
                            ${this.checkbox("Transparent card backgrounds", t.transparentCards === !0, (e) => {
			t.transparentCards = e, this.changed();
		}, !1, "Keeps each card background setting but does not render it on this page")}
                          </div>
                          ${t.showTitle === !1 ? N : A`
                                  <mini-display-color-field
                                    label="Title background"
                                    .value=${a.background ?? ""}
                                    @color-changed=${(e) => {
			t.titleStyle = {
				...t.titleStyle ?? {},
				background: e.detail || void 0
			}, this.changed();
		}}
                                  ></mini-display-color-field>
                                  <mini-display-color-field
                                    label="Title text"
                                    .value=${a.foreground ?? ""}
                                    @color-changed=${(e) => {
			t.titleStyle = {
				...t.titleStyle ?? {},
				foreground: e.detail || void 0
			}, this.changed();
		}}
                                  ></mini-display-color-field>
                                  ${this.fontSelect("Title font", a.fontFamily, (e) => {
			t.titleStyle = {
				...t.titleStyle ?? {},
				fontFamily: e
			}, this.changed();
		})}
                                  ${this.select("Title font size", a.fontSize ?? "small", [
			"small",
			"medium",
			"large",
			"xlarge"
		], (e) => {
			t.titleStyle = {
				...t.titleStyle ?? {},
				fontSize: e
			}, this.changed();
		})}
                                `}
                        </div>
                      </details>
                      <details class="advanced-settings">
                        <summary>Advanced</summary>
                        <div class="advanced-settings-content">
                          ${this.field("Page ID", t.id, (e) => {
			t.id = e, this.changed();
		})}
                        </div>
                      </details>
                    </div>
                  </details>
                  ${this.transitionEditor(t)}
                  ${this.segmented("Layout", t.layout ?? "rows", [{
			value: "rows",
			label: "Rows",
			icon: "mdi:view-agenda-outline"
		}, {
			value: "free",
			label: "Free layout",
			icon: "mdi:vector-square"
		}], (e) => this.setLayout(e))}
                  <div class="rows">
                    ${t.layout === "free" ? this.freeEditor(t) : t.rows.map((e, t) => this.rowEditor(e, t))}
                  </div>
                  ${t.layout !== "free" && t.rows.length < 6 ? A`<button
                          class="add-button"
                          @click=${() => {
			t.rows.push(Le()), this.changed();
		}}
                        >
                          Add row
                        </button>` : N}
                </div>
              ` : A`<div class="loading">
                <p>No layout configured for this display.</p>
                <ha-button @click=${this.createLayout}>Create layout</ha-button>
              </div>`}
      </ha-card>
    `;
	}
	render() {
		if (!this.loaded) return A`<div class="loading">Loading displays…</div>`;
		if (this.displays.length === 0) return A`<ha-card class="empty"
        ><ha-icon icon="mdi:monitor-off"></ha-icon>
        <h2>No Mini Displays yet</h2>
        <p>
          Add a Mini Display integration first. Configured displays will appear
          here automatically.
        </p>
        <ha-button
          @click=${() => {
			history.pushState(null, "", "/config/integrations"), window.dispatchEvent(new Event("location-changed"));
		}}
          ><ha-icon icon="mdi:plus"></ha-icon>Add integration</ha-button
        ></ha-card
      >`;
		let e = this.visibilityObject()?.visibility, t = this.visibilityTarget?.kind === "page" ? "Page" : this.visibilityTarget?.kind === "row" ? "Row" : "Card", n = this.visibilityTarget?.kind === "card" ? this.visibilityObject() : void 0;
		return A`
      <div
        class="layout ${this.schemaViewOpen ? "schema-open" : ""}"
        style=${`--preview-column-width:${Math.min(640, Math.max(288, ...this.displays.map((e) => e.width + 28)))}px`}
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
          @display-selected=${(e) => this.selectDisplay(e.detail)}
          @scene-selected=${(e) => void this.selectScene(e.detail)}
          @images-selected=${() => this.section = "images"}
          @scene-create=${() => void this.createScene()}
          @scene-rename=${this.openRenameScene}
          @scene-duplicate=${() => void this.duplicateScene()}
          @scene-default=${() => void this.setDefaultScene()}
          @scene-delete=${() => void this.deleteScene()}
          @scene-name=${(e) => this.sceneName = e.detail}
          @scene-cancel=${() => this.sceneForm = null}
          @scene-save=${() => void this.saveSceneForm()}
        ></mini-display-scene-sidebar>

        ${this.section === "images" ? A`<mini-display-image-manager
                class="images-view"
                .hass=${this.hass}
                .assets=${this.assets[this.selectedDisplayId] ?? []}
                .displayId=${this.selectedDisplayId}
                .displayName=${this.selectedDisplay?.title ?? "Display"}
                .maximumWidth=${this.selectedDisplay?.width ?? 240}
                .maximumHeight=${this.selectedDisplay?.height ?? 240}
                @asset-uploaded=${(e) => {
			let t = this.assets[this.selectedDisplayId] ?? [];
			this.assets = {
				...this.assets,
				[this.selectedDisplayId]: [...t.filter((t) => t.id !== e.detail.id), e.detail]
			};
		}}
                @asset-deleted=${(e) => {
			this.assets = {
				...this.assets,
				[this.selectedDisplayId]: (this.assets[this.selectedDisplayId] ?? []).filter((t) => t.id !== e.detail)
			};
		}}
              ></mini-display-image-manager>` : A`${this.renderEditor()}

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
                  @preview-frame=${(e) => {
			let t = e.detail, n = this.dashboards[t.displayId]?.pages[t.page]?.rows[t.row]?.cards[t.card];
			n && (Ge(n), t.part === "title" ? n.titleFrame = t.frame : t.part === "value" ? n.valueFrame = t.frame : n.frame = t.frame, this.selectedDisplayId = t.displayId, this.pageIndex = t.page, this.selected = {
				row: t.row,
				card: t.card
			}, this.changed());
		}}
                  @display-selected=${(e) => this.selectDisplay(e.detail)}
                  @preview-toggle=${(e) => void this.togglePreview(e.detail)}
                  @preview-page=${(e) => this.previewPage(e.detail.displayId, e.detail.delta)}
                  @schema-view-changed=${(e) => {
			this.schemaViewOpen = e.detail;
		}}
                  @preview-select=${(e) => void this.openFromPreview(e.detail)}
                  @preview-position=${(e) => void this.updateFromPreview(e.detail)}
                  @scene-activate=${(e) => void this.activateScene(e.detail)}
                ></mini-display-preview-list>`}
      </div>

      ${this.visibilityTarget ? A`
              <mini-display-visibility-dialog
                .hass=${this.hass}
                .targetName=${t}
                .targetKind=${this.visibilityTarget.kind}
                .card=${n}
                .value=${e}
                @visibility-save=${(e) => this.saveVisibility(e.detail)}
                @visibility-clear=${this.clearVisibility}
                @visibility-cancel=${() => this.visibilityTarget = void 0}
              ></mini-display-visibility-dialog>
            ` : N}
      ${this.confirmation ? A`
              <div class="modal-backdrop" @click=${this.closeConfirmation}>
                <ha-card
                  class="confirm-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="confirm-title"
                  @click=${(e) => e.stopPropagation()}
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
                      ${this.confirmation.kind === "delete-row" ? "This row and all cards inside it will be removed." : "You have unsaved changes. Leaving Mini Displays will discard them."}
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
            ` : N}
    `;
	}
};
V([z({ attribute: !1 })], $.prototype, "hass", void 0), V([B()], $.prototype, "displays", void 0), V([B()], $.prototype, "scenes", void 0), V([B()], $.prototype, "dashboards", void 0), V([B()], $.prototype, "assets", void 0), V([B()], $.prototype, "savedDashboards", void 0), V([B()], $.prototype, "selectedDisplayId", void 0), V([B()], $.prototype, "selectedSceneId", void 0), V([B()], $.prototype, "section", void 0), V([B()], $.prototype, "pageIndex", void 0), V([B()], $.prototype, "cardSection", void 0), V([B()], $.prototype, "editingRowTitle", void 0), V([B()], $.prototype, "previewPages", void 0), V([B()], $.prototype, "schemaViewOpen", void 0), V([B()], $.prototype, "selected", void 0), V([B()], $.prototype, "syncState", void 0), V([B()], $.prototype, "syncMessage", void 0), V([B()], $.prototype, "loaded", void 0), V([B()], $.prototype, "sceneForm", void 0), V([B()], $.prototype, "sceneName", void 0), V([B()], $.prototype, "dirtyDisplays", void 0), V([B()], $.prototype, "visibilityTarget", void 0), V([B()], $.prototype, "confirmation", void 0), $ = V([R("mini-display-editor")], $);
//#endregion
//#region src/panel.ts
var cn = class extends L {
	constructor(...e) {
		super(...e), this.narrow = !1;
	}
	static {
		this.styles = o`
    :host {
      display: block;
      min-height: 100%;
      color: var(--primary-text-color);
      background: var(--primary-background-color);
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
    }
    .shell {
      width: min(1440px, 100%);
      margin: 0 auto;
      padding: 24px;
      box-sizing: border-box;
    }
    header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    header ha-icon {
      color: var(--primary-color);
    }
    h1 {
      margin: 0;
      font-size: 24px;
      line-height: 1.25;
      font-weight: 500;
    }
    p {
      margin: 4px 0 0;
      color: var(--secondary-text-color);
    }
    @media (max-width: 600px) {
      .shell { padding: 16px; }
      header { margin-bottom: 16px; }
      h1 { font-size: 21px; }
    }
  `;
	}
	render() {
		return A`
      <div class="shell">
        <header>
          <ha-icon icon="mdi:monitor-dashboard"></ha-icon>
          <div>
            <h1>Mini Displays</h1>
            <p>Configure pages and content shown on your displays.</p>
          </div>
        </header>
        <mini-display-editor .hass=${this.hass}></mini-display-editor>
      </div>
    `;
	}
};
V([z({ attribute: !1 })], cn.prototype, "hass", void 0), V([z({ attribute: !1 })], cn.prototype, "narrow", void 0), V([z({ attribute: !1 })], cn.prototype, "route", void 0), V([z({ attribute: !1 })], cn.prototype, "panel", void 0), cn = V([R("mini-display-panel")], cn);
//#endregion

//# sourceMappingURL=mini-display-panel.js.map
