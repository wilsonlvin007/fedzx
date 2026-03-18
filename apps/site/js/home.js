(function () {
  function formatDate(iso) {
    try {
      return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(iso));
    } catch (_e) {
      return "";
    }
  }

  function getShortAnswer(a) {
    // Backward compatible: CMS may return `shortAnswer` (camelCase) or `short_answer` (snake_case).
    return a && (a.shortAnswer || a.short_answer || a.short_answer_text || "");
  }

  function getQuestion(a) {
    return a && (a.question || a.geoQuestion || a.geo_question || "");
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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderArticleCard(a) {
    var tags = safeParseTags(a.tags);
    var tag = tags.length ? tags[0] : "";
    var date = a.publishedAt ? formatDate(a.publishedAt) : "";
    var shortAnswer = getShortAnswer(a);
    var summary = a.summary || "";
    var keyTakeaway = shortAnswer || summary;
    var keyTakeawayHtml = keyTakeaway
      ? '<div class="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">' +
        '<div class="text-[11px] font-semibold text-gray-600">核心结论</div>' +
        '<div class="mt-1 text-sm font-semibold text-gray-900 leading-relaxed">' +
        escapeHtml(keyTakeaway) +
        "</div>" +
        "</div>"
      : "";

    return (
      '<a class="block rounded-2xl border border-gray-200 bg-white p-5 hover:bg-gray-50 transition-colors" href="/article.html?slug=' +
      encodeURIComponent(a.slug) +
      '">' +
      '<div class="flex items-start justify-between gap-4">' +
      '<div class="min-w-0">' +
      '<div class="text-base font-semibold text-gray-900 leading-snug">' +
      escapeHtml(a.title) +
      "</div>" +
      keyTakeawayHtml +
      '<div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">' +
      (tag ? '<span class="rounded-full bg-gray-100 px-2 py-1 text-gray-700">' + escapeHtml(tag) + "</span>" : "") +
      (date ? "<span>" + escapeHtml(date) + "</span>" : "") +
      "</div>" +
      "</div>" +
      "</div>" +
      "</a>"
    );
  }

  var latestEl = document.getElementById("home-latest");
  var featuredEl = document.getElementById("home-featured");
  var questionsEl = document.getElementById("home-questions");
  if (!latestEl || !featuredEl || !questionsEl) return;

  window.FEDZX.fetchJson("/api/public/articles")
    .then(function (data) {
      var items = (data && data.items) || [];
      items = items.slice().sort(function (a, b) {
        var da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        var db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      });

      var latest = items.slice(0, 10);
      var latestSlugs = {};
      for (var i = 0; i < latest.length; i++) latestSlugs[latest[i].slug] = true;

      // 热门问题：优先用 question 字段；没有就 fallback 用 title。
      var questions = latest
        .map(function (a) {
          return { slug: a.slug, q: getQuestion(a) || a.title || "" };
        })
        .filter(function (x) {
          return x.q && x.slug;
        })
        .slice(0, 5);

      questionsEl.innerHTML = questions.length
        ? questions
            .map(function (x) {
              return (
                '<a class="block rounded-2xl border border-gray-200 bg-white p-5 hover:bg-gray-50 transition-colors" href="/article.html?slug=' +
                encodeURIComponent(x.slug) +
                '">' +
                '<div class="text-xs font-semibold text-gray-500">问题</div>' +
                '<div class="mt-1 text-sm font-semibold text-gray-900 leading-relaxed">' +
                escapeHtml(x.q) +
                "</div>" +
                "</a>"
              );
            })
            .join("")
        : emptyState("暂无热门问题");

      // 分类统计：按 tag 计数（只统计已发布文章）。
      var counts = { "政策分析": 0, "资产配置": 0, "市场解读": 0 };
      for (var j = 0; j < items.length; j++) {
        var t = safeParseTags(items[j].tags);
        for (var k = 0; k < t.length; k++) {
          if (counts.hasOwnProperty(t[k])) counts[t[k]]++;
        }
      }
      var countEls = document.querySelectorAll("[data-home-tag-count]");
      for (var c = 0; c < countEls.length; c++) {
        var el = countEls[c];
        var key = el.getAttribute("data-home-tag-count");
        if (key && counts.hasOwnProperty(key)) el.textContent = String(counts[key]);
      }

      // 推荐文章：优先同 tag（取最新文章的第 1 个 tag），不足则随机补齐；不得与 latest 重复、也不得互相重复。
      var seedTag = "";
      if (latest.length) {
        var seedTags = safeParseTags(latest[0].tags);
        seedTag = seedTags.length ? seedTags[0] : "";
      }

      var pool = items.filter(function (x) {
        return x && x.slug && !latestSlugs[x.slug];
      });

      function shuffle(arr) {
        var a = arr.slice();
        for (var idx = a.length - 1; idx > 0; idx--) {
          var r = Math.floor(Math.random() * (idx + 1));
          var tmp = a[idx];
          a[idx] = a[r];
          a[r] = tmp;
        }
        return a;
      }

      var featured = [];
      var used = {};

      if (seedTag) {
        var sameTag = pool.filter(function (x) {
          var tags = safeParseTags(x.tags);
          return tags.indexOf(seedTag) !== -1;
        });
        sameTag = shuffle(sameTag);
        for (var s = 0; s < sameTag.length && featured.length < 3; s++) {
          var it = sameTag[s];
          if (used[it.slug]) continue;
          used[it.slug] = true;
          featured.push(it);
        }
      }

      if (featured.length < 3) {
        var rest = shuffle(pool);
        for (var rr = 0; rr < rest.length && featured.length < 3; rr++) {
          var it2 = rest[rr];
          if (used[it2.slug]) continue;
          used[it2.slug] = true;
          featured.push(it2);
        }
      }

      latestEl.innerHTML = latest.length ? latest.map(renderArticleCard).join("") : emptyState("暂无已发布文章");
      featuredEl.innerHTML = featured.length ? featured.map(renderArticleCard).join("") : emptyState("暂无推荐文章");
    })
    .catch(function () {
      latestEl.innerHTML = errorState("加载失败，请稍后再试");
      featuredEl.innerHTML = errorState("加载失败，请稍后再试");
      questionsEl.innerHTML = errorState("加载失败，请稍后再试");
    });

  function emptyState(text) {
    return '<div class="rounded-2xl border border-gray-200 bg-white p-5 text-gray-600">' + escapeHtml(text) + "</div>";
  }

  function errorState(text) {
    return '<div class="rounded-2xl border border-red-200 bg-white p-5 text-red-700">' + escapeHtml(text) + "</div>";
  }
})();
