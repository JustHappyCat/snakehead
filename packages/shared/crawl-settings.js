"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CRAWL_SETTINGS = void 0;
exports.validateCrawlSettings = validateCrawlSettings;
exports.parseSettingsJson = parseSettingsJson;
exports.DEFAULT_CRAWL_SETTINGS = {
    maxPages: 500,
    maxDepth: 5,
    concurrency: 5,
    timeout: 10000,
    respectRobots: true,
    allowlist: [],
    denylist: [],
    excludeExtensions: ['.pdf', '.zip', '.exe', '.jpg', '.png', '.gif'],
};
function validateCrawlSettings(settings) {
    const validated = {
        ...exports.DEFAULT_CRAWL_SETTINGS,
        ...settings,
    };
    if (validated.maxPages < 1 || validated.maxPages > 10000) {
        validated.maxPages = exports.DEFAULT_CRAWL_SETTINGS.maxPages;
    }
    if (validated.maxDepth < 1 || validated.maxDepth > 20) {
        validated.maxDepth = exports.DEFAULT_CRAWL_SETTINGS.maxDepth;
    }
    if (validated.concurrency < 1 || validated.concurrency > 20) {
        validated.concurrency = exports.DEFAULT_CRAWL_SETTINGS.concurrency;
    }
    if (validated.timeout < 1000 || validated.timeout > 60000) {
        validated.timeout = exports.DEFAULT_CRAWL_SETTINGS.timeout;
    }
    validated.excludeExtensions = validated.excludeExtensions || exports.DEFAULT_CRAWL_SETTINGS.excludeExtensions;
    return validated;
}
function parseSettingsJson(json) {
    if (!json)
        return { ...exports.DEFAULT_CRAWL_SETTINGS };
    try {
        const parsed = JSON.parse(json);
        return validateCrawlSettings(parsed);
    }
    catch {
        return { ...exports.DEFAULT_CRAWL_SETTINGS };
    }
}
