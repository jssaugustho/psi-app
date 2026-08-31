"use client"

import React, { useState, useEffect, useTransition } from "react"
import { X, ArrowRight, ArrowLeft, Check, Sparkles, MessageSquare } from "lucide-react"

// Country configuration for phone masks (copied from reference)
export interface CountryConfig {
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
  { code: "US", flag: "🇺🇸", name: "EUA", dialCode: "+1", mask: "(999) 999-9999", placeholder: "(201) 555-0123" },
  { code: "ES", flag: "🇪🇸", name: "Espanha", dialCode: "+34", mask: "999 999 999", placeholder: "612 345 678" },
  { code: "GB", flag: "🇬🇧", name: "Reino Unido", dialCode: "+44", mask: "9999 999999", placeholder: "7700 900077" },
];

export interface FormNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    title: string;
    subtitle?: string;
    placeholder?: string;
    isRequired: boolean;
    options?: Array<{ label: string; value: string; nextId?: string }>;
    contractTemplateId?: string;
    contractText?: string;
  };
}

export interface FormEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

interface TypeformModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  pageId: string;
  formFlow: {
    nodes: FormNode[];
    edges: FormEdge[];
    settings: {
      successAction: 'whatsapp' | 'redirect';
      successRedirectUrl?: string;
      whatsappMessageTemplate?: string;
    };
  };
  whatsappNumber?: string; // Number of the psychologist
  contractText?: string;   // Minuta do contrato resolved
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

export function TypeformModal({
  open,
  onOpenChange,
  tenantId,
  pageId,
  formFlow,
  whatsappNumber = "",
  contractText = "Ao assinar este termo você concorda com o atendimento clínico."
}: TypeformModalProps) {
  const [currentNodeId, setCurrentNodeId] = useState<string>("start")
  const [history, setHistory] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Form states matching all standard nodes
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [selectedPhoneCountry, setSelectedPhoneCountry] = useState<CountryConfig>(countriesList[0])
  const [rawPhone, setRawPhone] = useState("")
  const [cpf, setCpf] = useState("")
  const [maioridade, setMaioridade] = useState("")
  const [emergenciaNome, setEmergenciaNome] = useState("")
  const [emergenciaRelacao, setEmergenciaRelacao] = useState("")
  const [emergenciaTelefone, setEmergenciaTelefone] = useState("")
  const [contratoAceito, setContratoAceito] = useState(false)
  const [responsavelNome, setResponsavelNome] = useState("")
  const [responsavelCpf, setResponsavelCpf] = useState("")
  const [responsavelTelefone, setResponsavelTelefone] = useState("")

  // Custom steps states: dictionary mapping node ID to answer
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({})

  const nodes = formFlow.nodes
  const edges = formFlow.edges
  const settings = formFlow.settings

  const currentNode = nodes.find(n => n.id === currentNodeId) || nodes.find(n => n.type === 'start') || nodes[0]

  // Form progress percent
  const getProgressPercent = () => {
    const totalSteps = nodes.length - 1; // skip start node
    if (totalSteps <= 0) return 100;
    const currentStepIndex = history.length;
    return Math.min(Math.round((currentStepIndex / totalSteps) * 100), 100);
  }

  // Formatting inputs
  const formatCPF = (value: string) => {
    const clean = value.replace(/\D/g, "")
    if (clean.length <= 3) return clean
    if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`
    if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`
  }

  const formatPhoneNumber = (digits: string, mask: string) => {
    let digitIdx = 0
    let formatted = ""
    for (let i = 0; i < mask.length && digitIdx < digits.length; i++) {
      if (mask[i] === "9") {
        formatted += digits[digitIdx]
        digitIdx++
      } else {
        formatted += mask[i]
      }
    }
    return formatted
  }

  // Next Node Resolution (Branching logic)
  const resolveNextNodeId = () => {
    if (!currentNode) return null

    // 1. If selector step (seletor), resolve based on edges with specific option handles (opt_idx)
    if (currentNode.type === "seletor") {
      const selectedValue = customAnswers[currentNode.id];
      const options = currentNode.data.options || [];
      const optionIndex = options.findIndex((o: any) => o.value === selectedValue || o.label === selectedValue);
      
      if (optionIndex !== -1) {
        const handleId = `opt_${optionIndex}`;
        const matchingEdge = edges.find(e => e.source === currentNode.id && e.sourceHandle === handleId);
        if (matchingEdge) {
          return matchingEdge.target;
        }
      }
    }

    // 2. Fallback to normal connected edge
    const outgoingEdge = edges.find(e => e.source === currentNode.id)
    return outgoingEdge ? outgoingEdge.target : null
  }

  // Validate step input
  const validateCurrentStep = (): boolean => {
    setErrorMsg("")
    if (!currentNode) return false

    const isRequired = currentNode.data.isRequired
    const type = currentNode.type

    if (type === "start") return true

    if (type === "nome") {
      if (isRequired && !nome.trim()) {
        setErrorMsg("Por favor, informe seu nome para continuar.")
        return false
      }
    } else if (type === "celular") {
      if (isRequired && rawPhone.length < 7) {
        setErrorMsg("Por favor, informe um número de WhatsApp válido.")
        return false
      }
    } else if (type === "email") {
      if (isRequired && !email.trim()) {
        setErrorMsg("Por favor, informe seu e-mail.")
        return false
      }
      if (email.trim() && !/\S+@\S+\.\S+/.test(email)) {
        setErrorMsg("Por favor, informe um e-mail válido.")
        return false
      }
    } else if (type === "cpf") {
      if (isRequired && !validateCPFHelper(cpf)) {
        setErrorMsg("Por favor, informe um CPF válido.")
        return false
      }
    } else if (type === "maioridade") {
      if (isRequired && !maioridade) {
        setErrorMsg("Por favor, selecione uma opção.")
        return false
      }
      if (maioridade === "Não") {
        if (!responsavelNome.trim()) {
          setErrorMsg("Por favor, preencha o nome do responsável.")
          return false
        }
        if (!validateCPFHelper(responsavelCpf)) {
          setErrorMsg("Por favor, informe um CPF válido para o responsável.")
          return false
        }
        if (responsavelTelefone.replace(/\D/g, '').length < 8) {
          setErrorMsg("Por favor, informe um telefone válido para o responsável.")
          return false
        }
      }
    } else if (type === "contrato") {
      if (!contratoAceito) {
        setErrorMsg("Por favor, você precisa aceitar os termos do contrato para continuar.")
        return false
      }
    } else if (type === "emergencia") {
      if (isRequired && (!emergenciaNome.trim() || !emergenciaRelacao.trim() || emergenciaTelefone.length < 7)) {
        setErrorMsg("Por favor, preencha todos os campos do contato de emergência.")
        return false
      }
    } else {
      // Custom generic inputs
      const answer = customAnswers[currentNode.id]
      if (isRequired && (!answer || (typeof answer === "string" && !answer.trim()))) {
        setErrorMsg("Por favor, preencha este campo para continuar.")
        return false
      }
    }

    return true
  }

  const handleNext = () => {
    if (!validateCurrentStep()) return

    const nextId = resolveNextNodeId()
    if (nextId) {
      setHistory(prev => [...prev, currentNodeId])
      setCurrentNodeId(nextId)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    setErrorMsg("")
    if (history.length > 0) {
      const previous = history[history.length - 1]
      setHistory(prev => prev.slice(0, -1))
      setCurrentNodeId(previous)
    }
  }

  const handleSelectChoice = (value: string, label: string) => {
    if (currentNode?.type === "maioridade") {
      setMaioridade(value)
    } else if (currentNode) {
      setCustomAnswers(prev => ({ ...prev, [currentNode.id]: value }))
    }
    setErrorMsg("")

    // Auto-advance with small delay for UX
    setTimeout(() => {
      const nextId = resolveNextNodeId()
      if (nextId) {
        setHistory(prev => [...prev, currentNodeId])
        setCurrentNodeId(nextId)
      } else {
        handleSubmit()
      }
    }, 250)
  }

  const handleSubmit = async () => {
    // Compile all responses
    const compiledResponses: Record<string, any> = {
      nome,
      email,
      celular: `${selectedPhoneCountry.dialCode} ${formatPhoneNumber(rawPhone, selectedPhoneCountry.mask)}`,
      cpf: cpf.replace(/\D/g, ""),
      maioridade,
      responsavelNome,
      responsavelCpf: responsavelCpf.replace(/\D/g, ""),
      responsavelTelefone: responsavelTelefone.replace(/\D/g, ""),
      contrato: contratoAceito,
      emergencia: {
        nome: emergenciaNome,
        relacao: emergenciaRelacao,
        telefone: emergenciaTelefone
      },
      ...customAnswers
    }

    const payload = {
      tenantId,
      pageId,
      responses: compiledResponses
    }

    startTransition(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/v1'}/crm/captacao/public/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!res.ok) throw new Error('Falha ao enviar triagem')

        setIsSubmitted(true)
      } catch (err) {
        console.error('Error submitting form:', err)
        setErrorMsg("Ocorreu um erro ao enviar sua triagem. Por favor tente novamente.")
      }
    })
  }

  // Keybindings for Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open || isSubmitted) return
      if (e.key === "Enter" && !e.shiftKey) {
        // Skip enter if user is inside a textarea (Parágrafo node)
        if (currentNode?.type === "paragrafo") return
        e.preventDefault()
        handleNext()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, currentNodeId, nome, email, rawPhone, cpf, maioridade, emergenciaNome, emergenciaRelacao, emergenciaTelefone, contratoAceito, customAnswers, isSubmitted])

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setCurrentNodeId("start")
      setHistory([])
      setIsSubmitted(false)
      setNome("")
      setEmail("")
      setRawPhone("")
      setCpf("")
      setMaioridade("")
      setEmergenciaNome("")
      setEmergenciaRelacao("")
      setEmergenciaTelefone("")
      setContratoAceito(false)
      setCustomAnswers({})
      setErrorMsg("")
    }, 300)
  }

  if (!open) return null

  // WhatsApp success link helper
  const getWhatsAppLink = () => {
    if (!whatsappNumber) return null
    const cleanNum = whatsappNumber.replace(/\D/g, "")
    const textTemplate = settings.whatsappMessageTemplate || "Olá, preenchi a triagem pelo site."
    const resolvedText = textTemplate.replace("{{nome}}", nome)
    return `https://wa.me/${cleanNum}?text=${encodeURIComponent(resolvedText)}`
  }

  const progressPercent = getProgressPercent()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 animate-in fade-in duration-300">
      <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-[#0F0F12] text-foreground sm:rounded-2xl border-0 sm:border border-border/20 shadow-2xl flex flex-col justify-between overflow-hidden relative">
        
        {/* Progress Bar */}
        <div className="w-full bg-muted/20 h-1.5 relative">
          <div 
            className="bg-[var(--brand-gradient-start,#CC8667)] h-full transition-all duration-300 ease-out"
            style={{ width: `${isSubmitted ? 100 : progressPercent}%` }}
          />
        </div>

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/10">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <Sparkles className="h-3.5 w-3.5 text-[var(--brand-gradient-start,#CC8667)]" />
            <span>Triagem Clínica</span>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10 sm:py-12 flex flex-col justify-center min-h-[350px]">
          {isSubmitted ? (
            /* Success View */
            <div className="flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Check className="h-8 w-8 stroke-[2.5]" />
              </div>
              <h3 className="text-2xl font-serif text-foreground font-normal">
                Triagem Enviada com Sucesso!
              </h3>
              <p className="text-muted-foreground max-w-md leading-relaxed text-sm sm:text-base">
                Seus dados foram consolidados no prontuário. Clique no botão abaixo para iniciar nosso contato e agendar sua sessão.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 items-center justify-center">
                {whatsappNumber && (
                  <a
                    href={getWhatsAppLink() || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer font-medium text-sm sm:text-base transition-colors flex items-center gap-2 decoration-0"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Falar no WhatsApp
                  </a>
                )}
                <button
                  onClick={handleClose}
                  className="px-6 h-12 bg-zinc-800 hover:bg-zinc-700 text-foreground rounded-xl cursor-pointer font-medium text-sm sm:text-base transition-all border border-border/10"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            /* Question step view */
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {currentNode.type !== "start" && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3 w-3" /> Voltar
                </button>
              )}

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-serif text-foreground font-normal leading-snug">
                  {currentNode.data.title}
                </h2>
                {currentNode.data.subtitle && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {currentNode.data.subtitle}
                  </p>
                )}
              </div>

              {/* Dynamic Inputs by Type */}
              <div className="pt-2">
                {/* START NODE */}
                {currentNode.type === "start" && (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-6">
                      Preencha os dados e siga as etapas para iniciarmos o acompanhamento.
                    </p>
                    <button
                      onClick={handleNext}
                      className="px-6 h-12 brand-accent rounded-xl text-sm font-semibold flex items-center gap-2 mx-auto"
                    >
                      Iniciar <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* TEXT / NOME */}
                {(currentNode.type === "nome" || currentNode.type === "texto") && (
                  <input
                    type="text"
                    autoFocus
                    value={currentNode.type === "nome" ? nome : (customAnswers[currentNode.id] || "")}
                    onChange={(e) => {
                      if (currentNode.type === "nome") setNome(e.target.value)
                      else setCustomAnswers(prev => ({ ...prev, [currentNode.id]: e.target.value }))
                      setErrorMsg("")
                    }}
                    placeholder={currentNode.data.placeholder || "Escreva aqui..."}
                    className="w-full text-lg p-3 bg-zinc-900 border-b border-zinc-700 focus:border-[var(--brand-gradient-start,#CC8667)] outline-none text-foreground placeholder:text-muted-foreground/40 transition-colors"
                  />
                )}

                {/* PARAGRAFO (TEXTAREA) */}
                {currentNode.type === "paragrafo" && (
                  <textarea
                    autoFocus
                    rows={4}
                    value={customAnswers[currentNode.id] || ""}
                    onChange={(e) => {
                      setCustomAnswers(prev => ({ ...prev, [currentNode.id]: e.target.value }))
                      setErrorMsg("")
                    }}
                    placeholder={currentNode.data.placeholder || "Digite sua resposta..."}
                    className="w-full text-base p-3 bg-zinc-900 rounded-xl border border-zinc-700 focus:border-[var(--brand-gradient-start,#CC8667)] outline-none text-foreground placeholder:text-muted-foreground/40 transition-colors resize-none"
                  />
                )}

                {/* CELULAR */}
                {currentNode.type === "celular" && (
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <select
                      value={selectedPhoneCountry.code}
                      onChange={(e) => {
                        const match = countriesList.find(c => c.code === e.target.value)
                        if (match) setSelectedPhoneCountry(match)
                      }}
                      className="h-12 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-foreground text-sm focus:border-[var(--brand-gradient-start,#CC8667)] outline-none w-full sm:w-32"
                    >
                      {countriesList.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      autoFocus
                      value={rawPhone}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, "")
                        setRawPhone(clean)
                        setErrorMsg("")
                      }}
                      placeholder={selectedPhoneCountry.placeholder}
                      className="flex-1 h-12 px-4 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-[var(--brand-gradient-start,#CC8667)] outline-none text-foreground placeholder:text-muted-foreground/40 transition-colors w-full"
                    />
                  </div>
                )}

                {/* EMAIL */}
                {currentNode.type === "email" && (
                  <input
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setErrorMsg("")
                    }}
                    placeholder={currentNode.data.placeholder || "exemplo@email.com"}
                    className="w-full text-lg p-3 bg-zinc-900 border-b border-zinc-700 focus:border-[var(--brand-gradient-start,#CC8667)] outline-none text-foreground placeholder:text-muted-foreground/40 transition-colors"
                  />
                )}

                {/* CPF */}
                {currentNode.type === "cpf" && (
                  <input
                    type="text"
                    autoFocus
                    value={cpf}
                    onChange={(e) => {
                      setCpf(formatCPF(e.target.value))
                      setErrorMsg("")
                    }}
                    placeholder="000.000.000-00"
                    className="w-full text-lg p-3 bg-zinc-900 border-b border-zinc-700 focus:border-[var(--brand-gradient-start,#CC8667)] outline-none text-foreground placeholder:text-muted-foreground/40 transition-colors"
                  />
                )}

                {/* MAIORIDADE */}
                {currentNode.type === "maioridade" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        onClick={() => { setMaioridade("Sim"); setErrorMsg(""); }}
                        className={`h-16 px-6 text-left rounded-xl border text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          maioridade === "Sim"
                            ? "border-[var(--brand-gradient-start,#CC8667)] bg-[var(--brand-gradient-start,#CC8667)]/10 text-white"
                            : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>Sim, sou maior de idade</span>
                        <span className="w-5 h-5 rounded-full border border-border/30 flex items-center justify-center text-[10px]">A</span>
                      </button>
                      <button
                        onClick={() => { setMaioridade("Não"); setErrorMsg(""); }}
                        className={`h-16 px-6 text-left rounded-xl border text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          maioridade === "Não"
                            ? "border-[var(--brand-gradient-start,#CC8667)] bg-[var(--brand-gradient-start,#CC8667)]/10 text-white"
                            : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>Não, sou menor de idade</span>
                        <span className="w-5 h-5 rounded-full border border-border/30 flex items-center justify-center text-[10px]">B</span>
                      </button>
                    </div>

                    {maioridade === "Não" && (
                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <span className="text-xs font-bold text-[var(--brand-gradient-start,#CC8667)] uppercase tracking-wider block">
                          Dados do Responsável Legal:
                        </span>
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Nome do Responsável:</label>
                          <input
                            type="text"
                            value={responsavelNome}
                            onChange={(e) => { setResponsavelNome(e.target.value); setErrorMsg(""); }}
                            placeholder="Ex: Carlos Silva"
                            className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-[var(--brand-gradient-start,#CC8667)] outline-none text-foreground text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">CPF do Responsável:</label>
                            <input
                              type="text"
                              value={responsavelCpf}
                              onChange={(e) => { setResponsavelCpf(formatCPF(e.target.value)); setErrorMsg(""); }}
                              placeholder="000.000.000-00"
                              className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-[var(--brand-gradient-start,#CC8667)] outline-none text-foreground text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Telefone do Responsável:</label>
                            <input
                              type="tel"
                              value={responsavelTelefone}
                              onChange={(e) => { setResponsavelTelefone(e.target.value); setErrorMsg(""); }}
                              placeholder="(11) 99999-9999"
                              className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-[var(--brand-gradient-start,#CC8667)] outline-none text-foreground text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* CONTRATO / TCLE */}
                {currentNode.type === "contrato" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs text-muted-foreground max-h-60 overflow-y-auto custom-scrollbar font-sans whitespace-pre-wrap leading-relaxed">
                      {currentNode.data.contractText || contractText || "Ao assinar este termo você concorda com o atendimento clínico e triagem."}
                    </div>
                    <div className="flex items-start gap-2.5 pt-2">
                      <input
                        type="checkbox"
                        id="check-contrato"
                        checked={contratoAceito}
                        onChange={(e) => { setContratoAceito(e.target.checked); setErrorMsg(""); }}
                        className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-[var(--brand-gradient-start,#CC8667)] cursor-pointer"
                      />
                      <label htmlFor="check-contrato" className="text-xs text-slate-300 cursor-pointer select-none leading-relaxed">
                        Li, compreendo e concordo com todos os termos do contrato/TCLE e autorizo a coleta dos dados para fins de triagem (LGPD).
                      </label>
                    </div>
                  </div>
                )}

                {/* CONTATO DE EMERGENCIA */}
                {currentNode.type === "emergencia" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Nome do Contato:</label>
                      <input
                        type="text"
                        autoFocus
                        value={emergenciaNome}
                        onChange={(e) => { setEmergenciaNome(e.target.value); setErrorMsg(""); }}
                        placeholder="Ex: Maria Silva"
                        className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-[var(--brand-gradient-start,#CC8667)] outline-none text-foreground text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Relação/Parentesco:</label>
                        <input
                          type="text"
                          value={emergenciaRelacao}
                          onChange={(e) => { setEmergenciaRelacao(e.target.value); setErrorMsg(""); }}
                          placeholder="Ex: Cônjuge, Mãe, Amigo"
                          className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-[var(--brand-gradient-start,#CC8667)] outline-none text-foreground text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Telefone Celular:</label>
                        <input
                          type="tel"
                          value={emergenciaTelefone}
                          onChange={(e) => { setEmergenciaTelefone(e.target.value); setErrorMsg(""); }}
                          placeholder="(11) 99999-9999"
                          className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-[var(--brand-gradient-start,#CC8667)] outline-none text-foreground text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* CUSTOM SELECTOR (SELETOR CONDICIONAL) */}
                {currentNode.type === "seletor" && (
                  <div className="grid grid-cols-1 gap-2.5">
                    {currentNode.data.options?.map((opt, idx) => {
                      const isSelected = customAnswers[currentNode.id] === opt.value
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectChoice(opt.value, opt.label)}
                          className={`h-12 px-4 text-left rounded-xl border text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? "border-[var(--brand-gradient-start,#CC8667)] bg-[var(--brand-gradient-start,#CC8667)]/10 text-white"
                              : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span>{opt.label}</span>
                          <span className="w-5 h-5 rounded bg-zinc-800 border border-border/20 text-muted-foreground/60 text-[9px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              {currentNode.type !== "start" && (
                <div className="flex items-center justify-between pt-4 border-t border-border/10">
                  <span className="text-xs text-red-400 font-semibold min-h-[16px]">{errorMsg}</span>
                  <button
                    onClick={handleNext}
                    disabled={isPending}
                    className="px-5 h-11 bg-zinc-800 hover:bg-zinc-700 text-foreground rounded-xl cursor-pointer font-semibold text-sm transition-all border border-border/10 flex items-center gap-1.5"
                  >
                    {isPending ? "Processando..." : (resolveNextNodeId() ? "Avançar" : "Concluir")}
                    {!isPending && <ArrowRight className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
