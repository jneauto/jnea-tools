function renderKnowledgePlaceholder()
{
  document.getElementById("pageTitle").textContent = "Knowledge Files";

  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="card">
        <div id="kfAccessNotice" class="kf-access-notice">
          Loading access instructions...
        </div>
      <h2 style="margin-top:0;">
        Knowledge Files
      </h2>

      <p>
        Search how-to documents by topic, category, file type, or author.
      </p>

      accessNotice: document.getElementById("kfAccessNotice"),

      <div id="kfAdminRow" class="kf-admin-row" style="display:none;">
        <button id="kfAddBtn" class="login-button" type="button" style="width:auto;">
          Add Knowledge File
        </button>
      </div>

      <div class="kf-controls">
        <div class="kf-search-row">
          <input
            id="kfSearchInput"
            class="tool-input"
            type="search"
            placeholder="Search knowledge files..."
          >

          <button id="kfClearBtn" class="login-button" type="button">
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

    <dialog id="kfDialog" class="kf-dialog">
      <form id="kfForm" class="kf-dialog-body" method="dialog">
        <h2 id="kfDialogTitle" style="margin-top:0;">
          Add Knowledge File
        </h2>

        <input id="kfId" type="hidden">

        <div class="form-group">
          <label for="kfFiletype">File Type</label>
          <select id="kfFiletype" class="tool-select" required>
            <option value="document">document</option>
            <option value="presentation">presentation</option>
          </select>
        </div>

        <div class="form-group">
          <label for="kfCategory">Category</label>
          <input id="kfCategory" class="tool-input" type="text" required>
        </div>

        <div class="form-group">
          <label for="kfTopic">Topic</label>
          <input id="kfTopic" class="tool-input" type="text" required>
        </div>

        <div class="form-group">
          <label for="kfAuthor">Author</label>
          <input id="kfAuthor" class="tool-input" type="text">
        </div>

        <div class="form-group">
          <label for="kfReleaseDate">Release Date</label>
          <input id="kfReleaseDate" class="tool-input" type="date">
        </div>

        <div class="form-group">
          <label for="kfGid">Google ID or Google Link</label>
          <input id="kfGid" class="tool-input" type="text" required>
        </div>

        <div id="kfDialogStatus" class="status"></div>

        <div class="kf-dialog-actions">
          <button id="kfCancelBtn" class="kf-secondary-button" type="button">
            Cancel
          </button>

          <button class="login-button" type="submit" style="width:auto;">
            Save
          </button>
        </div>
      </form>
    </dialog>
  `;

  wireKnowledgeFilesTool();
}

function wireKnowledgeFilesTool()
{
  const sb = window.jnea.sb;

  let allFiles = [];
  let isAdmin = false;

  const els =
  {
    adminRow: document.getElementById("kfAdminRow"),
    add: document.getElementById("kfAddBtn"),
    search: document.getElementById("kfSearchInput"),
    clear: document.getElementById("kfClearBtn"),
    category: document.getElementById("kfCategoryFilter"),
    topic: document.getElementById("kfTopicFilter"),
    docType: document.getElementById("kfDocTypeFilter"),
    author: document.getElementById("kfAuthorFilter"),
    sort: document.getElementById("kfSortSelect"),
    results: document.getElementById("kfResults"),
    count: document.getElementById("kfResultCount"),
    lastUpdated: document.getElementById("kfLastUpdated"),
    dialog: document.getElementById("kfDialog"),
    form: document.getElementById("kfForm"),
    dialogTitle: document.getElementById("kfDialogTitle"),
    id: document.getElementById("kfId"),
    filetype: document.getElementById("kfFiletype"),
    categoryInput: document.getElementById("kfCategory"),
    topicInput: document.getElementById("kfTopic"),
    authorInput: document.getElementById("kfAuthor"),
    releaseDateInput: document.getElementById("kfReleaseDate"),
    gidInput: document.getElementById("kfGid"),
    dialogStatus: document.getElementById("kfDialogStatus"),
    cancel: document.getElementById("kfCancelBtn")
  };

  function hiddenValue(value)
  {
    return String(value || "").trim().startsWith("#");
  }

  function extractGoogleId(value)
  {
    const text = String(value || "").trim();

    const match = text.match(/\/d\/([a-zA-Z0-9_-]+)/);

    if (match && match[1])
    {
      return match[1];
    }

    const idMatch = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);

    if (idMatch && idMatch[1])
    {
      return idMatch[1];
    }

    return text;
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

  function openDialog(file)
  {
    els.dialogStatus.className = "status";
    els.dialogStatus.textContent = "";

    if (file)
    {
      els.dialogTitle.textContent = "Edit Knowledge File";
      els.id.value = file.id;
      els.filetype.value = file.filetype || "document";
      els.categoryInput.value = file.category || "";
      els.topicInput.value = file.topic || "";
      els.authorInput.value = file.author || "";
      els.releaseDateInput.value = file.releasedate || "";
      els.gidInput.value = file.gid || "";
    }
    else
    {
      els.dialogTitle.textContent = "Add Knowledge File";
      els.id.value = "";
      els.filetype.value = "document";
      els.categoryInput.value = "";
      els.topicInput.value = "";
      els.authorInput.value = "";
      els.releaseDateInput.value = new Date().toISOString().slice(0, 10);
      els.gidInput.value = "";
    }

    els.dialog.showModal();
  }

  async function saveDialog()
  {
    const id = els.id.value;

    const payload =
    {
      filetype: els.filetype.value,
      category: els.categoryInput.value.trim(),
      topic: els.topicInput.value.trim(),
      author: els.authorInput.value.trim(),
      releasedate: els.releaseDateInput.value || null,
      gid: extractGoogleId(els.gidInput.value)
    };

    els.dialogStatus.className = "status";
    els.dialogStatus.textContent = "Saving...";

    let response;

    if (id)
    {
      response = await sb
        .from("knowledgefiles")
        .update(payload)
        .eq("id", id);
    }
    else
    {
      response = await sb
        .from("knowledgefiles")
        .insert(payload);
    }

    if (response.error)
    {
      els.dialogStatus.className = "status error";
      els.dialogStatus.textContent = response.error.message;
      return;
    }

    els.dialog.close();

    await loadFiles();
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
      const previewLink = file.weblink ? `${file.weblink}/preview` : "#";
      const editLink = file.weblink ? `${file.weblink}/edit` : "#";

      return `
        <article class="kf-result-card">
          <h2 class="kf-result-title">
            <a
              href="${escapeAttribute(previewLink)}"
              target="_blank"
              rel="noopener noreferrer"
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
            >
              Open
            </a>

            <a
              href="${escapeAttribute(editLink)}"
              target="_blank"
              rel="noopener noreferrer"
              class="kf-btn-sm"
            >
              Edit File
            </a>

            ${
              isAdmin
                ? `
                  <button
                    class="kf-btn-sm"
                    type="button"
                    data-kf-edit-id="${escapeAttribute(file.id)}"
                    style="border:0;cursor:pointer;"
                  >
                    Edit Record
                  </button>
                `
                : ""
            }
          </div>

          <div class="kf-chip-row">
            ${file.filetype ? `<span class="kf-chip">${escapeHtml(file.filetype)}</span>` : ""}
            ${file.category ? `<span class="kf-chip">${escapeHtml(file.category)}</span>` : ""}
            ${file.topic ? `<span class="kf-chip">${escapeHtml(file.topic)}</span>` : ""}
          </div>

          <div class="kf-details">
            ${file.author ? `<span><strong>Author:</strong> ${escapeHtml(file.author)}</span>` : ""}
            ${file.releasedate ? `<span><strong>Release:</strong> ${escapeHtml(file.releasedate)}</span>` : ""}
          </div>
        </article>
      `;
    }).join("");

    document.querySelectorAll("[data-kf-edit-id]").forEach(function (button)
    {
      button.addEventListener("click", function ()
      {
        const file = allFiles.find(function (item)
        {
          return String(item.id) === String(button.dataset.kfEditId);
        });

        openDialog(file);
      });
    });
  }

  async function renderAccessNotice()
  {
    const response = await sb
      .from("profiles")
      .select("full_name")
      .eq("is_admin", true)
      .order("full_name", { ascending: true });

    if (response.error)
    {
      els.accessNotice.innerHTML = `
        If you cannot view the files, you need to
        <a
          href="https://docs.google.com/presentation/d/1iydnc_Uu6EwbDLOqiJ4Z3PKiGdBK5Cn9tVbxODZNGQM/preview"
          target="_blank"
          rel="noopener noreferrer"
        >
          complete this procedure
        </a>
        and request access to the Google Drive from an administrator.
      `;

      return;
    }

    const adminNames = (response.data || [])
      .map(function (profile)
      {
        return String(profile.full_name || "").trim().split(/\s+/)[0];
      })
      .filter(Boolean);

    const adminText = adminNames.length
      ? adminNames.join(", ")
      : "an administrator";

    els.accessNotice.innerHTML = `
      If you cannot view the files, you need to
      <a
        href="https://docs.google.com/presentation/d/1iydnc_Uu6EwbDLOqiJ4Z3PKiGdBK5Cn9tVbxODZNGQM/preview"
        target="_blank"
        rel="noopener noreferrer"
      >
        complete this procedure
      </a>
      and request access to the Google Drive from: ${escapeHtml(adminText)}.
    `;
  }  

  async function checkAdmin()
  {
    const user = window.jnea.getCurrentUser();

    if (!user)
    {
      isAdmin = false;
      return;
    }

    const response = await sb
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    isAdmin = !response.error && response.data && response.data.is_admin === true;

    els.adminRow.style.display = isAdmin ? "flex" : "none";
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

  els.add.addEventListener("click", function ()
  {
    openDialog(null);
  });

  els.cancel.addEventListener("click", function ()
  {
    els.dialog.close();
  });

  els.form.addEventListener("submit", function (event)
  {
    event.preventDefault();
    saveDialog();
  });

  renderAccessNotice();
  checkAdmin().then(loadFiles);
}
