function renderTerminalSelectorTool()
{
  document.getElementById("pageTitle").textContent = "Terminal Block Selector";

  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="card">
      <h2 style="margin-top:0;">
        Terminal Block Selector
      </h2>

      <p>
        Answer a few questions and this tool will suggest a JNE-standard terminal block.
      </p>

      <div
        style="
          display:inline-block;
          background:#ffd54f;
          color:#4e3b00;
          border:1px solid #e0b400;
          border-radius:999px;
          padding:6px 12px;
          font-size:12px;
          font-weight:bold;
          letter-spacing:0.4px;
          margin-bottom:18px;
        "
      >
        GUIDE ONLY — verify selection before use.
      </div>

      <div class="terminal-selector-wrap">
        <div class="terminal-form-grid">
          <label>
            What are you trying to do?
            <select id="tsFunctionUse" class="tool-select">
              <option value="">Loading options...</option>
            </select>
          </label>

          <label>
            Voltage / Use Case
            <select id="tsUseCase" class="tool-select">
              <option value="">Any</option>
            </select>
          </label>

          <label>
            Preferred Series
            <select id="tsSeries" class="tool-select">
              <option value="">Any</option>
            </select>
          </label>

          <label>
            Fused?
            <select id="tsFused" class="tool-select">
              <option value="">Any</option>
              <option value="true">Fused only</option>
              <option value="false">Non-fused only</option>
            </select>
          </label>
        </div>

        <div class="terminal-actions">
          <button id="tsSearchBtn" class="login-button" type="button">
            Suggest Terminals
          </button>

          <button id="tsResetBtn" class="login-button" type="button" style="background:#6b7280;">
            Reset
          </button>
        </div>

        <div id="tsStatus" class="terminal-status">
          Loading terminal data...
        </div>

        <div id="tsResults" class="terminal-results"></div>
      </div>
    </div>

    <style>
      .terminal-selector-wrap {
        margin-top: 18px;
      }

      .terminal-form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: 14px;
        align-items: end;
      }

      .terminal-form-grid label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-weight: 700;
      }

      .terminal-form-grid select {
        width: 100%;
        max-width: 320px;
      }

      .terminal-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 16px;
      }

      .terminal-status {
        margin-top: 16px;
        color: var(--jne-muted, #6b7280);
        font-size: 14px;
      }

      .terminal-results {
        display: grid;
        gap: 12px;
        margin-top: 16px;
      }

      .terminal-result-card {
        border: 1px solid var(--jne-border, #d1d5db);
        border-radius: 14px;
        padding: 14px;
        background: #fff;
        box-shadow: var(--jne-shadow-sm, 0 1px 3px rgba(0,0,0,0.08));
      }

      .terminal-result-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }

      .terminal-result-title {
        font-size: 22px;
        font-weight: 800;
        color: #005bbb;
      }

      .terminal-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 4px 9px;
        font-size: 12px;
        font-weight: 800;
        background: #eef2ff;
        color: #1f2937;
        white-space: nowrap;
        margin-left: 4px;
        margin-bottom: 4px;
      }

      .terminal-detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 8px 14px;
        font-size: 14px;
        margin-top: 8px;
      }

      .terminal-detail-grid div span {
        display: block;
        color: var(--jne-muted, #6b7280);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .terminal-link {
        display: inline-block;
        margin-top: 12px;
        font-weight: 800;
      }

      @media (max-width: 600px) {
        .terminal-form-grid {
          grid-template-columns: 1fr;
        }

        .terminal-form-grid select {
          max-width: none;
        }

        .terminal-actions {
          flex-direction: column;
        }

        .terminal-actions button {
          width: 100%;
        }
      }
    </style>
  `;

  initializeTerminalSelector();
}

async function initializeTerminalSelector()
{
  const state =
  {
    standards: [],
    blocks: [],
    series: []
  };

  const functionSelect = document.getElementById("tsFunctionUse");
  const useCaseSelect = document.getElementById("tsUseCase");
  const seriesSelect = document.getElementById("tsSeries");
  const fusedSelect = document.getElementById("tsFused");
  const searchBtn = document.getElementById("tsSearchBtn");
  const resetBtn = document.getElementById("tsResetBtn");
  const status = document.getElementById("tsStatus");
  const results = document.getElementById("tsResults");

  if (
    !window.jnea ||
    !window.jnea.sb
  )
  {
    status.textContent = "Supabase client was not found. Make sure app-core.js creates window.jnea.sb.";
    return;
  }

  const sb = window.jnea.sb;

  try
  {
    const standardsResponse = await sb
      .from("terminalstandards")
      .select("*")
      .order("functionuse");

    const blocksResponse = await sb
      .from("terminalblocks")
      .select("*")
      .order("preferred", { ascending: false })
      .order("alias");

    const seriesResponse = await sb
      .from("terminalseries")
      .select("*")
      .order("series_id");

    if (standardsResponse.error)
    {
      throw standardsResponse.error;
    }

    if (blocksResponse.error)
    {
      throw blocksResponse.error;
    }

    if (seriesResponse.error)
    {
      throw seriesResponse.error;
    }

    state.standards = standardsResponse.data || [];
    state.blocks = blocksResponse.data || [];
    state.series = seriesResponse.data || [];

    populateTerminalFilters(state);

    status.textContent = "Choose your options, then press Suggest Terminals.";

    searchBtn.addEventListener("click", function()
    {
      renderTerminalResults(state);
    });

    resetBtn.addEventListener("click", function()
    {
      functionSelect.value = "";
      useCaseSelect.value = "";
      seriesSelect.value = "";
      fusedSelect.value = "";
      results.innerHTML = "";
      status.textContent = "Choose your options, then press Suggest Terminals.";
    });
  }
  catch (err)
  {
    console.error("Terminal selector load error:", err);

    status.innerHTML = `
      <div style="color:#c62828;font-weight:bold;">
        Could not load terminal selector data.
      </div>

      <pre>${tsEscapeHtml(err.message || String(err))}</pre>
    `;
  }
}

function populateTerminalFilters(state)
{
  const functionSelect = document.getElementById("tsFunctionUse");
  const useCaseSelect = document.getElementById("tsUseCase");
  const seriesSelect = document.getElementById("tsSeries");

  const functionUses = tsUniqueSorted([
    ...state.standards.map(function(row)
    {
      return row.functionuse;
    }),
    ...state.blocks.flatMap(function(row)
    {
      return tsSplitList(row.functionuse);
    })
  ]);

  const useCases = tsUniqueSorted(
    state.blocks.flatMap(function(row)
    {
      return tsSplitList(row.usecase);
    })
  );

  const series = tsUniqueSorted(
    state.series.map(function(row)
    {
      return row.series_id;
    })
  );

  functionSelect.innerHTML = `<option value="">Any</option>` + functionUses.map(function(value)
  {
    return `
      <option value="${tsEscapeAttribute(value)}">
        ${tsEscapeHtml(value)}
      </option>
    `;
  }).join("");

  useCaseSelect.innerHTML = `<option value="">Any</option>` + useCases.map(function(value)
  {
    return `
      <option value="${tsEscapeAttribute(value)}">
        ${tsEscapeHtml(value)}
      </option>
    `;
  }).join("");

  seriesSelect.innerHTML = `<option value="">Any</option>` + series.map(function(value)
  {
    return `
      <option value="${tsEscapeAttribute(value)}">
        ${tsEscapeHtml(value)}
      </option>
    `;
  }).join("");
}

function renderTerminalResults(state)
{
  const functionUse = document.getElementById("tsFunctionUse").value;
  const useCase = document.getElementById("tsUseCase").value;
  const seriesId = document.getElementById("tsSeries").value;
  const fused = document.getElementById("tsFused").value;
  const status = document.getElementById("tsStatus");
  const results = document.getElementById("tsResults");

  const standard = state.standards.find(function(row)
  {
    return tsNormalize(row.functionuse) === tsNormalize(functionUse);
  });

  let filtered = state.blocks.filter(function(block)
  {
    const blockFunctionUses = tsSplitList(block.functionuse);
    const blockUseCases = tsSplitList(block.usecase);

    const matchesFunction =
      !functionUse ||
      blockFunctionUses.some(function(value)
      {
        return tsNormalize(value) === tsNormalize(functionUse);
      });

    const matchesUseCase =
      !useCase ||
      blockUseCases.some(function(value)
      {
        return tsNormalize(value) === tsNormalize(useCase);
      });

    const matchesSeries =
      !seriesId ||
      tsNormalize(block.series_id) === tsNormalize(seriesId);

    const matchesFused =
      fused === "" ||
      String(block.isfused) === fused;

    return matchesFunction && matchesUseCase && matchesSeries && matchesFused;
  });

  if (
    filtered.length === 0 &&
    standard
  )
  {
    filtered = state.blocks.filter(function(block)
    {
      const matchesStandardColor =
        !standard.preferredcolor ||
        tsNormalize(block.color) === tsNormalize(standard.preferredcolor);

      const matchesStandardSeries =
        !standard.preferredseries ||
        tsNormalize(block.series_id) === tsNormalize(standard.preferredseries);

      const matchesFused =
        fused === "" ||
        String(block.isfused) === fused;

      return matchesStandardColor && matchesStandardSeries && matchesFused;
    });
  }

  filtered = filtered.sort(function(a, b)
  {
    const scoreA = getTerminalScore(a, standard);
    const scoreB = getTerminalScore(b, standard);

    if (scoreB !== scoreA)
    {
      return scoreB - scoreA;
    }

    return String(a.alias || "").localeCompare(String(b.alias || ""));
  });

  if (!filtered.length)
  {
    results.innerHTML = "";
    status.textContent = "No matching terminals found.";
    return;
  }

  status.textContent = `Found ${filtered.length} matching terminal${filtered.length === 1 ? "" : "s"}.`;

  results.innerHTML = filtered.map(function(block)
  {
    const series = state.series.find(function(row)
    {
      return tsNormalize(row.series_id) === tsNormalize(block.series_id);
    });

    const preferredBadge = block.preferred ? `<span class="terminal-badge">Preferred</span>` : "";
    const fusedBadge = block.isfused ? `<span class="terminal-badge">Fused</span>` : "";
    const groundBadge = block.isgrounding ? `<span class="terminal-badge">Ground</span>` : "";

    return `
      <div class="terminal-result-card">
        <div class="terminal-result-header">
          <div>
            <div class="terminal-result-title">
              ${tsEscapeHtml(block.alias || "")}
            </div>

            <div>
              ${tsEscapeHtml(block.catno || "")}
            </div>
          </div>

          <div>
            ${preferredBadge}
            ${fusedBadge}
            ${groundBadge}
          </div>
        </div>

        <div class="terminal-detail-grid">
          <div>
            <span>Series</span>
            ${tsEscapeHtml(block.series_id || "")}
          </div>

          <div>
            <span>Color</span>
            ${tsEscapeHtml(block.color || "")}
          </div>

          <div>
            <span>Use Case</span>
            ${tsEscapeHtml(block.usecase || "")}
          </div>

          <div>
            <span>Function</span>
            ${tsEscapeHtml(block.functionuse || "")}
          </div>

          <div>
            <span>Connection</span>
            ${tsEscapeHtml(series ? series.connectiontype : "")}
          </div>

          <div>
            <span>Block Type</span>
            ${tsEscapeHtml(series ? series.blocktype : "")}
          </div>

          <div>
            <span>Wire Range</span>
            ${tsEscapeHtml(series ? series.wirerange : "")}
          </div>

          <div>
            <span>Max Voltage</span>
            ${tsEscapeHtml(series ? series.maxvoltage : "")}
          </div>

          <div>
            <span>Max Current</span>
            ${tsEscapeHtml(series ? series.maxcurrent : "")}
          </div>

          <div>
            <span>Width</span>
            ${tsEscapeHtml(series && series.widthmm ? series.widthmm + " mm" : "")}
          </div>

          <div>
            <span>Fuse Size</span>
            ${tsEscapeHtml(series ? series.fusesize : "")}
          </div>

          <div>
            <span>Fuse Rating</span>
            ${tsEscapeHtml(block.fuserating || (series ? series.fusemaxcurrent : ""))}
          </div>
        </div>

        ${block.partlink ? `
          <a class="terminal-link" href="${tsEscapeAttribute(block.partlink)}" target="_blank" rel="noopener noreferrer">
            Open product page
          </a>
        ` : ""}
      </div>
    `;
  }).join("");
}

function getTerminalScore(block, standard)
{
  let score = 0;

  if (block.preferred)
  {
    score += 100;
  }

  if (standard)
  {
    if (tsNormalize(block.series_id) === tsNormalize(standard.preferredseries))
    {
      score += 50;
    }

    if (tsNormalize(block.color) === tsNormalize(standard.preferredcolor))
    {
      score += 30;
    }

    if (tsSplitList(block.functionuse).some(function(value)
    {
      return tsNormalize(value) === tsNormalize(standard.functionuse);
    }))
    {
      score += 20;
    }
  }

  if (tsNormalize(block.series_id).startsWith("pt"))
  {
    score += 10;
  }

  return score;
}

function tsSplitList(value)
{
  return String(value || "")
    .split(/[|,]/)
    .map(function(item)
    {
      return item.trim();
    })
    .filter(Boolean);
}

function tsUniqueSorted(values)
{
  return [...new Set(
    values
      .filter(function(value)
      {
        return value !== null && value !== undefined;
      })
      .map(function(value)
      {
        return String(value).trim();
      })
      .filter(Boolean)
  )].sort(function(a, b)
  {
    return a.localeCompare(b);
  });
}

function tsNormalize(value)
{
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/feed-through/g, "feed through")
    .replace(/a\/c/g, "ac");
}

function tsEscapeHtml(value)
{
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function tsEscapeAttribute(value)
{
  return tsEscapeHtml(value);
}
