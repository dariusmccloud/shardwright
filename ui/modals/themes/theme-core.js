/**
 * Theme data/state management for Shardwright
 */

import { BUILTIN_THEMES } from '../../common/builtin-themes.js';
import { log } from '../../../core/logger.js';

// ===== Custom Themes Storage =====
let customThemes = {};

// ===== Combined Themes Getter =====
export function getThemes() {
    return { ...BUILTIN_THEMES, ...customThemes };
}

// Backward compatibility
export const THEMES = new Proxy({}, {
    get: (target, prop) => getThemes()[prop],
    ownKeys: () => Object.keys(getThemes()),
    getOwnPropertyDescriptor: (target, prop) => ({
        enumerable: true,
        configurable: true,
        value: getThemes()[prop]
    })
});

// ===== Current Theme State =====
let currentTheme = 'default';

/**
 * Required color properties for theme validation
 */
const REQUIRED_COLORS = [
    '--shardwright-primary',
    '--shardwright-bg-primary',
    '--shardwright-bg-secondary',
    '--shardwright-text-primary',
    '--shardwright-border',
    '--shardwright-success',
    '--shardwright-warning',
    '--shardwright-error',
];

/**
 * All valid color properties
 */
const VALID_COLOR_PROPS = [
    '--shardwright-primary', '--shardwright-primary-hover', '--shardwright-primary-active',
    '--shardwright-bg-primary', '--shardwright-bg-secondary', '--shardwright-bg-tertiary', '--shardwright-bg-input',
    '--shardwright-text-primary', '--shardwright-text-secondary', '--shardwright-text-muted',
    '--shardwright-border', '--shardwright-border-focus',
    '--shardwright-success', '--shardwright-warning', '--shardwright-error', '--shardwright-info',
    '--shardwright-weight-critical', '--shardwright-weight-major', '--shardwright-weight-moderate',
    '--shardwright-weight-minor', '--shardwright-weight-trivial',
    '--shardwright-nsfw-accent', '--shardwright-highlight', '--shardwright-quote',
    '--shardwright-shadow', '--shardwright-shadow-lg',
    '--shardwright-transition',
    '--shardwright-text-hint', '--shardwright-rescue-bg', '--shardwright-rescue-bg-hover',
    '--shardwright-stop-hover', '--shardwright-overlay-bg', '--shardwright-focus-glow',

    // Typography (optional)
    '--shardwright-font-primary', '--shardwright-font-secondary', '--shardwright-font-muted', '--shardwright-font-hint',
    '--shardwright-font-size-primary', '--shardwright-font-size-secondary', '--shardwright-font-size-muted', '--shardwright-font-size-hint',
];

/**
 * Initialize themes system
 * @param {Object} settings - Extension settings
 */
export function initializeThemes(settings) {
    // Load custom themes from settings
    if (settings.customThemes && typeof settings.customThemes === 'object') {
        customThemes = settings.customThemes;
    }

    // Load current theme
    currentTheme = settings.theme || 'default';

    // Verify theme exists, fallback to default
    if (!getThemes()[currentTheme]) {
        log.warn(`Theme "${currentTheme}" not found, falling back to default`);
        currentTheme = 'default';
    }

    applyTheme(currentTheme);
    log.log(`Theme initialized: ${currentTheme}`);
}

/**
 * Apply a theme
 * @param {string} themeId - Theme identifier
 */
export function applyTheme(themeId) {
    const themes = getThemes();
    const theme = themes[themeId];

    if (!theme) {
        log.warn(`Unknown theme: ${themeId}, falling back to default`);
        themeId = 'default';
    }

    const selectedTheme = themes[themeId] || themes.default;

    // Apply CSS custom properties to extension elements only (not :root)
    // Target the main settings panel and all modals
    const targetSelectors = [
        '#shardwright-settings',
        '#shardwright-panel',
        '.shardwright-modal',
        '[class*="shardwright-"][class*="-modal"]',
        '.popup.shardwright-owned-popup',
        '.shardwright-fab',
        '.shardwright-fab-panels',
        '.shardwright-fab-shard-overlay'
    ];

    // Apply to existing elements
    targetSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            Object.entries(selectedTheme.colors).forEach(([property, value]) => {
                el.style.setProperty(property, value);
            });
        });
    });

    // Also apply to popup wrappers that contain our modals (for popup-controls buttons)
    document.querySelectorAll('.popup').forEach(popup => {
        if (popup.classList.contains('shardwright-owned-popup') || popup.querySelector('[class*="shardwright-"][class*="-modal"]')) {
            Object.entries(selectedTheme.colors).forEach(([property, value]) => {
                popup.style.setProperty(property, value);
            });
        }
    });

    // Also inject a dynamic style block for future elements (modals that don't exist yet)
    let dynamicStyleEl = document.getElementById('shardwright-theme-dynamic-vars');
    if (dynamicStyleEl) {
        // Remove existing to ensure it's at the end (after main styles)
        dynamicStyleEl.remove();
    }
    dynamicStyleEl = document.createElement('style');
    dynamicStyleEl.id = 'shardwright-theme-dynamic-vars';
    document.head.appendChild(dynamicStyleEl);

    // Build CSS for dynamic application to future elements
    // Use higher specificity selectors to ensure they override defaults
    const cssVars = Object.entries(selectedTheme.colors)
        .map(([prop, val]) => `${prop}: ${val};`)
        .join('\n        ');

    dynamicStyleEl.textContent = `
        /* Theme override styles - higher specificity */
        html #shardwright-settings,
        html #shardwright-panel,
        html .shardwright-modal,
        html [class*="shardwright-"][class*="-modal"],
        html .popup.shardwright-owned-popup,
        html .popup:has([class*="shardwright-"][class*="-modal"]),
        html .shardwright-fab,
        html .shardwright-fab-panels,
        html .shardwright-fab-shard-overlay {
            ${cssVars}
        }
    `;

    // Remove all theme classes
    Object.keys(themes).forEach(id => {
        document.body.classList.remove(`shardwright-theme-${id}`);
    });

    // Add current theme class
    document.body.classList.add(`shardwright-theme-${themeId}`);

    // Handle extra styles
    removeExtraStyles();
    if (selectedTheme.extraStyles) {
        injectExtraStyles(selectedTheme.extraStyles);
    }

    currentTheme = themeId;

    window.dispatchEvent(new CustomEvent('shardwright-theme-changed', {
        detail: { theme: themeId }
    }));
}

/**
 * Get current theme ID
 */
export function getCurrentTheme() {
    return currentTheme;
}

/**
 * Get current custom themes backing object
 */
export function getCustomThemes() {
    return customThemes;
}

/**
 * Inject extra theme styles
 */
function injectExtraStyles(css) {
    removeExtraStyles();
    const style = document.createElement('style');
    style.id = 'shardwright-theme-extra-styles';
    style.textContent = css;
    document.head.appendChild(style);
}

/**
 * Remove extra theme styles
 */
function removeExtraStyles() {
    const existing = document.getElementById('shardwright-theme-extra-styles');
    if (existing) existing.remove();
}

// ===== VALIDATION =====

/**
 * Validate a theme object
 * @param {Object} theme - Theme to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTheme(theme) {
    const errors = [];

    // Check required fields
    if (!theme.id || typeof theme.id !== 'string') {
        errors.push('Theme must have a valid "id" string');
    } else if (!/^[a-z0-9_\-]+$/.test(theme.id)) {
        errors.push('Theme ID must contain only lowercase letters, numbers, hyphens, and underscores');
    } else if (BUILTIN_THEMES[theme.id]) {
        errors.push(`Theme ID "${theme.id}" conflicts with a built-in theme`);
    }

    if (!theme.name || typeof theme.name !== 'string') {
        errors.push('Theme must have a valid "name" string');
    }

    if (!theme.colors || typeof theme.colors !== 'object') {
        errors.push('Theme must have a "colors" object');
    } else {
        // Check required colors
        for (const prop of REQUIRED_COLORS) {
            if (!theme.colors[prop]) {
                errors.push(`Missing required color: ${prop}`);
            }
        }

        // Warn about unknown properties (non-fatal)
        for (const prop of Object.keys(theme.colors)) {
            if (!VALID_COLOR_PROPS.includes(prop)) {
                log.warn(`Unknown color property: ${prop}`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Fill missing theme properties with defaults
 * @param {Object} theme - Theme to complete
 * @returns {Object} Complete theme
 */
function completeTheme(theme) {
    const defaultColors = BUILTIN_THEMES.default.colors;

    return {
        id: theme.id,
        name: theme.name || theme.id,
        description: theme.description || 'Custom theme',
        preview: theme.preview || '🎨',
        builtin: false,
        colors: { ...defaultColors, ...theme.colors },
        extraStyles: theme.extraStyles || ''
    };
}

// ===== IMPORT/EXPORT/DELETE =====

/**
 * Export a theme as JSON
 * @param {string} themeId - Theme to export
 * @returns {string} JSON string
 */
export function exportTheme(themeId) {
    const themes = getThemes();
    const theme = themes[themeId];

    if (!theme) {
        throw new Error(`Theme "${themeId}" not found`);
    }

    // Create export object (exclude builtin flag)
    const exportData = {
        id: theme.id,
        name: theme.name,
        description: theme.description,
        preview: theme.preview,
        colors: { ...theme.colors },
        extraStyles: theme.extraStyles || ''
    };

    return JSON.stringify(exportData, null, 2);
}

/**
 * Export all custom themes
 * @returns {string} JSON string
 */
export function exportAllCustomThemes() {
    const exportData = {
        version: 1,
        exportDate: new Date().toISOString(),
        themes: Object.values(customThemes).map(theme => ({
            id: theme.id,
            name: theme.name,
            description: theme.description,
            preview: theme.preview,
            colors: { ...theme.colors },
            extraStyles: theme.extraStyles || ''
        }))
    };

    return JSON.stringify(exportData, null, 2);
}

/**
 * Import a theme from JSON
 * @param {string} jsonString - JSON theme data
 * @param {Object} settings - Extension settings
 * @param {Function} saveSettingsFn - Save callback
 * @returns {{ success: boolean, themeId?: string, error?: string }}
 */
export async function importTheme(jsonString, settings, saveSettingsFn) {
    try {
        const data = JSON.parse(jsonString);
        // Check if it's a plain array of themes (e.g., [{...}, {...}])
        if (Array.isArray(data)) {
            return importMultipleThemes(data, settings, saveSettingsFn);
        }
        // Check if it's a multi-theme export
        if (data.themes && Array.isArray(data.themes)) {
            return importMultipleThemes(data.themes, settings, saveSettingsFn);
        }

        // Single theme import
        const validation = validateTheme(data);
        if (!validation.valid) {
            return {
                success: false,
                error: `Invalid theme:\n${validation.errors.join('\n')}`
            };
        }

        // Complete and add theme
        const completeThemeData = completeTheme(data);
        customThemes[completeThemeData.id] = completeThemeData;

        // Save to settings
        settings.customThemes = customThemes;
        if (saveSettingsFn) {
            await saveSettingsFn();
        }

        return { success: true, themeId: completeThemeData.id };

    } catch (e) {
        return { success: false, error: `Failed to parse JSON: ${e.message}` };
    }
}

/**
 * Import multiple themes
 */
async function importMultipleThemes(themes, settings, saveSettingsFn) {
    const results = { imported: [], failed: [] };

    for (const theme of themes) {
        const validation = validateTheme(theme);
        if (validation.valid) {
            const complete = completeTheme(theme);
            customThemes[complete.id] = complete;
            results.imported.push(complete.name);
        } else {
            results.failed.push({ name: theme.name || theme.id, errors: validation.errors });
        }
    }

    // Save
    settings.customThemes = customThemes;
    if (saveSettingsFn) {
        await saveSettingsFn();
    }

    if (results.failed.length === 0) {
        return {
            success: true,
            message: `Imported ${results.imported.length} theme(s): ${results.imported.join(', ')}`
        };
    } else {
        return {
            success: results.imported.length > 0,
            message: `Imported: ${results.imported.length}, Failed: ${results.failed.length}`,
            details: results
        };
    }
}

/**
 * Delete a custom theme
 * @param {string} themeId - Theme to delete
 * @param {Object} settings - Extension settings
 * @param {Function} saveSettingsFn - Save callback
 * @returns {{ success: boolean, error?: string }}
 */
export async function deleteTheme(themeId, settings, saveSettingsFn) {
    // Prevent deleting built-in themes
    if (BUILTIN_THEMES[themeId]) {
        return { success: false, error: 'Cannot delete built-in themes' };
    }

    // Check if theme exists
    if (!customThemes[themeId]) {
        return { success: false, error: `Theme "${themeId}" not found` };
    }

    // If currently active, switch to default
    if (currentTheme === themeId) {
        applyTheme('default');
        settings.theme = 'default';
    }

    // Delete
    delete customThemes[themeId];
    settings.customThemes = customThemes;

    if (saveSettingsFn) {
        await saveSettingsFn();
    }

    return { success: true };
}

/**
 * Duplicate a theme for editing
 * @param {string} themeId - Source theme
 * @param {string} newId - New theme ID
 * @param {string} newName - New theme name
 * @param {Object} settings - Extension settings
 * @param {Function} saveSettingsFn - Save callback
 */
export async function duplicateTheme(themeId, newId, newName, settings, saveSettingsFn) {
    const themes = getThemes();
    const source = themes[themeId];

    if (!source) {
        return { success: false, error: `Source theme "${themeId}" not found` };
    }

    if (themes[newId]) {
        return { success: false, error: `Theme ID "${newId}" already exists` };
    }

    const newTheme = {
        id: newId,
        name: newName,
        description: `Based on ${source.name}`,
        preview: source.preview,
        builtin: false,
        colors: { ...source.colors },
        extraStyles: source.extraStyles || ''
    };

    customThemes[newId] = newTheme;
    settings.customThemes = customThemes;

    if (saveSettingsFn) {
        await saveSettingsFn();
    }

    return { success: true, themeId: newId };
}

/**
 * Update a custom theme with partial fields
 */
export async function updateCustomTheme(themeId, updates, settings, saveSettingsFn) {
    if (!customThemes[themeId]) {
        return { success: false, error: `Theme "${themeId}" not found` };
    }

    customThemes[themeId] = {
        ...customThemes[themeId],
        ...updates
    };

    settings.customThemes = customThemes;
    if (saveSettingsFn) {
        await saveSettingsFn();
    }

    if (currentTheme === themeId) {
        applyTheme(themeId);
    }

    return { success: true };
}

