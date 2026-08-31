import { db } from '../shared/db';
import { workspaces, pipelineColumns, visualIdentities } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function backfillWorkspaces() {
  console.log('🔄 Iniciando script de backfill para workspaces existentes...\n');

  try {
    // 1. Buscar todos os workspaces no banco
    const allWorkspaces = await db.query.workspaces.findMany();
    console.log(`📊 Encontrados ${allWorkspaces.length} workspaces cadastrados.`);

    if (allWorkspaces.length === 0) {
      console.log('ℹ️ Nenhum workspace encontrado para atualizar.');
      process.exit(0);
    }

    const newTrafficSources = ['Manual', 'Instagram', 'Google Ads', 'Facebook Ads', 'Indicação', 'TikTok', 'Site / Orgânico', 'Webhook'];
    const oldTrafficSources = ['Manual', 'Instagram', 'Google Ads', 'Facebook Ads', 'Webhook'];

    for (const ws of allWorkspaces) {
      console.log(`\n🏢 Processando Workspace: "${ws.name}" (${ws.id})`);

      // A. Verificar e criar colunas do Kanban se não existirem
      const columns = await db.query.pipelineColumns.findMany({
        where: eq(pipelineColumns.workspaceId, ws.id),
      });

      if (columns.length === 0) {
        console.log('   📋 Nenhuma coluna de pipeline encontrada. Criando colunas padrão...');
        await db.insert(pipelineColumns).values([
          { workspaceId: ws.id, name: 'Contato Inicial', slug: 'contato-inicial', color: '#6366F1', category: 'pendente', order: 0 },
          { workspaceId: ws.id, name: 'Triagem', slug: 'triagem', color: '#F59E0B', category: 'acolhimento', order: 1 },
          { workspaceId: ws.id, name: '1ª Sessão Agendada', slug: '1a-sessao-agendada', color: '#3B82F6', category: 'acolhimento', order: 2 },
          { workspaceId: ws.id, name: 'Sessão Realizada', slug: 'sessao-realizada', color: '#10B981', category: 'acolhimento', order: 3 },
          { workspaceId: ws.id, name: 'Paciente Ativo', slug: 'paciente-ativo', color: '#8B5CF6', category: 'paciente', order: 4 },
          { workspaceId: ws.id, name: 'Alta Clínica', slug: 'alta-clinica', color: '#14B8A6', category: 'alta', order: 5 },
          { workspaceId: ws.id, name: 'Arquivado', slug: 'arquivado', color: '#EF4444', category: 'negativa', order: 6 },
        ]);
        console.log('   ✅ Colunas padrão de pipeline criadas.');
      } else {
        console.log(`   📋 Workspace já possui ${columns.length} colunas no pipeline. Mantido.`);
      }

      // B. Verificar e criar identidade visual padrão se não existir
      const defaultVisualId = await db.query.visualIdentities.findFirst({
        where: and(
          eq(visualIdentities.workspaceId, ws.id),
          eq(visualIdentities.isWorkspaceDefault, true)
        ),
      });

      if (!defaultVisualId) {
        console.log('   🎨 Nenhuma identidade visual padrão encontrada. Criando...');
        await db.insert(visualIdentities).values({
          workspaceId: ws.id,
          name: 'Padrão',
          isWorkspaceDefault: true,
          primaryColor: '#4F46E5',
          secondaryColor: '#06B6D4',
          contrastColor: '#FFFFFF',
          bgColor: '#F8FAFC',
          cardColor: '#FFFFFF',
          textColor: '#0F172A',
          fontHeading: 'Playfair Display',
          fontBody: 'Inter',
        });
        console.log('   ✅ Identidade visual padrão criada.');
      } else {
        console.log('   🎨 Workspace já possui identidade visual padrão. Mantida.');
      }

      // C. Atualizar as fontes de tráfego se estiverem usando o padrão antigo
      const currentSources = ws.trafficSources;
      const isOldDefault = JSON.stringify(currentSources) === JSON.stringify(oldTrafficSources);
      const isEmpty = !currentSources || currentSources.length === 0;

      if (isOldDefault || isEmpty) {
        console.log('   🚦 Detectado fontes de tráfego antigas ou vazias. Atualizando para os novos padrões...');
        await db.update(workspaces)
          .set({ trafficSources: newTrafficSources })
          .where(eq(workspaces.id, ws.id));
        console.log('   ✅ Fontes de tráfego atualizadas.');
      } else {
        console.log('   🚦 Fontes de tráfego customizadas detectadas. Mantido.');
      }
    }

    console.log('\n🎉 SCRIPT DE BACKFILL CONCLUÍDO COM SUCESSO!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Erro inesperado durante o backfill:', error.message || error);
    process.exit(1);
  }
}

backfillWorkspaces();
