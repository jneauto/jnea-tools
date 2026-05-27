function renderKnowledgePlaceholder()
{
  document.getElementById("pageTitle").textContent = "Knowledge Files";

  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="card">
      <h2 style="margin-top:0;">
        Knowledge Files
      </h2>

      <p>
        Search how-to documents by topic, category, file type, or author.
      </p>

      <div class="kf-controls">
        <div class="kf-search-row">
          <input
            id="kfSearchInput"
            class="tool-input"
            type="search"
            placeholder="Search knowledge files... e.g. AutoCAD, PlantPAx, loop drawings"
          >

          <button
            id="kfClearBtn"
            class="login-button"
            type="button"
          >
            Clear
          </button>
        </div>

        <div class="kf-filter-row">
          <select id="kfCategoryFilter" class="tool-select">
            <option value="">All categories</option>
          </select>

          <select id="kfTopicFilter" class="tool-select">
            <option value="">All topics</option>
          </select>

          <select id="kfDocTypeFilter" class="tool-select">
            <option value="">All file types</option>
          </select>

          <select id="kfAuthorFilter" class="tool-select">
            <option value="">All authors</option>
          </select>

          <select id="kfSortSelect" class="tool-select">
            <option value="topicAsc">Sort: Topic A-Z</option>
            <option value="categoryAsc">Sort: Category A-Z</option>
            <option value="newest">Sort: Newest release</option>
            <option value="authorAsc">Sort: Author A-Z</option>
          </select>
        </div>

        <div class="kf-meta-row">
          <span id="kfResultCount">Loading files...</span>
          <span id="kfLastUpdated"></span>
        </div>
      </div>

      <section id="kfResults" class="kf-result-grid" aria-live="polite">
        <div class="kf-loading">Loading knowledge files...</div>
      </section>
    </div>
  `;

  wireKnowledgeFilesTool();
}

function wireKnowledgeFilesTool()
{
  const sb = window.jnea.sb;

  let allFiles = [];

  const els =
  {
    search: document.getElementById("kfSearchInput"),
    clear: document.getElementById("kfClearBtn"),
    category: document.getElementById("kfCategoryFilter"),
    topic: document.getElementById("kfTopicFilter"),
    docType: document.getElementById("kfDocTypeFilter"),
    author: document.getElementById("kfAuthorFilter"),
    sort: document.getElementById("kfSortSelect"),
    results: document.getElementById("kfResults"),
    count: document.getElementById("kfResultCount"),
    lastUpdated: document.getElementById("kfLastUpdated")
  };

  function hiddenValue(value)
  {
    return String(value || "").trim().startsWith("#");
  }

  function uniqueSorted(values)
  {
    return [...new Set(
      values
        .map(function (value)
        {
          return String(value || "").trim();
        })
        .filter(function (value)
        {
          return value && !hiddenValue(value);
        })
    )].sort(function (a, b)
    {
      return a.localeCompare(b);
    });
  }

  function fillSelect(select, values, defaultText)
  {
    const currentValue = select.value;
    const options = uniqueSorted(values);

    select.innerHTML = `<option value="">${escapeHtml(defaultText)}</option>`;

    options.forEach(function (value)
    {
      const option = document.createElement("option");

      option.value = value;
      option.textContent = value;

      select.appendChild(option);
    });

    select.value = options.includes(currentValue) ? currentValue : "";
  }

  function visibleFiles()
  {
    return allFiles.filter(function (file)
    {
      return (
        !hiddenValue(file.category) &&
        !hiddenValue(file.topic) &&
        !hiddenValue(file.filetype) &&
        !hiddenValue(file.author)
      );
    });
  }

  function populateFilters()
  {
    const visible = visibleFiles();

    const categoryScoped = visible.filter(function (file)
    {
      return !els.category.value || file.category === els.category.value;
    });

    const topicScoped = categoryScoped.filter(function (file)
    {
      return !els.topic.value || file.topic === els.topic.value;
    });

    const fileTypeScoped = topicScoped.filter(function (file)
    {
      return !els.docType.value || file.filetype === els.docType.value;
    });

    fillSelect(els.category, visible.map(function (file)
    {
      return file.category;
    }), "All categories");

    fillSelect(els.topic, categoryScoped.map(function (file)
    {
      return file.topic;
    }), "All topics");

    fillSelect(els.docType, topicScoped.map(function (file)
    {
      return file.filetype;
    }), "All file types");

    fillSelect(els.author, fileTypeScoped.map(function (file)
    {
      return file.author;
    }), "All authors");
  }

  function matchesSearch(file, query)
  {
    if (!query)
    {
      return true;
    }

    const haystack =
    [
      file.category,
      file.topic,
      file.filetype,
      file.author,
      file.releasedate,
      file.gid
    ].join(" ").toLowerCase();

    return query.toLowerCase().split(/\s+/).every(function (term)
    {
      return haystack.includes(term);
    });
  }

  function getFilteredFiles()
  {
    const query = els.search.value.trim();

    populateFilters();

    const files = visibleFiles().filter(function (file)
    {
      return (
        matchesSearch(file, query) &&
        (!els.category.value || file.category === els.category.value) &&
        (!els.topic.value || file.topic === els.topic.value) &&
        (!els.docType.value || file.filetype === els.docType.value) &&
        (!els.author.value || file.author === els.author.value)
      );
    });

    const sortMode = els.sort.value;

    files.sort(function (a, b)
    {
      if (sortMode === "newest")
      {
        return new Date(b.releasedate || 0) - new Date(a.releasedate || 0);
      }

      if (sortMode === "categoryAsc")
      {
        return `${a.category || ""} ${a.topic || ""}`.localeCompare(`${b.category || ""} ${b.topic || ""}`);
      }

      if (sortMode === "authorAsc")
      {
        return `${a.author || ""} ${a.topic || ""}`.localeCompare(`${b.author || ""} ${b.topic || ""}`);
      }

      return `${a.topic || ""} ${a.category || ""}`.localeCompare(`${b.topic || ""} ${b.category || ""}`);
    });

    return files;
  }

  function getPreviewLink(file)
  {
    if (!file.weblink)
    {
      return "#";
    }

    return `${file.weblink}/preview`;
  }

  function getEditLink(file)
  {
    if (!file.weblink)
    {
      return "#";
    }

    return `${file.weblink}/edit`;
  }

  function renderResults()
  {
    const files = getFilteredFiles();

    els.count.textContent = `${files.length} result${files.length === 1 ? "" : "s"} found`;

    if (!files.length)
    {
      els.results.className = "";
      els.results.innerHTML = `
        <div class="kf-empty">
          No knowledge files match your search.
        </div>
      `;

      return;
    }

    els.results.className = "kf-result-grid";

    els.results.innerHTML = files.map(function (file)
    {
      const title = file.topic || file.category || "Knowledge File";
      const previewLink = getPreviewLink(file);
      const editLink = getEditLink(file);

      return `
        <article class="kf-result-card">
          <h2 class="kf-result-title">
            <a
              href="${escapeAttribute(previewLink)}"
              target="_blank"
              rel="noopener noreferrer"
              title="Open preview"
            >
              ${escapeHtml(title)}
            </a>
          </h2>

          <div class="kf-card-actions">
            <a
              href="${escapeAttribute(file.weblink || "#")}"
              target="_blank"
              rel="noopener noreferrer"
              class="kf-btn-sm"
              title="Open file"
            >
              Open
            </a>

            <a
              href="${escapeAttribute(editLink)}"
              target="_blank"
              rel="noopener noreferrer"
              class="kf-btn-sm"
              title="Open in edit mode"
            >
              Edit
            </a>
          </div>

          <div class="kf-chip-row">
            ${file.filetype ? `<span class="kf-chip">${escapeHtml(file.filetype)}</span>` : ""}
            ${file.category ? `<span class="kf-chip">${escapeHtml(file.category)}</span>` : ""}
            ${file.topic ? `<span class="kf-chip">${escapeHtml(file.topic)}</span>` : ""}
          </div>

          <div class="kf-details">
            ${file.author ? `<span><strong>Author:</strong> ${escapeHtml(file.author)}</span>` : ""}
            ${file.releasedate ? `<span><strong>Release:</strong> ${escapeHtml(file.releasedate)}</span>` : ""}
            ${file.gid ? `<span><strong>Google ID:</strong> ${escapeHtml(file.gid)}</span>` : ""}
          </div>
        </article>
      `;
    }).join("");
  }

  async function loadFiles()
  {
    try
    {
      const response = await sb
        .from("v_knowledgefiles")
        .select("*")
        .order("category", { ascending: true })
        .order("topic", { ascending: true });

      if (response.error)
      {
        throw response.error;
      }

      allFiles = response.data || [];

      populateFilters();
      renderResults();

      els.lastUpdated.textContent = `Loaded ${new Date().toLocaleString()}`;
    }
    catch (error)
    {
      console.error("Knowledge files load error:", error);

      els.count.textContent = "Unable to load files";
      els.results.className = "";
      els.results.innerHTML = `
        <div class="kf-error">
          Could not load knowledge files from Supabase.
          <br>
          ${escapeHtml(error.message || "")}
        </div>
      `;
    }
  }

  [
    els.search,
    els.category,
    els.topic,
    els.docType,
    els.author,
    els.sort
  ].forEach(function (el)
  {
    el.addEventListener("input", renderResults);
    el.addEventListener("change", renderResults);
  });

  els.clear.addEventListener("click", function ()
  {
    els.search.value = "";
    els.category.value = "";
    els.topic.value = "";
    els.docType.value = "";
    els.author.value = "";
    els.sort.value = "topicAsc";

    renderResults();
    els.search.focus();
  });

  loadFiles();
}
