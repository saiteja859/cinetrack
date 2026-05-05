/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group border border-neutral-800/50 bg-neutral-950 text-white rounded-xl shadow-2xl font-bold px-6 py-4",
          description: "text-neutral-500 font-medium",
          actionButton: "bg-blue-600 text-white",
          cancelButton: "bg-neutral-900 text-neutral-400",
        },
      }}
    />
  );
}
