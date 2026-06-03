async function renderControlPanelEngineeringReportPlaceholder()
{
    const sb = window.jnea.sb;
    const currentUser = window.jnea.getCurrentUser();

    document.getElementById("pageTitle").textContent = "Industrial Control Panel Engineering Report";

    const content = document.getElementById("content");

    content.innerHTML = `
        <div class="card">
            Loading engineering report tool...
        </div>
    `;

    try
    {
        const projectsResponse = await sb
            .from("control_panel_projects")
            .select("*")
            .eq("created_by", currentUser.id)
            .order("updated_at", { ascending: false });

        if (projectsResponse.error)
        {
            throw projectsResponse.error;
        }

        renderControlPanelEngineeringReportTool(projectsResponse.data || []);
    }
    catch (err)
    {
        console.error("Engineering report load error:", err);

        content.innerHTML = `
            <div class="card">
                <h2>Industrial Control Panel Engineering Report</h2>

                <div style="color:#c62828;font-weight:bold;">
                    Could not load saved projects.
                </div>

                <pre>${cperEscapeHtml(err.message)}</pre>
            </div>
        `;
    }
}

function renderControlPanelEngineeringReportTool(savedProjects)
{
    let selectedProjectId = "";
    let currentProject = null;
    let answers = {};

    function render()
    {
        document.getElementById("content").innerHTML = `
            <div class="card">
                <h2 style="margin-top:0;">
                    Industrial Control Panel Engineering Report
                </h2>

                <p>
                    Select a saved questionnaire project to generate an engineering report.
                </p>

                <div class="card" style="box-shadow:none;border:1px solid #ddd;">
                    <h3 style="margin-top:0;">
                        Project
                    </h3>

                    <div class="form-group">
                        <label>Saved Project</label>

                        <select id="cperProjectSelect" class="tool-select">
                            <option value="">Select a project...</option>

                            ${savedProjects.map(function (project)
                            {
                                return `
                                    <option value="${cperEscapeHtml(project.id)}" ${selectedProjectId === project.id ? "selected" : ""}>
                                        ${cperEscapeHtml(project.project_name || "Untitled Project")}
                                        ${project.customer_name ? " - " + cperEscapeHtml(project.customer_name) : ""}
                                    </option>
                                `;
                            }).join("")}
                        </select>
                    </div>
                </div>

                <div id="cperReportArea" style="margin-top:18px;">
                    ${currentProject ? renderEngineeringReport() : ""}
                </div>
            </div>
        `;

        bindEvents();
    }

    function bindEvents()
    {
        document.getElementById("cperProjectSelect").addEventListener("change", function (event)
        {
            selectedProjectId = event.target.value;

            currentProject = savedProjects.find(function (project)
            {
                return project.id === selectedProjectId;
            }) || null;

            answers = cperClone(currentProject?.answers || {});

            render();
        });
    }

    function renderEngineeringReport()
    {
        return `
            <div class="card" style="border-left:5px solid #0193cf;">
                <div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;">
                    <div>
                        <h2 style="margin-top:0;margin-bottom:6px;">
                            Engineering Report
                        </h2>

                        <div class="status">
                            <strong>Project:</strong> ${cperEscapeHtml(currentProject.project_name || "")}
                            <br>
                            <strong>Customer:</strong> ${cperEscapeHtml(currentProject.customer_name || "")}
                            <br>
                            <strong>Generated:</strong> ${cperEscapeHtml(new Date().toLocaleString())}
                        </div>
                    </div>

                    <div>
                        <button class="login-button" type="button" style="width:auto;" onclick="window.print();">
                            Print
                        </button>
                    </div>
                </div>

                ${cperRenderSection("Project Summary", [
                    ["Project Name", answers.projectName || currentProject.project_name],
                    ["Customer Name", answers.customerName || currentProject.customer_name],
                    ["Application", answers.application || answers.applicationType],
                    ["Installation Location", answers.installationLocation],
                    ["Environment", answers.environment],
                    ["Notes", answers.projectNotes || answers.notes]
                ])}

                ${cperRenderSection("Electrical Requirements", [
                    ["Supply Voltage", answers.supplyVoltage],
                    ["Phase", answers.phase],
                    ["Frequency", answers.frequency],
                    ["Full Load Current", cperFormatWithUnit(answers.fullLoadCurrent, "A")],
                    ["Short Circuit Current Rating Required", cperFormatWithUnit(answers.sccrRequired, "kA")],
                    ["Main Disconnect Required", answers.mainDisconnectRequired],
                    ["Control Voltage", answers.controlVoltage],
                    ["Power Supply Required", answers.powerSupplyRequired],
                    ["UPS Required", answers.upsRequired]
                ])}

                ${cperRenderSection("Panel Construction", [
                    ["Enclosure Type", answers.enclosureType],
                    ["Enclosure Rating", answers.enclosureRating],
                    ["Enclosure Material", answers.enclosureMaterial],
                    ["Mounting", answers.mountingType],
                    ["Estimated Panel Size", answers.panelSize],
                    ["Cooling Required", answers.coolingRequired],
                    ["Heating Required", answers.heatingRequired],
                    ["Lighting Required", answers.panelLightingRequired],
                    ["Receptacle Required", answers.receptacleRequired]
                ])}

                ${cperRenderSection("Controls And Automation", [
                    ["PLC Required", answers.plcRequired],
                    ["PLC Platform", answers.plcPlatform],
                    ["HMI Required", answers.hmiRequired],
                    ["HMI Size", answers.hmiSize],
                    ["Network Type", answers.networkType],
                    ["Remote I/O Required", answers.remoteIoRequired],
                    ["Safety PLC Required", answers.safetyPlcRequired],
                    ["VFDs Required", answers.vfdsRequired],
                    ["Servo Drives Required", answers.servoDrivesRequired]
                ])}

                ${cperRenderSection("Standards And Compliance", [
                    ["Applicable Standard", answers.applicableStandard],
                    ["UL 508A Required", answers.ul508aRequired],
                    ["CSA Required", answers.csaRequired],
                    ["CE Required", answers.ceRequired],
                    ["Hazardous Location", answers.hazardousLocation],
                    ["Arc Flash Label Required", answers.arcFlashLabelRequired],
                    ["Nameplate Requirements", answers.nameplateRequirements]
                ])}

                ${cperRenderOpenIssues()}

                <div class="status" style="margin-top:18px;">
                    This report is generated from the saved control panel questionnaire answers and should be reviewed by engineering before release.
                </div>
            </div>
        `;
    }

    function cperRenderOpenIssues()
    {
        const issues = [];

        Object.keys(answers).forEach(function (key)
        {
            const value = answers[key];

            if (
                cperNormalize(value) === "UNKNOWN" ||
                cperNormalize(value) === "TBD" ||
                cperNormalize(value) === "TO BE DETERMINED"
            )
            {
                issues.push([
                    cperLabelFromKey(key),
                    value
                ]);
            }
        });

        if (!issues.length)
        {
            return "";
        }

        return cperRenderSection("Open Engineering Items", issues);
    }

    render();
}

function cperRenderSection(title, rows)
{
    const cleanRows = rows.filter(function (row)
    {
        return !cperIsEmpty(row[1]);
    });

    if (!cleanRows.length)
    {
        return "";
    }

    return `
        <h3>${cperEscapeHtml(title)}</h3>

        <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
            <tbody>
                ${cleanRows.map(function (row)
                {
                    return `
                        <tr>
                            <td style="border:1px solid #ddd;padding:8px;width:35%;font-weight:bold;">
                                ${cperEscapeHtml(row[0])}
                            </td>

                            <td style="border:1px solid #ddd;padding:8px;">
                                ${cperEscapeHtml(cperFormatAnswer(row[1]))}
                            </td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;
}

function cperFormatWithUnit(value, unit)
{
    if (cperIsEmpty(value))
    {
        return "";
    }

    return `${value} ${unit}`;
}

function cperFormatAnswer(value)
{
    if (Array.isArray(value))
    {
        return value.join(", ");
    }

    if (value === null || typeof value === "undefined")
    {
        return "";
    }

    return String(value);
}

function cperIsEmpty(value)
{
    if (Array.isArray(value))
    {
        return value.length === 0;
    }

    return value === null || typeof value === "undefined" || String(value).trim() === "";
}

function cperLabelFromKey(value)
{
    return String(value || "")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .replace(/\b\w/g, function (letter)
        {
            return letter.toUpperCase();
        });
}

function cperClone(value)
{
    return JSON.parse(JSON.stringify(value || {}));
}

function cperNormalize(value)
{
    return String(value || "").trim().toUpperCase();
}

function cperEscapeHtml(value)
{
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
