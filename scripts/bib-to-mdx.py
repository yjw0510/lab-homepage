#!/usr/bin/env python3
"""
BibTeX to MDX converter for lab publications.

Usage:
    python scripts/bib-to-mdx.py references.bib
    python scripts/bib-to-mdx.py references.bib --output content/publications

Converts each BibTeX entry into an MDX file with YAML frontmatter
compatible with the lab homepage publication system.

Requirements:
    pip install bibtexparser
"""

import argparse
import os
import re
import sys

try:
    import bibtexparser
    from bibtexparser.bparser import BibTexParser
    from bibtexparser.customization import convert_to_unicode
except ImportError:
    print("Error: bibtexparser not installed. Run: pip install bibtexparser")
    sys.exit(1)


def clean_latex(text: str) -> str:
    """Remove common LaTeX formatting from text."""
    text = re.sub(r"[{}]", "", text)
    text = re.sub(r"\\textbf\s*", "", text)
    text = re.sub(r"\\textit\s*", "", text)
    text = re.sub(r"\\emph\s*", "", text)
    text = re.sub(r"~", " ", text)
    text = re.sub(r"\\&", "&", text)
    return text.strip()


def parse_authors(author_str: str) -> list[str]:
    """Parse BibTeX author string into list of names."""
    authors = author_str.split(" and ")
    result = []
    for author in authors:
        author = clean_latex(author.strip())
        # Handle "Last, First" format
        if "," in author:
            parts = author.split(",", 1)
            author = f"{parts[1].strip()} {parts[0].strip()}"
        result.append(author)
    return result


def generate_slug(entry: dict) -> str:
    """Generate a URL-friendly slug from year and title."""
    year = entry.get("year", "0000")
    title = entry.get("title", "untitled")
    title = clean_latex(title).lower()
    # Take first few meaningful words
    words = re.sub(r"[^a-z0-9\s]", "", title).split()
    slug_words = words[:4]
    return f"{year}-{'-'.join(slug_words)}"


def guess_tags(entry: dict) -> list[str]:
    """Guess research tags from title and keywords."""
    tags = []
    text = (
        entry.get("title", "") + " " +
        entry.get("keywords", "") + " " +
        entry.get("abstract", "")
    ).lower()

    tag_keywords = {
        "molecular dynamics": ["molecular dynamics", "md simulation"],
        "machine learning": ["machine learning", "neural network", "deep learning", "mlff", "force field"],
        "water dynamics": ["water", "hydration", "aqueous", "solvation"],
        "nanoparticle": ["nanoparticle", "nanocrystal", "nano"],
        "polymer": ["polymer", "brush", "polyelectrolyte"],
        "quantum chemistry": ["dft", "density functional", "ab initio", "quantum"],
        "Hofmeister series": ["hofmeister", "ion-specific"],
    }

    for tag, keywords in tag_keywords.items():
        if any(kw in text for kw in keywords):
            tags.append(tag)

    return tags if tags else ["computational chemistry"]


def entry_to_mdx(entry: dict) -> str:
    """Convert a BibTeX entry to MDX content."""
    title = clean_latex(entry.get("title", "Untitled"))
    authors = parse_authors(entry.get("author", ""))
    journal = clean_latex(entry.get("journal", entry.get("booktitle", "")))
    year = entry.get("year", "")
    volume = entry.get("volume", "")
    issue = entry.get("number", "")
    doi = entry.get("doi", "")
    tags = guess_tags(entry)
    abstract = clean_latex(entry.get("abstract", ""))

    # Build YAML frontmatter
    lines = ["---"]
    lines.append(f'title: "{title}"')
    lines.append("authors:")
    for author in authors:
        lines.append(f'  - "{author}"')
    lines.append(f'journal: "{journal}"')
    lines.append(f"year: {year}")
    if volume:
        lines.append(f"volume: {volume}")
    if issue:
        lines.append(f"issue: {issue}")
    if doi:
        lines.append(f'doi: "{doi}"')
    lines.append("tags:")
    for tag in tags:
        lines.append(f'  - "{tag}"')
    lines.append("featured: false")
    lines.append("---")
    lines.append("")

    if abstract:
        lines.append("## Abstract")
        lines.append("")
        lines.append(abstract)
    else:
        lines.append("## Abstract")
        lines.append("")
        lines.append("_Abstract to be added._")

    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(
        description="Convert BibTeX to MDX files for lab homepage"
    )
    parser.add_argument("bibfile", help="Path to .bib file")
    parser.add_argument(
        "--output", "-o",
        default="content/publications",
        help="Output directory (default: content/publications)"
    )
    parser.add_argument(
        "--dry-run", "-n",
        action="store_true",
        help="Print output without writing files"
    )
    args = parser.parse_args()

    if not os.path.exists(args.bibfile):
        print(f"Error: File not found: {args.bibfile}")
        sys.exit(1)

    # Parse BibTeX
    bib_parser = BibTexParser(common_strings=True)
    bib_parser.customization = convert_to_unicode

    with open(args.bibfile, "r", encoding="utf-8") as f:
        bib_db = bibtexparser.load(f, parser=bib_parser)

    print(f"Found {len(bib_db.entries)} entries in {args.bibfile}")

    if not args.dry_run:
        os.makedirs(args.output, exist_ok=True)

    for entry in bib_db.entries:
        slug = generate_slug(entry)
        mdx_content = entry_to_mdx(entry)
        filename = f"{slug}.mdx"

        if args.dry_run:
            print(f"\n{'=' * 60}")
            print(f"File: {filename}")
            print(f"{'=' * 60}")
            print(mdx_content)
        else:
            filepath = os.path.join(args.output, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(mdx_content)
            print(f"  Created: {filepath}")

    if not args.dry_run:
        print(f"\nDone! {len(bib_db.entries)} MDX files written to {args.output}/")


if __name__ == "__main__":
    main()
