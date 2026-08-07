import { db } from '../shared/db';
import { contacts, interactionHistory } from '../shared/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('⚠️  Iniciando reset do CRM...');
  console.log('   → Serão apagados: todos os contatos e seus históricos de interação.');
  console.log('   → Serão mantidos: estágios do funil (pipeline_columns) e configurações do tenant.\n');

  try {
    // 1. Apagar histórico de interações (cascade cobriria, mas sendo explícito)
    const deletedHistory = await db.delete(interactionHistory).returning({ id: interactionHistory.id });
    console.log(`🗑️  Histórico de interações removido: ${deletedHistory.length} registros.`);

    // 2. Apagar contatos
    const deletedContacts = await db.delete(contacts).returning({ id: contacts.id, name: contacts.name });
    console.log(`🗑️  Contatos removidos: ${deletedContacts.length} leads.`);

    console.log('\n✅ CRM zerado com sucesso! O funil de triagem está vazio e pronto para novos testes.');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Erro ao zerar o CRM:', err.message || err);
    process.exit(1);
  }
}

main();
