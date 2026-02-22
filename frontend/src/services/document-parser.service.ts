import * as mammoth from "mammoth/mammoth.browser"
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist"
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url"

GlobalWorkerOptions.workerSrc = pdfWorkerSrc

function isStringValue(value: unknown): value is string {
  return typeof value === "string"
}

async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer()
    const loadingTask = getDocument({ data: buffer })
    const pdf = await loadingTask.promise

    const pageTexts: string[] = []
    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex)
      const content = await page.getTextContent()
      const strings: string[] = []
      for (const item of content.items) {
        if ("str" in item && isStringValue(item.str)) {
          const value = item.str.trim()
          if (value.length > 0) {
            strings.push(value)
          }
        }
      }
      pageTexts.push(strings.join(" "))
    }

    const extracted = pageTexts.join("\n\n").trim()
    if (extracted.length === 0) {
      throw new Error("PDF has no extractable text. It may be scanned images or encrypted.")
    }

    return extracted
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown PDF extraction error."
    throw new Error(`PDF extraction failed: ${message}`)
  }
}

async function extractTextFromDocx(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: buffer })
  return result.value
}

async function extractTextFromTxt(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  return new TextDecoder().decode(buffer)
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith(".pdf")) {
    return extractTextFromPdf(file)
  }
  if (name.endsWith(".docx")) {
    return extractTextFromDocx(file)
  }
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return extractTextFromTxt(file)
  }

  throw new Error("Unsupported file type. Upload PDF, DOCX, or TXT.")
}
