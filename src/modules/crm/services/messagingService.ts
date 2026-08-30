import { supabase } from '../../../lib/supabase';

export type MessageChannel = 'whatsapp' | 'email' | 'instagram' | 'facebook' | 'manual';

interface MessagePayload {
  customerId: string;
  companyId: string;
  channel: MessageChannel;
  content: string;
}

/**
 * Service to handle sending messages via different channels.
 * For now, this is a simulation. In a real environment, this would
 * call a Backend API or a Cloudflare Worker that interfaces with
 * providers like Twilio, SendGrid, etc.
 */
export const MessagingService = {
  async sendMessage({ customerId, companyId, channel, content }: MessagePayload) {
    console.log(`[MessagingService] Sending ${channel} message to ${customerId}...`);

    // SIMULATION: Artificial delay to mimic network request
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // SIMULATION: 5% chance of failure to test error handling
    if (Math.random() < 0.05) {
      throw new Error('Proveedor de mensajería temporalmente no disponible');
    }

    // Record the interaction in the database
    const { data, error } = await supabase
      .from('customer_interactions')
      .insert({
        customer_id: customerId,
        company_id: companyId,
        channel: channel,
        direction: 'outbound',
        content: content,
        read: true, // Outbound messages are considered "read" by the sender
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Simulation tool: Trigger an incoming message to test Realtime functionality.
   * This would normally be triggered by a Webhook from the provider.
   */
  async simulateIncomingMessage(customerId: string, companyId: string, content: string, channel: MessageChannel = 'whatsapp') {
    const { data, error } = await supabase
      .from('customer_interactions')
      .insert({
        customer_id: customerId,
        company_id: companyId,
        channel: channel,
        direction: 'inbound',
        content: content,
        read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
