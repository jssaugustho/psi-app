'use client';

import React from 'react';
import { ServiceStatusCard, useApiStatus } from '@psi/ui';

export default function OfflinePage() {
  const { checking, errorMsg, apiStatus, dbStatus, queueStatus, checkHealth } = useApiStatus();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#09090B] text-[#F8FAFC]">
      <ServiceStatusCard
        isModal={false}
        apiStatus={apiStatus}
        dbStatus={dbStatus}
        queueStatus={queueStatus}
        checking={checking}
        errorMsg={errorMsg}
        onRetry={() => checkHealth(false)}
      />
    </div>
  );
}
