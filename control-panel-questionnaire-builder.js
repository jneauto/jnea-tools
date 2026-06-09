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
	let hideCompletedSections = false;

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
					
					<label style="display:flex;gap:8px;align-items:center;font-weight:bold;">
						<input id="cpqbHideCompletedSections" type="checkbox" ${hideCompletedSections ? "checked" : ""}>
						Hide completed sections
					</label>
					
                </div>

                <div id="cpqbSections">
					${questionnaire.sections.map(function (section, sectionIndex)
					{
						if (hideCompletedSections && section.complete === true)
						{
							return "";
						}

						return cpqbRenderSection(section, sectionIndex);
					}).join("")}
                </div>
            </div>
        `;

        bindEvents();
		
		if (window.lucide)
		{
			window.lucide.createIcons();
		}
		
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
				complete: false,
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
		
		document.getElementById("cpqbHideCompletedSections").addEventListener("change", function (event)
		{
			hideCompletedSections = event.target.checked;
			render();
		});		
		
		document.querySelectorAll("[data-cpqb-duplicate-section]").forEach(function (button)
		{
			button.addEventListener("click", function ()
			{
				duplicateSection(Number(button.dataset.cpqbDuplicateSection));
			});
		});

		document.querySelectorAll("[data-cpqb-copy-section-json]").forEach(function (button)
		{
			button.addEventListener("click", function ()
			{
				copySectionJson(Number(button.dataset.cpqbCopySectionJson));
			});
		});

		document.querySelectorAll("[data-cpqb-paste-section-json]").forEach(function (button)
		{
			button.addEventListener("click", function ()
			{
				pasteSectionJson(Number(button.dataset.cpqbPasteSectionJson));
			});
		});		

		document.querySelectorAll("[data-cpqb-test-section]").forEach(function (button)
		{
		    button.addEventListener("click", function ()
		    {
		        testSection(Number(button.dataset.cpqbTestSection));
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

		document.querySelectorAll("[data-cpqb-duplicate-question]").forEach(function (button)
		{
		    button.addEventListener("click", function ()
		    {
		        duplicateQuestion(
		            Number(button.dataset.sectionIndex),
		            Number(button.dataset.questionIndex)
		        );
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
		
		document.querySelectorAll("[data-cpqb-section-up]").forEach(function (button)
		{
			button.addEventListener("click", function ()
			{
				moveSection(Number(button.dataset.cpqbSectionUp), -1);
			});
		});

		document.querySelectorAll("[data-cpqb-section-down]").forEach(function (button)
		{
			button.addEventListener("click", function ()
			{
				moveSection(Number(button.dataset.cpqbSectionDown), 1);
			});
		});

		document.querySelectorAll("[data-cpqb-question-up]").forEach(function (button)
		{
			button.addEventListener("click", function ()
			{
				moveQuestion(
					Number(button.dataset.sectionIndex),
					Number(button.dataset.questionIndex),
					-1
				);
			});
		});

		document.querySelectorAll("[data-cpqb-question-down]").forEach(function (button)
		{
			button.addEventListener("click", function ()
			{
				moveQuestion(
					Number(button.dataset.sectionIndex),
					Number(button.dataset.questionIndex),
					1
				);
			});
		});		

    }

	function editSection(sectionIndex)
	{
		const section = questionnaire.sections[sectionIndex];

		const html = `
			<div class="form-group">
				<label>Section ID</label>
				<input id="cpqbSectionId" class="tool-input" value="${cpqbEscapeHtml(section.id || "")}">
			</div>

			<div class="form-group">
				<label>Section Label</label>
				<input id="cpqbSectionLabel" class="tool-input" value="${cpqbEscapeHtml(section.label || "")}">
			</div>

			<label style="display:flex;gap:8px;align-items:center;font-weight:bold;color:#2e7d32;">
				<input id="cpqbSectionComplete" type="checkbox" ${section.complete ? "checked" : ""}>
				Section Complete / Commissioned
			</label>
		`;

		cpqbShowDialog("Edit Section", html, function (dialog)
		{
			const label = dialog.querySelector("#cpqbSectionLabel").value.trim();
			const id = dialog.querySelector("#cpqbSectionId").value.trim();

			if (!label)
			{
				alert("Section label is required.");
				return false;
			}

			section.label = label;
			section.id = id || cpqbSlug(label);
			section.complete = dialog.querySelector("#cpqbSectionComplete").checked;

			render();
			return true;
		});
	}
	
	async function copySectionJson(sectionIndex)
	{
		const section = questionnaire.sections[sectionIndex];

		if (!section)
		{
			return;
		}

		const json = JSON.stringify(section, null, 2);

		try
		{
			await navigator.clipboard.writeText(json);
			alert("Section JSON copied to clipboard.");
		}
		catch (err)
		{
			cpqbShowJsonDialog("Copy Section JSON", json, function ()
			{
				return true;
			});
		}
	}

	function pasteSectionJson(sectionIndex)
	{
		const section = questionnaire.sections[sectionIndex];

		if (!section)
		{
			return;
		}

		cpqbShowJsonDialog(
			"Paste Section JSON",
			JSON.stringify(section, null, 2),
			function (dialog)
			{
				const rawJson = dialog.querySelector("#cpqbJsonText").value;

				let parsed = null;

				try
				{
					parsed = JSON.parse(rawJson);
				}
				catch (err)
				{
					alert("Invalid JSON: " + err.message);
					return false;
				}

				if (!parsed.id || !parsed.label || !Array.isArray(parsed.questions))
				{
					alert("Section JSON must include id, label, and questions array.");
					return false;
				}

				questionnaire.sections[sectionIndex] = parsed;

				render();
				return true;
			}
		);
	}	
	
	function duplicateSection(sectionIndex)
	{
		const source = questionnaire.sections[sectionIndex];
		const copy = cpqbClone(source);

		copy.id = cpqbUniqueSectionId(copy.id || "section_copy", questionnaire.sections);
		copy.label = (copy.label || "Untitled Section") + " Copy";
		copy.complete = false;

		questionnaire.sections.splice(sectionIndex + 1, 0, copy);

		render();
	}
	
	function moveSection(sectionIndex, direction)
	{
		const targetIndex = sectionIndex + direction;

		if (
			targetIndex < 0 ||
			targetIndex >= questionnaire.sections.length
		)
		{
			return;
		}

		const moved = questionnaire.sections.splice(sectionIndex, 1)[0];

		questionnaire.sections.splice(targetIndex, 0, moved);

		render();
	}

	function moveQuestion(sectionIndex, questionIndex, direction)
	{
		const section = questionnaire.sections[sectionIndex];

		if (!section || !Array.isArray(section.questions))
		{
			return;
		}

		const targetIndex = questionIndex + direction;

		if (
			targetIndex < 0 ||
			targetIndex >= section.questions.length
		)
		{
			return;
		}

		const moved = section.questions.splice(questionIndex, 1)[0];

		section.questions.splice(targetIndex, 0, moved);

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

	function duplicateQuestion(sectionIndex, questionIndex)
	{
	    const section = questionnaire.sections[sectionIndex];
	
	    if (!section || !Array.isArray(section.questions))
	    {
	        return;
	    }
	
	    const source = section.questions[questionIndex];
	    const copy = cpqbClone(source);
	
	    copy.id = cpqbUniqueQuestionId(copy.id || "question_copy", questionnaire.sections);
	    copy.label = (copy.label || "Untitled Question");
	    copy.complete = false;
	
	    section.questions.splice(questionIndex + 1, 0, copy);
	
	    render();
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

	function testSection(sectionIndex)
	{
		const section = questionnaire.sections[sectionIndex];
	
		cpqbShowSectionTestDialog(section);
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

	const sectionCompleteIcon = section.complete === true
		? `<span style="color:#2e7d32;font-size:28px;font-weight:bold;">✓</span>`
		: "";

	const attentionCount = questions.filter(function (question)
	{
	    return question.attention === true;
	}).length;
	
	const attentionBadge = attentionCount > 0
	    ? `<span style="background:#fef3c7;color:#92400e;border:1px solid #f59e0b;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:bold;">
	        ${attentionCount} attention highlight${attentionCount === 1 ? "" : "s"}
	       </span>`
	    : "";	
	
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
						${attentionBadge}
                    </div>
                </div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;">
					${cpqbIconButton(
						"square-arrow-up",
						"Move Section Up",
						`data-cpqb-section-up="${sectionIndex}"`,
						"#64748b"
					)}

					${cpqbIconButton(
						"square-arrow-down",
						"Move Section Down",
						`data-cpqb-section-down="${sectionIndex}"`,
						"#64748b"
					)}

					${cpqbIconButton(
						"copy-plus",
						"Duplicate Section",
						`data-cpqb-duplicate-section="${sectionIndex}"`,
						"#64748b"
					)}

					${cpqbIconButton(
						"bug-play",
						"Test Section",
						`data-cpqb-test-section="${sectionIndex}"`,
						"#64748b"
					)}

					${cpqbIconButton(
						"circle-plus",
						"Add Question",
						`data-cpqb-add-question="${sectionIndex}"`,
						"#0193cf"
					)}

					${cpqbIconButton(
						"pencil",
						"Edit Section",
						`data-cpqb-edit-section="${sectionIndex}"`,
						"#64748b"
					)}
					
					${cpqbIconButton(
						"clipboard-copy",
						"Copy Section JSON",
						`data-cpqb-copy-section-json="${sectionIndex}"`,
						"#64748b"
					)}

					${cpqbIconButton(
						"clipboard-paste",
						"Paste Section JSON",
						`data-cpqb-paste-section-json="${sectionIndex}"`,
						"#64748b"
					)}					

					${cpqbIconButton(
						"circle-x",
						"Delete Section",
						`data-cpqb-delete-section="${sectionIndex}"`,
						"#c62828"
					)}
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

	const attentionIcon = question.attention
	    ? `<span title="Attention Required" style="color:#b45309;font-size:20px;font-weight:bold;">⚠</span>`
	    : "";	
	
    return `
			<div
			    class="cpqb-question-row"
			    data-section-index="${sectionIndex}"
			    data-question-index="${questionIndex}"
				style="
					border:${question.attention ? "1px solid #f59e0b" : "1px solid #ddd"};
					border-left:${question.attention ? "5px solid #f59e0b" : "1px solid #ddd"};
					border-radius:10px;
					padding:12px;
					margin-bottom:10px;
					background:${question.attention ? "#fffbeb" : "#fff"};
					cursor:grab;
				"
        >
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
                <div>
					<span style="display:flex;gap:8px;align-items:center;">
					    ${completeIcon}
						${attentionIcon}
						${question.attention ? `<span style="color:#92400e;font-size:12px;font-weight:bold;">Attention</span>` : ""}
					    <strong>${cpqbEscapeHtml(question.label || "Untitled Question")}</strong>
					</span>
					
					<div class="status">
					    ID: ${cpqbEscapeHtml(question.id || "")}
					    | Type: ${cpqbEscapeHtml(question.type || "")}
					    | Options: ${cpqbEscapeHtml(cpqbOptionsCsv(question.options))}
					    | Visible when: ${cpqbEscapeHtml(question.visibleWhen || question.visiblewhen || "")}
					    ${question.helper ? "| Has helper" : "| No helper"}
					    | Reports: ${cpqbEscapeHtml((question.reports || []).join(", "))}
					</div>
                </div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;">
					${cpqbIconButton(
						"arrow-up",
						"Move Question Up",
						`data-cpqb-question-up="1" data-section-index="${sectionIndex}" data-question-index="${questionIndex}"`,
						"#64748b"
					)}

					${cpqbIconButton(
						"arrow-down",
						"Move Question Down",
						`data-cpqb-question-down="1" data-section-index="${sectionIndex}" data-question-index="${questionIndex}"`,
						"#64748b"
					)}

					${cpqbIconButton(
						"pencil",
						"Edit Question",
						`data-cpqb-edit-question="1" data-section-index="${sectionIndex}" data-question-index="${questionIndex}"`,
						"#64748b"
					)}

					${cpqbIconButton(
					    "copy-plus",
					    "Duplicate Question",
					    `data-cpqb-duplicate-question="1" data-section-index="${sectionIndex}" data-question-index="${questionIndex}"`,
					    "#64748b"
					)}					

					${cpqbIconButton(
						"circle-x",
						"Delete Question",
						`data-cpqb-delete-question="1" data-section-index="${sectionIndex}" data-question-index="${questionIndex}"`,
						"#c62828"
					)}
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
        reports: ["quote","engineering"],
		complete: false,
		attention: false,
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

					<label style="display:flex;gap:8px;align-items:center;margin-bottom:12px;font-weight:bold;color:#b45309;">
					    <input id="cpqbQuestionAttention" type="checkbox" ${question.attention ? "checked" : ""}>
					    Attention Required
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
		attention: dialog.querySelector("#cpqbQuestionAttention").checked,
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

function cpqbShowJsonDialog(title, jsonText, onSave)
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
                width:min(1000px,100%);
                border-radius:14px;
                padding:20px;
                box-shadow:0 10px 30px rgba(0,0,0,0.25);
            "
        >
            <h2 style="margin-top:0;">
                ${cpqbEscapeHtml(title)}
            </h2>

            <div class="form-group">
                <label>Section JSON</label>

                <textarea
                    id="cpqbJsonText"
                    class="tool-input"
                    rows="24"
                    style="font-family:Consolas, Monaco, monospace;font-size:13px;"
                >${cpqbEscapeHtml(jsonText)}</textarea>
            </div>

            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap;">
                <button id="cpqbJsonCancel" class="login-button" type="button" style="width:auto;background:#777;">
                    Cancel
                </button>

                <button id="cpqbJsonSave" class="login-button" type="button" style="width:auto;background:#2e7d32;">
                    Apply JSON
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("#cpqbJsonCancel").addEventListener("click", function ()
    {
        document.body.removeChild(overlay);
    });

    overlay.querySelector("#cpqbJsonSave").addEventListener("click", function ()
    {
        const shouldClose = onSave(overlay);

        if (shouldClose)
        {
            document.body.removeChild(overlay);
        }
    });

    overlay.querySelector("#cpqbJsonText").focus();
    overlay.querySelector("#cpqbJsonText").select();
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

function cpqbUniqueSectionId(baseId, sections)
{
    const cleanBase = cpqbSlug(baseId || "section");
    let candidate = cleanBase + "_copy";
    let counter = 2;

    const existingIds = sections.map(function (section)
    {
        return section.id;
    });

    while (existingIds.includes(candidate))
    {
        candidate = cleanBase + "_copy_" + counter;
        counter += 1;
    }

    return candidate;
}

function cpqbUniqueQuestionId(baseId, sections)
{
    const cleanBase = String(baseId || "question").trim();

    let candidate = cleanBase + "_copy";
    let counter = 2;

    const existingIds = [];

    sections.forEach(function (section)
    {
        (section.questions || []).forEach(function (question)
        {
            existingIds.push(question.id);
        });
    });

    while (existingIds.includes(candidate))
    {
        candidate = cleanBase + "_copy" + counter;
        counter += 1;
    }

    return candidate;
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
        const visible = true; //cpqbQuestionVisibleForTest(question, testAnswers);

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
	
	        if (
	            input.tagName === "SELECT" ||
	            input.type === "checkbox" ||
	            input.type === "radio"
	        )
	        {
	            document.body.removeChild(latestOverlay);
	
	            helperAnswers[parentQuestion.id] = subAnswers;
	
	            cpqbShowHelperTestDialog(parentQuestion, parentAnswers, helperAnswers);
	        }
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

function cpqbShowSectionTestDialog(section)
{
    const answers = {};

    function renderSectionTest()
    {
        const questions = Array.isArray(section.questions) ? section.questions : [];

        cpqbShowDialog("Test Section - " + (section.label || section.id || ""), `
            <div class="status" style="margin-bottom:12px;">
                This test uses the unsaved settings from the builder.
            </div>

            <div style="border:1px solid #ddd;border-radius:12px;padding:14px;">
                <h3 style="margin-top:0;">
                    ${cpqbEscapeHtml(section.label || section.id || "Section")}
                </h3>

                ${questions.map(function (question)
                {
                    if (!cpqbQuestionVisibleForTest(question, answers))
                    {
                        return "";
                    }

                    return cpqbRenderTestQuestion(question, answers);
                }).join("")}
            </div>
        `, function ()
        {
            return true;
        });

        const latestOverlay = document.body.lastElementChild;

        latestOverlay.querySelectorAll("[data-cpqb-test-question]").forEach(function (input)
        {
            input.addEventListener("input", function ()
            {
                cpqbSetTestAnswer(input, answers);
            });

			input.addEventListener("change", function ()
			{
			    cpqbSetTestAnswer(input, answers);
			
			    if (
			        input.tagName === "SELECT" ||
			        input.type === "checkbox" ||
			        input.type === "radio"
			    )
			    {
			        document.body.removeChild(latestOverlay);
			        renderSectionTest();
			    }
			});
        });

        latestOverlay.querySelectorAll("[data-cpqb-test-helper]").forEach(function (button)
        {
            button.addEventListener("click", function ()
            {
                const questionId = button.dataset.cpqbTestHelper;
                const question = questions.find(function (candidate)
                {
                    return candidate.id === questionId;
                });

                if (question)
                {
                    cpqbShowHelperTestDialog(question, answers, {});
                }
            });
        });
    }

    renderSectionTest();
}

function cpqbIconButton(iconName, title, extraAttributes, background, extraClass)
{
    return `
        <button
            class="login-button cpqb-icon-button ${extraClass || ""}"
            type="button"
            title="${cpqbEscapeHtml(title)}"
            aria-label="${cpqbEscapeHtml(title)}"
            style="width:auto;background:${background || "#64748b"};"
            ${extraAttributes || ""}
        >
            <i data-lucide="${cpqbEscapeHtml(iconName)}"></i>
        </button>
    `;
}

function cpqbOptionsCsv(options)
{
    if (!Array.isArray(options) || !options.length)
    {
        return "";
    }

    return options.join(", ");
}
