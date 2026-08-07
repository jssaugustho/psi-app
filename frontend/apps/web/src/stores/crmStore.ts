import { create } from 'zustand';
import { api, PipelineColumn, Contact } from '@/lib/api';

interface CrmState {
  columns: PipelineColumn[];
  contacts: Contact[];
  loading: boolean;
  error: string | null;

  // Abas abertas (Leads abertos)
  openContactIds: string[];
  activeContactId: string | null;

  // Actions
  fetchCrmData: (tenantId: string) => Promise<void>;
  addContactOptimistic: (contact: {
    tenant_id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    status: string;
    source?: string | null;
    screening_notes?: string | null;
  }) => Promise<void>;
  updateContactOptimistic: (id: string, updates: Partial<Contact>) => Promise<void>;
  moveContactOptimistic: (
    contactId: string,
    fromStatus: string,
    toStatus: string,
    tenantId: string
  ) => Promise<void>;
  deleteContactOptimistic: (id: string) => Promise<void>;
  addColumnOptimistic: (name: string, tenantId: string, slug?: string, color?: string, category?: 'pendente' | 'acolhimento' | 'paciente' | 'alta' | 'negativa') => Promise<void>;
  updateColumnOptimistic: (id: string, updates: Partial<PipelineColumn>) => Promise<void>;
  deleteColumnOptimistic: (id: string) => Promise<void>;

  // Actions das abas
  initTabs: (tenantId: string) => void;
  openContactTab: (contact: Contact, tenantId: string) => void;
  openTimelineTab: (tenantId: string) => void;
  closeContactTab: (id: string, tenantId: string) => void;
  setActiveContact: (id: string | null, tenantId: string) => void;

  // Realtime Actions
  handleRealtimeContactCreated: (contact: Contact) => void;
  handleRealtimeContactUpdated: (contact: Contact) => void;
  handleRealtimeContactDeleted: (id: string) => void;
}

export const useCrmStore = create<CrmState>((set, get) => ({
  columns: [],
  contacts: [],
  loading: false,
  error: null,
  openContactIds: [],
  activeContactId: null,

  initTabs: (tenantId: string) => {
    if (typeof window === 'undefined') return;
    const savedTabs = sessionStorage.getItem(`psi_crm_open_tabs_${tenantId}`);
    const savedActive = sessionStorage.getItem(`psi_crm_active_tab_${tenantId}`);
    set({
      openContactIds: savedTabs ? JSON.parse(savedTabs) : [],
      activeContactId: savedActive || null,
    });
  },

  openContactTab: (contact, tenantId) => {
    const { openContactIds } = get();
    const nextTabs = openContactIds.includes(contact.id)
      ? openContactIds
      : [...openContactIds, contact.id];
    
    set({ openContactIds: nextTabs, activeContactId: contact.id });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`psi_crm_open_tabs_${tenantId}`, JSON.stringify(nextTabs));
      sessionStorage.setItem(`psi_crm_active_tab_${tenantId}`, contact.id);
    }
  },

  openTimelineTab: (tenantId) => {
    const { openContactIds } = get();
    const nextTabs = openContactIds.includes('__timeline')
      ? openContactIds
      : [...openContactIds, '__timeline'];
    
    set({ openContactIds: nextTabs, activeContactId: '__timeline' });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`psi_crm_open_tabs_${tenantId}`, JSON.stringify(nextTabs));
      sessionStorage.setItem(`psi_crm_active_tab_${tenantId}`, '__timeline');
    }
  },

  closeContactTab: (id, tenantId) => {
    const { openContactIds, activeContactId } = get();
    const nextTabs = openContactIds.filter((tabId) => tabId !== id);
    let nextActive = activeContactId;

    if (activeContactId === id) {
      nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : null;
    }

    set({ openContactIds: nextTabs, activeContactId: nextActive });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`psi_crm_open_tabs_${tenantId}`, JSON.stringify(nextTabs));
      sessionStorage.setItem(`psi_crm_active_tab_${tenantId}`, nextActive || '');
    }
  },

  setActiveContact: (id, tenantId) => {
    set({ activeContactId: id });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`psi_crm_active_tab_${tenantId}`, id || '');
    }
  },

  fetchCrmData: async (tenantId: string) => {
    set({ loading: true, error: null });
    try {
      const [columns, contacts] = await Promise.all([
        api.getPipelineColumns(tenantId),
        api.getContacts(tenantId),
      ]);
      set({ columns, contacts, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Falha ao buscar dados do CRM', loading: false });
    }
  },

  addContactOptimistic: async (contactData) => {
    const tempId = crypto.randomUUID();
    const tempContact: Contact = {
      id: tempId,
      tenant_id: contactData.tenant_id,
      name: contactData.name,
      phone: contactData.phone || null,
      email: contactData.email || null,
      status: contactData.status,
      source: contactData.source || 'Manual',
      screening_notes: contactData.screening_notes || null,
      next_contact_at: null,
      last_contact_at: null,
      emergency_contact_name: null,
      emergency_contact_relation: null,
      emergency_contact_phone: null,
      is_minor: false,
      accepted_contract_at: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update local state immediately
    const prevContacts = get().contacts;
    set({ contacts: [tempContact, ...prevContacts] });

    try {
      const realContact = await api.createContact(contactData);
      // Replace temporary lead with real database lead
      set({
        contacts: get().contacts.map((c) => (c.id === tempId ? realContact : c)),
      });

      // Insert log in timeline
      await api.createInteractionHistory({
        contact_id: realContact.id,
        tenant_id: contactData.tenant_id,
        type: 'comment',
        notes: 'Contato cadastrado manualmente no CRM.',
      });
    } catch (err) {
      // Revert if error
      set({ contacts: prevContacts });
      throw err;
    }
  },

  updateContactOptimistic: async (id, updates) => {
    const prevContacts = get().contacts;
    
    // Update local state immediately
    set({
      contacts: prevContacts.map((c) => (c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c)),
    });

    try {
      const dbUpdates: Partial<Contact> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.screening_notes !== undefined) dbUpdates.screening_notes = updates.screening_notes;
      if (updates.source !== undefined) dbUpdates.source = updates.source;
      if (updates.next_contact_at !== undefined) dbUpdates.next_contact_at = updates.next_contact_at;
      if (updates.emergency_contact_name !== undefined) dbUpdates.emergency_contact_name = updates.emergency_contact_name;
      if (updates.emergency_contact_relation !== undefined) dbUpdates.emergency_contact_relation = updates.emergency_contact_relation;
      if (updates.emergency_contact_phone !== undefined) dbUpdates.emergency_contact_phone = updates.emergency_contact_phone;
      if (updates.is_minor !== undefined) dbUpdates.is_minor = updates.is_minor;
      if (updates.accepted_contract_at !== undefined) dbUpdates.accepted_contract_at = updates.accepted_contract_at;

      await api.updateContact(id, dbUpdates);
    } catch (err) {
      // Revert if error
      set({ contacts: prevContacts });
      throw err;
    }
  },

  moveContactOptimistic: async (contactId, fromStatus, toStatus, tenantId) => {
    if (fromStatus === toStatus) return;

    const prevContacts = get().contacts;

    // 1. Update status locally
    set({
      contacts: prevContacts.map((c) =>
        c.id === contactId
          ? { ...c, status: toStatus, updated_at: new Date().toISOString(), last_contact_at: new Date().toISOString() }
          : c
      ),
    });

    try {
      // 2. Persist update on backend
      await api.updateContact(contactId, {
        status: toStatus,
        last_contact_at: new Date().toISOString(),
      });

      // 3. Create interaction log in timeline
      await api.createInteractionHistory({
        contact_id: contactId,
        tenant_id: tenantId,
        type: 'status_change',
        notes: `Estágio alterado de "${fromStatus}" para "${toStatus}".`,
      });
    } catch (err) {
      // Revert if error
      set({ contacts: prevContacts });
      throw err;
    }
  },

  deleteContactOptimistic: async (id) => {
    const prevContacts = get().contacts;
    set({ contacts: prevContacts.filter((c) => c.id !== id) });

    try {
      await api.deleteContact(id);
    } catch (err) {
      set({ contacts: prevContacts });
      throw err;
    }
  },

  addColumnOptimistic: async (name, tenantId, slug, color, category) => {
    const prevColumns = get().columns;
    const order = prevColumns.length > 0 ? Math.max(...prevColumns.map((c) => c.order)) + 1 : 1;
    const calculatedSlug = slug || name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const calculatedColor = color || '#6366F1';
    const calculatedCategory = category || 'acolhimento';

    const tempId = crypto.randomUUID();
    const tempColumn: PipelineColumn = {
      id: tempId,
      tenant_id: tenantId,
      name,
      slug: calculatedSlug,
      color: calculatedColor,
      category: calculatedCategory,
      order,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    set({ columns: [...prevColumns, tempColumn] });

    try {
      const realColumn = await api.createPipelineColumn({
        tenant_id: tenantId,
        name,
        slug: calculatedSlug,
        color: calculatedColor,
        category: calculatedCategory,
        order,
      });

      set({
        columns: get().columns.map((c) => (c.id === tempId ? realColumn : c)),
      });
    } catch (err) {
      set({ columns: prevColumns });
      throw err;
    }
  },

  updateColumnOptimistic: async (id, updates) => {
    const prevColumns = get().columns;
    set({
      columns: prevColumns.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    });
    try {
      await api.updatePipelineColumn(id, updates);
    } catch (err) {
      set({ columns: prevColumns });
      throw err;
    }
  },

  deleteColumnOptimistic: async (id) => {
    const prevColumns = get().columns;
    set({ columns: prevColumns.filter((c) => c.id !== id) });

    try {
      await api.deletePipelineColumn(id);
    } catch (err) {
      set({ columns: prevColumns });
      throw err;
    }
  },

  handleRealtimeContactCreated: (contact) => {
    const { contacts } = get();
    if (contacts.some((c) => c.id === contact.id)) return;
    set({ contacts: [contact, ...contacts] });
  },

  handleRealtimeContactUpdated: (contact) => {
    const { contacts } = get();
    set({
      contacts: contacts.map((c) => (c.id === contact.id ? { ...c, ...contact } : c)),
    });
  },

  handleRealtimeContactDeleted: (id) => {
    const { contacts } = get();
    set({ contacts: contacts.filter((c) => c.id !== id) });
  },
}));
