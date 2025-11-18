import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chunk text into smaller pieces
function chunkText(text: string, chunkSize = 1000): string[] {
  const chunks: string[] = [];
  const words = text.split(/\s+/);
  
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
  }
  
  return chunks;
}

// Retry with exponential backoff for rate limiting
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  initialDelayMs = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimitError = error.message?.includes('429') || error.message?.includes('rate_limit');
      
      if (!isRateLimitError || attempt === maxRetries - 1) {
        throw error;
      }

      // Extract wait time from error message if available (e.g., "Please try again in 969ms")
      const waitMatch = error.message?.match(/try again in (\d+)ms/);
      const waitTime = waitMatch ? parseInt(waitMatch[1]) : initialDelayMs * Math.pow(2, attempt);
      
      console.log(`Rate limit hit (attempt ${attempt + 1}/${maxRetries}), waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  throw new Error('Max retries exceeded');
}

// Generate embeddings using OpenAI (batched)
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  return await retryWithBackoff(async () => {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        dimensions: 768,
        input: texts.map(text => text.substring(0, 8000))
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Embedding API error (${response.status}):`, errorText);
      throw new Error(`Embedding API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const workspaceId = formData.get('workspace_id') as string;
    const projectId = formData.get('project_id') as string | null;
    const fileId = formData.get('file_id') as string | null;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'File is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: 'workspace_id is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Processing file: ${file.name} for workspace: ${workspaceId}`);
    
    // Get auth header and user
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: publicUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .single();
        userId = publicUser?.id || null;
      }
    }

    // Upload file to storage
    const timestamp = Date.now();
    const storagePath = `${workspaceId}/${timestamp}-${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('knowledge-base')
      .upload(storagePath, file);

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    // Read file content
    let text: string;
    try {
      const fileBuffer = await file.arrayBuffer();
      text = new TextDecoder('utf-8', { fatal: false }).decode(fileBuffer);
      
      // Remove null bytes and other problematic characters that PostgreSQL can't handle
      text = text.replace(/\u0000/g, '').replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
      
      if (!text || text.trim().length === 0) {
        throw new Error('File appears to be empty or could not be read as text');
      }
    } catch (error: any) {
      console.error('Error reading file:', error);
      return new Response(
        JSON.stringify({ error: `Failed to read file: ${error.message}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Chunk the content
    const chunks = chunkText(text);
    console.log(`Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No content extracted from file. The file may be empty or contain only whitespace.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Generate embeddings and insert records in batches
    const records: Array<{
      workspace_id: string;
      file_name: string;
      file_path: string;
      chunk_content: string;
      chunk_index: number;
      embedding: string;
      created_by: string | null;
      metadata: {
        file_type: string;
        file_size: number;
        total_chunks: number;
      };
    }> = [];
    const BATCH_SIZE = 100; // Process 100 chunks per API call
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
    
    for (let batchIndex = 0; batchIndex < chunks.length; batchIndex += BATCH_SIZE) {
      const batchNumber = Math.floor(batchIndex / BATCH_SIZE) + 1;
      const batchEnd = Math.min(batchIndex + BATCH_SIZE, chunks.length);
      const batchChunks = chunks.slice(batchIndex, batchEnd);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (chunks ${batchIndex + 1}-${batchEnd})`);
      
      const embeddings = await generateEmbeddings(batchChunks);
      
      batchChunks.forEach((chunk, idx) => {
        records.push({
          workspace_id: workspaceId,
          project_id: projectId,
          file_id: fileId,
          file_name: file.name,
          file_path: storagePath,
          chunk_content: chunk,
          chunk_index: batchIndex + idx,
          embedding: JSON.stringify(embeddings[idx]),
          created_by: userId,
          metadata: {
            file_type: file.type,
            file_size: file.size,
            total_chunks: chunks.length
          }
        } as any);
      });
      
      // Small delay between batches as safety net
      if (batchEnd < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase
        .from('knowledge_base')
        .insert(batch);
      
      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
    }

    console.log(`Inserted ${records.length} records`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunksCreated: records.length,
        fileName: file.name
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    const statusCode = error?.status || 500;
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode 
      }
    );
  }
});