(function () {
  function qs(name) {
    var url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function formatDate(iso) {
    try {
      return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(iso));
    } catch (_e) {
      return "";
    }
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

  function getShortAnswer(a) {
    return a && (a.shortAnswer || a.short_answer || a.short_answer_text || "");
  }

  function renderList(container, items) {
    if (!items.length) {
      container.innerHTML = '<div class="rounded-2xl border border-gray-200 bg-white p-5 text-gray-600">暂无已发布文章</div>';
      return;
    }

    var html = "";
    for (var i = 0; i < items.length; i++) {
      var a = items[i];
      var tags = safeParseTags(a.tags);
      var tagsHtml = tags
        .slice(0, 6)
        .map(function (t) {
          return '<span class="rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 text-xs">' + String(t) + "</span>";
        })
        .join("");

      var date = a.publishedAt ? formatDate(a.publishedAt) : "";
      var shortAnswer = getShortAnswer(a);
      var keyTakeaway = shortAnswer || a.summary || "";

      html +=
        '<a class="block rounded-2xl border border-gray-200 bg-white p-6 hover:bg-gray-50 transition-colors" href="/article.html?slug=' +
        encodeURIComponent(a.slug) +
        '">' +
        '<div class="flex items-start justify-between gap-4">' +
        '<div>' +
        '<div class="text-xl font-semibold text-gray-900">' +
        escapeHtml(a.title) +
        "</div>" +
        (keyTakeaway
          ? '<div class="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">' +
            '<div class="text-[11px] font-semibold text-gray-600">核心结论</div>' +
            '<div class="mt-1 text-sm font-semibold text-gray-900 leading-relaxed">' +
            escapeHtml(keyTakeaway) +
            "</div>" +
            "</div>"
          : "") +
        '<div class="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">' +
        (date ? '<span>' + date + "</span>" : "") +
        '<span class="font-mono text-xs text-gray-400">' +
        escapeHtml(a.slug) +
        "</span>" +
        "</div>" +
        (tagsHtml ? '<div class="mt-4 flex flex-wrap gap-2">' + tagsHtml + "</div>" : "") +
        "</div>" +
        "</div>" +
        "</a>";
    }
    container.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  var container = document.getElementById("articles-list");
  var search = document.getElementById("articles-search");
  if (!container) return;

  var tagFilter = (qs("tag") || "").trim();
  var tagWrap = document.getElementById("articles-tag-filter");
  var tagValue = document.getElementById("articles-tag-filter-value");
  if (tagFilter && tagWrap && tagValue) {
    tagWrap.classList.remove("hidden");
    tagValue.textContent = tagFilter;
    document.title = "标签：" + tagFilter + " - 联储资讯";
  }

  var all = [];
  function applyFilter() {
    var q = (search && search.value ? search.value : "").trim().toLowerCase();
    var filtered = all;

    if (tagFilter) {
      filtered = filtered.filter(function (a) {
        var tags = safeParseTags(a.tags);
        return tags.indexOf(tagFilter) !== -1;
      });
    }

    if (q) {
      filtered = filtered.filter(function (a) {
        var t = (a.title || "").toLowerCase();
        var s = (a.summary || "").toLowerCase();
        var sa = (getShortAnswer(a) || "").toLowerCase();
        return t.indexOf(q) !== -1 || s.indexOf(q) !== -1 || sa.indexOf(q) !== -1;
      });
    }

    renderList(container, filtered);
  }

  window.FEDZX.fetchJson("/api/public/articles")
    .then(function (data) {
      all = (data && data.items) || [];
      applyFilter();
    })
    .catch(function () {
      container.innerHTML =
        '<div class="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">加载失败，请稍后再试</div>';
    });

  if (search) {
    search.addEventListener("input", function () {
      applyFilter();
    });
  }
})();
