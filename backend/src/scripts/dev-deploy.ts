import { execSync, spawnSync } from 'child_process';
import path from 'path';

/**
 * Script de Deploy Local (npm run dev:deploy)
 * Suporta:
 *  - Modo Padrão (Default): Full deploy (`docker compose down` + `docker compose up -d --build`)
 *  - Modo Rápido (`--fast` ou `--quick`): Rebuild apenas de api/workers
 */

function getDockerComposeCmd(): string {
  // Tenta `docker compose` (v2 CLI)
  const v2Check = spawnSync('docker compose version', { shell: true });
  if (v2Check.status === 0) {
    return 'docker compose';
  }

  // Fallback para `docker-compose` (v1 CLI)
  const v1Check = spawnSync('docker-compose version', { shell: true });
  if (v1Check.status === 0) {
    return 'docker-compose';
  }

  console.error('❌ Erro: Nem `docker compose` nem `docker-compose` foram encontrados no PATH.');
  process.exit(1);
}

function runCommand(cmd: string, cwd: string) {
  console.log(`\n⏳ Executando: \x1b[36m${cmd}\x1b[0m...`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Erro ao executar: "${cmd}"`);
    process.exit(1);
  }
}

async function waitForGatewayHealth() {
  console.log('\n🏥 Verificando saúde do Gateway Nginx & API em http://localhost:8000/v1/health...');
  const maxRetries = 20;
  const delayMs = 2000;

  for (let i = 1; i <= maxRetries; i++) {
    try {
      const res = await fetch('http://localhost:8000/v1/health');
      if (res.ok) {
        const data = await res.json() as any;
        if (data.status === 'operational') {
          console.log('✅ Gateway Nginx e Fastify API estão 100% ONLINE e operacionais!');
          return;
        }
      }
    } catch {
      // Ignora erro de conexão enquanto inicializa
    }
    process.stdout.write(`⏳ Aguardando API e Nginx ficarem prontos (${i}/${maxRetries})...\r`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  console.log('\n⚠️ Aviso: O Gateway ainda não respondeu 200 OK no tempo limite. Verifique os logs com docker compose logs api.');
}

async function main() {
  const isFastMode = process.argv.includes('--fast') || process.argv.includes('--quick');
  const isFullReset = !isFastMode; // Padrão é sempre Full Deploy!
  const backendDir = path.resolve(__dirname, '../..');
  const dockerCmd = getDockerComposeCmd();

  console.log('----------------------------------------------------');
  console.log('🚀 PSI App - Deploy Local');
  console.log(`⚙️  Comando Docker: ${dockerCmd}`);
  console.log(`📂 Diretório: ${backendDir}`);
  console.log(`📌 Modo: ${isFullReset ? '🔄 Full Deploy (Padrão)' : '⚡ Fast Reload'}`);
  console.log('----------------------------------------------------');

  if (isFullReset) {
    console.log('1️⃣  Derrubando a stack completa (docker compose down)...');
    runCommand(`${dockerCmd} down`, backendDir);

    console.log('\n2️⃣  Reconstruindo e subindo todos os serviços (docker compose up -d --build)...');
    runCommand(`${dockerCmd} up -d --build`, backendDir);
  } else {
    console.log('⚡ Modo Rápido (Targeted Reload) Solicitado!');
    console.log('1️⃣  Reconstruindo e atualizando serviços da aplicação (api, workers)...');
    runCommand(`${dockerCmd} up -d --build api workers`, backendDir);

    console.log('\n2️⃣  Reiniciando Nginx para recarregar IPs da rede Docker...');
    runCommand(`${dockerCmd} restart nginx`, backendDir);
  }

  console.log('\n📊 Status dos Containers:');
  runCommand(`${dockerCmd} ps`, backendDir);

  await waitForGatewayHealth();

  console.log('\n✅ Deploy local concluído com sucesso!');
  console.log('🌐 API Gateway / Nginx acessível em: http://localhost:8000/v1/health');
}

main();

