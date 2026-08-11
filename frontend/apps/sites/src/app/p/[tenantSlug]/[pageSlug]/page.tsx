import React from 'react'
import { notFound } from 'next/navigation'
import { getCapturePageBySlugs, getContractTemplateContent } from '../../../../lib/api'
import { CapturePageRenderer } from '../../../../components/CapturePageRenderer'

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    tenantSlug: string;
    pageSlug: string;
  }>;
  searchParams: Promise<{
    preview?: string;
  }>;
}

export default async function TestCapturePage({ params, searchParams }: PageProps) {
  const { tenantSlug, pageSlug } = await params
  const { preview } = await searchParams
  const isPreview = preview === 'true'

  // Fetch page and tenant data using PostgREST public client helper
  const pageData = await getCapturePageBySlugs(tenantSlug, pageSlug, isPreview)

  if (!pageData) {
    notFound()
  }

  // Resolve contract template content if associated to contract step
  const flowData = isPreview 
    ? (pageData.form_flow_draft || pageData.form_flow)
    : pageData.form_flow;

  let contractText: string | undefined = undefined
  const contractNode = flowData.nodes.find((n: any) => n.type === 'contrato')
  if (contractNode?.data?.contractTemplateId) {
    contractText = await getContractTemplateContent(contractNode.data.contractTemplateId) || undefined
  }

  return (
    <CapturePageRenderer
      page={{
        id: pageData.id,
        tenantId: pageData.tenant_id,
        title: isPreview ? (pageData.title_draft || pageData.title) : pageData.title,
        slug: isPreview ? (pageData.slug_draft || pageData.slug) : pageData.slug,
        customDomain: isPreview ? (pageData.custom_domain_draft || pageData.custom_domain) : pageData.custom_domain,
        siteConfig: isPreview ? (pageData.site_config_draft || pageData.site_config) : pageData.site_config,
        dictionary: isPreview ? (pageData.dictionary_draft || pageData.dictionary) : pageData.dictionary,
        formFlow: flowData
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
