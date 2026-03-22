import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== process.env.AGENT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, slug, question, short_answer, summary, sources } = body
    const articleBody = body.body

    if (!title || !articleBody) {
      return NextResponse.json({ error: 'title 和 body 为必填项' }, { status: 400 })
    }

    const finalSlug = slug ||
      title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '')
      + '-' + Date.now()

    const article = await prisma.article.create({
      data: {
        title,
        slug: finalSlug,
        question: question || null,
        shortAnswer: short_answer || null,
        summary: summary || null,
        body: articleBody,
        sources: sources || null,
        status: 'DRAFT',
        createdById: 'cmmutco3000006ktwden2pnlc',
        updatedById: 'cmmutco3000006ktwden2pnlc',
        tags: '[]',
      },
    })

    return NextResponse.json({
      success: true,
      id: article.id,
      slug: article.slug,
      adminUrl: `https://cms.fedzx.com/admin/articles/${article.id}`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '创建失败' }, { status: 500 })
  }
}
