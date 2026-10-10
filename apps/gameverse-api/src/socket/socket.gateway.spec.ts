/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import * as WebSocket from 'ws';
import { SocketGateway } from './socket.gateway';

const client = () => ({ readyState: WebSocket.OPEN, send: jest.fn() }) as any;
const member = (key: string) => ({ _id: key, memberNick: key }) as any;

/** A gateway whose token check returns the member named in the URL (?token=<memberId>), or a guest **/
const setup = () => {
	const authService = {
		verifyToken: jest.fn((token: string) => (token ? Promise.resolve(member(token)) : Promise.reject(new Error('no')))),
	};
	const gateway = new SocketGateway(authService as any);
	const all: any[] = [];
	gateway.server = { clients: { forEach: (fn: (c: any) => void) => all.forEach(fn) } } as any;
	const connect = async (token = '') => {
		const socket = client();
		all.push(socket);
		await gateway.handleConnection(socket, { url: `/?token=${token}` });
		socket.send.mockClear();
		return socket;
	};
	const disconnect = (socket: any) => {
		all.splice(all.indexOf(socket), 1);
		gateway.handleDisconnect(socket);
	};
	/** Joining broadcasts a chat "info" event to everyone already connected; start assertions from a clean slate **/
	const clearSent = () => all.forEach((socket) => socket.send.mockClear());
	return { gateway, connect, disconnect, clearSent };
};

const sentEvents = (socket: any) => socket.send.mock.calls.map((call: any[]) => JSON.parse(call[0]).event);

describe('SocketGateway notification delivery', () => {
	it('delivers only to every open tab of that member — never to other members or guests', async () => {
		const { gateway, connect, clearSent } = setup();
		const tab1 = await connect('a');
		const tab2 = await connect('a');
		const other = await connect('b');
		const guest = await connect();
		clearSent();

		const delivered = gateway.notifyMember('a', { event: 'notificationCount', unread: 2 });

		expect(delivered).toBe(2);
		expect(sentEvents(tab1)).toEqual(['notificationCount']);
		expect(sentEvents(tab2)).toEqual(['notificationCount']);
		expect(other.send).not.toHaveBeenCalled();
		expect(guest.send).not.toHaveBeenCalled();
	});

	it('forgets closed connections and reports who is online', async () => {
		const { gateway, connect, disconnect } = setup();
		const tab1 = await connect('a');
		const tab2 = await connect('a');

		disconnect(tab1);
		expect(gateway.isMemberOnline('a')).toBe(true);
		expect(gateway.notifyMember('a', { event: 'notificationCount', unread: 0 })).toBe(1);

		disconnect(tab2);
		expect(gateway.isMemberOnline('a')).toBe(false);
		expect(gateway.notifyMember('a', { event: 'notificationCount', unread: 0 })).toBe(0);
		expect(gateway.onlineMembers(['a', 'b'])).toEqual([]);
	});

	it('skips connections that are not open', async () => {
		const { gateway, connect } = setup();
		const tab = await connect('a');
		tab.readyState = WebSocket.CLOSING;

		expect(gateway.notifyMember('a', { event: 'notificationCount', unread: 1 })).toBe(0);
		expect(tab.send).not.toHaveBeenCalled();
	});

	it('does not register a connection that closed while its token was being checked', async () => {
		const { gateway } = setup();
		const socket = client();
		let finishAuth: (member: any) => void = () => undefined;
		(gateway as any).authService.verifyToken = () => new Promise((resolve) => (finishAuth = resolve));

		const connecting = gateway.handleConnection(socket, { url: '/?token=a' });
		socket.readyState = WebSocket.CLOSED;
		gateway.handleDisconnect(socket);
		finishAuth(member('a'));
		await connecting;

		expect(gateway.isMemberOnline('a')).toBe(false);
		expect(gateway.notifyMember('a', { event: 'notificationCount', unread: 1 })).toBe(0);
		expect(socket.send).not.toHaveBeenCalled();
	});

	it('leaves chat as it was: messages still go to everyone, guests included', async () => {
		const { gateway, connect, clearSent } = setup();
		const a = await connect('a');
		const guest = await connect();
		clearSent();

		await gateway.handleMessage(a, 'hello');

		expect(sentEvents(a)).toEqual(['message']);
		expect(sentEvents(guest)).toEqual(['message']);
		expect(JSON.parse(guest.send.mock.calls[0][0]).text).toBe('hello');
	});
});
