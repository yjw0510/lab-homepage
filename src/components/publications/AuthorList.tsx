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

  // PI role, printed in parentheses right after the PI's own name so it cannot read as the
  // role of whoever is listed last.
  const piIsFirst = firstSet.has(PI_NAME);
  const piIsCorr = corrSet.has(PI_NAME);
  let piRole: string | undefined;
  // Generated editorial annotation, not bibliographic data, so it localizes. Author names,
  // titles and journals stay as published; this sentence is the site talking.
  if (piIsFirst && piIsCorr) {
    if (ko) {
      piRole = `${firstSet.size > 1 ? "공동 제1저자" : "제1저자"} 겸 ${corrSet.size > 1 ? "공동 교신저자" : "교신저자"}`;
    } else {
      const coFirst = firstSet.size > 1 ? "co-first" : "first";
      const coCorr = corrSet.size > 1 ? "co-corresponding" : "corresponding";
      piRole = `${coFirst} & ${coCorr} author`;
    }
  } else if (piIsFirst) {
    piRole = ko
      ? (firstSet.size > 1 ? "공동 제1저자" : "제1저자")
      : (firstSet.size > 1 ? "co-first author" : "first author");
  } else if (piIsCorr) {
    piRole = ko
      ? (corrSet.size > 1 ? "공동 교신저자" : "교신저자")
      : (corrSet.size > 1 ? "co-corresponding author" : "corresponding author");
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
            {/* A name or the role note never breaks inside itself; breaks fall between them. */}
            <span
              className={`whitespace-nowrap ${isPI ? "type-lead text-lv-mlff-text" : ""} ${isFirst ? "underline" : ""}`}
            >
              {author}
              {isCorr ? "*" : ""}
            </span>
            {isPI && piRole && (
              <>
                {" "}
                <span className="whitespace-nowrap">({piRole})</span>
              </>
            )}
            {separator}
          </span>
        );
      })}
    </>
  );
}
