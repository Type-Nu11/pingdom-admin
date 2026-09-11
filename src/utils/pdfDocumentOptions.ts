export function getPdfDocumentOptions(url: string) {
  return {
    url,
    cMapUrl: `${import.meta.env.BASE_URL}pdfjs/cmaps/`,
    cMapPacked: true,
  }
}
