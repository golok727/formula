import { describe, test, expect } from "bun:test";
import { dbgtoken, Lexer, Parser } from "./index";

describe("lexer", () => {
	test("simple formula", () => {
		let src = `
			a = (a * a) + 2 * (a * b) + b * b
			b = a
		`.trim();

		const lexer = new Lexer(src);
		const res = [...lexer];
		console.log(res);
		console.log(res.map(dbgtoken).join(" "));

		const parser = new Parser(src);
		console.log(parser.parse().items);
	});
});
