import { db } from '../shared/db';
import { workspaces, profiles, pipelineColumns, visualIdentities } from '../shared/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function testWorkspaceDefaults() {
  console.log('🧪 Iniciando teste automatizado de defaults do Workspace...\n');

  const testUserId = '11111111-1111-1111-1111-111111111111';
  const testWorkspaceId = '22222222-2222-2222-2222-222222222222';

  try {
    // 1. Limpar registros de teste se já existirem
    await db.delete(pipelineColumns).where(eq(pipelineColumns.workspaceId, testWorkspaceId));
    await db.delete(visualIdentities).where(eq(visualIdentities.workspaceId, testWorkspaceId));
    await db.delete(workspaces).where(eq(workspaces.id, testWorkspaceId));
    await db.delete(profiles).where(eq(profiles.id, testUserId));

    // 2. Criar perfil de teste
    console.log('👤 Criando perfil de teste...');
    await db.insert(profiles).values({
      id: testUserId,
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      role: 'user',
    });

    // 3. Criar workspace
    console.log('🏢 Criando workspace de teste...');
    const [insertedWorkspace] = await db.insert(workspaces).values({
      id: testWorkspaceId,
      name: 'Consultório de Teste',
      ownerId: testUserId,
    }).returning();

    console.log('   → Workspace criado com sucesso!');
    console.log(`   → Fontes de tráfego inseridas: ${JSON.stringify(insertedWorkspace.trafficSources)}`);

    // 4. Buscar colunas de pipeline geradas pelo Trigger
    console.log('📋 Buscando colunas de pipeline criadas automaticamente...');
    const columns = await db.query.pipelineColumns.findMany({
      where: eq(pipelineColumns.workspaceId, testWorkspaceId),
      orderBy: (cols, { asc }) => [asc(cols.order)],
    });

    console.log(`   → Encontradas ${columns.length} colunas no pipeline:`);
    columns.forEach((col) => {
      console.log(`     - [Etapa ${col.order}] ${col.name} (slug: ${col.slug}, cor: ${col.color}, categoria: ${col.category})`);
    });

    // 5. Buscar identidade visual gerada pelo Trigger
    console.log('🎨 Buscando identidade visual criada automaticamente...');
    const visualId = await db.query.visualIdentities.findFirst({
      where: eq(visualIdentities.workspaceId, testWorkspaceId),
    });

    if (visualId) {
      console.log(`   → Encontrada Identidade Visual Padrão: "${visualId.name}" (Default: ${visualId.isWorkspaceDefault})`);
      console.log(`     - Cor Primária: ${visualId.primaryColor}`);
      console.log(`     - Cor Secundária: ${visualId.secondaryColor}`);
      console.log(`     - Fonte Título: ${visualId.fontHeading}`);
      console.log(`     - Fonte Corpo: ${visualId.fontBody}`);
    } else {
      console.log('   ❌ ERRO: Nenhuma identidade visual foi criada para o workspace!');
    }

    // 6. Validar asserções
    const expectedColumns = [
      { name: 'Contato Inicial', category: 'pendente' },
      { name: 'Triagem', category: 'acolhimento' },
      { name: '1ª Sessão Agendada', category: 'acolhimento' },
      { name: 'Sessão Realizada', category: 'acolhimento' },
      { name: 'Paciente Ativo', category: 'paciente' },
      { name: 'Alta Clínica', category: 'alta' },
      { name: 'Arquivado', category: 'negativa' },
    ];

    let validationsPassed = true;

    if (columns.length !== expectedColumns.length) {
      console.log(`❌ Falha: Esperava ${expectedColumns.length} colunas, mas encontrou ${columns.length}.`);
      validationsPassed = false;
    } else {
      for (let i = 0; i < expectedColumns.length; i++) {
        if (columns[i].name !== expectedColumns[i].name || columns[i].category !== expectedColumns[i].category) {
          console.log(`❌ Falha na coluna ${i}: Esperava ${expectedColumns[i].name} (${expectedColumns[i].category}), mas encontrou ${columns[i].name} (${columns[i].category}).`);
          validationsPassed = false;
        }
      }
    }

    const expectedTrafficSources = ['Manual', 'Instagram', 'Google Ads', 'Facebook Ads', 'Indicação', 'TikTok', 'Site / Orgânico', 'Webhook'];
    const actualTrafficSources = insertedWorkspace.trafficSources;
    if (JSON.stringify(actualTrafficSources) !== JSON.stringify(expectedTrafficSources)) {
      console.log('❌ Falha nas fontes de tráfego padrão.');
      validationsPassed = false;
    }

    if (!visualId || !visualId.isWorkspaceDefault) {
      console.log('❌ Falha na identidade visual padrão.');
      validationsPassed = false;
    }

    if (validationsPassed) {
      console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
    } else {
      console.log('\n❌ ALGUNS TESTES FALHARAM. Verifique as mensagens acima.');
    }

    // 7. Limpar dados após o teste
    console.log('\n🧹 Limpando registros de teste...');
    await db.delete(pipelineColumns).where(eq(pipelineColumns.workspaceId, testWorkspaceId));
    await db.delete(visualIdentities).where(eq(visualIdentities.workspaceId, testWorkspaceId));
    await db.delete(workspaces).where(eq(workspaces.id, testWorkspaceId));
    await db.delete(profiles).where(eq(profiles.id, testUserId));
    console.log('✅ Banco de dados limpo!');

  } catch (error: any) {
    console.error('❌ Erro inesperado durante o teste:', error.message || error);
  }
}

testWorkspaceDefaults();
