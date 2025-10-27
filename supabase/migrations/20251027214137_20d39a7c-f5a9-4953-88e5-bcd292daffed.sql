-- Add new columns to agents table
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS instructions text,
ADD COLUMN IF NOT EXISTS knowledge_base jsonb DEFAULT '{"files": [], "text": "", "urls": []}'::jsonb,
ADD COLUMN IF NOT EXISTS model_provider text,
ADD COLUMN IF NOT EXISTS model_name text,
ADD COLUMN IF NOT EXISTS api_key text,
ADD COLUMN IF NOT EXISTS agent_api_key text DEFAULT 'sgt_' || substr(md5(random()::text), 1, 32);

-- Update status column to have default 'draft'
ALTER TABLE public.agents
ALTER COLUMN status SET DEFAULT 'draft'::text;

-- Create storage bucket for agent avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('agent-avatars', 'agent-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for agent avatars
CREATE POLICY "Anyone can view agent avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'agent-avatars');

CREATE POLICY "Authenticated users can upload agent avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agent-avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own agent avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'agent-avatars'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own agent avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'agent-avatars'
  AND auth.role() = 'authenticated'
);