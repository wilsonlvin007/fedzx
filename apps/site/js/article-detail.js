(function () {
  function qs(name) {
    var url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function formatDateTime(iso) {
    try {
      return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
    } catch (_e) {
      return "";
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderBodyMarkdownAsPlainText(md) {
    // Phase 4 (beginner-friendly): render markdown as plain text (safe) with basic paragraph breaks.
    // Phase 4+ can upgrade to a markdown renderer if desired.
    var text = String(md || "");
    var parts = text.split(/\n{2,}/g).map(function (p) {
      return "<p>" + escapeHtml(p) + "</p>";
    });
    return parts.join("");
  }

  function safeParseTags(tags) {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags !== "string") return [];
    try {
      var v = JSON.parse(tags);
      return Array.isArray(v) ? v : [];
    } catch (_e) {
      return [];
    }
  }

  function getShortAnswer(item) {
    return item && (item.shortAnswer || item.short_answer || item.short_answer_text || "");
  }

  var slug = qs("slug");
  var loading = document.getElementById("article-loading");
  var header = document.getElementById("article-header");
  var title = document.getElementById("article-title");
  var date = document.getElementById("article-date");
  var slugEl = document.getElementById("article-slug");
  var shortAnswerWrap = document.getElementById("article-short-answer");
  var shortAnswerText = document.getElementById("article-short-answer-text");
  var body = document.getElementById("article-body");
  var tagsWrap = document.getElementById("article-tags");
  var tagsList = document.getElementById("article-tags-list");
  var relatedEl = document.getElementById("article-related");

  if (!slug) {
    if (loading) loading.textContent = "缺少 slug 参数";
    return;
  }

  function renderTagPills(tags) {
    if (!tagsWrap || !tagsList) return;
    if (!tags.length) return;
    tagsWrap.classList.remove("hidden");
    tagsList.innerHTML = tags
      .slice(0, 12)
      .map(function (t) {
        return '<span class="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">' + escapeHtml(t) + "</span>";
      })
      .join("");
  }

  function pickRandom(items, excludeSlug, count) {
    var pool = items.filter(function (x) {
      return x && x.slug && x.slug !== excludeSlug;
    });
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    return pool.slice(0, count);
  }

  function pickRelatedByTag(items, excludeSlug, tag, count) {
    var pool = items.filter(function (x) {
      return x && x.slug && x.slug !== excludeSlug;
    });

    function shuffle(arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
      }
      return a;
    }

    var picked = [];
    var used = {};

    if (tag) {
      var same = pool.filter(function (x) {
        var tags = safeParseTags(x.tags);
        return tags.indexOf(tag) !== -1;
      });
      same = shuffle(same);
      for (var s = 0; s < same.length && picked.length < count; s++) {
        if (used[same[s].slug]) continue;
        used[same[s].slug] = true;
        picked.push(same[s]);
      }
    }

    if (picked.length < count) {
      var rest = shuffle(pool);
      for (var r = 0; r < rest.length && picked.length < count; r++) {
        if (used[rest[r].slug]) continue;
        used[rest[r].slug] = true;
        picked.push(rest[r]);
      }
    }

    return picked;
  }

  function renderRelated(items) {
    if (!relatedEl) return;
    if (!items.length) {
      relatedEl.innerHTML = '<div class="rounded-2xl border border-gray-200 bg-white p-5 text-gray-600">暂无相关推荐</div>';
      return;
    }
    relatedEl.innerHTML = items
      .map(function (a) {
        var d = a.publishedAt ? formatDateTime(a.publishedAt) : "";
        return (
          '<a class="block rounded-2xl border border-gray-200 bg-white p-5 hover:bg-gray-50 transition-colors" href="/article.html?slug=' +
          encodeURIComponent(a.slug) +
          '">' +
          '<div class="text-sm font-semibold text-gray-900">' +
          escapeHtml(a.title) +
          "</div>" +
          (d ? '<div class="mt-2 text-xs text-gray-500">' + escapeHtml(d) + "</div>" : "") +
          "</a>"
        );
      })
      .join("");
  }

  window.FEDZX.fetchJson("/api/public/articles/" + encodeURIComponent(slug))
    .then(function (data) {
      var item = data && data.item;
      if (!item) throw new Error("not found");

      if (loading) loading.classList.add("hidden");
      if (header) header.classList.remove("hidden");

      document.title = (item.title || "文章") + " - 联储资讯";

      if (title) title.textContent = item.title || "";
      if (date) date.textContent = item.publishedAt ? formatDateTime(item.publishedAt) : "";
      if (slugEl) slugEl.textContent = item.slug || "";
      var sa = getShortAnswer(item) || item.summary || "";
      if (shortAnswerWrap && shortAnswerText && sa) {
        shortAnswerWrap.classList.remove("hidden");
        shortAnswerText.textContent = sa;
      }

      if (body) body.innerHTML = renderBodyMarkdownAsPlainText(item.body);

      var itemTags = safeParseTags(item.tags);
      renderTagPills(itemTags);

      // related
      if (relatedEl) {
        window.FEDZX.fetchJson("/api/public/articles")
          .then(function (list) {
            var all = (list && list.items) || [];
            var seedTag = itemTags.length ? itemTags[0] : "";
            renderRelated(pickRelatedByTag(all, item.slug, seedTag, 3));
          })
          .catch(function () {
            relatedEl.innerHTML = '<div class="rounded-2xl border border-gray-200 bg-white p-5 text-gray-600">加载失败</div>';
          });
      }
    })
    .catch(function () {
      if (loading) loading.textContent = "文章不存在或尚未发布";
    });
})();
