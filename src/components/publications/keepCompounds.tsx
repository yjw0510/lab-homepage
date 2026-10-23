/**
 * Keeps hyphenated compounds (PLGA-PEG-PLGA, Fe-3wt%Si, first-principles) on one line.
 * Balanced title wrapping otherwise breaks them at the hyphen. The text itself is unchanged.
 */
export function keepCompounds(title: string) {
  return title
    .split(/(\S*-\S*)/)
    .map((part, i) =>
      i % 2 === 1 ? (
        <span key={i} className="whitespace-nowrap">
          {part}
        </span>
      ) : (
        part
      ),
    );
}
