/**
 * CopyableHash component — displays a hash with a copy-to-clipboard button
 */
import { useState } from "react";
import { copyToClipboard, shortenHash } from "../utils/clipboard";

export default function CopyableHash({
  hash,
  label = "TX Hash",
  showFull = false,
  className = "",
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (await copyToClipboard(hash)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayHash = showFull ? hash : shortenHash(hash);

  return (
    <div className={`copyable-hash ${className}`}>
      <code className="hash-value" title={hash}>
        {displayHash}
      </code>
      <button
        onClick={handleCopy}
        className="copy-button"
        title={copied ? "Copied!" : "Copy to clipboard"}
        aria-label={`Copy ${label}`}
      >
        {copied ? "✓" : "📋"}
      </button>
    </div>
  );
}
