import { buildSchema, parse, validate } from 'graphql';
import { MAX_QUERY_DEPTH, MAX_ROOT_FIELDS, queryLimitsRule } from './query-limits';

const schema = buildSchema(`
	type Node { id: ID, child: Node, name: String }
	type Query { node: Node, login(nick: String): String }
`);
const errors = (query: string) => validate(schema, parse(query), [queryLimitsRule]).map((error) => error.message);
const nested = (levels: number) => `node { ${'child { '.repeat(levels - 2)}id${' }'.repeat(levels - 2)} }`;

describe('queryLimitsRule', () => {
	it('accepts the shape of the frontend operations (depth 4, one root field)', () => {
		expect(errors(`query GetX { ${nested(4)} }`)).toEqual([]);
		expect(errors(`query AtLimit { ${nested(MAX_QUERY_DEPTH)} }`)).toEqual([]);
	});

	it('rejects operations deeper than the limit, also through fragments', () => {
		expect(errors(`query Deep { ${nested(MAX_QUERY_DEPTH + 1)} }`)[0]).toMatch(/levels deep/);
		const viaFragment = `query F { node { ...A } } fragment A on Node { child { child { child { child { child { child { child { child { id } } } } } } } } }`;
		expect(errors(viaFragment)[0]).toMatch(/levels deep/);
	});

	it('rejects alias floods of top-level fields (e.g. many logins in one request)', () => {
		const aliases = Array.from({ length: MAX_ROOT_FIELDS + 1 }, (_, i) => `a${i}: login(nick: "x")`).join(' ');
		expect(errors(`mutation M { ${aliases} }`.replace('mutation', 'query'))[0]).toMatch(/top-level fields/);
		const allowed = Array.from({ length: MAX_ROOT_FIELDS }, (_, i) => `a${i}: login(nick: "x")`).join(' ');
		expect(errors(`query Ok { ${allowed} }`)).toEqual([]);
	});

	it('does not count introspection, so the dev Playground keeps working', () => {
		const typeRef =
			'kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } } }';
		expect(errors(`query I { __typename __schema { types { fields { type { ${typeRef} } } } } }`)).toEqual([]);
	});
});
