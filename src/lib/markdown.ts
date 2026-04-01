import React from "react";
import { wrapKoreanTerms } from "./terminology";

export interface MarkdownSection {
  title: string;
  body: string;
}

/**
 * Parse markdown content into sections split by ## headings.
 */
export function parseMarkdownSections(content: string): MarkdownSection[] {
  if (!content) return [];

  const lines = content.split("\n");
  const sections: MarkdownSection[] = [];
  let currentTitle = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^## (.+)$/);
    if (headingMatch) {
      if (currentTitle) {
        sections.push({
          title: currentTitle,
          body: currentBody.join("\n").trim(),
        });
      }
      currentTitle = headingMatch[1];
      currentBody = [];
    } else if (currentTitle) {
      currentBody.push(line);
    }
  }

  if (currentTitle) {
    sections.push({
      title: currentTitle,
      body: currentBody.join("\n").trim(),
    });
  }

  return sections;
}

/**
 * Extract a specific section's body by heading name.
 */
export function extractSection(
  content: string,
  heading: string
): string | null {
  const sections = parseMarkdownSections(content);
  const section = sections.find(
    (s) => s.title.toLowerCase() === heading.toLowerCase()
  );
  return section?.body ?? null;
}

/**
 * Render inline markdown formatting to React elements.
 * Handles: **bold**, *italic*, [links](url), inline `code`.
 * When lang is "ko", plain-text segments are post-processed to annotate
 * the first occurrence of each term in usedTerms with <ruby> elements.
 */
export function renderInlineMarkdown(
  text: string,
  key?: string | number,
  lang?: string,
  usedTerms?: Set<string>,
): React.ReactNode {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let partKey = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/);

    if (boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(
        React.createElement(
          "strong",
          { key: `${key}-b-${partKey++}`, className: "text-foreground" },
          boldMatch[2]
        )
      );
      remaining = boldMatch[3];
      continue;
    }

    // Italic: *text*
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)/);

    if (italicMatch) {
      if (italicMatch[1]) parts.push(italicMatch[1]);
      parts.push(
        React.createElement(
          "em",
          { key: `${key}-i-${partKey++}` },
          italicMatch[2]
        )
      );
      remaining = italicMatch[3];
      continue;
    }

    // Link: [text](url)
    const linkMatch = remaining.match(/^(.*?)\[(.+?)\]\((.+?)\)(.*)/);

    if (linkMatch) {
      if (linkMatch[1]) parts.push(linkMatch[1]);
      parts.push(
        React.createElement(
          "a",
          {
            key: `${key}-a-${partKey++}`,
            href: linkMatch[3],
            className: "text-primary hover:text-primary-light transition-colors",
            target: linkMatch[3].startsWith("http") ? "_blank" : undefined,
            rel: linkMatch[3].startsWith("http")
              ? "noopener noreferrer"
              : undefined,
          },
          linkMatch[2]
        )
      );
      remaining = linkMatch[4];
      continue;
    }

    // Inline code: `code`
    const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)/);

    if (codeMatch) {
      if (codeMatch[1]) parts.push(codeMatch[1]);
      parts.push(
        React.createElement(
          "code",
          {
            key: `${key}-c-${partKey++}`,
            className:
              "px-1.5 py-0.5 text-sm rounded bg-muted text-foreground font-mono",
          },
          codeMatch[2]
        )
      );
      remaining = codeMatch[3];
      continue;
    }

    // No more matches — push remaining text
    parts.push(remaining);
    break;
  }

  // Post-process: annotate Korean terms in plain-text nodes
  if (lang === "ko" && usedTerms) {
    const keyCounter = { value: 0 };
    const processed = parts.flatMap((part) => {
      if (typeof part === "string") {
        return wrapKoreanTerms(part, `${key ?? 0}-t`, keyCounter, usedTerms);
      }
      return [part];
    });
    return processed.length === 1 ? processed[0] : processed;
  }

  return parts.length === 1 ? parts[0] : parts;
}

/**
 * Render a markdown body (multi-line) to React elements.
 * Handles paragraphs, bullet lists (- and - **bold** rest), and blank lines.
 * When lang is "ko", annotates first occurrence of each Korean term
 * with <ruby> elements.  Pass an external usedTerms Set to share
 * first-occurrence tracking across multiple calls (e.g. across sections).
 */
export function renderMarkdownBody(
  body: string,
  lang?: string,
  externalUsedTerms?: Set<string>,
): React.ReactNode[] {
  if (!body) return [];

  const usedTerms = lang === "ko" ? (externalUsedTerms ?? new Set<string>()) : undefined;
  const lines = body.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === "") continue;

    if (line.startsWith("- ")) {
      const content = line.slice(2);
      elements.push(
        React.createElement(
          "p",
          {
            key: `line-${i}`,
            className: "flex items-start gap-2 mb-2",
          },
          React.createElement("span", {
            className:
              "w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0",
          }),
          React.createElement(
            "span",
            null,
            renderInlineMarkdown(content, `line-${i}`, lang, usedTerms)
          )
        )
      );
    } else {
      elements.push(
        React.createElement(
          "p",
          { key: `line-${i}`, className: "mb-2" },
          renderInlineMarkdown(line, `line-${i}`, lang, usedTerms)
        )
      );
    }
  }

  return elements;
}
