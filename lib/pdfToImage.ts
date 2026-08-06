export interface PdfConversionResult {
  file: File;
  pageCount: number;
}

// Renders every page of a PDF onto a canvas and stitches them vertically into
// a single image, since notes/occlusion overlays are built around one image.
export async function convertPdfToImageFile(pdfFile: File): Promise<PdfConversionResult> {
  const pdfjsLib = await import('pdfjs-dist');
  // pdfjs-dist still requires a workerSrc even when the worker itself is
  // disabled below, so point it at the static copy served from /public
  // (bundling it through webpack breaks on its top-level `import.meta`).
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await pdfFile.arrayBuffer();
  // Run on the main thread — this is an infrequent, non-performance-critical
  // conversion already covered by a loading indicator, and it sidesteps
  // dedicated-Worker edge cases (CSP, sandboxed iframes, etc.) entirely.
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true } as any).promise;
  const numPages = pdf.numPages;

  const baseViewport = (await pdf.getPage(1)).getViewport({ scale: 1 });
  const maxTotalHeightPx = 14000;
  const targetScale = Math.min(2, Math.max(1, maxTotalHeightPx / (baseViewport.height * numPages)));

  const pageCanvases: HTMLCanvasElement[] = [];
  let totalHeight = 0;
  let maxWidth = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: targetScale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not initialize canvas for PDF rendering.');
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    pageCanvases.push(canvas);
    totalHeight += canvas.height;
    maxWidth = Math.max(maxWidth, canvas.width);
  }

  const mergedCanvas = document.createElement('canvas');
  mergedCanvas.width = maxWidth;
  mergedCanvas.height = totalHeight;
  const mergedCtx = mergedCanvas.getContext('2d');
  if (!mergedCtx) throw new Error('Could not initialize canvas for merged PDF image.');

  mergedCtx.fillStyle = '#ffffff';
  mergedCtx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);

  let yOffset = 0;
  for (const canvas of pageCanvases) {
    mergedCtx.drawImage(canvas, 0, yOffset);
    yOffset += canvas.height;
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    mergedCanvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to render PDF pages to an image.'))),
      'image/png'
    );
  });

  const newName = pdfFile.name.replace(/\.pdf$/i, '.png');
  return {
    file: new File([blob], newName, { type: 'image/png' }),
    pageCount: numPages,
  };
}
