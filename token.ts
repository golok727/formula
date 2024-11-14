import type { SrcSpan } from "./ast";

function escapeForDebug(input: string): string {
	const escapeMap: Record<string, string> = {
		"\\": "\\\\",
		"\n": "\\n",
		"\r": "\\r",
		"\t": "\\t",
		"\f": "\\f",
		"\b": "\\b",
		'"': '\\"',
		"'": "\\'",
	};

	return input.replace(/[\n\r\t\f\b\\'"]/g, (ch) => escapeMap[ch] || ch) ?? "";
}

export function dbgtoken(token: Token | null) {
	if (!token) return "Null";

	switch (token.kind) {
		case TokenKind.Name:
			return `${token.data}`;
		case TokenKind.Number:
			return `${token.data}`;
		case TokenKind.String:
			return `\"${escapeForDebug(token.data)}\"`;
	}

	const map = {
		[TokenKind.LBracket]: "[",
		[TokenKind.RBracket]: "]",
		[TokenKind.LParen]: "(",
		[TokenKind.RParen]: ")",
		[TokenKind.LCurly]: "{",
		[TokenKind.RCurly]: "}",

		[TokenKind.True]: "true",
		[TokenKind.False]: "false",

		[TokenKind.Plus]: "+",
		[TokenKind.Minus]: "-",
		[TokenKind.Star]: "*",
		[TokenKind.Slash]: "/",
		[TokenKind.Dot]: ".",
		[TokenKind.Comma]: ",",

		[TokenKind.Bang]: "!",
		[TokenKind.Eq]: "=",
		[TokenKind.Gt]: ">",
		[TokenKind.Lt]: "<",

		[TokenKind.NotEq]: "!=",
		[TokenKind.EqEq]: "==",
		[TokenKind.GtEq]: ">=",
		[TokenKind.LtEq]: "<=",

		[TokenKind.EOS]: "EndOfFile",
		[TokenKind.NewLine]: "\n",
	} as Record<TokenKind, string>;

	return `${map[token.kind]}`;
}

// biome-ignore lint/style/useEnumInitializers: <explanation>
export enum TokenKind {
	Name = 1,
	Number,
	String,

	LBracket,
	RBracket,
	LCurly,
	RCurly,
	LParen,
	RParen,

	True,
	False,

	Bang,
	NotEq,

	Eq,
	Gt,
	Lt,
	EqEq,
	GtEq,
	LtEq,

	Plus,
	Minus,
	Star,
	Slash,
	Dot,
	Comma,

	NewLine,
	EOS,
}

export type StringTokenData = string;
export type NumberTokenData = string;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
