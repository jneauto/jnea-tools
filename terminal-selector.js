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

            <div class="terminal-selector-wrap">
                <div class="terminal-form-grid">
                    <label>
                        What are you trying to do?
                        <select id="tsFunctionUse">
                            <option value="">Loading options...</option>
                        </select>
                    </label>

                    <label>
                        Voltage / Use Case
                        <select id="tsUseCase">
                            <option value="">Any</option>
                        </select>
                    </label>

                    <label>
                        Preferred Series
                        <select id="tsSeries">
                            <option value="">Any</option>
                        </select>
                    </label>

                    <label>
                        Fused?
                        <select id="tsFused">
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
                    <button id="tsResetBtn" class="login-button secondary" type="button">
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
                color: var(--jne-text, #1f2937);
            }

            .terminal-form-grid select {
                width: 100%;
                max-width: 320px;
                padding: 10px 12px;
                border: 1px solid var(--jne-border, #d1d5db);
                border-radius: 10px;
                font-size: 15px;
                background: white;
            }

            .terminal-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 16px;
            }

            .terminal-actions .secondary {
                background: #6b7280;
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
                font-size: 18px;
                font-weight: 800;
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

    if (!window.sb)
    {
        status.textContent = "Supabase client was not found. Make sure app-core.js creates window.sb.";
        return;
    }

    try
    {
        const [
            standardsResponse,
            blocksResponse,
            seriesResponse
        ] = await Promise.all([
            sb.from("terminalstandards").select("*").order("functionuse"),
            sb.from("terminalblocks").select("*").order("preferred", { ascending: false }).order("alias"),
            sb.from("terminalseries").select("*").order("series_id")
        ]);

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

        populateFilters(state);
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
    catch (error)
    {
        console.error("Terminal selector load error:", error);
        status.textContent = "Could not load terminal selector data. Check Supabase RLS/policies and table names.";
    }
}

function populateFilters(state)
{
    const functionSelect = document.getElementById("tsFunctionUse");
    const useCaseSelect = document.getElementById("tsUseCase");
    const seriesSelect = document.getElementById("tsSeries");

    const functionUses = uniqueSorted([
        ...state.standards.map(row => row.functionuse),
        ...state.blocks.flatMap(row => splitPipeValues(row.functionuse))
    ]);

    const useCases = uniqueSorted(
        state.blocks.flatMap(row => splitPipeValues(row.usecase))
    );

    const series = uniqueSorted(
        state.series.map(row => row.series_id)
    );

    functionSelect.innerHTML = `<option value="">Any</option>` + functionUses.map(value =>
    {
        return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
    }).join("");

    useCaseSelect.innerHTML = `<option value="">Any</option>` + useCases.map(value =>
    {
        return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
    }).join("");

    seriesSelect.innerHTML = `<option value="">Any</option>` + series.map(value =>
    {
        return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
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

    const standard = state.standards.find(row =>
    {
        return normalizeText(row.functionuse) === normalizeText(functionUse);
    });

    let preferredColor = "";
    let preferredSeries = "";
    let preferredBlockType = "";

    if (standard)
    {
        preferredColor = standard.preferredcolor || "";
        preferredSeries = standard.preferredseries || "";
        preferredBlockType = standard.preferredblocktype || "";
    }

    let filtered = state.blocks.filter(block =>
    {
        const blockFunctionUses = splitPipeValues(block.functionuse);
        const blockUseCases = splitPipeValues(block.usecase);

        const matchesFunction =
            !functionUse ||
            blockFunctionUses.some(value => normalizeText(value) === normalizeText(functionUse)) ||
            normalizeText(block.functionuse) === normalizeText(functionUse);

        const matchesUseCase =
            !useCase ||
            blockUseCases.some(value => normalizeText(value) === normalizeText(useCase));

        const matchesSeries =
            !seriesId ||
            normalizeText(block.series_id) === normalizeText(seriesId);

        const matchesFused =
            fused === "" ||
            String(block.isfused) === fused;

        return matchesFunction && matchesUseCase && matchesSeries && matchesFused;
    });

    if (filtered.length === 0 && standard)
    {
        filtered = state.blocks.filter(block =>
        {
            const matchesStandardColor =
                !preferredColor ||
                normalizeText(block.color) === normalizeText(preferredColor);

            const matchesStandardSeries =
                !preferredSeries ||
                normalizeText(block.series_id) === normalizeText(preferredSeries);

            return matchesStandardColor && matchesStandardSeries;
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

    if (filtered.length === 0)
    {
        results.innerHTML = "";
        status.textContent = "No matching terminals found.";
        return;
    }

    status.textContent = `Found ${filtered.length} matching terminal${filtered.length === 1 ? "" : "s"}.`;

    results.innerHTML = filtered.map(block =>
    {
        const series = state.series.find(row =>
        {
            return normalizeText(row.series_id) === normalizeText(block.series_id);
        });

        const preferredBadge = block.preferred ? `<span class="terminal-badge">Preferred</span>` : "";
        const fusedBadge = block.isfused ? `<span class="terminal-badge">Fused</span>` : "";
        const groundBadge = block.isgrounding ? `<span class="terminal-badge">Ground</span>` : "";

        return `
            <div class="terminal-result-card">
                <div class="terminal-result-header">
                    <div>
                        <div class="terminal-result-title">
                            ${escapeHtml(block.alias || "")}
                        </div>
                        <div>
                            ${escapeHtml(block.catno || "")}
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
                        ${escapeHtml(block.series_id || "")}
                    </div>
                    <div>
                        <span>Color</span>
                        ${escapeHtml(block.color || "")}
                    </div>
                    <div>
                        <span>Use Case</span>
                        ${escapeHtml(block.usecase || "")}
                    </div>
                    <div>
                        <span>Function</span>
                        ${escapeHtml(block.functionuse || "")}
                    </div>
                    <div>
                        <span>Connection</span>
                        ${escapeHtml(series ? series.connectiontype : "")}
                    </div>
                    <div>
                        <span>Wire Range</span>
                        ${escapeHtml(series ? series.wirerange : "")}
                    </div>
                    <div>
                        <span>Max Voltage</span>
                        ${escapeHtml(series ? series.maxvoltage : "")}
                    </div>
                    <div>
                        <span>Max Current</span>
                        ${escapeHtml(series ? series.maxcurrent : "")}
                    </div>
                    <div>
                        <span>Width</span>
                        ${escapeHtml(series && series.widthmm ? series.widthmm + " mm" : "")}
                    </div>
                    <div>
                        <span>Fuse Rating</span>
                        ${escapeHtml(block.fuserating || series?.fusemaxcurrent || "")}
                    </div>
                </div>

                ${block.partlink ? `
                    <a class="terminal-link" href="${escapeAttribute(block.partlink)}" target="_blank" rel="noopener noreferrer">
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
        if (normalizeText(block.series_id) === normalizeText(standard.preferredseries))
        {
            score += 50;
        }

        if (normalizeText(block.color) === normalizeText(standard.preferredcolor))
        {
            score += 30;
        }

        if (normalizeText(block.functionuse) === normalizeText(standard.functionuse))
        {
            score += 20;
        }
    }

    if (normalizeText(block.series_id).startsWith("PT"))
    {
        score += 10;
    }

    return score;
}

function splitPipeValues(value)
{
    if (!value)
    {
        return [];
    }

    return String(value)
        .split("|")
        .map(item => item.trim())
        .filter(item => item.length > 0);
}

function uniqueSorted(values)
{
    return [...new Set(
        values
            .filter(value => value !== null && value !== undefined)
            .map(value => String(value).trim())
            .filter(value => value.length > 0)
    )].sort(function(a, b)
    {
        return a.localeCompare(b);
    });
}

function normalizeText(value)
{
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace("feed-through", "feed through")
        .replace("a/c", "ac");
}

function escapeHtml(value)
{
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value)
{
    return escapeHtml(value);
}
