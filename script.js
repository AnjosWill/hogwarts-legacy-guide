// Namespace global para internacionalização do guia
window.HL_I18N = {
  meta: {
    defaultLanguage: "en-US",
    supportedLanguages: ["en-US", "pt-BR"],
  },
  current: "en-US",
  byKey: {},
  byOriginal: {},
  raw: null,
  bindings: [], // lista de nós vinculados automaticamente (elemento + chave)
};

/**
 * Função helper para obter tradução de uma chave.
 */
function t(key, fallback) {
  var hl = window.HL_I18N;
  if (!hl || !hl.byKey) return fallback || key;
  var entry = hl.byKey[key];
  if (!entry) return fallback || key;
  var langCode = hl.current || (hl.meta && hl.meta.defaultLanguage) || "en-US";
  return entry[langCode] || entry["en-US"] || fallback || key;
}

// ========================
// Sidebar Resize & Persistence (refactored/concise)
// ========================
(function () {
  "use strict";
  // ... (rest of this IIFE unchanged)
})();

// Inicializa listeners e carrega o arquivo de i18n após o DOM estar pronto
/**
 * Carrega o dicionário de i18n (compact implementation).
 */
async function initI18nFromJSON() {
  try {
    var response = await fetch("hogwarts-legacy-i18n.json", {
      cache: "no-store",
    });
    if (!response.ok) {
      console.warn(
        "[HL_I18N] Failed to load hogwarts-legacy-i18n.json:",
        response.status
      );
      return;
    }
    var data = await response.json();
    var hl = window.HL_I18N;
    hl.raw = data;
    if (data.byKey) {
      hl.byKey = data.byKey;
      hl.byOriginal = data.byOriginal || {};
      if (data.meta) hl.meta = Object.assign({}, hl.meta, data.meta);
    } else {
      hl.byKey = {};
      Object.keys(data).forEach(function (k) {
        if (k === "meta") return;
        var entry = data[k];
        if (entry && typeof entry === "object") hl.byKey[k] = entry;
      });
      hl.byOriginal = {};
    }

    var targetLanguage = null;
    try {
      targetLanguage = localStorage.getItem("hogwartsLegacyGuide_language_v1");
    } catch (e) {}
    if (!targetLanguage)
      targetLanguage =
        hl.meta && hl.meta.defaultLanguage
          ? hl.meta.defaultLanguage
          : hl.current || "en-US";

    applyLanguage(targetLanguage);

    document.dispatchEvent(new CustomEvent("HL_I18N_READY"));

    var loadingText = document.querySelector(".loading-text");
    if (loadingText) loadingText.textContent = t("loading_text", "Loading...");
    console.log(
      "[HL_I18N] Loaded i18n data with",
      Object.keys(hl.byKey).length,
      "entries."
    );
    // Hide loading overlay after successful init
    try {
      var loadingOverlay = document.getElementById("loading-overlay");
      if (loadingOverlay) {
        loadingOverlay.classList.add("hidden");
        setTimeout(function () {
          loadingOverlay.style.display = "none";
        }, 500);
      }
    } catch (e) {}
  } catch (err) {
    console.error("[HL_I18N] Error loading i18n file:", err);
    var loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
      loadingOverlay.classList.add("hidden");
      setTimeout(function () {
        loadingOverlay.style.display = "none";
      }, 500);
    }
  }
}

/**
 * Aplica idioma atual aos elementos com `data-i18n` (compact implementation).
 */
function applyLanguage(langCode) {
  var hl = window.HL_I18N;
  if (!hl || !hl.byKey) return;

  var supported =
    hl.meta && hl.meta.supportedLanguages
      ? hl.meta.supportedLanguages
      : ["en-US"];
  var defaultLang =
    hl.meta && hl.meta.defaultLanguage ? hl.meta.defaultLanguage : "en-US";
  if (supported.indexOf(langCode) === -1) langCode = defaultLang;
  hl.current = langCode;
  try {
    localStorage.setItem("hogwartsLegacyGuide_language_v1", langCode);
  } catch (e) {}

  var elements = document.querySelectorAll("[data-i18n]");
  elements.forEach(function (el) {
    var key = el.getAttribute("data-i18n");
    if (!key) return;
    // Templates como "{done} / {total}" são usados apenas via JS, não devem ser aplicados diretamente no DOM
    if (key === "overall_summary_template" || key === "session_meta_template") {
      return;
    }
    var entry = (hl.byKey && hl.byKey[key]) || (hl.raw && hl.raw[key]);
    if (!entry) return;
    var value =
      typeof entry === "string"
        ? entry
        : entry[langCode] || entry["en-US"] || "";
    if (!value) return;
    if (el.childElementCount === 0) {
      el.textContent = value;
      return;
    }
    var textNode = null;
    for (var i = 0; i < el.childNodes.length; i++) {
      var node = el.childNodes[i];
      if (
        node.nodeType === Node.TEXT_NODE &&
        node.textContent.trim().length > 0
      ) {
        textNode = node;
        break;
      }
    }
    if (textNode) {
      textNode.textContent = value;
      return;
    }
    var fallbackTarget = null;
    for (var j = 0; j < el.childNodes.length; j++) {
      var node2 = el.childNodes[j];
      if (
        node2.nodeType === Node.ELEMENT_NODE &&
        node2.childElementCount === 0
      ) {
        fallbackTarget = node2;
        break;
      }
    }
    if (fallbackTarget) {
      fallbackTarget.textContent = value;
      return;
    }
  });

  // update UI language state
  var langButtons = document.querySelectorAll("[data-lang-toggle]");
  langButtons.forEach(function (btn) {
    btn.classList.toggle(
      "lang-active",
      btn.getAttribute("data-lang-toggle") === langCode
    );
  });

  document.dispatchEvent(
    new CustomEvent("HL_I18N_LANGUAGE_CHANGED", { detail: { lang: langCode } })
  );
}
document.addEventListener("DOMContentLoaded", function () {
  // Liga os botões de escolha de idioma
  var langButtons = document.querySelectorAll("[data-lang-toggle]");
  langButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var lang = btn.getAttribute("data-lang-toggle");
      applyLanguage(lang);
    });
  });

  // Carrega o dicionário de tradução
  initI18nFromJSON();
});

// ========================
// Código principal (aplicação)
// ========================
(function () {
  "use strict";

  const STORAGE_KEY = "hogwartsLegacyGuide_progress_v40";

  // Segurança para localStorage (modo privado, etc.)
  const safeStorage = (function () {
    try {
      const testKey = "__hlg_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    } catch (e) {
      return null;
    }
  })();

  function loadState() {
    if (!safeStorage) return { version: 1, items: {} };
    try {
      const raw = safeStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: 1, items: {} };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object")
        return { version: 1, items: {} };
      if (!parsed.items || typeof parsed.items !== "object") parsed.items = {};
      return parsed;
    } catch (e) {
      return { version: 1, items: {} };
    }
  }

  function saveState(state) {
    if (!safeStorage) return;
    try {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // silencioso
    }
  }

  // Estruturas compartilhadas para dashboard e subseções
  let dashboardEntries = {};
  const sessionSubsections = new Map();

  // Atualiza estado quando checkbox muda
  function syncCheckboxState(cb, stateObj) {
    const id = cb.dataset.itemId;
    if (!id) return;
    stateObj.items[id] = !!cb.checked;
  }

  // Função principal de recálculo
  function recomputeAllProgress(sections, allCbs) {
    const overallSummaryEl = document.getElementById("overall-summary-line");
    const overallPercentEl = document.getElementById("overall-percent");
    const overallBarEl = document.getElementById("overall-bar");

    const total = allCbs.length;
    const done = allCbs.filter(function (cb) {
      return cb.checked;
    }).length;
    const overallPct = total ? Math.round((done * 100) / total) : 0;

    if (overallSummaryEl) {
      const template = t(
        "overall_summary_template",
        "{done} of {total} items completed"
      );
      overallSummaryEl.textContent = template
        .replace("{done}", String(done))
        .replace("{total}", String(total));
    }
    if (overallPercentEl) overallPercentEl.textContent = overallPct + "%";
    if (overallBarEl) overallBarEl.style.width = overallPct + "%";

    // Por sessão + inline title
    sections.forEach(function (section) {
      const title = section.querySelector("h2.section-title[id]");
      if (!title) return;
      const id = title.id;
      const boxes = Array.from(section.querySelectorAll(".check-toggle"));
      const tot = boxes.length;
      const doneSess = boxes.filter(function (cb) {
        return cb.checked;
      }).length;
      const pct = tot ? Math.round((doneSess * 100) / tot) : 0;

      const inline = title.querySelector(".session-inline-progress");
      if (inline) {
        const percEl = inline.querySelector(".session-inline-percent");
        const barFill = inline.querySelector(".session-inline-bar-fill");
        if (percEl) percEl.textContent = pct + "%";
        if (barFill) barFill.style.width = pct + "%";
      }

      const dashEntry = dashboardEntries[id];
      if (dashEntry) {
        dashEntry.percentEl.textContent = pct + "%";
        dashEntry.barFillEl.style.width = pct + "%";
        const sessionTemplate = t(
          "session_meta_template",
          "{done} of {total} items completed"
        );
        dashEntry.metaEl.textContent = sessionTemplate
          .replace("{done}", String(doneSess))
          .replace("{total}", String(tot));
      }

      // Subsessões (regiões / grupos)
      const subs = sessionSubsections.get(section) || [];
      subs.forEach(function (sub) {
        let boxes = sub.checkboxes.slice();
        const headerEl = sub.headerEl;

        // Se a subseção não tem itens próprios, ela pode ser "mãe"
        if (!boxes.length) {
          if (headerEl.classList.contains("region-header")) {
            for (let j = 0; j < subs.length; j++) {
              const childSub = subs[j];
              const childHeader = childSub.headerEl;
              if (childHeader.classList.contains("region-header")) break;
              boxes = boxes.concat(childSub.checkboxes);
            }
          } else if (headerEl.classList.contains("group-header")) {
            for (let j = 0; j < subs.length; j++) {
              const childSub = subs[j];
              const childHeader = childSub.headerEl;
              if (childHeader.classList.contains("group-header")) break;
              boxes = boxes.concat(childSub.checkboxes);
            }
          }
        }

        const totalSub = boxes.length;
        const doneSub = boxes.filter(function (cb) {
          return cb.checked;
        }).length;
        const subPct = totalSub ? Math.round((doneSub * 100) / totalSub) : 0;

        const inlineSub = headerEl.querySelector(".sub-inline-progress");
        if (inlineSub) {
          const pEl = inlineSub.querySelector(".sub-inline-percent");
          const bFill = inlineSub.querySelector(".sub-inline-bar-fill");
          if (pEl) pEl.textContent = subPct + "%";
          if (bFill) bFill.style.width = subPct + "%";
        }
      });
    });
  }

  // Cria inline progress para headers de região / grupo
  function computeSubsections(section) {
    const checklist = section.querySelector(".checklist");
    if (!checklist) return [];

    const items = Array.from(checklist.children);
    const subs = [];
    let current = null;

    items.forEach(function (li) {
      if (
        li.classList &&
        (li.classList.contains("region-header") ||
          li.classList.contains("group-header"))
      ) {
        current = { headerEl: li, checkboxes: [] };
        subs.push(current);

        if (!li.querySelector(".sub-inline-progress")) {
          const span = document.createElement("span");
          span.className = "sub-inline-progress";

          const perc = document.createElement("span");
          perc.className = "sub-inline-percent";
          perc.textContent = "0%";

          const bar = document.createElement("span");
          bar.className = "sub-inline-bar";
          const barFill = document.createElement("span");
          barFill.className = "sub-inline-bar-fill";
          bar.appendChild(barFill);

          span.appendChild(perc);
          span.appendChild(bar);
          li.appendChild(span);
        }
      } else if (
        current &&
        li.querySelector &&
        li.querySelector(".check-toggle")
      ) {
        const cb = li.querySelector(".check-toggle");
        if (cb) current.checkboxes.push(cb);
      }
    });

    return subs;
  }

  // Helper para mensagens de import/export
  function setStatus(msg, isError) {
    const importStatus = document.getElementById("import-status");
    if (!importStatus) return;
    importStatus.textContent = msg || "";
    importStatus.style.color = isError ? "#ffb4a5" : "var(--text-muted)";
  }

  // ========================
  // Global Search (floating button)
  // ========================
  const globalSearchState = {
    entries: [],
    matches: [],
    currentIndex: -1,
    lastQuery: "",
    allCheckboxes: null,
    ui: null,
  };

  function buildGlobalSearchIndex(allCheckboxes) {
    globalSearchState.entries = [];
    globalSearchState.allCheckboxes = allCheckboxes;
    if (!Array.isArray(allCheckboxes)) return;

    allCheckboxes.forEach(function (cb) {
      const row = cb.closest(".check-row");
      if (!row) return;
      const txt = (row.textContent || "").trim().toLowerCase();
      if (!txt) return;
      globalSearchState.entries.push({
        checkbox: cb,
        row: row,
        text: txt,
      });
    });
  }

  function ensureEntryVisible(entry) {
    if (!entry || !entry.row) return;
    const row = entry.row;

    // Expande seção principal se estiver colapsada
    const section = row.closest(".section");
    if (section) {
      section.classList.remove("is-collapsed");
      const title = section.querySelector("h2.section-title");
      if (title) title.setAttribute("aria-expanded", "true");
    }

    // Expande subseção (region-header / group-header) se necessário
    const li = row.closest("li");
    if (li) {
      let prev = li.previousElementSibling;
      while (prev) {
        if (
          prev.classList.contains("region-header") ||
          prev.classList.contains("group-header")
        ) {
          prev.classList.remove("is-collapsed");
          // Garante que todos os itens abaixo desse header fiquem visíveis
          let sib = prev.nextElementSibling;
          while (
            sib &&
            sib.tagName === "LI" &&
            !sib.classList.contains("region-header") &&
            !sib.classList.contains("group-header")
          ) {
            sib.classList.remove("checklist-item-hidden");
            sib = sib.nextElementSibling;
          }
          break;
        }
        prev = prev.previousElementSibling;
      }
    }

    // Rola até o item
    row.scrollIntoView({ behavior: "smooth", block: "center" });

    // Foca o checkbox sem alterar o scroll
    if (entry.checkbox && typeof entry.checkbox.focus === "function") {
      setTimeout(function () {
        try {
          entry.checkbox.focus({ preventScroll: true });
        } catch (e) {
          entry.checkbox.focus();
        }
      }, 250);
    }
  }

  function clearGlobalSearchHighlights() {
    globalSearchState.entries.forEach(function (entry) {
      entry.row.classList.remove("hl-search-match", "hl-search-current");
    });
  }

  function updateGlobalSearchCountLabel() {
    if (!globalSearchState.ui) return;
    var countEl = globalSearchState.ui.count;
    if (!countEl) return;

    var total = globalSearchState.matches.length;
    if (!total) {
      countEl.textContent = "0/0";
      return;
    }
    var idx = globalSearchState.currentIndex >= 0 ? globalSearchState.currentIndex + 1 : 0;
    countEl.textContent = idx + "/" + total;
  }

  function applyGlobalSearchHighlights(options) {
    options = options || {};
    var autoScroll = !!options.autoScroll;

    clearGlobalSearchHighlights();
    if (!globalSearchState.matches.length) {
      updateGlobalSearchCountLabel();
      return;
    }
    // Marca todos os matches
    globalSearchState.matches.forEach(function (entryIndex) {
      var entry = globalSearchState.entries[entryIndex];
      if (entry && entry.row) {
        entry.row.classList.add("hl-search-match");
      }
    });
    // Destaca o atual
    if (globalSearchState.currentIndex >= 0) {
      var currentEntry =
        globalSearchState.entries[globalSearchState.matches[globalSearchState.currentIndex]];
      if (currentEntry && currentEntry.row) {
        currentEntry.row.classList.add("hl-search-current");
        if (autoScroll) {
          ensureEntryVisible(currentEntry);
        }
      }
    }
    updateGlobalSearchCountLabel();
  }

  function performGlobalSearch(query, options) {
    options = options || {};
    var autoScroll = !!options.autoScroll;

    globalSearchState.lastQuery = query;
    globalSearchState.matches = [];
    globalSearchState.currentIndex = -1;

    var q = (query || "").trim().toLowerCase();
    clearGlobalSearchHighlights();

    if (!q) {
      updateGlobalSearchCountLabel();
      return;
    }

    globalSearchState.entries.forEach(function (entry, index) {
      if (entry.text.indexOf(q) !== -1) {
        globalSearchState.matches.push(index);
      }
    });

    if (!globalSearchState.matches.length) {
      updateGlobalSearchCountLabel();
      return;
    }

    globalSearchState.currentIndex = 0;
    applyGlobalSearchHighlights({ autoScroll: autoScroll });
  }

  function stepGlobalSearch(offset) {
    if (!globalSearchState.matches.length) return;
    var len = globalSearchState.matches.length;
    var current = globalSearchState.currentIndex;
    if (current < 0) current = 0;
    current = (current + offset + len) % len;
    globalSearchState.currentIndex = current;
    applyGlobalSearchHighlights({ autoScroll: true });
  }

  function setupGlobalSearch(allCheckboxes) {
    buildGlobalSearchIndex(allCheckboxes);

    if (globalSearchState.ui && globalSearchState.ui.btn) {
      // já inicializado
      return;
    }

    var btn = document.createElement("button");
    btn.id = "hl-global-search-btn";
    btn.className = "hl-global-search-btn";
    btn.type = "button";
    btn.title = t("global_search_title", "Search in checklist");
    btn.textContent = "\ud83d\udd0e";

    var panel = document.createElement("div");
    panel.id = "hl-global-search-panel";
    panel.className = "hl-global-search-panel";
    panel.style.display = "none";

    panel.innerHTML =
      '<div class="hl-global-search-inner">' +
      '<input type="text" id="hl-global-search-input" class="hl-global-search-input" placeholder="' +
      t("global_search_placeholder", "Search items...") +
      '" />' +
      '<span id="hl-global-search-count" class="hl-global-search-count">0/0</span>' +
      '<button type="button" id="hl-global-search-prev" class="hl-global-search-nav">\u2191</button>' +
      '<button type="button" id="hl-global-search-next" class="hl-global-search-nav">\u2193</button>' +
      '<button type="button" id="hl-global-search-close" class="hl-global-search-close">&times;</button>' +
      "</div>";

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    var input = panel.querySelector("#hl-global-search-input");
    var count = panel.querySelector("#hl-global-search-count");
    var prevBtn = panel.querySelector("#hl-global-search-prev");
    var nextBtn = panel.querySelector("#hl-global-search-next");
    var closeBtn = panel.querySelector("#hl-global-search-close");

    globalSearchState.ui = {
      btn: btn,
      panel: panel,
      input: input,
      count: count,
      prevBtn: prevBtn,
      nextBtn: nextBtn,
      closeBtn: closeBtn,
    };

    function openPanel() {
      panel.style.display = "block";
      if (globalSearchState.lastQuery) {
        input.value = globalSearchState.lastQuery;
        performGlobalSearch(globalSearchState.lastQuery, { autoScroll: false });
      } else {
        clearGlobalSearchHighlights();
        updateGlobalSearchCountLabel();
      }
      setTimeout(function () {
        input.focus();
        input.select();
      }, 10);
    }

    function closePanel() {
      panel.style.display = "none";
    }

    btn.addEventListener("click", function () {
      if (panel.style.display === "none" || panel.style.display === "") {
        openPanel();
      } else {
        closePanel();
      }
    });

    input.addEventListener("input", function () {
      performGlobalSearch(this.value || "", { autoScroll: false });
    });

    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        if (!globalSearchState.matches.length) return;
        stepGlobalSearch(1);
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        closePanel();
      }
    });

    prevBtn.addEventListener("click", function () {
      stepGlobalSearch(-1);
    });

    nextBtn.addEventListener("click", function () {
      stepGlobalSearch(1);
    });

    closeBtn.addEventListener("click", function () {
      closePanel();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    const allCheckboxes = Array.from(
      document.querySelectorAll(".check-toggle")
    );
    if (!allCheckboxes.length) return;

    // Expor globalmente para integração com i18n
    window.allCheckboxes = allCheckboxes;

    // Evita que o checkbox roube o foco e cause ajustes de scroll
    allCheckboxes.forEach(function (cb) {
      cb.addEventListener("mousedown", function (ev) {
        ev.preventDefault();
      });
    });

    // Garante IDs estáveis por índice (enquanto a ordem do HTML não mudar)
    allCheckboxes.forEach(function (cb, index) {
      if (!cb.dataset.itemId) cb.dataset.itemId = "item-" + index;
    });

    const state = loadState();

    // Aplica estado salvo
    allCheckboxes.forEach(function (cb) {
      const id = cb.dataset.itemId;
      if (id && Object.prototype.hasOwnProperty.call(state.items, id))
        cb.checked = !!state.items[id];
    });

    // Sessões: cada .section com h2.section-title[id] e .checklist
    const sessionSections = Array.from(
      document.querySelectorAll(".section")
    ).filter(function (sec) {
      return (
        !!sec.querySelector("h2.section-title[id]") &&
        !!sec.querySelector(".checklist")
      );
    });

    // Expor globalmente para integração com i18n
    window.sessionSections = sessionSections;

    // Cria inline progress nos títulos e ações "marcar tudo" / "desmarcar tudo"
    sessionSections.forEach(function (section) {
      const title = section.querySelector("h2.section-title[id]");
      if (!title) return;

      if (!title.querySelector(".session-inline-progress")) {
        const inline = document.createElement("span");
        inline.className = "session-inline-progress";

        const percentSpan = document.createElement("span");
        percentSpan.className = "session-inline-percent";
        percentSpan.textContent = "0%";

        const bar = document.createElement("span");
        bar.className = "session-inline-bar";

        const barFill = document.createElement("span");
        barFill.className = "session-inline-bar-fill";

        bar.appendChild(barFill);
        inline.appendChild(percentSpan);
        inline.appendChild(bar);

        title.appendChild(inline);
      }

      // Ações "Marcar tudo / Desmarcar tudo"
      let actions = section.querySelector(".section-actions");
      if (!actions) {
        actions = document.createElement("div");
        actions.className = "section-actions";
        const intro = section.querySelector(".section-intro") || title;
        intro.insertAdjacentElement("afterend", actions);
      }

      const btnMarkAll = document.createElement("button");
      btnMarkAll.type = "button";
      btnMarkAll.className = "btn-small";
      btnMarkAll.setAttribute("data-i18n", "btn_mark_all");
      btnMarkAll.textContent = t("btn_mark_all", "✔ Mark all");

      const btnUnmarkAll = document.createElement("button");
      btnUnmarkAll.type = "button";
      btnUnmarkAll.className = "btn-small btn-small-secondary";
      btnUnmarkAll.setAttribute("data-i18n", "btn_unmark_all");
      btnUnmarkAll.textContent = t("btn_unmark_all", "✖ Unmark all");

      actions.appendChild(btnMarkAll);
      actions.appendChild(btnUnmarkAll);

      btnMarkAll.addEventListener("click", function () {
        const boxes = Array.from(section.querySelectorAll(".check-toggle"));
        boxes.forEach(function (cb) {
          if (!cb.checked) {
            cb.checked = true;
            syncCheckboxState(cb, state);
          }
        });
        saveState(state);
        recomputeAllProgress(sessionSections, allCheckboxes);
      });

      btnUnmarkAll.addEventListener("click", function () {
        const boxes = Array.from(section.querySelectorAll(".check-toggle"));
        boxes.forEach(function (cb) {
          if (cb.checked) {
            cb.checked = false;
            syncCheckboxState(cb, state);
          }
        });
        saveState(state);
        recomputeAllProgress(sessionSections, allCheckboxes);
      });
    });

    // Prepara dashboard: cria linhas por sessão
    const dashboardList = document.getElementById("dashboard-sessions");
    dashboardEntries = {};

    if (dashboardList) {
      dashboardList.innerHTML = "";
      sessionSections.forEach(function (section) {
        const title = section.querySelector("h2.section-title[id]");
        if (!title) return;
        const id = title.id;
        const name = title.childNodes[0].textContent
          .replace(/\s*\d+\.\s*/, "")
          .trim();

        const row = document.createElement("div");
        row.className = "dashboard-session";
        row.dataset.sessionId = id;

        const header = document.createElement("div");
        header.className = "dashboard-session-header";

        const nameSpan = document.createElement("div");
        nameSpan.className = "dashboard-session-name";
        const link = document.createElement("a");
        link.href = "#" + id;
        link.textContent = name;
        nameSpan.appendChild(link);

        const percent = document.createElement("div");
        percent.className = "dashboard-session-percent";
        percent.textContent = "0%";

        header.appendChild(nameSpan);
        header.appendChild(percent);

        const bar = document.createElement("div");
        bar.className = "dashboard-session-bar";

        const barFill = document.createElement("div");
        barFill.className = "dashboard-session-bar-fill";
        bar.appendChild(barFill);

        const meta = document.createElement("div");
        meta.className = "dashboard-session-meta";
        meta.textContent =
          "0 " + t("items_completed", "items completed") + " 0";

        row.appendChild(header);
        row.appendChild(bar);
        row.appendChild(meta);

        dashboardList.appendChild(row);

        dashboardEntries[id] = {
          percentEl: percent,
          barFillEl: barFill,
          metaEl: meta,
        };
      });
    }

    // Subsessões por seção
    sessionSubsections.clear();
    sessionSections.forEach(function (section) {
      sessionSubsections.set(section, computeSubsections(section));
    });

    // Observa mudanças nos checkboxes para salvar estado e recalcular progresso
    allCheckboxes.forEach(function (cb) {
      cb.addEventListener("change", function () {
        syncCheckboxState(cb, state);
        saveState(state);
        recomputeAllProgress(sessionSections, allCheckboxes);
      });
    });

    // Exportar / Importar JSON
    const exportBtn = document.getElementById("export-progress");
    const importBtn = document.getElementById("import-progress");
    const importFile = document.getElementById("import-file");

    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        const data = loadState(); // pega o estado atual salvo
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "hogwarts_legacy_progress.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus(
          t("status_export_progress", "Progress exported (JSON downloaded)."),
          false
        );
      });
    }

    if (importBtn && importFile) {
      importBtn.addEventListener("click", function () {
        setStatus("", false);
        importFile.value = "";
        importFile.click();
      });

      importFile.addEventListener("change", function () {
        const file = importFile.files && importFile.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
          try {
            const json = JSON.parse(String(e.target.result));
            if (!json || typeof json !== "object" || !json.items) {
              setStatus(
                t("status_invalid_file", "Invalid file: unexpected format."),
                true
              );
              return;
            }

            // substitui estado
            const newState = {
              version: json.version || 1,
              items: json.items || {},
            };

            // aplica nos checkboxes
            allCheckboxes.forEach(function (cb) {
              const id = cb.dataset.itemId;
              if (!id) return;
              if (Object.prototype.hasOwnProperty.call(newState.items, id)) {
                cb.checked = !!newState.items[id];
              }
            });

            saveState(newState);
            // também atualiza objeto state em memória
            state.version = newState.version;
            state.items = newState.items;

            recomputeAllProgress(sessionSections, allCheckboxes);
            setStatus(
              t("status_import_success", "Progresso importado com sucesso."),
              false
            );
          } catch (err) {
            setStatus(
              t("status_import_error", "Error reading JSON file."),
              true
            );
          }
        };
        reader.readAsText(file);
      });
    }

    // 1. Criar corpos de seção colapsáveis
    const sections = Array.from(document.querySelectorAll(".section"));

    sections.forEach(function (section) {
      const title = section.querySelector("h2.section-title");
      if (!title) return;

      // Criar / encontrar container de conteúdo da seção
      let body = section.querySelector(".section-body");
      if (!body) {
        body = document.createElement("div");
        body.className = "section-body";

        let node = title.nextSibling;
        while (node) {
          const next = node.nextSibling;
          body.appendChild(node);
          node = next;
        }
        section.appendChild(body);
      }

      section.classList.add("section-collapsible");
      title.setAttribute("role", "button");
      title.setAttribute("tabindex", "0");
      title.setAttribute("aria-expanded", "true");

      // Ícone de accordion
      let icon = title.querySelector(".section-toggle-icon");
      if (!icon) {
        icon = document.createElement("span");
        icon.className = "section-toggle-icon";
        icon.textContent = "▾";
        title.appendChild(icon);
      }

      const toggleSection = function () {
        const collapsed = section.classList.toggle("is-collapsed");
        const expanded = !collapsed;
        title.setAttribute("aria-expanded", String(expanded));
      };

      title.addEventListener("click", function (ev) {
        if (ev.target && ev.target.tagName === "A") return;
        toggleSection();
      });

      title.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          toggleSection();
        }
      });
    });

    // 2. Accordions para regiões / grupos (subsessões)
    const headerSelectors =
      ".checklist .region-header, .checklist .group-header";
    const subHeaders = Array.from(document.querySelectorAll(headerSelectors));

    const headerItemsMap = new WeakMap();

    subHeaders.forEach(function (header) {
      const items = [];
      let li = header.nextElementSibling;
      while (
        li &&
        li.tagName === "LI" &&
        !li.classList.contains("region-header") &&
        !li.classList.contains("group-header")
      ) {
        items.push(li);
        li = li.nextElementSibling;
      }
      headerItemsMap.set(header, items);

      if (!items.length) return;

      header.classList.add("sub-accordion-header");

      let icon = header.querySelector(".sub-accordion-icon");
      if (!icon) {
        icon = document.createElement("span");
        icon.className = "sub-accordion-icon";
        icon.textContent = "▾";
        header.appendChild(icon);
      }

      const toggleSubsection = function () {
        const collapsed = header.classList.toggle("is-collapsed");
        const hide = collapsed;
        const arr = headerItemsMap.get(header) || [];
        arr.forEach(function (item) {
          if (hide) {
            item.classList.add("checklist-item-hidden");
          } else {
            item.classList.remove("checklist-item-hidden");
          }
        });
      };

      header.addEventListener("click", function (ev) {
        if (ev.target && ev.target.tagName === "A") return;
        toggleSubsection();
      });
    });

    // Antes de imprimir, garantir que tudo esteja visível
    function expandAllForPrint() {
      sections.forEach(function (section) {
        section.classList.remove("is-collapsed");
        const title = section.querySelector("h2.section-title");
        if (title) title.setAttribute("aria-expanded", "true");
      });
      subHeaders.forEach(function (header) {
        header.classList.remove("is-collapsed");
        const items = headerItemsMap.get(header) || [];
        items.forEach(function (item) {
          item.classList.remove("checklist-item-hidden");
        });
      });
    }

    if (window.matchMedia) {
      const mediaQueryList = window.matchMedia("print");
      mediaQueryList.addEventListener("change", function (mql) {
        if (mql.matches) expandAllForPrint();
      });
    }

    window.addEventListener("beforeprint", expandAllForPrint);

    // 3. Facilitar clique no texto para marcar/desmarcar o checkbox
    document.addEventListener("click", function (ev) {
      const checkbox = ev.target.closest(".check-toggle");
      if (checkbox) return;
      const row = ev.target.closest(".check-row");
      if (!row) return;
      const input = row.querySelector(".check-toggle");
      if (!input) return;
      input.checked = !input.checked;
      const changeEvent = new Event("change", { bubbles: true });
      input.dispatchEvent(changeEvent);
    });

    // Primeiro cálculo geral já com tudo conectado
    recomputeAllProgress(sessionSections, allCheckboxes);

    // Expor função de recálculo globalmente para integração com i18n
    window.recomputeAllProgress = recomputeAllProgress;

    // Inicializa a busca global flutuante (focada nos itens com checkbox)
    setupGlobalSearch(allCheckboxes);
  });

  // Reconstrói o índice de busca global quando o idioma muda
  document.addEventListener("HL_I18N_LANGUAGE_CHANGED", function () {
    if (globalSearchState && globalSearchState.allCheckboxes) {
      buildGlobalSearchIndex(globalSearchState.allCheckboxes);
      // Reaplica busca atual, se houver termo
      if (globalSearchState.lastQuery) {
        performGlobalSearch(globalSearchState.lastQuery, { autoScroll: false });
      } else {
        clearGlobalSearchHighlights();
        updateGlobalSearchCountLabel();
      }
    }
  });

  // Mapeia os cards do dashboard para as chaves de i18n já existentes
  window.applyDashboardI18nMapping = function () {
    var map = {
      "field-guide-pages": "1_field_guide_pages0",
      "collection-chests": "2_collection_chests0",
      conjurations: "3_conjurations0",
      "wand-handles": "4_wand_handles0",
      appearances: "5_appearances0",
      "merlin-trials": "6_merlin_trials0",
      traits: "7_traits0",
      challenges: "8_challenges0",
      "landing-platforms": "9_landing_platforms0",
      "astronomy-tables": "10_astronomy_tables0",
      "butterfly-locations": "11_butterfly_locations0",
      "daedalian-keys": "12_daedalian_keys0",
      "demiguise-statues": "13_demiguise_statues0",
      spells: "14_spells0",
      talents: "15_talents0",
      "quest-list": "16_quest_list0",
      "finishing-touches": "17_finishing_touches0",
      trophies: "18_trophies0",
    };

    Object.keys(map).forEach(function (sectionId) {
      var selector = '#dashboard-sessions a[href="#' + sectionId + '"]';
      var link = document.querySelector(selector);
      if (link) {
        link.setAttribute("data-i18n", map[sectionId]);
      }
    });
  };
})();

(function () {
  // Recalcula textos de progresso (geral, sessões e subseções) quando o idioma mudar
  document.addEventListener("HL_I18N_LANGUAGE_CHANGED", function () {
    if (
      typeof window.recomputeAllProgress === "function" &&
      Array.isArray(window.sessionSections) &&
      Array.isArray(window.allCheckboxes)
    ) {
      window.recomputeAllProgress(window.sessionSections, window.allCheckboxes);
    }
  });
})();

// ========================
// Sidebar Navigation & Search
// ========================
(function () {
  "use strict";

  var SIDEBAR_STORAGE_KEY = "hogwartsLegacyGuide_sidebarState_v1";

  var sidebar = document.getElementById("sidebar");
  var sidebarToggle = document.getElementById("sidebar-toggle");
  var sidebarClose = document.getElementById("sidebar-close");
  var sectionsList = document.getElementById("sidebar-sections-list");
  var searchInput = document.getElementById("sidebar-search-input");

  if (!sidebar || !sectionsList || !searchInput) {
    return;
  }

  // Helper to extract clean section title (no inline progress/percent, no dropdown icon)
  function getCleanSectionTitle(titleEl) {
    if (!titleEl) return "";
    var clone = titleEl.cloneNode(true);

    // Remove inline progress chunk (percent + tiny bar)
    var inline = clone.querySelector(".session-inline-progress");
    if (inline && inline.parentNode) {
      inline.parentNode.removeChild(inline);
    }

    // Remove the accordion/dropdown icon from the cloned title
    var toggleIcon = clone.querySelector(".section-toggle-icon");
    if (toggleIcon && toggleIcon.parentNode) {
      toggleIcon.parentNode.removeChild(toggleIcon);
    }

    var text = clone.textContent || "";
    text = text.trim();
    // Optionally strip trailing percentage (safety, e.g. "Section 1 0%")
    text = text.replace(/\s*\d+%\s*$/, "");
    return text;
  }

    // Helper to extract clean subsection title (no inline progress, no sub-accordion icon)
  function getCleanSubTitle(headerEl) {
    if (!headerEl) return "";
    var clone = headerEl.cloneNode(true);

    // Remove inline subsection progress
    var inline = clone.querySelector(".sub-inline-progress");
    if (inline && inline.parentNode) {
      inline.parentNode.removeChild(inline);
    }

    // Remove the accordion icon for subsections
    var subIcon = clone.querySelector(".sub-accordion-icon");
    if (subIcon && subIcon.parentNode) {
      subIcon.parentNode.removeChild(subIcon);
    }

    var text = clone.textContent || "";
    return text.trim();
  }

  // Dados das seções (ID, título em EN e PT)
  var sections = [];
  var sectionsByIdEnPt = {}; // Mapa para busca rápida

  /**
   * Inicializa a sidebar com todas as seções visíveis na página
   */
  function initSidebar() {
    sections = [];
    sectionsByIdEnPt = {};

    // Encontra todas as seções (h2 com class section-title e id)
        var titles = document.querySelectorAll("h2.section-title[id]");
    titles.forEach(function (title) {
      var sectionId = title.id;
      var i18nKey = title.getAttribute("data-i18n");
      var textContent = getCleanSectionTitle(title);

      var sectionObj = {
        id: sectionId,
        i18nKey: i18nKey,
        textContent: textContent,
        enText: "", // Será preenchido se disponível
        ptText: "", // Será preenchido se disponível
        subsections: []
      };

      // Map EN/PT lookup para a sessão principal
      sectionsByIdEnPt[sectionId] = {
        enText: "",
        ptText: ""
      };

      // Descobre subseções (region-header / group-header) dentro desta seção
      var sectionContainer = title.closest(".section");
      if (sectionContainer) {
        var subHeaders = sectionContainer.querySelectorAll(
          ".checklist .region-header, .checklist .group-header"
        );
        var subsectionIndex = 0;
        subHeaders.forEach(function (header) {
          // Garante um id estável no header pra podermos linkar
          var subId = header.id;
          if (!subId) {
            subId = sectionId + "-sub-" + subsectionIndex;
            subsectionIndex++;
            header.id = subId;
          }
          sectionObj.subsections.push({
            id: subId,
            textContent: getCleanSubTitle(header)
          });
        });
      }

      sections.push(sectionObj);
    });

    populateSectionsList();
  }

  /**
   * Popula a lista de seções no sidebar
   */
    function populateSectionsList() {
    sectionsList.innerHTML = "";

    sections.forEach(function (section) {
      var li = document.createElement("li");
      li.className = "sidebar-section-item";

      var headerWrapper = document.createElement("div");
      headerWrapper.className = "sidebar-section-header";

      var link = document.createElement("a");
      link.className = "sidebar-section-link";
      link.href = "#" + section.id;
      link.textContent = section.textContent;
      link.dataset.sectionId = section.id;

      link.addEventListener("click", function (e) {
        e.preventDefault();
        var element = document.getElementById(section.id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
          closeSidebarOnMobile();
          updateActiveSection();
        }
      });

      headerWrapper.appendChild(link);

      var hasSubsections =
        Array.isArray(section.subsections) && section.subsections.length > 0;

      var sublist = null;

      if (hasSubsections) {
        li.classList.add("has-subsections");

        // Botão de toggle pro dropdown de subseções
        var toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "sidebar-subsection-toggle";
        // estado inicial: colapsado
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "▸";

        toggle.addEventListener("click", function (e) {
          e.stopPropagation();
          var expanded = li.classList.toggle("subsections-expanded");
          toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
          // atualiza ícone conforme estado
          toggle.textContent = expanded ? "▾" : "▸";
          if (sublist) {
            sublist.style.display = expanded ? "block" : "none";
          }
        });

        headerWrapper.appendChild(toggle);

        // Lista de subseções
        sublist = document.createElement("ul");
        sublist.className = "sidebar-subsection-list";
        sublist.style.display = "none";

        section.subsections.forEach(function (sub) {
          var subLi = document.createElement("li");
          subLi.className = "sidebar-subsection-item";

          var subLink = document.createElement("a");
          subLink.className = "sidebar-subsection-link";
          subLink.href = "#" + sub.id;
          subLink.textContent = sub.textContent;
          subLink.dataset.sectionId = sub.id;
          subLink.dataset.parentSectionId = section.id;

          subLink.addEventListener("click", function (e) {
            e.preventDefault();
            var target = document.getElementById(sub.id);
            if (target) {
              target.scrollIntoView({ behavior: "smooth" });
              closeSidebarOnMobile();
              updateActiveSection();
            }
          });

          subLi.appendChild(subLink);
          sublist.appendChild(subLi);
        });
      }

      li.appendChild(headerWrapper);
      if (sublist) {
        li.appendChild(sublist);
      }

      sectionsList.appendChild(li);
    });
  }

  /**
   * Atualiza o estilo da seção ativa com base na posição de scroll
   */
  function updateActiveSection() {
    var scrollPosition = window.scrollY + 100; // Offset para melhor detecção

    sections.forEach(function (section) {
      var element = document.getElementById(section.id);
      if (!element) return;

      var rect = element.getBoundingClientRect();
      var elementTop = window.scrollY + rect.top;
      var elementBottom = elementTop + rect.height;

      var link = document.querySelector(
        '.sidebar-section-link[data-section-id="' + section.id + '"]'
      );
      if (link) {
        if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      }
    });
  }

  /**
   * Busca seções por termo, mostrando só sessões e subseções que batem.
   * - Reseta tudo ao limpar busca.
   * - Mostra só sessões que batem no título OU têm subseção que bate.
   * - Dentro de sessões com subseções, mostra só as subseções que batem, expande dropdown.
   */
  function searchSections(query) {
    var trimmed = query.trim();

    if (!trimmed) {
      // Reset visual: mostra todas as seções e subseções, recolhe dropdowns.
      document.querySelectorAll(".sidebar-section-item").forEach(function (li) {
        li.classList.remove("hidden");
        li.style.display = ""; // ensure visible
        li.classList.remove("subsections-expanded");
        var sublist = li.querySelector(".sidebar-subsection-list");
        if (sublist) {
          sublist.style.display = "none";
          li.querySelectorAll(".sidebar-subsection-item").forEach(function (subLi) {
            subLi.classList.remove("hidden");
            subLi.style.display = ""; // ensure visible
          });
        }
        var sectionLink = li.querySelector(".sidebar-section-link");
        if (sectionLink) {
          sectionLink.classList.remove("hidden");
        }
        var toggle = li.querySelector(".sidebar-subsection-toggle");
        if (toggle) {
          toggle.setAttribute("aria-expanded", "false");
          toggle.textContent = "▸";
        }
      });
      return;
    }

    var lowerQuery = trimmed.toLowerCase();

    // Para cada sessão, decide se ela aparece e quais subseções ficam visíveis
    sections.forEach(function (section) {
      var sectionId = section.id;
      var li = sectionsList.querySelector(
        '.sidebar-section-item .sidebar-section-link[data-section-id="' +
          sectionId +
          '"]'
      );
      if (li) {
        li = li.closest(".sidebar-section-item");
      }
      if (!li) return;

      var sectionText = (section.textContent || "").toLowerCase();
      var enText =
        (sectionsByIdEnPt[sectionId] &&
          sectionsByIdEnPt[sectionId].enText.toLowerCase()) ||
        "";
      var ptText =
        (sectionsByIdEnPt[sectionId] &&
          sectionsByIdEnPt[sectionId].ptText.toLowerCase()) ||
        "";

      var sectionMatches =
        sectionText.includes(lowerQuery) ||
        enText.includes(lowerQuery) ||
        ptText.includes(lowerQuery);

      // Verifica matches nas subseções
      var matchedSubIds = [];
      if (Array.isArray(section.subsections)) {
        section.subsections.forEach(function (sub) {
          var subText = (sub.textContent || "").toLowerCase();
          if (subText.includes(lowerQuery)) {
            matchedSubIds.push(sub.id);
          }
        });
      }

      var showSection = sectionMatches || matchedSubIds.length > 0;

      if (!showSection) {
        li.classList.add("hidden");
        li.style.display = "none"; // ensure hidden
        return;
      }
      li.classList.remove("hidden");
      li.style.display = ""; // ensure visible

      // Mostra sempre o link da sessão (para indicar o "caminho" pai)
      var sectionLink = li.querySelector(".sidebar-section-link");
      if (sectionLink) {
        sectionLink.classList.remove("hidden");
      }

      // Controle das subseções (dropdown) se existirem
      var sublist = li.querySelector(".sidebar-subsection-list");
      var toggle = li.querySelector(".sidebar-subsection-toggle");

      if (sublist) {
        if (matchedSubIds.length > 0) {
          li.classList.add("subsections-expanded");
          sublist.style.display = "block";
          if (toggle) {
            toggle.setAttribute("aria-expanded", "true");
            toggle.textContent = "▾";
          }
          sublist.querySelectorAll(".sidebar-subsection-item").forEach(function (subLi) {
            var subLink = subLi.querySelector(".sidebar-subsection-link");
            if (!subLink) return;
            var subId = subLink.getAttribute("href").slice(1);
            if (matchedSubIds.indexOf(subId) !== -1) {
              subLi.classList.remove("hidden");
              subLi.style.display = ""; // ensure visible
            } else {
              subLi.classList.add("hidden");
              subLi.style.display = "none"; // ensure hidden
            }
          });
        } else {
          // Nenhuma subseção bateu; se só o título da sessão bateu, recolhe lista
          li.classList.remove("subsections-expanded");
          sublist.style.display = "none";
          if (toggle) {
            toggle.setAttribute("aria-expanded", "false");
            toggle.textContent = "▸";
          }
          sublist.querySelectorAll(".sidebar-subsection-item").forEach(function (subLi) {
            subLi.classList.add("hidden");
            subLi.style.display = "none"; // ensure hidden
          });
        }
      }
    });
  }

  /**
   * Fecha a sidebar em dispositivos móveis
   */
  function closeSidebarOnMobile() {
    if (window.innerWidth <= 768) {
      sidebar.classList.remove("visible");
    }
  }

  /**
   * Salva o estado da sidebar
   */
  function saveSidebarState() {
    try {
      var isOpen = sidebar.classList.contains("visible");
      localStorage.setItem(SIDEBAR_STORAGE_KEY, isOpen ? "open" : "closed");
    } catch (e) {
      // localStorage pode estar desabilitado
    }
  }

  /**
   * Restaura o estado da sidebar
   */
  function restoreSidebarState() {
    try {
      var state = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (state === "open" && window.innerWidth > 768) {
        sidebar.classList.add("visible");
      } else {
        sidebar.classList.remove("visible");
      }
    } catch (e) {
      // localStorage pode estar desabilitado
    }
  }

  // Event Listeners
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", function () {
      sidebar.classList.toggle("visible");
      saveSidebarState();
    });
  }

  if (sidebarClose) {
    sidebarClose.addEventListener("click", function () {
      sidebar.classList.remove("visible");
      saveSidebarState();
    });
  }

  searchInput.addEventListener("input", function () {
    searchSections(this.value);
  });

  window.addEventListener("scroll", updateActiveSection);

  // Listener para quando o idioma mudar
  document.addEventListener("HL_I18N_LANGUAGE_CHANGED", function () {
    // Atualiza os textos das seções com a nova linguagem
        sections.forEach(function (section) {
      var titleElement = document.getElementById(section.id);
      if (titleElement) {
        section.textContent = getCleanSectionTitle(titleElement);

        // Reconstroi subseções dessa seção no novo idioma
        var sectionContainer = titleElement.closest(".section");
        var newSubsections = [];
        if (sectionContainer) {
          var subHeaders = sectionContainer.querySelectorAll(
            ".checklist .region-header, .checklist .group-header"
          );
          var subsectionIndex = 0;
          subHeaders.forEach(function (header) {
            var subId = header.id;
            if (!subId) {
              subId = section.id + "-sub-" + subsectionIndex;
              subsectionIndex++;
              header.id = subId;
            }
            newSubsections.push({
              id: subId,
              textContent: getCleanSubTitle(header)
            });
          });
        }
        section.subsections = newSubsections;
      }

      // Captura textos em inglês e português para busca
      var hl = window.HL_I18N;
      if (hl && hl.byKey && section.i18nKey && hl.byKey[section.i18nKey]) {
        var entry = hl.byKey[section.i18nKey];
        sectionsByIdEnPt[section.id].enText = (entry["en-US"] || "").replace(
          /^\d+\.\s*/,
          ""
        );
        sectionsByIdEnPt[section.id].ptText = (entry["pt-BR"] || "").replace(
          /^\d+\.\s*/,
          ""
        );
      }
    });

    populateSectionsList();
  });

  // Inicializa sidebar quando o i18n está pronto
  document.addEventListener("HL_I18N_READY", function () {
    setTimeout(function () {
      initSidebar();
      restoreSidebarState();

      // Preenche os textos de busca (EN e PT)
      var hl = window.HL_I18N;
      if (hl && hl.byKey) {
        sections.forEach(function (section) {
          if (section.i18nKey && hl.byKey[section.i18nKey]) {
            var entry = hl.byKey[section.i18nKey];
            sectionsByIdEnPt[section.id].enText = (
              entry["en-US"] || ""
            ).replace(/^\d+\.\s*/, "");
            sectionsByIdEnPt[section.id].ptText = (
              entry["pt-BR"] || ""
            ).replace(/^\d+\.\s*/, "");
          }
        });
      }
    }, 100);
  });

  // Atualiza a seção ativa na sidebar ao scroll
  window.addEventListener("HL_I18N_LANGUAGE_CHANGED", updateActiveSection);

  // Listener customizado para disparo de mudança de idioma
  // (applyLanguage is implemented above and already dispatches HL_I18N_LANGUAGE_CHANGED)
})();

// ========================
// Sidebar Resize & Persistence
// ========================
(function () {
  var resizer = document.getElementById("sidebar-resizer");
  var sidebar = document.getElementById("sidebar");
  var collapseBtn = document.getElementById("sidebar-collapse");
  var SIDEBAR_WIDTH_KEY = "hogwartsLegacyGuide_sidebar_width_v1";
  var SIDEBAR_COLLAPSED_KEY = "hogwartsLegacyGuide_sidebar_collapsed_v1";
  var SIDEBAR_PREV_WIDTH_KEY = "hogwartsLegacyGuide_sidebar_prev_width_v1";

  if (!resizer || !sidebar || !collapseBtn) return;

  // Ensure resizer is visible by default and move it inside the sidebar
  try {
    if (resizer.parentElement !== sidebar) {
      sidebar.appendChild(resizer);
    }
    resizer.style.display = "block";
    resizer.style.position = "absolute";
    resizer.style.top = "0";
    resizer.style.right = "-3px";
    resizer.style.height = "100%";
    resizer.style.zIndex = "1002";
  } catch (e) {}

  // Restore width if saved
  try {
    var saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (saved) {
      document.documentElement.style.setProperty(
        "--sidebar-width",
        saved + "px"
      );
    }
    var savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (savedCollapsed === "true") {
      sidebar.classList.add("collapsed");
      document.body.classList.add("sidebar-collapsed");
    }
  } catch (e) {}

  var dragging = false;

  // Temporary debug banner to help reproduce state changes visually
  // debug banner removed; no-op variable to keep code safe
  var _hl_debug = null;

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  // Expor globalmente para que outros módulos possam chamar

  resizer.addEventListener("mousedown", function (e) {
    e.preventDefault();
    // Allow drag even when collapsed to expand
    dragging = true;
    document.body.style.userSelect = "none";
    // disable CSS transitions while dragging so sidebar edge and resizer
    // stay visually in sync
    try {
      sidebar.classList.add("no-transition");
      var pageEl = document.querySelector(".page");
      if (pageEl) pageEl.classList.add("no-transition");
    } catch (e) {}
    // debug removed
  });

  window.addEventListener("mousemove", function (e) {
    if (!dragging) return;
    var x = e.clientX;
    var minW =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--sidebar-min-width"
        )
      ) || 64;
    var maxW =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--sidebar-max-width"
        )
      ) || 480;
    var newWidth = clamp(x, minW, maxW);
    document.documentElement.style.setProperty(
      "--sidebar-width",
      newWidth + "px"
    );
    // move resizer visually - always visible during drag
    resizer.style.display = "block";
    // Use the actual rendered sidebar rect instead of relying solely on CSS var
    try {
      var rect = sidebar.getBoundingClientRect();
      var right = Math.round(rect.left + rect.width);
      // resizer is positioned as a child of sidebar; no left adjustment needed
    } catch (e) {
      // fallback: leave resizer positioned by CSS inside sidebar
    }

    // Auto-collapse if dragged to minimum width
    var wasCollapsed = sidebar.classList.contains("collapsed");
    if (newWidth <= minW + 5 && !wasCollapsed) {
      // remember previous width so we can restore later
      try {
        var prev =
          parseInt(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--sidebar-width"
            )
          ) ||
          Math.round(sidebar.getBoundingClientRect().width) ||
          newWidth;
        // only set prev if not already present
        if (!localStorage.getItem(SIDEBAR_PREV_WIDTH_KEY)) {
          localStorage.setItem(SIDEBAR_PREV_WIDTH_KEY, Math.round(prev));
        }
      } catch (e) {}

      // set CSS var to min width so resizer positions correctly
      try {
        document.documentElement.style.setProperty(
          "--sidebar-width",
          minW + "px"
        );
      } catch (e) {}

      setCollapseVisual(true);
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "true");
      } catch (e) {}
      if (typeof updateCollapseI18n === "function") updateCollapseI18n();
    } else if (newWidth > minW + 15 && wasCollapsed) {
      // expanding while dragging: restore visual width from CSS var or previous width
      try {
        var prevSaved = parseInt(localStorage.getItem(SIDEBAR_PREV_WIDTH_KEY));
        if (prevSaved && prevSaved > minW) {
          document.documentElement.style.setProperty(
            "--sidebar-width",
            prevSaved + "px"
          );
        } else {
          document.documentElement.style.setProperty(
            "--sidebar-width",
            newWidth + "px"
          );
        }
        // do not persist final width here; persist on mouseup to avoid conflicting writes
      } catch (e) {}

      setCollapseVisual(false);
      resizer.style.display = "block";
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "false");
      } catch (e) {}
      if (typeof updateCollapseI18n === "function") updateCollapseI18n();
      // debug removed
    }
  });

  window.addEventListener("mouseup", function () {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = "";
    // Always keep resizer visible so user can drag to expand
    if (resizer) resizer.style.display = "block";
    // re-enable transitions
    try {
      sidebar.classList.remove("no-transition");
      var pageEl2 = document.querySelector(".page");
      if (pageEl2) pageEl2.classList.remove("no-transition");
    } catch (e) {}
    // persist collapsed state and width appropriately
    try {
      var isNowCollapsed = sidebar.classList.contains("collapsed");
      localStorage.setItem(
        SIDEBAR_COLLAPSED_KEY,
        isNowCollapsed ? "true" : "false"
      );
      if (!isNowCollapsed) {
        var current =
          Math.round(sidebar.getBoundingClientRect().width) ||
          parseInt(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--sidebar-width"
            )
          ) ||
          280;
        localStorage.setItem(SIDEBAR_WIDTH_KEY, Math.round(current));
        // update CSS var as a canonical source
        try {
          document.documentElement.style.setProperty(
            "--sidebar-width",
            Math.round(current) + "px"
          );
        } catch (e) {}
        // clear prev width as it's now the active width
        try {
          localStorage.removeItem(SIDEBAR_PREV_WIDTH_KEY);
        } catch (e) {}
      } else {
        // when collapsed, ensure CSS var is min (prev width preserved in prev key)
        var minW =
          parseInt(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--sidebar-min-width"
            )
          ) || 64;
        try {
          document.documentElement.style.setProperty(
            "--sidebar-width",
            minW + "px"
          );
        } catch (e) {}
        localStorage.setItem(SIDEBAR_WIDTH_KEY, minW);
        // ensure resizer lines up with collapsed width
        try {
          /* resizer positioned by CSS inside sidebar */
        } catch (e) {}
      }
    } catch (e) {}
  });

  // Collapse / Expand button
  var updateCollapseI18n; // declare here so it's accessible from drag handler

  if (collapseBtn) {
    // initialize aria state and icon
    function setCollapseVisual(collapsed) {
      // Aria/state
      collapseBtn.setAttribute("aria-pressed", collapsed ? "true" : "false");

      if (collapsed) {
        sidebar.classList.add("collapsed");
        document.body.classList.add("sidebar-collapsed");
        if (resizer) resizer.style.display = "block";
      } else {
        sidebar.classList.remove("collapsed");
        document.body.classList.remove("sidebar-collapsed");
        if (resizer) resizer.style.display = "block";
      }

      // Ícone do botão sempre baseado no estado passado
      collapseBtn.textContent = collapsed ? "▶" : "◀";
    }

    // set initial visual state based on the actual DOM state.
    // The "collapsed" class may have been applied earlier (e.g. from saved state or CSS),
    // so we read from the DOM instead of re-reading localStorage here.
    try {
      var initCollapsed = sidebar.classList.contains("collapsed");
      setCollapseVisual(initCollapsed);
    } catch (e) {}

    // Update i18n titles for collapse/expand
    updateCollapseI18n = function () {
      try {
        var isCollapsedNow = sidebar.classList.contains("collapsed");
        var titleKey = isCollapsedNow ? "sidebar_expand" : "sidebar_collapse";
        var txt =
          typeof t === "function"
            ? t(
                titleKey,
                isCollapsedNow ? "Expand sidebar" : "Collapse sidebar"
              )
            : isCollapsedNow
            ? "Expand sidebar"
            : "Collapse sidebar";
        collapseBtn.title = txt;
      } catch (e) {}
    };

    collapseBtn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      // toggle
      var isCollapsed = sidebar.classList.contains("collapsed");
      var collapsed = !isCollapsed;
      try {
        localStorage.setItem(
          SIDEBAR_COLLAPSED_KEY,
          collapsed ? "true" : "false"
        );
      } catch (e) {}
      // If collapsing, remember previous width and set CSS var to min width
      try {
        var minW =
          parseInt(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--sidebar-min-width"
            )
          ) || 64;
        var currentVarWidth =
          parseInt(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--sidebar-width"
            )
          ) ||
          Math.round(sidebar.getBoundingClientRect().width) ||
          280;
        if (collapsed) {
          // we're collapsing now: save previous width so expand restores it
          try {
            localStorage.setItem(
              SIDEBAR_PREV_WIDTH_KEY,
              Math.round(currentVarWidth)
            );
          } catch (e) {}
          // set CSS var to min so layout/resizer aligns to collapsed visual
          try {
            document.documentElement.style.setProperty(
              "--sidebar-width",
              minW + "px"
            );
          } catch (e) {}
        } else {
          // expanding: try to restore previous width (fallback to stored width or a readable min)
          try {
            var prev = parseInt(localStorage.getItem(SIDEBAR_PREV_WIDTH_KEY));
            var storedW = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY));
            var restore =
              prev && prev > minW
                ? prev
                : storedW && storedW > minW
                ? storedW
                : 280;
            document.documentElement.style.setProperty(
              "--sidebar-width",
              restore + "px"
            );
            try {
              localStorage.setItem(SIDEBAR_WIDTH_KEY, Math.round(restore));
            } catch (e) {}
          } catch (e) {}
        }
      } catch (e) {}

      setCollapseVisual(collapsed);
      updateCollapseI18n();
      // Always keep resizer visible so user can interact with it
      if (resizer) resizer.style.display = "block";
      // Position the resizer using the actual sidebar width (handles CSS .collapsed width)
      try {
        var sidebarWidthPx = Math.round(
          sidebar.getBoundingClientRect().width || 0
        );
        if (resizer) {
          /* resizer positioned by CSS inside sidebar */
        }
      } catch (e) {}
    });
    // keyboard accessibility: toggle on Enter or Space
    collapseBtn.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " " || ev.key === "Spacebar") {
        ev.preventDefault();
        collapseBtn.click();
      }
    });

    // Ensure i18n updates when language changes
    document.addEventListener("HL_I18N_LANGUAGE_CHANGED", updateCollapseI18n);
    // Also update after i18n ready (in case initialized earlier)
    document.addEventListener("HL_I18N_READY", updateCollapseI18n);
  }

  // Position resizer initially and on window resize
  function updateResizerPosition() {
    try {
      // Use the real rendered sidebar width so positioning reflects .collapsed styles
      var rect = sidebar.getBoundingClientRect();
      // resizer is positioned absolutely inside the sidebar; keep it at right offset
      if (resizer) resizer.style.right = "-3px";
    } catch (e) {}
  }

  window.addEventListener("resize", updateResizerPosition);
  updateResizerPosition();
})();
