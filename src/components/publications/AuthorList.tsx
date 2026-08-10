const PI_NAME = "Ji Woong Yu";

export function AuthorList({
  authors,
  firstAuthors = [],
  correspondingAuthors = [],
  lang = "en",
}: {
  authors: string[];
  firstAuthors?: string[];
  correspondingAuthors?: string[];
  lang?: string;
}) {
  const ko = lang === "ko";
  const firstSet = new Set(firstAuthors);
  const corrSet = new Set(correspondingAuthors);

  // Derive PI role for parenthetical suffix
  const piIsFirst = firstSet.has(PI_NAME);
  const piIsCorr = corrSet.has(PI_NAME);
  let piRole: string | undefined;
  // Generated editorial annotation, not bibliographic data, so it localizes. Author names,
  // titles and journals stay as published; this sentence is the site talking.
  if (piIsFirst && piIsCorr) {
    if (ko) {
      piRole = `${firstSet.size > 1 ? "공동 제1저자" : "제1저자"} 겸 ${corrSet.size > 1 ? "공동 교신저자" : "교신저자"}`;
    } else {
      const coFirst = firstSet.size > 1 ? "Co-first" : "First";
      const coCorr = corrSet.size > 1 ? "co-corresponding" : "corresponding";
      piRole = `${coFirst} & ${coCorr} author`;
    }
  } else if (piIsFirst) {
    piRole = ko
      ? (firstSet.size > 1 ? "공동 제1저자" : "제1저자")
      : (firstSet.size > 1 ? "Co-first author" : "First author");
  } else if (piIsCorr) {
    piRole = ko
      ? (corrSet.size > 1 ? "공동 교신저자" : "교신저자")
      : (corrSet.size > 1 ? "Co-corresponding author" : "Corresponding author");
  }

  return (
    <>
      {authors.map((author, i) => {
        const isPI = author === PI_NAME;
        const isFirst = firstSet.has(author);
        const isCorr = corrSet.has(author);
        const separator = i < authors.length - 1 ? ", " : "";

        return (
          <span key={i}>
            <span
              className={`${isPI ? "type-lead text-lv-mlff-text" : ""} ${isFirst ? "underline" : ""}`}
            >
              {author}
              {isCorr ? "*" : ""}
            </span>
            {separator}
          </span>
        );
      })}
      {piRole && <span> ({piRole})</span>}
    </>
  );
}
