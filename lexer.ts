import { span, type SrcSpan } from "./ast.ts";

export function dbgtoken(token: Token) {
	let map: Record<TokenKind, string> = {
		[TokenKind.LBracket]: "[",
		[TokenKind.RBracket]: "]",
		[TokenKind.LParen]: "(",
		[TokenKind.RParen]: ")",
		[TokenKind.LCurly]: "{",
		[TokenKind.RCurly]: "}",

		[TokenKind.Let]: `let`,
		[TokenKind.Name]: `${token.data}`,
		[TokenKind.Number]: `${token.data}`,
		[TokenKind.String]: `${token.data}`,

		[TokenKind.Plus]: "+",
		[TokenKind.Minus]: "-",
		[TokenKind.Star]: "*",
		[TokenKind.Slash]: "/",
		[TokenKind.Dot]: ".",

		[TokenKind.Eq]: "=",
		[TokenKind.EqEq]: "==",

		[TokenKind.EOS]: "EndOfFile",
		[TokenKind.NewLine]: "\n",
	};

	return `${map[token.kind]}`;
}

export enum TokenKind {
	LBracket,
	RBracket,
	LCurly,
	RCurly,
	LParen,
	RParen,

	Let,
	Name,
	Number,
	String,

	Eq,
	EqEq,

	Plus,
	Minus,
	Star,
	Slash,
	Dot,

	NewLine,
	EOS,
}

export type StringTokenData = string;
export type NumberTokenData = string;

export class Token<Data = any> {
	constructor(
		public readonly kind: TokenKind,
		public readonly span: SrcSpan,
		public data: Data,
	) {}

	isEOS(): boolean {
		return this.kind === TokenKind.EOS;
	}

	static NULL(kind: TokenKind, span: SrcSpan) {
		return new Token(kind, span, null);
	}

	static isString(token: Token<unknown>): token is Token<string> {
		return token.kind === TokenKind.String;
	}

	static isNumber(token: Token<unknown>): token is Token<number> {
		return token.kind === TokenKind.String;
	}
}

export class Lexer implements IterableIterator<Token> {
	private queue: Token<any>[] = [];
	private ch0: string | null = null;
	private ch1: string | null = null;

	private start: number = 0;
	private end: number = 0;
	private chars: Iterator<string>;

	constructor(src: string) {
		const normalizedSrc = src.replaceAll(/\r\n/g, "\n");
		this.chars = normalizedSrc.split("").values();
		this.consume();
		this.consume();
	}

	[Symbol.iterator](): IterableIterator<Token> {
		return this;
	}

	next(): IteratorResult<Token> {
		let token = this.nextToken();
		return { value: token, done: token.isEOS() };
	}

	nextToken(): Token {
		while (this.queue.length === 0) {
			this.advance();
		}
		// always yeilds a token
		return this.queue.shift()!;
	}

	private advance() {
		const c = this.ch0;

		if (c === null) {
			this.consume();
			this.queue.push(new Token(TokenKind.EOS, span(0, 0), null));
		} else {
			if (this.isNameStart(c)) {
				this.queue.push(this.eatname());
			} else if (this.isNumberStart(c)) {
				this.queue.push(this.eatnumber());
			} else {
				const token = this.eatSingleCharacter();
				if (token) this.queue.push(token);
			}
		}
	}

	private eatSingleCharacter() {
		const start = this.start;

		let map: Record<string, TokenKind> = {
			"+": TokenKind.Plus,
			"-": TokenKind.Minus,
			"*": TokenKind.Star,
			"/": TokenKind.Slash,
			"=": TokenKind.Eq,
			"==": TokenKind.EqEq,
			"(": TokenKind.LParen,
			")": TokenKind.RParen,
			"{": TokenKind.LCurly,
			"}": TokenKind.RCurly,
			"[": TokenKind.LBracket,
			"]": TokenKind.RBracket,
			".": TokenKind.Dot,
			"\n": TokenKind.NewLine,
		};

		const c = this.ch0;
		if (c === null) return null;

		let char: string | null = c;
		switch (c) {
			case " ":
			case "\t":
			case "\n": {
				this.consume();
				if (c === "\n") {
					char = "\n";
				} else {
					char = null;
				}
				break;
			}
			case "=": {
				if (this.ch1 === "==") {
					char = "==";
					this.consume(); // =
					this.consume(); // =
				} else {
					char = this.consume()!;
				}
				break;
			}
			default:
				this.consume();
				break;
		}

		if (char === null) return;

		if (map[char] === undefined) throw new Error(`invalid token : "${char}"`);

		const kind = map[char];

		const end = this.start;

		return new Token(kind, span(start, end), null);
	}

	private eatnumber(): Token<number> {
		const start = this.start;

		let value: number;
		if (this.ch0 === "0") {
			switch (this.ch1) {
				case "x":
				case "X": {
					this.consume();
					this.consume();
					value = this.eatRadixNumber("0x", 16);
					break;
				}

				case "o":
				case "O": {
					this.consume();
					this.consume();

					value = this.eatRadixNumber("0o", 8);
					break;
				}

				case "b":
				case "B": {
					this.consume();
					this.consume();
					value = this.eatRadixNumber("0b", 16);
					break;
				}

				default:
					value = this.eatDecimalNumber();
			}
		} else {
			value = this.eatDecimalNumber();
		}

		const end = this.end;
		return new Token(TokenKind.Number, span(start, end), value);
	}

	private eatRadixNumber(prefix: string, radix: number): number {
		let val = "";

		while (this.ch0 && isDigitOfRadix(this.ch0, radix)) {
			val += this.consume();
		}

		if (val === "") throw new Error("empty radix");

		let valInt = parseInt(val, radix);

		if (isNaN(valInt)) {
			throw new Error(`Invalid number: ${prefix + val} of radix ${radix}`);
		}

		return valInt;
	}
	private eatDecimalNumber(): number {
		let value = "";
		value += this.runRadix(10);

		let isFloat = false;

		if (this.ch0 !== null && /^[.eE]$/.test(this.ch0)) {
			const dotOrE = this.consume();
			value += dotOrE; // . e or E

			if (dotOrE === ".") {
				const decimalPlaces = this.runRadix(10);
				value += decimalPlaces;

				let cur = this.ch0; // thanks typescript
				if (decimalPlaces !== "" && (cur === "e" || cur === "E")) {
					value += this.consume(); // e or E
					value += this.eatExponent();
				}
			} else {
				value += this.eatExponent();
			}

			isFloat = true;
		}

		const valueNumber = isFloat
			? Number.parseFloat(value)
			: Number.parseInt(value);

		if (isNaN(valueNumber)) {
			throw new Error("Invalid number");
		}

		return valueNumber;
	}

	private eatExponent(): string {
		let val = "";

		if (this.ch0 === "+" || this.ch0 === "-") {
			val += this.consume();
		}
		let expVal = this.runRadix(10);

		if (expVal === "") {
			throw new Error("EmptyExponent");
		}

		val += expVal;

		return val;
	}

	private runRadix(radix: number): string {
		let res = "";

		while (this.ch0 !== null && isDigitOfRadix(this.ch0, radix))
			res += this.consume()!;

		return res;
	}

	private isNameStart(c: string | null) {
		if (c === null) return false;
		return /^[_a-zA-Z]$/.test(c);
	}

	private isNameContinuation() {
		if (this.ch0 === null) return false;
		return /^[_a-zA-Z0-9]$/.test(this.ch0);
	}

	private isNumberStart(c: string) {
		return /^[0-9]$/.test(c);
	}

	private eatname(): Token<string> {
		const start = this.start;
		let name = "";

		while (this.isNameContinuation()) {
			const c = this.consume();
			if (c !== null) name += c;
		}

		const end = this.end;
		const s = span(start, end);
		return new Token(TokenKind.Name, s, name);
	}

	private consume(): string | null {
		const cur = this.ch0;
		let iter_next = this.chars.next();
		const next = iter_next.done ? null : (iter_next.value as string);
		this.ch0 = this.ch1;
		this.ch1 = next;

		if (cur === null && this.ch0 === null) {
			return null;
		}

		this.start = this.end;
		this.end++;
		return cur;
	}
}

function isDigitOfRadix(str: string, radix: number): boolean {
	if (radix < 2 || radix > 36) {
		return false;
	}

	const parsed = parseInt(str, radix);

	return !isNaN(parsed) && parsed.toString(radix) === str.toLowerCase();
}
