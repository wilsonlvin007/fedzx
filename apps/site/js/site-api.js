(function () {
  function getCmsBase() {
    var meta = document.querySelector('meta[name="fedzx-cms-base"]');
    var fromMeta = meta && meta.getAttribute("content");
    if (fromMeta && fromMeta.trim()) return fromMeta.trim().replace(/\/+$/, "");

    var host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "http://localhost:3000";

    var root = host.replace(/^www\./, "");
    return "https://cms." + root;
  }

  async function fetchJson(path) {
    var base = getCmsBase();
    var url = base + path;
    var res = await fetch(url, { method: "GET", mode: "cors" });
    if (!res.ok) {
      var err = new Error("Request failed: " + res.status);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  window.FEDZX = window.FEDZX || {};
  window.FEDZX.getCmsBase = getCmsBase;
  window.FEDZX.fetchJson = fetchJson;
})();

