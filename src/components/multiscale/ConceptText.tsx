"use client";

import "katex/dist/katex.min.css";
import katex from "katex";
import { wrapKoreanTerms } from "@/lib/terminology";

/**
 * Renders text with inline KaTeX math delimited by $...$
 * When lang is "ko", annotates first occurrence of each Korean term
 * with <ruby> superscript annotations.
 */
export function ConceptText({
  text,
  lang,
  className,
}: {
  text: string;
  lang?: string;
  className?: string;
}) {
  // Split on $...$ keeping the delimiters as capture groups
  const parts = text.split(/(\$[^$]+\$)/g);

  const usedTerms = lang === "ko" ? new Set<string>() : undefined;
  const keyCounter = { value: 0 };

  return (
    <p className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("$") && part.endsWith("$")) {
          const latex = part.slice(1, -1);
          const html = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: false,
          });
          return (
            <span
              key={i}
              className="inline-block align-middle"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        if (usedTerms) {
          return <span key={i}>{wrapKoreanTerms(part, i, keyCounter, usedTerms)}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
