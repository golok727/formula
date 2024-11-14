import { describe, expect, test } from "bun:test";
import { createParser } from "./index";

describe("lexer", () => {
	test("simple formula", () => {
		const src = `
		 a = "hello\\n\\t \\" world" + 10
		`.trim();

		const parser = createParser(src);
		const formula = parser.parse();
		console.log(formula.items[0]);

		expect(1).toBe(1);
	});
});
