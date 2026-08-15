'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useCrmStore } from '@/stores/crmStore';
import { useBrand } from '@/context/BrandContext';
import { useRealtime } from '@/context/RealtimeContext';
import { api, Contact, InteractionHistory, PipelineColumn } from '@/lib/api';
import { Card, Select, ConfirmModal } from '@psi/ui';
import { ContactTabPanel } from './components/ContactTabPanel';
import { GlobalTimelinePanel } from './components/GlobalTimelinePanel';
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  Phone,
  Mail,
  FileText,
  Filter,
  X,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  Table as TableIcon,
  Kanban as KanbanIcon,
  Tag,
  Clock,
  ArrowRight,
  Edit,
  Edit2,
  Settings,
  GripVertical,
  Activity
} from 'lucide-react';

interface TrafficSourceObj {
  id: string;
  name: string;
  color: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
}

const PRESETS = [
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Fuchsia', hex: '#D946EF' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Lime', hex: '#84CC16' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Sky', hex: '#0EA5E9' },
  { name: 'Blue', hex: '#3B82F6' },
];

const normalizeTrafficSources = (sources: any[] | undefined | null): TrafficSourceObj[] => {
  if (!sources || !Array.isArray(sources)) {
    sources = ['Manual', 'Instagram', 'Google Ads', 'Facebook Ads', 'Webhook'];
  }
  return sources.map((src, idx) => {
    if (typeof src === 'string') {
      const id = src.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-');
      const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#14B8A6'];
      return {
        id,
        name: src,
        color: colors[idx % colors.length] || '#6366F1',
        utm_source: id,
        utm_medium: '',
        utm_campaign: '',
      };
    }
    return {
      id: src.id || src.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `source-${idx}`,
      name: src.name || 'Sem nome',
      color: src.color || '#6366F1',
      utm_source: src.utm_source || '',
      utm_medium: src.utm_medium || '',
      utm_campaign: src.utm_campaign || '',
    };
  });
};

export default function CrmPage() {
  const { tenant } = useBrand();
  const tenantId = tenant?.id;

  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'column' | 'lead';
    id: string;
    name?: string;
  } | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const renderPortal = (content: React.ReactNode) => {
    if (!mounted || typeof document === 'undefined') return null;
    return createPortal(content, document.body);
  };

  const {
    columns,
    contacts,
    loading,
    error,
    fetchCrmData,
    addContactOptimistic,
    updateContactOptimistic,
    moveContactOptimistic,
    deleteContactOptimistic,
    addColumnOptimistic,
    updateColumnOptimistic,
    deleteColumnOptimistic,
    reorderColumnsOptimistic,
    openContactIds,
    activeContactId,
    initTabs,
    openContactTab,
    openTimelineTab,
    closeContactTab,
    setActiveContact,
  } = useCrmStore();

  // Estados locais da UI
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  
  // Modais e abas
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'pipeline' | 'sources'>('pipeline');

  // Fontes de tráfego locais (estruturadas)
  const { reloadBrand } = useBrand();
  const [localTrafficSources, setLocalTrafficSources] = useState<TrafficSourceObj[]>([]);
  const [localDefaultSource, setLocalDefaultSource] = useState('Manual');
  const [savingSettings, setSavingSettings] = useState(false);

  // Formulário para Nova Fonte de Tráfego
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceColor, setNewSourceColor] = useState('#6366F1');
  const [newSourceUtmSource, setNewSourceUtmSource] = useState('');
  const [newSourceUtmMedium, setNewSourceUtmMedium] = useState('');
  const [newSourceUtmCampaign, setNewSourceUtmCampaign] = useState('');

  // Formulário de Nova Coluna (com slug, color e category)
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnSlug, setNewColumnSlug] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#6366F1');
  const [newColumnCategory, setNewColumnCategory] = useState<'pendente' | 'acolhimento' | 'paciente' | 'alta' | 'negativa'>('acolhimento');

  // Estados de Edição
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);

  // Estados de Drag and Drop
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
  const [dragOverColumnIndex, setDragOverColumnIndex] = useState<number | null>(null);
  const [draggedSourceIndex, setDraggedSourceIndex] = useState<number | null>(null);
  const [dragOverSourceIndex, setDragOverSourceIndex] = useState<number | null>(null);

  // Handlers para Drag and Drop de Colunas (Estágios)
  const handleColumnDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColumnIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnIndex !== index) {
      setDragOverColumnIndex(index);
    }
  };

  const handleColumnDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedColumnIndex === null || draggedColumnIndex === dropIndex) {
      setDraggedColumnIndex(null);
      setDragOverColumnIndex(null);
      return;
    }
    const updated = [...columns];
    const [moved] = updated.splice(draggedColumnIndex, 1);
    updated.splice(dropIndex, 0, moved);

    setDraggedColumnIndex(null);
    setDragOverColumnIndex(null);

    try {
      await reorderColumnsOptimistic(updated);
    } catch (err) {
      console.error(err);
      alert('Erro ao reordenar estágios.');
    }
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnIndex(null);
    setDragOverColumnIndex(null);
  };

  // Handlers para Drag and Drop de Fontes de Tráfego
  const handleSourceDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSourceIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSourceDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSourceIndex !== index) {
      setDragOverSourceIndex(index);
    }
  };

  const handleSourceDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedSourceIndex === null || draggedSourceIndex === dropIndex) {
      setDraggedSourceIndex(null);
      setDragOverSourceIndex(null);
      return;
    }
    const updated = [...localTrafficSources];
    const [moved] = updated.splice(draggedSourceIndex, 1);
    updated.splice(dropIndex, 0, moved);

    setLocalTrafficSources(updated);
    setDraggedSourceIndex(null);
    setDragOverSourceIndex(null);
  };

  const handleSourceDragEnd = () => {
    setDraggedSourceIndex(null);
    setDragOverSourceIndex(null);
  };

  useEffect(() => {
    if (tenant) {
      const normalized = normalizeTrafficSources(tenant.traffic_sources);
      setLocalTrafficSources(normalized);
      setLocalDefaultSource(tenant.default_traffic_source || 'Manual');
    }
  }, [tenant, isSettingsOpen]);

  // Função auxiliar para resolver a cor e dados da origem de tráfego
  const getSourceDetails = useCallback((sourceName: string | null | undefined) => {
    const list = tenant?.traffic_sources;
    const normalized = normalizeTrafficSources(list);
    const found = normalized.find(s => s.name.toLowerCase() === (sourceName || 'Manual').toLowerCase());
    return found ? { color: found.color, name: found.name } : { color: '#64748B', name: sourceName || 'Manual' };
  }, [tenant]);

  // Formulário de Novo Lead
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'Manual',
    notes: '',
    status: '',
  });

  useEffect(() => {
    if (isAddContactOpen) {
      setNewLeadForm({
        name: '',
        phone: '',
        email: '',
        source: tenant?.default_traffic_source || 'Manual',
        notes: '',
        status: columns[0]?.name || '',
      });
    }
  }, [isAddContactOpen, tenant, columns]);

  // Carregar dados iniciais e abas salvas
  useEffect(() => {
    if (tenantId) {
      fetchCrmData(tenantId);
      initTabs(tenantId);
    }
  }, [tenantId, fetchCrmData, initTabs]);

  // Inscrição em tempo real para leads/contatos
  const { subscribe } = useRealtime();
  const { handleRealtimeContactCreated, handleRealtimeContactUpdated, handleRealtimeContactDeleted } = useCrmStore();

  useEffect(() => {
    if (!tenantId) return;

    const unsubscribe = subscribe('lead', (event) => {
      // Ignora eventos que não pertencem ao tenant ativo
      if (event.tenantId !== tenantId) return;

      switch (event.action) {
        case 'created':
          handleRealtimeContactCreated(event.data);
          break;
        case 'updated':
          handleRealtimeContactUpdated(event.data);
          break;
        case 'deleted':
          handleRealtimeContactDeleted(event.data.id);
          break;
      }
    });

    return () => unsubscribe();
  }, [tenantId, subscribe, handleRealtimeContactCreated, handleRealtimeContactUpdated, handleRealtimeContactDeleted]);



  // Obter lista única de sources para o filtro
  const sources = useMemo(() => {
    const rawList = tenant?.traffic_sources || [];
    const list = new Set<string>();
    rawList.forEach((s: any) => {
      if (typeof s === 'string') {
        list.add(s);
      } else if (s && typeof s === 'object' && s.name) {
        list.add(s.name);
      }
    });
    if (list.size === 0) {
      ['Manual', 'Instagram', 'Google Ads', 'Facebook Ads', 'Webhook'].forEach(s => list.add(s));
    }
    contacts.forEach((c) => {
      if (c.source) list.add(c.source);
    });
    return Array.from(list);
  }, [contacts, tenant]);

  // Filtrar contatos
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.screening_notes && c.screening_notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSource = sourceFilter === 'all' || c.source === sourceFilter;

      return matchesSearch && matchesSource;
    });
  }, [contacts, searchTerm, sourceFilter]);

  const contactsByColumn = useMemo(() => {
    const groups: Record<string, Contact[]> = {};
    columns.forEach((col) => {
      groups[col.name] = [];
    });
    filteredContacts.forEach((contact) => {
      if (groups[contact.status]) {
        groups[contact.status].push(contact);
      } else {
        // Se a coluna correspondente não existe mais ou foi deletada, agrupa no primeiro estágio
        const firstCol = columns[0]?.name || 'Contato Inicial';
        if (!groups[firstCol]) groups[firstCol] = [];
        groups[firstCol].push(contact);
      }
    });
    return groups;
  }, [columns, filteredContacts]);

  // Ações do formulário de novo lead
  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    const initialStatus = newLeadForm.status || columns[0]?.name || 'Contato Inicial';

    try {
      await addContactOptimistic({
        tenant_id: tenantId,
        name: newLeadForm.name,
        phone: newLeadForm.phone || null,
        email: newLeadForm.email || null,
        source: newLeadForm.source,
        screening_notes: newLeadForm.notes || null,
        status: initialStatus,
      });

      setIsAddContactOpen(false);
      setNewLeadForm({
        name: '',
        phone: '',
        email: '',
        source: 'Manual',
        notes: '',
        status: '',
      });
    } catch (err) {
      alert('Falha ao adicionar contato');
    }
  };

  // Ações do formulário de nova coluna
  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !newColumnName.trim()) return;

    try {
      await addColumnOptimistic(newColumnName.trim(), tenantId);
      setIsAddColumnOpen(false);
      setNewColumnName('');
    } catch (err) {
      alert('Falha ao adicionar coluna');
    }
  };



  // Drag and Drop nativo
  const [draggedContactId, setDraggedContactId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    setDraggedContactId(contactId);
    e.dataTransfer.setData('text/plain', contactId);
  };

  const handleDrop = async (e: React.DragEvent, toColumnName: string) => {
    e.preventDefault();
    const contactId = draggedContactId || e.dataTransfer.getData('text/plain');
    if (!contactId || !tenantId) return;

    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;

    try {
      await moveContactOptimistic(contactId, contact.status, toColumnName, tenantId);
    } catch (err) {
      console.error('Erro ao mover lead:', err);
    } finally {
      setDraggedContactId(null);
      setActiveDropColumn(null);
    }
  };

  if (loading && columns.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <span>Carregando funil de triagem...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-page-enter">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="text-[var(--brand-gradient-start)]" /> Triagem
          </h1>
          <p className="text-sm text-slate-400">
            Gerencie o primeiro contato com leads, triagens clínicas e contratos terapêuticos.
          </p>
        </div>
        
        {/* Botões de Ação */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => openTimelineTab(tenantId || '')}
            className="glass-sm px-4 py-2 text-sm text-slate-200 rounded-xl hover:bg-white/10 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Activity className="w-4 h-4 text-[var(--brand-gradient-start)]" /> Histórico de Alterações
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="glass-sm px-4 py-2 text-sm text-slate-200 rounded-xl hover:bg-white/10 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-[var(--brand-gradient-start)]" /> Configurar Funil
          </button>
          <button
            onClick={() => setIsAddContactOpen(true)}
            className="px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-lg bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo Lead
          </button>
        </div>
      </div>

      {/* Barra de Abas do CRM */}
      {openContactIds.length > 0 && (
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--surface-border)] overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => setActiveContact(null, tenantId || '')}
            className={`h-8 px-4 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeContactId === null
                ? 'brand-accent text-white shadow-md border border-transparent'
                : 'border border-[var(--surface-border)] text-slate-400 hover:text-slate-200 bg-[var(--surface-hover)] hover:bg-[var(--surface-active)]'
            }`}
          >
            Funil de Triagem
          </button>
          
          {openContactIds.map((tabId) => {
            if (tabId === '__timeline') {
              const isActive = activeContactId === tabId;
              return (
                <div
                  key={tabId}
                  className={`flex items-center gap-2 px-3 h-8 text-xs font-semibold rounded-xl transition-all ${
                    isActive
                      ? 'brand-accent text-white shadow-md border border-transparent'
                      : 'border border-[var(--surface-border)] text-slate-400 hover:text-slate-200 bg-[var(--surface-hover)] hover:bg-[var(--surface-active)]'
                  }`}
                >
                  <button
                    onClick={() => setActiveContact(tabId, tenantId || '')}
                    className="bg-transparent border-none text-left cursor-pointer font-semibold text-xs text-inherit truncate max-w-[120px] flex items-center gap-1"
                  >
                    <Activity className="w-3 h-3 text-[var(--brand-gradient-start)]" /> Histórico
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeContactTab(tabId, tenantId || '');
                    }}
                    className={`bg-transparent border-none p-0.5 rounded cursor-pointer transition-all flex items-center justify-center ${
                      isActive 
                        ? 'text-white/70 hover:text-white' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            }

            const tabContact = contacts.find((c) => c.id === tabId);
            if (!tabContact) return null;
            const isActive = activeContactId === tabId;

            return (
              <div
                key={tabId}
                className={`flex items-center gap-2 px-3 h-8 text-xs font-semibold rounded-xl transition-all ${
                  isActive
                    ? 'brand-accent text-white shadow-md border border-transparent'
                    : 'border border-[var(--surface-border)] text-slate-400 hover:text-slate-200 bg-[var(--surface-hover)] hover:bg-[var(--surface-active)]'
                }`}
              >
                <button
                  onClick={() => setActiveContact(tabId, tenantId || '')}
                  className="bg-transparent border-none text-left cursor-pointer font-semibold text-xs text-inherit truncate max-w-[120px]"
                >
                  {tabContact.name}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeContactTab(tabId, tenantId || '');
                  }}
                  className={`bg-transparent border-none p-0.5 rounded cursor-pointer transition-all flex items-center justify-center ${
                    isActive 
                      ? 'text-white/70 hover:text-white' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeContactId === '__timeline' ? (
        <GlobalTimelinePanel tenantId={tenantId || ''} />
      ) : activeContactId !== null && contacts.find((c) => c.id === activeContactId) ? (
        <ContactTabPanel
          key={activeContactId}
          contact={contacts.find((c) => c.id === activeContactId)!}
          columns={columns}
          sources={sources}
          tenantId={tenantId || ''}
        />
      ) : (
        <>
          {/* Controles de Filtros e Busca */}
          <div className="glass-md p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              {/* Busca */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="glass-sm w-full pl-9 pr-4 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gradient-start)]"
                />
              </div>

              {/* Filtro por Origem */}
              <div className="relative flex items-center">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                <Select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  options={[{ value: 'all', label: 'Todas as Origens' }, ...sources]}
                  variant="glass"
                  className="pl-9 min-w-[170px]"
                />
              </div>
            </div>

            {/* Alternador de Visualização */}
            <div className="flex gap-1 p-1 rounded-2xl w-fit glass-sm">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer hover:opacity-100"
                style={
                  viewMode === 'kanban'
                    ? {
                        background: 'var(--brand-gradient)',
                        color: 'var(--brand-contrast-color)',
                        boxShadow: '0 2px 12px color-mix(in srgb, var(--brand-gradient-start) 25%, transparent)',
                      }
                    : {
                        background: 'transparent',
                        color: 'var(--brand-text-color)',
                        opacity: 0.65,
                      }
                }
              >
                <KanbanIcon className="w-3.5 h-3.5" /> Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer hover:opacity-100"
                style={
                  viewMode === 'table'
                    ? {
                        background: 'var(--brand-gradient)',
                        color: 'var(--brand-contrast-color)',
                        boxShadow: '0 2px 12px color-mix(in srgb, var(--brand-gradient-start) 25%, transparent)',
                      }
                    : {
                        background: 'transparent',
                        color: 'var(--brand-text-color)',
                        opacity: 0.65,
                      }
                }
              >
                <TableIcon className="w-3.5 h-3.5" /> Tabela
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Visualização KANBAN */}
          {viewMode === 'kanban' && (
            <div className="overflow-x-auto pb-4 flex gap-4 items-stretch min-h-[480px] h-[calc(100vh-320px)] select-none custom-scrollbar">
              {columns.map((column) => {
                const list = contactsByColumn[column.name] || [];
                const isOver = activeDropColumn === column.name;

                return (
                  <div
                    key={column.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setActiveDropColumn(column.name);
                    }}
                    onDragLeave={() => setActiveDropColumn(null)}
                    onDrop={(e) => handleDrop(e, column.name)}
                    className={`brand-modal w-72 min-w-[288px] max-w-[288px] flex flex-col h-full rounded-2xl transition-all duration-200`}
                    style={{
                      borderTop: `4px solid ${column.color || '#6366F1'}`,
                      ...(isOver ? { boxShadow: '0 0 12px color-mix(in srgb, var(--brand-gradient-start) 15%, transparent)', backgroundColor: 'rgba(255, 255, 255, 0.04)' } : {})
                    }}
                  >
                    {/* Header da Coluna */}
                    <div className="p-4 flex items-center justify-between border-b border-[var(--surface-border)]">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-200 text-sm tracking-wide">{column.name}</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-hover)] text-slate-500 dark:text-slate-400">
                          {list.length}
                        </span>
                      </div>
                      
                      {/* Permitir deletar colunas não-essenciais */}
                      {columns.length > 3 && (
                        <button
                          onClick={() => setConfirmDelete({ type: 'column', id: column.id, name: column.name })}
                          className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Lista de Contatos */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 custom-scrollbar">
                      {list.length === 0 ? (
                        <div className="h-28 flex items-center justify-center border border-dashed border-[var(--surface-border)] rounded-xl text-xs text-slate-600">
                          Solte leads aqui
                        </div>
                      ) : (
                        list.map((contact) => (
                          <div
                            key={contact.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, contact.id)}
                            onClick={() => openContactTab(contact, tenantId || '')}
                            className="glass-sm hover:bg-[var(--surface-hover)] transition-all p-3.5 rounded-xl shadow-md space-y-2.5 relative group cursor-pointer"
                          >
                            {/* Nome do Contato */}
                            <div className="font-medium text-slate-200 text-sm leading-tight pr-14">
                              {contact.name}
                            </div>

                            {/* Detalhes básicos */}
                            <div className="space-y-1 text-[11px] text-slate-400">
                              {contact.phone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  <span>{contact.phone}</span>
                                </div>
                              )}
                              {contact.email && (
                                <div className="flex items-center gap-1.5 truncate">
                                  <Mail className="w-3 h-3 text-slate-500" />
                                  <span className="truncate">{contact.email}</span>
                                </div>
                              )}
                            </div>

                            {/* Rodapé do Cartão */}
                            <div className="flex items-center justify-between pt-1 border-t border-[var(--surface-border)] text-[10px]">
                              {/* Origem */}
                              <span
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold text-[9px] uppercase tracking-wide border"
                                style={{
                                  borderColor: `color-mix(in srgb, ${getSourceDetails(contact.source).color} 20%, transparent)`,
                                  backgroundColor: `color-mix(in srgb, ${getSourceDetails(contact.source).color} 10%, transparent)`,
                                  color: getSourceDetails(contact.source).color
                                }}
                              >
                                <Tag className="w-2 h-2" />
                                {getSourceDetails(contact.source).name}
                              </span>

                              {/* Data de Criação */}
                              <span className="flex items-center gap-0.5 text-slate-500">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(contact.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                })}
                              </span>
                            </div>

                            {/* Ações no hover — top-right: grip + chevron */}
                            <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Alça de drag — cursor grab apenas aqui */}
                              <div
                                title="Arrastar card"
                                className="cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-white/10"
                              >
                                <GripVertical className="w-3.5 h-3.5 text-slate-500" />
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Visualização TABELA */}
          {viewMode === 'table' && (
            <div className="glass-md rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--surface-border)] bg-slate-950/5 dark:bg-slate-950/20 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Nome do Paciente</th>
                    <th className="py-4 px-6">Status / Estágio</th>
                    <th className="py-4 px-6">Telefone</th>
                    <th className="py-4 px-6">E-mail</th>
                    <th className="py-4 px-6">Origem</th>
                    <th className="py-4 px-6">Cadastrado em</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Nenhum lead encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((contact) => (
                      <tr
                        key={contact.id}
                        onClick={() => openContactTab(contact, tenantId || '')}
                        className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="py-4 px-6 font-medium text-slate-200">{contact.name}</td>
                        <td className="py-4 px-6">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                            style={{
                              borderColor: `color-mix(in srgb, ${columns.find(c => c.name === contact.status)?.color || '#6366F1'} 30%, transparent)`,
                              backgroundColor: `color-mix(in srgb, ${columns.find(c => c.name === contact.status)?.color || '#6366F1'} 10%, transparent)`,
                              color: columns.find(c => c.name === contact.status)?.color || '#6366F1'
                            }}
                          >
                            {contact.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-400">{contact.phone || '-'}</td>
                        <td className="py-4 px-6 text-slate-400 truncate max-w-[150px]">{contact.email || '-'}</td>
                        <td className="py-4 px-6">
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold text-[9px] uppercase tracking-wide border"
                            style={{
                              borderColor: `color-mix(in srgb, ${getSourceDetails(contact.source).color} 20%, transparent)`,
                              backgroundColor: `color-mix(in srgb, ${getSourceDetails(contact.source).color} 10%, transparent)`,
                              color: getSourceDetails(contact.source).color
                            }}
                          >
                            {getSourceDetails(contact.source).name}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500">
                          {new Date(contact.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setConfirmDelete({ type: 'lead', id: contact.id, name: contact.name })}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}



      {/* MODAL: ADICIONAR NOVO LEAD */}
      {isAddContactOpen && renderPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            onClick={() => setIsAddContactOpen(false)}
            className="absolute inset-0 cursor-pointer"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand-bg-color) 85%, transparent)',
              backgroundImage: 'radial-gradient(circle at center, color-mix(in srgb, var(--brand-gradient-start) 10%, transparent) 0%, transparent 70%)'
            }}
          />
          
          <div className="brand-modal w-full max-w-md rounded-2xl shadow-2xl relative z-10 animate-modal-enter">
            {/* Header */}
            <div className="p-6 border-b border-[var(--surface-border)] bg-slate-950/5 dark:bg-slate-950/20 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--brand-gradient-start)]" /> Cadastrar Novo Lead
              </h2>
              <button onClick={() => setIsAddContactOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleAddLead} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Nome do Lead / Paciente *</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="glass-sm w-full px-3.5 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gradient-start)]"
                  placeholder="Nome completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Telefone</label>
                  <input
                    type="text"
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    className="glass-sm w-full px-3.5 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gradient-start)]"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">E-mail</label>
                  <input
                    type="email"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    className="glass-sm w-full px-3.5 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gradient-start)]"
                    placeholder="email@provedor.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Origem / Canal</label>
                  <Select
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                    options={tenant?.traffic_sources || ['Manual', 'Instagram', 'Google Ads', 'Facebook Ads', 'Webhook']}
                    variant="glass"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Estágio Inicial</label>
                  <Select
                    value={newLeadForm.status}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, status: e.target.value })}
                    options={columns.map((col) => ({ value: col.name, label: col.name }))}
                    variant="glass"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Nota de Acolhimento / Queixa Inicial</label>
                <textarea
                  rows={3}
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  className="glass-sm w-full px-3.5 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gradient-start)] resize-none"
                  placeholder="Informações adicionais..."
                />
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
                <button
                  type="button"
                  onClick={() => setIsAddContactOpen(false)}
                  className="glass-sm px-4 py-2 text-sm text-slate-300 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-lg bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] hover:brightness-110 active:scale-95 transition-all"
                >
                  Criar Contato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR NOVA COLUNA */}
      {isAddColumnOpen && renderPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            onClick={() => setIsAddColumnOpen(false)}
            className="absolute inset-0 cursor-pointer"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand-bg-color) 85%, transparent)',
              backgroundImage: 'radial-gradient(circle at center, color-mix(in srgb, var(--brand-gradient-start) 10%, transparent) 0%, transparent 70%)'
            }}
          />
          
          <div className="brand-modal w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative z-10 animate-modal-enter">
            {/* Header */}
            <div className="p-6 border-b border-[var(--surface-border)] bg-slate-950/5 dark:bg-slate-950/20 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--brand-gradient-start)]" /> Adicionar Estágio
              </h2>
              <button onClick={() => setIsAddColumnOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleAddColumn} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Nome do Estágio *</label>
                <input
                  type="text"
                  required
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  className="glass-sm w-full px-3.5 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gradient-start)]"
                  placeholder="Ex: Entrevista Inicial"
                />
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
                <button
                  type="button"
                  onClick={() => setIsAddColumnOpen(false)}
                  className="glass-sm px-4 py-2 text-sm text-slate-300 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-lg bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] hover:brightness-110 active:scale-95 transition-all"
                >
                  Criar Estágio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSettingsOpen && renderPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            onClick={() => setIsSettingsOpen(false)}
            className="absolute inset-0 cursor-pointer"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand-bg-color) 85%, transparent)',
              backgroundImage: 'radial-gradient(circle at center, color-mix(in srgb, var(--brand-gradient-start) 10%, transparent) 0%, transparent 70%)'
            }}
          />
          
          <div className="brand-modal w-full max-w-5xl rounded-3xl shadow-2xl relative z-10 animate-modal-enter flex flex-col h-[85vh] max-h-[820px] overflow-hidden border border-[var(--surface-border)]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--surface-border)] bg-slate-950/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--brand-gradient-start)]">
                  Triagem CRM
                </span>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[var(--brand-gradient-start)]" /> Configurações do Funil
                </h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-white/5 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alternador de Abas Interno */}
            <div className="px-6 pt-4 pb-2 border-b border-white/5 bg-slate-950/10">
              <div className="flex gap-1 p-1 rounded-2xl w-fit glass-sm">
                <button
                  type="button"
                  onClick={() => setActiveSettingsTab('pipeline')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer"
                  style={
                    activeSettingsTab === 'pipeline'
                      ? {
                          background: 'var(--brand-gradient)',
                          color: 'var(--brand-contrast-color)',
                          boxShadow: '0 2px 12px color-mix(in srgb, var(--brand-gradient-start) 25%, transparent)',
                        }
                      : {
                          background: 'transparent',
                          color: 'var(--brand-text-color)',
                          opacity: 0.65,
                        }
                  }
                >
                  Estágios do Funil ({columns.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSettingsTab('sources')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer"
                  style={
                    activeSettingsTab === 'sources'
                      ? {
                          background: 'var(--brand-gradient)',
                          color: 'var(--brand-contrast-color)',
                          boxShadow: '0 2px 12px color-mix(in srgb, var(--brand-gradient-start) 25%, transparent)',
                        }
                      : {
                          background: 'transparent',
                          color: 'var(--brand-text-color)',
                          opacity: 0.65,
                        }
                  }
                >
                  Fontes de Tráfego ({localTrafficSources.length})
                </button>
              </div>
            </div>

            {/* Conteúdo Principal (2 Colunas) */}
            <div className="flex-1 min-h-0 p-6 overflow-hidden">
              
              {/* ABA 1: ESTÁGIOS DO FUNIL (COLUNAS) */}
              {activeSettingsTab === 'pipeline' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-stretch">
                  
                  {/* Coluna 1 (Esquerda): Lista de Estágios Reordenável */}
                  <div className="lg:col-span-6 flex flex-col h-full space-y-3 min-h-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100">Gerenciar Estágios</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Arraste pelos três pontos para alterar a sequência do funil no CRM.
                        </p>
                      </div>
                    </div>

                    {/* Lista com Scroll Próprio */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 custom-scrollbar">
                      {columns.map((column, idx) => {
                        const isDragging = draggedColumnIndex === idx;
                        const isDragOver = dragOverColumnIndex === idx;
                        return (
                          <div
                            key={column.id}
                            draggable
                            onDragStart={(e) => handleColumnDragStart(e, idx)}
                            onDragOver={(e) => handleColumnDragOver(e, idx)}
                            onDrop={(e) => handleColumnDrop(e, idx)}
                            onDragEnd={handleColumnDragEnd}
                            className={`glass-sm flex items-center justify-between p-3 rounded-2xl transition-all border ${
                              isDragging ? 'opacity-30 scale-[0.98] border-dashed border-indigo-400' :
                              isDragOver ? 'border-[var(--brand-gradient-start)] bg-white/10 shadow-lg scale-[1.01]' : 'border-white/5 hover:border-white/15'
                            }`}
                            style={{ borderLeft: `4px solid ${column.color || '#6366F1'}` }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-200 transition-colors shrink-0">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-bold text-slate-400 font-mono shrink-0 w-5">
                                {(idx + 1).toString().padStart(2, '0')}
                              </span>
                              <div className="min-w-0">
                                <span className="text-sm font-semibold text-slate-100 block truncate">{column.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                                  slug: {column.slug || '-'} | grupo: {
                                    column.category === 'pendente' ? 'Pendente' :
                                    column.category === 'acolhimento' ? 'Em Acolhimento' :
                                    column.category === 'paciente' ? 'Paciente' :
                                    column.category === 'alta' ? 'Alta' :
                                    column.category === 'negativa' ? 'Negativa' : column.category || 'Em Acolhimento'
                                  }
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingColumnId(column.id);
                                  setNewColumnName(column.name);
                                  setNewColumnSlug(column.slug || '');
                                  setNewColumnColor(column.color || '#6366F1');
                                  setNewColumnCategory(column.category || 'acolhimento');
                                }}
                                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                title="Editar Estágio"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              {columns.length > 3 && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete({ type: 'column', id: column.id, name: column.name })}
                                  className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                  title="Excluir Estágio"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Coluna 2 (Direita): Formulário de Criar / Editar Estágio */}
                  <div className="lg:col-span-6 glass-sm p-5 rounded-2xl border border-white/10 flex flex-col h-full min-h-0 space-y-4 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <Plus className="w-4 h-4 text-[var(--brand-gradient-start)]" />
                        {editingColumnId ? `Editar Estágio: ${newColumnName}` : 'Criar Novo Estágio'}
                      </h4>
                      {editingColumnId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingColumnId(null);
                            setNewColumnName('');
                            setNewColumnSlug('');
                            setNewColumnColor('#6366F1');
                            setNewColumnCategory('acolhimento');
                          }}
                          className="text-[10px] text-slate-400 hover:text-white underline"
                        >
                          + Novo Estágio
                        </button>
                      )}
                    </div>

                    <div className="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Nome do Estágio</label>
                        <input
                          type="text"
                          placeholder="Ex: Primeira Consulta"
                          value={newColumnName}
                          onChange={(e) => {
                            setNewColumnName(e.target.value);
                            if (!editingColumnId) {
                              setNewColumnSlug(e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                            }
                          }}
                          className="glass-sm w-full px-3.5 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gradient-start)]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Integration Slug (Chave única)</label>
                        <input
                          type="text"
                          placeholder="Ex: primeira-consulta"
                          value={newColumnSlug}
                          onChange={(e) => setNewColumnSlug(e.target.value)}
                          className="glass-sm w-full px-3.5 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gradient-start)] font-mono"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Grupo / Categoria do Estágio</label>
                        <Select
                          value={newColumnCategory}
                          onChange={(e) => setNewColumnCategory(e.target.value as any)}
                          options={[
                            { value: 'pendente', label: 'Pendente' },
                            { value: 'acolhimento', label: 'Em Acolhimento' },
                            { value: 'paciente', label: 'Paciente (Tratamento Ativo)' },
                            { value: 'alta', label: 'Alta' },
                            { value: 'negativa', label: 'Negativa' },
                          ]}
                          variant="glass"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Cor do Estágio</label>
                        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl glass-sm">
                          {PRESETS.map((p) => (
                            <button
                              key={p.hex}
                              type="button"
                              onClick={() => setNewColumnColor(p.hex)}
                              className="w-5 h-5 rounded-full transition-all border-none cursor-pointer flex items-center justify-center shrink-0 hover:scale-110 active:scale-95"
                              style={{
                                backgroundColor: p.hex,
                                boxShadow: newColumnColor === p.hex ? `0 0 0 2px #ffffff, 0 0 6px ${p.hex}` : 'none'
                              }}
                              title={p.name}
                            >
                              {newColumnColor === p.hex && (
                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                              )}
                            </button>
                          ))}
                          <input
                            type="text"
                            placeholder="#hex"
                            value={newColumnColor}
                            onChange={(e) => setNewColumnColor(e.target.value)}
                            className="glass-sm px-2 py-0.5 text-[10px] w-14 rounded-lg focus:outline-none text-slate-200 font-mono ml-auto"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-white/10 shrink-0">
                      {editingColumnId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingColumnId(null);
                            setNewColumnName('');
                            setNewColumnSlug('');
                            setNewColumnColor('#6366F1');
                            setNewColumnCategory('acolhimento');
                          }}
                          className="glass-sm px-4 py-2 text-xs text-slate-300 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newColumnName.trim() || !tenantId) return;
                          try {
                            const finalSlug = newColumnSlug.trim() || newColumnName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                            if (editingColumnId) {
                              await updateColumnOptimistic(editingColumnId, {
                                name: newColumnName.trim(),
                                slug: finalSlug,
                                color: newColumnColor,
                                category: newColumnCategory
                              });
                              setEditingColumnId(null);
                            } else {
                              await addColumnOptimistic(newColumnName.trim(), tenantId, finalSlug, newColumnColor, newColumnCategory);
                            }
                            setNewColumnName('');
                            setNewColumnSlug('');
                            setNewColumnColor('#6366F1');
                            setNewColumnCategory('acolhimento');
                          } catch (err) {
                            console.error(err);
                            alert('Erro ao salvar estágio.');
                          }
                        }}
                        className="px-5 py-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] hover:brightness-110 active:scale-95 transition-all"
                      >
                        {editingColumnId ? 'Salvar Alterações' : 'Criar Estágio'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: FONTES DE TRÁFEGO */}
              {activeSettingsTab === 'sources' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-stretch">
                  
                  {/* Coluna 1 (Esquerda): Lista de Fontes de Tráfego Reordenável */}
                  <div className="lg:col-span-6 flex flex-col h-full space-y-3 min-h-0">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">Fontes de Tráfego (UTMs)</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Arraste para definir a prioridade de exibição dos canais de captação.
                      </p>
                    </div>

                    {/* Fonte Padrão */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Fonte de Tráfego Padrão</label>
                      <Select
                        value={localDefaultSource}
                        onChange={(e) => setLocalDefaultSource(e.target.value)}
                        options={localTrafficSources.map((src) => ({ value: src.name, label: src.name }))}
                        variant="glass"
                      />
                    </div>

                    {/* Lista com Scroll Próprio */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 custom-scrollbar">
                      {localTrafficSources.map((src, idx) => {
                        const isDragging = draggedSourceIndex === idx;
                        const isDragOver = dragOverSourceIndex === idx;
                        return (
                          <div
                            key={src.id}
                            draggable
                            onDragStart={(e) => handleSourceDragStart(e, idx)}
                            onDragOver={(e) => handleSourceDragOver(e, idx)}
                            onDrop={(e) => handleSourceDrop(e, idx)}
                            onDragEnd={handleSourceDragEnd}
                            className={`glass-sm flex flex-col p-3 rounded-2xl transition-all border space-y-1.5 ${
                              isDragging ? 'opacity-30 scale-[0.98] border-dashed border-indigo-400' :
                              isDragOver ? 'border-[var(--brand-gradient-start)] bg-white/10 shadow-lg scale-[1.01]' : 'border-white/5 hover:border-white/15'
                            }`}
                            style={{ borderLeft: `4px solid ${src.color}` }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-200 transition-colors shrink-0">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-400 font-mono shrink-0 w-5">
                                  {(idx + 1).toString().padStart(2, '0')}
                                </span>
                                <span className="text-sm font-semibold text-slate-100 truncate">{src.name}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSourceId(src.id);
                                    setNewSourceName(src.name);
                                    setNewSourceColor(src.color || '#6366F1');
                                    setNewSourceUtmSource(src.utm_source || '');
                                    setNewSourceUtmMedium(src.utm_medium || '');
                                    setNewSourceUtmCampaign(src.utm_campaign || '');
                                  }}
                                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                  title="Editar Canal"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                {localTrafficSources.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = localTrafficSources.filter(s => s.id !== src.id);
                                      setLocalTrafficSources(updated);
                                      if (localDefaultSource === src.name) {
                                        setLocalDefaultSource(updated[0]?.name || 'Manual');
                                      }
                                    }}
                                    className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                    title="Excluir Canal"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 font-mono pl-7">
                              <div><span className="text-slate-500">utm_source:</span> {src.utm_source || '-'}</div>
                              <div><span className="text-slate-500">utm_medium:</span> {src.utm_medium || '-'}</div>
                              <div><span className="text-slate-500">utm_campaign:</span> {src.utm_campaign || '-'}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Coluna 2 (Direita): Formulário de Criar / Editar Canal */}
                  <div className="lg:col-span-6 glass-sm p-5 rounded-2xl border border-white/10 flex flex-col h-full min-h-0 space-y-4 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <Plus className="w-4 h-4 text-[var(--brand-gradient-start)]" />
                        {editingSourceId ? `Editar Canal: ${newSourceName}` : 'Criar Novo Canal'}
                      </h4>
                      {editingSourceId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSourceId(null);
                            setNewSourceName('');
                            setNewSourceColor('#6366F1');
                            setNewSourceUtmSource('');
                            setNewSourceUtmMedium('');
                            setNewSourceUtmCampaign('');
                          }}
                          className="text-[10px] text-slate-400 hover:text-white underline"
                        >
                          + Novo Canal
                        </button>
                      )}
                    </div>

                    <div className="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Nome do Canal / Origem</label>
                        <input
                          type="text"
                          placeholder="Ex: Google Ads"
                          value={newSourceName}
                          onChange={(e) => {
                            setNewSourceName(e.target.value);
                            if (!editingSourceId) {
                              setNewSourceUtmSource(e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-'));
                            }
                          }}
                          className="glass-sm w-full px-3.5 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gradient-start)]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">UTM Source</label>
                          <input
                            type="text"
                            placeholder="Ex: google"
                            value={newSourceUtmSource}
                            onChange={(e) => setNewSourceUtmSource(e.target.value)}
                            className="glass-sm w-full px-3.5 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gradient-start)] font-mono"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">UTM Medium</label>
                          <input
                            type="text"
                            placeholder="Ex: cpc"
                            value={newSourceUtmMedium}
                            onChange={(e) => setNewSourceUtmMedium(e.target.value)}
                            className="glass-sm w-full px-3.5 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gradient-start)] font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">UTM Campaign (Opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: campanha-leads-agosto"
                          value={newSourceUtmCampaign}
                          onChange={(e) => setNewSourceUtmCampaign(e.target.value)}
                          className="glass-sm w-full px-3.5 py-2 text-sm rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--brand-gradient-start)] font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Cor de Identificação</label>
                        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl glass-sm">
                          {PRESETS.map((p) => (
                            <button
                              key={p.hex}
                              type="button"
                              onClick={() => setNewSourceColor(p.hex)}
                              className="w-5 h-5 rounded-full transition-all border-none cursor-pointer flex items-center justify-center shrink-0 hover:scale-110 active:scale-95"
                              style={{
                                backgroundColor: p.hex,
                                boxShadow: newSourceColor === p.hex ? `0 0 0 2px #ffffff, 0 0 6px ${p.hex}` : 'none'
                              }}
                              title={p.name}
                            >
                              {newSourceColor === p.hex && (
                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                              )}
                            </button>
                          ))}
                          <input
                            type="text"
                            placeholder="#hex"
                            value={newSourceColor}
                            onChange={(e) => setNewSourceColor(e.target.value)}
                            className="glass-sm px-2 py-0.5 text-[10px] w-14 rounded-lg focus:outline-none text-slate-200 font-mono ml-auto"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-white/10 shrink-0">
                      {editingSourceId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSourceId(null);
                            setNewSourceName('');
                            setNewSourceColor('#6366F1');
                            setNewSourceUtmSource('');
                            setNewSourceUtmMedium('');
                            setNewSourceUtmCampaign('');
                          }}
                          className="glass-sm px-4 py-2 text-xs text-slate-300 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const nameVal = newSourceName.trim();
                          if (!nameVal) return;
                          const idVal = editingSourceId || nameVal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-');
                          
                          const newSource: TrafficSourceObj = {
                            id: idVal,
                            name: nameVal,
                            color: newSourceColor,
                            utm_source: newSourceUtmSource.trim() || idVal,
                            utm_medium: newSourceUtmMedium.trim(),
                            utm_campaign: newSourceUtmCampaign.trim()
                          };

                          if (editingSourceId) {
                            const updated = localTrafficSources.map(s => s.id === editingSourceId ? newSource : s);
                            setLocalTrafficSources(updated);
                            setEditingSourceId(null);
                          } else {
                            if (localTrafficSources.some(s => s.id === idVal)) {
                              alert('Este canal já está cadastrado.');
                              return;
                            }
                            setLocalTrafficSources([...localTrafficSources, newSource]);
                          }
                          
                          setNewSourceName('');
                          setNewSourceColor('#6366F1');
                          setNewSourceUtmSource('');
                          setNewSourceUtmMedium('');
                          setNewSourceUtmCampaign('');
                        }}
                        className="px-5 py-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] hover:brightness-110 active:scale-95 transition-all"
                      >
                        {editingSourceId ? 'Salvar Alterações' : 'Adicionar Canal'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--surface-border)] flex items-center justify-between bg-slate-950/20">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="glass-sm px-4 py-2 text-xs text-slate-300 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
              >
                Fechar
              </button>
              
              <button
                type="button"
                disabled={savingSettings}
                onClick={async () => {
                  if (!tenantId) return;
                  setSavingSettings(true);
                  try {
                    await api.updateTenantBranding(tenantId, {
                      traffic_sources: localTrafficSources as any,
                      default_traffic_source: localDefaultSource
                    });
                    await reloadBrand();
                    setIsSettingsOpen(false);
                  } catch (err: any) {
                    alert(err.message || 'Erro ao salvar configurações.');
                  } finally {
                    setSavingSettings(false);
                  }
                }}
                className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-lg bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) {
            if (confirmDelete.type === 'column') {
              deleteColumnOptimistic(confirmDelete.id);
            } else {
              deleteContactOptimistic(confirmDelete.id);
            }
            setConfirmDelete(null);
          }
        }}
        title={confirmDelete?.type === 'column' ? 'Remover Estágio do Funil' : 'Excluir Contato/Lead'}
        description={
          confirmDelete?.type === 'column'
            ? `Deseja mesmo remover a coluna "${confirmDelete.name || ''}"? Os contatos associados retornarão para o estágio inicial.`
            : `Deseja excluir permanentemente o contato "${confirmDelete?.name || ''}" do CRM?`
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
