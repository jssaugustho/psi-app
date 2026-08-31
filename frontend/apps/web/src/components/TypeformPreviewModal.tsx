'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  X, ArrowLeft, ArrowRight, Check, Sparkles, Smartphone, Monitor, RotateCcw,
  CheckCircle2, ShieldCheck, User, Phone, Mail, FileText, AlertCircle, Sun, Moon
} from 'lucide-react';

interface CountryConfig {
  code: string;
  flag: string;
  name: string;
  dialCode: string;
  mask: string;
  placeholder: string;
}

const countriesList: CountryConfig[] = [
  { code: "BR", flag: "🇧🇷", name: "Brasil", dialCode: "+55", mask: "(99) 99999-9999", placeholder: "(11) 99999-9999" },
  { code: "PT", flag: "🇵🇹", name: "Portugal", dialCode: "+351", mask: "999 999 999", placeholder: "912 345 678" },
  { code: "US", flag: "🇺🇸", name: "Estados Unidos", dialCode: "+1", mask: "(999) 999-9999", placeholder: "(555) 000-0000" },
  { code: "ES", flag: "🇪🇸", name: "Espanha", dialCode: "+34", mask: "999 999 999", placeholder: "612 345 678" },
  { code: "GB", flag: "🇬🇧", name: "Reino Unido", dialCode: "+44", mask: "9999 999999", placeholder: "7700 900077" },
];

export interface TypeformPreviewModalProps {
  open: boolean;
  onClose: () => void;
  formFlow: {
    nodes: any[];
    edges: any[];
    settings?: any;
  };
  brandColors?: {
    primaryStart?: string;
    primaryEnd?: string;
    contrast?: string;
  };
  whatsappNumber?: string;
}

const validateCPFHelper = (cpf: string): boolean => {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (11 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (12 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean.substring(10, 11))) return false;

  return true;
};

export function TypeformPreviewModal({
  open,
  onClose,
  formFlow,
  brandColors,
  whatsappNumber = '5511999999999'
}: TypeformPreviewModalProps) {
  const nodes = formFlow?.nodes || [];
  const edges = formFlow?.edges || [];

  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');
  const [currentNodeId, setCurrentNodeId] = useState<string>('start');
  const [history, setHistory] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form input answers state
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [selectedPhoneCountry, setSelectedPhoneCountry] = useState<CountryConfig>(countriesList[0]);
  const [rawPhone, setRawPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [maioridade, setMaioridade] = useState('');
  const [isUnderageResponsible, setIsUnderageResponsible] = useState(false);
  const [responsibleName, setResponsibleName] = useState('');
  const [responsiblePhone, setResponsiblePhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyKinship, setEmergencyKinship] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [contractAccepted, setContractAccepted] = useState(false);
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});

  // Reset simulator when opening
  useEffect(() => {
    if (open) {
      handleReset();
    }
  }, [open]);

  const handleReset = () => {
    const startNode = nodes.find((n: any) => n.type === 'start');
    setCurrentNodeId(startNode ? startNode.id : (nodes[0]?.id || 'start'));
    setHistory([]);
    setIsSubmitted(false);
    setErrorMsg('');
    setNome('');
    setEmail('');
    setRawPhone('');
    setCpf('');
    setMaioridade('');
    setIsUnderageResponsible(false);
    setResponsibleName('');
    setResponsiblePhone('');
    setEmergencyName('');
    setEmergencyKinship('');
    setEmergencyPhone('');
    setContractAccepted(false);
    setCustomAnswers({});
  };

  if (!open) return null;

  const currentNode = nodes.find((n: any) => n.id === currentNodeId);

  // Phone formatting
  const handlePhoneChange = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (selectedPhoneCountry.code === 'BR') {
      if (clean.length > 11) clean = clean.slice(0, 11);
      let formatted = '';
      if (clean.length > 0) formatted = `(${clean.slice(0, 2)}`;
      if (clean.length > 2) formatted += `) ${clean.slice(2, 7)}`;
      if (clean.length > 7) formatted += `-${clean.slice(7, 11)}`;
      setRawPhone(formatted);
    } else {
      setRawPhone(val);
    }
    setErrorMsg('');
  };

  // CPF formatting
  const handleCPFChange = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 11) clean = clean.slice(0, 11);
    let formatted = '';
    if (clean.length > 0) formatted = clean.slice(0, 3);
    if (clean.length > 3) formatted += `.${clean.slice(3, 6)}`;
    if (clean.length > 6) formatted += `.${clean.slice(6, 9)}`;
    if (clean.length > 9) formatted += `-${clean.slice(9, 11)}`;
    setCpf(formatted);
    setErrorMsg('');
  };

  // Branching node resolution
  const resolveNextNodeId = (): string | null => {
    if (!currentNode) return null;

    // 1. Selector branching by option handle
    if (currentNode.type === 'seletor' || currentNode.type === 'escolha' || currentNode.type === 'escolha_multipla') {
      const selectedValue = customAnswers[currentNode.id];
      const options = currentNode.data?.options || [];
      const optionIndex = options.findIndex((o: any) => o.value === selectedValue || o.label === selectedValue);

      if (optionIndex !== -1) {
        const handle1 = `opt_${optionIndex}`;
        const handle2 = `option-${optionIndex}`;
        const matchingEdge = edges.find((e: any) => e.source === currentNode.id && (e.sourceHandle === handle1 || e.sourceHandle === handle2));
        if (matchingEdge) {
          return matchingEdge.target;
        }
      }
    }

    // 2. Maioridade branching: 'source-maior' vs 'source-menor'
    if (currentNode.type === 'maioridade') {
      const isMaior = maioridade === 'Sim' || maioridade === 'sim' || maioridade === 'true';
      const targetHandles = isMaior
        ? ['source-maior', 'source-sim', 'opt_0', 'option-0']
        : ['source-menor', 'source-nao', 'opt_1', 'option-1'];
      const matchingEdge = edges.find((e: any) => e.source === currentNode.id && targetHandles.includes(e.sourceHandle || ''));
      if (matchingEdge) {
        return matchingEdge.target;
      }
    }

    // 3. Default edge connection
    const outgoingEdge = edges.find((e: any) => e.source === currentNode.id);
    return outgoingEdge ? outgoingEdge.target : null;
  };

  // Step Validation
  const validateCurrentStep = (): boolean => {
    setErrorMsg('');
    if (!currentNode) return false;

    const data = currentNode.data || {};
    const isRequired = data.isRequired ?? true;

    if (currentNode.type === 'start') return true;

    if (currentNode.type === 'nome') {
      if (isRequired && (!nome || nome.trim().length < 3)) {
        setErrorMsg('Por favor, informe seu nome completo.');
        return false;
      }
    }

    if (currentNode.type === 'celular' || currentNode.type === 'contato') {
      const clean = rawPhone.replace(/\D/g, '');
      if (isRequired && clean.length < 9) {
        setErrorMsg('Informe um número de WhatsApp válido.');
        return false;
      }
    }

    if (currentNode.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (isRequired && !emailRegex.test(email)) {
        setErrorMsg('Informe um e-mail válido.');
        return false;
      }
    }

    if (currentNode.type === 'cpf') {
      if (isRequired && !validateCPFHelper(cpf)) {
        setErrorMsg('CPF inválido. Verifique os dígitos digitados.');
        return false;
      }
    }

    if (currentNode.type === 'maioridade') {
      if (!maioridade) {
        setErrorMsg('Selecione se você é maior ou menor de idade.');
        return false;
      }
      if (maioridade === 'Não' && isUnderageResponsible) {
        if (!responsibleName.trim()) {
          setErrorMsg('Informe o nome do responsável legal.');
          return false;
        }
        if (!responsiblePhone.trim() || responsiblePhone.replace(/\D/g, '').length < 8) {
          setErrorMsg('Informe o WhatsApp do responsável legal.');
          return false;
        }
      }
    }

    if (currentNode.type === 'emergencia') {
      if (isRequired) {
        if (!emergencyName.trim() || !emergencyKinship.trim() || !emergencyPhone.trim()) {
          setErrorMsg('Preencha todos os campos do contato de emergência.');
          return false;
        }
      }
    }

    if (currentNode.type === 'contrato') {
      if (isRequired && !contractAccepted) {
        setErrorMsg('É necessário ler e aceitar o termo para continuar.');
        return false;
      }
    }

    if (currentNode.type === 'texto' || currentNode.type === 'paragrafo') {
      const answer = customAnswers[currentNode.id];
      if (isRequired && (!answer || answer.trim().length === 0)) {
        setErrorMsg('Este campo é obrigatório.');
        return false;
      }
    }

    if (currentNode.type === 'seletor' || currentNode.type === 'escolha' || currentNode.type === 'escolha_multipla') {
      const answer = customAnswers[currentNode.id];
      if (isRequired && (!answer || (Array.isArray(answer) && answer.length === 0))) {
        setErrorMsg('Selecione ao menos uma opção para continuar.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    startTransition(() => {
      const nextNodeId = resolveNextNodeId();
      if (nextNodeId && nodes.some((n: any) => n.id === nextNodeId)) {
        setHistory((prev) => [...prev, currentNodeId]);
        setCurrentNodeId(nextNodeId);
      } else {
        setIsSubmitted(true);
      }
    });
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const prevNodeId = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentNodeId(prevNodeId);
    setErrorMsg('');
  };

  const primaryStart = brandColors?.primaryStart || '#9333ea';
  const primaryEnd = brandColors?.primaryEnd || '#7c3aed';
  const contrast = brandColors?.contrast || '#ffffff';
  const isLight = previewTheme === 'light';

  const progressPercent = Math.min(100, Math.round(((history.length + 1) / Math.max(nodes.length, 1)) * 100));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Simulation Window Container */}
      <div className="flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] max-w-5xl w-full">
        
        {/* Top Simulation Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/90 bg-zinc-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Preview Interativo da Triagem
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 hidden sm:inline-block">
              Modo Simulação em Tempo Real
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Theme Toggle (Light / Dark) */}
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setPreviewTheme('dark')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  previewTheme === 'dark'
                    ? 'bg-zinc-800 text-purple-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Visualizar no Tema Escuro"
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium hidden sm:inline">Escuro</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTheme('light')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  previewTheme === 'light'
                    ? 'bg-zinc-800 text-amber-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Visualizar no Tema Claro"
              >
                <Sun className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium hidden sm:inline">Claro</span>
              </button>
            </div>

            {/* Device Viewport Toggle */}
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setDeviceMode('desktop')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  deviceMode === 'desktop'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="text-[10px]">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('mobile')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  deviceMode === 'mobile'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-[10px]">Mobile</span>
              </button>
            </div>

            {/* Restart Button */}
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
              title="Reiniciar Simulação"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-zinc-800 transition-colors cursor-pointer"
              title="Fechar Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body Canvas */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center transition-colors duration-200 ${
          isLight ? 'bg-slate-100/90' : 'bg-[#09090b]'
        }`}>
          <div
            className={`transition-all duration-300 w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
              deviceMode === 'mobile' ? 'max-w-[390px] min-h-[580px]' : 'max-w-2xl min-h-[460px]'
            } ${
              isLight 
                ? 'bg-white text-slate-900 border border-slate-200 shadow-slate-900/10' 
                : 'bg-[#0c0c0e] text-zinc-100 border border-zinc-800 shadow-black/80'
            }`}
            style={{
              '--brand-gradient-start': primaryStart,
              '--brand-gradient-end': primaryEnd,
              '--brand-contrast-color': contrast,
            } as React.CSSProperties}
          >
            {/* Progress Bar */}
            <div className={`h-1.5 w-full ${isLight ? 'bg-slate-100' : 'bg-zinc-800'}`}>
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${progressPercent}%`,
                  background: `linear-gradient(90deg, ${primaryStart}, ${primaryEnd})`
                }}
              />
            </div>

            {/* Top Bar inside popup */}
            <div className={`flex items-center justify-between px-6 py-3.5 border-b ${
              isLight ? 'border-slate-100 bg-slate-50/50' : 'border-zinc-800/80 bg-zinc-900/40'
            }`}>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" style={{ color: primaryStart }} />
                <span className={isLight ? 'text-slate-600' : 'text-zinc-400'}>Triagem Clínica</span>
              </div>
              <span className={`text-[10px] font-semibold ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                {history.length + 1} de {Math.max(nodes.length, 1)}
              </span>
            </div>

            {/* Form Step Content */}
            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
              {isSubmitted ? (
                /* Success screen */
                <div className="text-center py-10 space-y-5 animate-in fade-in duration-300 my-auto">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Triagem Finalizada!</h3>
                    <p className={`text-xs max-w-sm mx-auto leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      Em um site publicado, os dados seriam salvos na sua lista de pacientes e o paciente seria encaminhado para o seu WhatsApp.
                    </p>
                  </div>
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-2 shadow-lg hover:opacity-95 active:scale-[0.98]"
                      style={{
                        background: `linear-gradient(135deg, ${primaryStart}, ${primaryEnd})`,
                        color: contrast,
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Testar Novamente
                    </button>
                  </div>
                </div>
              ) : currentNode ? (
                /* Step View */
                <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
                  {/* Step Back button */}
                  {currentNode.type !== 'start' && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        isLight ? 'text-slate-400 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                    </button>
                  )}

                  {/* Question Title & Subtitle */}
                  <div className="space-y-1.5">
                    <h2 className={`text-lg sm:text-xl font-bold leading-snug ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                      {currentNode.data?.title || 'Título da Etapa'}
                    </h2>
                    {currentNode.data?.subtitle && (
                      <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        {currentNode.data.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Dynamic Inputs by Type */}
                  <div className="pt-2">
                    {/* START NODE */}
                    {currentNode.type === 'start' && (
                      <div className="text-center py-6 space-y-5">
                        <p className={`text-xs max-w-md mx-auto leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                          {currentNode.data?.subtitle || 'Preencha os dados e siga as etapas para iniciarmos o acompanhamento.'}
                        </p>
                        <button
                          type="button"
                          onClick={handleNext}
                          className="px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 mx-auto shadow-lg transition-all cursor-pointer hover:opacity-95 active:scale-[0.98]"
                          style={{
                            background: `linear-gradient(135deg, ${primaryStart}, ${primaryEnd})`,
                            color: contrast,
                          }}
                        >
                          {currentNode.data?.buttonText || 'Iniciar'}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* TEXT / NOME */}
                    {(currentNode.type === 'nome' || currentNode.type === 'texto') && (
                      <input
                        type="text"
                        autoFocus
                        value={currentNode.type === 'nome' ? nome : (customAnswers[currentNode.id] || '')}
                        onChange={(e) => {
                          if (currentNode.type === 'nome') setNome(e.target.value);
                          else setCustomAnswers((prev) => ({ ...prev, [currentNode.id]: e.target.value }));
                          setErrorMsg('');
                        }}
                        placeholder={currentNode.data?.placeholder || 'Digite sua resposta...'}
                        className={`w-full text-base p-3.5 rounded-xl border outline-none transition-all ${
                          isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand-gradient-start)] focus:bg-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-[var(--brand-gradient-start)] focus:bg-zinc-950'
                        }`}
                      />
                    )}

                    {/* PARAGRAFO */}
                    {currentNode.type === 'paragrafo' && (
                      <textarea
                        autoFocus
                        rows={4}
                        value={customAnswers[currentNode.id] || ''}
                        onChange={(e) => {
                          setCustomAnswers((prev) => ({ ...prev, [currentNode.id]: e.target.value }));
                          setErrorMsg('');
                        }}
                        placeholder={currentNode.data?.placeholder || 'Digite sua resposta com detalhes...'}
                        className={`w-full text-sm p-3.5 rounded-xl border outline-none transition-all resize-none ${
                          isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand-gradient-start)] focus:bg-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-[var(--brand-gradient-start)] focus:bg-zinc-950'
                        }`}
                      />
                    )}

                    {/* CELULAR / WHATSAPP */}
                    {(currentNode.type === 'celular' || currentNode.type === 'contato') && (
                      <div className="flex gap-2 items-center">
                        <select
                          value={selectedPhoneCountry.code}
                          onChange={(e) => {
                            const c = countriesList.find((item) => item.code === e.target.value);
                            if (c) setSelectedPhoneCountry(c);
                          }}
                          className={`h-12 px-3 border rounded-xl text-xs outline-none shrink-0 cursor-pointer ${
                            isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[var(--brand-gradient-start)]'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-200 focus:border-[var(--brand-gradient-start)]'
                          }`}
                        >
                          {countriesList.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.dialCode}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          autoFocus
                          value={rawPhone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          placeholder={currentNode.data?.placeholder || selectedPhoneCountry.placeholder}
                          className={`flex-1 h-12 px-4 border rounded-xl text-sm outline-none transition-all ${
                            isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand-gradient-start)] focus:bg-white'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-[var(--brand-gradient-start)] focus:bg-zinc-950'
                          }`}
                        />
                      </div>
                    )}

                    {/* EMAIL */}
                    {currentNode.type === 'email' && (
                      <input
                        type="email"
                        autoFocus
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder={currentNode.data?.placeholder || 'seu.email@exemplo.com'}
                        className={`w-full text-base p-3.5 rounded-xl border outline-none transition-all ${
                          isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand-gradient-start)] focus:bg-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-[var(--brand-gradient-start)] focus:bg-zinc-950'
                        }`}
                      />
                    )}

                    {/* CPF */}
                    {currentNode.type === 'cpf' && (
                      <input
                        type="text"
                        autoFocus
                        value={cpf}
                        onChange={(e) => handleCPFChange(e.target.value)}
                        placeholder={currentNode.data?.placeholder || '000.000.000-00'}
                        className={`w-full text-base p-3.5 rounded-xl border outline-none font-mono transition-all ${
                          isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand-gradient-start)] focus:bg-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-[var(--brand-gradient-start)] focus:bg-zinc-950'
                        }`}
                      />
                    )}

                    {/* MAIORIDADE */}
                    {currentNode.type === 'maioridade' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setMaioridade('Sim');
                              setIsUnderageResponsible(false);
                              setErrorMsg('');
                            }}
                            className={`p-3.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                              maioridade === 'Sim'
                                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                                : isLight
                                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            Sim (18+)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMaioridade('Não');
                              setIsUnderageResponsible(true);
                              setErrorMsg('');
                            }}
                            className={`p-3.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                              maioridade === 'Não'
                                ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20'
                                : isLight
                                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            Não (Menor de idade)
                          </button>
                        </div>

                        {maioridade === 'Não' && (
                          <div className={`p-4 rounded-xl border space-y-3 mt-3 animate-in fade-in duration-200 ${
                            isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-amber-500/5 border-amber-500/30'
                          }`}>
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                              Dados do Responsável Legal
                            </span>
                            <input
                              type="text"
                              value={responsibleName}
                              onChange={(e) => { setResponsibleName(e.target.value); setErrorMsg(''); }}
                              placeholder="Nome do Responsável"
                              className={`w-full text-xs p-2.5 rounded-lg border outline-none ${
                                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                              }`}
                            />
                            <input
                              type="tel"
                              value={responsiblePhone}
                              onChange={(e) => { setResponsiblePhone(e.target.value); setErrorMsg(''); }}
                              placeholder="WhatsApp do Responsável"
                              className={`w-full text-xs p-2.5 rounded-lg border outline-none ${
                                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* CONTATO DE EMERGENCIA */}
                    {currentNode.type === 'emergencia' && (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={emergencyName}
                          onChange={(e) => { setEmergencyName(e.target.value); setErrorMsg(''); }}
                          placeholder="Nome do contato de emergência"
                          className={`w-full text-xs p-3 rounded-xl border outline-none ${
                            isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                          }`}
                        />
                        <input
                          type="text"
                          value={emergencyKinship}
                          onChange={(e) => { setEmergencyKinship(e.target.value); setErrorMsg(''); }}
                          placeholder="Grau de parentesco (Ex: Mãe, Irmão, Cônjuge)"
                          className={`w-full text-xs p-3 rounded-xl border outline-none ${
                            isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                          }`}
                        />
                        <input
                          type="tel"
                          value={emergencyPhone}
                          onChange={(e) => { setEmergencyPhone(e.target.value); setErrorMsg(''); }}
                          placeholder="Telefone / WhatsApp de emergência"
                          className={`w-full text-xs p-3 rounded-xl border outline-none ${
                            isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                          }`}
                        />
                      </div>
                    )}

                    {/* CONTRATO / TCLE */}
                    {currentNode.type === 'contrato' && (
                      <div className="space-y-4">
                        <div className={`max-h-48 overflow-y-auto p-3.5 border rounded-xl text-xs leading-relaxed font-sans whitespace-pre-wrap ${
                          isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                        }`}>
                          {currentNode.data?.contractText || 'Termos e Condições do Atendimento Clínico Psicológico.'}
                        </div>
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={contractAccepted}
                            onChange={(e) => {
                              setContractAccepted(e.target.checked);
                              setErrorMsg('');
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-[var(--brand-gradient-start)] cursor-pointer"
                          />
                          <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                            Li e concordo com os termos descritos acima
                          </span>
                        </label>
                      </div>
                    )}

                    {/* SELETOR / ESCOLHA UNICA OU MULTIPLA */}
                    {(currentNode.type === 'seletor' || currentNode.type === 'escolha' || currentNode.type === 'escolha_multipla') && (
                      <div className="space-y-2">
                        {(currentNode.data?.options || []).map((opt: any, idx: number) => {
                          const isMultiple = currentNode.data?.isMultiple;
                          const currentVal = customAnswers[currentNode.id];
                          const isSelected = isMultiple
                            ? Array.isArray(currentVal) && currentVal.includes(opt.value || opt.label)
                            : currentVal === (opt.value || opt.label);

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (isMultiple) {
                                  const list = Array.isArray(currentVal) ? [...currentVal] : [];
                                  const val = opt.value || opt.label;
                                  const nextList = list.includes(val) ? list.filter((i) => i !== val) : [...list, val];
                                  setCustomAnswers((prev) => ({ ...prev, [currentNode.id]: nextList }));
                                } else {
                                  setCustomAnswers((prev) => ({ ...prev, [currentNode.id]: opt.value || opt.label }));
                                }
                                setErrorMsg('');
                              }}
                              className={`w-full p-3.5 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 text-slate-900 dark:text-white ring-2 ring-[var(--brand-gradient-start)]/20'
                                  : isLight
                                  ? 'border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                                  : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100'
                              }`}
                            >
                              <span>{opt.label}</span>
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)] text-white'
                                    : isLight
                                    ? 'border-slate-300 bg-white'
                                    : 'border-zinc-700 bg-zinc-800'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Bottom Actions Bar */}
              {currentNode && currentNode.type !== 'start' && !isSubmitted && (
                <div className={`flex items-center justify-between pt-5 border-t mt-6 ${
                  isLight ? 'border-slate-100' : 'border-zinc-800/80'
                }`}>
                  <span className="text-xs text-red-500 font-semibold min-h-[16px]">
                    {errorMsg}
                  </span>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isPending}
                    className="px-6 h-11 rounded-xl cursor-pointer font-bold text-xs transition-all shadow-md flex items-center gap-2 hover:opacity-95 active:scale-[0.98]"
                    style={{
                      background: `linear-gradient(135deg, ${primaryStart}, ${primaryEnd})`,
                      color: contrast,
                    }}
                  >
                    {isPending ? 'Processando...' : (currentNode.data?.buttonText || (resolveNextNodeId() ? 'Avançar' : 'Concluir'))}
                    {!isPending && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
