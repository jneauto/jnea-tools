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
	const allComplete =
	    questions.length > 0 &&
	    questions.every(function (question)
	    {
	        return question.complete === true;
	    });
	
	const sectionCompleteIcon = allComplete
	    ? `<span style="color:#2e7d32;font-size:28px;font-weight:bold;">✓</span>`
	    : "";
	
    const questions = Array.isArray(section.questions) ? section.questions : [];

    return `
			<div
			    class="card"
			    data-section-index="${sectionIndex}"
			    style="border-left:5px solid #0193cf;margin-bottom:18px;"
			>
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
                <div>
					<h3 style="margin-top:0;margin-bottom:4px;display:flex;gap:10px;align-items:center;">
					    ${sectionCompleteIcon}
					    <span>${cpqbEscapeHtml(section.label || "Untitled Section")}</span>
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
	const completeIcon = question.complete
    ? `<span style="color:#2e7d32;font-size:20px;font-weight:bold;">✓</span>`
    : `<span style="color:#bbb;font-size:20px;">○</span>`;
	
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
					<span style="display:flex;gap:8px;align-items:center;">
					    ${completeIcon}
					    <strong>${cpqbEscapeHtml(question.label || "Untitled Question")}</strong>
					</span>

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
		complete: false,
        visibleWhen: "",
        helper: null
    };
}

function cpqbRenderQuestionDialog(question)
{
    const showOptions =
        question.type === "select" ||
        question.type === "multiselect";

    const helper = question.helper || cpqbDefaultHelper();

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
                            ${cpqbRenderTypeOptions(question.type)}
                        </select>
                    </div>

                    <label style="display:flex;gap:8px;align-items:center;margin-bottom:12px;font-weight:bold;">
                        <input id="cpqbQuestionRequired" type="checkbox" ${question.required ? "checked" : ""}>
                        Required
                    </label>

					<label style="display:flex;gap:8px;align-items:center;margin-bottom:12px;font-weight:bold;color:#2e7d32;">
					    <input id="cpqbQuestionComplete" type="checkbox" ${question.complete ? "checked" : ""}>
					    Complete / Commissioned
					</label>					
                </div>
            </div>

            <div id="cpqbOptionsSection" style="${showOptions ? "" : "display:none;"}border:1px solid #ddd;border-radius:12px;padding:14px;">
                <h3 style="margin-top:0;">Answer Options</h3>

                <div class="form-group">
                    <label>Options</label>
                    <textarea id="cpqbQuestionOptions" class="tool-input" rows="5">${cpqbEscapeHtml((question.options || []).join("\n"))}</textarea>
                    <div class="status">One option per line.</div>
                </div>
            </div>

            <div style="border:1px solid #ddd;border-radius:12px;padding:14px;">
                <h3 style="margin-top:0;">Visible When</h3>

                <div class="form-group">
                    <label>Visible When Rule</label>
                    <input
                        id="cpqbQuestionVisibleWhen"
                        class="tool-input"
                        placeholder="example: hasCustomerStandard=Yes|Unknown"
                        value="${cpqbEscapeHtml(question.visibleWhen || question.visiblewhen || "")}"
                    >

                    <div class="status">
                        Format: questionId=value or questionId=value1|value2. Leave blank to always show.
                    </div>
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
                        <label>Helper Button Label</label>
                        <input id="cpqbHelperButtonLabel" class="tool-input" value="${cpqbEscapeHtml(helper.buttonLabel || "Help me decide")}">
                    </div>

                    <div class="form-group">
                        <label>Helper Dialog Title</label>
                        <input id="cpqbHelperTitle" class="tool-input" value="${cpqbEscapeHtml(helper.title || "Help choose answer")}">
                    </div>

                    <h4>Helper Sub-Questions</h4>

                    <div id="cpqbHelperQuestions">
                        ${cpqbRenderHelperQuestions(helper.questions || [])}
                    </div>

                    <button id="cpqbAddHelperQuestionBtn" class="login-button" type="button" style="width:auto;margin-top:8px;">
                        Add Helper Question
                    </button>

                    <h4 style="margin-top:18px;">Helper Rules</h4>

                    <div id="cpqbHelperRules">
                        ${cpqbRenderHelperRules(helper.rules || [])}
                    </div>

                    <button id="cpqbAddHelperRuleBtn" class="login-button" type="button" style="width:auto;margin-top:8px;">
                        Add Helper Rule
                    </button>
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
        helper = {
            buttonLabel: dialog.querySelector("#cpqbHelperButtonLabel").value.trim() || "Help me decide",
            title: dialog.querySelector("#cpqbHelperTitle").value.trim() || "Help choose answer",
            questions: cpqbReadHelperQuestions(dialog),
            rules: cpqbReadHelperRules(dialog)
        };
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
        visibleWhen: dialog.querySelector("#cpqbQuestionVisibleWhen").value.trim(),
		complete: dialog.querySelector("#cpqbQuestionComplete").checked,
        reports: reports,
        helper: helper
    };
}

function cpqbRenderTypeOptions(selectedType)
{
    return ["text", "textarea", "number", "yesno", "select", "multiselect", "output"].map(function (type)
    {
        return `
            <option value="${type}" ${selectedType === type ? "selected" : ""}>
                ${type}
            </option>
        `;
    }).join("");
}

function cpqbRenderHelperQuestions(questions)
{
    if (!Array.isArray(questions) || !questions.length)
    {
        return `
            <div class="status">
                No helper questions yet.
            </div>
        `;
    }

    return questions.map(function (question, index)
    {
        return cpqbRenderHelperQuestionEditor(question, index);
    }).join("");
}

function cpqbRenderHelperQuestionEditor(question, index)
{
    const showOptions =
        question.type === "select" ||
        question.type === "multiselect";

    return `
        <div
            class="cpqb-helper-question"
            data-helper-question-index="${index}"
            style="border:1px solid #ddd;border-radius:10px;padding:12px;margin-bottom:10px;"
        >
            <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                <strong>Helper Question ${index + 1}</strong>

                <button
                    type="button"
                    class="login-button cpqb-remove-helper-question"
                    data-helper-question-index="${index}"
                    style="width:auto;background:#c62828;"
                >
                    Remove
                </button>
            </div>

            <div class="form-group">
                <label>Question ID</label>
                <input class="tool-input cpqb-helper-question-id" value="${cpqbEscapeHtml(question.id || "")}">
            </div>

            <div class="form-group">
                <label>Label</label>
                <input class="tool-input cpqb-helper-question-label" value="${cpqbEscapeHtml(question.label || "")}">
            </div>

            <div class="form-group">
                <label>Type</label>
                <select class="tool-select cpqb-helper-question-type">
                    ${cpqbRenderTypeOptions(question.type || "text")}
                </select>
            </div>

            <div class="cpqb-helper-question-options-wrap" style="${showOptions ? "" : "display:none;"}">
                <div class="form-group">
                    <label>Options</label>
                    <textarea class="tool-input cpqb-helper-question-options" rows="4">${cpqbEscapeHtml((question.options || []).join("\n"))}</textarea>
                </div>
            </div>

            <div class="form-group">
                <label>Visible When</label>
                <input
                    class="tool-input cpqb-helper-question-visible-when"
                    placeholder="example: helperQuestionId=Yes"
                    value="${cpqbEscapeHtml(question.visibleWhen || question.visiblewhen || "")}"
                >
            </div>

            <div class="form-group">
                <label>Help Text</label>
                <textarea class="tool-input cpqb-helper-question-help-text" rows="2">${cpqbEscapeHtml(question.helpText || question.helptext || "")}</textarea>
            </div>
        </div>
    `;
}

function cpqbRenderHelperRules(rules)
{
    if (!Array.isArray(rules) || !rules.length)
    {
        return `
            <div class="status">
                No helper rules yet.
            </div>
        `;
    }

    return rules.map(function (rule, index)
    {
        return cpqbRenderHelperRuleEditor(rule, index);
    }).join("");
}

function cpqbRenderHelperRuleEditor(rule, index)
{
    return `
        <div
            class="cpqb-helper-rule"
            data-helper-rule-index="${index}"
            style="border:1px solid #ddd;border-radius:10px;padding:12px;margin-bottom:10px;"
        >
            <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                <strong>Helper Rule ${index + 1}</strong>

                <button
                    type="button"
                    class="login-button cpqb-remove-helper-rule"
                    data-helper-rule-index="${index}"
                    style="width:auto;background:#c62828;"
                >
                    Remove
                </button>
            </div>

            <div class="form-group">
                <label>When</label>
                <input
                    class="tool-input cpqb-helper-rule-when"
                    placeholder="example: existingDrawings=EPLAN"
                    value="${cpqbEscapeHtml(cpqbConditionObjectToText(rule.when || {}))}"
                >
                <div class="status">
                    Use questionId=value or questionId=value1|value2.
                </div>
            </div>

            <div class="form-group">
                <label>Set Parent Value</label>
                <input class="tool-input cpqb-helper-rule-parent-value" value="${cpqbEscapeHtml(rule.setParentValue || rule.value || "")}">
            </div>

            <div class="form-group">
                <label>Message</label>
                <textarea class="tool-input cpqb-helper-rule-message" rows="2">${cpqbEscapeHtml(rule.message || "")}</textarea>
            </div>
        </div>
    `;
}

function cpqbReadHelperQuestions(dialog)
{
    return [...dialog.querySelectorAll(".cpqb-helper-question")].map(function (row)
    {
        return {
            id: row.querySelector(".cpqb-helper-question-id").value.trim(),
            label: row.querySelector(".cpqb-helper-question-label").value.trim(),
            type: row.querySelector(".cpqb-helper-question-type").value,
            options: row.querySelector(".cpqb-helper-question-options").value
                .split(/\n/)
                .map(function (item)
                {
                    return item.trim();
                })
                .filter(Boolean),
            visibleWhen: row.querySelector(".cpqb-helper-question-visible-when").value.trim(),
            helpText: row.querySelector(".cpqb-helper-question-help-text").value.trim()
        };
    }).filter(function (question)
    {
        return question.id && question.label;
    });
}

function cpqbReadHelperRules(dialog)
{
    return [...dialog.querySelectorAll(".cpqb-helper-rule")].map(function (row)
    {
        return {
            when: cpqbConditionTextToObject(row.querySelector(".cpqb-helper-rule-when").value),
            setParentValue: row.querySelector(".cpqb-helper-rule-parent-value").value.trim(),
            message: row.querySelector(".cpqb-helper-rule-message").value.trim()
        };
    }).filter(function (rule)
    {
        return Object.keys(rule.when).length && rule.setParentValue;
    });
}

function cpqbConditionTextToObject(value)
{
    const text = String(value || "").trim();

    if (!text)
    {
        return {};
    }

    const parts = text.split("=");
    const key = String(parts[0] || "").trim();
    const conditionValue = String(parts.slice(1).join("=") || "").trim();

    if (!key || !conditionValue)
    {
        return {};
    }

    const result = {};
    result[key] = conditionValue;
    return result;
}

function cpqbConditionObjectToText(condition)
{
    const keys = Object.keys(condition || {});

    if (!keys.length)
    {
        return "";
    }

    const key = keys[0];

    return key + "=" + condition[key];
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

				<button id="cpqbDialogTest" class="login-button" type="button" style="width:auto;background:#64748b;">
				    Test Question
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

	cpqbWireHelperEditor(overlay);

    overlay.querySelector("#cpqbDialogCancel").addEventListener("click", function ()
    {
        document.body.removeChild(overlay);
    });

	const testButton = overlay.querySelector("#cpqbDialogTest");
	
	if (testButton)
	{
	    testButton.addEventListener("click", function ()
	    {
	        try
	        {
	            const question = cpqbReadQuestionDialog(overlay);
	            cpqbShowQuestionTestDialog(question);
	        }
	        catch (err)
	        {
	            console.error("Question test error:", err);
	            alert("Could not test question: " + err.message);
	        }
	    });
	}	

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

function cpqbWireHelperEditor(overlay)
{
    function refreshHelperQuestions()
    {
        const existingQuestions = cpqbReadHelperQuestions(overlay);
        const container = overlay.querySelector("#cpqbHelperQuestions");

        container.innerHTML = cpqbRenderHelperQuestions(existingQuestions);
        cpqbWireHelperEditor(overlay);
    }

    function refreshHelperRules()
    {
        const existingRules = cpqbReadHelperRules(overlay);
        const container = overlay.querySelector("#cpqbHelperRules");

        container.innerHTML = cpqbRenderHelperRules(existingRules);
        cpqbWireHelperEditor(overlay);
    }

    const addHelperQuestionButton = overlay.querySelector("#cpqbAddHelperQuestionBtn");

    if (addHelperQuestionButton && !addHelperQuestionButton.dataset.wired)
    {
        addHelperQuestionButton.dataset.wired = "true";

        addHelperQuestionButton.addEventListener("click", function ()
        {
            const existingQuestions = cpqbReadHelperQuestions(overlay);

            existingQuestions.push({
                id: "",
                label: "",
                type: "text",
                options: [],
                visibleWhen: "",
                helpText: ""
            });

            overlay.querySelector("#cpqbHelperQuestions").innerHTML =
                cpqbRenderHelperQuestions(existingQuestions);

            cpqbWireHelperEditor(overlay);
        });
    }

    const addHelperRuleButton = overlay.querySelector("#cpqbAddHelperRuleBtn");

    if (addHelperRuleButton && !addHelperRuleButton.dataset.wired)
    {
        addHelperRuleButton.dataset.wired = "true";

        addHelperRuleButton.addEventListener("click", function ()
        {
            const existingRules = cpqbReadHelperRules(overlay);

            existingRules.push({
                when: {},
                setParentValue: "",
                message: ""
            });

            overlay.querySelector("#cpqbHelperRules").innerHTML =
                cpqbRenderHelperRules(existingRules);

            cpqbWireHelperEditor(overlay);
        });
    }

    overlay.querySelectorAll(".cpqb-remove-helper-question").forEach(function (button)
    {
        if (button.dataset.wired)
        {
            return;
        }

        button.dataset.wired = "true";

        button.addEventListener("click", function ()
        {
            const removeIndex = Number(button.dataset.helperQuestionIndex);
            const questions = cpqbReadHelperQuestions(overlay);

            questions.splice(removeIndex, 1);

            overlay.querySelector("#cpqbHelperQuestions").innerHTML =
                cpqbRenderHelperQuestions(questions);

            cpqbWireHelperEditor(overlay);
        });
    });

    overlay.querySelectorAll(".cpqb-remove-helper-rule").forEach(function (button)
    {
        if (button.dataset.wired)
        {
            return;
        }

        button.dataset.wired = "true";

        button.addEventListener("click", function ()
        {
            const removeIndex = Number(button.dataset.helperRuleIndex);
            const rules = cpqbReadHelperRules(overlay);

            rules.splice(removeIndex, 1);

            overlay.querySelector("#cpqbHelperRules").innerHTML =
                cpqbRenderHelperRules(rules);

            cpqbWireHelperEditor(overlay);
        });
    });

    overlay.querySelectorAll(".cpqb-helper-question-type").forEach(function (select)
    {
        if (select.dataset.wired)
        {
            return;
        }

        select.dataset.wired = "true";

        select.addEventListener("change", function ()
        {
            const row = select.closest(".cpqb-helper-question");
            const optionsWrap = row.querySelector(".cpqb-helper-question-options-wrap");

            const shouldShow =
                select.value === "select" ||
                select.value === "multiselect";

            optionsWrap.style.display = shouldShow ? "" : "none";
        });
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

function cpqbShowQuestionTestDialog(question)
{
    const testAnswers = {};
    const helperAnswers = {};

    function renderTest()
    {
        const visible = cpqbQuestionVisibleForTest(question, testAnswers);

        cpqbShowDialog("Test Question", `
            <div class="status" style="margin-bottom:12px;">
                This test uses the unsaved settings from the editor.
            </div>

            <div style="border:1px solid #ddd;border-radius:12px;padding:14px;margin-bottom:14px;">
                <h3 style="margin-top:0;">Test Context</h3>

                <div class="form-group">
                    <label>Visible When Test Answers</label>
                    <textarea
                        id="cpqbTestAnswersJson"
                        class="tool-input"
                        rows="5"
                    >${cpqbEscapeHtml(JSON.stringify(testAnswers, null, 2))}</textarea>

                    <div class="status">
                        Enter JSON values for referenced questions. Example: { "hasCustomerStandard": "Yes" }
                    </div>
                </div>

                <button id="cpqbRefreshQuestionTestBtn" class="login-button" type="button" style="width:auto;">
                    Refresh Test
                </button>
            </div>

            <div style="border:1px solid #ddd;border-radius:12px;padding:14px;">
                <h3 style="margin-top:0;">Question Preview</h3>

                ${
                    visible
                        ? cpqbRenderTestQuestion(question, testAnswers)
                        : `
                            <div style="color:#c62828;font-weight:bold;">
                                This question is currently hidden by visibleWhen.
                            </div>
                        `
                }
            </div>

            <div id="cpqbTestResultArea" style="margin-top:14px;"></div>
        `, function ()
        {
            return true;
        });

        const latestOverlay = document.body.lastElementChild;

        latestOverlay.querySelector("#cpqbRefreshQuestionTestBtn").addEventListener("click", function ()
        {
            try
            {
                const parsed = JSON.parse(latestOverlay.querySelector("#cpqbTestAnswersJson").value || "{}");

                Object.keys(testAnswers).forEach(function (key)
                {
                    delete testAnswers[key];
                });

                Object.assign(testAnswers, parsed);

                document.body.removeChild(latestOverlay);
                renderTest();
            }
            catch (err)
            {
                alert("Test answers JSON is invalid: " + err.message);
            }
        });

        latestOverlay.querySelectorAll("[data-cpqb-test-question]").forEach(function (input)
        {
            input.addEventListener("input", function ()
            {
                cpqbSetTestAnswer(input, testAnswers);
            });

            input.addEventListener("change", function ()
            {
                cpqbSetTestAnswer(input, testAnswers);
            });
        });

        latestOverlay.querySelectorAll("[data-cpqb-test-helper]").forEach(function (button)
        {
            button.addEventListener("click", function ()
            {
                cpqbShowHelperTestDialog(question, testAnswers, helperAnswers);
            });
        });
    }

    renderTest();
}

function cpqbRenderTestQuestion(question, answers)
{
    const value = answers[question.id] ?? question.defaultValue ?? "";
    const requiredLabel = question.required ? `<span style="color:#c62828;"> *</span>` : "";

    let inputHtml = "";

    if (question.type === "textarea")
    {
        inputHtml = `
            <textarea class="tool-input" rows="4" data-cpqb-test-question="${cpqbEscapeHtml(question.id)}">${cpqbEscapeHtml(value)}</textarea>
        `;
    }
    else if (question.type === "number")
    {
        inputHtml = `
            <input class="tool-input" type="number" step="any" value="${cpqbEscapeHtml(value)}" data-cpqb-test-question="${cpqbEscapeHtml(question.id)}">
        `;
    }
    else if (question.type === "yesno")
    {
        inputHtml = `
            <select class="tool-select" data-cpqb-test-question="${cpqbEscapeHtml(question.id)}">
                <option value="">Select...</option>
                <option value="Yes" ${String(value) === "Yes" ? "selected" : ""}>Yes</option>
                <option value="No" ${String(value) === "No" ? "selected" : ""}>No</option>
                <option value="Unknown" ${String(value) === "Unknown" ? "selected" : ""}>Unknown</option>
            </select>
        `;
    }
    else if (question.type === "select")
    {
        inputHtml = `
            <select class="tool-select" data-cpqb-test-question="${cpqbEscapeHtml(question.id)}">
                <option value="">Select...</option>
                ${(question.options || []).map(function (option)
                {
                    return `
                        <option value="${cpqbEscapeHtml(option)}" ${String(value) === String(option) ? "selected" : ""}>
                            ${cpqbEscapeHtml(option)}
                        </option>
                    `;
                }).join("")}
            </select>
        `;
    }
    else if (question.type === "multiselect")
    {
        const values = Array.isArray(value) ? value : [];

        inputHtml = `
            <div style="display:grid;gap:8px;">
                ${(question.options || []).map(function (option)
                {
                    return `
                        <label style="display:flex;gap:8px;align-items:center;">
                            <input
                                type="checkbox"
                                value="${cpqbEscapeHtml(option)}"
                                data-cpqb-test-question="${cpqbEscapeHtml(question.id)}"
                                ${values.includes(option) ? "checked" : ""}
                            >
                            ${cpqbEscapeHtml(option)}
                        </label>
                    `;
                }).join("")}
            </div>
        `;
    }
    else if (question.type === "output")
    {
        inputHtml = `
            <div class="status">
                ${cpqbEscapeHtml(question.defaultValue || question.helpText || "Output text will display here.")}
            </div>
        `;
    }
    else
    {
        inputHtml = `
            <input class="tool-input" type="text" value="${cpqbEscapeHtml(value)}" data-cpqb-test-question="${cpqbEscapeHtml(question.id)}">
        `;
    }

    return `
        <div class="form-group">
            <label>
                ${cpqbEscapeHtml(question.label || question.id)}
                ${requiredLabel}
                ${question.unit ? ` (${cpqbEscapeHtml(question.unit)})` : ""}
            </label>

            ${inputHtml}

            ${question.helpText ? `
                <div class="status">
                    ${cpqbEscapeHtml(question.helpText)}
                </div>
            ` : ""}

            ${question.helper ? `
                <button
                    type="button"
                    class="login-button"
                    data-cpqb-test-helper="${cpqbEscapeHtml(question.id)}"
                    style="width:auto;margin-top:8px;background:#64748b;"
                >
                    ${cpqbEscapeHtml(question.helper.buttonLabel || "Help me decide")}
                </button>
            ` : ""}
        </div>
    `;
}

function cpqbShowHelperTestDialog(parentQuestion, parentAnswers, helperAnswers)
{
    const helper = parentQuestion.helper || {};
    const questions = helper.questions || [];
    const rules = helper.rules || [];
    const subAnswers = helperAnswers[parentQuestion.id] || {};

    cpqbShowDialog(helper.title || "Test Help Me Decide", `
        <div class="status" style="margin-bottom:12px;">
            Test the helper sub-questions and recommendation rules.
        </div>

        ${questions.map(function (question)
        {
            if (!cpqbQuestionVisibleForTest(question, subAnswers))
            {
                return "";
            }

            return cpqbRenderTestQuestionForHelper(question, subAnswers);
        }).join("")}

        <button id="cpqbEvaluateHelperTestBtn" class="login-button" type="button" style="width:auto;">
            Evaluate Helper Rules
        </button>

        <div id="cpqbHelperTestResult" style="margin-top:14px;"></div>
    `, function ()
    {
        return true;
    });

    const latestOverlay = document.body.lastElementChild;

    latestOverlay.querySelectorAll("[data-cpqb-test-helper-question]").forEach(function (input)
    {
        input.addEventListener("input", function ()
        {
            cpqbSetTestAnswer(input, subAnswers, "cpqbTestHelperQuestion");
        });

        input.addEventListener("change", function ()
        {
            cpqbSetTestAnswer(input, subAnswers, "cpqbTestHelperQuestion");
        });
    });

    latestOverlay.querySelector("#cpqbEvaluateHelperTestBtn").addEventListener("click", function ()
    {
        helperAnswers[parentQuestion.id] = subAnswers;

        const result = cpqbEvaluateHelperForTest(rules, subAnswers);
        const resultArea = latestOverlay.querySelector("#cpqbHelperTestResult");

        if (!result.recommendedValue)
        {
            resultArea.innerHTML = `
                <div style="color:#c62828;font-weight:bold;">
                    No helper rule matched.
                </div>
            `;

            return;
        }

        resultArea.innerHTML = `
            <div class="card" style="box-shadow:none;border-left:5px solid #0193cf;">
                <strong>Recommended Parent Answer:</strong>
                ${cpqbEscapeHtml(result.recommendedValue)}

                ${result.message ? `
                    <div class="status" style="margin-top:8px;">
                        ${cpqbEscapeHtml(result.message)}
                    </div>
                ` : ""}
            </div>
        `;
    });
}

function cpqbRenderTestQuestionForHelper(question, answers)
{
    const value = answers[question.id] ?? question.defaultValue ?? "";
    const requiredLabel = question.required ? `<span style="color:#c62828;"> *</span>` : "";

    let inputHtml = "";

    if (question.type === "textarea")
    {
        inputHtml = `
            <textarea class="tool-input" rows="4" data-cpqb-test-helper-question="${cpqbEscapeHtml(question.id)}">${cpqbEscapeHtml(value)}</textarea>
        `;
    }
    else if (question.type === "number")
    {
        inputHtml = `
            <input class="tool-input" type="number" step="any" value="${cpqbEscapeHtml(value)}" data-cpqb-test-helper-question="${cpqbEscapeHtml(question.id)}">
        `;
    }
    else if (question.type === "yesno")
    {
        inputHtml = `
            <select class="tool-select" data-cpqb-test-helper-question="${cpqbEscapeHtml(question.id)}">
                <option value="">Select...</option>
                <option value="Yes" ${String(value) === "Yes" ? "selected" : ""}>Yes</option>
                <option value="No" ${String(value) === "No" ? "selected" : ""}>No</option>
                <option value="Unknown" ${String(value) === "Unknown" ? "selected" : ""}>Unknown</option>
            </select>
        `;
    }
    else if (question.type === "select")
    {
        inputHtml = `
            <select class="tool-select" data-cpqb-test-helper-question="${cpqbEscapeHtml(question.id)}">
                <option value="">Select...</option>
                ${(question.options || []).map(function (option)
                {
                    return `
                        <option value="${cpqbEscapeHtml(option)}" ${String(value) === String(option) ? "selected" : ""}>
                            ${cpqbEscapeHtml(option)}
                        </option>
                    `;
                }).join("")}
            </select>
        `;
    }
    else if (question.type === "multiselect")
    {
        const values = Array.isArray(value) ? value : [];

        inputHtml = `
            <div style="display:grid;gap:8px;">
                ${(question.options || []).map(function (option)
                {
                    return `
                        <label style="display:flex;gap:8px;align-items:center;">
                            <input
                                type="checkbox"
                                value="${cpqbEscapeHtml(option)}"
                                data-cpqb-test-helper-question="${cpqbEscapeHtml(question.id)}"
                                ${values.includes(option) ? "checked" : ""}
                            >
                            ${cpqbEscapeHtml(option)}
                        </label>
                    `;
                }).join("")}
            </div>
        `;
    }
    else if (question.type === "output")
    {
        inputHtml = `
            <div class="status">
                ${cpqbEscapeHtml(question.defaultValue || question.helpText || "Output text will display here.")}
            </div>
        `;
    }
    else
    {
        inputHtml = `
            <input class="tool-input" type="text" value="${cpqbEscapeHtml(value)}" data-cpqb-test-helper-question="${cpqbEscapeHtml(question.id)}">
        `;
    }

    return `
        <div class="form-group">
            <label>
                ${cpqbEscapeHtml(question.label || question.id)}
                ${requiredLabel}
                ${question.unit ? ` (${cpqbEscapeHtml(question.unit)})` : ""}
            </label>

            ${inputHtml}

            ${question.helpText || question.helptext ? `
                <div class="status">
                    ${cpqbEscapeHtml(question.helpText || question.helptext)}
                </div>
            ` : ""}
        </div>
    `;
}

function cpqbSetTestAnswer(input, answers, dataName)
{
    const key = dataName || "cpqbTestQuestion";
    const questionId = input.dataset[key];

    if (!questionId)
    {
        return;
    }

    if (input.type === "checkbox")
    {
        const selector = `[data-${cpqbKebabCase(key)}="${CSS.escape(questionId)}"]`;
        const values = [];

        document.querySelectorAll(selector).forEach(function (checkbox)
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

function cpqbQuestionVisibleForTest(question, answers)
{
    const visibleWhen = question.visibleWhen || question.visiblewhen;

    if (!visibleWhen)
    {
        return true;
    }

    const parts = String(visibleWhen).split("=");
    const questionId = String(parts[0] || "").trim();
    const allowedRaw = String(parts.slice(1).join("=") || "").trim();

    if (!questionId || !allowedRaw)
    {
        return true;
    }

    const allowedValues = allowedRaw
        .split("|")
        .map(cpqbNormalize);

    return allowedValues.includes(cpqbNormalize(answers[questionId]));
}

function cpqbEvaluateHelperForTest(rules, answers)
{
    for (const rule of rules || [])
    {
        const condition = rule.when || {};

        const matches = Object.keys(condition).every(function (key)
        {
            const allowedValues = String(condition[key])
                .split("|")
                .map(cpqbNormalize);

            return allowedValues.includes(cpqbNormalize(answers[key]));
        });

        if (matches)
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

function cpqbNormalize(value)
{
    return String(value || "").trim().toUpperCase();
}

function cpqbKebabCase(value)
{
    return String(value || "")
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .toLowerCase();
}
