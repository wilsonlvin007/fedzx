(function () {
  function getCmsBase() {
    return (window.FEDZX && window.FEDZX.getCmsBase ? window.FEDZX.getCmsBase() : window.location.origin).replace(
      /\/+$/,
      "",
    );
  }

  function getAssetBase() {
    var meta = document.querySelector('meta[name="fedzx-asset-base"]');
    var fromMeta = meta && meta.getAttribute("content");
    return (fromMeta && fromMeta.trim()) || "";
  }

  function mapTypeToSectionId(type) {
    if (type === "hero") return "home";
    if (type === "services") return "services";
    if (type === "analysis") return "analysis";
    if (type === "assets") return "assets";
    return null;
  }

  function rewriteRelativeAssets(rootEl, assetBase) {
    if (!assetBase) return;
    var base = assetBase.replace(/\/+$/, "");

    var imgs = rootEl.querySelectorAll("img[src]");
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var src = img.getAttribute("src") || "";
      if (src.startsWith("images/")) img.setAttribute("src", base + "/" + src);
      if (src.startsWith("./images/")) img.setAttribute("src", base + "/" + src.replace(/^\.\//, ""));
      if (src.startsWith("/images/")) img.setAttribute("src", base + src);
    }
  }

  async function load() {
    var base = getCmsBase().replace(/\/+$/, "");
    var assetBase = getAssetBase();
    var url = base + "/api/public/pages/home";

    try {
      var res = await fetch(url, { method: "GET", mode: "cors" });
      if (!res.ok) return;
      var data = await res.json();
      if (!data || !Array.isArray(data.modules)) return;

      for (var i = 0; i < data.modules.length; i++) {
        var m = data.modules[i];
        var sectionId = mapTypeToSectionId(m.type);
        if (!sectionId) continue;
        var section = document.getElementById(sectionId);
        if (!section) continue;

        var config = null;
        try {
          config = JSON.parse(m.config);
        } catch (_e) {
          config = null;
        }

        if (!config || typeof config.html !== "string") continue;
        // Parse HTML into a temp wrapper so we can rewrite relative assets before injecting.
        var wrapper = document.createElement("div");
        wrapper.innerHTML = config.html;
        rewriteRelativeAssets(wrapper, assetBase);
        section.innerHTML = wrapper.innerHTML;
      }

      if (typeof window.fedzxReinit === "function") {
        window.fedzxReinit();
      }
    } catch (_err) {
      // Silent fallback: keep the embedded static content.
    }
  }

  // Run as early as possible (script is `defer`, so it runs before DOMContentLoaded).
  load();
})();
