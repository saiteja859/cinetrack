/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Modal } from './Modal';
import { Trash2, AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  isDestructive?: boolean;
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm',
  isDestructive = true 
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-sm">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
            {isDestructive ? <Trash2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <p className="text-neutral-400 text-sm leading-relaxed font-medium">
            {message}
          </p>
        </div>
        
        <div className="flex gap-3 pt-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-neutral-900 text-neutral-400 rounded-xl font-black uppercase tracking-widest text-[10px] border border-neutral-800 hover:bg-neutral-800 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] text-white shadow-xl transition-all active:scale-95 ${
              isDestructive ? 'bg-red-600 shadow-red-600/20 hover:bg-red-500' : 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
