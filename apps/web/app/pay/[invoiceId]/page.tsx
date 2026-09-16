'use client';

import React from 'react';
import { HostedCheckout } from '../../../components/checkout/HostedCheckout';

interface HostedCheckoutPageProps {
  params: {
    invoiceId: string;
  };
}

export default function HostedCheckoutPage({ params }: HostedCheckoutPageProps) {
  const { invoiceId } = params;

  return (
    <div className="w-full">
      <HostedCheckout invoiceId={invoiceId} />
    </div>
  );
}
