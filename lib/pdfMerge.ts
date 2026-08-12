const IMAGE_EXTENSION_RE = /\.(jpe?g|png|webp|gif|bmp)$/i;

// Returns just the page count of a PDF without rendering anything, using the
// same pdfjs-dist loading setup as lib/pdfToImage.ts (worker disabled, static
// workerSrc from /public — bundling it through webpack breaks on its
// top-level `import.meta`).
export async function getPdfPageCount(pdfFile: File): Promise<number> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true } as any).promise;
  return pdf.numPages;
}

async function blobToPngBytes(blob: Blob): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not decode an image inside the zip.'));
      image.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not initialize canvas for image conversion.');
    ctx.drawImage(img, 0, 0);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to encode image as PNG.'))), 'image/png');
    });

    return {
      bytes: new Uint8Array(await pngBlob.arrayBuffer()),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export interface PdfMergeResult {
  file: File;
  pageCount: number;
}

// Extracts every image from a zip, orders pages by filename (natural sort,
// so "page2.jpg" comes before "page10.jpg"), and merges them into a single
// multi-page PDF via pdf-lib.
export async function zipImagesToPdf(zipFile: File): Promise<PdfMergeResult> {
  const JSZip = (await import('jszip')).default;
  const { PDFDocument } = await import('pdf-lib');

  const zip = await JSZip.loadAsync(zipFile);
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir && IMAGE_EXTENSION_RE.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  if (entries.length === 0) {
    throw new Error('No images found inside the zip file.');
  }

  const pdfDoc = await PDFDocument.create();

  for (const entry of entries) {
    const isJpeg = /\.jpe?g$/i.test(entry.name);
    const isPng = /\.png$/i.test(entry.name);

    // Embed JPEG/PNG bytes as-is — re-encoding a photo as PNG (as the canvas
    // fallback below does) turns lossy-compressed photos into much larger
    // lossless files. Only fall back to the canvas roundtrip for formats
    // pdf-lib can't embed directly (webp/gif/bmp).
    if (isJpeg || isPng) {
      const bytes = new Uint8Array(await entry.async('arraybuffer'));
      const image = isJpeg ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes);
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      continue;
    }

    const blob = await entry.async('blob');
    const { bytes, width, height } = await blobToPngBytes(blob);
    const image = await pdfDoc.embedPng(bytes);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }

  const pdfBytes = await pdfDoc.save();
  const newName = zipFile.name.replace(/\.zip$/i, '.pdf');

  return {
    file: new File([pdfBytes as BlobPart], newName, { type: 'application/pdf' }),
    pageCount: entries.length,
  };
}
