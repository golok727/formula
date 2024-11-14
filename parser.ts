import type { Token, TokenKind } from "./lexer";
import { Formula, Item } from "./ast";

export class Parser {
	private tokens: IterableIterator<Token>;

	private t0: Token | null = null;
	private t1: Token | null = null;

	constructor(tokens: IterableIterator<Token>) {
		this.tokens = tokens;
		this.consume();
		this.consume();
	}

	parse() {
		const formula = new Formula();
		formula.items = this.parseSeriesOf<Item>(() => {
			this.consume();

			return new Item();
		});

		return formula;
	}

	private parseSeriesOf<T extends Item = Item>(
		fn: () => T,
		sep: TokenKind | null = null,
	): T[] {
		const res: T[] = [];

		if (!this.t0) return res;

		while (this.t0 !== null) {
			if (this.t0.kind === sep) {
				this.consume();
				continue;
			}

			res.push(fn());
		}

		return res;
	}

	private consume() {
		const cur = this.t0;

		const next_iter = this.tokens.next();
		const next = next_iter.done ? null : next_iter.value;

		this.t0 = this.t1;
		this.t1 = next;

		return cur;
	}
}
