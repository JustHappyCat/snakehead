import { IssueData } from '../extract/page-extractor'
import { Severity, Impact, Difficulty } from '@prisma/client'

export interface IssueRule {
  type: string
  title: string
  explanation: string
  severity: Severity
  impact: Impact
  difficulty: Difficulty
  check: (data: any) => boolean
  createIssue: (url: string, data: any) => Partial<IssueData>
}

export class IssueDetector {
  private rules: IssueRule[] = []

  constructor() {
    this.initializeRules()
  }

  private initializeRules(): void {
    this.rules = [
      {
        type: 'BROKEN_PAGE',
        title: 'Broken Page',
        explanation: 'This page returns an error and cannot be accessed.',
        severity: Severity.HIGH,
        impact: Impact.HIGH,
        difficulty: Difficulty.EASY,
        check: (data) => data.statusCode >= 400 && data.statusCode < 600,
        createIssue: (url, data) => ({
          issueType: 'BROKEN_PAGE',
          url,
          title: data.statusCode === 404 ? '404 Not Found' : `Server Error (${data.statusCode})`,
          fixSteps: [
            'Check if the URL is correct',
            'Restore the page if it was removed',
            'Set up a 301 redirect to a related page',
          ],
        }),
      },
      {
        type: 'REDIRECT',
        title: 'Redirect',
        explanation: 'This page redirects to another URL.',
        severity: Severity.LOW,
        impact: Impact.MEDIUM,
        difficulty: Difficulty.EASY,
        check: (data) => data.statusCode >= 300 && data.statusCode < 400,
        createIssue: (url, data) => ({
          issueType: 'REDIRECT',
          url,
          title: 'Redirect',
          fixSteps: [
            'Update links to point directly to the final URL',
            'Consider if the redirect is necessary',
          ],
        }),
      },
    ]
  }

  detectIssues(data: any): Partial<IssueData>[] {
    const issues: Partial<IssueData>[] = []

    for (const rule of this.rules) {
      if (rule.check(data)) {
        issues.push(rule.createIssue(data.url || '', data))
      }
    }

    return issues
  }

  getRuleByType(type: string): IssueRule | undefined {
    return this.rules.find(rule => rule.type === type)
  }

  getAllRules(): IssueRule[] {
    return [...this.rules]
  }
}
