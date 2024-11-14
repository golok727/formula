import { describe, expect, test } from "bun:test";
import { createParser, dbgtoken, Lexer, TokenKind } from "./index";

describe("lexer", () => {
	test("simple formula", () => {
		const src = `
		 a = "hello\\n\\t \\" world" + 1e10
		`.trim();

		const parser = createParser(src);
		const formula = parser.parse();
		console.log(formula.items[0]);

		expect(1).toBe(1);
	});

	test("should parse numbers ", () => {
		const code = `
			1e12, 1_000_000_000_000, 1e110, 1.112e100, 1e-100, 1e-100, 10000000000, 1e-100,
			1e100, 1, 1e-100, 0, 0, 0, 0, 10000000000, 2500, 314, 10, -20, 20, -30, +40, 1.1e-100, 1.1e+100
      `.trim();

		const expected = [
			1e12, 1000000000000, 1e110, 1.112e100, 1e-100, 1e-100, 10000000000,
			1e-100, 1e100, 1, 1e-100, 0, 0, 0, 0, 10000000000, 2500, 314, 10, 20, 20,
			30, 40, 1.1e-100, 1.1e100,
		];

		const chars = code.replaceAll(/\r\n/g, "\n").split("");

		const testLex = Lexer.filterMap(
			chars.values(),
			(t) => t.kind === TokenKind.Number,
			(t) => t.data as number,
		);

		const actual = [...testLex];

		expect(actual).toEqual(expected);
	});
});
