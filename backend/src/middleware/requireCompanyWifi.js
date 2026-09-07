const { executeQuery } = require("../utils/dbQuery");
const { sendError } = require("../utils/response");
const { getClientIp } = require("../utils/request");
const { safeLogEvent } = require("../services/auditLogService");
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require("../config/constants");

/**
 * CIDR notation parser for IP range validation
 * Supports both exact IPs (e.g., "192.168.1.1") and CIDR ranges (e.g., "10.0.0.0/24")
 * Also handles IPv6 addresses like ::1
 */
function isIpInRange(clientIp, ipRange) {
  try {
    // Normalize IPv6 localhost to IPv4 localhost
    const normalizedClientIp = clientIp === '::1' || clientIp === '::ffff:127.0.0.1' ? '127.0.0.1' : clientIp;
    
    // Handle exact IP match
    if (!ipRange.includes('/')) {
      return normalizedClientIp === ipRange;
    }

    // Parse CIDR notation (e.g., "192.168.0.0/16")
    const [rangeIp, prefixLength] = ipRange.split('/');
    const prefix = parseInt(prefixLength, 10);

    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      console.warn(`[WIFI_VERIFICATION] Invalid CIDR prefix length: ${ipRange}`);
      return false;
    }

    // Convert IP addresses to 32-bit integers
    const ipToInt = (ip) => {
      return ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0) >>> 0;
    };

    const clientIpInt = ipToInt(normalizedClientIp);
    const rangeIpInt = ipToInt(rangeIp);

    // Create subnet mask based on prefix length
    const mask = ~((1 << (32 - prefix)) - 1) >>> 0;

    // Check if client IP is in the subnet
    return (clientIpInt & mask) === (rangeIpInt & mask);
  } catch (error) {
    console.error(`[WIFI_VERIFICATION] Error checking IP range: ${error.message}`);
    return false;
  }
}

/**
 * Middleware to verify that the request originates from the company network
 * Reads allowed IP ranges from the NetworkSettings table and validates the client IP
 * 
 * Usage:
 *   router.post("/self-punch", authenticateJwt, requireCompanyWifi, selfPunchController);
 */
async function requireCompanyWifi(req, res, next) {
  const clientIp = getClientIp(req);

  console.log(`[WIFI_VERIFICATION] Request from IP: ${clientIp}`);
  
  // Normalize IPv6 localhost to IPv4
  const normalizedIp = (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') ? '127.0.0.1' : clientIp;
  console.log(`[WIFI_VERIFICATION] Normalized IP: ${normalizedIp}`);

  // If we can't determine the client IP, reject for security
  if (!clientIp) {
    console.error(`[WIFI_VERIFICATION] Failed to determine client IP`);
    
    await safeLogEvent({
      actorUuid: req.user?.uuid || null,
      action: AUDIT_ACTIONS.ATTENDANCE_LOG_CHECKIN,
      entityType: AUDIT_ENTITY_TYPES.ATTENDANCE,
      entityUuid: null,
      diff: { 
        verification_failed: true, 
        reason: 'IP_UNDETERMINED',
        client_ip: null
      },
      ipAddress: null,
    });

    return sendError(res, {
      status: 403,
      message: "You must be connected to the company network to punch attendance.",
      error: "NOT_ON_COMPANY_WIFI",
      code: "NOT_ON_COMPANY_WIFI",
    });
  }

  try {
    // Fetch active network ranges from database
    const [networkSettings] = await executeQuery(
      `SELECT uuid, label, ip_range 
       FROM NetworkSettings 
       WHERE is_active = 1
       ORDER BY label ASC`,
      []
    );

    if (!networkSettings || networkSettings.length === 0) {
      console.warn(`[WIFI_VERIFICATION] No active network ranges configured in NetworkSettings`);
      
      await safeLogEvent({
        actorUuid: req.user?.uuid || null,
        action: AUDIT_ACTIONS.ATTENDANCE_LOG_CHECKIN,
        entityType: AUDIT_ENTITY_TYPES.ATTENDANCE,
        entityUuid: null,
        diff: { 
          verification_failed: true, 
          reason: 'NO_NETWORK_CONFIG',
          client_ip: clientIp
        },
        ipAddress: clientIp,
      });

      return sendError(res, {
        status: 403,
        message: "Company network verification is not configured. Please contact IT support.",
        error: "NOT_ON_COMPANY_WIFI",
        code: "NOT_ON_COMPANY_WIFI",
      });
    }

    console.log(`[WIFI_VERIFICATION] Checking ${networkSettings.length} network range(s)`);

    // Check if client IP matches any active network range
    let isAllowed = false;
    let matchedNetwork = null;

    for (const network of networkSettings) {
      if (isIpInRange(normalizedIp, network.ip_range)) {
        isAllowed = true;
        matchedNetwork = network;
        console.log(`[WIFI_VERIFICATION] IP ${normalizedIp} matched network: ${network.label} (${network.ip_range})`);
        break;
      }
    }

    // Log the verification attempt
    await safeLogEvent({
      actorUuid: req.user?.uuid || null,
      action: AUDIT_ACTIONS.ATTENDANCE_LOG_CHECKIN,
      entityType: AUDIT_ENTITY_TYPES.ATTENDANCE,
      entityUuid: null,
      diff: { 
        wifi_verification: isAllowed ? 'PASSED' : 'FAILED',
        client_ip: clientIp,
        matched_network: matchedNetwork ? {
          uuid: matchedNetwork.uuid,
          label: matchedNetwork.label,
          ip_range: matchedNetwork.ip_range
        } : null,
        checked_ranges: networkSettings.map(n => ({
          label: n.label,
          ip_range: n.ip_range
        }))
      },
      ipAddress: clientIp,
    });

    if (!isAllowed) {
      console.warn(`[WIFI_VERIFICATION] IP ${normalizedIp} (original: ${clientIp}) not in any allowed network range`);
      console.warn(`[WIFI_VERIFICATION] Checked ranges:`, networkSettings.map(n => `${n.label}: ${n.ip_range}`).join(', '));
      
      return sendError(res, {
        status: 403,
        message: "You must be connected to the company network to punch attendance.",
        error: "NOT_ON_COMPANY_WIFI",
        code: "NOT_ON_COMPANY_WIFI",
      });
    }

    // IP is allowed, attach network info to request and proceed
    req.companyNetwork = {
      matched: true,
      network: matchedNetwork,
      clientIp: clientIp
    };

    console.log(`[WIFI_VERIFICATION] Access granted from ${matchedNetwork.label}`);
    return next();

  } catch (error) {
    console.error(`[WIFI_VERIFICATION] Database error:`, error);
    
    await safeLogEvent({
      actorUuid: req.user?.uuid || null,
      action: AUDIT_ACTIONS.ATTENDANCE_LOG_CHECKIN,
      entityType: AUDIT_ENTITY_TYPES.ATTENDANCE,
      entityUuid: null,
      diff: { 
        verification_error: true, 
        error_message: error.message,
        client_ip: clientIp
      },
      ipAddress: clientIp,
    });

    return sendError(res, {
      status: 500,
      message: "Network verification failed. Please try again.",
      error: "WIFI_VERIFICATION_ERROR",
    });
  }
}

module.exports = {
  requireCompanyWifi,
  isIpInRange, // Export for testing
};
