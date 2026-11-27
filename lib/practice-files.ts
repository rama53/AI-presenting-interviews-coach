const maxFileSize = 12 * 1024 * 1024

function validateSize(file: File) {
  if (file.size > maxFileSize) throw new Error('size')
}

async function readArchive(file: File) {
  const { default: JSZip } = await import('jszip')
  return JSZip.loadAsync(await file.arrayBuffer())
}

function xmlText(xml: string, tag: string, namespace: string) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  return Array.from(doc.getElementsByTagNameNS(namespace, tag), (node) => node.textContent ?? '').join(' ').trim()
}

export async function readPracticeDocument(file: File, limit: number) {
  validateSize(file)
  if (/\.docx$/i.test(file.name)) {
    const zip = await readArchive(file)
    const document = zip.file('word/document.xml')
    if (!document) throw new Error('document')
    return xmlText(await document.async('string'), 't', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main').slice(0, limit)
  }
  if (!/\.pdf$/i.test(file.name)) throw new Error('extension')

  const { getDocument, GlobalWorkerOptions, version } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  try {
    const pdf = await task.promise
    let text = ''
    for (let page = 1; page <= Math.min(pdf.numPages, 30) && text.length < limit; page++) {
      const content = await (await pdf.getPage(page)).getTextContent()
      text += content.items.map((item) => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('') + '\n'
    }
    return text.trim().slice(0, limit)
  } finally {
    await task.destroy()
  }
}

export async function readPresentationSlides(file: File) {
  validateSize(file)
  const zip = await readArchive(file)
  const paths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .slice(0, 50)
  if (!paths.length) throw new Error('slides')
  return Promise.all(paths.map(async (path) => {
    const content = await zip.file(path)?.async('string') ?? ''
    return xmlText(content, 't', 'http://schemas.openxmlformats.org/drawingml/2006/main').slice(0, 2000)
  }))
}
