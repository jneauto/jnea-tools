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
