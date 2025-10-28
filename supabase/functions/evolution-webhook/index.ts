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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookData = await req.json();
    console.log('Evolution webhook received:', JSON.stringify(webhookData, null, 2));

    const { instance, event, data } = webhookData;

    if (!instance) {
      console.error('No instance in webhook');
      return new Response(JSON.stringify({ error: 'No instance provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find agent by instance name
    const { data: agent, error: findError } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('whatsapp_instance_name', instance)
      .single();

    if (findError || !agent) {
      console.error('Agent not found for instance:', instance, findError);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle different event types
    switch (event) {
      case 'qrcode.updated':
      case 'QRCODE_UPDATED':
        if (data?.qrcode) {
          await supabaseAdmin
            .from('agents')
            .update({
              whatsapp_qr_code: data.qrcode.base64 || data.qrcode,
              whatsapp_status: 'connecting',
            })
            .eq('id', agent.id);
          console.log('QR code updated for agent:', agent.id);
        }
        break;

      case 'connection.update':
      case 'CONNECTION_UPDATE':
        const state = data?.state || data?.connection;
        let status = 'connecting';
        
        if (state === 'open' || state === 'connected') {
          status = 'connected';
          await supabaseAdmin
            .from('agents')
            .update({
              whatsapp_status: status,
              whatsapp_qr_code: null,
              whatsapp_phone_number: data?.phoneNumber || null,
              whatsapp_connected_at: new Date().toISOString(),
            })
            .eq('id', agent.id);
          console.log('Agent connected:', agent.id);
        } else if (state === 'close' || state === 'disconnected') {
          status = 'disconnected';
          await supabaseAdmin
            .from('agents')
            .update({
              whatsapp_status: status,
              whatsapp_qr_code: null,
            })
            .eq('id', agent.id);
          console.log('Agent disconnected:', agent.id);
        }
        break;

      case 'messages.upsert':
      case 'MESSAGES_UPSERT':
        // Handle incoming messages - aqui você pode processar mensagens recebidas
        console.log('Message received for agent:', agent.id, data);
        // TODO: Implement message processing with AI agent
        break;

      default:
        console.log('Unhandled event type:', event);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in evolution-webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
