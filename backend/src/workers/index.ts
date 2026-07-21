import dotenv from 'dotenv';
import { getChannel } from '../shared/queue';

dotenv.config();

async function main() {
  console.log('⚙️ Inicializando TS Workers...');

  try {
    const channel = await getChannel();

    // Premissa de concorrência obrigatória: prefetch(1) garante distribuição equilibrada
    await channel.prefetch(1);
    console.log('⚖️ Prefetch do canal RabbitMQ configurado para 1.');

    // Registre os consumidores de fila da aplicação aqui
    console.log('🚀 Worker ativo e pronto para consumir filas.');

  } catch (error) {
    console.error('❌ Falha crítica ao inicializar workers:', error);
    process.exit(1);
  }
}

main();
