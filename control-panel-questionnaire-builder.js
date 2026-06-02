async function renderControlPanelQuestionnaireBuilderPlaceholder()
{
    const sb = window.jnea.sb;

    document.getElementById("pageTitle").textContent = "Control Panel Questionnaire Builder";

    const content = document.getElementById("content");

    content.innerHTML = `
        <div class="card">
            Loading questionnaire builder...
        </div>
    `;

    try
    {
        const response = await sb
            .from("control_panel_questionnaires")
            .select("*")
            .eq("is_active", true)
            .order("version", { ascending: false })
            .limit(1)
            .single();

        if (response.error)
        {
            throw response.error;
        }

        renderControlPanelQuestionnaireBuilder(response.data);
    }
    catch (err)
    {
        console.error("Questionnaire builder load error:", err);

        content.innerHTML = `
            <div class="card">
                <h2>Control Panel Questionnaire Builder</h2>

                <div style="color:#c62828;font-weight:bold;">
                    Could not load active questionnaire.
                </div>

                <pre>${cpqbEscapeHtml(err.message)}</pre>
            </div>
        `;
    }
}

function renderControlPanelQuestionnaireBuilder(activeQuestionnaire)
{
    const sb = window.jnea.sb;

    let questionnaire = cpqbClone(activeQuestionnaire.definition || {});
    let draggedItem = null;

    if (!Array.isArray(questionnaire.sections))
    {
        questionnaire.sections = [];
    }

    function render()
    {
        document.getElementById("content").innerHTML = `
            <div class="card">
                <h2 style="margin-top:0;">
                    Control Panel Questionnaire Builder
                </h2>

                <p>
                    Edit the questionnaire sections and questions. Saving creates a new active version.
                </p>

                <div class="status" style="margin-bottom:14px;">
                    <strong>Current Version:</strong> ${cpqbEscapeHtml(activeQuestionnaire.version || 1)}
                    &nbsp; | &nbsp;
                    <strong>Name:</strong> ${cpqbEscapeHtml(activeQuestionnaire.name || "Control Panel Questionnaire")}
                </div>

                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;">
                    <button id="cpqbAddSectionBtn" class="login-button" type="button" style="width:auto;">
                        Add Section
                    </button>

                    <button id="cpqbSaveBtn" class="login-button" type="button" style="width:auto;background:#2e7d32;">
                        Save As New Version
                    </button>
                </div>

                <div id="cpqbSections">
                    ${questionnaire.sections.map(function (section, sectionIndex)
                    {
                        return cpqbRenderSection(section, sectionIndex);
                    }).join("")}
                </div>
            </div>
        `;

        bindEvents();
    }

    function bindEvents()
    {
        document.getElementById("cpqbAddSectionBtn").addEventListener("click", function ()
        {
            const label = prompt("Section label:");

            if (!label)
            {
                return;
            }

            questionnaire.sections.push({
                id: cpqbSlug(label),
                label: label,
                questions: []
            });

            render();
        });

        document.getElementById("cpqbSaveBtn").addEventListener("click", saveAsNewVersion);

        document.querySelectorAll("[data-cpqb-edit-section]").forEach(function (button)
        {
            button.addEventListener("click", function ()
            {
                editSection(Number(button.dataset.cpqbEditSection));
            });
        });

        document.querySelectorAll("[data-cpqb-delete-section]").forEach(function (button)
        {
            button.addEventListener("click", function ()
            {
                deleteSection(Number(button.dataset.cpqbDeleteSection));
            });
        });

        document.querySelectorAll("[data-cpqb-add-question]").forEach(function (button)
        {
            button.addEventListener("click", function ()
            {
                editQuestion(Number(button.dataset.cpqbAddQuestion), null);
            });
        });

        document.querySelectorAll("[data-cpqb-edit-question]").forEach(function (button)
        {
            button.addEventListener("click", function ()
            {
                editQuestion(
                    Number(button.dataset.sectionIndex),
                    Number(button.dataset.questionIndex)
                );
            });
        });

        document.querySelectorAll("[data-cpqb-delete-question]").forEach(function (button)
        {
            button.addEventListener("click", function ()
            {
                deleteQuestion(
                    Number(button.dataset.sectionIndex),
                    Number(button.dataset.questionIndex)
                );
            });
        });

document.querySelectorAll(".cpqb-drag-handle").forEach(function (handle)
{
    handle.addEventListener("dragstart", function (event)
    {
        draggedItem = {
            type: handle.dataset.dragType,
            sectionIndex: Number(handle.dataset.sectionIndex),
            questionIndex: handle.dataset.questionIndex === undefined
                ? null
                : Number(handle.dataset.questionIndex)
        };

        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", JSON.stringify(draggedItem));
    });
});

		document.querySelectorAll(".card[data-section-index], .cpqb-question-row").forEach(function (target)
		{
		    target.addEventListener("dragover", function (event)
		    {
		        event.preventDefault();
		        target.classList.add("cpqb-drop-target");
		    });
		
		    target.addEventListener("dragleave", function ()
		    {
		        target.classList.remove("cpqb-drop-target");
		    });
		
		    target.addEventListener("drop", function (event)
		    {
		        event.preventDefault();
		        event.stopPropagation();
		
		        target.classList.remove("cpqb-drop-target");
		
		        if (!draggedItem)
		        {
		            return;
		        }
		
		        const isQuestionTarget = target.classList.contains("cpqb-question-row");
		
		        const targetData = {
		            type: isQuestionTarget ? "question" : "section",
		            sectionIndex: Number(target.dataset.sectionIndex),
		            questionIndex: isQuestionTarget
		                ? Number(target.dataset.questionIndex)
		                : null
		        };
		
		        handleDrop(draggedItem, targetData);
		        draggedItem = null;
		        render();
		    });
		});
    }

    function editSection(sectionIndex)
    {
        const section = questionnaire.sections[sectionIndex];

        const label = prompt("Section label:", section.label || "");

        if (!label)
        {
            return;
        }

        section.label = label;
        section.id = section.id || cpqbSlug(label);

        render();
    }

    function deleteSection(sectionIndex)
    {
        const section = questionnaire.sections[sectionIndex];

        if (!confirm("Delete section '" + section.label + "' and all questions inside it?"))
        {
            return;
        }

        questionnaire.sections.splice(sectionIndex, 1);
        render();
    }

    function editQuestion(sectionIndex, questionIndex)
    {
        const section = questionnaire.sections[sectionIndex];

        const existing = questionIndex === null
            ? cpqbNewQuestion()
            : cpqbClone(section.questions[questionIndex]);

        const html = cpqbRenderQuestionDialog(existing);

        cpqbShowDialog("Edit Question", html, function (dialog)
        {
            const question = cpqbReadQuestionDialog(dialog);

            if (!question.id || !question.label)
            {
                alert("Question ID and label are required.");
                return false;
            }

            if (questionIndex === null)
            {
                section.questions.push(question);
            }
            else
            {
                section.questions[questionIndex] = question;
            }

            render();
            return true;
        });
    }

    function deleteQuestion(sectionIndex, questionIndex)
    {
        const question = questionnaire.sections[sectionIndex].questions[questionIndex];

        if (!confirm("Delete question '" + question.label + "'?"))
        {
            return;
        }

        questionnaire.sections[sectionIndex].questions.splice(questionIndex, 1);
        render();
    }

	function handleDrop(from, to)
	{
	    if (from.type === "section")
	    {
	        if (to.type !== "section")
	        {
	            return;
	        }
	
	        if (from.sectionIndex === to.sectionIndex)
	        {
	            return;
	        }
	
	        const moved = questionnaire.sections.splice(from.sectionIndex, 1)[0];
	
	        let insertIndex = to.sectionIndex;
	
	        if (from.sectionIndex < to.sectionIndex)
	        {
	            insertIndex = insertIndex - 1;
	        }
	
	        questionnaire.sections.splice(insertIndex, 0, moved);
	        return;
	    }
	
	    if (from.type === "question")
	    {
	        if (to.type !== "question")
	        {
	            return;
	        }
	
	        const fromQuestions = questionnaire.sections[from.sectionIndex].questions;
	        const toQuestions = questionnaire.sections[to.sectionIndex].questions;
	
	        if (!fromQuestions || !toQuestions)
	        {
	            return;
	        }
	
	        const moved = fromQuestions.splice(from.questionIndex, 1)[0];
	
	        let insertIndex = to.questionIndex;
	
	        if (from.sectionIndex === to.sectionIndex && from.questionIndex < to.questionIndex)
	        {
	            insertIndex = insertIndex - 1;
	        }
	
	        toQuestions.splice(insertIndex, 0, moved);
	    }
	}

    async function saveAsNewVersion()
    {
        try
        {
            const newVersion = Number(activeQuestionnaire.version || 1) + 1;

            questionnaire.version = newVersion;

            const deactivateResponse = await sb
                .from("control_panel_questionnaires")
                .update({ is_active: false })
                .eq("id", activeQuestionnaire.id);

            if (deactivateResponse.error)
            {
                throw deactivateResponse.error;
            }

            const insertResponse = await sb
                .from("control_panel_questionnaires")
                .insert({
                    name: activeQuestionnaire.name || "Control Panel Questionnaire",
                    version: newVersion,
                    is_active: true,
                    definition: questionnaire,
                    created_by: window.jnea.currentUser?.id || null
                });

            if (insertResponse.error)
            {
                throw insertResponse.error;
            }

            alert("Saved as questionnaire version " + newVersion + ".");
            renderControlPanelQuestionnaireBuilderPlaceholder();
        }
        catch (err)
        {
            console.error("Save questionnaire error:", err);
            alert("Could not save questionnaire: " + err.message);
        }
    }

    render();
}

function cpqbRenderSection(section, sectionIndex)
{
    const questions = Array.isArray(section.questions) ? section.questions : [];

    return `
			<div
			    class="card"
			    data-section-index="${sectionIndex}"
			    style="border-left:5px solid #0193cf;margin-bottom:18px;"
			>
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
                <div>
                    <h3 style="margin-top:0;margin-bottom:4px;">
                        ${cpqbEscapeHtml(section.label || "Untitled Section")}
                    </h3>

                    <div class="status">
                        ID: ${cpqbEscapeHtml(section.id || "")} | Questions: ${questions.length}
                    </div>
                </div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;">
					<button
					    class="login-button cpqb-drag-handle"
					    type="button"
					    draggable="true"
					    data-drag-type="section"
					    data-section-index="${sectionIndex}"
					    style="width:auto;background:#64748b;"
					>
					    Drag Section
					</button>

                    <button class="login-button" type="button" style="width:auto;" data-cpqb-add-question="${sectionIndex}">
                        Add Question
                    </button>

                    <button class="login-button" type="button" style="width:auto;" data-cpqb-edit-section="${sectionIndex}">
                        Edit
                    </button>

                    <button class="login-button" type="button" style="width:auto;background:#c62828;" data-cpqb-delete-section="${sectionIndex}">
                        Delete
                    </button>
                </div>
            </div>

            <div style="margin-top:14px;">
                ${questions.map(function (question, questionIndex)
                {
                    return cpqbRenderQuestion(question, sectionIndex, questionIndex);
                }).join("")}
            </div>
        </div>
    `;
}

function cpqbRenderQuestion(question, sectionIndex, questionIndex)
{
    return `
			<div
			    class="cpqb-question-row"
			    data-section-index="${sectionIndex}"
			    data-question-index="${questionIndex}"
			    style="
                border:1px solid #ddd;
                border-radius:10px;
                padding:12px;
                margin-bottom:10px;
                background:#fff;
                cursor:grab;
            "
        >
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
                <div>
                    <strong>${cpqbEscapeHtml(question.label || "Untitled Question")}</strong>

                    <div class="status">
                        ID: ${cpqbEscapeHtml(question.id || "")}
                        | Type: ${cpqbEscapeHtml(question.type || "")}
                        | Reports: ${cpqbEscapeHtml((question.reports || []).join(", "))}
                        ${question.helper ? "| Has helper" : ""}
                    </div>
                </div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;">
					<button
					    class="login-button cpqb-drag-handle"
					    type="button"
					    draggable="true"
					    data-drag-type="question"
					    data-section-index="${sectionIndex}"
					    data-question-index="${questionIndex}"
					    style="width:auto;background:#64748b;"
					>
					    Drag
					</button>				
                    <button
                        class="login-button"
                        type="button"
                        style="width:auto;"
                        data-cpqb-edit-question="1"
                        data-section-index="${sectionIndex}"
                        data-question-index="${questionIndex}"
                    >
                        Edit
                    </button>

                    <button
                        class="login-button"
                        type="button"
                        style="width:auto;background:#c62828;"
                        data-cpqb-delete-question="1"
                        data-section-index="${sectionIndex}"
                        data-question-index="${questionIndex}"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}

function cpqbNewQuestion()
{
    return {
        id: "",
        label: "",
        type: "text",
        required: false,
        helpText: "",
        options: [],
        reports: [],
        helper: null
    };
}

function cpqbRenderQuestionDialog(question)
{
    const showOptions =
        question.type === "select" ||
        question.type === "multiselect";

    return `
        <div style="display:grid;gap:18px;">
            <div style="border:1px solid #ddd;border-radius:12px;padding:14px;">
                <h3 style="margin-top:0;">Basic Information</h3>

                <div class="form-group">
                    <label>Question ID</label>
                    <input id="cpqbQuestionId" class="tool-input" value="${cpqbEscapeHtml(question.id || "")}">
                </div>

                <div class="form-group">
                    <label>Label</label>
                    <input id="cpqbQuestionLabel" class="tool-input" value="${cpqbEscapeHtml(question.label || "")}">
                </div>

                <div style="display:grid;grid-template-columns:1fr auto;gap:14px;align-items:end;">
                    <div class="form-group">
                        <label>Type</label>
                        <select id="cpqbQuestionType" class="tool-select">
                            ${["text", "textarea", "number", "yesno", "select", "multiselect"].map(function (type)
                            {
                                return `
                                    <option value="${type}" ${question.type === type ? "selected" : ""}>
                                        ${type}
                                    </option>
                                `;
                            }).join("")}
                        </select>
                    </div>

                    <label style="display:flex;gap:8px;align-items:center;margin-bottom:12px;font-weight:bold;">
                        <input id="cpqbQuestionRequired" type="checkbox" ${question.required ? "checked" : ""}>
                        Required
                    </label>
                </div>
            </div>

            <div id="cpqbOptionsSection" style="${showOptions ? "" : "display:none;"}border:1px solid #ddd;border-radius:12px;padding:14px;">
                <h3 style="margin-top:0;">Answer Options</h3>

                <div class="form-group">
                    <label>Options</label>
                    <textarea id="cpqbQuestionOptions" class="tool-input" rows="5">${cpqbEscapeHtml((question.options || []).join("\\n"))}</textarea>
                    <div class="status">One option per line. Used for select and multiselect questions.</div>
                </div>
            </div>

            <div style="border:1px solid #ddd;border-radius:12px;padding:14px;">
                <h3 style="margin-top:0;">Reports</h3>

                <div id="cpqbReportPills" style="display:flex;gap:10px;flex-wrap:wrap;">
                    ${["quote", "engineering", "builder", "commissioning"].map(function (report)
                    {
                        const selected = (question.reports || []).includes(report);

                        return `
                            <button
                                type="button"
                                class="cpqb-report-pill ${selected ? "selected" : ""}"
                                data-report="${report}"
                            >
                                ${selected ? "✓ " : ""}${cpqbEscapeHtml(report)}
                            </button>
                        `;
                    }).join("")}
                </div>
            </div>

            <details open style="border:1px solid #ddd;border-radius:12px;padding:14px;">
                <summary style="font-weight:bold;cursor:pointer;">
                    Help Text
                </summary>

                <div class="form-group" style="margin-top:12px;">
                    <textarea id="cpqbQuestionHelpText" class="tool-input" rows="3">${cpqbEscapeHtml(question.helpText || question.helptext || "")}</textarea>
                </div>
            </details>

            <details style="border:1px solid #ddd;border-radius:12px;padding:14px;">
                <summary style="font-weight:bold;cursor:pointer;">
                    Help Me Decide
                </summary>

                <div style="margin-top:12px;">
                    <label style="display:flex;gap:8px;align-items:center;font-weight:bold;margin-bottom:12px;">
                        <input id="cpqbHasHelper" type="checkbox" ${question.helper ? "checked" : ""}>
                        Include Help Me Decide
                    </label>

                    <div class="form-group">
                        <label>Helper JSON</label>
                        <textarea id="cpqbHelperJson" class="tool-input" rows="12">${cpqbEscapeHtml(JSON.stringify(question.helper || cpqbDefaultHelper(), null, 2))}</textarea>
                        <div class="status">
                            Advanced: helper sub-questions and rules are edited as JSON for now.
                        </div>
                    </div>
                </div>
            </details>
        </div>
    `;
}

function cpqbReadQuestionDialog(dialog)
{
	const reports = [...dialog.querySelectorAll(".cpqb-report-pill.selected")]
		.map(function (button)
		{
			return button.dataset.report;
		});

    const hasHelper = dialog.querySelector("#cpqbHasHelper").checked;
    let helper = null;

    if (hasHelper)
    {
        try
        {
            helper = JSON.parse(dialog.querySelector("#cpqbHelperJson").value || "{}");
        }
        catch (err)
        {
            alert("Helper JSON is invalid: " + err.message);
            throw err;
        }
    }

    return {
        id: dialog.querySelector("#cpqbQuestionId").value.trim(),
        label: dialog.querySelector("#cpqbQuestionLabel").value.trim(),
        type: dialog.querySelector("#cpqbQuestionType").value,
        required: dialog.querySelector("#cpqbQuestionRequired").checked,
        helpText: dialog.querySelector("#cpqbQuestionHelpText").value.trim(),
        options: dialog.querySelector("#cpqbQuestionOptions").value
            .split(/\n/)
            .map(function (item)
            {
                return item.trim();
            })
            .filter(Boolean),
        reports: reports,
        helper: helper
    };
}

function cpqbDefaultHelper()
{
    return {
        buttonLabel: "Help me decide",
        title: "Help choose answer",
        questions: [],
        rules: []
    };
}

function cpqbShowDialog(title, bodyHtml, onSave)
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
                ${cpqbEscapeHtml(title)}
            </h2>

            <div id="cpqbDialogBody">
                ${bodyHtml}
            </div>

            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap;">
                <button id="cpqbDialogCancel" class="login-button" type="button" style="width:auto;background:#777;">
                    Cancel
                </button>

                <button id="cpqbDialogSave" class="login-button" type="button" style="width:auto;">
                    Save
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
	
	overlay.querySelectorAll(".cpqb-report-pill").forEach(function (button)
	{
    button.addEventListener("click", function ()
    {
        button.classList.toggle("selected");

        const report = button.dataset.report;
        const selected = button.classList.contains("selected");

        button.textContent = selected
            ? "✓ " + report
            : report;
		});
	});

	const typeSelect = overlay.querySelector("#cpqbQuestionType");
	const optionsSection = overlay.querySelector("#cpqbOptionsSection");

	if (typeSelect && optionsSection)
	{
		typeSelect.addEventListener("change", function ()
		{
			const shouldShowOptions =
				typeSelect.value === "select" ||
				typeSelect.value === "multiselect";

			optionsSection.style.display = shouldShowOptions ? "" : "none";
		});
	}

    overlay.querySelector("#cpqbDialogCancel").addEventListener("click", function ()
    {
        document.body.removeChild(overlay);
    });

    overlay.querySelector("#cpqbDialogSave").addEventListener("click", function ()
    {
        try
        {
            const shouldClose = onSave(overlay);

            if (shouldClose)
            {
                document.body.removeChild(overlay);
            }
        }
        catch (err)
        {
            console.error("Dialog save error:", err);
        }
    });
}

function cpqbClone(value)
{
    return JSON.parse(JSON.stringify(value || {}));
}

function cpqbSlug(value)
{
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function cpqbEscapeHtml(value)
{
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
