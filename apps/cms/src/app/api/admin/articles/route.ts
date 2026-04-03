import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 批量删除文章
 * DELETE /api/admin/articles?ids=xxx,yyy,zzz
 */
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawIds = searchParams.get("ids");
  if (!rawIds) {
    return NextResponse.json({ error: "缺少 ids 参数" }, { status: 400 });
  }

  const ids = rawIds.split(",").filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids 不能为空" }, { status: 400 });
  }

  if (ids.length > 100) {
    return NextResponse.json({ error: "单次最多删除 100 篇" }, { status: 400 });
  }

  try {
    // 先查出要删除的文章（用于审计日志）
    const articles = await prisma.article.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, slug: true },
    });

    const foundIds = articles.map((a) => a.id);
    const missingIds = ids.filter((id) => !foundIds.includes(id));

    // 批量删除（ArticleTag 通过 onDelete: Cascade 自动清理）
    const result = await prisma.article.deleteMany({
      where: { id: { in: foundIds } },
    });

    // 写审计日志
    await prisma.auditLog.createMany({
      data: articles.map((a) => ({
        actorId: user.id,
        action: "DELETE",
        entityType: "Article",
        entityId: a.id,
        diff: JSON.stringify({ title: a.title, slug: a.slug }),
      })),
    });

    // 触发静态站重新导出
    try {
      const { exportPublicSite } = await import("@/lib/public-export");
      await exportPublicSite();
    } catch {
      // 导出失败不影响删除结果
    }

    return NextResponse.json({
      success: true,
      deleted: result.count,
      missing: missingIds.length > 0 ? missingIds : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}
