import {
  isSupabaseConfigured,
  getAuthHeaders,
  getCurrentUserId,
  insertNewspaperPdfRow,
  insertNewspaperPageRows,
  selectNewspaperPdfs,
  selectNewspaperPdfById,
  selectNewspaperPagesByPdfId,
  updateNewspaperPageReadStatus,
  updateNewspaperPageComment,
  selectNewspaperPdfUrlById,
  deleteNewspaperPdfRow,
} from './supabase';
import { NewspaperPdf, NewspaperPage } from './types';

const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').replace(/\/$/, '');

export async function uploadNewspaperPdf(file: File): Promise<string> {
  const presignRes = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ contentType: file.type || 'application/pdf', fileSize: file.size }),
  });
  if (!presignRes.ok) {
    const body = await presignRes.json().catch(() => null);
    throw new Error(body?.error || `Failed to get an R2 upload URL (status ${presignRes.status}).`);
  }
  const { uploadUrl, publicUrl } = await presignRes.json();
  if (!uploadUrl || !publicUrl) throw new Error('R2 did not return an upload URL.');

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/pdf' },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Upload to R2 failed (status ${putRes.status}).`);
  }

  return publicUrl;
}

export interface CreateNewspaperPdfParams {
  title: string;
  pdfUrl: string;
  pageCount: number;
  year: number;
  month: number;
  week?: number | null;
  day?: number | null;
}

export async function createNewspaperPdf(params: CreateNewspaperPdfParams): Promise<NewspaperPdf> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase database is not configured.');
  }

  const userId = await getCurrentUserId();

  const { data: pdf, error: pdfError } = await insertNewspaperPdfRow({
    user_id: userId,
    title: params.title,
    pdf_url: params.pdfUrl,
    page_count: params.pageCount,
    year: params.year,
    month: params.month,
    week: params.week ?? null,
    day: params.day ?? null,
  });

  if (pdfError) throw pdfError;

  const pageRows = Array.from({ length: params.pageCount }, (_, i) => ({
    pdf_id: pdf.id,
    user_id: userId,
    page_number: i + 1,
  }));

  const { error: pagesError } = await insertNewspaperPageRows(pageRows);
  if (pagesError) throw pagesError;

  return pdf as NewspaperPdf;
}

export async function listNewspaperPdfs(): Promise<NewspaperPdf[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await selectNewspaperPdfs();

    if (error) throw error;
    return (data || []) as NewspaperPdf[];
  }
  return [];
}

export async function getNewspaperPdfWithPages(pdfId: string): Promise<NewspaperPdf> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase database is not configured.');
  }

  const { data: pdf, error: pdfError } = await selectNewspaperPdfById(pdfId);
  if (pdfError) throw pdfError;

  const { data: pages, error: pagesError } = await selectNewspaperPagesByPdfId(pdfId);
  if (pagesError) throw pagesError;

  return { ...pdf, pages: (pages || []) as NewspaperPage[] } as NewspaperPdf;
}

export async function togglePageRead(pageId: string, isRead: boolean): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase database is not configured.');
  }
  const { error } = await updateNewspaperPageReadStatus(pageId, isRead);
  if (error) throw error;
}

export async function updatePageComment(pageId: string, comment: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase database is not configured.');
  }
  const { error } = await updateNewspaperPageComment(pageId, comment.trim() === '' ? null : comment);
  if (error) throw error;
}

async function deletePdfFromR2(url: string): Promise<void> {
  if (!R2_PUBLIC_URL || !url?.startsWith(`${R2_PUBLIC_URL}/`)) return;

  const res = await fetch('/api/storage/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ urls: [url] }),
  });
  if (!res.ok) {
    throw new Error(`Failed to delete PDF from R2 (status ${res.status}).`);
  }
}

export async function deleteNewspaperPdf(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase database is not configured.');
  }

  const { data: pdf, error: fetchError } = await selectNewspaperPdfUrlById(id);
  if (fetchError) throw fetchError;

  if (pdf?.pdf_url) {
    await deletePdfFromR2(pdf.pdf_url);
  }

  const { error: deleteError } = await deleteNewspaperPdfRow(id);
  if (deleteError) throw deleteError;
}
