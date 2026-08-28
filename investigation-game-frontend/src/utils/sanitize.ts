import DOMPurify from 'dompurify';

const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'span', 'br', 'ul', 'li', 'ol', 'div'],
  ALLOWED_ATTR: ['class', 'href', 'target'],
};

/**
 * Sanitizes dirty HTML strings to prevent XSS attacks.
 * Preserves specific safe tags and attributes required for immersive formatting.
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, PURIFY_CONFIG);
};