import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireProfile, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  const profile = await requireProfile(request, 'admin');
  if (!profile) {
    return unauthorizedResponse();
  }
  const [{ data: elections }, { data: turnout }] = await Promise.all([
    supabaseServer.from('elections').select('id, title, status, start_time, end_time, created_at'),
    supabaseServer.rpc('election_turnout_report')
  ]);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Election Report');
  sheet.columns = [
    { header: 'Election ID', key: 'id', width: 24 },
    { header: 'Title', key: 'title', width: 40 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Start Time', key: 'start_time', width: 24 },
    { header: 'End Time', key: 'end_time', width: 24 },
    { header: 'Created At', key: 'created_at', width: 24 }
  ];

  elections?.forEach((election: { id: string; title: string; status: string; start_time: string; end_time: string; created_at: string }) => {
    sheet.addRow(election);
  });
  sheet.addRow([]);
  sheet.addRow(['Turnout Summary']);
  sheet.addRow(['Class', 'Registered Students', 'Votes Cast', 'Turnout Percentage']);

  if (Array.isArray(turnout)) {
    (turnout as Array<{ class_name: string; registered_students: number; votes_cast: number; turnout_percentage: number }>).forEach((row) => {
      sheet.addRow([row.class_name, row.registered_students, row.votes_cast, row.turnout_percentage]);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="election-report.xlsx"'
    }
  });
}
