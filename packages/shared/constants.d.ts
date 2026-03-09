import { Severity, Impact, Difficulty } from './types';
export declare const SEVERITY_LEVELS: Record<Severity, number>;
export declare const IMPACT_LEVELS: Record<Impact, number>;
export declare const DIFFICULTY_LEVELS: Record<Difficulty, number>;
export declare const CRAWL_STATUS_COLORS: Record<string, string>;
export declare const COMMON_SEO_ISSUES: {
    type: string;
    title: string;
    explanation: string;
    whyMatters: string;
    fixSteps: string[];
    severity: Severity;
    impact: Impact;
    difficulty: Difficulty;
}[];
