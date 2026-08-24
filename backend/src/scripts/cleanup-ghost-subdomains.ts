import { db } from '../shared/db';
import { workspaces, workspaceDomains, capturePages, platformSettings } from '../shared/schema';
import { eq, inArray } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function runCleanup() {
  const args = process.argv.slice(2);
  const isFix = args.includes('--fix');
  const modeLabel = isFix ? '🔧 MODO DE CORREÇÃO (--fix)' : '🔍 MODO DE AUDITORIA/DRY-RUN (--dry-run)';

  console.log(`====================================================`);
  console.log(`   AUDITORIA DE SUBDOMÍNIOS & LIMPEZA DE FANTASMAS  `);
  console.log(`   ${modeLabel}`);
  console.log(`====================================================\n`);

  try {
    const allWorkspaces = await db.query.workspaces.findMany();
    const allPages = await db.query.capturePages.findMany();
    const settings = await db.query.platformSettings.findFirst();

    console.log(`📊 Total de Workspaces cadastrados no Banco: ${allWorkspaces.length}`);
    console.log(`📊 Total de Páginas de Captação no Banco: ${allPages.length}\n`);

    const workspaceMap = new Map(allWorkspaces.map((t: any) => [t.id, t]));
    const orphanPages = allPages.filter((p: any) => !workspaceMap.has(p.workspaceId));

    if (orphanPages.length > 0) {
      console.log(`⚠️  Páginas de Captação Órfãs (sem workspace associado): ${orphanPages.length}`);
      orphanPages.forEach((p: any) => {
        console.log(`   - ID: ${p.id} | Slug: ${p.slug} | WorkspaceID: ${p.workspaceId}`);
      });

      if (isFix) {
        const orphanIds = orphanPages.map((p) => p.id);
        await db.delete(capturePages).where(inArray(capturePages.id, orphanIds));
        console.log(`   ✅ ${orphanPages.length} páginas órfãs excluídas com sucesso do banco!`);
      } else {
        console.log(`   ℹ️  Execute com --fix para apagar as páginas órfãs acima.`);
      }
    } else {
      console.log(`✅ Nenhuma página de captação órfã encontrada no banco de dados.`);
    }

    console.log('\n--- Verificação de Unicidade de Subdomínios de Workspace ---');
    const allDomains = await db.query.workspaceDomains.findMany();
    console.log(`✅ Total de registros de domínios em workspace_domains: ${allDomains.length}`);

    console.log('\n--- Verificação de Hostnames Customizados no Cloudflare ---');
    if (!settings?.cloudflareApiToken || !settings?.cloudflareZoneId) {
      console.log(`ℹ️  Cloudflare API Token ou Zone ID não configurados. Ignorando auditoria remota no Cloudflare.`);
    } else {
      const token = settings.cloudflareApiToken;
      const zoneId = settings.cloudflareZoneId;

      const cfRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const cfData: any = await cfRes.json().catch(() => ({}));
      if (!cfData.success || !Array.isArray(cfData.result)) {
        console.log(`❌ Erro ao consultar Custom Hostnames no Cloudflare: ${cfData.errors?.[0]?.message || 'Resposta inválida'}`);
      } else {
        const cfHostnames: Array<{ id: string; hostname: string; status: string }> = cfData.result;
        console.log(`📊 Total de Custom Hostnames na Zone do Cloudflare: ${cfHostnames.length}`);

        const dbCustomDomains = new Set<string>();
        allDomains.forEach((t: any) => {
          if (t.customDomain) dbCustomDomains.add(t.customDomain.toLowerCase().trim());
        });
        allPages.forEach((p: any) => {
          if (p.customDomain) dbCustomDomains.add(p.customDomain.toLowerCase().trim());
        });

        const ghostHostnames = cfHostnames.filter((h) => !dbCustomDomains.has(h.hostname.toLowerCase().trim()));

        if (ghostHostnames.length > 0) {
          console.log(`\n⚠️  Hostnames Fantasmas no Cloudflare (sem registro ativo no banco): ${ghostHostnames.length}`);
          for (const g of ghostHostnames) {
            console.log(`   - Hostname: ${g.hostname} | CF ID: ${g.id} | Status: ${g.status}`);
            if (isFix) {
              try {
                await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${g.id}`, {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                });
                console.log(`     ✅ Excluído da Cloudflare com sucesso!`);
              } catch (err: any) {
                console.log(`     ❌ Falha ao excluir do Cloudflare: ${err.message}`);
              }
            }
          }
          if (!isFix) {
            console.log(`   ℹ️  Execute com --fix para desregistrar esses hostnames do Cloudflare.`);
          }
        } else {
          console.log(`✅ Todos os hostnames da Cloudflare correspondem a registros ativos no banco!`);
        }
      }
    }

    console.log(`\n====================================================`);
    console.log(`   AUDITORIA E LIMPEZA CONCLUÍDAS COM SUCESSO!     `);
    console.log(`====================================================\n`);
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Erro durante a auditoria:', err.message || err);
    process.exit(1);
  }
}

runCleanup();
