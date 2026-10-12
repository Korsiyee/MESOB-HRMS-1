/**
 * Helper function to format decimal hours to "Xhr Ymin" format
 * 
 * @param {number} decimalHours - Hours in decimal format (e.g., 1.5 for 1 hour 30 minutes)
 * @returns {string} Formatted string like "1hr 30min" or "45min"
 * 
 * Examples:
 * - 1.5 hours -> "1hr 30min"
 * - 0.75 hours -> "45min"
 * - 2 hours -> "2hr"
 * - 0.2 hours -> "12min"
 */
export const formatHoursToHrMin = (decimalHours) => {
  if (decimalHours === null || decimalHours === undefined) return '';
  
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0 && minutes > 0) {
    return `${hours}hr ${minutes}min`;
  } else if (hours > 0) {
    return `${hours}hr`;
  } else {
    return `${minutes}min`;
  }
};
