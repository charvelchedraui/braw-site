// Shapes shared by the page components, the server render (entry-server.tsx) and build.mjs.

export interface Card { ico: string; title: string; text: string }
export interface Step { title: string; text: string }
export interface Check { b: string; text: string }
export interface Faq { q: string; a: string }

/** One strings/<code>.json file. en.json is the reference shape; build.mjs checks every file against it. */
export interface Strings {
  title: string;
  description: string;
  ogDescription: string;
  twitterDescription: string;
  ogImageAlt: string;
  skip: string;
  homeLabel: string;
  langLabel: string;
  tagline1: string;
  tagline2: string;
  heroText: string;
  storeLabel: string;
  badgeAlt: string;
  note: string;
  roomAlt: string;
  shotAlt: string;
  whatTitle: string;
  whatLead: string;
  cards: Card[];
  petAlt: string;
  petCaption: string;
  moodTitle: string;
  moods: string[];
  worldAlt: string;
  worldCaption: string;
  howTitle: string;
  howLead: string;
  steps: Step[];
  safetyTitle: string;
  safetyLead: string;
  checks: Check[];
  faqTitle: string;
  faq: Faq[];
  endTitle: string;
  dockText: string;
  footNavLabel: string;
  footPrivacy: string;
  footTerms: string;
  footSupport: string;
  footDelete: string;
  footTagline: string;
  footCredits: string;
  ids?: Partial<Record<'what' | 'how' | 'safety' | 'faq', string>>;
  legalHash?: string;
}

export interface Language { code: string; name: string; hreflang: string; og: string; dir?: 'rtl' }

/** Everything one page needs. build.mjs writes it into the page as JSON so the client hydrates the same markup. */
export interface PageData {
  lang: Language;
  languages: Language[];
  s: Strings;
  /** Localized official App Store badge (Apple marketing tools), unmodified. */
  badge: { src: string; w: number; h: number };
  /** Folder of real app screens for this language (en, es or ar; others use en). */
  shots: string;
  /** Mixkit contributors, for the footer credit line. */
  credits: string[];
}
