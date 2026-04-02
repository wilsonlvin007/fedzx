import { prisma } from './prisma'

export async function getArticleViews(articleId: string): Promise<number> {
  try {
    const result = await prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COALESCE(SUM(views), 0) as total
      FROM article_metrics
      WHERE article_id = ${articleId}
    `
    return Number(result[0]?.total) || 0
  } catch (error) {
    console.error('Get article views error:', error)
    return 0
  }
}

export async function getArticlesViews(articleIds: string[]): Promise<Map<string, number>> {
  if (!articleIds.length) return new Map()

  try {
    // 逐个查询，避免字符串拼接到 IN 语句导致 TEXT ID 不被引号包裹的 bug
    const map = new Map<string, number>()
    for (const id of articleIds) {
      const result = await prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COALESCE(SUM(views), 0) as total
        FROM article_metrics
        WHERE article_id = ${id}
      `
      const total = Number(result[0]?.total) || 0
      if (total > 0) {
        map.set(id, total)
      }
    }
    return map
  } catch (error) {
    console.error('Get articles views error:', error)
    return new Map()
  }
}
