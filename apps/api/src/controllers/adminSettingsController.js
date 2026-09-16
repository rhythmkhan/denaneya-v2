/**
 * DenaNeya v2.0 - Super Admin Master Controls & Settings Controller
 * File: apps/api/src/controllers/adminSettingsController.js
 *
 * Implements:
 * 1. Gateway Master Switches: Globally enable/disable payment channels
 * 2. Dynamic Pricing Configuration: feePerVerification, starterCredits, packages
 * 3. Live Site Customizer: Hero headlines, announcement banner, support links (anti-XSS sanitized)
 * 4. Maintenance Mode Controls: Network-wide maintenance toggle with custom message and IP whitelist
 * 5. Public Dynamic Settings API: Unauthenticated public delivery of live copy & announcements
 */

import dbPkg from '@denaneya/database';

const { getDatabase, getSystemSetting, setSystemSetting, createAdminAuditLog } = dbPkg;

/**
 * Escapes unsafe HTML characters to prevent XSS injection
 */
function sanitizeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates external URL / phone protocols
 */
function validateSafeUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const lower = url.trim().toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return false;
  }
  return true;
}

// ==============================================================================
// 1. GATEWAY MASTER SWITCHES
// ==============================================================================

export async function getMasterGateways(req, res) {
  try {
    const db = getDatabase();
    const setting = await getSystemSetting(db, 'master_gateways', { disabled_channels: [] });
    const disabledChannels = setting.disabled_channels || setting.disabledChannels || [];

    return res.status(200).json({
      success: true,
      masterGateways: { disabled_channels: disabledChannels },
      disabled_channels: disabledChannels,
      disabledChannels
    });
  } catch (err) {
    console.error('[getMasterGateways Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'GATEWAYS_FETCH_FAILED',
      message: 'Failed to retrieve master gateway switches.'
    });
  }
}

export async function updateMasterGatewayChannel(req, res) {
  try {
    const channel = (req.params.channel || '').toLowerCase().trim();
    const { enabled } = req.body || {};

    if (!channel) {
      return res.status(400).json({
        success: false,
        code: 'CHANNEL_REQUIRED',
        message: 'Payment channel name is required.'
      });
    }

    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        code: 'ENABLED_REQUIRED',
        message: "'enabled' boolean is required in request body."
      });
    }

    const db = getDatabase();
    const current = await getSystemSetting(db, 'master_gateways', { disabled_channels: [] });
    let disabled = Array.isArray(current.disabled_channels) ? [...current.disabled_channels] : [];

    if (enabled === false) {
      if (!disabled.includes(channel)) {
        disabled.push(channel);
      }
    } else {
      disabled = disabled.filter((c) => c !== channel);
    }

    const updatedValue = { disabled_channels: disabled };
    await setSystemSetting(db, 'master_gateways', 'gateways', updatedValue, req.user?.id, 'Globally disabled payment gateway channels');

    if (req.user) {
      await createAdminAuditLog(db, {
        adminId: req.user.id,
        action: enabled ? 'ENABLE_MASTER_GATEWAY' : 'DISABLE_MASTER_GATEWAY',
        targetType: 'gateway',
        targetId: channel,
        details: { channel, enabled }
      });
    }

    return res.status(200).json({
      success: true,
      channel,
      enabled: Boolean(enabled),
      disabled_channels: disabled,
      message: `Master gateway switch for '${channel}' set to ${enabled ? 'ENABLED' : 'DISABLED'}.`
    });
  } catch (err) {
    console.error('[updateMasterGatewayChannel Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'GATEWAY_UPDATE_FAILED',
      message: 'Failed to update master gateway switch.'
    });
  }
}

// ==============================================================================
// 2. DYNAMIC PRICING CONFIGURATION
// ==============================================================================

export async function getPricingSettings(req, res) {
  try {
    const db = getDatabase();
    const pricing = await getSystemSetting(db, 'pricing', {
      rate_per_verification_bdt: 1,
      feePerVerification: 1,
      starterCredits: 50,
      starter_credits: 50,
      packages: []
    });

    const feePerVerification = pricing.feePerVerification ?? pricing.rate_per_verification_bdt ?? 1;
    const starterCredits = pricing.starterCredits ?? pricing.starter_credits ?? 50;

    return res.status(200).json({
      success: true,
      feePerVerification: Number(feePerVerification),
      starterCredits: Number(starterCredits),
      packages: pricing.packages || [],
      pricing
    });
  } catch (err) {
    console.error('[getPricingSettings Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'PRICING_FETCH_FAILED',
      message: 'Failed to retrieve pricing configuration.'
    });
  }
}

export async function updatePricingSettings(req, res) {
  try {
    const { feePerVerification, starterCredits, packages } = req.body || {};

    if (feePerVerification !== undefined && (typeof feePerVerification !== 'number' || feePerVerification < 0)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_FEE',
        message: 'Fee per verification must be a non-negative number.'
      });
    }

    if (starterCredits !== undefined && (typeof starterCredits !== 'number' || starterCredits < 0)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_CREDITS',
        message: 'Starter bonus credits must be a non-negative integer.'
      });
    }

    const db = getDatabase();
    const current = await getSystemSetting(db, 'pricing', {});

    const updated = {
      ...current,
      feePerVerification: feePerVerification !== undefined ? feePerVerification : (current.feePerVerification ?? 1),
      rate_per_verification_bdt: feePerVerification !== undefined ? feePerVerification : (current.rate_per_verification_bdt ?? 1),
      starterCredits: starterCredits !== undefined ? starterCredits : (current.starterCredits ?? 50),
      starter_credits: starterCredits !== undefined ? starterCredits : (current.starter_credits ?? 50),
      packages: Array.isArray(packages) ? packages : (current.packages || [])
    };

    await setSystemSetting(db, 'pricing', 'pricing', updated, req.user?.id, 'Dynamic verification rate and credit tiers');

    if (req.user) {
      await createAdminAuditLog(db, {
        adminId: req.user.id,
        action: 'UPDATE_PRICING',
        targetType: 'setting',
        targetId: 'pricing',
        details: updated
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Platform pricing configuration updated successfully.',
      feePerVerification: updated.feePerVerification,
      starterCredits: updated.starterCredits,
      packages: updated.packages
    });
  } catch (err) {
    console.error('[updatePricingSettings Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'PRICING_UPDATE_FAILED',
      message: 'Failed to update pricing configuration.'
    });
  }
}

// ==============================================================================
// 3. LIVE SITE CUSTOMIZER
// ==============================================================================

export async function getCustomizerSettings(req, res) {
  try {
    const db = getDatabase();
    const customizer = await getSystemSetting(db, 'site_customizer', await getSystemSetting(db, 'customizer', {}));

    return res.status(200).json({
      success: true,
      heroTitle: customizer.heroTitle || customizer.hero_title || 'দেনা নেয়া ভার্সন টু - Payment Automation Platform',
      heroSubtitle: customizer.heroSubtitle || customizer.hero_subtitle || 'Automated MFS Payment Reconciliation for Bangladesh',
      announcementText: customizer.announcementText || customizer.announcement_text || '',
      announcementActive: Boolean(customizer.announcementActive ?? customizer.announcement_enabled ?? false),
      supportWhatsapp: customizer.supportWhatsapp || customizer.whatsapp_support || '',
      supportTelegram: customizer.supportTelegram || customizer.telegram_support || '',
      customizer
    });
  } catch (err) {
    console.error('[getCustomizerSettings Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'CUSTOMIZER_FETCH_FAILED',
      message: 'Failed to retrieve site customizer settings.'
    });
  }
}

export async function updateCustomizerSettings(req, res) {
  try {
    const {
      heroTitle,
      heroSubtitle,
      announcementText,
      announcementActive,
      supportWhatsapp,
      supportTelegram
    } = req.body || {};

    if (!validateSafeUrl(supportWhatsapp) || !validateSafeUrl(supportTelegram)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_URL',
        message: 'Invalid protocol in support links. javascript: and data: URIs are prohibited.'
      });
    }

    const db = getDatabase();
    const current = await getSystemSetting(db, 'site_customizer', await getSystemSetting(db, 'customizer', {}));

    const sanitized = {
      heroTitle: heroTitle !== undefined ? sanitizeHtml(heroTitle) : (current.heroTitle || current.hero_title || ''),
      heroSubtitle: heroSubtitle !== undefined ? sanitizeHtml(heroSubtitle) : (current.heroSubtitle || current.hero_subtitle || ''),
      announcementText: announcementText !== undefined ? sanitizeHtml(announcementText) : (current.announcementText || current.announcement_text || ''),
      announcementActive: announcementActive !== undefined ? Boolean(announcementActive) : Boolean(current.announcementActive ?? current.announcement_enabled ?? false),
      supportWhatsapp: supportWhatsapp !== undefined ? supportWhatsapp.trim() : (current.supportWhatsapp || current.whatsapp_support || ''),
      supportTelegram: supportTelegram !== undefined ? supportTelegram.trim() : (current.supportTelegram || current.telegram_support || '')
    };

    // Save under both keys for maximum interop
    await setSystemSetting(db, 'site_customizer', 'site', sanitized, req.user?.id, 'Public marketing site headlines and support links');
    await setSystemSetting(db, 'customizer', 'site', sanitized, req.user?.id, 'Public marketing site headlines and support links');

    if (req.user) {
      await createAdminAuditLog(db, {
        adminId: req.user.id,
        action: 'UPDATE_CUSTOMIZER',
        targetType: 'setting',
        targetId: 'site_customizer',
        details: sanitized
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Site customizer settings saved successfully.',
      ...sanitized
    });
  } catch (err) {
    console.error('[updateCustomizerSettings Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'CUSTOMIZER_UPDATE_FAILED',
      message: 'Failed to update site customizer settings.'
    });
  }
}

/**
 * GET /api/customizer/public (and /api/public/settings)
 * Unauthenticated public endpoint delivering dynamic copy and announcements
 */
export async function getPublicCustomizer(req, res) {
  try {
    const db = getDatabase();
    const customizer = await getSystemSetting(db, 'site_customizer', await getSystemSetting(db, 'customizer', {}));

    const heroTitle = customizer.heroTitle || customizer.hero_title || 'দেনা নেয়া ভার্সন টু - Payment Automation Platform';
    const heroSubtitle = customizer.heroSubtitle || customizer.hero_subtitle || 'Automated MFS Payment Reconciliation for Bangladesh';
    const announcementText = customizer.announcementText || customizer.announcement_text || '';
    const announcementActive = Boolean(customizer.announcementActive ?? customizer.announcement_enabled ?? false);
    const supportWhatsapp = customizer.supportWhatsapp || customizer.whatsapp_support || '';
    const supportTelegram = customizer.supportTelegram || customizer.telegram_support || '';

    return res.status(200).json({
      success: true,
      heroTitle,
      heroSubtitle,
      announcement: {
        text: announcementText,
        active: announcementActive
      },
      announcementText,
      announcementActive,
      support: {
        whatsapp: supportWhatsapp,
        telegram: supportTelegram
      },
      supportWhatsapp,
      supportTelegram
    });
  } catch (err) {
    console.error('[getPublicCustomizer Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'PUBLIC_SETTINGS_ERROR',
      message: 'Failed to load public settings.'
    });
  }
}

// ==============================================================================
// 4. NETWORK-WIDE MAINTENANCE MODE
// ==============================================================================

export async function getMaintenanceSettings(req, res) {
  try {
    const db = getDatabase();
    const setting = await getSystemSetting(db, 'maintenance_mode', {
      enabled: false,
      message: 'System is undergoing scheduled maintenance.',
      allowed_ips: []
    });

    const allowedIps = setting.allowedIps || setting.allowed_ips || [];

    return res.status(200).json({
      success: true,
      enabled: Boolean(setting.enabled),
      message: setting.message || 'System is undergoing scheduled maintenance.',
      allowedIps,
      allowed_ips: allowedIps
    });
  } catch (err) {
    console.error('[getMaintenanceSettings Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'MAINTENANCE_FETCH_FAILED',
      message: 'Failed to retrieve maintenance mode settings.'
    });
  }
}

export async function updateMaintenanceSettings(req, res) {
  try {
    const { enabled, message, allowedIps, allowed_ips } = req.body || {};

    const db = getDatabase();
    const current = await getSystemSetting(db, 'maintenance_mode', {
      enabled: false,
      message: 'System is undergoing scheduled maintenance.',
      allowed_ips: []
    });

    const ips = Array.isArray(allowedIps) ? allowedIps : Array.isArray(allowed_ips) ? allowed_ips : (current.allowedIps || current.allowed_ips || []);

    const updated = {
      enabled: enabled !== undefined ? Boolean(enabled) : Boolean(current.enabled),
      message: message !== undefined ? String(message).trim() : (current.message || 'System is undergoing scheduled maintenance.'),
      allowedIps: ips,
      allowed_ips: ips
    };

    await setSystemSetting(db, 'maintenance_mode', 'maintenance', updated, req.user?.id, 'Platform-wide maintenance mode switch and IP whitelist');

    if (req.user) {
      await createAdminAuditLog(db, {
        adminId: req.user.id,
        action: updated.enabled ? 'ENABLE_MAINTENANCE_MODE' : 'DISABLE_MAINTENANCE_MODE',
        targetType: 'setting',
        targetId: 'maintenance_mode',
        details: updated
      });
    }

    return res.status(200).json({
      success: true,
      message: `Platform maintenance mode set to ${updated.enabled ? 'ACTIVE' : 'INACTIVE'}.`,
      ...updated
    });
  } catch (err) {
    console.error('[updateMaintenanceSettings Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'MAINTENANCE_UPDATE_FAILED',
      message: 'Failed to update maintenance mode settings.'
    });
  }
}

export default {
  getMasterGateways,
  updateMasterGatewayChannel,
  getPricingSettings,
  updatePricingSettings,
  getCustomizerSettings,
  updateCustomizerSettings,
  getPublicCustomizer,
  getMaintenanceSettings,
  updateMaintenanceSettings
};
