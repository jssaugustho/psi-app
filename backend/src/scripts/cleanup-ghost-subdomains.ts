import { db } from '../shared/db';
import { tenants, capturePages, platformSettings } from '../shared/schema';
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
    const allTenants = await db.query.tenants.findMany();
    const allPages = await db.query.capturePages.findMany();
    const settings = await db.query.platformSettings.findFirst();

    console.log(`📊 Total de Tenants cadastrados no Banco: ${allTenants.length}`);
    console.log(`📊 Total de Páginas de Captação no Banco: ${allPages.length}\n`);

    const tenantMap = new Map(allTenants.map((t) => [t.id, t]));
    const orphanPages = allPages.filter((p) => !tenantMap.has(p.tenantId));

    if (orphanPages.length > 0) {
      console.log(`⚠️  Páginas de Captação Órfãs (sem tenant associado): ${orphanPages.length}`);
      orphanPages.forEach((p) => {
        console.log(`   - ID: ${p.id} | Slug: ${p.slug} | TenantID: ${p.tenantId}`);
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

    console.log('\n--- Verificação de Unicidade de Slugs de Tenant ---');
    const slugTenantMap = new Map<string, string[]>();
    for (const t of allTenants) {
      if (t.slug) {
        const list = slugTenantMap.get(t.slug) || [];
        list.push(t.id);
        slugTenantMap.set(t.slug, list);
      }
    }

    let duplicateSlugsFound = 0;
    for (const [slug, ids] of slugTenantMap.entries()) {
      if (ids.length > 1) {
        duplicateSlugsFound++;
        console.log(`⚠️  Slug de Tenant duplicado "${slug}" presente nos Tenants: ${ids.join(', ')}`);
      }
    }

    if (duplicateSlugsFound === 0) {
      console.log(`✅ Todos os slugs de tenant são únicos no banco de dados.`);
    }

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
        allTenants.forEach((t) => {
          if (t.domain) dbCustomDomains.add(t.domain.toLowerCase().trim());
        });
        allPages.forEach((p) => {
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
