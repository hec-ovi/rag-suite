from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from src.tools.deterministic_chunker import DeterministicChunker
from src.tools.normalize_text import DeterministicTextNormalizer

DEFAULT_MARKERS = [
    "<SYSTEM>",
    "Agent",
    "<AI>",
    "Output:",
    "Running command in ‘<WORKDIR>‘:",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a section-level ingestion audit report.")
    parser.add_argument("--input-file", required=True, help="Path to source TXT file.")
    parser.add_argument("--section-anchor", default="Introduction", help="Anchor text for section extraction.")
    parser.add_argument("--section-length", type=int, default=1200, help="Section character length.")
    parser.add_argument("--max-chars", type=int, default=550, help="Chunk max characters.")
    parser.add_argument("--min-chars", type=int, default=180, help="Chunk min characters.")
    parser.add_argument("--overlap-chars", type=int, default=80, help="Chunk overlap characters.")
    parser.add_argument(
        "--agentic-output-file",
        default=None,
        help="Optional file containing model output with a JSON object {\"chunks\": [...]}",
    )
    return parser.parse_args()


def count_line_occurrences(text: str, target: str) -> int:
    return sum(1 for line in text.split("\n") if line.strip() == target)


def extract_agentic_chunks(raw_text: str) -> list[dict[str, object]]:
    start = raw_text.find("{")
    end = raw_text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in agentic output file.")

    payload = json.loads(raw_text[start : end + 1])
    chunks = payload.get("chunks")
    if not isinstance(chunks, list):
        raise ValueError("Agentic JSON does not contain a valid chunks list.")
    return [chunk for chunk in chunks if isinstance(chunk, dict)]


def main() -> None:
    args = parse_args()
    source_path = Path(args.input_file)
    if not source_path.exists():
        raise FileNotFoundError(f"Input file not found: {source_path}")

    text = source_path.read_text(encoding="utf-8")

    normalizer = DeterministicTextNormalizer()
    chunker = DeterministicChunker()

    normalized_result = normalizer.normalize(
        text=text,
        max_blank_lines=1,
        remove_repeated_short_lines=True,
    )
    normalized_text = normalized_result.normalized_text

    anchor_index = text.find(args.section_anchor)
    if anchor_index == -1:
        raise ValueError(f"Section anchor not found: {args.section_anchor}")

    section_raw = text[anchor_index : anchor_index + args.section_length]
    section_normalized = normalizer.normalize(
        text=section_raw,
        max_blank_lines=1,
        remove_repeated_short_lines=True,
    ).normalized_text

    section_det_chunks = chunker.chunk(
        text=section_normalized,
        max_chunk_chars=args.max_chars,
        min_chunk_chars=args.min_chars,
        overlap_chars=args.overlap_chars,
    )

    print("# Section Audit")
    print(f"- source_file: `{source_path}`")
    print(f"- source_chars: {len(text)}")
    print(f"- normalized_chars: {len(normalized_text)}")
    print(f"- removed_repeated_line_count: {normalized_result.removed_repeated_line_count}")
    print(f"- collapsed_whitespace_count: {normalized_result.collapsed_whitespace_count}")
    print("")

    print("## Repeated Marker Cleanup")
    for marker in DEFAULT_MARKERS:
        raw_count = count_line_occurrences(text, marker)
        norm_count = count_line_occurrences(normalized_text, marker)
        print(f"- `{marker}`: raw={raw_count}, normalized={norm_count}")
    print("")

    print("## Section (Deterministic)")
    print(f"- anchor: `{args.section_anchor}`")
    print(f"- section_chars_raw: {len(section_raw)}")
    print(f"- section_chars_normalized: {len(section_normalized)}")
    print(f"- deterministic_chunk_count: {len(section_det_chunks)}")
    print(f"- deterministic_chunk_sizes: {[len(chunk.text) for chunk in section_det_chunks]}")
    print("")

    print("## Section Preview (Raw)")
    print("```text")
    print(section_raw[:420].replace("\f", "<FF>").rstrip())
    print("```")
    print("")

    print("## Section Preview (Normalized)")
    print("```text")
    print(section_normalized[:420].replace("\f", "<FF>").rstrip())
    print("```")
    print("")

    if args.agentic_output_file is None:
        return

    agentic_raw = Path(args.agentic_output_file).read_text(encoding="utf-8", errors="ignore")
    # Remove ANSI escapes if the model output came from a tty stream.
    agentic_raw = re.sub(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])", "", agentic_raw)
    chunks = extract_agentic_chunks(agentic_raw)

    print("## Section (Agentic)")
    print(f"- agentic_chunk_count: {len(chunks)}")
    print(f"- agentic_chunk_sizes: {[len(str(chunk.get('text', ''))) for chunk in chunks]}")
    print("")
    for idx, chunk in enumerate(chunks, start=1):
        text_value = str(chunk.get("text", ""))
        rationale_value = str(chunk.get("rationale", ""))
        print(f"### Agentic Chunk {idx}")
        print(f"- chars: {len(text_value)}")
        print(f"- rationale: {rationale_value}")
        print("```text")
        print(text_value[:260].rstrip())
        print("```")
        print("")


if __name__ == "__main__":
    main()
