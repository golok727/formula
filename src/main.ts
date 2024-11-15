import { createHighlighter, type Highlighter, type ThemedToken } from "shiki";
import "./style.css";
import { PieceTable } from "./text-buffer";

console.log("Radhey Shyam");

interface Selection {
	start: number;
	end: number;
}

function selectionIsCollapsed(selection: Selection) {
	return selection.start === selection.end;
}

class Mountable {
	constructor(protected _view: HTMLElement = document.createElement("div")) {}

	get view() {
		return this._view;
	}

	init() {}

	mount(container: HTMLElement) {
		container.append(this._view);
		requestAnimationFrame(() => {
			this.init();
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
	private text: PieceTable;
	private selection: Selection | null = null;

	constructor(
		private highligher: Highlighter,
		initial = "",
	) {
		super();
		this.selection = null;

		this.text = new PieceTable(initial);
		this._view.classList.add("formula-editor-content-editable");
		this._view.style.whiteSpace = "pre";
		this._view.style.wordBreak = "break-word";
		this._view.contentEditable = "true";
		this._view.style.outline = "none";
		this._view.spellcheck = false;
		this._view.innerText = "";
	}

	get view() {
		return this._view;
	}

	insertText(pos: number, text: string) {
		this.text.insert(pos, text);

		this.render();
		if (this.selection) {
			this.setSelection(this.selection.start + 1, this.selection.end + 1);
		}
	}

	deleteText(start: number, length: number) {
		this.text.delete(start, length);

		this.render();
		if (this.selection) {
			this.setSelection(start, start);
		}
	}

	replaceText(start: number, length: number, replace: string) {
		this.text.delete(start, length);
		this.text.insert(start, replace);

		this.render();
		if (this.selection) {
			this.setSelection(start + length, start + length + length);
		}
	}

	private handleInput = (ev: InputEvent) => {
		ev.preventDefault();
		if (!this.selection) return;

		switch (ev.inputType) {
			case "insertText": {
				if (!selectionIsCollapsed(this.selection)) {
					const { start, end } = this.selection;
					this.replaceText(start, end - start, ev.data as string);
				}
				this.insertText(this.selection.start, ev.data as string);
				break;
			}
			case "insertFromPaste": {
				const data = ev.dataTransfer;
				if (!this.selection) return;
				if (!data) break;
				const text = data.getData("text/plain");

				if (!selectionIsCollapsed(this.selection)) {
					const { start, end } = this.selection;
					this.replaceText(start, end - start, text);
					break;
				}
				this.insertText(this.selection.start, text);
				break;
			}
			case "deleteContentBackward": {
				const { start, end } = this.selection;

				if (selectionIsCollapsed(this.selection)) {
					if (this.selection.start > 0) {
						this.deleteText(start - 1, 1);
					}
				} else {
					this.deleteText(start, end - start);
				}
				break;
			}
			case "insertParagraph": {
				this.insertText(this.selection.start, "\n ");
			}
		}
	};
	override init(): void {
		// TODO dispose

		this.view.addEventListener("beforeinput", this.handleInput);

		document.addEventListener("selectionchange", this.storeSelection);

		this._view.focus();

		this.render();
	}

	innerText() {
		return this.text.getText();
	}

	setSelection(start: number, end: number, sync = true) {
		this.selection = { start, end };
		if (sync) this.restoreSelection();
	}

	private convertSelectionToRange(selection: Selection) {
		const range = document.createRange();
		// TODO optimize collapsed
		const start = this.findTextNode(selection.start);
		const end = this.findTextNode(selection.end);
		if (start && end) {
			range.setStart(start.node, start.offset);
			range.setEnd(end.node, end.offset);
			return range;
		}
		return null;
	}

	private findTextNode(index: number) {
		const allUnits = Array.from(
			this._view.querySelectorAll("[data-offset]"),
		) as HTMLElement[];

		// Binary search
		let low = 0;
		let high = allUnits.length - 1;

		while (low <= high) {
			const mid = Math.floor((low + high) / 2);
			const unit = allUnits[mid];
			const dataOffset = Number.parseInt(unit.dataset.offset as string);
			const length = unit.textContent?.length ?? 0;

			if (index >= dataOffset && index <= dataOffset + length) {
				return {
					node: unit.firstChild as Node,
					offset: index - dataOffset,
				};
			}

			if (index < dataOffset) {
				high = mid - 1;
			} else {
				low = mid + 1;
			}
		}

		return null;
	}

	private restoreSelection() {
		if (this.selection) {
			const range = this.convertSelectionToRange(this.selection);
			const sel = document.getSelection();
			if (range) {
				sel?.removeAllRanges();
				sel?.addRange(range);
			}
		}
	}

	storeSelection = () => {
		const sel = window.getSelection();

		if (sel?.rangeCount) {
			const range = sel.getRangeAt(0);

			const calcOffset = (node: Node) => {
				const unit = node.parentElement?.closest(
					"[data-formula-unit]",
				) as HTMLElement | null;

				return Number.parseInt(unit?.dataset.offset ?? "0");
			};

			const startOffset = calcOffset(range.startContainer);
			const endOffset = calcOffset(range.endContainer);
			this.selection = {
				start: startOffset + range.startOffset,
				end: endOffset + range.endOffset,
			};
		}
	};

	dispose() {}

	render() {
		const code = this.text.getText();
		const lines = this.highligher.codeToTokensBase(code, {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			lang: "formula" as any,
			theme: "ayu-dark",
		});

		let offset = 0;
		const createSpan = (content: string, color = "") => {
			const span = document.createElement("span");

			span.setAttribute("data-formula-unit", "true");
			span.setAttribute("data-offset", offset.toString());
			offset += content.length;
			span.classList.add("formula-editor-unit");
			span.style.color = color;
			span.innerText = content;
			return span;
		};

		const items = [];
		for (const units of lines) {
			for (const unit of units) {
				const span = createSpan(unit.content, unit.color);
				items.push(span);
			}
			if (units.length !== 0) items.push(createSpan("\n"));
		}
		this._view.replaceChildren(...items);
	}
}

class FormulaEditor extends Mountable {
	private header = document.createElement("header");
	private result = new ResultView();
	private inlineEditor: ContentEditable;

	constructor(highlighter: Highlighter, initialText = "") {
		super();

		this.inlineEditor = new ContentEditable(highlighter, initialText);
		this._view.spellcheck = false;

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
		const save = document.createElement("button");
		save.innerText = "Save";
		save.addEventListener("click", () => {
			const text = this.inlineEditor.innerText();
			localStorage.formula_code = text;
		});
		this._view.append(save);
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

createFormulaHighlighter()
	.then((highlighter) => {
		const editor = new FormulaEditor(
			highlighter,
			localStorage.formula_code ?? "",
		);
		editor.mount(document.body);
	})
	.catch(console.error);
