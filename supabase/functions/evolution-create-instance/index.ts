import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { agentId } = await req.json();
    console.log('Creating Evolution instance for agent:', agentId);

    // Get Evolution config
    const { data: config, error: configError } = await supabaseClient
      .from('evolution_config')
      .select('*')
      .single();

    if (configError || !config) {
      console.error('Evolution config not found:', configError);
      return new Response(
        JSON.stringify({ error: 'Configuração da Evolution API não encontrada. Configure primeiro no painel de administração.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get agent details
    const { data: agent, error: agentError } = await supabaseClient
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      console.error('Agent not found:', agentError);
      return new Response(
        JSON.stringify({ error: 'Agente não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique instance name
    const instanceName = `agent_${agentId.substring(0, 8)}_${Date.now()}`;

    // Create instance in Evolution API
    const createResponse = await fetch(`${config.base_url}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.api_key,
      },
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Evolution API create error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar instância na Evolution API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const instanceData = await createResponse.json();
    console.log('Instance created:', instanceData);

    // Configure webhook for this instance
    const webhookResponse = await fetch(`${config.base_url}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.api_key,
      },
      body: JSON.stringify({
        enabled: true,
        url: config.webhook_url,
        webhookByEvents: true,
        webhookBase64: false,
        events: [
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'SEND_MESSAGE',
        ],
      }),
    });

    if (!webhookResponse.ok) {
      console.error('Webhook configuration failed, but continuing...');
    }

    // Update agent with instance name and set status to connecting
    const { error: updateError } = await supabaseClient
      .from('agents')
      .update({
        whatsapp_instance_name: instanceName,
        whatsapp_status: 'connecting',
        whatsapp_qr_code: instanceData.qrcode?.base64 || null,
      })
      .eq('id', agentId);

    if (updateError) {
      console.error('Error updating agent:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar agente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        instanceName: instanceName,
        qrcode: instanceData.qrcode?.base64 || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in evolution-create-instance:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
