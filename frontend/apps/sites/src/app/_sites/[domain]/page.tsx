import React from 'react'
import { notFound } from 'next/navigation'
import { getCapturePageByDomain, getContractTemplateContent } from '../../../lib/api'
import { CapturePageRenderer } from '../../../components/CapturePageRenderer'

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    domain: string;
  }>;
}

export default async function CustomDomainCapturePage({ params }: PageProps) {
  const { domain } = await params

  // Resolve page and tenant by custom hostname search using PostgREST
  const pageData = await getCapturePageByDomain(domain)

  if (!pageData) {
    notFound()
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
