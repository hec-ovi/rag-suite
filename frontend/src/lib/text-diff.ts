import { diffLines } from "diff"

export interface DiffLine {
  kind: "added" | "removed" | "unchanged"
  text: string
}

export function buildLineDiff(before: string, after: string): DiffLine[] {
  const changes = diffLines(before, after)
  const result: DiffLine[] = []

  for (const change of changes) {
    const trimmed = change.value.replace(/\n$/u, "")
    if (trimmed.length === 0) {
      continue
    }

    const lines = trimmed.split("\n")
    for (const line of lines) {
      if (change.added === true) {
        result.push({ kind: "added", text: line })
      } else if (change.removed === true) {
        result.push({ kind: "removed", text: line })
      } else {
        result.push({ kind: "unchanged", text: line })
      }
    }
  }

  return result
}
