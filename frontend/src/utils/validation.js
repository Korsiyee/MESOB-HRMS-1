/**
 * Ethiopian Phone Number Validation
 * Accepts 10-digit format: 0912345678
 * Also accepts formats like +251912345678 or 251912345678
 */
export function isValidEthiopianPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  // Remove spaces, dashes, and parentheses
  const cleaned = phone.trim().replace(/[\s\-()]/g, '');
  
  // Pattern: optional +251 or 251 or 0, followed by 9 digits
  // Result should be exactly 10 digits when normalized to 0XXXXXXXXX format
  const patterns = [
    /^0\d{9}$/,           // 0912345678 (10 digits starting with 0)
    /^\+2519\d{8}$/,      // +251912345678
    /^2519\d{8}$/,        // 251912345678
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
}

/**
 * Normalize Ethiopian phone to 10-digit format starting with 0
 */
export function normalizeEthiopianPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return '';
  }
  
  const cleaned = phone.trim().replace(/[\s\-()]/g, '');
  
  // Already in correct format
  if (/^0\d{9}$/.test(cleaned)) {
    return cleaned;
  }
  
  // Convert +251XXXXXXXXX or 251XXXXXXXXX to 0XXXXXXXXX
  if (/^\+?2519\d{8}$/.test(cleaned)) {
    return '0' + cleaned.replace(/^\+?251/, '');
  }
  
  return phone; // Return original if can't normalize
}

/**
 * Email validation
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const trimmed = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  return emailRegex.test(trimmed);
}

/**
 * Validate full name (at least 2 parts)
 */
export function isValidFullName(name) {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  const parts = name.trim().split(/\s+/).filter(part => part.length > 0);
  return parts.length >= 2;
}

/**
 * Format phone number for display
 * Converts 0912345678 to 091 234 5678
 */
export function formatPhoneDisplay(phone) {
  if (!phone || typeof phone !== 'string') {
    return phone;
  }
  
  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  if (/^0\d{9}$/.test(cleaned)) {
    return cleaned.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');
  }
  
  return phone;
}

/**
 * Get validation error message for phone
 */
export function getPhoneErrorMessage(phone) {
  if (!phone || phone.trim() === '') {
    return 'Phone number is required';
  }
  if (!isValidEthiopianPhone(phone)) {
    return 'Enter a valid 10-digit Ethiopian phone number (e.g., 0912345678)';
  }
  return '';
}

/**
 * Get validation error message for email
 */
export function getEmailErrorMessage(email) {
  if (!email || email.trim() === '') {
    return 'Email is required';
  }
  if (!isValidEmail(email)) {
    return 'Enter a valid email address (e.g., example@domain.com)';
  }
  return '';
}

/**
 * Validate all address fields
 */
export function validateAddress(address, isRequired = true) {
  const errors = {};
  
  if (isRequired || address.phone_primary) {
    if (!address.phone_primary || !address.phone_primary.trim()) {
      errors.phone_primary = 'Primary phone is required';
    } else if (!isValidEthiopianPhone(address.phone_primary)) {
      errors.phone_primary = 'Enter a valid 10-digit phone number (e.g., 0912345678)';
    }
  }
  
  // Secondary phone is optional but must be valid if provided
  if (address.phone_secondary && address.phone_secondary.trim()) {
    if (!isValidEthiopianPhone(address.phone_secondary)) {
      errors.phone_secondary = 'Enter a valid 10-digit phone number (e.g., 0912345678)';
    }
  }
  
  if (isRequired || address.email) {
    if (!address.email || !address.email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(address.email)) {
      errors.email = 'Enter a valid email address';
    }
  }
  
  return errors;
}

/**
 * Real-time field validation for form inputs
 */
export function validateField(fieldName, value, rules = {}) {
  // Phone validation
  if (fieldName.includes('phone')) {
    if (rules.required && (!value || !value.trim())) {
      return 'Phone number is required';
    }
    if (value && value.trim() && !isValidEthiopianPhone(value)) {
      return 'Must be 10 digits (e.g., 0912345678)';
    }
  }
  
  // Email validation
  if (fieldName.includes('email')) {
    if (rules.required && (!value || !value.trim())) {
      return 'Email is required';
    }
    if (value && value.trim() && !isValidEmail(value)) {
      return 'Invalid email format';
    }
  }
  
  // Full name validation
  if (fieldName === 'mother_name' && rules.fullName) {
    if (rules.required && (!value || !value.trim())) {
      return 'Mother\'s name is required';
    }
    if (value && value.trim() && !isValidFullName(value)) {
      return 'Enter full name (first and last name)';
    }
  }
  
  return '';
}
