# Yu Lab Website Writing Policy

This policy applies to every reader-facing sentence on the site, including metadata,
captions, accessibility labels, news, recruitment copy, and Korean localization.

## 1. Reader and author

- Write for prospective graduate students and public-sector readers who do not yet
  know computational chemistry.
- Write as a computational chemist. Lead with the question and the modeling choice;
  use an application system as evidence, not as a claim of domain authority.
- English is the source text. Korean is a fresh rendering of the same meaning, not a
  sentence-by-sentence translation.

## 2. House voice

The reference style is compact, factual, and result-led. A research paragraph should
normally move through three functions:

1. Name the material behavior or scientific problem.
2. State the computational approach in plain language, defining the one term the
   reader needs.
3. Give the finding and why it changes what can be predicted or designed.

Use concrete verbs such as `compute`, `compare`, `trace`, `resolve`, and `predict`.
Prefer one claim per sentence. End when the finding lands; do not add a generic promise
about future impact.

State the claim directly. Avoid rhetorical antithesis such as `not X but Y`, `rather
than`, `instead of`, `A가 아니라 B`, `뿐 아니라`, and concessive `~지만` framing.
Scientific scope belongs in the subject or domain of the claim:

- Write “For the salts and models examined, the results follow one comparison curve.”
- Write “Training coverage defines the chemistry represented by the MLFF.”
- Write “The trajectories measure reduced mobility; the model attributes it to
  confinement resistance.”

Keep functional negation when it conveys an actual state or instruction, such as an
eligibility rule, empty result, loading error, or genuinely unoccupied orbital.

Avoid mission-language and AI boilerplate: `delve`, `robust`, `comprehensive`,
`innovative`, `transformative`, `leverage`, `foster`, `enhance`, `pivotal`,
`multifaceted`, `crucial`, `vital`, `furthermore`, `moreover`, and `it is worth noting`.
Delete claims such as “X is important” unless the sentence states what X changes.

## 3. Depth and length by section

### Home

- Purpose: identify the lab, its method-centered identity, and the class of questions it
  answers.
- Hero description: 18–30 English words.
- Section subtitle: no more than 24 English words.
- Specimen captions may identify the modeling scale, system, and one size cue. Do not
  list software, ensembles, temperatures, runtimes, electronic-structure settings, or
  other protocol details.

### Multiscale

- Purpose: teach why several representations are needed and what each can answer.
- Interactive `question`: 12–28 English words.
- Interactive `concept`: 45–80 English words.
- Interactive `takeaway`: 12–30 English words.
- Method-page body: 220–320 English words, excluding publication citations.
- Explain the tradeoff between resolution and reach. Do not teach basis sets, levels of
  theory, thermostat or barostat choices, integration schemes, software packages, or
  parameter recipes.

### Research Topics

- Purpose: show what the lab has actually studied, why, how, and what the papers found.
- Use the paper corpus as the evidence boundary.
- Keep each description near 45–55% of its August 2026 pre-edit length:

| Topic | English target |
| --- | ---: |
| Polymer-directed self-assembly | 215–255 words |
| Aqueous chemistry with ML force fields | 205–240 words |
| Glass dynamics and microrheology | 150–185 words |
| Colloidal structure, transport, and optics | 220–260 words |
| Multiscale modeling of hydrogels | 130–165 words |
| Collaborative projects | 65–90 words |
| Research directions under development | 125–160 words |

- Two paragraphs are usually enough for a multi-paper topic. Use a short list only when
  the reader is genuinely choosing among independent projects.
- One informative number may remain when it changes the interpretation. A chain of
  temperatures, exponents, sample counts, rates, or dimensions does not belong here.
- Define the evidence boundary in positive terms. Name the systems, models, observables,
  and training domain covered by the claim. A matching exponent supports a proposed
  mechanism; a direct mechanism test requires its own evidence.

### Publications, People, News, Funding, and Contact

- Publication summary: 25–45 English words; method plus principal finding.
- PI biography, if shown: 110–150 English words; research identity before chronology.
- News body: 80–140 English words unless the announcement needs instructions.
- Recruitment instructions: direct, welcoming, and specific. State explicitly when
  beginners are welcome.
- Official paper titles, grant names, affiliations, dates, and bibliographic metadata are
  records, not prose; preserve them exactly.

## 4. Terms for non-specialists

Do not use a specialist term before explaining it. Define it in the sentence where it
first matters, then use the short form:

- `density functional theory (DFT)`: a quantum-mechanical calculation of how electrons
  are distributed.
- `machine-learning force field (MLFF)`: a model trained on quantum calculations to
  predict atomic energies and forces.
- `molecular dynamics (MD)`: a simulation that follows molecular motion over time.
- `coarse-graining`: grouping several atoms into one interaction site to reach larger
  systems and longer collective motion.
- `active microrheology`: reading local mechanics from the force on a small driven probe.

Definitions should serve the immediate claim. Do not turn them into textbook asides.

## 5. Korean localization

- Rebuild the sentence around natural Korean information order. Do not mirror English
  subjects, passives, or article structure.
- Keep standard acronyms and names such as DFT and MLFF in English. On first use, pair an
  English technical term with a short Korean explanation when the acronym alone would
  exclude the reader.
- Prefer direct verbs over nominalized chains. Remove `이를 통해`, `나아가`, `종합적으로`,
  `~라고 할 수 있다`, and `~에 기여할 수 있다` unless they carry real logical content.
- Research and explanatory copy uses concise `-다` style. Recruitment may address the
  reader directly and politely.
- Preserve chemical formulas, proper names, paper titles, and protected technical tokens.

## 6. Evidence and review gates

Every substantive sentence must pass all of these checks:

1. **Purpose:** Does it belong in this section at this depth?
2. **Actor or claim:** Does someone do something, or could the claim be tested and found
   wrong?
3. **Evidence:** Is it supported by the provided paper, an official record, or the actual
   visualization source?
4. **Definition:** Can a non-specialist understand every necessary term from context?
5. **Deletion:** If the sentence disappears, does the paragraph lose information? If not,
   delete it.
6. **Balance:** Does the sentence make its claim and evidence boundary directly, without
   promotional overreach or defensive retreat?
7. **Specificity:** Is it concrete without drifting into protocol trivia or number lists?
8. **Parallel meaning:** Do English and Korean make the same claim without sounding like
   translations of one another?

## 7. Final polish workflow

1. Finish and fact-check the English source copy.
2. Write the Korean version from the settled meaning.
3. Run the English copy through the site’s human-writing review rules.
4. Run only the Korean prose through the pinned `im-not-ai` v2.3.0 workflow at commit
   `82137e858763dadb99561f194c5c00465735017b`. The tool is Korean-only; never feed it the
   English source or live TypeScript/JSON files.
5. Protect acronyms, formulas, names, and headings in the staging document. Review the
   generated diff by hand and re-integrate only changes that preserve scientific meaning.
6. Re-run word budgets, terminology checks, type checks, tests, build, and bilingual
   visual review.
