import { db } from '../shared/db';
import { workspaces } from '../shared/schema';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

// Mocks para geração de leads aleatórios
const firstNames = [
  'João', 'Maria', 'Pedro', 'Ana', 'Lucas', 'Julia', 'Carlos', 'Beatriz', 'Marcos', 'Fernanda',
  'Rafael', 'Camila', 'Bruno', 'Larissa', 'Thiago', 'Amanda', 'Felipe', 'Gabriela', 'Rodrigo', 'Juliana',
  'Gustavo', 'Letícia', 'André', 'Mariana', 'Daniel', 'Renata', 'Mateus', 'Luana', 'Diego', 'Patrícia'
];

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
  'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Dias', 'Vieira', 'Barbosa'
];

const clinicalNotes = [
  'Sinto muita ansiedade no trabalho e dificuldade para dormir.',
  'Gostaria de iniciar terapia para lidar com transição de carreira.',
  'Procuro atendimento para meu filho de 10 anos que está muito retraído.',
  'Terapia de casal para melhorar nossa comunicação.',
  'Estou passando por um luto recente e preciso de apoio.',
  'Tenho crises de pânico recorrentes há 3 meses.',
  'Quero autoconhecimento e aprender a estabelecer limites.',
  'Encaminhado pelo psiquiatra para acompanhamento de depressão.',
  'Estresse pós-traumático decorrente de um acidente de trânsito.',
  'Problemas de autoestima e insegurança nos relacionamentos afetivos.'
];

const utmSources = ['google', 'instagram', 'facebook', 'ig', 'fb', 'linkedin', 'newsletter', 'tiktok', 'youtube'];
const utmMediums = ['cpc', 'cpm', 'organic', 'email', 'social', 'sponsored', 'stories'];
const utmCampaigns = ['ansiedade_geral', 'autoestima_feminina', 'terapia_casal_2026', 'promocional_dia_saude', 'branding_clinica'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomPhone(): string {
  const ddd = randomElement(['11', '21', '31', '41', '51', '61', '71', '81']);
  const prefix = '9' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `(${ddd}) ${prefix}-${suffix}`;
}

function askSecret(promptText: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('🚀 Iniciando script de teste de carga de leads via Webhook...');

  // 1. Obter o primeiro Workspace do banco de dados
  const allWorkspaces = await db.select().from(workspaces);
  if (allWorkspaces.length === 0) {
    console.error('❌ Erro: Nenhum workspace encontrado no banco de dados para testar.');
    process.exit(1);
  }

  const workspace = allWorkspaces[0];
  const workspaceId = workspace.id;
  const workspaceName = workspace.name;
  console.log(`🏢 Workspace selecionado: ${workspaceName} (ID: ${workspaceId})`);
  console.log(`📋 Origens de tráfego configuradas no workspace:`, workspace.trafficSources);

  // Secret do Webhook (via arg CLI, env ou prompt interativo)
  let secret = process.argv[2] || process.env.WEBHOOK_SECRET || '';
  if (!secret) {
    const defaultSecretMsg = workspace.webhookSecret ? ` (pressione ENTER para usar o secret do DB: "${workspace.webhookSecret}")` : '';
    secret = await askSecret(`🔑 Digite o Secret do Webhook${defaultSecretMsg}: `);
    if (!secret && workspace.webhookSecret) {
      secret = workspace.webhookSecret;
    }
  }

  if (!secret) {
    console.error('❌ Erro: Secret do webhook não foi fornecido. Configure no CRM ou passe como argumento ao rodar o script.');
    process.exit(1);
  }

  console.log(`🔐 Secret configurado para envio no Header: "${secret}"`);

  // Endpoint do webhook
  const webhookUrl = `http://localhost:5000/crm/webhook?workspace_id=${workspaceId}`;
  console.log(`🔗 URL do Webhook: ${webhookUrl}\n`);

  let successCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  for (let i = 1; i <= 100; i++) {
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    const name = `${firstName} ${lastName}`;
    
    // 10% de chance de e-mail/telefone repetido para testar a deduplicação
    const isDuplicateTest = Math.random() < 0.1 && i > 10;
    
    let email = '';
    let phone = '';
    
    if (isDuplicateTest) {
      // Repetir um padrão prévio simples para gerar duplicados
      const dupNum = Math.floor(Math.random() * 5) + 1;
      email = `lead.duplicado.${dupNum}@example.com`;
      phone = `1198765432${dupNum}`;
    } else {
      const emailName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');
      email = `${emailName}.${Math.floor(Math.random() * 1000)}@example.com`;
      phone = generateRandomPhone();
    }

    const notes = Math.random() < 0.8 ? randomElement(clinicalNotes) : null;
    
    // Decidir se envia UTMs (80% de chance)
    const hasUtms = Math.random() < 0.8;
    const utm_source = hasUtms ? randomElement(utmSources) : null;
    const utm_medium = hasUtms ? randomElement(utmMediums) : null;
    const utm_campaign = hasUtms ? randomElement(utmCampaigns) : null;

    // 20% de chance de enviar uma origem direta ("source") sem UTMs
    const source = (!hasUtms && Math.random() < 0.5) ? randomElement(['Manual', 'Instagram', 'Indicação']) : null;

    const payload = {
      name,
      phone,
      email,
      notes,
      source,
      utm_source,
      utm_medium,
      utm_campaign,
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': secret,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errBody}`);
      }

      const result = (await response.json()) as any;

      if (result.success) {
        if (result.duplicate) {
          duplicateCount++;
          console.log(`[Lead ${i.toString().padStart(3, '0')}] ⚠️ Duplicado detectado: ${name} -> Timeline atualizada.`);
        } else {
          successCount++;
          console.log(`[Lead ${i.toString().padStart(3, '0')}] ✅ Criado: ${name} | Status: ${result.contact.status} | utm_source: ${utm_source || 'Direto'} -> Origem gravada: ${result.contact.source}`);
        }
      } else {
        errorCount++;
        console.error(`[Lead ${i.toString().padStart(3, '0')}] ❌ Falha:`, result);
      }
    } catch (err: any) {
      errorCount++;
      console.error(`[Lead ${i.toString().padStart(3, '0')}] ❌ Erro:`, err.message || err);
    }

    // Pequeno delay opcional para não atropelar o servidor (10ms)
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  console.log('\n📊 --- RESULTADOS DO TESTE ---');
  console.log(`✅ Novos Leads Criados: ${successCount}`);
  console.log(`⚠️ Tentativas de Re-cadastro (Duplicados): ${duplicateCount}`);
  console.log(`❌ Erros / Falhas: ${errorCount}`);
  console.log('------------------------------');
  process.exit(0);
}

main();
