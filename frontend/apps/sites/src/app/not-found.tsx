import React from 'react';
import { NotFoundView } from '../components/NotFoundView';
import { getPrimaryTenant } from '../lib/api';

export const revalidate = 3600;

export default async function GlobalNotFound() {
  const primaryTenant = await getPrimaryTenant();
  return <NotFoundView primaryTenant={primaryTenant} />;
}
