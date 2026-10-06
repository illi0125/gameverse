import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { BatchController } from '../src/batch.controller';
import { BatchService } from '../src/batch.service';

describe('GameverseBatchController (e2e)', () => {
	let app: INestApplication;

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			controllers: [BatchController],
			providers: [
				{
					provide: BatchService,
					useValue: {
						getHello: () => 'Welcome to Gameverse Batch Server!',
						batchRolBack: jest.fn(),
						batchTopGames: jest.fn(),
						batchTopAgents: jest.fn(),
					},
				},
			],
		}).compile();

		app = moduleFixture.createNestApplication();
		await app.init();
	});

	it('/ (GET)', () => {
		return request(app.getHttpServer()).get('/').expect(200).expect('Welcome to Gameverse Batch Server!');
	});
});
