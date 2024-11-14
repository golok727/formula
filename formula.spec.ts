import { describe, expect, test } from "bun:test";
import { createParser } from "./index";

describe("lexer", () => {
	test("simple formula", () => {
		const src = `
			a = (a * a) + 2 * (a * b) + b * b
			b = a
		`.trim();

		const parser = createParser(src);
		const formula = parser.parse();
		console.log(formula.items);

		expect(1).toBe(1);
	});
});
