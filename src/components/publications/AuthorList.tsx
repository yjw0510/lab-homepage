const PI_NAME = "Ji Woong Yu";

export function AuthorList({
  authors,
  firstAuthors = [],
  correspondingAuthors = [],
}: {
  authors: string[];
  firstAuthors?: string[];
  correspondingAuthors?: string[];
}) {
  const firstSet = new Set(firstAuthors);
  const corrSet = new Set(correspondingAuthors);

  // Derive PI role for parenthetical suffix
  const piIsFirst = firstSet.has(PI_NAME);
  const piIsCorr = corrSet.has(PI_NAME);
  let piRole: string | undefined;
  if (piIsFirst && piIsCorr) {
    const coFirst = firstSet.size > 1 ? "Co-first" : "First";
    const coCorr = corrSet.size > 1 ? "co-corresponding" : "corresponding";
    piRole = `${coFirst} & ${coCorr} author`;
  } else if (piIsFirst) {
    piRole = firstSet.size > 1 ? "Co-first author" : "First author";
  } else if (piIsCorr) {
    piRole = corrSet.size > 1 ? "Co-corresponding author" : "Corresponding author";
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
              className={`${isPI ? "font-bold text-blue-600 dark:text-blue-400" : ""} ${isFirst ? "underline" : ""}`}
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
