import React from 'react';
import { NotFoundView } from '../components/NotFoundView';
import { getPrimaryTenant } from '../lib/api';

export const dynamic = 'force-dynamic';

export default async function GlobalNotFound() {
  const primaryTenant = await getPrimaryTenant();
  return <NotFoundView primaryTenant={primaryTenant} />;
}
