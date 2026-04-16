/**
 * Hook for fetching and managing reports from the database.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Report {
  id: string;
  academic_year: string;
  reporting_period: 'mid_year' | 'end_of_year';
  scope: 'university' | 'per_pillar' | 'per_unit';
  report_type: 'executive' | 'full';
  pillar: string | null;
  unit_id: string | null;
  title: string;
  description: string | null;
  file_path: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReportFilters {
  academicYear?: string;
  period?: 'mid_year' | 'end_of_year';
  scope?: 'university' | 'per_pillar' | 'per_unit';
  reportType?: 'executive' | 'full';
  pillar?: string;
  unitId?: string;
}

interface UseReportsOptions {
  enabled?: boolean;
}

export function useReports(filters?: ReportFilters, options?: UseReportsOptions) {
  return useQuery<Report[]>({
    queryKey: ['reports', filters],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      let query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.academicYear) query = query.eq('academic_year', filters.academicYear);
      if (filters?.period) query = query.eq('reporting_period', filters.period);
      if (filters?.scope) query = query.eq('scope', filters.scope);
      if (filters?.reportType) query = query.eq('report_type', filters.reportType);
      if (filters?.pillar) query = query.eq('pillar', filters.pillar);
      if (filters?.unitId) query = query.eq('unit_id', filters.unitId);

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as Report[]) || [];
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (report: Report) => {
      const { error: storageError } = await supabase.storage.from('reports').remove([report.file_path]);
      if (storageError) console.warn('Storage delete error:', storageError);
      const { error } = await supabase.from('reports').delete().eq('id', report.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });
}

export function useUploadReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      file: File;
      title: string;
      academic_year: string;
      reporting_period: 'mid_year' | 'end_of_year';
      scope: 'university' | 'per_pillar' | 'per_unit';
      report_type: 'executive' | 'full';
      pillar: string | null;
      unit_id: string | null;
      description: string | null;
    }) => {
      const filePath = `${Date.now()}-${params.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('reports').upload(filePath, params.file, {
        contentType: 'application/pdf',
      });
      if (uploadError) throw uploadError;

      const { error } = await supabase.from('reports').insert({
        title: params.title,
        academic_year: params.academic_year,
        reporting_period: params.reporting_period,
        scope: params.scope,
        report_type: params.report_type,
        pillar: params.pillar,
        unit_id: params.unit_id,
        description: params.description,
        file_path: filePath,
        uploaded_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      title: string;
      academic_year: string;
      reporting_period: 'mid_year' | 'end_of_year';
      scope: 'university' | 'per_pillar' | 'per_unit';
      report_type: 'executive' | 'full';
      pillar: string | null;
      unit_id: string | null;
      description: string | null;
      file?: File;
      oldFilePath?: string;
    }) => {
      let filePath = params.oldFilePath;

      if (params.file && params.oldFilePath) {
        await supabase.storage.from('reports').remove([params.oldFilePath]);
        filePath = `${Date.now()}-${params.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('reports').upload(filePath!, params.file, {
          contentType: 'application/pdf',
        });
        if (uploadError) throw uploadError;
      }

      const { error } = await supabase.from('reports').update({
        title: params.title,
        academic_year: params.academic_year,
        reporting_period: params.reporting_period,
        scope: params.scope,
        report_type: params.report_type,
        pillar: params.pillar,
        unit_id: params.unit_id,
        description: params.description,
        ...(filePath ? { file_path: filePath } : {}),
      } as any).eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });
}

export function getReportFileUrl(filePath: string): string {
  const { data } = supabase.storage.from('reports').getPublicUrl(filePath);
  return data.publicUrl;
}
