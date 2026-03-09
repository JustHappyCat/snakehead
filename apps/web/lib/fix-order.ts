import { Severity, Impact, Difficulty } from '@prisma/client'
import { prisma } from './prisma'

interface IssuePriorityScore {
  issue: any
  score: number
  importance: string
}

const SEVERITY_SCORES: Record<Severity, number> = {
  CRITICAL: 30,
  HIGH: 20,
  MEDIUM: 10,
  LOW: 5,
}

const IMPACT_SCORES: Record<Impact, number> = {
  HIGH: 20,
  MEDIUM: 10,
  LOW: 5,
}

const DIFFICULTY_SCORES: Record<Difficulty, number> = {
  EASY: 20,
  MEDIUM: 10,
  HARD: 5,
}

export function calculateFixPriority(
  severity: Severity,
  impact: Impact,
  difficulty: Difficulty
): number {
  const severityScore = SEVERITY_SCORES[severity]
  const impactScore = IMPACT_SCORES[impact]
  const difficultyScore = DIFFICULTY_SCORES[difficulty]

  return severityScore + impactScore + difficultyScore
}

export function getImportanceLabel(score: number): string {
  if (score >= 60) return 'Fix First'
  if (score >= 40) return 'Priority'
  if (score >= 25) return 'Important'
  return 'Can Wait'
}

export async function getFixOrderedIssues(
  crawlId: string,
  limit: number = 20
): Promise<IssuePriorityScore[]> {
  const issues = await prisma.issue.findMany({
    where: { crawlId },
    orderBy: { createdAt: 'desc' },
  })

  const scoredIssues: IssuePriorityScore[] = issues.map((issue) => {
    const score = calculateFixPriority(
      issue.severity,
      issue.impact,
      issue.difficulty
    )

    return {
      issue,
      score,
      importance: getImportanceLabel(score),
    }
  })

  scoredIssues.sort((a, b) => b.score - a.score)

  return scoredIssues.slice(0, limit)
}

export async function getIssuesByImportance(
  crawlId: string
): Promise<Record<string, IssuePriorityScore[]>> {
  const scoredIssues = await getFixOrderedIssues(crawlId, 100)

  const grouped = scoredIssues.reduce((acc, item) => {
    if (!acc[item.importance]) {
      acc[item.importance] = []
    }
    acc[item.importance].push(item)
    return acc
  }, {} as Record<string, IssuePriorityScore[]>)

  return grouped
}

export async function getQuickWins(
  crawlId: string,
  limit: number = 10
): Promise<IssuePriorityScore[]> {
  const issues = await prisma.issue.findMany({
    where: { crawlId },
  })

  const easyHighImpact = issues
    .filter(
      (issue) =>
        (issue.severity === 'HIGH' || issue.impact === 'HIGH') &&
        issue.difficulty === 'EASY'
    )
    .map((issue) => {
      const score = calculateFixPriority(
        issue.severity,
        issue.impact,
        issue.difficulty
      )

      return {
        issue,
        score,
        importance: 'Quick Win',
      }
    })
    .sort((a, b) => b.score - a.score)

  return easyHighImpact.slice(0, limit)
}
