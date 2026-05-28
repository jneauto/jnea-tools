(function ()
{
  const SUPABASE_URL = "https://xxvvvipivmfmqfeevqok.supabase.co";

  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dnZ2aXBpdm1mbXFmZWV2cW9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NjUzNTMsImV4cCI6MjA5NTQ0MTM1M30.hLzj2g3RuRZRvssMG1tNg538ZdPfWHvofhMZta56lxA";

  let currentUser = null;
  let currentProfile = null;

  const sb = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth:
      {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "jnea-tools-auth"
      }
    }
  );

  const app = document.getElementById("app");

  window.jnea =
  {
    sb: sb,
    getCurrentUser: function ()
    {
      return currentUser;
    }
  };

  async function init()
  {
    const response = await sb.auth.getSession();

    if (
      response.error ||
      !response.data ||
      !response.data.session
    )
    {
      renderLogin();
      return;
    }

    currentUser = response.data.session.user;
    
    await loadCurrentProfile();

    renderAppShell();
    renderDashboard();
  }

  function renderLogin()
  {
    app.innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <div class="login-title">
            JNEA Tools
          </div>

          <div class="login-subtitle">
            Sign in to access engineering tools.
          </div>

          <div class="form-group">
            <label>Email</label>

            <input
              id="email"
              type="email"
              autocomplete="email"
            >
          </div>

          <div class="form-group">
            <label>Password</label>

            <input
              id="password"
              type="password"
              autocomplete="current-password"
            >
          </div>

          <button
            id="loginButton"
            class="login-button"
          >
            Log In
          </button>

          <div
            id="loginStatus"
            class="status"
          ></div>
        </div>
      </div>
    `;

    document
      .getElementById("loginButton")
      .addEventListener("click", handleLogin);
  }

  async function handleLogin()
  {
    const email = document
      .getElementById("email")
      .value
      .trim();

    const password = document
      .getElementById("password")
      .value;

    const status = document.getElementById("loginStatus");

    status.className = "status";
    status.textContent = "Logging in...";

    const response = await sb.auth.signInWithPassword(
    {
      email: email,
      password: password
    });

    if (response.error)
    {
      status.className = "status error";
      status.textContent = response.error.message;

      return;
    }

    status.className = "status good";
    status.textContent = "Login successful.";

    currentUser = response.data.user;
    
    await loadCurrentProfile();

    renderAppShell();
    renderDashboard();
  }

  async function handleLogout()
  {
    await sb.auth.signOut();

    currentUser = null;

    renderLogin();
  }

    async function loadCurrentProfile()
    {
      const response = await sb
        .from("profiles")
        .select("email, full_name")
        .eq("id", currentUser.id)
        .single();

      console.log("Profile response:", response);
    
      if (
        response.error ||
        !response.data
      )
      {
        currentProfile =
        {
          email: currentUser.email,
          full_name: ""
        };
    
        return;
      }
    
      currentProfile = response.data;
    }  

  function renderAppShell()
  {
    app.innerHTML = `
      <div class="app-shell">
        <div class="sidebar">
          <div class="logo">
            JNEA Tools
          </div>

          <div class="logo-subtitle">
            Engineering Utility Platform
          </div>

          <button class="nav-button" id="navDashboard">
            Dashboard
          </button>

          <button class="nav-button" id="navPlcCards">
            PLC Card Fusing
          </button>

          <button class="nav-button" id="navFuseGuide">
            Fuse Guide
          </button>

          <button class="nav-button" id="navKnowledge">
            Knowledge Files
          </button>

          <button class="nav-button" id="navAnalogScale">
            Analog Scaling
          </button>

        </div>

        <div class="main">
          <div class="topbar">
            <div class="topbar-title" id="pageTitle">
              Dashboard
            </div>

          <div class="user-box">
            <button
              id="profileButton"
              class="logout-button"
              type="button"
            >
              ${
                currentProfile &&
                currentProfile.full_name
                  ? currentProfile.full_name
                  : currentUser.email
              }
            </button>
          </div>
            
          </div>

          <div id="content"></div>
        </div>
      </div>
    `;

    document.getElementById("navDashboard").addEventListener("click", renderDashboard);
    document.getElementById("navPlcCards").addEventListener("click", renderPlcCardsPlaceholder);
    document.getElementById("navFuseGuide").addEventListener("click", renderFuseGuidePlaceholder);
    document.getElementById("navKnowledge").addEventListener("click", renderKnowledgePlaceholder);
    document.getElementById("navAnalogScale").addEventListener("click", renderAnalogScaleTool);
    document.getElementById("profileButton").addEventListener("click", function ()
    {
      window.location.href = "auth-profile.html";
    });    
  }

  function renderDashboard()
  {
    document.getElementById("pageTitle").textContent = "Dashboard";

    document.getElementById("content").innerHTML = `
      <div class="card">
        <h2>
          Welcome to JNEA Tools
        </h2>

        <p>
          You are now connected to Supabase successfully.
        </p>

        <p>
          Logged in as:
          <strong>${currentUser.email}</strong>
        </p>
      </div>

      <div class="card">
        <h3>
          Available Modules
        </h3>

        <ul>
          <li>PLC Card Fusing</li>
          <li>Fuse Selection</li>
          <li>Knowledge Files</li>
          <li>Terminal Block Selector</li>
          <li>Analog Scaling</li>
        </ul>
      </div>
    `;
  }
  
  window.renderDashboard = renderDashboard;
  init();
})();
