'use client';

import { useState } from 'react';
import { authHeaders } from '@/lib/clientAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface StudentImportFormProps {
  onSuccess?: () => void;
}

export function StudentImportForm({ onSuccess }: StudentImportFormProps) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleBulkImport(event: React.FormEvent) {
    event.preventDefault();
    if (!importFile) return;
    setImportMessage(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const headers = await authHeaders();
      const response = await fetch('/api/admin/students/import', { method: 'POST', headers, body: formData });
      const result = await response.json();

      if (response.ok) {
        setImportMessage(`Import complete! Created: ${result.created}, Skipped: ${result.skipped}, Exists: ${result.exists}.`);
        setImportFile(null);
        (event.target as HTMLFormElement).reset();
        onSuccess?.();
      } else {
        setImportMessage(result.error || 'Import failed.');
      }
    } catch (error: any) {
      setImportMessage(error.message || 'An error occurred during import.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-slate-900">Bulk Import Students</h2>
      <p className="mt-2 text-sm text-slate-600">Upload a CSV or XLSX file to bulk import student accounts.</p>
      <form className="grid gap-4 pt-6" onSubmit={handleBulkImport}>
        <div>
          <Label htmlFor="import_file">Select File (.csv, .xlsx)</Label>
          <Input id="import_file" type="file" accept=".csv,.xlsx" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} required />
        </div>
        <Button type="submit" disabled={isLoading || !importFile}>Import Students</Button>
        {importMessage && <div className="rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700 whitespace-pre-wrap">{importMessage}</div>}
      </form>
    </Card>
  );
}