import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import { MessagingService } from '../../../services/messagingService';
import { Badge, Avatar } from '../../../shared/components/ui';
import {
  MessageSquare,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Send,
  Search,
  User,
  ShoppingCart,
  Wallet,
  FileText,
  Loader2
} from 'lucide-react';
import Swal from 'sweetalert2';

interface Interaction {
  id: string;
  customer_id: string;
  company_id: string;
  channel: 'whatsapp' | 'email' | 'instagram' | 'facebook' | 'manual';
  direction: 'inbound' | 'outbound';
  content: string;
  metadata: any;
  created_at: string;
  read: boolean;
}

interface InboxContact {
  customer_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  last_message: string;
  last_timestamp: string;
  channel: string;
  unread_count: number;
}

export const OmnichannelInbox = () => {
  const companyId = useTenantStore((state) => state.activeCompanyId);
  const [contacts, setContacts] = useState<InboxContact[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const selectedCustomerRef = useRef<string | null>(null);

  useEffect(() => {
    selectedCustomerRef.current = selectedCustomerId;
  }, [selectedCustomerId]);

  const [messages, setMessages] = useState<Interaction[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Fetch contacts with their last message
  const fetchInbox = async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data: interactions, error } = await supabase
        .from('customer_interactions')
        .select(`
          id,
          content,
          created_at,
          channel,
          read,
          customers (
            id,
            name,
            phone,
            email
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const contactMap = new Map<string, InboxContact>();

      // First pass: find the last message and start unread count
      interactions?.forEach((int: any) => {
        const cust = int.customers;
        if (!cust) return;

        if (!contactMap.has(cust.id)) {
          contactMap.set(cust.id, {
            customer_id: cust.id,
            name: cust.name,
            phone: cust.phone,
            email: cust.email,
            last_message: int.content,
            last_timestamp: int.created_at,
            channel: int.channel,
            unread_count: 0
          });
        }

        // Increment unread count if it's an inbound message and not read
        if (int.direction === 'inbound' && !int.read) {
          const contact = contactMap.get(cust.id)!;
          contact.unread_count += 1;
        }
      });

      setContacts(Array.from(contactMap.values()));
    } catch (err) {
      console.error('Error fetching inbox:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();

    // Realtime subscription for new messages
    const channel = supabase
      .channel('crm-inbox-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customer_interactions',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Interaction;

          // 1. Update messages list if this is the selected customer
          if (selectedCustomerRef.current === newMessage.customer_id) {
            setMessages((prev) => [...prev, newMessage]);
          }

          // 2. Update contacts list
          const { data: customer } = await supabase
            .from('customers')
            .select('name, phone, email')
            .eq('id', newMessage.customer_id)
            .single();

          if (customer) {
            setContacts((prev) => {
              const existingIndex = prev.findIndex((c) => c.customer_id === newMessage.customer_id);
              const isNewInbound = newMessage.direction === 'inbound' && selectedCustomerRef.current !== newMessage.customer_id;

              const contactData: InboxContact = {
                customer_id: newMessage.customer_id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                last_message: newMessage.content,
                last_timestamp: newMessage.created_at,
                channel: newMessage.channel,
                unread_count: existingIndex > -1
                  ? (prev[existingIndex].unread_count + (isNewInbound ? 1 : 0))
                  : (isNewInbound ? 1 : 0),
              };

              if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex] = contactData;
                const [item] = updated.splice(existingIndex, 1);
                return [item, ...updated];
              }
              return [contactData, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  const fetchMessages = async (customerId: string) => {
    try {
      // Mark messages as read first
      await supabase
        .from('customer_interactions')
        .update({ read: true })
        .eq('customer_id', customerId)
        .eq('company_id', companyId!)
        .eq('read', false);

      const { data, error } = await supabase
        .from('customer_interactions')
        .select('*')
        .eq('customer_id', customerId)
        .eq('company_id', companyId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as Interaction[]) || []);

      // Update contact list unread count
      setContacts(prev => prev.map(c =>
        c.customer_id === customerId ? { ...c, unread_count: 0 } : c
      ));
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchMessages(selectedCustomerId);
    }
  }, [selectedCustomerId, companyId]);

  const handleSendMessage = async () => {
    if (!selectedCustomerId || !newMessage.trim()) return;
    setIsSending(true);
    try {
      const channel = contacts.find(c => c.customer_id === selectedCustomerId)?.channel || 'manual';

      await MessagingService.sendMessage({
        customerId: selectedCustomerId,
        companyId: companyId!,
        channel: channel as any,
        content: newMessage,
      });

      setNewMessage('');
      await fetchMessages(selectedCustomerId);
      // Optimistic update for the contact list
      setContacts(prev => prev.map(c => c.customer_id === selectedCustomerId ? {
        ...c,
        last_message: newMessage,
        last_timestamp: new Date().toISOString(),
        channel: channel,
      } : c));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err instanceof Error ? err.message : 'No se pudo enviar', background: '#0f172a', color: '#fff' });
    } finally {
      setIsSending(false);
    }
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contacts, searchTerm]);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return <Phone className="w-3 h-3 text-emerald-400" />;
      case 'email': return <Mail className="w-3 h-3 text-blue-400" />;
      case 'instagram': return <Instagram className="w-3 h-3 text-pink-400" />;
      case 'facebook': return <Facebook className="w-3 h-3 text-blue-600" />;
      default: return <MessageSquare className="w-3 h-3 text-slate-400" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 p-4 bg-slate-50 dark:bg-slate-950">
      {/* Columna 1: Lista de Contactos */}
      <div className="w-full md:w-80 bg-white dark:bg-slate-900 rounded-4xl border dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
        <div className="p-5 border-b dark:border-slate-800 space-y-4">
          <h2 className="font-black uppercase tracking-tighter italic dark:text-white text-xl">Bandeja de Entrada</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 dark:text-white border-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-[10px] uppercase font-black">Cargando chats...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <p className="text-center text-xs text-slate-400 mt-10 italic">No hay conversaciones recientes</p>
          ) : (
            filteredContacts.map(c => (
              <div
                key={c.customer_id}
                onClick={() => setSelectedCustomerId(c.customer_id)}
                className={`w-full p-3 rounded-2xl cursor-pointer transition-all group ${
                  selectedCustomerId === c.customer_id
                    ? 'bg-slate-900 text-white shadow-lg scale-[1.02]'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className="font-black text-xs uppercase truncate">{c.name}</p>
                      <div className="flex items-center gap-2">
                        {c.unread_count > 0 && (
                          <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                            {c.unread_count}
                          </span>
                        )}
                        <span className="text-[8px] opacity-50">
                          {c.last_timestamp ? new Date(c.last_timestamp).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getChannelIcon(c.channel)}
                      <p className="text-[10px] truncate opacity-60">{c.last_message}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Columna 2: Chat */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-4xl border dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
        {selectedCustomerId ? (
          <>
            <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <Avatar name={contacts.find(c => c.customer_id === selectedCustomerId)?.name || ''} size="sm" />
                <div>
                  <p className="font-black text-sm uppercase dark:text-white">
                    {contacts.find(c => c.customer_id === selectedCustomerId)?.name}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">
                    {contacts.find(c => c.customer_id === selectedCustomerId)?.phone || 'Sin contacto'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors" title="Llamar">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors" title="Enviar Email">
                  <Mail className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-slate-950/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 italic">
                  <MessageSquare className="w-10 h-10 mb-2" />
                  <p className="text-xs uppercase font-black">No hay mensajes en esta conversación</p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={m.id}
                    className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm ${
                      m.direction === 'outbound'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-slate-800 dark:text-white rounded-tl-none border dark:border-slate-700'
                    }`}>
                      <p className="leading-relaxed">{m.content}</p>
                      <p className={`text-[8px] mt-1 font-bold uppercase ${m.direction === 'outbound' ? 'text-blue-200' : 'text-slate-400'}`}>
                        {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white border-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isSending || !newMessage.trim()}
                  className="p-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-90 shadow-lg shadow-blue-600/20"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <MessageSquare className="w-10 h-10 opacity-20" />
            </div>
            <p className="font-black uppercase italic text-sm tracking-widest">Seleccioná un chat para comenzar</p>
          </div>
        )}
      </div>

      {/* Columna 3: Contexto ERP */}
      <div className="hidden lg:flex w-80 bg-white dark:bg-slate-900 rounded-4xl border dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
        <div className="p-5 border-b dark:border-slate-800">
          <h2 className="font-black uppercase tracking-tighter italic dark:text-white text-lg">Contexto Cliente</h2>
        </div>

        {selectedCustomerId ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Mini Perfil */}
            <div className="text-center space-y-2">
              <Avatar name={contacts.find(c => c.customer_id === selectedCustomerId)?.name || ''} size="lg" />
              <p className="font-black uppercase text-sm dark:text-white">{contacts.find(c => c.customer_id === selectedCustomerId)?.name}</p>
              <Badge variant="default" size="sm">{contacts.find(c => c.customer_id === selectedCustomerId)?.channel}</Badge>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[9px] text-slate-400 uppercase font-black">Saldo Cuenta</p>
                  <p className="text-sm font-black dark:text-white">$ 0,00</p>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[9px] text-slate-400 uppercase font-black">Último Pedido</p>
                  <p className="text-sm font-black dark:text-white">---</p>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[9px] text-slate-400 uppercase font-black">Estado</p>
                  <p className="text-sm font-black dark:text-white">Activo</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t dark:border-slate-800 space-y-3">
              <button
                className="w-full py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase text-xs transition-transform active:scale-95"
                onClick={() => {}}
              >
                Ver Perfil Completo
              </button>
              <button
                className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95"
                onClick={async () => {
                  if (!selectedCustomerId || !companyId) return;
                  try {
                    await MessagingService.simulateIncomingMessage(
                      selectedCustomerId,
                      companyId,
                      "¡Hola! Esta es una respuesta simulada para probar el tiempo real 🚀"
                    );
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                Simular Respuesta Cliente
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-10 text-center">
            <p className="text-slate-400 text-xs uppercase font-black italic">
              Seleccioná un chat para cargar los datos del cliente
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
