"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMON_SEO_ISSUES = exports.CRAWL_STATUS_COLORS = exports.DEFAULT_CRAWL_SETTINGS = exports.DIFFICULTY_LEVELS = exports.IMPACT_LEVELS = exports.SEVERITY_LEVELS = void 0;
exports.SEVERITY_LEVELS = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
};
exports.IMPACT_LEVELS = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
};
exports.DIFFICULTY_LEVELS = {
    HARD: 3,
    MEDIUM: 2,
    EASY: 1,
};
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
exports.CRAWL_STATUS_COLORS = {
    PENDING: 'text-yellow-600',
    RUNNING: 'text-blue-600',
    COMPLETED: 'text-green-600',
    FAILED: 'text-red-600',
    CANCELLED: 'text-gray-600',
};
exports.COMMON_SEO_ISSUES = [
    {
        type: 'BROKEN_PAGE',
        title: 'Broken Page',
        explanation: 'This page returns a 4xx or 5xx error code and cannot be accessed.',
        whyMatters: 'Broken pages create a poor user experience and waste crawl budget.',
        fixSteps: ['Check the page URL for typos', 'Set up a 301 redirect to a related page', 'Fix server errors'],
        severity: 'HIGH',
        impact: 'HIGH',
        difficulty: 'EASY',
    },
    {
        type: 'MISSING_TITLE',
        title: 'Missing Title Tag',
        explanation: 'This page does not have a title tag.',
        whyMatters: 'The title tag is important for SEO and helps users understand the page content.',
        fixSteps: ['Add a unique, descriptive title to the page', 'Keep it under 60 characters'],
        severity: 'MEDIUM',
        impact: 'MEDIUM',
        difficulty: 'EASY',
    },
    {
        type: 'MISSING_META_DESCRIPTION',
        title: 'Missing Meta Description',
        explanation: 'This page does not have a meta description.',
        whyMatters: 'Meta descriptions appear in search results and affect click-through rates.',
        fixSteps: ['Add a compelling summary of the page content', 'Keep it under 160 characters'],
        severity: 'LOW',
        impact: 'MEDIUM',
        difficulty: 'EASY',
    },
    {
        type: 'NOT_INDEXABLE',
        title: 'Not Indexable',
        explanation: 'This page is blocked from being indexed by search engines.',
        whyMatters: 'If important pages are not indexable, they cannot appear in search results.',
        fixSteps: ['Check meta robots tag', 'Check X-Robots-Tag header', 'Review robots.txt rules'],
        severity: 'HIGH',
        impact: 'HIGH',
        difficulty: 'MEDIUM',
    },
];
