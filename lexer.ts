import { Token, TokenKind } from "./token";
import { span, type SrcSpan } from "./ast";
import { dbgAssert } from "./utils";

export class LexError extends Error {
	constructor(
		public location: SrcSpan,
		message?: string,
	) {
		super(message);
	}
}

export class UnterminatedStringLiteralError extends LexError {
	constructor(location: SrcSpan) {
		// TODO message processing can be done later
		super(location, "Unterminated string literal");
	}
}

export class Lexer implements IterableIterator<Token> {
	private queue: Token[] = [];
	private ch0: string | null = null;
	private ch1: string | null = null;

	private start = 0;
	private end = 0;

	constructor(private chars: Iterator<string>) {
		this.consume();
		this.consume();
	}

	static filtered(
		chars: Iterator<string>,
		filter: (t: Token) => boolean,
	): IterableIterator<Token> {
		const lexer = new Lexer(chars);

		return {
			next() {
				const option = lexer.next();

				if (option.done) return option;

				if (filter(option.value)) return option;

				console.log(this);
				return this.next();
			},
			[Symbol.iterator]() {
				return this;
			},
		};
	}

	static mapped<T>(
		chars: Iterator<string>,
		map: (t: Token) => T,
	): IterableIterator<T> {
		const lexer = new Lexer(chars);

		return {
			next() {
				const option = lexer.next();

				if (option.done) return { done: true, value: undefined as unknown };

				return { done: false, value: map(option.value) };
			},
			[Symbol.iterator]() {
				return this;
			},
		};
	}

	static filterMap<T>(
		chars: Iterator<string>,
		filter: (t: Token) => boolean,
		map: (t: Token) => T,
	): IterableIterator<T> {
		const lexer = new Lexer(chars);

		const next = (): IteratorResult<T> => {
			const option = lexer.next();

			if (option.done) return { done: true, value: undefined as unknown };

			if (filter(option.value)) {
				return { done: false, value: map(option.value) };
			}

			// If the token does not pass the filter, continue to the next one
			return next();
		};

		return {
			next,
			[Symbol.iterator]() {
				return this;
			},
		};
	}

	[Symbol.iterator]() {
		return this;
	}

	next(): IteratorResult<Token> {
		const token = this.nextToken();
		return { value: token, done: token.isEOS() };
	}

	nextToken(): Token {
		while (this.queue.length === 0) {
			this.advance();
		}

		// biome-ignore lint/style/noNonNullAssertion: this will not be null it will always yeild a token
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

	private eatQuotedString(): Token {
		const start = this.start;
		const quote = this.consume();
		dbgAssert(quote === '"' || quote === "'");

		const valueParts: string[] = [];

		while (true) {
			if (this.ch0 === quote) {
				this.consume(); // closing qoute
				break;
			}

			switch (this.ch0) {
				case "\\":
					this.consume(); // Move past the backslash
					if (this.ch0 === null) {
						throw new UnterminatedStringLiteralError(
							span(this.start, this.start),
						);
					}
					valueParts.push(this.handleEscapeSequence());
					break;

				// strings should terminate before new lines
				case "\n":
				case null:
					throw new UnterminatedStringLiteralError(span(start, this.start));

				default:
					valueParts.push(this.consume() as string);
					break;
			}
		}

		const value = valueParts.join("");
		const end = this.start;
		return new Token(TokenKind.String, span(start, end), value);
	}

	private handleEscapeSequence(): string {
		const escapeMap: Record<string, string> = {
			n: "\n",
			f: "\x0C",
			t: "\t",
			r: "\r",
			"\\": "\\",
			"0": "\0",
			"'": "'",
			'"': '"',
		};

		const escapeChar = this.ch0;
		this.consume(); // Consume the escape character

		if (escapeChar && escapeChar in escapeMap) {
			return escapeMap[escapeChar];
		}

		// Default to returning the literal sequence if it's not a recognized escape
		// biome-ignore lint/style/useTemplate: <explanation>
		return "\\" + (escapeChar ?? "");
	}

	private eatSingleCharacter() {
		const start = this.start;

		const map: Record<string, TokenKind> = {
			"+": TokenKind.Plus,
			"-": TokenKind.Minus,
			"*": TokenKind.Star,
			"/": TokenKind.Slash,

			"=": TokenKind.Eq,
			">": TokenKind.Gt,
			"<": TokenKind.Lt,
			"!": TokenKind.Bang,
			"!=": TokenKind.NotEq,
			"==": TokenKind.EqEq,
			">=": TokenKind.GtEq,
			"<=": TokenKind.LtEq,

			"(": TokenKind.LParen,
			")": TokenKind.RParen,
			"{": TokenKind.LCurly,
			"}": TokenKind.RCurly,
			"[": TokenKind.LBracket,
			"]": TokenKind.RBracket,
			".": TokenKind.Dot,
			",": TokenKind.Comma,
			"\n": TokenKind.NewLine,
		};

		const c = this.ch0;
		if (c === null) return null;

		let char: string | null = c;
		switch (c) {
			case '"':
			case "'": {
				return this.eatQuotedString();
			}
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

			case "!":
			case ">":
			case "<":
			case "=": {
				if (this.ch1 === "=") {
					let c = "";
					c += this.consume();
					c += this.consume();
					char = c;
				} else {
					char = this.consume();
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

		if (this.ch0 === "_") {
			throw new Error("Trailing _ are not allowed");
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

		const valInt = Number.parseInt(val, radix);

		if (Number.isNaN(valInt)) {
			throw new Error(`Invalid number: ${prefix + val} of radix ${radix}`);
		}

		return valInt;
	}
	private eatDecimalNumber(): number {
		let value = "";
		value += this.runRadix(10);

		let isFloat = false;

		if (
			(this.ch0 === "." && !this.isNameStart(this.ch1)) ||
			this.ch0 === "e" ||
			this.ch0 === "E"
		) {
			const dotOrE = this.consume();
			value += dotOrE; // . e or E

			if (dotOrE === ".") {
				const decimalPlaces = this.runRadix(10);
				value += decimalPlaces;

				const cur = this.ch0; // thanks typescript
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

		if (Number.isNaN(valueNumber)) {
			throw new Error("Invalid number");
		}

		return valueNumber;
	}

	private eatExponent(): string {
		let val = "";

		if (this.ch0 === "+" || this.ch0 === "-") {
			val += this.consume();
		}
		const expVal = this.runRadix(10);

		if (expVal === "") {
			throw new Error("EmptyExponent");
		}

		val += expVal;

		return val;
	}

	private eatDigit(radix: number) {
		if (this.ch0 && isDigitOfRadix(this.ch0, radix)) {
			return this.consume();
		}

		return null;
	}
	private runRadix(radix: number): string {
		let res = "";

		for (;;) {
			const digit = this.eatDigit(radix);

			if (digit) {
				res += digit;
				continue;
			}

			if (
				this.ch0 &&
				this.ch1 &&
				this.ch0 === "_" &&
				isDigitOfRadix(this.ch1, radix)
			) {
				this.consume();
			} else break;
		}
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

	private eatname(): Token {
		const start = this.start;
		let name = "";

		while (this.isNameContinuation()) {
			const c = this.consume();
			if (c !== null) name += c;
		}

		const end = this.end;
		const s = span(start, end);

		// TODO move to another fn
		switch (name) {
			case "true":
				return new Token(TokenKind.True, s, true);
			case "false":
				return new Token(TokenKind.False, s, false);
			default:
				return new Token(TokenKind.Name, s, name);
		}
	}

	private consume(): string | null {
		const cur = this.ch0;
		const iter_next = this.chars.next();
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

	const parsed = Number.parseInt(str, radix);

	return !Number.isNaN(parsed) && parsed.toString(radix) === str.toLowerCase();
}
