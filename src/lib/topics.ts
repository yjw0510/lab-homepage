import { topics } from "../../data/topics";
import type { ResearchTopic } from "@/types/topic";
import type { Publication } from "@/types/publication";

export function getAllTopics(): ResearchTopic[] {
  return topics;
}

export function getTopicById(id: string): ResearchTopic | undefined {
  return topics.find((t) => t.id === id);
}

export function getPublicationsForTopic(
  topic: ResearchTopic,
  pubs: Publication[],
  allTopics: ResearchTopic[] = topics,
): Publication[] {
  if (topic.kind === "future") return [];

  if (topic.kind === "misc") {
    // Misc collects papers not claimed by any "research" topic
    const researchTopics = allTopics.filter(
      (t) => !t.kind || t.kind === "research",
    );
    const claimed = new Set<string>();
    for (const rt of researchTopics) {
      const tagSet = new Set(rt.tags);
      for (const p of pubs) {
        if (p.tags.some((t) => tagSet.has(t))) claimed.add(p.slug);
      }
    }
    return pubs.filter((p) => !claimed.has(p.slug));
  }

  const tagSet = new Set(topic.tags);
  return pubs.filter((p) => p.tags.some((t) => tagSet.has(t)));
}

export function getTopicsForPublication(
  pub: Publication,
  allTopics: ResearchTopic[] = topics,
): ResearchTopic[] {
  const matched = allTopics.filter(
    (topic) =>
      (!topic.kind || topic.kind === "research") &&
      topic.tags.some((t) => pub.tags.includes(t)),
  );

  if (matched.length === 0) {
    const misc = allTopics.find((t) => t.kind === "misc");
    if (misc) return [misc];
  }

  return matched;
}

export function getTopicPaperCounts(
  allTopics: ResearchTopic[],
  pubs: Publication[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const topic of allTopics) {
    counts[topic.id] = getPublicationsForTopic(topic, pubs, allTopics).length;
  }
  return counts;
}
