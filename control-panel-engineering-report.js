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
        const questionnaireResponse = await sb
            .from("control_panel_questionnaires")
            .select("*")
            .eq("is_active", true)
            .order("version", { ascending: false })
            .limit(1)
            .single();

        if (questionnaireResponse.error)
        {
            throw questionnaireResponse.error;
        }

        const projectsResponse = await sb
            .from("control_panel_projects")
            .select("*")
            .eq("created_by", currentUser.id)
            .order("updated_at", { ascending: false });

        if (projectsResponse.error)
        {
            throw projectsResponse.error;
        }

        renderControlPanelEngineeringReportTool(
            questionnaireResponse.data,
            projectsResponse.data || []
        );
    }
    catch (err)
    {
        console.error("Engineering report load error:", err);

        content.innerHTML = `
            <div class="card">
                <h2>Industrial Control Panel Engineering Report</h2>

                <div style="color:#c62828;font-weight:bold;">
                    Could not load engineering report.
                </div>

                <pre>${cperEscapeHtml(err.message)}</pre>
            </div>
        `;
    }
}

function renderControlPanelEngineeringReportTool(activeQuestionnaire, savedProjects)
{
    const questionnaire = cperClone(activeQuestionnaire.definition || {});
    const sections = Array.isArray(questionnaire.sections) ? questionnaire.sections : [];

    let selectedProjectId = "";
    let currentProject = null;
    let answers = {};
	
	const storedProjectId = sessionStorage.getItem("jneSelectedControlPanelProjectId");

	if (storedProjectId)
	{
		selectedProjectId = storedProjectId;

		currentProject = savedProjects.find(function (project)
		{
			return project.id === selectedProjectId;
		}) || null;

		answers = cperClone(currentProject?.answers || {});

		sessionStorage.removeItem("jneSelectedControlPanelProjectId");
	}	

    function render()
    {
        document.getElementById("content").innerHTML = `
            <div class="card">
                <h2 style="margin-top:0;">
                    Industrial Control Panel Engineering Report
                </h2>

                <p>
                    Select a saved questionnaire project to generate a section-based engineering report.
                </p>

                <div class="status" style="margin-bottom:14px;">
                    <strong>Questionnaire Version:</strong> ${cperEscapeHtml(activeQuestionnaire.version || 1)}
                </div>

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

                ${cperRenderProjectSummary()}

                ${sections.map(function (section)
                {
                    return cperRenderQuestionnaireSection(section, answers, "engineering");
                }).join("")}

                ${cperRenderOpenIssues()}

                <div class="status" style="margin-top:18px;">
                    This report is generated from the saved control panel questionnaire answers and should be reviewed by engineering before release.
                </div>
            </div>
        `;
    }

    function cperRenderProjectSummary()
    {
        return cperRenderSection("Project Summary", [
            ["Project Name", answers.projectName || currentProject.project_name],
            ["Customer Name", answers.customerName || currentProject.customer_name]
        ]);
    }

    function cperRenderOpenIssues()
    {
        const issues = [];

        sections.forEach(function (section)
        {
            const questions = Array.isArray(section.questions) ? section.questions : [];

            questions.forEach(function (question)
            {
                const value = answers[question.id];

                if (
                    cperNormalize(value) === "UNKNOWN" ||
                    cperNormalize(value) === "TBD" ||
                    cperNormalize(value) === "TO BE DETERMINED"
                )
                {
                    issues.push([
                        question.label || question.id,
                        value
                    ]);
                }
            });
        });

        if (!issues.length)
        {
            return "";
        }

        return cperRenderSection("Open Engineering Items", issues);
    }

    render();
}

function cperRenderQuestionnaireSection(section, answers, reportType)
{
    const questions = Array.isArray(section.questions) ? section.questions : [];

    const normalRows = [];
    const outputNotes = [];

    questions.forEach(function (question)
    {
        if (!cperQuestionIsVisible(question, answers))
        {
            return;
        }

        const isOutput = question.type === "output";

        const isReportQuestion =
            Array.isArray(question.reports) &&
            question.reports.includes(reportType);

        if (!isOutput && !isReportQuestion)
        {
            return;
        }

        if (isOutput)
        {
            outputNotes.push({
                label: question.label || question.id,
                attention: question.attention === true,
                value:
                    answers[question.id] ||
                    question.defaultValue ||
                    question.output ||
                    question.message ||
                    question.helpText ||
                    question.helptext ||
                    question.label ||
                    ""
            });

            return;
        }

        if (cperIsEmpty(answers[question.id]))
        {
            return;
        }

        normalRows.push({
            label: question.label || question.id,
            value: cperFormatAnswer(answers[question.id]),
            attention: question.attention === true
        });
    });

    let html = "";

    if (normalRows.length)
    {
        html += cperRenderSection(
            section.label || section.id || "Section",
            normalRows
        );
    }

    if (outputNotes.length)
    {
        html += `
            <div
                class="card"
                style="
                    box-shadow:none;
                    border:1px solid #f59e0b;
                    border-left:5px solid #f59e0b;
                    margin-bottom:18px;
                    background:#fffbeb;
                "
            >
                <h3 style="margin-top:0;">
                    ${cperEscapeHtml(section.label || section.id || "Section")} - Engineering Notes
                </h3>

                ${outputNotes.map(function (note)
                {
                    const background = note.attention ? "#fef3c7" : "transparent";
                    const border = note.attention ? "1px solid #f59e0b" : "1px solid #f3d08a";

                    return `
                        <div style="border-bottom:${border};padding:10px;background:${background};">
                            ${note.attention ? `<strong style="color:#92400e;">⚠ Attention Required</strong><br>` : ""}
                            <strong>
                                ${cperEscapeHtml(note.label)}
                            </strong>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    return html;
}

function cperRenderSection(title, rows)
{
    const cleanRows = rows.filter(function (row)
    {
        const value = Array.isArray(row)
            ? row[1]
            : row.value;

        return !cperIsEmpty(value);
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
                    const label = Array.isArray(row) ? row[0] : row.label;
                    const value = Array.isArray(row) ? row[1] : row.value;
                    const attention = !Array.isArray(row) && row.attention === true;

                    const rowStyle = attention
                        ? "background:#fef3c7;"
                        : "";

                    const cellStyle = attention
                        ? "border:1px solid #f59e0b;padding:8px;"
                        : "border:1px solid #ddd;padding:8px;";

                    return `
                        <tr style="${rowStyle}">
                            <td style="${cellStyle}width:35%;font-weight:bold;">
                                ${attention ? `<span style="color:#92400e;">⚠ </span>` : ""}
                                ${cperEscapeHtml(label)}
                            </td>

                            <td style="${cellStyle}">
                                ${cperEscapeHtml(cperFormatAnswer(value))}
                                ${attention ? `
                                    <div style="color:#92400e;font-weight:bold;margin-top:4px;">
                                        Attention Required
                                    </div>
                                ` : ""}
                            </td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;
}

function cperQuestionIsVisible(question, answers)
{
    if (!question.visibleWhen && !question.visiblewhen)
    {
        return true;
    }

    const visibleWhen = question.visibleWhen || question.visiblewhen;

    if (typeof visibleWhen === "object")
    {
        return cperObjectConditionMatches(visibleWhen, answers);
    }

    const parts = String(visibleWhen || "").split("=");
    const questionId = String(parts[0] || "").trim();
    const allowedValuesRaw = String(parts[1] || "").trim();

    if (!questionId || !allowedValuesRaw)
    {
        return true;
    }

    const allowedValues = allowedValuesRaw
        .split("|")
        .map(cperNormalize);

    return allowedValues.includes(cperNormalize(answers[questionId]));
}

function cperObjectConditionMatches(condition, answers)
{
    const questionId = condition.questionId || condition.id;
    const value = condition.value;

    if (!questionId)
    {
        return true;
    }

    return cperNormalize(answers[questionId]) === cperNormalize(value);
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
