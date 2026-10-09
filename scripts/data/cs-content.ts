/** Public CS content that was hardcoded in the frontend (libs/components/cs/Faq.tsx, Notice.tsx) until 2026-10-09 **/

export interface SeedNotice {
	title: string;
	content: string;
	date: string; // ISO date of the original notice
	event?: boolean; // highlighted on the public list
}

export interface SeedFaq {
	topic: 'GAMES' | 'PAYMENT' | 'PLAYERS' | 'DEVELOPERS' | 'MEMBERSHIP' | 'COMMUNITY' | 'OTHER';
	title: string;
	content: string;
}

export const seedNotices: SeedNotice[] = [
	{ title: 'Register to use and get discounts', content: 'Register to use and get discounts', date: '2024-03-01', event: true },
	{ title: 'Developers can list games for free', content: 'Developers can list games for free', date: '2024-03-31' },
];

export const seedFaqs: SeedFaq[] = [
	{ topic: 'GAMES', title: "What kinds of games are listed on Gameverse?", content: "Gameverse lists PC, PlayStation, Xbox, Nintendo and mobile games across genres such as action, RPG, strategy, sports, racing, shooter, simulation, puzzle and horror." },
	{ topic: 'GAMES', title: "How do I find a specific game?", content: "Use the search bar on the Games page to search by title, developer or publisher, then narrow results by platform, genre, game mode, pricing type, release year and price." },
	{ topic: 'GAMES', title: "What does \"Upcoming\" mean?", content: "Upcoming games are announced but not yet released. Their pages show the planned release date, and they move to Active once the publisher releases them." },
	{ topic: 'GAMES', title: "What is the difference between Free, Paid and Premium?", content: "Free games cost nothing. Paid and Premium games have a listed price; a discounted price is shown when the developer has set one." },
	{ topic: 'GAMES', title: "How are Trending, Popular and Top games chosen?", content: "Trending is based on likes, Popular on views, and Top on a ranking that combines views, likes and reviews." },
	{ topic: 'GAMES', title: "Can I see system requirements before choosing a game?", content: "Yes. When the developer provides them, each game page lists minimum and recommended requirements per platform." },
	{ topic: 'PAYMENT', title: "Can I buy games directly on Gameverse?", content: "Not yet. Gameverse currently works as a catalog. Checkout and payments are planned for a future release." },
	{ topic: 'PAYMENT', title: "Why is the price different from the original price?", content: "When a discount is active, the discounted price is shown and the original price is crossed out." },
	{ topic: 'PAYMENT', title: "Are prices shown in a specific currency?", content: "Prices are shown in US dollars." },
	{ topic: 'PAYMENT', title: "Will I be charged for creating an account?", content: "No. Creating an account and using the catalog is free." },
	{ topic: 'PLAYERS', title: "How do I save games I am interested in?", content: "Click the heart icon on any game. Liked games appear under My Favorites on your My Page." },
	{ topic: 'PLAYERS', title: "Where can I see games I viewed recently?", content: "Open My Page and choose Recently Visited." },
	{ topic: 'PLAYERS', title: "Can I leave comments on games?", content: "Yes. Log in and use the comment box at the bottom of any game page." },
	{ topic: 'PLAYERS', title: "Can I follow developers?", content: "Yes. Open a developer or member profile and press Follow to keep up with their activity." },
	{ topic: 'DEVELOPERS', title: "Who are developers on Gameverse?", content: "Developers are members who list and manage games in the catalog." },
	{ topic: 'DEVELOPERS', title: "How do I add a new game?", content: "Log in with a developer account, open My Page and choose Add Game. Fill in the details, select platforms, genres and modes, and upload images." },
	{ topic: 'DEVELOPERS', title: "What pricing rules apply to my listing?", content: "Free games must have a price and discount of zero. Paid and Premium games need a positive price, and any discount must be lower than the price." },
	{ topic: 'DEVELOPERS', title: "Can I change a game from Upcoming to Active?", content: "Yes. In My Games, click the status badge and choose the new status, or edit the game." },
	{ topic: 'DEVELOPERS', title: "What happens when I delete a game?", content: "The game is removed from the public catalog and your listing count. Administrators can restore it if needed." },
	{ topic: 'DEVELOPERS', title: "Can I change the game URL?", content: "No. Each game gets a permanent URL when it is created, so links keep working even if you rename the game." },
	{ topic: 'MEMBERSHIP', title: "How do I create an account?", content: "Click Login / Register in the top bar and choose to sign up." },
	{ topic: 'MEMBERSHIP', title: "How do I update my profile?", content: "Open My Page and choose My Profile to change your nickname, phone, address or profile image." },
	{ topic: 'MEMBERSHIP', title: "What should I do if I forget my password?", content: "Please contact support through the CS page and we will help you recover access." },
	{ topic: 'COMMUNITY', title: "What can I post in the community?", content: "You can write articles in the free board, recommendations, news and humor categories." },
	{ topic: 'COMMUNITY', title: "Are there community rules?", content: "Be respectful, stay on topic and do not share spam or harmful content. Posts that break the rules may be removed." },
	{ topic: 'COMMUNITY', title: "How do I report inappropriate content?", content: "Contact support through the CS page with a link to the content." },
	{ topic: 'OTHER', title: "How can I contact support?", content: "Use the Inquiry section on the CS page." },
	{ topic: 'OTHER', title: "Which languages does Gameverse support?", content: "English, Korean and Russian. Use the language selector in the top bar." },
	{ topic: 'OTHER', title: "Can I request a new feature?", content: "We welcome suggestions through the Inquiry section, although we cannot promise every request will be implemented." },
];
