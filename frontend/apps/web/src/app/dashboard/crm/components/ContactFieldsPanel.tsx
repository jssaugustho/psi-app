'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCrmStore } from '@/stores/crmStore';
import { Contact, PipelineColumn } from '@/lib/api';
import { 
  User, Phone, Mail, Globe, GitBranch, Shield, 
  AlertTriangle, Check, StickyNote 
} from 'lucide-react';
import { Select } from '@psi/ui';

interface ContactFieldsPanelProps {
  contact: Contact;
  columns: PipelineColumn[];
  sources: string[];
  tenantId: string;
}

// Helper para formatar a hora/minuto do salvamento
function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function ContactFieldsPanel({ contact, columns, sources, tenantId }: ContactFieldsPanelProps) {
  const { updateContactOptimistic, moveContactOptimistic } = useCrmStore();
  
  // Estados dos inputs locais
  const [name, setName] = useState(contact.name || '');
  const [phone, setPhone] = useState(contact.phone || '');
  const [email, setEmail] = useState(contact.email || '');
  const [source, setSource] = useState(contact.source || '');
  const [status, setStatus] = useState(contact.status || '');
  const [notes, setNotes] = useState(contact.screening_notes || '');
  
  // Contato de emergência
  const [emergencyName, setEmergencyName] = useState(contact.emergency_contact_name || '');
  const [emergencyRelation, setEmergencyRelation] = useState(contact.emergency_contact_relation || '');
  const [emergencyPhone, setEmergencyPhone] = useState(contact.emergency_contact_phone || '');
  
  // Maior de idade
  const [isMinor, setIsMinor] = useState(contact.is_minor || false);

  // Estados de salvamento
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Refs de inputs para evitar sobrescrita sob foco ativo
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const emergencyNameRef = useRef<HTMLInputElement>(null);
  const emergencyRelationRef = useRef<HTMLInputElement>(null);
  const emergencyPhoneRef = useRef<HTMLInputElement>(null);

  // Sincronizar com mudanças do contato vindo de fora
  useEffect(() => {
    if (document.activeElement !== nameRef.current) setName(contact.name || '');
    if (document.activeElement !== phoneRef.current) setPhone(contact.phone || '');
    if (document.activeElement !== emailRef.current) setEmail(contact.email || '');
    if (document.activeElement !== notesRef.current) setNotes(contact.screening_notes || '');
    if (document.activeElement !== emergencyNameRef.current) setEmergencyName(contact.emergency_contact_name || '');
    if (document.activeElement !== emergencyRelationRef.current) setEmergencyRelation(contact.emergency_contact_relation || '');
    if (document.activeElement !== emergencyPhoneRef.current) setEmergencyPhone(contact.emergency_contact_phone || '');
    
    setSource(contact.source || '');
    setStatus(contact.status || '');
    setIsMinor(contact.is_minor || false);
  }, [contact]);

  // Função de persistência
  const saveFields = useCallback(async (fieldsToSave: Partial<Contact>) => {
    setSaving(true);
    try {
      await updateContactOptimistic(contact.id, fieldsToSave);
      setLastSaved(new Date());
    } catch (err) {
      console.error('Erro ao salvar contato:', err);
    } finally {
      setSaving(false);
    }
  }, [contact.id, updateContactOptimistic]);

  // Auto-save com debounce (1.5 segundos)
  const autoSaveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const triggerAutoSave = useCallback((fields: Partial<Contact>) => {
    if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
    autoSaveTimeout.current = setTimeout(() => {
      saveFields(fields);
    }, 1500);
  }, [saveFields]);

  // Cancelar timeout pendente se desmontar
  useEffect(() => {
    return () => {
      if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
    };
  }, []);

  // Handlers para salvamento imediato (selects/toggles)
  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    setSaving(true);
    try {
      await moveContactOptimistic(contact.id, contact.status, newStatus, tenantId);
      setLastSaved(new Date());
    } catch (err) {
      console.error('Erro ao mover estágio:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSourceChange = (newSource: string) => {
    setSource(newSource);
    saveFields({ source: newSource });
  };

  const handleIsMinorChange = (minor: boolean) => {
    setIsMinor(minor);
    saveFields({ is_minor: minor });
  };

  return (
    <div className="glass-md rounded-2xl border border-[var(--surface-border)]">
      {/* Header */}
      <div className="p-4 bg-white/[0.01] border-b border-[var(--surface-border)] flex items-center justify-between rounded-t-2xl">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <User className="w-4 h-4 text-[var(--brand-gradient-start)]" />
          Dados do Lead
        </h3>
        
        {/* Status Indicators */}
        <div className="text-[10px] text-slate-400">
          {saving && <span className="animate-pulse">Salvando...</span>}
          {!saving && lastSaved && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Check className="w-3.5 h-3.5" /> Salvo às {formatTime(lastSaved)}
            </span>
          )}
        </div>
      </div>



      {/* Grid Fields */}
      <div className="divide-y divide-[var(--surface-border)] text-sm">
        {/* Nome */}
        <div className="grid grid-cols-3 items-center min-h-[44px]">
          <div className="pl-4 text-slate-400 flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            <span>Nome</span>
          </div>
          <div className="col-span-2 pr-4 flex">
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                triggerAutoSave({ name: e.target.value });
              }}
              className="w-full bg-transparent border-none text-slate-200 focus:outline-none py-2 text-sm"
              placeholder="Nome do lead"
            />
          </div>
        </div>

        {/* Telefone */}
        <div className="grid grid-cols-3 items-center min-h-[44px]">
          <div className="pl-4 text-slate-400 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5" />
            <span>Contato Principal</span>
          </div>
          <div className="col-span-2 pr-4">
            <input
              ref={phoneRef}
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                triggerAutoSave({ phone: e.target.value });
              }}
              className="w-full bg-transparent border-none text-slate-200 focus:outline-none py-2 text-sm"
              placeholder="Sem número"
            />
          </div>
        </div>

        {/* E-mail */}
        <div className="grid grid-cols-3 items-center min-h-[44px]">
          <div className="pl-4 text-slate-400 flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" />
            <span>E-mail</span>
          </div>
          <div className="col-span-2 pr-4">
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                triggerAutoSave({ email: e.target.value });
              }}
              className="w-full bg-transparent border-none text-slate-200 focus:outline-none py-2 text-sm"
              placeholder="email@exemplo.com"
            />
          </div>
        </div>

        {/* Origem */}
        <div className="grid grid-cols-3 items-center min-h-[44px]">
          <div className="pl-4 text-slate-400 flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            <span>Origem</span>
          </div>
          <div className="col-span-2 pr-4">
            <Select
              value={source}
              onChange={(e) => handleSourceChange(e.target.value)}
              options={['', ...sources]}
              placeholder="Selecionar..."
              variant="transparent"
            />
          </div>
        </div>

        {/* Estágio (Coluna Kanban) */}
        <div className="grid grid-cols-3 items-center min-h-[44px]">
          <div className="pl-4 text-slate-400 flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5" />
            <span>Estágio</span>
          </div>
          <div className="col-span-2 pr-4">
            <Select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              options={columns.map((col) => ({ value: col.name, label: col.name }))}
              variant="transparent"
            />
          </div>
        </div>

        {/* Maior de Idade */}
        <div className="grid grid-cols-3 items-center min-h-[44px]">
          <div className="pl-4 text-slate-400 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Maior de Idade</span>
          </div>
          <div className="col-span-2 pr-4 flex items-center h-full">
            <label className="relative inline-flex items-center cursor-pointer my-2">
              <input
                type="checkbox"
                checked={!isMinor}
                onChange={(e) => handleIsMinorChange(!e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--brand-gradient-start)]"></div>
              <span className="ml-2 text-xs text-slate-300">{!isMinor ? 'Sim' : 'Não (Menor)'}</span>
            </label>
          </div>
        </div>

        {/* Contato de Emergência */}
        <div className="grid grid-cols-3 items-start min-h-[44px] py-2">
          <div className="pl-4 text-slate-400 flex items-center gap-2 mt-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Emergência</span>
          </div>
          <div className="col-span-2 pr-4 space-y-2">
            <input
              ref={emergencyNameRef}
              type="text"
              value={emergencyName}
              onChange={(e) => {
                setEmergencyName(e.target.value);
                triggerAutoSave({ emergency_contact_name: e.target.value });
              }}
              className="w-full bg-white/[0.02] border border-[var(--surface-border)] rounded-lg text-slate-200 focus:outline-none px-3 py-1.5 text-xs"
              placeholder="Nome do contato"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                ref={emergencyRelationRef}
                type="text"
                value={emergencyRelation}
                onChange={(e) => {
                  setEmergencyRelation(e.target.value);
                  triggerAutoSave({ emergency_contact_relation: e.target.value });
                }}
                className="w-full bg-white/[0.02] border border-[var(--surface-border)] rounded-lg text-slate-200 focus:outline-none px-3 py-1.5 text-xs"
                placeholder="Parentesco (ex: Mãe)"
              />
              <input
                ref={emergencyPhoneRef}
                type="tel"
                value={emergencyPhone}
                onChange={(e) => {
                  setEmergencyPhone(e.target.value);
                  triggerAutoSave({ emergency_contact_phone: e.target.value });
                }}
                className="w-full bg-white/[0.02] border border-[var(--surface-border)] rounded-lg text-slate-200 focus:outline-none px-3 py-1.5 text-xs"
                placeholder="Telefone"
              />
            </div>
          </div>
        </div>

        {/* Notas de Triagem */}
        <div className="grid grid-cols-3 items-start min-h-[70px] py-2.5">
          <div className="pl-4 text-slate-400 flex items-center gap-2 mt-1">
            <StickyNote className="w-3.5 h-3.5" />
            <span>Observações</span>
          </div>
          <div className="col-span-2 pr-4">
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                triggerAutoSave({ screening_notes: e.target.value });
              }}
              rows={3}
              className="w-full bg-white/[0.02] border border-[var(--surface-border)] rounded-lg text-slate-200 focus:outline-none p-3 text-xs resize-none"
              placeholder="Digite notas de acolhimento e triagem..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
