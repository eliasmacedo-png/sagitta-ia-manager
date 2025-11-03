import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all agents with Evolution API details
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select(`
        *,
        profiles!agents_user_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `);

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch agents' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Evolution API config
    const { data: evolutionConfig, error: configError } = await supabase
      .from('evolution_config')
      .select('*')
      .single();

    if (configError || !evolutionConfig) {
      console.error('Error fetching Evolution config:', configError);
      return new Response(
        JSON.stringify({ error: 'Evolution API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get AI config
    const { data: aiConfig } = await supabase
      .from('ai_config')
      .select('*')
      .single();

    // Prepare webhook data for all agents
    const webhookData = {
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        instructions: agent.instructions,
        status: agent.status,
        tags: agent.tags,
        avatar_url: agent.avatar_url,
        user: {
          id: agent.profiles?.id,
          full_name: agent.profiles?.full_name,
          avatar_url: agent.profiles?.avatar_url,
        },
        whatsapp: {
          instance_name: agent.whatsapp_instance_name,
          status: agent.whatsapp_status,
          phone_number: agent.whatsapp_phone_number,
          connected_at: agent.whatsapp_connected_at,
          instance_api_key: agent.api_key,
        },
        ai: {
          provider: agent.ai_provider || agent.model_provider,
          model: agent.ai_model || agent.model_name,
          api_key: agent.ai_api_key,
        },
        knowledge_base: agent.knowledge_base,
      })),
      evolution_api: {
        base_url: evolutionConfig.base_url,
        webhook_url: evolutionConfig.webhook_url,
      },
      ai_config: aiConfig ? {
        mode: aiConfig.mode,
        available_providers: aiConfig.available_providers,
        centralized_configs: aiConfig.mode === 'centralized' ? aiConfig.provider_configs : null,
      } : null,
      timestamp: new Date().toISOString(),
    };

    console.log('Webhook data prepared:', JSON.stringify(webhookData, null, 2));

    return new Response(
      JSON.stringify(webhookData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in agent webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
