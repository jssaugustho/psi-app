import { getCapturePageBySlugs, getTenantBySlug, getPrimaryTenant, getBootstrapStatus, PGRST_BASE_URL } from '../../../../lib/api';
import { CapturePageRenderer } from '../../../../components/CapturePageRenderer';
import { NotFoundView } from '../../../../components/NotFoundView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    tenantSlug: string;
    pageSlug: string;
  }>;
  searchParams: Promise<{
    preview?: string;
    staging?: string;
    token?: string;
  }>;
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { tenantSlug, pageSlug } = await params;
  const { preview, staging, token } = await searchParams;
  const isPreview = preview === 'true' || staging === 'true';

  try {
    const pageData = await getCapturePageBySlugs(tenantSlug, pageSlug, isPreview, token);
    if (!pageData) {
      const tenant = await getTenantBySlug(tenantSlug);
      const primaryTenant = tenant ? null : await getPrimaryTenant();
      const activeTenantName = tenant?.name || primaryTenant?.name || 'Psi App';
      return {
        title: `Página Não Encontrada | ${activeTenantName}`,
        description: 'A página procurada não foi encontrada.',
      };
    }

    const title = pageData.title;
    const siteConfig = pageData.site_config;
    const seoConfig = pageData.seo_config;

    const metaTitle = seoConfig?.metaTitle || `${title} | Atendimento Psicológico`;
    const metaDescription = seoConfig?.metaDescription || `Agende sua consulta de psicologia com ${title}.`;
    const faviconUrl = siteConfig?.faviconUrl;
    const logoUrl = siteConfig?.logoUrl;
    const socialImage = seoConfig?.socialImage || seoConfig?.ogImageUrl || logoUrl;

    return {
      title: metaTitle,
      description: metaDescription,
      icons: faviconUrl ? {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl,
      } : undefined,
      openGraph: {
        title: metaTitle,
        description: metaDescription,
        type: 'website',
        images: socialImage ? [{ url: socialImage }] : [],
      },
    };
  } catch (err) {
    return {
      title: 'Erro de Diagnóstico | Preview',
      description: 'Erro ao carregar pré-visualização.',
    };
  }
}

export default async function PreviewCapturePage({ params, searchParams }: PageProps) {
  const { tenantSlug, pageSlug } = await params;
  const { preview, staging, token } = await searchParams;
  const isPreview = preview === 'true' || staging === 'true';

  // 0. Bloqueio se a plataforma não estiver inicializada
  const bootStatus = await getBootstrapStatus();
  if (bootStatus && bootStatus.bootstrapped === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="max-w-md w-full p-8 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="text-3xl">🛠️</div>
          <h1 className="text-xl font-bold">Site em Manutenção</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            O site está temporariamente indisponível para manutenção. Por favor, tente novamente em alguns instantes.
          </p>
        </div>
      </div>
    );
  }

  let pageData = null;
  let fetchError = null;
  try {
    pageData = await getCapturePageBySlugs(tenantSlug, pageSlug, isPreview, token);
  } catch (err: any) {
    fetchError = err.message || String(err);
  }

  if (fetchError || !pageData) {
    const tenant = await getTenantBySlug(tenantSlug);
    const primaryTenant = tenant ? null : await getPrimaryTenant();
    
    if (isPreview || token) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans">
          <div className="max-w-xl w-full p-8 rounded-2xl border border-red-500/20 bg-slate-900/60 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-500 font-bold">
              <span className="text-xl">⚠️</span> Erro de Autenticação / Preview
            </div>
            <h1 className="text-lg font-semibold text-slate-200">
              Não foi possível carregar a pré-visualização da página.
            </h1>
            <div className="p-4 rounded bg-red-950/20 border border-red-500/30 text-red-300 text-xs font-mono break-all whitespace-pre-wrap">
              {fetchError || "A página não retornou dados (getCapturePageBySlugs retornou null)."}
            </div>
            <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800 pt-4">
              <div><strong>Tenant Slug:</strong> {tenantSlug}</div>
              <div><strong>Page Slug:</strong> {pageSlug}</div>
              <div><strong>Modo Preview:</strong> {isPreview ? "Sim" : "Não"}</div>
              <div><strong>Token recebido:</strong> {token ? `${token.substring(0, 30)}... (Tamanho: ${token.length})` : "Nenhum"}</div>
              <div><strong>PGRST_BASE_URL:</strong> {PGRST_BASE_URL}</div>
            </div>
          </div>
        </div>
      );
    }
    
    return <NotFoundView tenant={tenant} primaryTenant={primaryTenant} requestedDomain={tenantSlug} />;
  }

  return (
    <CapturePageRenderer
      page={{
        id: pageData.id,
        tenantId: pageData.tenant_id,
        title: pageData.title,
        slug: pageData.slug,
        customDomain: pageData.custom_domain,
        siteConfig: pageData.site_config,
        dictionary: pageData.dictionary,
        formFlow: pageData.form_flow
      }}
      tenant={{
        id: pageData.tenants.id,
        name: pageData.tenants.name,
        slug: pageData.tenants.slug,
        phone: pageData.tenants.phone,
        gradientColorStart: pageData.tenants.gradient_color_start,
        gradientColorEnd: pageData.tenants.gradient_color_end,
        contrastColor: pageData.tenants.contrast_color,
        bgDarkColor: pageData.tenants.bg_dark_color,
        cardDarkColor: pageData.tenants.card_dark_color,
        textDarkColor: pageData.tenants.text_dark_color,
        logoDarkUrl: pageData.tenants.logo_dark_url,
        logoLightUrl: pageData.tenants.logo_light_url
      }}
    />
  );
}
