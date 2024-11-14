export * from "./parser";
export * from "./lexer";
export * from "./ast";

import { Lexer } from "./lexer";
import { Parser } from "./parser";

export function createParser(src: string) {
	const normSrc = src.replaceAll(/\r\n/g, "\n");
	const iter = normSrc.split("").values();

	const lexer = new Lexer(iter);
	const parser = new Parser(lexer);
	return parser;
}
