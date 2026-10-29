/**
 * PopMatch Terms of Use.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ DRAFT FOR REVIEW. NOT LEGAL ADVICE. Written to cover App Store       │
 * │ guideline 1.2 (users agree to terms with zero tolerance for          │
 * │ objectionable content and abusive users) and the basics a housing    │
 * │ app needs. Have it reviewed before relying on it. While              │
 * │ TERMS_IS_DRAFT is true, the screen says it's a draft.                │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Changing the wording: bump TERMS_VERSION, and every student is asked to
 * agree again the next time they open the app.
 */

export const TERMS_VERSION = "2026-10-29";
export const TERMS_IS_DRAFT = true;

export interface TermsSection {
  title: string;
  paragraphs: string[];
}

export function termsSections(contact: string): TermsSection[] {
  const reachUs = contact ? `email ${contact}` : "use Profile → Contact us";
  return [
    {
      title: "Who can use PopMatch",
      paragraphs: [
        "PopMatch is for current students of the University of Illinois Urbana-Champaign with a valid @illinois.edu account. One account per person, in your own name, with information that's true.",
      ],
    },
    {
      title: "Zero tolerance for objectionable content and abusive users",
      paragraphs: [
        "There is no tolerance on PopMatch for objectionable content or abusive behavior. You agree not to post, send or share:",
        "• harassment, bullying, threats or encouragement of self-harm\n• hate speech, slurs, or attacks on anyone for their race, ethnicity, religion, gender, sexual orientation, disability or national origin\n• sexual content or solicitation\n• scams or fraud, including asking for money or a deposit before someone has seen a place or signed a lease\n• pretending to be someone else\n• spam, or anything illegal",
        "Housing posts must follow fair housing law. Listings for a shared home may state roommate preferences where the law allows it.",
        "If you break these rules, we remove the content and may suspend or permanently ban your account, without warning.",
      ],
    },
    {
      title: "Reporting and blocking",
      paragraphs: [
        "Every profile, listing, Crash & Cash post and conversation has a ⋯ menu where you can report it or block the person. Reports are private; the person isn't told who reported them. We review every report within 24 hours.",
        "Blocking someone hides you from each other everywhere on PopMatch and stops messages between you. You can unblock them from your Profile.",
      ],
    },
    {
      title: "Housing arrangements are between you",
      paragraphs: [
        "PopMatch helps students find each other. It isn't a landlord, agent or party to any lease, sublease or stay, and it doesn't check listings, landlords or the people you meet.",
        "Never send money before you've seen the place and have the agreement in writing. Check that your lease allows subletting. Meet in public first when you can.",
      ],
    },
    {
      title: "What you post",
      paragraphs: [
        "You're responsible for what you post and send. You keep ownership of it, and you let PopMatch show it to other students in the app. We may remove anything that breaks these terms.",
      ],
    },
    {
      title: "Your account",
      paragraphs: [
        "You can delete your account at any time from Profile → Delete Account. That permanently deletes your profile, photos, listings, posts, likes, matches and messages. If your account was banned, we keep a record of your email so the ban stays in place.",
      ],
    },
    {
      title: "Changes",
      paragraphs: [
        "If these terms change, we'll ask you to agree to the new version before you keep using PopMatch.",
      ],
    },
    {
      title: "Contact",
      paragraphs: [`Questions, or something we should know about? ${reachUs.charAt(0).toUpperCase()}${reachUs.slice(1)}.`],
    },
  ];
}
