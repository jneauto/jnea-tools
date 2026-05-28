function renderAnalogScaleTool()
{
  document.getElementById("pageTitle").textContent = "Analog Scaling";

  const content = document.getElementById("content");

  content.innerHTML = `
    <style>
      .as-tool-wrap {
        max-width: 760px;
        margin: 0 auto;
      }

      .as-section-card {
        box-shadow: none;
        border: 1px solid #ddd;
      }

      .as-grid-2 {
        display: grid;
        grid-template-columns: repeat(2, minmax(180px, 260px));
        gap: 12px 16px;
        align-items: end;
      }

      .as-live-grid {
        display: grid;
        grid-template-columns: minmax(180px, 260px);
        gap: 12px;
      }

      .as-percent-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(44px, 1fr));
        gap: 8px;
        max-width: 420px;
        margin-bottom: 14px;
      }

      .as-percent-button {
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 9px 6px;
        background: #f8f8f8;
        cursor: pointer;
        font-weight: 700;
      }

      .as-percent-button:hover {
        background: #eeeeee;
      }

      .as-status-row {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 4px;
      }

      @media (max-width: 640px) {
        .as-tool-wrap {
          max-width: 100%;
        }

        .as-grid-2,
        .as-live-grid {
          grid-template-columns: 1fr;
        }

        .as-percent-grid {
          grid-template-columns: repeat(5, 1fr);
          max-width: 100%;
        }

        .as-section-card {
          padding-left: 14px;
          padding-right: 14px;
        }
      }
    </style>

    <div class="card">
      <div class="as-tool-wrap">
        <h2 style="margin-top:0;">
          Analog Scaling Tool
        </h2>

        <p>
          Convert raw analog values to engineering units, reverse-calculate raw input, and check fail limits.
        </p>

        <div style="display:grid;grid-template-columns:1fr;gap:18px;">
          <div class="card as-section-card">
            <h3 style="margin-top:0;">
              Scale Setup
            </h3>

            <div class="as-grid-2">
              <div class="form-group">
                <label for="asMinRaw">Min Raw</label>
                <input id="asMinRaw" class="tool-input" type="number" step="any">
              </div>

              <div class="form-group">
                <label for="asMaxRaw">Max Raw</label>
                <input id="asMaxRaw" class="tool-input" type="number" step="any">
              </div>

              <div class="form-group">
                <label for="asMinEU">Min EU</label>
                <input id="asMinEU" class="tool-input" type="number" step="any">
              </div>

              <div class="form-group">
                <label for="asMaxEU">Max EU</label>
                <input id="asMaxEU" class="tool-input" type="number" step="any">
              </div>
            </div>
          </div>

          <div class="card as-section-card">
            <h3 style="margin-top:0;">
              Live Calculation
            </h3>

            <div class="as-percent-grid">
              <button class="as-percent-button" type="button" data-percent="0">0%</button>
              <button class="as-percent-button" type="button" data-percent="0.25">25%</button>
              <button class="as-percent-button" type="button" data-percent="0.5">50%</button>
              <button class="as-percent-button" type="button" data-percent="0.75">75%</button>
              <button class="as-percent-button" type="button" data-percent="1">100%</button>
            </div>

            <div class="as-live-grid">
              <div class="form-group">
                <label for="asValIn">Raw Input</label>
                <input id="asValIn" class="tool-input" type="number" step="any">
              </div>

              <div class="form-group">
                <label for="asValOut">EU Value Out</label>
                <input id="asValOut" class="tool-input" type="number" step="any">
              </div>

              <div class="form-group">
                <label for="asmAIn">4–20 mA Input</label>
                <input id="asmAIn" class="tool-input" type="text" readonly>
              </div>
            </div>

            <div class="as-status-row">
              <div id="asFailLo" class="as-status-pill">
                Fail Lo
              </div>

              <div id="asFailHi" class="as-status-pill">
                Fail Hi
              </div>
            </div>
          </div>

          <div class="card as-section-card">
            <h3 style="margin-top:0;">
              Fail Limits
            </h3>

            <div class="as-grid-2">
              <div class="form-group">
                <label for="asMinFail">Min EU Fail</label>
                <input id="asMinFail" class="tool-input" type="text" readonly>
              </div>

              <div class="form-group">
                <label for="asMaxFail">Max EU Fail</label>
                <input id="asMaxFail" class="tool-input" type="text" readonly>
              </div>
            </div>
          </div>
        </div>

        <p class="status">
          Fail limits use the original VB.NET logic: raw span × 0.003125 is subtracted from Min Raw and added to Max Raw, then converted to engineering units.
        </p>
      </div>
    </div>
  `;

  wireAnalogScaleTool();
}

function wireAnalogScaleTool()
{
  const storageKey = "jneAnalogScaleSettings";

  const fields =
  {
    minRaw: document.getElementById("asMinRaw"),
    maxRaw: document.getElementById("asMaxRaw"),
    minEU: document.getElementById("asMinEU"),
    maxEU: document.getElementById("asMaxEU"),
    valIn: document.getElementById("asValIn"),
    valOut: document.getElementById("asValOut"),
    mAIn: document.getElementById("asmAIn"),
    minFail: document.getElementById("asMinFail"),
    maxFail: document.getElementById("asMaxFail"),
    failLo: document.getElementById("asFailLo"),
    failHi: document.getElementById("asFailHi")
  };

  const defaults =
  {
    minRaw: 4000,
    maxRaw: 20000,
    minEU: 0,
    maxEU: 100,
    valIn: 4000
  };

  function toNumber(input)
  {
    const value = parseFloat(input.value);

    return Number.isFinite(value) ? value : null;
  }

  function round3(value)
  {
    return Math.round(value * 1000) / 1000;
  }

  function calculateValue(rawVal)
  {
    const minRaw = toNumber(fields.minRaw);
    const maxRaw = toNumber(fields.maxRaw);
    const minEU = toNumber(fields.minEU);
    const maxEU = toNumber(fields.maxEU);

    if ([minRaw, maxRaw, minEU, maxEU].some(function (value)
    {
      return value === null;
    }))
    {
      return null;
    }

    if (maxRaw === minRaw)
    {
      return null;
    }

    return round3((((rawVal - minRaw) / (maxRaw - minRaw)) * (maxEU - minEU)) + minEU);
  }

  function calculateRawFromEU(euVal)
  {
    const minRaw = toNumber(fields.minRaw);
    const maxRaw = toNumber(fields.maxRaw);
    const minEU = toNumber(fields.minEU);
    const maxEU = toNumber(fields.maxEU);

    if ([minRaw, maxRaw, minEU, maxEU].some(function (value)
    {
      return value === null;
    }))
    {
      return null;
    }

    if (maxEU === minEU)
    {
      return null;
    }

    return round3(((euVal - minEU) / (maxEU - minEU)) * (maxRaw - minRaw) + minRaw);
  }

  function calculateMAFromEU(euVal)
  {
    const minEU = toNumber(fields.minEU);
    const maxEU = toNumber(fields.maxEU);

    if ([minEU, maxEU].some(function (value)
    {
      return value === null;
    }))
    {
      return null;
    }

    if (maxEU === minEU)
    {
      return null;
    }

    return round3(((euVal - minEU) / (maxEU - minEU)) * 16 + 4);
  }

  function calculateLimits()
  {
    const minRaw = toNumber(fields.minRaw);
    const maxRaw = toNumber(fields.maxRaw);

    if (minRaw === null || maxRaw === null)
    {
      return;
    }

    const span = (maxRaw - minRaw) * 0.003125;
    const minPoint = minRaw - span;
    const maxPoint = maxRaw + span;

    fields.minFail.value = calculateValue(minPoint);
    fields.maxFail.value = calculateValue(maxPoint);
  }

  function testWithinLimits()
  {
    const valOut = parseFloat(fields.valOut.value);
    const minFail = parseFloat(fields.minFail.value);
    const maxFail = parseFloat(fields.maxFail.value);

    const valid = [valOut, minFail, maxFail].every(Number.isFinite);

    fields.failLo.classList.toggle("show", valid && valOut <= minFail);
    fields.failHi.classList.toggle("show", valid && valOut >= maxFail);
  }

  function saveSettings()
  {
    const data =
    {
      minRaw: fields.minRaw.value,
      maxRaw: fields.maxRaw.value,
      minEU: fields.minEU.value,
      maxEU: fields.maxEU.value,
      valIn: fields.valIn.value
    };

    localStorage.setItem(storageKey, JSON.stringify(data));
  }

  function calculateFromRaw()
  {
    const rawVal = toNumber(fields.valIn);

    if (rawVal === null)
    {
      return;
    }

    const euVal = calculateValue(rawVal);

    fields.valOut.value = euVal === null ? "" : euVal;

    const maVal = calculateMAFromEU(euVal);

    fields.mAIn.value = maVal === null ? "" : maVal;

    calculateLimits();
    testWithinLimits();
    saveSettings();
  }

  function calculateFromEU()
  {
    const euVal = toNumber(fields.valOut);

    if (euVal === null)
    {
      return;
    }

    const rawVal = calculateRawFromEU(euVal);

    fields.valIn.value = rawVal === null ? "" : rawVal;

    const maVal = calculateMAFromEU(euVal);

    fields.mAIn.value = maVal === null ? "" : maVal;

    calculateLimits();
    testWithinLimits();
    saveSettings();
  }

  function setRawByPercent(percent)
  {
    const minRaw = toNumber(fields.minRaw);
    const maxRaw = toNumber(fields.maxRaw);

    if (minRaw === null || maxRaw === null)
    {
      return;
    }

    const rawVal = minRaw + ((maxRaw - minRaw) * percent);

    fields.valIn.value = round3(rawVal);

    calculateFromRaw();
  }

  function loadSettings()
  {
    let saved = {};

    try
    {
      saved = JSON.parse(localStorage.getItem(storageKey)) || {};
    }
    catch (err)
    {
      saved = {};
    }

    fields.minRaw.value = saved.minRaw ?? defaults.minRaw;
    fields.maxRaw.value = saved.maxRaw ?? defaults.maxRaw;
    fields.minEU.value = saved.minEU ?? defaults.minEU;
    fields.maxEU.value = saved.maxEU ?? defaults.maxEU;
    fields.valIn.value = saved.valIn ?? defaults.valIn;
  }

  [fields.minRaw, fields.maxRaw, fields.minEU, fields.maxEU].forEach(function (input)
  {
    input.addEventListener("input", calculateFromRaw);
  });

  fields.valIn.addEventListener("input", calculateFromRaw);
  fields.valOut.addEventListener("input", calculateFromEU);

  document.querySelectorAll(".as-percent-button").forEach(function (button)
  {
    button.addEventListener("click", function ()
    {
      setRawByPercent(parseFloat(button.dataset.percent));
    });
  });

  loadSettings();
  calculateFromRaw();
}
