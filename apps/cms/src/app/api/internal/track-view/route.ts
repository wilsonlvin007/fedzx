import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { slug, source = 'direct' } = body

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 })
    }

    // 根据 slug 查找文章
    const article = await prisma.article.findUnique({
      where: { slug },
    })

    if (!article) {
      return NextResponse.json({ error: 'article not found' }, { status: 404 })
    }

    // 获取今天的日期
    const today = new Date().toISOString().split('T')[0]

    // 检查今天是否已有记录
    const existingMetric = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM article_metrics 
      WHERE article_id = ${article.id} AND date = ${today}
    `

    if (existingMetric && existingMetric.length > 0) {
      // 更新现有记录
      await prisma.$executeRaw`
        UPDATE article_metrics 
        SET views = views + 1 
        WHERE id = ${existingMetric[0].id}
      `
    } else {
      // 创建新记录
      await prisma.$executeRaw`
        INSERT INTO article_metrics (article_id, date, views, created_at)
        VALUES (${article.id}, ${today}, 1, datetime('now', 'localtime'))
      `
    }

    return NextResponse.json({ success: true, views: 1 })
  } catch (error: any) {
    console.error('Track view error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
