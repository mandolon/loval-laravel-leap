import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CodeMetadata {
  code_type: string;
  title: string;
  year: string;
  jurisdiction: string;
}

interface Chunk {
  content: string;
  section: string;
  chapter: string;
}

// Extract metadata from filename/path
function extractMetadata(filename: string): CodeMetadata {
  const parts = filename.split('/');
  const name = parts[parts.length - 1].replace('.pdf', '');
  
  // Try to parse structure: /california/2022/CBC-Title24-Part2.pdf
  const jurisdiction = parts.length >= 3 ? parts[parts.length - 3] : 'california';
  const year = parts.length >= 2 ? parts[parts.length - 2] : '2022';
  const codeType = name.split('-')[0] || name;
  
  return {
    jurisdiction,
    year,
    code_type: codeType,
    title: name
  };
}

// Chunk text by sections
function chunkBySection(text: string): Chunk[] {
  const chunks: Chunk[] = [];
  
  // Regex for building code sections (e.g., "SECTION 503.1" or "503.1")
  const sectionPattern = /(?:SECTION\s+)?(\d{3,4}(?:\.\d+)*)\s*\n([^]*?)(?=(?:SECTION\s+)?\d{3,4}(?:\.\d+)*\s*\n|$)/gi;
  const chapterPattern = /CHAPTER\s+(\d+)/i;
  
  let currentChapter = '';
  const chapterMatch = text.match(chapterPattern);
  if (chapterMatch) {
    currentChapter = chapterMatch[1];
  }

  let match;
  while ((match = sectionPattern.exec(text)) !== null) {
    const sectionNum = match[1];
    const content = match[2].trim();
    
    if (content.length < 50) continue;
    
    // Split large sections
    const maxChunkSize = 3000;
    if (content.length > maxChunkSize) {
      const paragraphs = content.split(/\n\n+/);
      let currentChunk = '';
      let chunkIndex = 0;
      
      for (const para of paragraphs) {
        if ((currentChunk + para).length > maxChunkSize && currentChunk) {
          chunks.push({
            content: currentChunk.trim(),
            section: chunkIndex > 0 ? `${sectionNum} (part ${chunkIndex + 1})` : sectionNum,
            chapter: currentChapter
          });
          currentChunk = para;
          chunkIndex++;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + para;
        }
      }
      
      if (currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          section: chunkIndex > 0 ? `${sectionNum} (part ${chunkIndex + 1})` : sectionNum,
          chapter: currentChapter
        });
      }
    } else {
      chunks.push({
        content,
        section: sectionNum,
        chapter: currentChapter
      });
    }
  }

  // Fallback: chunk by size if no sections found
  if (chunks.length === 0) {
    const words = text.split(/\s+/);
    const chunkSize = 500;
    
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push({
        content: words.slice(i, i + chunkSize).join(' '),
        section: `page-${Math.floor(i / chunkSize) + 1}`,
        chapter: ''
      });
    }
  }

  return chunks;
}

// Generate embeddings using Lovable AI
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const embeddings: number[][] = [];
  const batchSize = 20; // Process in smaller batches
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    const promises = batch.map(async (text) => {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000) // Limit text length
        })
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    });

    const batchEmbeddings = await Promise.all(promises);
    embeddings.push(...batchEmbeddings);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return embeddings;
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
    
    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`Processing file: ${file.name}`);
    
    // Extract metadata
    const metadata = extractMetadata(file.name);
    console.log('Metadata:', metadata);

    // Read and parse PDF
    const fileBuffer = await file.arrayBuffer();
    
    // Note: For a production implementation, you'd want to use a proper PDF parser
    // For now, we'll use a simple text extraction (you may need to add pdf-parse or similar)
    // This is a placeholder - actual PDF parsing would happen here
    const text = new TextDecoder().decode(fileBuffer);
    
    // Chunk the content
    const chunks = chunkBySection(text);
    console.log(`Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error('No content extracted from PDF');
    }

    // Generate embeddings
    console.log('Generating embeddings...');
    const embeddings = await generateEmbeddings(chunks.map(c => c.content));
    console.log('Embeddings generated');

    // Prepare records
    const records = chunks.map((chunk, index) => ({
      content: chunk.content,
      embedding: JSON.stringify(embeddings[index]), // Store as JSON array
      code_type: metadata.code_type,
      title: metadata.title,
      chapter: chunk.chapter,
      section: chunk.section,
      year: metadata.year,
      jurisdiction: metadata.jurisdiction,
      source_file: file.name
    }));

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase
        .from('building_codes')
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
        metadata 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});