async function renderControlPanelQuestionnairePlaceholder()
{
    const sb = window.jnea.sb;
    const currentUser = window.jnea.getCurrentUser();

    document.getElementById("pageTitle").textContent = "Control Panel Questionnaire";

    const content = document.getElementById("content");

    content.innerHTML = `
        <div class="card">
            Loading control panel questionnaire...
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

        renderControlPanelQuestionnaireTool(
            questionnaireResponse.data,
            projectsResponse.data || []
        );
    }
    catch (err)
    {
        console.error("Control panel questionnaire load error:", err);

        content.innerHTML = `
            <div class="card">
                <h2>Control Panel Questionnaire</h2>

                <div style="color:#c62828;font-weight:bold;">
                    Could not load questionnaire.
                </div>

                <pre>${cpqEscapeHtml(err.message)}</pre>
            </div>
        `;
    }
}

function renderControlPanelQuestionnaireTool(activeQuestionnaire, savedProjects)
{
    const sb = window.jnea.sb;
    const currentUser = window.jnea.getCurrentUser();

    const questionnaire = cpqClone(activeQuestionnaire.definition || {});
    const sections = Array.isArray(questionnaire.sections) ? questionnaire.sections : [];

    let selectedProjectId = "";
    let currentProject = null;
    let answers = {};
    let helperAnswers = {};

    function render()
    {
        document.getElementById("content").innerHTML = `
            <div class="card">
                <h2 style="margin-top:0;">
                    Control Panel Questionnaire
                </h2>

                <p>
                    Complete the project requirements questionnaire. You can save your progress and continue later.
                </p>

                <div class="status" style="margin-bottom:14px;">
                    <strong>Questionnaire Version:</strong> ${cpqEscapeHtml(activeQuestionnaire.version || 1)}
                </div>

                <div class="card" style="box-shadow:none;border:1px solid #ddd;">
                    <h3 style="margin-top:0;">
                        Project
                    </h3>

                    <div class="form-group">
                        <label>Continue Existing Project</label>

                        <select id="cpqProjectSelect" class="tool-select">
                            <option value="">Start a new project...</option>

                            ${savedProjects.map(function (project)
                            {
                                return `
                                    <option value="${cpqEscapeHtml(project.id)}" ${selectedProjectId === project.id ? "selected" : ""}>
                                        ${cpqEscapeHtml(project.project_name || "Untitled Project")}
                                        ${project.customer_name ? " - " + cpqEscapeHtml(project.customer_name) : ""}
                                    </option>
                                `;
                            }).join("")}
                        </select>
                    </div>

                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
                        <div class="form-group">
                            <label>Project Name</label>
                            <input id="cpqProjectName" class="tool-input" value="${cpqEscapeHtml(currentProject?.project_name || answers.projectName || "")}">
                        </div>

                        <div class="form-group">
                            <label>Customer Name</label>
                            <input id="cpqCustomerName" class="tool-input" value="${cpqEscapeHtml(currentProject?.customer_name || answers.customerName || "")}">
                        </div>
                    </div>

                    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
                        <button id="cpqSaveBtn" class="login-button" type="button" style="width:auto;background:#2e7d32;">
                            Save Progress
                        </button>

                        <button id="cpqNewBtn" class="login-button" type="button" style="width:auto;background:#64748b;">
                            Start New Project
                        </button>
                    </div>
                </div>

                <div style="height:18px;"></div>

                <div id="cpqQuestionArea">
                    ${sections.map(function (section)
                    {
                        return cpqRenderSection(section, answers);
                    }).join("")}
                </div>

                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
                    <button id="cpqSaveBtnBottom" class="login-button" type="button" style="width:auto;background:#2e7d32;">
                        Save Progress
                    </button>

                    <button id="cpqAnswersBtn" class="login-button" type="button" style="width:auto;">
                        Show Answers
                    </button>

                    <button id="cpqEngineeringReportBtn" class="login-button" type="button" style="width:auto;">
                        Engineering Report
                    </button>

                    <button id="cpqQuoteReportBtn" class="login-button" type="button" style="width:auto;">
                        Quote Report
                    </button>

                    <button id="cpqBuilderReportBtn" class="login-button" type="button" style="width:auto;">
                        Builder Report
                    </button>
                </div>

                <div id="cpqReportArea" style="margin-top:18px;"></div>
            </div>
        `;

        bindEvents();
    }

    function bindEvents()
    {
        document.getElementById("cpqProjectSelect").addEventListener("change", function (event)
        {
            selectedProjectId = event.target.value;

            if (!selectedProjectId)
            {
                currentProject = null;
                answers = {};
                helperAnswers = {};
                render();
                return;
            }

            currentProject = savedProjects.find(function (project)
            {
                return project.id === selectedProjectId;
            }) || null;

            answers = cpqClone(currentProject?.answers || {});
            helperAnswers = cpqClone(answers._helpers || {});

            render();
        });

        document.querySelectorAll("[data-cpq-question]").forEach(function (input)
        {
            input.addEventListener("input", function ()
            {
                cpqSetAnswerFromInput(input, answers);
            });
        
            input.addEventListener("change", function ()
            {
                cpqSetAnswerFromInput(input, answers);
        
                const questionId = input.dataset.cpqQuestion;
                const question = cpqFindQuestion(sections, questionId);
        
                if (
                    question &&
                    (
                        question.type === "select" ||
                        question.type === "yesno" ||
                        question.type === "multiselect"
                    )
                )
                {
                    render();
                }
            });
        });

        document.querySelectorAll("[data-cpq-helper]").forEach(function (button)
        {
            button.addEventListener("click", function ()
            {
                const questionId = button.dataset.cpqHelper;
                const question = cpqFindQuestion(sections, questionId);

                if (question && question.helper)
                {
                    showHelperDialog(question);
                }
            });
        });

        document.getElementById("cpqSaveBtn").addEventListener("click", saveProject);
        document.getElementById("cpqSaveBtnBottom").addEventListener("click", saveProject);

        document.getElementById("cpqNewBtn").addEventListener("click", function ()
        {
            if (!confirm("Start a new project? Unsaved changes will be lost."))
            {
                return;
            }

            selectedProjectId = "";
            currentProject = null;
            answers = {};
            helperAnswers = {};
            render();
        });

        document.getElementById("cpqAnswersBtn").addEventListener("click", function ()
        {
            renderReport("all", "All Answers");
        });

        document.getElementById("cpqEngineeringReportBtn").addEventListener("click", function ()
        {
            renderReport("engineering", "Engineering Report");
        });

        document.getElementById("cpqQuoteReportBtn").addEventListener("click", function ()
        {
            renderReport("quote", "Quote Report");
        });

        document.getElementById("cpqBuilderReportBtn").addEventListener("click", function ()
        {
            renderReport("builder", "Builder Report");
        });
    }

    async function saveProject()
    {
        const projectName = document.getElementById("cpqProjectName").value.trim();
        const customerName = document.getElementById("cpqCustomerName").value.trim();

        if (!projectName)
        {
            alert("Project Name is required.");
            return;
        }

        answers.projectName = projectName;
        answers.customerName = customerName;
        answers._helpers = helperAnswers;

        try
        {
            if (currentProject)
            {
                const response = await sb
                    .from("control_panel_projects")
                    .update({
                        project_name: projectName,
                        customer_name: customerName,
                        answers: answers,
                        questionnaire_id: activeQuestionnaire.id
                    })
                    .eq("id", currentProject.id);

                if (response.error)
                {
                    throw response.error;
                }

                alert("Project saved.");
                
                currentProject.answers = cpqClone(answers);
                currentProject.project_name = projectName;
                currentProject.customer_name = customerName;
                
                render();
                return;
            }

            const response = await sb
                .from("control_panel_projects")
                .insert({
                    questionnaire_id: activeQuestionnaire.id,
                    project_name: projectName,
                    customer_name: customerName,
                    answers: answers,
                    created_by: currentUser.id
                })
                .select("*")
                .single();

            if (response.error)
            {
                throw response.error;
            }

            alert("Project created and saved.");
            
            currentProject = response.data;
            selectedProjectId = response.data.id;
            savedProjects.unshift(response.data);
            
            answers = cpqClone(response.data.answers || {});
            helperAnswers = cpqClone(answers._helpers || {});
            
            render();
        }
        catch (err)
        {
            console.error("Save project error:", err);
            alert("Could not save project: " + err.message);
        }
    }

    function showHelperDialog(question)
    {
        const helper = question.helper || {};
        const helperState = helperAnswers[question.id] || {
            answers: {},
            recommendedValue: "",
            message: ""
        };

        const helperQuestions = Array.isArray(helper.questions) ? helper.questions : [];

        cpqShowDialog(helper.title || "Help Me Decide", `
            <div class="status" style="margin-bottom:12px;">
                Answer the helper questions below. The tool will recommend an answer.
            </div>

            ${helperQuestions.map(function (helperQuestion)
            {
                return cpqRenderHelperQuestion(helperQuestion, helperState.answers || {});
            }).join("")}

            <div id="cpqHelperResult" class="card" style="box-shadow:none;border:1px solid #ddd;display:none;"></div>
        `, function (dialog)
        {
            const subAnswers = {};

            dialog.querySelectorAll("[data-cpq-helper-question]").forEach(function (input)
            {
                cpqSetAnswerFromInput(input, subAnswers, "cpqHelperQuestion");
            });

            const result = cpqEvaluateHelper(question.helper, subAnswers);

            if (!result.recommendedValue)
            {
                alert("No helper rule matched these answers.");
                return false;
            }

            answers[question.id] = result.recommendedValue;

            helperAnswers[question.id] = {
                recommendedValue: result.recommendedValue,
                message: result.message || "",
                answers: subAnswers
            };

            render();
            return true;
        }, function (dialog)
        {
            dialog.querySelectorAll("[data-cpq-helper-question]").forEach(function (input)
            {
                input.addEventListener("change", function ()
                {
                    const subAnswers = {};

                    dialog.querySelectorAll("[data-cpq-helper-question]").forEach(function (candidate)
                    {
                        cpqSetAnswerFromInput(candidate, subAnswers, "cpqHelperQuestion");
                    });

                    const result = cpqEvaluateHelper(question.helper, subAnswers);
                    const resultArea = dialog.querySelector("#cpqHelperResult");

                    if (!result.recommendedValue)
                    {
                        resultArea.style.display = "none";
                        resultArea.innerHTML = "";
                        return;
                    }

                    resultArea.style.display = "";
                    resultArea.innerHTML = `
                        <strong>Recommended Answer:</strong>
                        ${cpqEscapeHtml(result.recommendedValue)}

                        ${result.message ? `
                            <div class="status" style="margin-top:8px;">
                                ${cpqEscapeHtml(result.message)}
                            </div>
                        ` : ""}
                    `;
                });
            });
        });
    }

    function renderReport(reportType, title)
    {
        const reportArea = document.getElementById("cpqReportArea");

        reportArea.innerHTML = `
            <div class="card" style="border-left:5px solid #0193cf;">
                <h2 style="margin-top:0;">
                    ${cpqEscapeHtml(title)}
                </h2>

                <div class="status" style="margin-bottom:12px;">
                    <strong>Project:</strong> ${cpqEscapeHtml(document.getElementById("cpqProjectName").value || "")}
                    <br>
                    <strong>Customer:</strong> ${cpqEscapeHtml(document.getElementById("cpqCustomerName").value || "")}
                </div>

                ${sections.map(function (section)
                {
                    const rows = cpqGetReportQuestions(section, reportType, answers);

                    if (!rows.length)
                    {
                        return "";
                    }

                    return `
                        <h3>${cpqEscapeHtml(section.label || section.id || "Section")}</h3>

                        <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
                            <tbody>
                                ${rows.map(function (question)
                                {
                                    const value = cpqFormatAnswer(answers[question.id]);

                                    return `
                                        <tr>
                                            <td style="border:1px solid #ddd;padding:8px;width:35%;font-weight:bold;">
                                                ${cpqEscapeHtml(question.label || question.id)}
                                            </td>

                                            <td style="border:1px solid #ddd;padding:8px;">
                                                ${cpqEscapeHtml(value)}
                                                ${cpqRenderHelperNote(question, helperAnswers)}
                                            </td>
                                        </tr>
                                    `;
                                }).join("")}
                            </tbody>
                        </table>
                    `;
                }).join("")}

                <button class="login-button" type="button" style="width:auto;" onclick="window.print();">
                    Print
                </button>
            </div>
        `;
    }

    render();
}

function cpqRenderSection(section, answers)
{
    const questions = Array.isArray(section.questions) ? section.questions : [];

    const visibleQuestions = questions.filter(function (question)
    {
        return cpqQuestionIsVisible(question, answers);
    });

    if (!visibleQuestions.length)
    {
        return "";
    }

    return `
        <div class="card" style="box-shadow:none;border:1px solid #ddd;margin-bottom:18px;">
            <h3 style="margin-top:0;">
                ${cpqEscapeHtml(section.label || section.id || "Section")}
            </h3>

            ${visibleQuestions.map(function (question)
            {
                return cpqRenderQuestion(question, answers);
            }).join("")}
        </div>
    `;
}

function cpqRenderQuestion(question, answers)
{
    const value = answers[question.id] ?? question.defaultValue ?? "";
    const requiredLabel = question.required ? `<span style="color:#c62828;"> *</span>` : "";
    const helperButton = question.helper
        ? `
            <button
                type="button"
                class="login-button"
                data-cpq-helper="${cpqEscapeHtml(question.id)}"
                style="width:auto;margin-top:8px;background:#64748b;"
            >
                ${cpqEscapeHtml(question.helper.buttonLabel || "Help me decide")}
            </button>
        `
        : "";

    let inputHtml = "";

    if (question.type === "textarea")
    {
        inputHtml = `
            <textarea
                class="tool-input"
                rows="4"
                data-cpq-question="${cpqEscapeHtml(question.id)}"
            >${cpqEscapeHtml(value)}</textarea>
        `;
    }
    else if (question.type === "number")
    {
        inputHtml = `
            <input
                class="tool-input"
                type="number"
                step="any"
                value="${cpqEscapeHtml(value)}"
                data-cpq-question="${cpqEscapeHtml(question.id)}"
            >
        `;
    }
    else if (question.type === "yesno")
    {
        inputHtml = `
            <select class="tool-select" data-cpq-question="${cpqEscapeHtml(question.id)}">
                <option value="">Select...</option>
                <option value="Yes" ${String(value) === "Yes" ? "selected" : ""}>Yes</option>
                <option value="No" ${String(value) === "No" ? "selected" : ""}>No</option>
                <option value="Unknown" ${String(value) === "Unknown" ? "selected" : ""}>Unknown</option>
            </select>
        `;
    }
    else if (question.type === "select")
    {
        const options = Array.isArray(question.options) ? question.options : [];

        inputHtml = `
            <select class="tool-select" data-cpq-question="${cpqEscapeHtml(question.id)}">
                <option value="">Select...</option>

                ${options.map(function (option)
                {
                    return `
                        <option value="${cpqEscapeHtml(option)}" ${String(value) === String(option) ? "selected" : ""}>
                            ${cpqEscapeHtml(option)}
                        </option>
                    `;
                }).join("")}
            </select>
        `;
    }
    else if (question.type === "multiselect")
    {
        const options = Array.isArray(question.options) ? question.options : [];
        const values = Array.isArray(value) ? value : String(value || "").split("|").filter(Boolean);

        inputHtml = `
            <div style="display:grid;gap:8px;">
                ${options.map(function (option)
                {
                    return `
                        <label style="display:flex;gap:8px;align-items:center;">
                            <input
                                type="checkbox"
                                value="${cpqEscapeHtml(option)}"
                                data-cpq-question="${cpqEscapeHtml(question.id)}"
                                ${values.includes(option) ? "checked" : ""}
                            >
                            ${cpqEscapeHtml(option)}
                        </label>
                    `;
                }).join("")}
            </div>
        `;
    }
    else if (question.type === "output")
        {

        }        
    else
    {
        inputHtml = `
            <input
                class="tool-input"
                type="text"
                value="${cpqEscapeHtml(value)}"
                data-cpq-question="${cpqEscapeHtml(question.id)}"
            >
        `;
    }

    return `
        <div class="form-group">
            <label>
                ${cpqEscapeHtml(question.label || question.id)}
                ${requiredLabel}
                ${question.unit ? ` (${cpqEscapeHtml(question.unit)})` : ""}
            </label>

            ${inputHtml}

            ${question.helpText || question.helptext ? `
                <div class="status">
                    ${cpqEscapeHtml(question.helpText || question.helptext)}
                </div>
            ` : ""}

            ${helperButton}
        </div>
    `;
}

function cpqRenderHelperQuestion(question, answers)
{
    const helperQuestion = {
        id: question.id,
        label: question.label,
        type: question.type || "text",
        options: question.options || []
    };

    return cpqRenderQuestion(helperQuestion, answers)
        .replaceAll("data-cpq-question", "data-cpq-helper-question");
}

function cpqSetAnswerFromInput(input, answers, dataName)
{
    const key = dataName || "cpqQuestion";
    const questionId = input.dataset[key];

    if (!questionId)
    {
        return;
    }

    if (input.type === "checkbox")
    {
        const checkboxes = document.querySelectorAll(`[data-${cpqKebabCase(key)}="${CSS.escape(questionId)}"]`);
        const values = [];

        checkboxes.forEach(function (checkbox)
        {
            if (checkbox.checked)
            {
                values.push(checkbox.value);
            }
        });

        answers[questionId] = values;
        return;
    }

    answers[questionId] = input.value;
}

function cpqQuestionIsVisible(question, answers)
{
    if (!question.visibleWhen && !question.visiblewhen)
    {
        return true;
    }

    const visibleWhen = question.visibleWhen || question.visiblewhen;

    if (typeof visibleWhen === "object")
    {
        return cpqObjectConditionMatches(visibleWhen, answers);
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
        .map(cpqNormalize);

    return allowedValues.includes(cpqNormalize(answers[questionId]));
}

function cpqObjectConditionMatches(condition, answers)
{
    const questionId = condition.questionId || condition.id;
    const value = condition.value;

    if (!questionId)
    {
        return true;
    }

    return cpqNormalize(answers[questionId]) === cpqNormalize(value);
}

function cpqEvaluateHelper(helper, subAnswers)
{
    const rules = Array.isArray(helper.rules) ? helper.rules : [];

    for (const rule of rules)
    {
        if (cpqRuleMatches(rule.when || {}, subAnswers))
        {
            return {
                recommendedValue: rule.setParentValue || rule.value || "",
                message: rule.message || ""
            };
        }
    }

    return {
        recommendedValue: "",
        message: ""
    };
}

function cpqRuleMatches(conditions, answers)
{
    return Object.keys(conditions).every(function (key)
    {
        const allowedValues = String(conditions[key])
            .split("|")
            .map(cpqNormalize);

        return allowedValues.includes(cpqNormalize(answers[key]));
    });
}

function cpqFindQuestion(sections, questionId)
{
    for (const section of sections)
    {
        const questions = Array.isArray(section.questions) ? section.questions : [];

        const question = questions.find(function (candidate)
        {
            return candidate.id === questionId;
        });

        if (question)
        {
            return question;
        }
    }

    return null;
}

function cpqGetReportQuestions(section, reportType, answers)
{
    const questions = Array.isArray(section.questions) ? section.questions : [];

    return questions.filter(function (question)
    {
        if (!cpqQuestionIsVisible(question, answers))
        {
            return false;
        }

        if (typeof answers[question.id] === "undefined" || answers[question.id] === "")
        {
            return false;
        }

        if (reportType === "all")
        {
            return true;
        }

        return Array.isArray(question.reports) && question.reports.includes(reportType);
    });
}

function cpqRenderHelperNote(question, helperAnswers)
{
    const helper = helperAnswers[question.id];

    if (!helper || !helper.message)
    {
        return "";
    }

    return `
        <div class="status" style="margin-top:6px;">
            Helper: ${cpqEscapeHtml(helper.message)}
        </div>
    `;
}

function cpqShowDialog(title, bodyHtml, onSave, onOpen)
{
    const overlay = document.createElement("div");

    overlay.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.45);
        z-index:9999;
        display:flex;
        align-items:flex-start;
        justify-content:center;
        overflow:auto;
        padding:30px 12px;
    `;

    overlay.innerHTML = `
        <div
            style="
                background:#fff;
                width:min(760px,100%);
                border-radius:14px;
                padding:20px;
                box-shadow:0 10px 30px rgba(0,0,0,0.25);
            "
        >
            <h2 style="margin-top:0;">
                ${cpqEscapeHtml(title)}
            </h2>

            <div id="cpqDialogBody">
                ${bodyHtml}
            </div>

            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap;">
                <button id="cpqDialogCancel" class="login-button" type="button" style="width:auto;background:#777;">
                    Cancel
                </button>

                <button id="cpqDialogSave" class="login-button" type="button" style="width:auto;">
                    Use Recommendation
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    if (onOpen)
    {
        onOpen(overlay);
    }

    overlay.querySelector("#cpqDialogCancel").addEventListener("click", function ()
    {
        document.body.removeChild(overlay);
    });

    overlay.querySelector("#cpqDialogSave").addEventListener("click", function ()
    {
        const shouldClose = onSave(overlay);

        if (shouldClose)
        {
            document.body.removeChild(overlay);
        }
    });
}

function cpqFormatAnswer(value)
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

function cpqClone(value)
{
    return JSON.parse(JSON.stringify(value || {}));
}

function cpqNormalize(value)
{
    return String(value || "").trim().toUpperCase();
}

function cpqKebabCase(value)
{
    return String(value || "")
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .toLowerCase();
}

function cpqEscapeHtml(value)
{
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function cpqQuestionnaireHasVisibilityRules(questionnaire)
{
    const sections = questionnaire.sections || [];

    return sections.some(function (section)
    {
        return (section.questions || []).some(function (question)
        {
            return (
                question.visibleWhen ||
                question.visiblewhen
            );
        });
    });
}
