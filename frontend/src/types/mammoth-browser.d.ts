declare module "mammoth/mammoth.browser" {
  interface ExtractRawTextResult {
    value: string
  }

  export function extractRawText(options: { arrayBuffer: ArrayBuffer }): Promise<ExtractRawTextResult>
}
