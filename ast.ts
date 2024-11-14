export interface SrcSpan {
	start: number;
	end: number;
}

export function span(start: number, end: number): SrcSpan {
	return {
		start,
		end,
	};
}

export enum BinaryOp {
	Plus,
	Minus,
	Mut,
	Div,
}

export enum UnaryOp {
	Negate,
	Not,
}

export class Formula {
	public items: Item[] = [];
}

export class Item {
	public span: SrcSpan = span(0, 0);
}

export class ItemIdentifier extends Item {}

export class Expr extends Item {}

export class ExprStmt extends Item {
	constructor(public expr: Expr) {
		super();
	}
}

export class BinaryExpr extends Expr {
	constructor(
		public left: Expr,
		public op: BinaryOp,
		public right: Expr,
	) {
		super();
	}
}

export class UnaryExpr extends Expr {
	constructor(
		public op: BinaryOp,
		public expr: Expr,
	) {
		super();
	}
}
