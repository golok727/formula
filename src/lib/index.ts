export * from "./parser";
export * from "./lexer";
export * from "./ast";
export * from "./token";

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { dbgtoken } from "./token";

function rebuildSourceFromLexer(lexer: Lexer) {
	return [...lexer]
		.map((item) => dbgtoken(item))
		.reduce(
			({ res, prev }, item, i) => {
				const str = i === 0 || prev === "\n" ? item : ` ${item}`;
				return { res: res + str, prev: item };
			},
			{ res: "", prev: "" },
		).res;
}
export function createParser(src: string) {
	const normSrc = src.replaceAll(/\r\n/g, "\n");

	{
		const testLex = new Lexer(normSrc.split("").values());
		console.log("-----------------------");
		console.log(rebuildSourceFromLexer(testLex));
		console.log("-----------------------");
	}

	const iter = normSrc.split("").values();
	const lexer = new Lexer(iter);
	const parser = new Parser(lexer);
	return parser;
}
