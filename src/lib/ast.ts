import { TokenKind } from "./token";

export class SrcSpan {
	constructor(
		public readonly start: number,
		public readonly end: number,
	) {}

	clone() {
		return new SrcSpan(this.start, this.end);
	}

	srcText(src: string) {
		return src.slice(this.start, this.end);
	}

	merge(other: SrcSpan) {
		const start = Math.min(this.start, other.start);
		const end = Math.max(this.end, other.end);
		return new SrcSpan(start, end);
	}
}

export function span(start: number, end: number): SrcSpan {
	return new SrcSpan(start, end);
}

export enum BinaryOp {
	Eq = "==",
	NotEq = "!=",

	Add = "+",
	Mul = "*",
	Div = "/",
	Sub = "-",

	GtEq = ">=",
	LtEq = "<=",
	Gt = ">",
	Lt = "<",
}

export class Formula {
	public items: Expr[] = [];
}

export class Expr {
	// public span: SrcSpan = span(0, 0);
}

export class Ident extends Expr {
	constructor(public name: string) {
		super();
	}
}

export class ExprAssign extends Expr {
	constructor(
		public id: Ident,
		public value: Expr,
	) {
		super();
	}
}

export class ExprStmt extends Expr {
	constructor(public expr: Expr) {
		super();
	}
}

export class ExprBinary extends Expr {
	constructor(
		public left: Expr,
		public op: BinaryOp,
		public right: Expr,
	) {
		super();
	}
}

export class ExprNegateBool extends Expr {
	constructor(public expr: Expr) {
		super();
	}
}

export class ExprNegateNumber extends Expr {
	constructor(public expr: Expr) {
		super();
	}
}

type Literal =
	| {
			type: "string";
			data: string;
	  }
	| {
			type: "number";
			data: number;
	  }
	| {
			type: "bool";
			data: boolean;
	  };

export class ExprLiteral extends Expr {
	constructor(public item: Literal) {
		super();
	}
}

const tokenToBinaryOpMap = {
	[TokenKind.NotEq]: BinaryOp.NotEq,
	[TokenKind.EqEq]: BinaryOp.Eq,
	[TokenKind.Plus]: BinaryOp.Add,
	[TokenKind.Minus]: BinaryOp.Sub,
	[TokenKind.Star]: BinaryOp.Mul,
	[TokenKind.Slash]: BinaryOp.Div,
	[TokenKind.GtEq]: BinaryOp.GtEq,
	[TokenKind.LtEq]: BinaryOp.LtEq,
	[TokenKind.Gt]: BinaryOp.Gt,
	[TokenKind.Lt]: BinaryOp.Lt,
} as Record<TokenKind, BinaryOp>;

export function tokenToBinaryOp(kind: TokenKind): BinaryOp | null {
	return tokenToBinaryOpMap[kind] ?? null;
}

export function getOpPrecedence(op: BinaryOp): number {
	// bigger the number higher the precedence
	switch (op) {
		// case BinaryOp.Or:
		// 	return 1;

		// case BinaryOp.And:
		// 	return 2;

		case BinaryOp.Eq:
		case BinaryOp.NotEq:
			return 3;

		case BinaryOp.Lt:
		case BinaryOp.LtEq:
		case BinaryOp.Gt:
		case BinaryOp.GtEq:
			return 4;

		case BinaryOp.Add:
		case BinaryOp.Sub:
			return 5;

		case BinaryOp.Mul:
		case BinaryOp.Div:
			return 6;

		// case BinaryOp.Rem:
		// 	return 6;

		// case BinaryOp.Exp:
		// 	return 7;
	}
}
