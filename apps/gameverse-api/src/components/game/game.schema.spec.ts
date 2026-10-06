import { Test } from '@nestjs/testing';
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';
import { printSchema } from 'graphql';
import { GameResolver } from './game.resolver';

describe('Game GraphQL contract', () => {
	it('exposes Game operations and no Property contract', async () => {
		const moduleRef = await Test.createTestingModule({ imports: [GraphQLSchemaBuilderModule] }).compile();
		const schemaFactory = moduleRef.get(GraphQLSchemaFactory);
		const schema = await schemaFactory.create([GameResolver]);
		const schemaText = printSchema(schema);

		expect(schemaText).toContain('type Game');
		expect(schemaText).toContain('createGame(input: GameInput!)');
		expect(schemaText).toContain('getGame(gameId: String!)');
		expect(schemaText).toContain('getFavorites(input: OrdinaryInquiry!): Games!');
		expect(schemaText).not.toContain('Property');
	});
});
