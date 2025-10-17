import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Query keys
export const ledgerKeys = {
  all: ["ledger_entries"] as const,
  lists: () => [...ledgerKeys.all, "list"] as const,
  list: (projectId: string) => [...ledgerKeys.lists(), projectId] as const,
  details: () => [...ledgerKeys.all, "detail"] as const,
  detail: (id: string) => [...ledgerKeys.details(), id] as const,
};

export interface LedgerEntry {
  id: string;
  short_id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  entry_type: string;
  summary: string;
  source_type?: string;
  source_thread_id?: string;
  source_files?: string[];
  details: {
    key_points?: string[];
    pending_items?: string[];
    action_items?: Array<{
      task: string;
      assignee?: string;
      due_date?: string;
      completed?: boolean;
    }>;
  };
  tags: string[];
  visibility: string;
  is_shared_with?: string[];
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string;
  deleted_by?: string;
}

/**
 * Fetch all ledger entries for a project
 */
export function useLedgerEntries(projectId: string) {
  return useQuery({
    queryKey: ledgerKeys.list(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledger_entries" as any)
        .select("*")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any as LedgerEntry[];
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch a single ledger entry
 */
export function useLedgerEntry(id: string) {
  return useQuery({
    queryKey: ledgerKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledger_entries" as any)
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as any as LedgerEntry;
    },
    enabled: !!id,
  });
}

/**
 * Create a new ledger entry
 */
export function useCreateLedgerEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (entry: Partial<LedgerEntry>) => {
      const { data, error } = await supabase
        .from("ledger_entries" as any)
        .insert(entry as any)
        .select()
        .single();

      if (error) throw error;
      return data as any as LedgerEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.list(data.project_id) });
      toast({
        title: "Ledger entry created",
        description: "The entry has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating ledger entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Update a ledger entry
 */
export function useUpdateLedgerEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LedgerEntry> }) => {
      const { data, error } = await supabase
        .from("ledger_entries" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as any as LedgerEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.list(data.project_id) });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.detail(data.id) });
      toast({
        title: "Ledger entry updated",
        description: "Changes saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating ledger entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Delete a ledger entry (soft delete)
 */
export function useDeleteLedgerEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { data, error } = await supabase
        .from("ledger_entries" as any)
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
        } as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as any as LedgerEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.list(data.project_id) });
      toast({
        title: "Ledger entry deleted",
        description: "The entry has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting ledger entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
