async function renderPlcCardsPlaceholder()
{
  const sb = window.jnea.sb;

  document.getElementById("pageTitle").textContent = "PLC Card Fusing";

  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="card">
      Loading PLC card database...
    </div>
  `;

  try
  {
    const plcResponse = await sb
      .from("plccards")
      .select("*")
      .order("cardpartnumber");

    if (plcResponse.error)
    {
      throw plcResponse.error;
    }

    const fuseHolderResponse = await sb
      .from("fuseholdercatalog")
      .select("*");

    if (fuseHolderResponse.error)
    {
      throw fuseHolderResponse.error;
    }

    const fuseResponse = await sb
      .from("fusecatalog")
      .select("*");

    if (fuseResponse.error)
    {
      throw fuseResponse.error;
    }

    renderPlcTool(
      plcResponse.data || [],
      fuseHolderResponse.data || [],
      fuseResponse.data || []
    );
  }
  catch (err)
  {
    console.error("PLC card load error:", err);

    content.innerHTML = `
      <div class="card">
        <h2>PLC Card Fusing</h2>

        <div style="color:#c62828;font-weight:bold;">
          Could not load PLC card data.
        </div>

        <pre>${err.message}</pre>
      </div>
    `;
  }
}

function renderPlcTool(cards, fuseHolders, fuses)
{
  let answers =
  {
    mfg: "",
    series: "",
    cardtype: "",
    ac_dc: "",
    cardpartnumber: ""
  };

  function render()
  {
    const filteredForSeries = cards.filter(function (card)
    {
      return !answers.mfg || card.mfg === answers.mfg;
    });

    const filteredForType = cards.filter(function (card)
    {
      return (
        (!answers.mfg || card.mfg === answers.mfg) &&
        (!answers.series || card.series === answers.series)
      );
    });

    const filteredForAcDc = cards.filter(function (card)
    {
      return (
        (!answers.mfg || card.mfg === answers.mfg) &&
        (!answers.series || card.series === answers.series) &&
        (!answers.cardtype || card.cardtype === answers.cardtype)
      );
    });

    const filteredForCard = filterPlcCards(cards, answers);
    const selected = getSelectedPlcCard(cards, answers);
    const holderPartNumber = getHolderPartNumber(selected, answers.ac_dc);

    document.getElementById("content").innerHTML = `
      <div class="card">
        <h2 style="margin-top:0;">
          PLC Card Fusing Guide
        </h2>

        <p>
          Select a PLC card and view the preferred fuse holder and fuse.
        </p>

        <div class="form-group">
          <label for="plcSearch">Search Part Number</label>

          <input
            id="plcSearch"
            class="tool-input"
            type="text"
            placeholder="Start typing a card part number..."
            autocomplete="off"
          >

          <div id="plcSearchResults" class="search-results"></div>
        </div>

        ${renderPlcSelect("Manufacturer", "mfg", uniqueValues(cards, "mfg"), answers.mfg)}
        ${renderPlcSelect("Series", "series", uniqueValues(filteredForSeries, "series"), answers.series)}
        ${renderPlcSelect("Card Type", "cardtype", uniqueValues(filteredForType, "cardtype"), answers.cardtype)}
        ${renderPlcSelect("AC / DC", "ac_dc", uniqueSplitValues(filteredForAcDc, "ac_dc"), answers.ac_dc)}
        ${renderPlcSelect("Card Part Number", "cardpartnumber", uniqueValues(filteredForCard, "cardpartnumber"), answers.cardpartnumber)}

        <div id="plcResultArea"></div>
      </div>
    `;

    ["mfg", "series", "cardtype", "ac_dc", "cardpartnumber"].forEach(function (id)
    {
      document.getElementById(id).addEventListener("change", function (event)
      {
        answers[id] = event.target.value;

        if (id === "mfg")
        {
          answers.series = "";
          answers.cardtype = "";
          answers.ac_dc = "";
          answers.cardpartnumber = "";
        }

        if (id === "series")
        {
          answers.cardtype = "";
          answers.ac_dc = "";
          answers.cardpartnumber = "";
        }

        if (id === "cardtype")
        {
          answers.ac_dc = "";
          answers.cardpartnumber = "";
        }

        if (id === "ac_dc")
        {
          answers.cardpartnumber = "";
        }

        render();
      });
    });

    wirePlcSearch(cards, answers, render);

    renderSelectedPlcResult(
      selected,
      holderPartNumber,
      fuseHolders,
      fuses,
      answers
    );
  }

  render();
}

function renderPlcSelect(label, id, options, value)
{
  return `
    <div class="form-group">
      <label>${label}</label>

      <select id="${id}" class="tool-select">
        <option value="">Select...</option>

        ${options.map(function (option)
        {
          return `
            <option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>
              ${escapeHtml(option)}
            </option>
          `;
        }).join("")}
      </select>
    </div>
  `;
}

function filterPlcCards(cards, answers)
{
  return cards.filter(function (card)
  {
    if (answers.mfg && card.mfg !== answers.mfg)
    {
      return false;
    }

    if (answers.series && card.series !== answers.series)
    {
      return false;
    }

    if (answers.cardtype && card.cardtype !== answers.cardtype)
    {
      return false;
    }

    if (answers.ac_dc)
    {
      const cardTypes = String(card.ac_dc || "").split("|").map(function (value)
      {
        return value.trim();
      });

      if (!cardTypes.includes(answers.ac_dc))
      {
        return false;
      }
    }

    return true;
  });
}

function getSelectedPlcCard(cards, answers)
{
  return cards.find(function (card)
  {
    const cardTypes = String(card.ac_dc || "").split("|").map(function (value)
    {
      return value.trim();
    });

    return (
      card.mfg === answers.mfg &&
      card.series === answers.series &&
      card.cardtype === answers.cardtype &&
      card.cardpartnumber === answers.cardpartnumber &&
      cardTypes.includes(answers.ac_dc)
    );
  });
}

function getHolderPartNumber(card, acDc)
{
  if (!card)
  {
    return "";
  }

  if (acDc === "DC")
  {
    return card.recommendeddcholderpartnumber || "";
  }

  return card.recommendedacholderpartnumber || "";
}

function wirePlcSearch(cards, answers, render)
{
  const searchInput = document.getElementById("plcSearch");
  const searchResults = document.getElementById("plcSearchResults");

  const searchCards = [];

  cards.forEach(function (card)
  {
    const acdcValues = String(card.ac_dc || "")
      .split("|")
      .map(function (value)
      {
        return value.trim();
      })
      .filter(Boolean);

    acdcValues.forEach(function (acdc)
    {
      searchCards.push(
      {
        card: card,
        acdc: acdc,
        label: `${card.cardpartnumber} (${acdc})`
      });
    });
  });

  searchInput.addEventListener("input", function ()
  {
    const term = searchInput.value.trim().toUpperCase();

    searchResults.innerHTML = "";

    if (!term)
    {
      searchResults.style.display = "none";
      return;
    }

    const matches = searchCards
      .filter(function (item)
      {
        return String(item.card.cardpartnumber || "")
          .toUpperCase()
          .includes(term);
      })
      .slice(0, 20);

    if (!matches.length)
    {
      searchResults.style.display = "none";
      return;
    }

    matches.forEach(function (item)
    {
      const div = document.createElement("div");

      div.className = "search-item";
      div.textContent = item.label;

      div.addEventListener("click", function ()
      {
        answers.mfg = item.card.mfg;
        answers.series = item.card.series;
        answers.cardtype = item.card.cardtype;
        answers.ac_dc = item.acdc;
        answers.cardpartnumber = item.card.cardpartnumber;

        render();
      });

      searchResults.appendChild(div);
    });

    searchResults.style.display = "block";
  });
}

function renderSelectedPlcResult(card, holderPartNumber, fuseHolders, fuses, answers)
{
  const resultArea = document.getElementById("plcResultArea");

  if (!card)
  {
    resultArea.innerHTML = "";
    return;
  }

  const holderSpecs = findByPartNumber(fuseHolders, holderPartNumber);
  const fuseSpecs = findByPartNumber(fuses, card.recommendedfusepartnumber);

  resultArea.innerHTML = `
    <div
      style="
        margin-top:20px;
        border-left:5px solid #0193cf;
        padding:18px;
        border-radius:14px;
        background:#f8fbfd;
      "
    >
      <h2 style="margin-top:0;color:#0193cf;">
        ${escapeHtml(card.cardpartnumber || "")}
      </h2>

      <div style="font-size:15px;font-weight:bold;margin-bottom:8px;">
        Recommended Fuse Holder:
      </div>

      <div style="font-size:26px;font-weight:bold;color:#0193cf;margin-bottom:18px;">
        ${escapeHtml(holderPartNumber || "No Match Found")}
      </div>

      <div style="font-size:15px;font-weight:bold;margin-bottom:8px;">
        Recommended Fuse:
      </div>

      <div style="font-size:26px;font-weight:bold;color:#0193cf;margin-bottom:18px;">
        ${escapeHtml(card.recommendedfusepartnumber || "No Match Found")}
      </div>

      <div style="border-top:1px solid #ddd;padding-top:14px;margin-top:16px;">
        <strong>PLC Card Specs:</strong>
        <div>Manufacturer: ${escapeHtml(card.mfg || "")}</div>
        <div>Series: ${escapeHtml(card.series || "")}</div>
        <div>Card Type: ${escapeHtml(card.cardtype || "")}</div>
        <div>AC / DC: ${escapeHtml(answers.ac_dc || card.ac_dc || "")}</div>
        <div>Description: ${escapeHtml(card.description || "")}</div>
      </div>

      <div style="border-top:1px solid #ddd;padding-top:14px;margin-top:16px;">
        <strong>Notes:</strong>
        <div>${escapeHtml(card.notes || "No notes.")}</div>

        ${
          card.partlink
            ? `
              <div style="margin-top:10px;">
                <strong>Part Link:</strong>
                <a href="${escapeAttribute(card.partlink)}" target="_blank" rel="noopener noreferrer">
                  Open Link
                </a>
              </div>
            `
            : ""
        }
      </div>

      ${renderSpecs("Fuse Holder Specs:", holderSpecs, holderPartNumber)}
      ${renderSpecs("Fuse Specs:", fuseSpecs, card.recommendedfusepartnumber)}
    </div>
  `;
}

function renderSpecs(title, specs, fallbackPartNumber)
{
  if (!fallbackPartNumber)
  {
    return "";
  }

  if (!specs)
  {
    return `
      <div style="border-top:1px solid #ddd;padding-top:14px;margin-top:16px;">
        <strong>${title}</strong>
        <div>Part Number: ${escapeHtml(fallbackPartNumber)}</div>
        <div>No specs found.</div>
      </div>
    `;
  }

  const rows = Object.keys(specs)
    .filter(function (key)
    {
      return String(specs[key] || "").trim() !== "";
    })
    .map(function (key)
    {
      const value = String(specs[key] || "").trim();

      if (key === "partlink")
      {
        return `
          <div>
            <strong>${escapeHtml(niceLabel(key))}:</strong>
            <a href="${escapeAttribute(value)}" target="_blank" rel="noopener noreferrer">
              Open Link
            </a>
          </div>
        `;
      }

      return `
        <div>
          <strong>${escapeHtml(niceLabel(key))}:</strong>
          ${escapeHtml(value)}
        </div>
      `;
    })
    .join("");

  return `
    <div style="border-top:1px solid #ddd;padding-top:14px;margin-top:16px;">
      <strong>${title}</strong>
      ${rows}
    </div>
  `;
}
