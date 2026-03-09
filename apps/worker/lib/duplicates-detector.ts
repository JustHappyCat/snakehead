import { generateHash, findDuplicates, DuplicateGroup } from './duplicates'

export class DuplicatesDetector {
  private pages: Array<{ url: string; content?: string }> = []

  addPage(url: string, content?: string): void {
    this.pages.push({ url, content })
  }

  findDuplicatePages(): DuplicateGroup[] {
    const duplicates = findDuplicates(this.pages)
    return duplicates.filter(group => group.count > 1)
  }
}