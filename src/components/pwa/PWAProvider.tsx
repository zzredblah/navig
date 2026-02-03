'use client';

import { ReactNode } from 'react';
import { InstallPrompt, IOSInstallGuide } from './InstallPrompt';
import { UpdateNotification } from './UpdateNotification';

interface PWAProviderProps {
  children: ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  return (
    <>
      {children}
      <InstallPrompt />
      <IOSInstallGuide />
      <UpdateNotification />
    </>
  );
}
