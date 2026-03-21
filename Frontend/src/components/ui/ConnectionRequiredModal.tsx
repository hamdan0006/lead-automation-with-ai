import React from 'react';
import { ExclamationTriangleIcon, LinkIcon } from '@heroicons/react/24/outline';
import Button from './button/Button';

interface ConnectionRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform?: string;
  templateName?: string;
  onConnectClick: () => void;
}

const ConnectionRequiredModal: React.FC<ConnectionRequiredModalProps> = ({
  isOpen,
  onClose,
  platform,
  templateName,
  onConnectClick,
}) => {
  if (!isOpen) return null;

  const platformName = platform ? platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase() : 'Platform';


  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[100000] backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full mx-4 p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {platformName} Connection Required
            </h3>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            To use <span className="font-semibold text-gray-900 dark:text-white">{templateName || 'this template'}</span>, you need to connect your {platformName} account first.
          </p>

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-start space-x-3">
              <LinkIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium mb-1 text-gray-900 dark:text-gray-200">How to connect:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Install the Trobyx browser extension</li>
                  <li>Log into your {platformName} account</li>
                  <li>Click the extension icon and sync your cookies</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={onConnectClick}
          >
            Connect {platformName}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionRequiredModal;