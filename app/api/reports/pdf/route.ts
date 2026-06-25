import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireProfile, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  const profile = await requireProfile(request, ['admin', 'officer']);
  if (!profile) {
    return unauthorizedResponse();
  }
  const { data: elections, error } = await supabaseServer.from('elections').select('id, title, status, start_time, end_time');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontSize = 12;
  const lineHeight = fontSize + 6;
  let y = page.getHeight() - 60;

  page.drawText('St. Mark’s S.S. Naminya — Prefect Voting Summary', {
    x: 48,
    y,
    size: 16,
    font: timesRomanFont,
    color: rgb(0.17, 0.25, 0.58)
  });
  y -= 20;
  page.drawText('Desire to Excel', {
    x: 48,
    y,
    size: 11,
    font: timesRomanFont,
    color: rgb(0.8, 0.43, 0.23)
  });
  y -= 30;

  elections?.forEach((election: { id: string; title: string; status: string; start_time: string; end_time: string }, index: number) => {
    page.drawText(`${index + 1}. ${election.title} (${election.status})`, {
      x: 48,
      y,
      size: fontSize,
      font: timesRomanFont
    });
    y -= lineHeight;
    page.drawText(`   Start: ${new Date(election.start_time).toLocaleString()} - End: ${new Date(election.end_time).toLocaleString()}`, {
      x: 58,
      y,
      size: fontSize,
      font: timesRomanFont
    });
    y -= lineHeight;
    if (y < 80) {
      y = page.getHeight() - 60;
    }
  });

  const pdfBytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="election-summary.pdf"'
    }
  });
}
