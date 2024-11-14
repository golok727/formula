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
	constructor() {
		super();

		this._view.classList.add("formula-editor-content-editable");
		this._view.innerText = "a = 10";
		this._view.contentEditable = "true";
	}

	get view() {
		return this._view;
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
	private inlineEditor = new ContentEditable();
	private result = new ResultView();

	constructor() {
		super();
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
	}

	override connectedCallback(): void {
		this.inlineEditor.setSelection();
	}
}

const editor = new FormulaEditor();
editor.mount(document.body);
