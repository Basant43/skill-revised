/* SkillGap AI — assessment wizard (index.html) and personalized roadmap (career.html)
   Needs data.js (careerData, sectorProfiles, regionData) loaded first. */
(function () {
  "use strict";

  const STORE_KEY = "skillgapai_answers";
  const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
  const GOAL_LABEL = { firstJob: "First job", betterSalary: "Better salary", freelance: "Freelance" };
  const HOURS = {
    lt5: { label: "Under 5 hrs/week", value: 4 },
    "5to10": { label: "5–10 hrs/week", value: 7 },
    "10to20": { label: "10–20 hrs/week", value: 15 },
    "20plus": { label: "20+ hrs/week", value: 25 }
  };

  // Proof-of-work question, worded for each field
  const PROOF = {
    creative: { label: "How big is your portfolio?", options: ["No portfolio yet", "1–3 pieces", "4+ pieces with case studies"] },
    technology: { label: "How many projects have you built?", options: ["No projects yet", "1–2 small projects", "3+ projects, public or live"] },
    business: { label: "What practical experience do you have?", options: ["None yet", "Internship or academic case work", "Real work with measurable results"] },
    healthcare: { label: "What clinical or research exposure do you have?", options: ["None yet", "Rotations or observation", "Hands-on practice or published work"] },
    engineering: { label: "What project work have you done?", options: ["None yet", "Academic or small projects", "Industry project or internship"] },
    trades: { label: "How much hands-on experience do you have?", options: ["Just starting", "Some supervised work", "Independent paid work"] }
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch { return null; }
  }
  function writeStore(value) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(value)); } catch { /* storage blocked */ }
  }

  /* ------------------------------------------------------------------ */
  /* Plan builder: turns answers into a personalized result              */
  /* ------------------------------------------------------------------ */
  function buildPlan(a) {
    const profile = careerData[a.career] || careerData.graphicDesigner;
    const region = regionData[a.region] || regionData.india;
    const level = LEVEL_LABEL[a.level] ? a.level : "intermediate";
    const goal = GOAL_LABEL[a.goal] ? a.goal : "firstJob";
    const hours = HOURS[a.hours] || HOURS["5to10"];
    const proof = [0, 1, 2].includes(Number(a.proof)) ? Number(a.proof) : 0;
    const answered = Array.isArray(a.skills) && Array.isArray(a.tools); // field questions completed?

    const knownSkills = (a.skills || []).filter((s) => profile.must.includes(s));
    const knownTools = (a.tools || []).filter((t) => profile.tools.includes(t));
    const missingSkills = profile.must.filter((s) => !knownSkills.includes(s));
    const missingTools = profile.tools.filter((t) => !knownTools.includes(t));

    // Blocker goes first in the to-build list
    const blocker = profile.gaps.includes(a.blocker) ? a.blocker : null;
    const toBuild = [...(blocker ? [blocker] : []), ...missingSkills, ...profile.gaps.filter((g) => g !== blocker)];

    // Readiness estimate from the answers
    const base = { beginner: 25, intermediate: 45, advanced: 65 }[level];
    const skillCover = knownSkills.length / profile.must.length;
    const toolCover = Math.min(1, knownTools.length / 3);
    const score = Math.max(15, Math.min(92, Math.round(base + skillCover * 15 + toolCover * 8 + proof * 6)));

    // Effort in hours -> weeks at the user's pace
    const effort =
      { beginner: 40, intermediate: 15, advanced: 0 }[level] +
      missingSkills.length * 12 +
      Math.min(missingTools.length, 3) * 8 +
      [40, 24, 10][proof] +
      (goal === "betterSalary" ? 16 : 20);
    const weeks = Math.max(4, Math.min(26, Math.ceil(effort / hours.value)));

    // Split weeks across 4 phases
    const weights = [0.25, 0.25, 0.3, 0.2];
    const split = weights.map((w) => Math.max(1, Math.round(weeks * w)));
    split[2] += weeks - split.reduce((x, y) => x + y, 0);
    if (split[2] < 1) split[2] = 1;
    let cursor = 1;
    const ranges = split.map((n) => {
      const from = cursor, to = cursor + n - 1;
      cursor = to + 1;
      return { from, to, label: from === to ? `Week ${from}` : `Weeks ${from}–${to}` };
    });

    const title = profile.title;
    const focusSkills = toBuild.slice(0, 3);
    const toolsToLearn = missingTools.slice(0, 3);
    const mainProject = profile.projects[0];

    const phase1 = {
      name: level === "beginner" ? "Learn the fundamentals" : "Close your gaps",
      actions: level === "beginner"
        ? [`Learn the core concepts, vocabulary and standards of ${title}.`, ...focusSkills.slice(0, 2).map((s) => `Start practising: ${s}.`)]
        : focusSkills.map((s, i) => (i === 0 && blocker ? `Your hardest area first: ${s}. Practise with small daily exercises.` : `Build skill in: ${s}.`)),
      output: "One short practice piece for each skill you worked on."
    };

    const phase2 = {
      name: toolsToLearn.length ? "Get tool-ready" : "Go deeper on tools",
      actions: toolsToLearn.length
        ? [`Reach working fluency in ${toolsToLearn.join(", ")}.`, `Use each tool on a real task, not only tutorials.`]
        : [`Learn advanced workflows in ${knownTools.slice(0, 2).join(" and ") || "your main tools"}.`, `Add an AI-assisted step to your process and keep quality checks.`],
      output: "A tool checklist you can show in interviews or client calls."
    };

    const projectLine = `${mainProject[0]}: ${mainProject[1]}`;
    const proofActions = [
      [`Build your first proof project. ${projectLine}`],
      [`Turn your existing work into a case study: problem, process, result.`, `Add one new project. ${projectLine}`],
      [`Pick a niche and build one advanced project that shows strategy and results.`, `Document the outcome with numbers where possible.`]
    ][proof];
    const phase3 = {
      name: "Build proof",
      actions: proofActions,
      output: "A finished project with a short write-up you can share."
    };

    const phase4 = {
      firstJob: {
        name: "Apply for your first job",
        actions: [`Update your resume and portfolio around your best project.`, `Apply to about 5 relevant roles each week in ${region.label}.`, `Practise 2 mock interviews explaining your project decisions.`],
        output: "A tailored resume, a portfolio link and a tracked application list."
      },
      betterSalary: {
        name: "Move to a higher role",
        actions: [`Write an impact case study with measurable results.`, `Benchmark your target: ${profile.salary[a.region] || profile.salary.india}.`, `Prepare negotiation points and apply to higher-tier roles.`],
        output: "An impact summary and a salary target backed by your work."
      },
      freelance: {
        name: "Win your first clients",
        actions: [`Define one niche offer and a clear price.`, `Create a one-page proposal using your best project.`, `Reach out to about 10 prospects each week.`],
        output: "A service offer, a proposal template and a prospect list."
      }
    }[goal];

    const phases = [phase1, phase2, phase3, phase4].map((p, i) => ({ ...p, when: ranges[i] }));

    const note = profile.must[0];
    return {
      profile, region, level, goal, hours, proof, answered,
      score, weeks, phases,
      strengths: [...knownSkills, ...knownTools.map((t) => `${t} (tool)`)],
      toBuild, blocker, note,
      tools: [
        ...missingTools.map((t) => ({ name: t, state: "learn" })),
        ...knownTools.map((t) => ({ name: t, state: "known" }))
      ],
      projects: profile.projects,
      salary: profile.salary[a.region] || profile.salary.india,
      regionAdvice: region.advice
    };
  }

  /* ------------------------------------------------------------------ */
  /* Wizard (index.html)                                                 */
  /* ------------------------------------------------------------------ */
  function initWizard() {
    const form = $("#wizard");
    if (!form || typeof careerData === "undefined") return;

    const careerSelect = $("#career");
    const nextBtn = $("#nextBtn");
    const backBtn = $("#backBtn");
    const errorBox = $("#wizardError");
    const stepTitle = $("#stepTitle");
    const stepCount = $("#stepCount");
    const bar = $("#progressBar");
    const titles = ["Your profile", "Your skills", "Proof and time"];
    let step = 1;
    let builtFor = null;

    // Career dropdown grouped by sector
    Object.entries(sectorProfiles).forEach(([key, sector]) => {
      const group = document.createElement("optgroup");
      group.label = sector.sector;
      Object.values(careerData).filter((c) => c.sectorKey === key).forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.title;
        group.appendChild(opt);
      });
      careerSelect.appendChild(group);
    });

    const params = new URLSearchParams(location.search);
    if (params.get("career") && careerData[params.get("career")]) careerSelect.value = params.get("career");

    function chip(type, name, value, text, checked) {
      const label = el("label", "choice");
      const input = document.createElement("input");
      input.type = type; input.name = name; input.value = value;
      if (checked) input.checked = true;
      label.append(input, el("span", null, text));
      return label;
    }

    // Fill steps 2 and 3 with questions that match the chosen field
    function buildFieldQuestions(profile) {
      $("#skillsHeading").textContent = `Your ${profile.title} skills`;

      const tools = $("#toolChoices"); tools.innerHTML = "";
      profile.tools.forEach((t) => tools.appendChild(chip("checkbox", "tools", t, t)));
      const none = chip("checkbox", "tools", "__none", "None yet");
      none.querySelector("input").addEventListener("change", (e) => {
        if (e.target.checked) tools.querySelectorAll("input:not([value='__none'])").forEach((i) => (i.checked = false));
      });
      tools.appendChild(none);
      tools.addEventListener("change", (e) => {
        if (e.target.value !== "__none" && e.target.checked) none.querySelector("input").checked = false;
      });

      const skills = $("#skillChoices"); skills.innerHTML = "";
      profile.must.forEach((s) => skills.appendChild(chip("checkbox", "skills", s, s)));

      const proofSet = PROOF[profile.sectorKey] || PROOF.business;
      $("#proofLabel").textContent = proofSet.label;
      const proofBox = $("#proofChoices"); proofBox.innerHTML = "";
      proofSet.options.forEach((text, i) => proofBox.appendChild(chip("radio", "proof", String(i), text, i === 0)));

      const blockers = $("#blockerChoices"); blockers.innerHTML = "";
      profile.gaps.forEach((g, i) => blockers.appendChild(chip("radio", "blocker", g, g, i === 0)));
      builtFor = profile.id;
    }

    function collect() {
      const fd = new FormData(form);
      return {
        career: fd.get("career"),
        level: fd.get("level") || "intermediate",
        region: fd.get("region") || "india",
        goal: fd.get("goal") || "firstJob",
        tools: fd.getAll("tools").filter((t) => t !== "__none"),
        skills: fd.getAll("skills"),
        proof: Number(fd.get("proof") || 0),
        blocker: fd.get("blocker") || "",
        hours: fd.get("hours") || "5to10"
      };
    }

    function show(n) {
      step = n;
      form.querySelectorAll(".wizard-step").forEach((s) => s.classList.toggle("active", Number(s.dataset.step) === n));
      stepTitle.textContent = titles[n - 1];
      stepCount.textContent = `Step ${n} of 3`;
      bar.style.width = `${(n / 3) * 100}%`;
      backBtn.hidden = n === 1;
      nextBtn.textContent = n === 3 ? "Generate my roadmap" : "Continue";
      errorBox.textContent = "";
      if (n > 1) form.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    nextBtn.addEventListener("click", () => {
      if (step === 1) {
        if (!careerSelect.value) {
          errorBox.textContent = "Please select your career path to continue.";
          careerSelect.focus();
          return;
        }
        if (builtFor !== careerSelect.value) buildFieldQuestions(careerData[careerSelect.value]);
        show(2);
      } else if (step === 2) {
        show(3);
      } else {
        const answers = collect();
        writeStore(answers);
        const q = new URLSearchParams({ career: answers.career, level: answers.level, region: answers.region, goal: answers.goal });
        location.href = `career.html?${q.toString()}`;
      }
    });
    backBtn.addEventListener("click", () => show(Math.max(1, step - 1)));
    careerSelect.addEventListener("change", () => (errorBox.textContent = ""));
    form.addEventListener("submit", (e) => e.preventDefault());

    // Returning from the result page to edit answers
    const saved = readStore();
    if (saved && params.get("edit") && careerData[saved.career]) {
      careerSelect.value = saved.career;
      form.elements.level.value = saved.level;
      form.elements.region.value = saved.region;
      form.elements.goal.value = saved.goal;
      form.elements.hours.value = saved.hours;
      buildFieldQuestions(careerData[saved.career]);
      form.querySelectorAll("input[name='tools']").forEach((i) => (i.checked = (saved.tools || []).includes(i.value)));
      form.querySelectorAll("input[name='skills']").forEach((i) => (i.checked = (saved.skills || []).includes(i.value)));
      form.elements.proof.value = String(saved.proof ?? 0);
      if (saved.blocker) form.elements.blocker.value = saved.blocker;
      location.hash = "assessment";
    }
    show(1);
  }

  /* ------------------------------------------------------------------ */
  /* Result page (career.html)                                           */
  /* ------------------------------------------------------------------ */
  function initResult() {
    const root = $("#result");
    if (!root || typeof careerData === "undefined") return;

    const p = new URLSearchParams(location.search);
    const stored = readStore();
    const base = {
      career: p.get("career") || (stored && stored.career) || "graphicDesigner",
      level: p.get("level") || "intermediate",
      region: p.get("region") || "india",
      goal: p.get("goal") || "firstJob"
    };
    // Use the detailed answers only if they belong to this career
    const detailed = stored && stored.career === base.career ? stored : {};
    const plan = buildPlan({ ...base, ...detailed, career: base.career, level: base.level, region: base.region, goal: base.goal });
    const t = plan.profile.title;

    document.title = `${t} roadmap | SkillGap AI`;
    $("#resTitle").textContent = `${t} roadmap`;
    const chips = $("#resChips"); chips.innerHTML = "";
    [LEVEL_LABEL[plan.level], plan.region.label, GOAL_LABEL[plan.goal], plan.hours.label].forEach((c) => chips.appendChild(el("span", null, c)));

    if (!plan.answered) {
      const n = $("#resNotice");
      n.hidden = false;
      n.innerHTML = 'This plan is general. <a href="index.html?edit=1#assessment">Answer the field questions</a> to personalize it.';
    }

    const stats = $("#resStats"); stats.innerHTML = "";
    [
      ["Readiness", `${plan.score}%`, "Estimate from your answers"],
      ["Time to goal", `${plan.weeks} weeks`, `At ${plan.hours.label.replace("/week", " a week")}`],
      ["Salary direction", plan.salary, plan.region.label],
      ["Demand", plan.profile.demand, t]
    ].forEach(([label, value, sub]) => {
      const s = el("div", "stat");
      s.append(el("span", null, label), el("strong", null, value), el("small", null, sub));
      stats.appendChild(s);
    });

    const strong = $("#resStrong"); strong.innerHTML = "";
    if (plan.strengths.length) plan.strengths.forEach((s) => strong.appendChild(el("li", null, s)));
    else strong.appendChild(el("li", "empty", "Nothing selected yet. That is fine, your roadmap starts from the basics."));

    const build = $("#resBuild"); build.innerHTML = "";
    plan.toBuild.slice(0, 7).forEach((s, i) => {
      const li = el("li", null, s);
      if (plan.blocker && i === 0) li.appendChild(el("span", "pill", "Priority"));
      build.appendChild(li);
    });

    const line = $("#resTimeline"); line.innerHTML = "";
    plan.phases.forEach((ph, i) => {
      const card = el("article", "phase");
      const when = el("div", "phase-when");
      when.append(el("strong", null, ph.when.label), el("span", null, `Phase ${i + 1}`));
      const body = el("div");
      body.appendChild(el("h3", null, ph.name));
      const ul = el("ul");
      ph.actions.forEach((a) => ul.appendChild(el("li", null, a)));
      body.appendChild(ul);
      const out = el("p", "output");
      out.append(el("b", null, "Output: "), document.createTextNode(ph.output));
      body.appendChild(out);
      card.append(when, body);
      line.appendChild(card);
    });

    const proj = $("#resProjects"); proj.innerHTML = "";
    plan.projects.forEach(([name, text], i) => {
      const card = el("article");
      card.append(el("span", null, `PROJECT ${i + 1}`), el("h3", null, name), el("p", null, text));
      proj.appendChild(card);
    });

    const tools = $("#resTools"); tools.innerHTML = "";
    plan.tools.forEach((x) => tools.appendChild(el("li", x.state, x.name)));

    $("#resRegion").textContent = plan.regionAdvice;

    const msg = `Hi SkillGap AI, I generated a roadmap for ${t} (${LEVEL_LABEL[plan.level]}, ${plan.region.label}, goal: ${GOAL_LABEL[plan.goal]}). Readiness ${plan.score}%, ${plan.weeks} weeks. I want the detailed report.`;
    $("#resWhatsapp").href = `https://wa.me/919818114438?text=${encodeURIComponent(msg)}`;
    $("#resPrint").addEventListener("click", () => window.print());
  }

  initWizard();
  initResult();
})();
