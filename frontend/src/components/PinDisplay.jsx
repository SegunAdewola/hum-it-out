import React from 'react';
import { Copy, RefreshCw } from 'lucide-react';

function PinDisplay({ pin }) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy PIN:', err);
    }
  };

  const formatPin = (pin) => {
    if (!pin) return '------';
    return pin.toString().padStart(6, '0');
  };

  return (
    <div className="pin-display">
      <div className="pin-label">Your PIN</div>
      <div className="pin-container">
        <div className="pin-code">
          {formatPin(pin)}
        </div>
        <button 
          onClick={copyToClipboard}
          className={`copy-btn ${copied ? 'copied' : ''}`}
          title="Copy PIN to clipboard"
        >
          {copied ? '✓' : <Copy size={14} />}
        </button>
      </div>
      {copied && (
        <div className="copy-feedback">PIN copied!</div>
      )}
    </div>
  );
}

export default PinDisplay;
