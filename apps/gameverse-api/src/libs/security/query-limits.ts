import {
	ASTVisitor,
	FragmentDefinitionNode,
	GraphQLError,
	Kind,
	OperationDefinitionNode,
	SelectionSetNode,
	ValidationContext,
} from 'graphql';

/**
 * The frontend's deepest operation is 4 levels and none asks for more than 1 top-level field
 * (measured over apollo/** on 2026-10-11), so these limits leave room while stopping abusive queries.
 */
export const MAX_QUERY_DEPTH = 8;
export const MAX_ROOT_FIELDS = 5;

/** Introspection (__schema, __type, __typename) is exempt, so the dev Playground keeps working **/
const isIntrospection = (name: string) => name.startsWith('__');

const selectionDepth = (
	selectionSet: SelectionSetNode | undefined,
	fragments: Record<string, FragmentDefinitionNode>,
	visited: Set<string>,
): number => {
	if (!selectionSet) return 0;
	let max = 0;
	for (const selection of selectionSet.selections) {
		let depth = 0;
		if (selection.kind === Kind.FIELD) {
			if (isIntrospection(selection.name.value)) continue;
			depth = 1 + selectionDepth(selection.selectionSet, fragments, visited);
		} else if (selection.kind === Kind.INLINE_FRAGMENT) {
			depth = selectionDepth(selection.selectionSet, fragments, visited);
		} else if (selection.kind === Kind.FRAGMENT_SPREAD) {
			const name = selection.name.value;
			// A fragment cycle is already reported by GraphQL's own validation
			if (visited.has(name) || !fragments[name]) continue;
			depth = selectionDepth(fragments[name].selectionSet, fragments, new Set(visited).add(name));
		}
		max = Math.max(max, depth);
	}
	return max;
};

/** Rejects operations nested deeper than MAX_QUERY_DEPTH or with more than MAX_ROOT_FIELDS top-level fields (aliases count) **/
export const queryLimitsRule = (context: ValidationContext): ASTVisitor => {
	const fragments: Record<string, FragmentDefinitionNode> = {};
	for (const definition of context.getDocument().definitions) {
		if (definition.kind === Kind.FRAGMENT_DEFINITION) fragments[definition.name.value] = definition;
	}

	return {
		OperationDefinition(operation: OperationDefinitionNode) {
			const name = operation.name?.value ?? 'anonymous';
			const rootFields = operation.selectionSet.selections.filter(
				(selection) => !(selection.kind === Kind.FIELD && isIntrospection(selection.name.value)),
			).length;
			if (rootFields > MAX_ROOT_FIELDS) {
				context.reportError(
					new GraphQLError(`Operation "${name}" requests ${rootFields} top-level fields (max ${MAX_ROOT_FIELDS}).`),
				);
			}
			const depth = selectionDepth(operation.selectionSet, fragments, new Set());
			if (depth > MAX_QUERY_DEPTH) {
				context.reportError(new GraphQLError(`Operation "${name}" is ${depth} levels deep (max ${MAX_QUERY_DEPTH}).`));
			}
		},
	};
};
