import { createHighlighter, type Highlighter, type ThemedToken } from "shiki";
import "./style.css";

console.log("Radhey Shyam");

class Mountable {
	constructor(protected _view: HTMLElement = document.createElement("div")) {}

	get view() {
		return this._view;
	}

	connectedCallback() {}

	mount(container: HTMLElement) {
		container.append(this._view);
		requestAnimationFrame(() => {
			this.connectedCallback();
		});
	}
}

class ResultView extends Mountable {
	constructor() {
		super();

		this._view.innerHTML = `
		<div class="formula-editor-result" >
		<span style="font-weight: bold; color: hsl(0 0 50%);">=</span>
		<div id="result" style="flex: 1;">Hello</div>
		<div>
					`;
	}

	update(res: string) {
		const resultThing = this._view.querySelector("#result");
		if (resultThing) resultThing.textContent = res;
	}
}
class ContentEditable extends Mountable {
	private text: string;
	constructor(private highligher: Highlighter) {
		super();
		this._view.classList.add("formula-editor-content-editable");
		this._view.innerText = "a = 10";
		this._view.contentEditable = "true";
		this.text = `
			a = false
			true false
			b = 10.0
			thing = "thing"
			a = 'abcd'
			thing()
			a.thing()
			a + b
		`;
	}

	get view() {
		return this._view;
	}

	connectedCallback(): void {
		requestAnimationFrame(() => {
			this.render();
		});
	}

	update() {
		this.text = this._view.innerText ?? "";
	}

	render() {
		const code = this.text
			.trim()
			.split("\n")
			.map((l) => l.trim())
			.join("\n");

		const normalized = code.replaceAll(/\r\n/g, "\n");

		const tokens = this.highligher.codeToTokensBase(normalized, {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			lang: "formula" as any,
			theme: "ayu-dark",
		});

		const html = this._getHtml(tokens);
		this._view.innerHTML = html;
	}
	private _getHtml(tokens: ThemedToken[][]) {
		const lines = tokens.map((line) => {
			return `<p>${line.map((t) => `<span style="color: ${t.color};">${t.content}</span>`).join("")}</p>`;
		});
		console.log(lines);
		return lines.join("");
	}

	setSelection() {
		requestAnimationFrame(() => {
			const sel = document.getSelection();
			if (!sel) return;

			const lastChild = this._view.lastChild;
			sel.setPosition(
				lastChild ?? this._view,
				lastChild ? (lastChild.textContent?.length ?? 0) : 0,
			);
		});
	}
}

class FormulaEditor extends Mountable {
	private header = document.createElement("header");
	private result = new ResultView();
	private inlineEditor: ContentEditable;

	constructor(highlighter: Highlighter) {
		super();
		this.inlineEditor = new ContentEditable(highlighter);

		this._view.classList.add("formula-editor");

		this.header.classList.add("formula-editor-header");
		this.header.innerHTML = `
		<div style="font-size: .8rem; font-weight: bold;">Formula Editor Pro</div>
		`;
	}

	mount(container: HTMLElement): void {
		super.mount(container);
		this._view.append(this.header);
		this.inlineEditor.mount(this.header);
		this.result.mount(this._view);

		// for testing
		const button = document.createElement("button");
		button.innerText = "Update";
		this._view.append(button);
		button.addEventListener("click", () => {
			this.inlineEditor.update();
			this.inlineEditor.render();
		});
	}
}

async function createFormulaHighlighter() {
	const res = await fetch("/formula.json");
	const data = await res.text();
	const lang = JSON.parse(data);
	const highligher = await createHighlighter({
		langs: [lang],
		themes: ["ayu-dark", "monokai"],
	});
	return highligher;
}

(async () => {
	const highlighter = await createFormulaHighlighter();

	const editor = new FormulaEditor(highlighter);
	editor.mount(document.body);
})();
