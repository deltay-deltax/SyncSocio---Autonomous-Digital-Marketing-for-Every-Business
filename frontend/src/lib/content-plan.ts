import { format, addDays } from "date-fns";

export type ContentType = "reel" | "image" | "carousel";

export interface ContentDay {
  day: string;
  date: string;
  type: ContentType;
  topic: string;
  optimalTime: string;
  prompt: string;
}

export const WEEK_PLAN: ContentType[] = ["reel", "image", "carousel", "reel", "image", "carousel", "reel"];

const TOPICS = [
  "Behind the scenes of our process",
  "Top 5 tips for your brand",
  "Client success story spotlight",
  "Product deep dive: Key features",
  "Common mistakes to avoid",
  "Industry trends update",
  "Weekend motivation & vibes",
];

const PROMPTS = [
  "A high-energy reel showing the team in action with fast cuts and upbeat music.",
  "A clean, minimal product shot with soft lighting and natural shadows.",
  "A professional carousel showing step-by-step progress with clear headlines.",
  "An educational reel with text overlays explaining a complex concept simply.",
  "A lifestyle image of the product being used in an aspirational setting.",
  "A data-driven carousel with charts and icons explaining market value.",
  "A fun, relatable reel about the creative struggle and final win.",
];

export const buildWeek = (): ContentDay[] => {
  const start = new Date();
  return WEEK_PLAN.map((type, i) => {
    const d = addDays(start, i);
    return {
      day: format(d, "EEE").toUpperCase(),
      date: format(d, "MMM dd"),
      type,
      topic: TOPICS[i % TOPICS.length],
      optimalTime: i % 2 === 0 ? "8:00 PM" : "11:00 AM",
      prompt: PROMPTS[i % PROMPTS.length],
    };
  });
};
