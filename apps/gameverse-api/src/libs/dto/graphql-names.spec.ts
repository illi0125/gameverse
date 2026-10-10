import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/** Nest code-first names GraphQL types after their class, so two DTO classes with one name stop the API from starting **/
const dtoFiles = (dir: string): string[] =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return dtoFiles(path);
		return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : [];
	});

describe('GraphQL DTO names', () => {
	it('are unique across all DTO files', () => {
		const owners = new Map<string, string[]>();
		for (const file of dtoFiles(__dirname)) {
			for (const match of readFileSync(file, 'utf8').matchAll(
				/@(?:InputType|ObjectType)\(\)\s*(?:export\s+)?class\s+(\w+)/g,
			)) {
				owners.set(match[1], [...(owners.get(match[1]) ?? []), file.replace(__dirname, '')]);
			}
		}
		const duplicates = [...owners].filter(([, files]) => files.length > 1);
		expect(duplicates).toEqual([]);
	});
});
