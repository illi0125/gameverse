import { Logger } from '@nestjs/common';
import { OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'ws';
import * as WebSocket from 'ws';
import { AuthService } from '../components/auth/auth.service';
import * as url from 'url';
import { Member } from '../libs/dto/member/member';
import {
	acceptChatText,
	CHAT_MAX_FRAME_BYTES,
	ChatRateLimiter,
	chatLogText,
	verifySocketClient,
} from '../libs/security/chat-limits';

/** What chat clients see of a member: never phone, address, status or counters (chat reaches guests too) **/
export type ChatMember = Pick<Member, '_id' | 'memberNick' | 'memberImage'>;

export const toChatMember = (member?: Member | null): ChatMember | null =>
	member ? { _id: member._id, memberNick: member.memberNick, memberImage: member.memberImage } : null;

interface MessagePayload {
	event: string;
	text: string;
	memberData?: ChatMember | null;
}

/** Sent only to one member's own connections (never broadcast) **/
export interface MemberPayload {
	event: 'notification' | 'notificationCount';
	[key: string]: unknown;
}

interface InfoPayload {
	event: string;
	totalClients: number;
	memberData?: ChatMember | null;
	action: string;
}

/** Member ObjectId (or string id) → index key **/
const memberKey = (member: Member): string => (member._id as unknown as { toString(): string }).toString();

// Passed to the ws server: frame size cap and the same allowed origins as CORS
@WebSocketGateway({
	transports: ['websocket'],
	secure: false,
	maxPayload: CHAT_MAX_FRAME_BYTES,
	verifyClient: verifySocketClient,
})
export class SocketGateway implements OnGatewayInit {
	private logger: Logger = new Logger('SocketEventsGateway');
	private summaryClient: number = 0;
	private clientsAuthMap = new Map<WebSocket, Member | null>();
	/** memberId → that member's open connections (tabs); guests are not indexed **/
	private memberClients = new Map<string, Set<WebSocket>>();
	private messagesList: MessagePayload[] = [];
	private chatLimiter = new ChatRateLimiter<WebSocket>();

	constructor(private authService: AuthService) {}

	@WebSocketServer()
	server: Server;

	public afterInit(server: Server) {
		this.logger.verbose(`WebSocket Server Initialized & total [${this.summaryClient}]`);
	}

	private async retrieveAuth(req: any): Promise<Member | null> {
		try {
			const parseUrl = url.parse(req.url, true);
			const { token } = parseUrl.query;
			return await this.authService.verifyToken(token as string);
		} catch (err) {
			return null;
		}
	}

	public async handleConnection(client: WebSocket, req: any) {
		const authMember = await this.retrieveAuth(req);
		this.summaryClient++;
		// Closed while the token was being checked: its disconnect already ran, so it must not be registered
		if (client.readyState !== WebSocket.OPEN) return;
		this.clientsAuthMap.set(client, authMember);
		if (authMember?._id) {
			const key = memberKey(authMember);
			const clients = this.memberClients.get(key) ?? new Set<WebSocket>();
			clients.add(client);
			this.memberClients.set(key, clients);
		}

		const clientNick: string = authMember?.memberNick ?? 'Guest';
		this.logger.verbose(`Connection  [${clientNick}] & total [${this.summaryClient}]`);

		const infoMsg: InfoPayload = {
			event: 'info',
			totalClients: this.summaryClient,
			memberData: toChatMember(authMember),
			action: 'joined',
		};
		this.emitMessage(infoMsg);
		client.send(JSON.stringify({ event: 'getMessages', list: this.messagesList }));
	}

	public handleDisconnect(client: WebSocket) {
		const authMember = this.clientsAuthMap.get(client);
		this.summaryClient--;
		this.clientsAuthMap.delete(client);
		this.chatLimiter.forget(client);
		if (authMember?._id) {
			const key = memberKey(authMember);
			const clients = this.memberClients.get(key);
			clients?.delete(client);
			if (clients && !clients.size) this.memberClients.delete(key);
		}

		const clientNick: string = authMember?.memberNick ?? 'Guest';
		this.logger.verbose(`Disconnection [${clientNick}]  & total [${this.summaryClient}]`);

		const infoMsg: InfoPayload = {
			event: 'info',
			totalClients: this.summaryClient,
			memberData: toChatMember(authMember),
			action: 'left',
		};
		// client - disconnection
		this.broadcastMessage(client, infoMsg);
		this.emitMessage(infoMsg);
	}

	@SubscribeMessage('message')
	public async handleMessage(client: WebSocket, payload: string): Promise<void> {
		const authMember = this.clientsAuthMap.get(client);
		const clientNick: string = authMember?.memberNick ?? 'Guest';
		// Not a string, empty or over 500 characters, or more than 5 messages in 5 s: dropped
		const text = acceptChatText(payload);
		if (text === null || !this.chatLimiter.allow(client)) {
			this.logger.verbose(`DROPPED MESSAGE: [${clientNick}]`);
			return;
		}
		const newMessage: MessagePayload = { event: 'message', text, memberData: toChatMember(authMember) };

		this.logger.verbose(`NEW MESSAGE:   [${clientNick}]  ${chatLogText(text)}`);

		this.messagesList.push(newMessage);
		if (this.messagesList.length > 5) this.messagesList.splice(0, this.messagesList.length - 5);

		this.emitMessage(newMessage);
	}
	/** NOTIFICATIONS — targeted delivery to one member's open connections **/

	public isMemberOnline(memberId: unknown): boolean {
		return Boolean(this.memberClients.get(String(memberId))?.size);
	}

	public onlineMembers(memberIds: unknown[]): string[] {
		return [...new Set(memberIds.map(String))].filter((key) => this.memberClients.get(key)?.size);
	}

	/** Returns how many connections received it; offline members simply get nothing (notifications are stored) **/
	public notifyMember(memberId: unknown, payload: MemberPayload): number {
		const clients = this.memberClients.get(String(memberId));
		if (!clients?.size) return 0;
		const message = JSON.stringify(payload);
		let delivered = 0;
		clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(message);
				delivered++;
			}
		});
		return delivered;
	}

	private broadcastMessage(sender: WebSocket, message: InfoPayload | MessagePayload) {
		this.server.clients.forEach((client) => {
			if (client !== sender && client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		});
	}

	/* message target:
   1.client(only client)
   2.Broadcast (except client)
   3.Emit(all clients)
*/

	private emitMessage(message: InfoPayload | MessagePayload) {
		this.server.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		});
	}
}
