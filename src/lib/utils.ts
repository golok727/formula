const __DEV__ = true;

export function dbgAssert(cond: boolean, message?: string): asserts cond {
	if (__DEV__ && !cond) throw new Error(`Debug Assertion Failed: ${message}`);
}
