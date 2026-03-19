(function () {
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function qs(name) {
    var url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  var categoriesEl = document.getElementById("docs-categories");
  var itemsEl = document.getElementById("docs-items");
  var activeEl = document.getElementById("docs-active-category");
  if (!categoriesEl || !itemsEl) return;

  function renderCategories(data, activeCategory) {
    var html = "";
    for (var i = 0; i < data.length; i++) {
      var c = data[i];
      var isActive = c.category === activeCategory;
      html +=
        '<a class="' +
        (isActive
          ? "rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white"
          : "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50") +
        '" href="/docs/?category=' +
        encodeURIComponent(c.category) +
        '">' +
        escapeHtml(c.category) +
        '<span class="' +
        (isActive ? "ml-2 text-xs text-gray-200" : "ml-2 text-xs text-gray-500") +
        '">' +
        String((c.items || []).length) +
        "</span>" +
        "</a>";
    }
    categoriesEl.innerHTML = html || '<div class="text-sm text-gray-600">暂无分类</div>';
  }

  function renderItems(category) {
    var items = (category && category.items) || [];
    if (!items.length) {
      itemsEl.innerHTML = '<div class="text-sm text-gray-600">该分类暂无文档</div>';
      return;
    }
    itemsEl.innerHTML = items
      .map(function (it) {
        return (
          '<a class="block rounded-xl border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50" href="/docs/' +
          encodeURIComponent(it.slug) +
          '/">' +
          '<div class="text-sm font-semibold text-gray-900">' +
          escapeHtml(it.title || it.slug) +
          "</div>" +
          '<div class="mt-1 text-xs text-gray-500">/docs/' +
          escapeHtml(it.slug) +
          "</div>" +
          "</a>"
        );
      })
      .join("");
  }

  window.FEDZX.fetchJson("/api/internal/docs")
    .then(function (data) {
      var list = Array.isArray(data) ? data : [];
      var activeCategory = (qs("category") || (list[0] && list[0].category) || "").trim();
      var active = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i].category === activeCategory) {
          active = list[i];
          break;
        }
      }
      if (!active) active = list[0] || null;
      renderCategories(list, active ? active.category : "");
      if (activeEl) activeEl.textContent = active ? active.category : "";
      renderItems(active);
    })
    .catch(function () {
      categoriesEl.innerHTML = '<div class="text-sm text-red-700">加载失败</div>';
      itemsEl.innerHTML = '<div class="text-sm text-red-700">加载失败</div>';
    });
})();

