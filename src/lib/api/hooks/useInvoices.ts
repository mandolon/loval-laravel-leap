import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Invoice, InvoiceLineItem, CreateInvoiceInput, UpdateInvoiceInput, CreateInvoiceLineItemInput } from '../types';

export const useInvoices = (projectId: string) => {
  return useQuery({
    queryKey: ['invoices', projectId],
    queryFn: async () => {
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          created_by_user:users!invoices_created_by_fkey(id, name, email, avatar_url)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      const invoiceIds = invoices?.map(i => i.id) || [];
      
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .in('invoice_id', invoiceIds)
        .order('sort_order', { ascending: true });

      if (lineItemsError) throw lineItemsError;

      const result = invoices?.map(invoice => ({
        id: invoice.id,
        shortId: invoice.short_id,
        invoiceNumber: invoice.invoice_number,
        projectId: invoice.project_id,
        submittedToNames: invoice.submitted_to_names || [],
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        paidDate: invoice.paid_date || undefined,
        paymentMethod: invoice.payment_method || undefined,
        paymentReference: invoice.payment_reference || undefined,
        paidAmount: invoice.paid_amount || undefined,
        subtotal: Number(invoice.subtotal),
        processingFeePercent: Number(invoice.processing_fee_percent),
        processingFeeAmount: invoice.processing_fee_amount ? Number(invoice.processing_fee_amount) : undefined,
        total: Number(invoice.total),
        status: invoice.status as Invoice['status'],
        notes: invoice.notes || undefined,
        createdBy: invoice.created_by,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
        updatedBy: invoice.updated_by || undefined,
        deletedAt: invoice.deleted_at || undefined,
        deletedBy: invoice.deleted_by || undefined,
        lineItems: lineItems?.filter(li => li.invoice_id === invoice.id).map(li => ({
          id: li.id,
          shortId: li.short_id,
          invoiceId: li.invoice_id,
          phase: li.phase as InvoiceLineItem['phase'],
          description: li.description,
          amount: Number(li.amount),
          sortOrder: li.sort_order,
          createdAt: li.created_at,
          updatedAt: li.updated_at,
        })) || [],
      })) || [];

      return result as (Invoice & { lineItems: InvoiceLineItem[] })[];
    },
    enabled: !!projectId,
  });
};

export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          created_by_user:users!invoices_created_by_fkey(id, name, email, avatar_url)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: lineItems, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', id)
        .order('sort_order', { ascending: true });

      if (lineItemsError) throw lineItemsError;

      const result = {
        id: invoice.id,
        shortId: invoice.short_id,
        invoiceNumber: invoice.invoice_number,
        projectId: invoice.project_id,
        submittedToNames: invoice.submitted_to_names || [],
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        paidDate: invoice.paid_date || undefined,
        paymentMethod: invoice.payment_method || undefined,
        paymentReference: invoice.payment_reference || undefined,
        paidAmount: invoice.paid_amount || undefined,
        subtotal: Number(invoice.subtotal),
        processingFeePercent: Number(invoice.processing_fee_percent),
        processingFeeAmount: invoice.processing_fee_amount ? Number(invoice.processing_fee_amount) : undefined,
        total: Number(invoice.total),
        status: invoice.status as Invoice['status'],
        notes: invoice.notes || undefined,
        createdBy: invoice.created_by,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
        updatedBy: invoice.updated_by || undefined,
        deletedAt: invoice.deleted_at || undefined,
        deletedBy: invoice.deleted_by || undefined,
        lineItems: lineItems?.map(li => ({
          id: li.id,
          shortId: li.short_id,
          invoiceId: li.invoice_id,
          phase: li.phase as InvoiceLineItem['phase'],
          description: li.description,
          amount: Number(li.amount),
          sortOrder: li.sort_order,
          createdAt: li.created_at,
          updatedAt: li.updated_at,
        })) || [],
      };

      return result as Invoice & { lineItems: InvoiceLineItem[] };
    },
    enabled: !!id,
  });
};

export const useCreateInvoice = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateInvoiceInput & { lineItems: Omit<CreateInvoiceLineItemInput, 'invoiceId'>[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { lineItems, ...invoiceInput } = input;

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          project_id: invoiceInput.projectId,
          invoice_number: invoiceInput.invoiceNumber,
          submitted_to_names: invoiceInput.submittedToNames,
          invoice_date: invoiceInput.invoiceDate,
          due_date: invoiceInput.dueDate,
          subtotal: invoiceInput.subtotal,
          processing_fee_percent: invoiceInput.processingFeePercent || 3.5,
          processing_fee_amount: invoiceInput.processingFeeAmount,
          total: invoiceInput.total,
          status: invoiceInput.status || 'pending',
          notes: invoiceInput.notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      if (lineItems.length > 0) {
        const { error: lineItemsError } = await supabase
          .from('invoice_line_items')
          .insert(
            lineItems.map((item, index) => ({
              invoice_id: invoice.id,
              phase: item.phase,
              description: item.description,
              amount: item.amount,
              sort_order: item.sortOrder ?? index,
            }))
          );

        if (lineItemsError) throw lineItemsError;
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', projectId] });
      toast({
        title: 'Success',
        description: 'Invoice created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateInvoice = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, input, lineItems }: { 
      id: string; 
      input: UpdateInvoiceInput;
      lineItems?: { 
        toAdd?: Omit<CreateInvoiceLineItemInput, 'invoiceId'>[];
        toUpdate?: { id: string; description?: string; amount?: number; phase?: string; sortOrder?: number }[];
        toDelete?: string[];
      }
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData: any = {
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      };

      if (input.invoiceNumber) updateData.invoice_number = input.invoiceNumber;
      if (input.submittedToNames) updateData.submitted_to_names = input.submittedToNames;
      if (input.invoiceDate) updateData.invoice_date = input.invoiceDate;
      if (input.dueDate) updateData.due_date = input.dueDate;
      if (input.paidDate) updateData.paid_date = input.paidDate;
      if (input.paymentMethod) updateData.payment_method = input.paymentMethod;
      if (input.paymentReference) updateData.payment_reference = input.paymentReference;
      if (input.paidAmount !== undefined) updateData.paid_amount = input.paidAmount;
      if (input.subtotal !== undefined) updateData.subtotal = input.subtotal;
      if (input.processingFeePercent !== undefined) updateData.processing_fee_percent = input.processingFeePercent;
      if (input.processingFeeAmount !== undefined) updateData.processing_fee_amount = input.processingFeeAmount;
      if (input.total !== undefined) updateData.total = input.total;
      if (input.status) updateData.status = input.status;
      if (input.notes !== undefined) updateData.notes = input.notes;

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id);

      if (invoiceError) throw invoiceError;

      if (lineItems) {
        if (lineItems.toDelete && lineItems.toDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('invoice_line_items')
            .delete()
            .in('id', lineItems.toDelete);
          if (deleteError) throw deleteError;
        }

        if (lineItems.toAdd && lineItems.toAdd.length > 0) {
          const { error: addError } = await supabase
            .from('invoice_line_items')
            .insert(
              lineItems.toAdd.map((item, index) => ({
                invoice_id: id,
                phase: item.phase,
                description: item.description,
                amount: item.amount,
                sort_order: item.sortOrder ?? index,
              }))
            );
          if (addError) throw addError;
        }

        if (lineItems.toUpdate && lineItems.toUpdate.length > 0) {
          for (const item of lineItems.toUpdate) {
            const updateItemData: any = {};
            if (item.description !== undefined) updateItemData.description = item.description;
            if (item.amount !== undefined) updateItemData.amount = item.amount;
            if (item.phase !== undefined) updateItemData.phase = item.phase;
            if (item.sortOrder !== undefined) updateItemData.sort_order = item.sortOrder;

            const { error: updateError } = await supabase
              .from('invoice_line_items')
              .update(updateItemData)
              .eq('id', item.id);
            if (updateError) throw updateError;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', projectId] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      toast({
        title: 'Success',
        description: 'Invoice updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteInvoice = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('invoices')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', projectId] });
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
