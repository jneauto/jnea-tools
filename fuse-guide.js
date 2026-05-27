async function renderFuseGuidePlaceholder()
{
  const sb = window.jnea.sb;

  document.getElementById("pageTitle").textContent = "Fuse Guide";

  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="card">
      Loading fuse guide...
    </div>
  `;

  try
  {
    const questionsResponse = await sb
      .from("questions")
      .select("*")
      .order("questionorder");

    const fuseResponse = await sb
      .from("fusecatalog")
      .select("*");

    const holderResponse = await sb
      .from("fuseholdercatalog")
      .select("*");

    const rulesResponse = await sb
      .from("rules")
      .select("*");

    if (questionsResponse.error)
    {
      throw questionsResponse.error;
    }

    if (fuseResponse.error)
    {
      throw fuseResponse.error;
    }

    if (holderResponse.error)
    {
      throw holderResponse.error;
    }

    if (rulesResponse.error)
    {
      throw rulesResponse.error;
    }

    renderFuseGuideTool(
      questionsResponse.data || [],
      fuseResponse.data || [],
      holderResponse.data || [],
      rulesResponse.data || []
    );
  }
  catch (err)
  {
    console.error("Fuse guide load error:", err);

    content.innerHTML = `
      <div class="card">
        <h2>Fuse Guide</h2>

        <div style="color:#c62828;font-weight:bold;">
          Could not load fuse guide data.
        </div>

        <pre>${err.message}</pre>
      </div>
    `;
  }
}

function renderFuseGuideTool(questions, fuses, holders, rules)
{
  let selectedApplication = "";
  let answers = {};

  function render()
  {
    document.getElementById("content").innerHTML = `
      <div class="card">
        <h2 style="margin-top:0;">
          Fuse Selection Guide
        </h2>

        <p>
          Select fuse holders and fuses for common panel design applications.
        </p>

        <div
          style="
            display:inline-block;
            background:#ffd54f;
            color:#4e3b00;
            border:1px solid #e0b400;
            border-radius:999px;
            padding:6px 12px;
            font-size:12px;
            font-weight:bold;
            letter-spacing:0.4px;
            margin-bottom:18px;
          "
        >
          GUIDE ONLY — to be verified by you and confirmed by a qualified engineer.
        </div>

        <div class="form-group">
          <label>What do you need to fuse?</label>

          <select id="fgApplicationSelect" class="tool-select">
            <option value="">Select...</option>

            ${fgGetAvailableApplications(questions).map(function (id)
            {
              return `
                <option value="${fgEscapeHtml(id)}" ${selectedApplication === id ? "selected" : ""}>
                  ${fgEscapeHtml(fgGetApplicationLabel(id))}
                </option>
              `;
            }).join("")}
          </select>
        </div>

        <div id="fgQuestionArea"></div>
        <div id="fgResultArea"></div>
      </div>
    `;

    document.getElementById("fgApplicationSelect").addEventListener("change", function (event)
    {
      selectedApplication = event.target.value;
      answers = {};
      render();
    });

    renderQuestions();
  }

  function renderQuestions()
  {
    const area = document.getElementById("fgQuestionArea");

    if (!selectedApplication)
    {
      area.innerHTML = "";
      return;
    }

    const allQuestions = fgGetQuestionsForApplication(questions, selectedApplication);

    allQuestions.forEach(function (question)
    {
      const questionId = question.questionid;

      if (
        typeof answers[questionId] === "undefined" ||
        answers[questionId] === null ||
        answers[questionId] === ""
      )
      {
        answers[questionId] = question.defaultvalue ?? "";
      }
    });

    const visibleQuestions = allQuestions.filter(function (question)
    {
      return fgQuestionIsVisible(question, answers);
    });

    area.innerHTML = `
      ${visibleQuestions.map(function (question)
      {
        const questionId = question.questionid;
        const options = fgSplitList(question.options);
        const value = answers[questionId] ?? "";

        if (question.type === "select")
        {
          return `
            <div class="form-group">
              <label>${fgEscapeHtml(question.label)}</label>

              <select data-fg-question="${fgEscapeHtml(questionId)}" class="tool-select">
                <option value="">Select...</option>

                ${options.map(function (option)
                {
                  return `
                    <option value="${fgEscapeHtml(option)}" ${String(value) === String(option) ? "selected" : ""}>
                      ${fgEscapeHtml(option)}
                    </option>
                  `;
                }).join("")}
              </select>

              ${question.helptext ? `<div class="status">${fgEscapeHtml(question.helptext)}</div>` : ""}
            </div>
          `;
        }

        return `
          <div class="form-group">
            <label>
              ${fgEscapeHtml(question.label)}
              ${question.unit ? ` (${fgEscapeHtml(question.unit)})` : ""}
            </label>

            <input
              type="number"
              step="any"
              data-fg-question="${fgEscapeHtml(questionId)}"
              value="${fgEscapeHtml(value)}"
              class="tool-input"
            >

            ${question.helptext ? `<div class="status">${fgEscapeHtml(question.helptext)}</div>` : ""}
          </div>
        `;
      }).join("")}

      <button
        id="fgCalculateButton"
        class="login-button"
        style="margin-top:8px;"
      >
        Calculate Guide Selection
      </button>
    `;

    area.querySelectorAll("[data-fg-question]").forEach(function (input)
    {
      input.addEventListener("input", function (event)
      {
        answers[event.target.dataset.fgQuestion] = event.target.value;
      });

      input.addEventListener("change", function (event)
      {
        answers[event.target.dataset.fgQuestion] = event.target.value;
        renderQuestions();
      });
    });

    document.getElementById("fgCalculateButton").addEventListener("click", calculateAndRender);
  }

  function calculateAndRender()
  {
    const resultArea = document.getElementById("fgResultArea");

    const matchedRules = rules.filter(function (rule)
    {
      if (rule.applicationid !== selectedApplication)
      {
        return false;
      }

      if (rule.matchquestionid && rule.matchvalue)
      {
        if (fgNormalize(answers[rule.matchquestionid]) !== fgNormalize(rule.matchvalue))
        {
          return false;
        }
      }

      if (rule.matchquestionid2 && rule.matchvalue2)
      {
        if (fgNormalize(answers[rule.matchquestionid2]) !== fgNormalize(rule.matchvalue2))
        {
          return false;
        }
      }

      return true;
    });

    if (!matchedRules.length)
    {
      resultArea.innerHTML = `
        <div class="card" style="border-left:5px solid #f59e0b;">
          No rules found for this application.
        </div>
      `;

      return;
    }

    const results = matchedRules.map(function (rule)
    {
      const baseCurrent = fgCalculateBaseCurrent(selectedApplication, rule, answers);
      const multiplier = fgNumberValue(rule.multiplier) || 1;
      const calculatedAmps = baseCurrent * multiplier;
      const target = rule.target || "line";

      const currentType = fgGetCurrentType(selectedApplication, answers, target);
      const voltage = fgGetSystemVoltage(selectedApplication, answers, target);
      const phases = fgGetPhases(selectedApplication, answers, target);

      const system =
      {
        currentType: currentType,
        voltage: voltage,
        phases: phases,
        requiredPoles: fgGetRequiredPoles(currentType, phases)
      };

      let fuse = null;

      if (rule.fixedfusepartnumber)
      {
        fuse = fuses.find(function (candidate)
        {
          return fgNormalize(candidate.partnumber) === fgNormalize(rule.fixedfusepartnumber);
        }) || null;
      }
      else
      {
        fuse = fgSelectFuse(fuses, calculatedAmps, system, rule);
      }

      let holder = null;

      if (rule.fixedholderpartnumber)
      {
        holder = holders.find(function (candidate)
        {
          return fgNormalize(candidate.partnumber) === fgNormalize(rule.fixedholderpartnumber);
        }) || null;
      }
      else if (fuse)
      {
        holder = fgSelectFuseHolder(holders, fuse, system);
      }

      return {
        rule: rule,
        baseCurrent: baseCurrent,
        calculatedAmps: calculatedAmps,
        system: system,
        fuse: fuse,
        holder: holder
      };
    });

    resultArea.innerHTML = results.map(function (result)
    {
      return fgRenderFuseResult(selectedApplication, result, answers);
    }).join("");
  }

  render();
}

function fgNumberValue(value)
{
  return Number(String(value || "").replace(/[^\d.-]/g, ""));
}

function fgSplitList(value)
{
  return String(value || "")
    .split(/[|,]/)
    .map(function (item)
    {
      return item.trim();
    })
    .filter(Boolean);
}

function fgNormalize(value)
{
  return String(value || "").trim().toUpperCase();
}

function fgGetApplicationLabel(applicationId)
{
  const labels =
  {
    panelFeed: "Panel Feed",
    transformer: "Transformer",
    powerSupply: "Power Supply",
    io: "I/O Points",
    motor: "Motor",
    plcCard: "PLC Cards"
  };

  return labels[applicationId] || applicationId;
}

function fgGetAvailableApplications(questions)
{
  return [...new Set(
    questions
      .map(function (question)
      {
        return question.applicationid;
      })
      .filter(Boolean)
  )];
}

function fgGetQuestionsForApplication(questions, applicationId)
{
  return questions
    .filter(function (question)
    {
      return question.applicationid === applicationId;
    })
    .sort(function (a, b)
    {
      return fgNumberValue(a.questionorder) - fgNumberValue(b.questionorder);
    });
}

function fgQuestionIsVisible(question, answers)
{
  if (!question.visiblewhen)
  {
    return true;
  }

  const parts = String(question.visiblewhen).split("=");
  const questionId = parts[0];
  const allowedValuesRaw = parts[1];

  if (!questionId || !allowedValuesRaw)
  {
    return true;
  }

  const allowedValues = allowedValuesRaw
    .split("|")
    .map(function (value)
    {
      return fgNormalize(value);
    });

  return allowedValues.includes(fgNormalize(answers[questionId]));
}

function fgTransformerFla(kva, voltage, phases)
{
  const va = kva * 1000;

  if (Number(phases) === 3)
  {
    return va / (voltage * Math.sqrt(3));
  }

  return va / voltage;
}

function fgPowerSupplyInputCurrent(watts, voltage, phases)
{
  if (Number(phases) === 3)
  {
    return watts / (voltage * Math.sqrt(3));
  }

  return watts / voltage;
}

function fgGetSystemVoltage(applicationId, answers, target)
{
  if (applicationId === "transformer")
  {
    return target === "secondary"
      ? fgNumberValue(answers.secondaryVoltage)
      : fgNumberValue(answers.primaryVoltage);
  }

  if (applicationId === "powerSupply")
  {
    return target === "output"
      ? fgNumberValue(answers.outputVoltage)
      : fgNumberValue(answers.inputVoltage);
  }

  if (applicationId === "motor")
  {
    return fgNumberValue(answers.motorVoltage);
  }

  return fgNumberValue(answers.voltage);
}

function fgGetCurrentType(applicationId, answers, target)
{
  if (applicationId === "powerSupply" && target === "output")
  {
    return "DC";
  }

  if (applicationId === "io")
  {
    return String(answers.voltage || "").toUpperCase().includes("DC") ? "DC" : "AC";
  }

  return answers.currentType || "AC";
}

function fgGetPhases(applicationId, answers, target)
{
  if (applicationId === "transformer")
  {
    return target === "secondary"
      ? fgNumberValue(answers.secondaryPhases)
      : fgNumberValue(answers.primaryPhases);
  }

  if (applicationId === "powerSupply")
  {
    return fgNumberValue(answers.inputPhases);
  }

  if (applicationId === "motor")
  {
    return fgNumberValue(answers.motorPhases);
  }

  return fgNumberValue(answers.phases);
}

function fgGetRequiredPoles(currentType, phases)
{
  if (currentType === "DC")
  {
    return 1;
  }

  if (Number(phases) === 3)
  {
    return 3;
  }

  if (Number(phases) === 2)
  {
    return 2;
  }

  return 1;
}

function fgCalculateBaseCurrent(applicationId, rule, answers)
{
  const formulaType = rule.formulatype;

  if (formulaType === "totalCurrentWithSpare")
  {
    const total = fgNumberValue(answers.totalCurrent);
    const spare = fgNumberValue(answers.spareCapacity);

    return total * (1 + spare / 100);
  }

  if (formulaType === "powerSupplyInputCurrent")
  {
    return fgPowerSupplyInputCurrent(
      fgNumberValue(answers.powerWatts),
      fgNumberValue(answers.inputVoltage),
      fgNumberValue(answers.inputPhases)
    );
  }

  if (formulaType === "outputCurrent")
  {
    return fgNumberValue(answers.outputCurrent);
  }

  if (formulaType === "motorFLA")
  {
    const source = fgNormalize(answers.motorCurrentSource);
    const voltage = fgNumberValue(answers.motorVoltage);
    const phases = fgNumberValue(answers.motorPhases);
    const efficiency = fgNumberValue(answers.motorEfficiency) / 100 || 0.9;

    if (source === "NAMEPLATE FLA" || source === "FLA" || source === "MOTOR FLA")
    {
      return fgNumberValue(answers.fla || answers.motorFLA || answers.nameplateFLA);
    }

    if (source === "HP")
    {
      const hp = fgNumberValue(answers.motorHP);
      const watts = hp * 746;

      if (phases === 3)
      {
        return watts / (voltage * Math.sqrt(3) * efficiency);
      }

      return watts / (voltage * efficiency);
    }

    if (source === "KW")
    {
      const kw = fgNumberValue(answers.motorKW);
      const watts = kw * 1000;

      if (phases === 3)
      {
        return watts / (voltage * Math.sqrt(3) * efficiency);
      }

      return watts / (voltage * efficiency);
    }

    return 0;
  }

  if (formulaType === "transformerPrimaryFLA")
  {
    return fgTransformerFla(
      fgNumberValue(answers.kva),
      fgNumberValue(answers.primaryVoltage),
      fgNumberValue(answers.primaryPhases)
    );
  }

  if (formulaType === "transformerSecondaryFLA")
  {
    return fgTransformerFla(
      fgNumberValue(answers.kva),
      fgNumberValue(answers.secondaryVoltage),
      fgNumberValue(answers.secondaryPhases)
    );
  }

  if (formulaType === "ioEstimatedCurrent")
  {
    return fgNumberValue(answers.current || 1);
  }

  return 0;
}

function fgFuseSupportsSystem(fuse, system)
{
  if (system.currentType === "AC")
  {
    return fgNumberValue(fuse.acvoltagemax) >= system.voltage;
  }

  if (system.currentType === "DC")
  {
    return fgNumberValue(fuse.dcvoltagemax) >= system.voltage;
  }

  return false;
}

function fgSelectFuse(fuses, calculatedAmps, system, rule)
{
  const baseCandidates = fuses.filter(function (fuse)
  {
    return (
      fgFuseSupportsSystem(fuse, system) &&
      fgNumberValue(fuse.amps) >= calculatedAmps
    );
  });

  const classSequence = fgSplitList(rule.fuseclass);

  for (const fuseClass of classSequence)
  {
    const classMatches = baseCandidates.filter(function (fuse)
    {
      return fgNormalize(fuse.fuseclass) === fgNormalize(fuseClass);
    });

    if (classMatches.length)
    {
      return classMatches.sort(function (a, b)
      {
        return fgNumberValue(a.amps) - fgNumberValue(b.amps);
      })[0];
    }
  }

  return baseCandidates.sort(function (a, b)
  {
    return fgNumberValue(a.amps) - fgNumberValue(b.amps);
  })[0] || null;
}

function fgHolderSupportsFuse(holder, fuse)
{
  const holderClasses = fgSplitList(holder.fuseclasses || holder.fuseclass).map(fgNormalize);

  return holderClasses.includes(fgNormalize(fuse.fuseclass));
}

function fgSelectFuseHolder(holders, fuse, system)
{
  return holders
    .filter(function (holder)
    {
      return fgHolderSupportsFuse(holder, fuse);
    })
    .filter(function (holder)
    {
      return fgNumberValue(holder.maxamps) >= fgNumberValue(fuse.amps);
    })
    .filter(function (holder)
    {
      if (system.currentType === "AC")
      {
        return fgNumberValue(holder.acvoltagemax) >= system.voltage;
      }

      if (system.currentType === "DC")
      {
        return fgNumberValue(holder.dcvoltagemax) >= system.voltage;
      }

      return false;
    })
    .filter(function (holder)
    {
      return fgNumberValue(holder.poles) >= system.requiredPoles;
    })
    .sort(function (a, b)
    {
      return (
        fgNumberValue(a.poles) - fgNumberValue(b.poles) ||
        fgNumberValue(a.maxamps) - fgNumberValue(b.maxamps)
      );
    })[0] || null;
}

function fgGetFormulaReference(applicationId, rule, answers)
{
  if (rule.formulatype === "motorFLA")
  {
    const source = fgNormalize(answers.motorCurrentSource);

    if (source === "HP")
    {
      const hp = fgNumberValue(answers.motorHP);
      const voltage = fgNumberValue(answers.motorVoltage);
      const phases = fgNumberValue(answers.motorPhases);
      const efficiency = fgNumberValue(answers.motorEfficiency) / 100 || 0.9;

      if (phases === 3)
      {
        return `Calculated Current FLA = (${hp} HP × 746) ÷ (${voltage}V × √3 × ${efficiency})`;
      }

      return `Calculated Current FLA = (${hp} HP × 746) ÷ (${voltage}V × ${efficiency})`;
    }

    if (source === "KW")
    {
      return "Calculated Current FLA = (kW × 1000) ÷ (Voltage × √3 × Efficiency)";
    }

    if (source === "NAMEPLATE FLA" || source === "FLA" || source === "MOTOR FLA")
    {
      return "Calculated FLA entered from motor nameplate.";
    }
  }

  if (rule.formulatype === "transformerPrimaryFLA" || rule.formulatype === "transformerSecondaryFLA")
  {
    const phases = rule.formulatype === "transformerSecondaryFLA"
      ? fgNumberValue(answers.secondaryPhases)
      : fgNumberValue(answers.primaryPhases);

    if (phases === 3)
    {
      return "Calculated Current FLA = (kVA × 1000) ÷ (Voltage × √3)";
    }

    return "Calculated Current FLA = (kVA × 1000) ÷ Voltage";
  }

  if (rule.formulatype === "powerSupplyInputCurrent")
  {
    const phases = fgNumberValue(answers.inputPhases);

    if (phases === 3)
    {
      return "Input Current FLA = Watts ÷ (Voltage × √3)";
    }

    return "Input Current FLA = Watts ÷ Voltage";
  }

  if (rule.formulatype === "outputCurrent")
  {
    return "Output current entered by user.";
  }

  if (rule.formulatype === "totalCurrentWithSpare")
  {
    return "Calculated Current = Total Current × (1 + Spare Capacity ÷ 100).";
  }

  return "Calculated from selected rule.";
}

function fgPartLinkHtml(url, label)
{
  const link = String(url || "").trim();

  if (!link)
  {
    return "";
  }

  return `
    <div>
      <strong>Part Link:</strong>
      <a href="${fgEscapeAttribute(link)}" target="_blank" rel="noopener noreferrer">
        ${fgEscapeHtml(label)}
      </a>
    </div>
  `;
}

function fgRenderFuseResult(applicationId, result, answers)
{
  return `
    <div style="height:18px;"></div>

    <div
      style="
        display:inline-block;
        background:#ffd54f;
        color:#4e3b00;
        border:1px solid #e0b400;
        border-radius:999px;
        padding:6px 12px;
        font-size:12px;
        font-weight:bold;
        letter-spacing:0.4px;
      "
    >
      USE AT YOUR OWN RISK: JNE IS NOT RESPONSIBLE FOR LOSS OR DAMAGES RESULTING FROM YOUR USE OF THIS TOOL!
    </div>

    <div class="card" style="border-left:5px solid #0193cf;margin-top:18px;">
      <h2 style="margin-top:0;">
        ${fgEscapeHtml(result.rule.rulename || result.rule.ruleid)}
      </h2>

      <div style="font-size:15px;font-weight:bold;margin-bottom:8px;">
        Recommended Fuse Holder:
      </div>

      <div style="font-size:28px;font-weight:700;color:#005bbb;line-height:1.15;margin-top:2px;margin-bottom:18px;">
        ${fgEscapeHtml(result.holder?.partnumber || "No Match Found")}
      </div>

      <div style="font-size:15px;font-weight:bold;margin-bottom:8px;">
        Recommended Fuse:
      </div>

      <div style="font-size:28px;font-weight:700;color:#005bbb;line-height:1.15;margin-top:2px;margin-bottom:18px;">
        ${fgEscapeHtml(result.fuse?.partnumber || "No Match Found")}
      </div>

      <div style="border-top:1px solid #ddd;padding-top:14px;margin-top:16px;">
        <div style="font-size:15px;font-weight:bold;margin-bottom:8px;">
          Calculations:
        </div>

        <div class="status">
          <div><strong>Calculated Current Formula:</strong> ${fgEscapeHtml(fgGetFormulaReference(applicationId, result.rule, answers))}</div>
          <div><strong>Fuse Selection Formula:</strong> Fuse Selection Current = Calculated Current × Rule Multiplier</div>
          <div><strong>Calculated Current:</strong> ${result.baseCurrent.toFixed(3)} A</div>
          <div><strong>Rule Multiplier:</strong> ${fgNumberValue(result.rule.multiplier) || 1}</div>
          <div><strong>Fuse Selection Current:</strong> ${result.calculatedAmps.toFixed(3)} A</div>
        </div>
      </div>

      <div style="border-top:1px solid #ddd;padding-top:14px;margin-top:16px;">
        <div style="font-size:15px;font-weight:bold;margin-bottom:8px;">
          Fuse Holder Specs:
        </div>

        ${
          result.holder
            ? `
              <div class="status">
                <div><strong>Description:</strong> ${fgEscapeHtml(result.holder.description || "")}</div>
                <div><strong>Fuse Classes:</strong> ${fgEscapeHtml(result.holder.fuseclasses || result.holder.fuseclass || "")}</div>
                <div><strong>Poles:</strong> ${fgEscapeHtml(result.holder.poles || "")}</div>
                <div><strong>Max Amps:</strong> ${fgEscapeHtml(result.holder.maxamps || "")} A</div>
                <div><strong>AC Voltage:</strong> ${fgEscapeHtml(result.holder.acvoltagemax || "")} V</div>
                <div><strong>DC Voltage:</strong> ${fgEscapeHtml(result.holder.dcvoltagemax || "")} V</div>
                <div><strong>Terminal Type:</strong> ${fgEscapeHtml(result.holder.terminaltype || "")}</div>
                ${fgPartLinkHtml(result.holder.partlink, "Open Fuse Holder Link")}
              </div>
            `
            : `
              <div style="color:#c62828;font-weight:bold;">
                No matching fuse holder found.
              </div>
            `
        }
      </div>

      <div style="border-top:1px solid #ddd;padding-top:14px;margin-top:16px;">
        <div style="font-size:15px;font-weight:bold;margin-bottom:8px;">
          Fuse Specs:
        </div>

        ${
          result.fuse
            ? `
              <div class="status">
                <div><strong>Fuse Class:</strong> ${fgEscapeHtml(result.fuse.fuseclass || "")}</div>
                <div><strong>Current Rating:</strong> ${fgEscapeHtml(result.fuse.amps || "")} A</div>
                <div><strong>Blow Speed:</strong> ${fgEscapeHtml(result.fuse.blowspeed || "")}</div>
                <div><strong>AC Voltage:</strong> ${fgEscapeHtml(result.fuse.acvoltagemax || "")} V</div>
                <div><strong>DC Voltage:</strong> ${fgEscapeHtml(result.fuse.dcvoltagemax || "")} V</div>
                <div><strong>Fuse Selection Current:</strong> ${result.calculatedAmps.toFixed(2)} A</div>
                ${fgPartLinkHtml(result.fuse.partlink, "Open Fuse Link")}
              </div>
            `
            : `
              <div style="color:#c62828;font-weight:bold;">
                No matching fuse found.
              </div>
            `
        }
      </div>
    </div>
  `;
}

function fgEscapeHtml(value)
{
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fgEscapeAttribute(value)
{
  return fgEscapeHtml(value);
}
