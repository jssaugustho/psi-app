import React from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCapturePageByDomain, getContractTemplateContent, getTenantByDomain, getPrimaryTenant, getBootstrapStatus } from '../../../lib/api'
import { CapturePageRenderer } from '../../../components/CapturePageRenderer'
import { NotFoundView } from '../../../components/NotFoundView'

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    domain: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { domain } = await params
  const pageData = await getCapturePageByDomain(domain)
  if (!pageData) {
    const tenant = await getTenantByDomain(domain);
    const primaryTenant = tenant ? null : await getPrimaryTenant();
    const activeTenantName = tenant?.name || primaryTenant?.name || 'Psi App';
    return {
      title: `Página Não Encontrada | ${activeTenantName}`,
      description: 'A página procurada não foi encontrada.',
    }
  }

  const title = pageData.title
  const siteConfig = pageData.site_config
  const seoConfig = pageData.seo_config

  const metaTitle = seoConfig?.metaTitle || `${title} | Atendimento Psicológico`
  const metaDescription = seoConfig?.metaDescription || `Agende sua consulta de psicologia com ${title}.`
  const faviconUrl = siteConfig?.faviconUrl
  const logoUrl = siteConfig?.logoUrl
  const socialImage = seoConfig?.socialImage || seoConfig?.ogImageUrl || logoUrl

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
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: metaDescription,
      images: socialImage ? [socialImage] : [],
    },
  }
}

export default async function CustomDomainCapturePage({ params }: PageProps) {
  const { domain } = await params

  // 0. Bloqueio se a plataforma não estiver inicializada
  const bootStatus = await getBootstrapStatus();
  if (bootStatus && bootStatus.bootstrapped === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="max-w-md w-full p-8 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="text-3xl">🛠️</div>
          <h1 className="text-xl font-bold">Plataforma em Manutenção</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            A plataforma ainda não concluiu o processo de inicialização inicial.
          </p>
        </div>
      </div>
    );
  }

  // Resolve page and tenant by custom hostname search using PostgREST
  const pageData = await getCapturePageByDomain(domain)

  if (!pageData) {
    const tenant = await getTenantByDomain(domain);
    const primaryTenant = tenant ? null : await getPrimaryTenant();
    return <NotFoundView tenant={tenant} primaryTenant={primaryTenant} requestedDomain={domain} />;
  }

  // Resolve contract template content if associated to contract step
  let contractText: string | undefined = undefined
  const contractNode = pageData.form_flow.nodes.find((n: any) => n.type === 'contrato')
  if (contractNode?.data?.contractTemplateId) {
    contractText = await getContractTemplateContent(contractNode.data.contractTemplateId) || undefined
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
      contractText={contractText}
    />
  )
}
