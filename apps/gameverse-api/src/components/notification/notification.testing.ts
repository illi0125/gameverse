/** Test double for NotificationService: records calls, never touches a database **/
export const notificationStub = () => ({
	notify: jest.fn().mockResolvedValue(null),
	notifyMany: jest.fn().mockResolvedValue([]),
	notifyFollowers: jest.fn().mockResolvedValue([]),
	notifyGameLikers: jest.fn().mockResolvedValue([]),
	notifyActiveMembers: jest.fn().mockResolvedValue([]),
	memberNick: jest.fn().mockResolvedValue('Actor'),
});
