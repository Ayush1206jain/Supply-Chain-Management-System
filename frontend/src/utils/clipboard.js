/**
 * Clipboard utility — copy text to clipboard with visual feedback
 */

export async function copyToClipboard(text, showFeedback = true) {
  try {
    await navigator.clipboard.writeText(text);
    if (showFeedback) {
      // Visual feedback: flash a toast or return true for caller to handle
      console.log("✓ Copied to clipboard");
    }
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}

export function shortenHash(hash, length = 14) {
  if (!hash || hash.length < length * 2) return hash;
  return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`;
}
