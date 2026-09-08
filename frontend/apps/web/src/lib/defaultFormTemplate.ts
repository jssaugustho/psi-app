/**
 * Template Padrão de Formulário de Triagem Clínica
 * 
 * Este arquivo define o modelo inicial de formulários para todos os novos workspaces e páginas de captação.
 * Para editar as perguntas padrão, textos, botões ou ordem dos nós no futuro, modifique este arquivo.
 */

export interface FormNodeData {
  title: string;
  subtitle?: string;
  placeholder?: string;
  isRequired?: boolean;
  buttonText?: string;
  contractText?: string;
  options?: Array<{ label: string; value: string }>;
  variableKey?: string;
  variableLabel?: string;
  [key: string]: any;
}

export interface FormNodeSpec {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: FormNodeData;
}

export interface FormEdgeSpec {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface FormFlowTemplate {
  nodes: FormNodeSpec[];
  edges: FormEdgeSpec[];
  settings?: {
    successAction?: 'whatsapp' | 'redirect';
    whatsappMessageTemplate?: string;
  };
}

export const DEFAULT_FORM_FLOW: FormFlowTemplate = {
  nodes: [
    {
      id: 'start',
      type: 'start',
      position: { x: 80, y: 150 },
      data: {
        title: 'Início do Formulário',
        isRequired: true,
      },
    },
    {
      id: 'nome',
      type: 'nome',
      position: { x: 460, y: 150 },
      data: {
        title: 'Qual é o seu nome completo?',
        subtitle: 'Como gostaria de ser chamado(a) pelo seu terapeuta.',
        placeholder: 'Escreva seu nome completo...',
        isRequired: true,
        buttonText: 'Avançar',
      },
    },
    {
      id: 'maioridade',
      type: 'maioridade',
      position: { x: 840, y: 150 },
      data: {
        title: 'Você é maior de idade?',
        subtitle: 'Caso seja menor de 18 anos, solicitaremos os dados do responsável legal.',
        isRequired: true,
        options: [
          { label: 'Sim, sou maior de 18 anos', value: 'Sim' },
          { label: 'Não, sou menor de idade', value: 'Não' },
        ],
        buttonText: 'Avançar',
      },
    },
    {
      id: 'responsavel',
      type: 'responsavel',
      position: { x: 1220, y: 320 },
      data: {
        title: 'Dados do Responsável Legal',
        subtitle: 'Por você ser menor de idade, informe o nome, grau de parentesco e telefone de contato do seu responsável.',
        isRequired: true,
        buttonText: 'Avançar',
      },
    },
    {
      id: 'celular',
      type: 'celular',
      position: { x: 1600, y: 150 },
      data: {
        title: 'Qual é o seu WhatsApp para contato?',
        subtitle: 'Usaremos para confirmar o horário e enviar o link da sessão.',
        placeholder: '(11) 99999-9999',
        isRequired: true,
        buttonText: 'Avançar',
      },
    },
    {
      id: 'contrato',
      type: 'contrato',
      position: { x: 1980, y: 150 },
      data: {
        title: 'Termo de Consentimento e Sigilo Profissional',
        subtitle: 'Leia e confirme para concluir sua solicitação de agendamento.',
        contractText:
          'Ao prosseguir, você declara estar ciente de que os atendimentos psicológicos são realizados em conformidade com o Código de Ética Profissional do Psicólogo e as diretrizes do Conselho Federal de Psicologia (CFP). As informações fornecidas são confidenciais, protegidas por sigilo profissional e tratadas nos termos da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).',
        isRequired: true,
        buttonText: 'Concluir Triagem',
      },
    },
  ],
  edges: [
    { id: 'e-start-nome', source: 'start', target: 'nome' },
    { id: 'e-nome-maioridade', source: 'nome', target: 'maioridade' },
    { id: 'e-maioridade-celular', source: 'maioridade', target: 'celular', sourceHandle: 'source-maior' },
    { id: 'e-maioridade-responsavel', source: 'maioridade', target: 'responsavel', sourceHandle: 'source-menor' },
    { id: 'e-responsavel-celular', source: 'responsavel', target: 'celular' },
    { id: 'e-celular-contrato', source: 'celular', target: 'contrato' },
  ],
  settings: {
    successAction: 'whatsapp',
    whatsappMessageTemplate:
      'Olá! Preenchi a triagem inicial pelo seu site e gostaria de agendar minha sessão. Meu nome é {{nome}}.',
  },
};

/**
 * Retorna uma cópia limpa e independente da estrutura do formulário padrão.
 */
export function getDefaultFormFlow(): FormFlowTemplate {
  return JSON.parse(JSON.stringify(DEFAULT_FORM_FLOW));
}
