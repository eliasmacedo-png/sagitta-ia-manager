-- Add AI configuration for centralized vs decentralized mode
CREATE TABLE IF NOT EXISTS public.ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL DEFAULT 'decentralized' CHECK (mode IN ('centralized', 'decentralized')),
  available_providers JSONB DEFAULT '{"openai": true, "anthropic": true, "google": true}'::jsonb,
  provider_configs JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage AI config
CREATE POLICY "Admins can manage AI config"
ON public.ai_config
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Add AI provider fields to agents table
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS ai_provider TEXT,
ADD COLUMN IF NOT EXISTS ai_model TEXT,
ADD COLUMN IF NOT EXISTS ai_api_key TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);