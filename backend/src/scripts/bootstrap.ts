import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { env } from '../config/env';
import { db, sql } from '../shared/db';
import { profiles } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { createGoTrueUser } from '../shared/auth';
import dns from 'dns/promises';

const GOTRUE_URL = env.GOTRUE_URL;

async function getResolvableGoTrueUrl(url: string): Promise<string> {
  const parsed = new URL(url);
  if (parsed.hostname === 'gotrue') {
    try {
      await dns.lookup('gotrue');
    } catch {
      console.log('ℹ️   Host "gotrue" não resolvido localmente. Ajustando URL do GoTrue para o gateway externo (http://localhost:8000/auth/v1)');
      return 'http://localhost:8000/auth/v1';
    }
  }
  return url;
}

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
      return;
    }

    console.log('✨ Nenhum administrador encontrado no banco de dados.');

    const isAuto = process.argv.includes('--auto');
    let nome = '';
    let sobrenome = '';
    let telefone = '';
    let email = '';
    let password = '';

    if (isAuto) {
      nome = (process.env.BOOTSTRAP_ADMIN_NAME || process.env.BOOTSTRAP_ADMIN_FIRST_NAME || '').trim();
      sobrenome = (process.env.BOOTSTRAP_ADMIN_SOBRENOME || process.env.BOOTSTRAP_ADMIN_LAST_NAME || '').trim();
      telefone = (process.env.BOOTSTRAP_ADMIN_TELEFONE || process.env.BOOTSTRAP_ADMIN_PHONE || '').trim();
      email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim();
      password = (process.env.BOOTSTRAP_ADMIN_PASSWORD || '').trim();

      if (!nome || !sobrenome || !email || !password) {
        throw new Error(
          'Para executar o bootstrap no modo --auto, as seguintes variáveis de ambiente devem estar configuradas no seu arquivo .env:\n' +
          '  • BOOTSTRAP_ADMIN_NAME (ou BOOTSTRAP_ADMIN_FIRST_NAME)\n' +
          '  • BOOTSTRAP_ADMIN_SOBRENOME (ou BOOTSTRAP_ADMIN_LAST_NAME)\n' +
          '  • BOOTSTRAP_ADMIN_EMAIL\n' +
          '  • BOOTSTRAP_ADMIN_PASSWORD\n\n' +
          'Por favor, configure-as e tente novamente.'
        );
      }

      console.log('🤖 Modo --auto ativado. Preenchendo credenciais via env:');
      console.log(`👉 Nome: ${nome}`);
      console.log(`👉 Sobrenome: ${sobrenome}`);
      console.log(`👉 Telefone: ${telefone || '(vazio)'}`);
      console.log(`👉 E-mail: ${email}`);
      console.log(`👉 Senha: ${'*'.repeat(password.length)}`);
      
      if (password.length < 6) {
        throw new Error('A senha configurada no env para o bootstrap deve ter no mínimo 6 caracteres.');
      }
      if (!email.includes('@')) {
        throw new Error('O e-mail configurado no env para o bootstrap é inválido.');
      }
    } else {
      console.log('📝 Por favor, informe as credenciais do novo Administrador do sistema:\n');
      const rl = readline.createInterface({ input, output });

      while (!nome.trim()) {
        nome = await rl.question('👉 Nome: ');
        if (!nome.trim()) console.log('❌ O nome é obrigatório.');
      }

      while (!sobrenome.trim()) {
        sobrenome = await rl.question('👉 Sobrenome: ');
        if (!sobrenome.trim()) console.log('❌ O sobrenome é obrigatório.');
      }

      telefone = await rl.question('👉 Telefone (opcional): ');

      while (!email.trim() || !email.includes('@')) {
        email = await rl.question('👉 E-mail: ');
        if (!email.trim() || !email.includes('@')) console.log('❌ Por favor, digite um e-mail válido.');
      }

      while (!password.trim() || password.length < 6) {
        password = await rl.question('👉 Senha (mínimo 6 caracteres): ');
        if (!password.trim() || password.length < 6) console.log('❌ A senha deve conter no mínimo 6 caracteres.');
      }

      rl.close();
    }

    console.log('\n⏳ Criando o primeiro usuário Administrador no GoTrue e PostgreSQL...');

    // Resolver url resolvida do GoTrue externa se rodando fora do docker
    const targetGoTrueUrl = await getResolvableGoTrueUrl(GOTRUE_URL);

    // 2. Criar usuário no GoTrue
    const goTrueUser = await createGoTrueUser(
      email,
      password,
      {
        first_name: nome,
        last_name: sobrenome,
        phone: telefone || null,
      },
      targetGoTrueUrl
    );

    const userId = goTrueUser.id;

    // 3. Inserir perfil com role 'admin' no PostgreSQL
    const [adminProfile] = await db
      .insert(profiles)
      .values({
        id: userId,
        firstName: nome,
        lastName: sobrenome,
        phone: telefone || null,
        email: email,
        role: 'admin',
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          firstName: nome,
          lastName: sobrenome,
          phone: telefone || null,
          email: email,
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

  } catch (error: any) {
    console.error('\n❌ Erro durante a execução do bootstrap:', error.message || error);
    process.exit(1);
  } finally {
    // Fecha o pool do postgres de forma limpa para evitar falhas do libuv no Windows
    await sql.end();
  }
}

bootstrap();
