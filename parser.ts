import { dbgtoken, TokenKind, type Token } from "./token";
import { dbgAssert } from "./utils";
import {
	Expr,
	ExprAssign,
	ExprBinary,
	ExprLiteral,
	ExprNegateBool,
	ExprNegateNumber,
	Formula,
	getOpPrecedence,
	Ident,
	SrcSpan,
	tokenToBinaryOp,
} from "./ast";

export class ParseError extends Error {
	constructor(
		public location: SrcSpan,
		message?: string,
	) {
		super(message);
	}
}

export class EmptyAssignmentError extends ParseError {
	constructor(location: SrcSpan) {
		super(location, "Required an expression here");
	}
}

export class Parser {
	private tokens: IterableIterator<Token>;

	private t0: Token | null = null;
	private t1: Token | null = null;

	constructor(tokens: IterableIterator<Token>) {
		this.tokens = tokens;
		this.consume();
		this.consume();
	}
	/*
		let a = 10; 

	*/
	parse() {
		const formula = new Formula();
		formula.items = this.parseSeriesOf<Expr>(this.parseItems);
		return formula;
	}

	private parseItems = (): Expr | null => {
		if (this.t0 === null || this.t0.isEOS()) {
			this.consume();
			return null;
		}

		if (this.t0.kind === TokenKind.NewLine) {
			this.consume();
		}
		const token = this.t0;

		switch (token.kind) {
			case TokenKind.Name: {
				const name = this.consume() as Token<string>;
				if (this.t0?.kind === TokenKind.Eq) {
					const ident = new Ident(name.data);
					const eq = this.consume() as Token; // =S

					const value = this.parseExpr();

					if (value === null) {
						const { start, end } = eq.span;
						throw new EmptyAssignmentError(new SrcSpan(start, end));
					}
					return new ExprAssign(ident, value);
				}

				dbgAssert(name !== null, "required a name");

				break;
			}
			default:
				this.consume();
		}
		this.consume();

		return new Expr();
	};

	private getOpPrecedence(t: Token | null) {
		if (!t) return null;
		const kind = t.kind;
		const op = tokenToBinaryOp(kind);
		if (!op) return null;
		return getOpPrecedence(op);
	}

	public parseExpr(): Expr | null {
		const exprStack: Expr[] = [];
		const opStack: OpWithPrecedence[] = [];

		for (;;) {
			const exprUnit = this.parseExprUnit();

			if (exprUnit !== null) {
				exprStack.push(exprUnit);
			} else if (exprStack.length === 0) {
				return null;
			} else {
				throw new Error("Op naked right");
			}

			const mayBeOp = this.t0;
			const precedence = this.getOpPrecedence(mayBeOp);

			if (precedence !== null) {
				// an op
				this.consume(); // valid operator
				handleOp(
					{ token: mayBeOp as Token, precedence },
					opStack,
					exprStack,
					opExprReducer,
				);
			} else {
				break; // not an op
			}
		}

		const expr = handleOp(null, opStack, exprStack, opExprReducer);

		return expr;
	}
	private parseExprUnit(): Expr | null {
		const tok = this.t0;
		if (!tok) return null;

		switch (tok.kind) {
			case TokenKind.String:
			case TokenKind.Number:
			case TokenKind.True:
			case TokenKind.False:
				this.consume();
				return this.toLiteralExpr(tok);

			case TokenKind.Name: {
				// TODO check name patterns like name() or name.thing.thing
				const nameTok = this.consume() as Token<string>;
				return new Ident(nameTok.data);
			}

			case TokenKind.Bang: {
				const bang = this.consume() as Token;
				bang;

				const value = this.parseExprUnit();
				if (!value)
					// TODO Error
					throw new Error("negating_bool: expected an expression after !");
				return new ExprNegateBool(value);
			}

			case TokenKind.Minus: {
				const minus = this.consume();
				minus;
				const value = this.parseExprUnit();
				// TODO error
				if (!value) throw new Error("expected an expression after -");
				return new ExprNegateNumber(value);
			}

			// todo add support for list and []

			default:
				return null;
		}
	}

	// TODO move this from here
	private toLiteralExpr(token: Token): Expr {
		switch (token.kind) {
			case TokenKind.String:
				return new ExprLiteral({ type: "string", data: token.data as string });

			case TokenKind.Number:
				return new ExprLiteral({ type: "number", data: token.data as number });

			case TokenKind.True:
			case TokenKind.False:
				return new ExprLiteral({ type: "bool", data: token.data as boolean });

			default:
				throw new Error("expected string number or bool tokwens");
		}
	}

	private eatOne(kind: TokenKind) {
		if (this.t0?.kind === kind) {
			return this.consume();
		}

		return null;
	}

	private parseSeriesOf<T extends Expr = Expr>(
		parse: () => T | null,
		sep: TokenKind | null = null,
	): T[] {
		const res: T[] = [];

		if (!this.t0) return res;

		for (;;) {
			const thing = parse();
			if (thing === null) break;
			res.push(thing);

			if (sep !== null) {
				if (this.eatOne(sep) === null) {
					break;
				}
			}
		}

		// while (this.t0 !== null) {
		// 	if (this.t0.kind === sep) {
		// 		this.consume();
		// 		continue;
		// 	}

		// 	res.push(parse());
		// }

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

type OpWithPrecedence = { token: Token; precedence: number };

function handleOp(
	nxtOp: OpWithPrecedence | null,
	opStack: OpWithPrecedence[],
	exprStack: Expr[],
	reducer: (op: Token, exprStack: Expr[]) => void,
): Expr | null {
	let nextOp = nxtOp;

	for (;;) {
		const op = opStack.pop();
		if (!op && !nextOp) {
			// if we don't have any operators left return the final expr
			const expr = exprStack.pop();

			if (!expr) return null;

			if (exprStack.length === 0) return expr;

			throw new Error(
				"@@internal Expression not fully reduced for some reason",
			);
		}

		if (!op && nextOp) {
			opStack.push(nextOp);
			break;
		}

		if (op && !nextOp) {
			reducer(op.token, exprStack);
		} else if (op && nextOp) {
			const { token: opl, precedence: pl } = op;
			const { token: opr, precedence: pr } = nextOp;
			if (pl >= pr) {
				reducer(opl, exprStack);
				nextOp = { token: opr, precedence: pr };
			} else {
				opStack.push({ token: opl, precedence: pl });
				opStack.push({ token: opr, precedence: pr });
				break;
			}
		} else break;
	}
	return null;
}

function opExprReducer(opTok: Token, exprStack: Expr[]) {
	const right = exprStack.pop();
	const left = exprStack.pop();
	if (!left || !right)
		throw new Error(
			"@@internal Cant reduce expression. required minimum of 2 expr",
		);

	const op = tokenToBinaryOp(opTok.kind);
	if (op === null)
		throw new Error(`invalid binary op token ${dbgtoken(opTok)}`);

	const expr = new ExprBinary(left, op, right);
	exprStack.push(expr);
}
