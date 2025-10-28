-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create evolution_config table for global Evolution API settings
CREATE TABLE public.evolution_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS on evolution_config
ALTER TABLE public.evolution_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage evolution config
CREATE POLICY "Admins can manage evolution config"
ON public.evolution_config FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add WhatsApp instance fields to agents table
ALTER TABLE public.agents
ADD COLUMN whatsapp_instance_name TEXT,
ADD COLUMN whatsapp_status TEXT DEFAULT 'disconnected' CHECK (whatsapp_status IN ('disconnected', 'connecting', 'connected', 'error')),
ADD COLUMN whatsapp_qr_code TEXT,
ADD COLUMN whatsapp_phone_number TEXT,
ADD COLUMN whatsapp_connected_at TIMESTAMP WITH TIME ZONE;

-- Create trigger for evolution_config updated_at
CREATE TRIGGER update_evolution_config_updated_at
BEFORE UPDATE ON public.evolution_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert first admin user (will be set via edge function or manually)
-- This is just a placeholder, actual admin assignment should be done securely