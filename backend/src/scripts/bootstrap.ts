import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import dotenv from 'dotenv';
import { db } from '../shared/db';
import { profiles } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { createGoTrueUser } from '../shared/auth';

dotenv.config();

const GOTRUE_URL = process.env.GOTRUE_EXTERNAL_URL || 'http://localhost:8000/auth/v1';

async function bootstrap() {
  console.log('\n🔐 === SCRIPT DE BOOTSTRAP: PROVISIONAMENTO DO PRIMEIRO ADMIN ===\n');

  try {
    // 1. Verificar se já existe QUALQUER usuário com role 'admin'
    const existingAdmin = await db.query.profiles.findFirst({
      where: eq(profiles.role, 'admin'),
    });

    if (existingAdmin) {
      console.log(`⚠️  ATENÇÃO: Já existe um usuário Administrador cadastrado no sistema!`);
      console.log(`📧  Admin Registrado: ${existingAdmin.email} (${existingAdmin.firstName} ${existingAdmin.lastName})`);
      console.log(`ℹ️   O script de bootstrap serve apenas para a criação do primeiro administrador.`);
      console.log(`❌  Operação encerrada por segurança.\n`);
      process.exit(0);
    }

    console.log('✨ Nenhum administrador encontrado no banco de dados.');
    console.log('📝 Por favor, informe as credenciais do novo Administrador do sistema:\n');

    const rl = readline.createInterface({ input, output });

    let nome = '';
    while (!nome.trim()) {
      nome = await rl.question('👉 Nome: ');
      if (!nome.trim()) console.log('❌ O nome é obrigatório.');
    }

    let sobrenome = '';
    while (!sobrenome.trim()) {
      sobrenome = await rl.question('👉 Sobrenome: ');
      if (!sobrenome.trim()) console.log('❌ O sobrenome é obrigatório.');
    }

    const telefone = await rl.question('👉 Telefone (opcional): ');

    let email = '';
    while (!email.trim() || !email.includes('@')) {
      email = await rl.question('👉 E-mail: ');
      if (!email.trim() || !email.includes('@')) console.log('❌ Por favor, digite um e-mail válido.');
    }

    let password = '';
    while (!password.trim() || password.length < 6) {
      password = await rl.question('👉 Senha (mínimo 6 caracteres): ');
      if (!password.trim() || password.length < 6) console.log('❌ A senha deve conter no mínimo 6 caracteres.');
    }

    rl.close();

    console.log('\n⏳ Criando o primeiro usuário Administrador no GoTrue e PostgreSQL...');

    // 2. Criar usuário no GoTrue
    const goTrueUser = await createGoTrueUser(
      email.trim(),
      password.trim(),
      {
        first_name: nome.trim(),
        last_name: sobrenome.trim(),
        phone: telefone.trim() || null,
      },
      GOTRUE_URL
    );

    const userId = goTrueUser.id;

    // 3. Inserir perfil com role 'admin' no PostgreSQL
    const [adminProfile] = await db
      .insert(profiles)
      .values({
        id: userId,
        firstName: nome.trim(),
        lastName: sobrenome.trim(),
        phone: telefone.trim() || null,
        email: email.trim(),
        role: 'admin',
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          firstName: nome.trim(),
          lastName: sobrenome.trim(),
          phone: telefone.trim() || null,
          email: email.trim(),
          role: 'admin',
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log('\n🎉 PRIMEIRO ADMINISTRADOR CADASTRADO COM SUCESSO!');
    console.log('----------------------------------------------------');
    console.log(`🆔 ID: ${adminProfile.id}`);
    console.log(`👤 Nome Completo: ${adminProfile.firstName} ${adminProfile.lastName}`);
    console.log(`📧 E-mail: ${adminProfile.email}`);
    console.log(`📱 Telefone: ${adminProfile.phone || 'Não informado'}`);
    console.log(`🛡️  Role Global: ${adminProfile.role}`);
    console.log('----------------------------------------------------\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Erro durante a execução do bootstrap:', error.message || error);
    process.exit(1);
  }
}

bootstrap();
