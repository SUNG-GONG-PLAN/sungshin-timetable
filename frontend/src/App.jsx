import React, { useMemo, useState, useEffect } from "react";

const BACKEND_URL = "http://127.0.0.1:5000";

const steps = [
  "기본 정보 입력",
  "학업 이력 입력",
  "희망 조건 입력",
  "AI 분석 중",
  "추천 결과",
  "시간표 상세",
];

const days = ["월", "화", "수", "목", "금"];
const times = ["1-3교시", "4-6교시", "7-9교시"];

// ── 유틸 함수 ──────────────────────────────────────────────────────────
const semesterStrToInt = (s) => (s === "2학기" ? 2 : 1);
const gradeStrToInt = (s) => parseInt(s?.replace("학년", "")) || 1;
const startTimeToBlock = (t) => {
  if (!t) return null;
  const h = parseInt(t.split(":")[0]);
  if (h < 12) return 1;
  if (h < 15) return 2;
  return 3;
};

// ── 스케줄 파싱 ────────────────────────────────────────────────────────
const DAY_MAP = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4 };
const BLOCK_ROW = { "1-3": 0, "4-6": 1, "7-9": 2 };

const scheduleToBlocks = (schedule, courseName, isStrong) => {
  if (!schedule) return [];
  return schedule.split(",").flatMap((slot) => {
    const [day, block] = slot.trim().split("/");
    if (DAY_MAP[day] === undefined || BLOCK_ROW[block] === undefined) return [];
    return [{ day: DAY_MAP[day], time: BLOCK_ROW[block], title: courseName, strong: isStrong }];
  });
};

const isStrongCategory = (cat) => ["핵심전공", "심화전공"].includes(cat);

// ── 공통 컴포넌트 ──────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="logo-wrap">
      <div className="logo-mark">
        <span className="logo-dot" />
        <span className="logo-line line-1" />
        <span className="logo-line line-2" />
        <span className="logo-line line-3" />
      </div>
      <span className="logo-text">성공표</span>
    </div>
  );
}

function Icon({ type }) {
  const iconMap = {
    user: "♙", major: "◇", id: "▣", grade: "▯", term: "□",
    double: "♧", book: "▤", calendar: "▣", clock: "◷", balance: "⚖",
    info: "i", trash: "⌫", star: "☆", stack: "▱", cap: "▱",
  };
  return <span className={`icon icon-${type}`}>{iconMap[type] ?? "•"}</span>;
}

function Header({ step, setStep }) {
  return (
    <header className="app-header">
      <Logo />
      {step > 0 && (
        <button className="back-button" onClick={() => setStep(Math.max(0, step - 1))}>
          <span>‹</span>이전 단계로
        </button>
      )}
    </header>
  );
}

function Stepper({ current }) {
  return (
    <div className="stepper">
      {steps.map((label, idx) => {
        const num = idx + 1;
        const active = current === num;
        const done = current > num;
        return (
          <React.Fragment key={label}>
            <div className="step-item">
              <div className={`step-circle ${active ? "active" : ""} ${done ? "done" : ""}`}>{num}</div>
              <div className={`step-label ${active ? "active" : ""}`}>{label}</div>
            </div>
            {idx < steps.length - 1 && <div className={`step-line ${current > num ? "done" : ""}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function InputBox({ label, value, placeholder, icon, helper, labelHint, onChange }) {
  const inputProps = onChange
    ? { value: value ?? "", onChange: (e) => onChange(e.target.value) }
    : { defaultValue: value ?? "" };
  return (
    <label className="field">
      <span className="field-label">
        <Icon type={icon} />{label}
        {labelHint && <em className="label-hint">{labelHint}</em>}
      </span>
      <input placeholder={placeholder} {...inputProps} />
      {helper && <span className="helper-text">{helper}</span>}
    </label>
  );
}

function RadioRow({ label, selected, options, onChange }) {
  return (
    <div className="radio-row">
      <span className="radio-label">{label}</span>
      <div className="radio-options">
        {options.map((opt) => (
          <label className="radio-option" key={opt.value}>
            <input className="radio-input" type="radio" name={label} value={opt.value}
              checked={selected === opt.value} onChange={() => onChange?.(opt.value)} />
            <span className={`radio-dot ${selected === opt.value ? "checked" : ""}`} />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick, wide = false }) {
  return (
    <button className={`primary-button ${wide ? "wide" : ""}`} onClick={onClick}>
      <span>{children}</span>
      <span className="arrow">›</span>
    </button>
  );
}

function SummaryLine({ icon, label, value }) {
  return (
    <div className="summary-line">
      <span><Icon type={icon} />{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function GuideItem({ children }) {
  return <p className="guide-item"><span />{children}</p>;
}

function PageShell({ step, title, subtitle, children, center, centerTitle }) {
  return (
    <main className={`page-shell ${center ? "center" : ""}`}>
      <Stepper current={step} />
      {title && (
        <div className={`page-title ${centerTitle ? "center-title" : ""}`}>
          <h1>{title}</h1>{subtitle && <p>{subtitle}</p>}
        </div>
      )}
      {children}
    </main>
  );
}

// ── 1단계: 기본 정보 ───────────────────────────────────────────────────
function StartScreen({ setStep }) {
  return (
    <main className="start-screen">
      <div className="orbit orbit-main" />
      <div className="start-content">
        <p className="start-subtitle">성신여대 공대생의 시간표</p>
        <h1>성공표</h1>
        <button className="start-button" onClick={() => setStep(1)}>Start <span>▶</span></button>
      </div>
    </main>
  );
}

function BasicInfo({ basicInfo, setBasicInfo, setStep }) {
  const update = (key, val) => setBasicInfo((prev) => ({ ...prev, [key]: val }));

  const majorTypeLabel = { minor: "부전공", double: "복수전공", intensive: "전공심화" }[basicInfo.majorType];

  return (
    <PageShell step={1} title="기본 정보를 입력해주세요" subtitle="정확한 추천을 위해 기본 정보를 입력해주세요.">
      <div className="two-column">
        <section className="card form-card">
          <div className="form-grid two">
            <InputBox label="이름" icon="user" value={basicInfo.name} onChange={(v) => update("name", v)} />
            <InputBox label="학과 (직접 입력)" icon="major" value={basicInfo.department} onChange={(v) => update("department", v)} />
          </div>
          <InputBox label="학번" icon="id" value={basicInfo.studentId}
            placeholder="예) 20261234" helper="학번 8자리를 정확히 입력해주세요. (공백 없이 입력)"
            onChange={(v) => update("studentId", v)} />
          <div className="form-grid two">
            <InputBox label="현재 학년" icon="grade" value={basicInfo.grade} onChange={(v) => update("grade", v)} />
            <InputBox label="현재 학기" icon="term" value={basicInfo.semester}
              labelHint="해당 학기의 시간표를 추천해드립니다" onChange={(v) => update("semester", v)} />
          </div>
          <div className="form-grid two radio-grid">
            <RadioRow label="부/복수전공 선택" selected={basicInfo.majorType}
              onChange={(v) => update("majorType", v)}
              options={[{ value: "minor", label: "부전공" }, { value: "double", label: "복수전공" }, { value: "intensive", label: "전공심화" }]} />
            <InputBox label="부/복수전공 학과 입력" icon="major" value={basicInfo.subMajorDepartment}
              placeholder="예) 데이터사이언스학과" onChange={(v) => update("subMajorDepartment", v)} />
          </div>
          <div className="notice"><Icon type="info" />입력하신 정보는 시간표 추천 및 졸업 요건 분석에만 활용됩니다.</div>
        </section>
        <aside className="card summary-card purple-tint">
          <h3>입력 정보 요약</h3>
          <div className="profile-row">
            <div className="avatar"><span /></div>
            <div>
              <strong>{basicInfo.name || "이름 미입력"}</strong>
              <p>{basicInfo.studentId || "학번 미입력"}</p>
              <p>{basicInfo.department || "학과 미입력"}</p>
            </div>
          </div>
          <SummaryLine icon="grade" label="현재 학년" value={basicInfo.grade || "미입력"} />
          <SummaryLine icon="term" label="현재 학기" value={basicInfo.semester || "미입력"} />
          <SummaryLine icon="double" label="부/복수전공 선택" value={majorTypeLabel} />
          <SummaryLine icon="major" label="부/복수전공 학과" value={basicInfo.subMajorDepartment || "미입력"} />
          <div className="guide-box"><Icon type="info" />선택하신 학년과 이수 상황에 따라 다음 단계에서 필요한 입력 항목이 달라집니다.</div>
        </aside>
      </div>
      <PrimaryButton onClick={() => setStep(2)} wide>다음 단계로</PrimaryButton>
    </PageShell>
  );
}

// ── 2단계: 학업 이력 ───────────────────────────────────────────────────
function AcademicHistory({ courseHistory, setCourseHistory, mandatoryGe, setMandatoryGe, basicInfo, setStep }) {
  const [activeTab, setActiveTab] = useState("history");
  const grade = gradeStrToInt(basicInfo.grade);
  const isFirstYear = grade === 1;

  const addCourse = () => {
    setCourseHistory((prev) => [...prev, { year: "2025", semester: "1학기", name: "", retake: "아니오" }]);
  };

  const removeCourse = (idx) => {
    setCourseHistory((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCourse = (idx, key, val) => {
    setCourseHistory((prev) => prev.map((c, i) => i === idx ? { ...c, [key]: val } : c));
  };

  const updateMge = (course, key, val) => {
    setMandatoryGe((prev) => ({ ...prev, [course]: { ...prev[course], [key]: val } }));
  };

  const timeOptions = ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

  return (
    <PageShell step={2} title="학업 이력을 입력해주세요" subtitle="학년에 따라 필요한 입력 화면만 보이도록 설계했습니다.">
      <div className="two-column academic-layout">
        <section className="card academic-card">
          <div className="tab-row">
            {isFirstYear && (
              <button className={activeTab === "auto" ? "active" : ""} onClick={() => setActiveTab("auto")}>
                1학년 자동배정 과목
              </button>
            )}
            <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}
              style={!isFirstYear ? { gridColumn: "1 / -1" } : {}}>
              기존 수강 이력
            </button>
          </div>

          {activeTab === "history" && (
            <>
              <div className="course-table">
                <div className="course-head">
                  <span>수강연도</span><span>학기</span><span>과목명</span><span>재수강 여부</span><span />
                </div>
                {courseHistory.map((course, idx) => (
                  <div className="course-row" key={idx}>
                    <input value={course.year} onChange={(e) => updateCourse(idx, "year", e.target.value)} />
                    <select value={course.semester} onChange={(e) => updateCourse(idx, "semester", e.target.value)}>
                      <option>1학기</option><option>2학기</option>
                    </select>
                    <input value={course.name} placeholder="과목명 입력"
                      onChange={(e) => updateCourse(idx, "name", e.target.value)} />
                    <select value={course.retake} onChange={(e) => updateCourse(idx, "retake", e.target.value)}>
                      <option>아니오</option><option>예</option>
                    </select>
                    <button className="trash" onClick={() => removeCourse(idx)}><Icon type="trash" /></button>
                  </div>
                ))}
              </div>
              <button className="add-button" onClick={addCourse}>+ 과목 추가</button>
            </>
          )}

          {activeTab === "auto" && isFirstYear && (
            <div style={{ display: "grid", gap: 20, padding: "12px 0" }}>
              {[
                { key: "bisato", label: "비판적 사고와 토론" },
                { key: "changsagl", label: "창조적 사고와 글쓰기" },
              ].map(({ key, label }) => (
                <div key={key} style={{ border: "1.5px solid #e1e3e8", borderRadius: 10, padding: 18 }}>
                  <div style={{ fontWeight: 800, marginBottom: 14, color: "var(--primary)" }}>{label}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label" style={{ fontSize: 13 }}>학기</span>
                      <select value={mandatoryGe[key]?.semester ?? 1}
                        onChange={(e) => updateMge(key, "semester", parseInt(e.target.value))}>
                        <option value={1}>1학기</option><option value={2}>2학기</option>
                      </select>
                    </label>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label" style={{ fontSize: 13 }}>요일</span>
                      <select value={mandatoryGe[key]?.day ?? "월"}
                        onChange={(e) => updateMge(key, "day", e.target.value)}>
                        {days.map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </label>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label" style={{ fontSize: 13 }}>시작 시간</span>
                      <select value={mandatoryGe[key]?.startTime ?? "9:00"}
                        onChange={(e) => updateMge(key, "startTime", e.target.value)}>
                        {timeOptions.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
                <input type="checkbox" checked={mandatoryGe.jinjotamDone}
                  onChange={(e) => setMandatoryGe((p) => ({ ...p, jinjotamDone: e.target.checked }))} />
                전공별 진로탐색 이수 완료
              </label>
            </div>
          )}

          <div className="accordion-row">
            <Icon type="book" />1학년 자동배정 과목: 비판적 사고와 토론 / 창조적 사고와 글쓰기 / 전공별 진로탐색 (요일·교시 입력)
            <span>⌄</span>
          </div>
        </section>

        <aside className="card guide-card">
          <h3>입력 가이드</h3>
          <GuideItem>1학년은 자동배정 과목 정보를 입력합니다.</GuideItem>
          <GuideItem>1학년 2학기 이상 및 2학년 이상은 기존 수강 이력을 입력합니다.</GuideItem>
          <GuideItem>재수강 과목은 체크하여 추천에 반영할 수 있습니다.</GuideItem>
          <GuideItem>재수강한 과목이 있을 시 재수강을 한 학기의 이력만 입력합니다.</GuideItem>
          <div className="guide-box center"><Icon type="info" />조건 기반 동적 UI로<br />필요한 입력칸만 표시됩니다.</div>
        </aside>
      </div>
      <PrimaryButton onClick={() => setStep(3)} wide>다음 단계로</PrimaryButton>
    </PageShell>
  );
}

// ── 3단계: 희망 조건 ───────────────────────────────────────────────────
function CheckBox({ checked, label, onChange }) {
  return (
    <label className="checkbox-label" onClick={onChange} style={{ cursor: "pointer" }}>
      <span className={`check-box ${checked ? "checked" : ""}`}>{checked ? "✓" : ""}</span>
      {label}
    </label>
  );
}

function Preferences({ prefs, setPrefs, setStep }) {
  const update = (key, val) => setPrefs((prev) => ({ ...prev, [key]: val }));

  const toggleDay = (day) => {
    update("freeDays", prefs.freeDays.includes(day)
      ? prefs.freeDays.filter((d) => d !== day)
      : [...prefs.freeDays, day]);
  };

  const toggleTimePref = (pref) => {
    update("timePrefs", prefs.timePrefs.includes(pref)
      ? prefs.timePrefs.filter((p) => p !== pref)
      : [...prefs.timePrefs, pref]);
  };

  const campusLabel = { su: "수캠 위주", un: "운캠 위주", mixed: "혼재 가능" }[prefs.campus];

  const timePrefLabels = prefs.timePrefs.map((p) => ({
    "오전수업피하기": "오전 수업 피하기",
    "풀강피하기": "풀강 피하기",
    "몰아듣기선호": "몰아듣기 선호",
    "수업사이공백확보": "수업 사이 공강 확보",
  }[p] ?? p)).join(", ");

  const compositionLabel = { major: "전공 위주", ge: "교양 위주", balanced: "균형형" }[prefs.composition];

  return (
    <PageShell step={3} title="원하는 시간표 조건을 선택해주세요" subtitle="선택한 조건을 바탕으로 맞춤형 시간표를 추천합니다.">
      <div className="two-column pref-layout">
        <section className="card pref-card">
          <h3 className="section-title-with-hint">희망 공강 요일<em>(중복선택 가능)</em></h3>
          <div className="day-grid">
            {days.map((day) => {
              const sel = prefs.freeDays.includes(day);
              return (
                <button key={day} className={sel ? "selected" : ""} onClick={() => toggleDay(day)}>
                  {day}{sel && <span className="check-badge">✓</span>}
                </button>
              );
            })}
          </div>
          <hr />
          <div className="credit-campus-grid">
            <div>
              <h3>희망 학점</h3>
              <select className="full-select" value={prefs.credits} onChange={(e) => update("credits", e.target.value)}>
                {[12, 13, 14, 15, 16, 17, 18, 19].map((n) => <option key={n} value={`${n}학점`}>{n}학점</option>)}
              </select>
            </div>
            <div>
              <h3>희망 캠퍼스</h3>
              <select className="full-select" value={prefs.campus} onChange={(e) => update("campus", e.target.value)}>
                <option value="su">수캠 위주</option>
                <option value="un">운캠 위주</option>
                <option value="mixed">혼재 가능</option>
              </select>
            </div>
          </div>
          <hr />
          <h3>수업 시간 선호</h3>
          <div className="check-row">
            {[
              { key: "오전수업피하기", label: "오전 수업 피하기" },
              { key: "풀강피하기", label: "풀강 피하기" },
              { key: "몰아듣기선호", label: "몰아듣기 선호" },
              { key: "수업사이공백확보", label: "수업 사이 공강 확보" },
            ].map(({ key, label }) => (
              <CheckBox key={key} label={label} checked={prefs.timePrefs.includes(key)}
                onChange={() => toggleTimePref(key)} />
            ))}
          </div>
          <hr />
          <h3>수업 구성 선호</h3>
          <div className="segment-row">
            {[{ v: "major", l: "전공 위주" }, { v: "ge", l: "교양 위주" }, { v: "balanced", l: "균형형" }].map(({ v, l }) => (
              <button key={v} className={prefs.composition === v ? "selected" : ""} onClick={() => update("composition", v)}>
                {l}{prefs.composition === v && <span className="check-badge">✓</span>}
              </button>
            ))}
          </div>
          <div className="notice"><Icon type="info" />선택한 조건은 추천 시간표 생성에 반영됩니다.</div>
        </section>
        <aside className="card summary-card purple-tint">
          <h3>선택 조건 요약</h3>
          <SummaryLine icon="calendar" label="희망 공강"
            value={prefs.freeDays.length > 0 ? `${prefs.freeDays.join(", ")}요일` : "선택 안 함"} />
          <SummaryLine icon="major" label="희망 학점" value={prefs.credits} />
          <SummaryLine icon="calendar" label="희망 캠퍼스" value={campusLabel} />
          <SummaryLine icon="clock" label="시간 선호" value={timePrefLabels || "선택 안 함"} />
          <SummaryLine icon="balance" label="구성 선호" value={compositionLabel} />
          <div className="guide-box"><Icon type="info" />선택한 조건은 이후 AI 분석 단계에서 시간표 추천 우선순위에 반영됩니다.</div>
        </aside>
      </div>
      <PrimaryButton onClick={() => setStep(4)} wide>AI 시간표 생성하기</PrimaryButton>
    </PageShell>
  );
}

// ── 4단계: AI 분석 ─────────────────────────────────────────────────────
function Analysis({ basicInfo, courseHistory, mandatoryGe, prefs, setApiResult, setStep }) {
  const [status, setStatus] = useState("loading"); // loading | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0); // 0~3

  useEffect(() => {
    callApi();
  }, []);

  const callApi = async () => {
    setProgress(1);
    const grade = gradeStrToInt(basicInfo.grade);
    const isFirstYear = grade === 1;

    // ── 수강이력 변환 ──────────────────────────────────────────────
    const history = courseHistory
      .filter((c) => c.name.trim())
      .map((c) => ({
        year: parseInt(c.year),
        semester: semesterStrToInt(c.semester),
        course_name: c.name.trim(),
        is_retake: c.retake === "예",
      }));

    // ── mandatory_ge 변환 ──────────────────────────────────────────
    let mandatory_ge = { jinjotam_done: mandatoryGe.jinjotamDone };
    if (isFirstYear) {
      mandatory_ge = {
        bisato_semester: mandatoryGe.bisato?.semester ?? null,
        bisato_day: mandatoryGe.bisato?.day ?? null,
        bisato_block: startTimeToBlock(mandatoryGe.bisato?.startTime),
        changsagl_semester: mandatoryGe.changsagl?.semester ?? null,
        changsagl_day: mandatoryGe.changsagl?.day ?? null,
        changsagl_block: startTimeToBlock(mandatoryGe.changsagl?.startTime),
        jinjotam_done: mandatoryGe.jinjotamDone,
      };
    } else {
      // 2학년 이상: 비사토/창사글 semester만 (history에서 자동 파악)
      mandatory_ge = {
        bisato_semester: null, bisato_day: null, bisato_block: null,
        changsagl_semester: null, changsagl_day: null, changsagl_block: null,
        jinjotam_done: mandatoryGe.jinjotamDone,
      };
    }

    setProgress(2);

    // ── 전공학점 계산 ──────────────────────────────────────────────
    const credits = parseInt(prefs.credits) || 18;
    const desiredMajor = prefs.composition === "major" ? Math.round(credits * 0.7)
      : prefs.composition === "ge" ? Math.round(credits * 0.3)
      : Math.round(credits * 0.5);

    const payload = {
      name: basicInfo.name,
      department: basicInfo.department,
      studentId: basicInfo.studentId,
      grade: basicInfo.grade,
      semester: basicInfo.semester,
      majorType: basicInfo.majorType,
      subMajorDepartment: basicInfo.subMajorDepartment || null,
      history,
      mandatory_ge,
      freeDays: prefs.freeDays,
      campus: prefs.campus,
      credits: prefs.credits,
      time_prefs: prefs.timePrefs,
      desired_major_credits: desiredMajor,
      retake_priority: prefs.retakePriority,
    };

    try {
      const res = await fetch(`${BACKEND_URL}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "서버 오류");
      setProgress(3);
      setApiResult(data);
      setStatus("done");
      setTimeout(() => setStep(5), 800);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  };

  return (
    <PageShell step={4} center>
      <div className="analysis-screen">
        <h2>AI가 시간표를 분석하고 있어요</h2>
        <p>입력한 정보를 백엔드로 보내고 추천 시간표를 받아오는 중입니다.</p>
        <div className="ai-orbit">
          <div className="ai-inner">AI</div>
          <span className="orbit-dot" />
        </div>
        <div className="analysis-list">
          <AnalysisItem done={progress >= 1} loading={progress === 0} text="학업 이력 분석 중" />
          <AnalysisItem done={progress >= 2} loading={progress === 1} text="졸업 요건 확인 중" />
          <AnalysisItem done={progress >= 3} loading={progress === 2} text="백엔드 추천 요청 중" />
          <AnalysisItem done={status === "done"} loading={progress === 3 && status !== "done"} text="추천 결과 정리 중" />
        </div>
        {status === "error" && (
          <div className="notice" style={{ marginTop: 24, background: "#fff0f0", color: "#c0392b", maxWidth: 560, margin: "24px auto 0" }}>
            <Icon type="info" />{errorMsg}
          </div>
        )}
        <button className="analysis-button" style={{ opacity: status === "error" ? 1 : 0.5 }}
          onClick={status === "error" ? callApi : undefined}>
          {status === "error" ? "다시 시도" : "분석 중..."}
        </button>
      </div>
    </PageShell>
  );
}

function AnalysisItem({ done, loading, text }) {
  return (
    <div className={`analysis-item ${loading ? "loading" : ""}`}>
      <span className={`status ${done ? "done" : loading ? "loading" : ""}`}>{done ? "✓" : ""}</span>
      <strong>{text}</strong>
      <span className="dots">•••</span>
    </div>
  );
}

// ── 5단계: 추천 결과 ───────────────────────────────────────────────────
function MiniTable({ courses = [] }) {
  const blocks = courses.flatMap((c) => scheduleToBlocks(c.schedule, c.course_name, isStrongCategory(c.category)));
  return (
    <div className="mini-table">
      <div />
      {days.map((d) => <span key={d}>{d}</span>)}
      {times.map((time, r) => (
        <React.Fragment key={time}>
          <strong>{time}</strong>
          {days.map((_, c) => {
            const has = blocks.some((b) => b.day === c && b.time === r);
            return <div className="mini-cell" key={`${r}-${c}`}>{has && <i />}</div>;
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

function Result({ apiResult, setSelectedTimetable, setStep, basicInfo = {}, mandatoryGe = {} }) {
  const timetables = apiResult?.timetables ?? [];
  const bestIdx = timetables.reduce((bi, tt, i) => tt.score > (timetables[bi]?.score ?? 0) ? i : bi, 0);

  // 추천결과 MiniTable에도 비사토·창사글 표시
  const grade = gradeStrToInt(basicInfo.grade);
  const targetSem = semesterStrToInt(basicInfo.semester?.split(" ")[1] ?? "1학기");
  const mandatoryCoursesForMini = [];
  if (grade === 1) {
    const addMge = (info, name) => {
      if (info?.day && info?.startTime && info?.semester === targetSem) {
        const block = startTimeToBlock(info.startTime);
        const blockStr = block === 1 ? "1-3" : block === 2 ? "4-6" : "7-9";
        mandatoryCoursesForMini.push({
          course_name: name, category: "공통교양", credits: 0,
          schedule: `${info.day}/${blockStr}`, campus: "", is_retake: false,
        });
      }
    };
    addMge(mandatoryGe.bisato, "비판적사고와토론");
    addMge(mandatoryGe.changsagl, "창조적사고와글쓰기");
  }

  const handleSelect = (idx) => {
    setSelectedTimetable(idx);
    setStep(6);
  };

  const tagClass = (label) => label === "공강최적형" ? "green-tag" : "tag";

  return (
    <PageShell step={5} title="추천 시간표가 생성되었어요"
      subtitle="입력한 정보와 희망 조건을 바탕으로 추천된 시간표입니다." centerTitle>
      <div className="result-grid">
        {timetables.map((tt, idx) => (
          <article className={`card recommendation-card ${idx === bestIdx ? "best" : ""}`} key={idx}>
            {idx === bestIdx && <div className="best-badge">추천 시간표</div>}
            <div className="recommend-head">
              <h3>시간표 {idx + 1}</h3>
              <span className={tagClass(tt.label)}>{tt.label}</span>
            </div>
            <div className="score-row">
              <span><Icon type="cap" />총 {tt.total_credits + mandatoryCourses.reduce((s,c) => s + (c.credits ?? 0), 0)}학점</span>
              <span><Icon type="stack" />점수</span>
              <span><Icon type="star" />{tt.score}</span>
            </div>
            <MiniTable courses={[...mandatoryCoursesForMini, ...(tt.courses ?? [])]} />
            <div className="reason-box">
              <h4>추천 이유</h4>
              <p>{tt.reason_tags?.join(" / ")}</p>
            </div>
          </article>
        ))}
      </div>
      <PrimaryButton onClick={() => handleSelect(bestIdx)} wide>자세히 보기</PrimaryButton>
    </PageShell>
  );
}

// ── 6단계: 시간표 상세 ─────────────────────────────────────────────────
function FullSchedule({ courses = [] }) {
  const blocks = courses.flatMap((c) => scheduleToBlocks(c.schedule, c.course_name, isStrongCategory(c.category)));
  return (
    <div className="full-schedule">
      <div className="corner" />
      {days.map((day) => <div className="day-title" key={day}>{day}</div>)}
      {times.map((time, r) => (
        <React.Fragment key={time}>
          <div className="time-title">{time}</div>
          {days.map((_, c) => {
            const block = blocks.find((b) => b.day === c && b.time === r);
            return (
              <div className="schedule-cell" key={`${r}-${c}`}>
                {block && <span className={block.strong ? "strong" : "light"}>{block.title}</span>}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

function GradLine({ icon, label, value, highlight, subItems }) {
  return (
    <div>
      <div className={`grad-line ${highlight ? "highlight" : ""}`}>
        <span><Icon type={icon} />{label}</span>
        <strong>{value}</strong>
      </div>
      {subItems && subItems.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "4px 0 8px 32px" }}>
          {subItems.map(({ area, credit }) => (
            <span key={area} style={{
              fontSize: 12, fontWeight: 700, background: "#f0ebff",
              color: "var(--primary)", borderRadius: 999, padding: "3px 10px",
              border: "1px solid #ddd4ff"
            }}>{area} {credit}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Progress({ label, earned, required, strong, subItems }) {
  const pct = required > 0 ? Math.min(100, Math.round(earned / required * 100)) : 0;
  return (
    <div>
      <div className={`progress-row ${strong ? "strong" : ""}`}>
        <span>{label}</span>
        <div className="progress-track"><i style={{ width: `${pct}%` }} /></div>
        <em>{earned}/{required}</em>
      </div>
      {subItems && subItems.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "2px 0 8px 0" }}>
          {subItems.map(({ area, credit }) => (
            <span key={area} style={{
              fontSize: 12, fontWeight: 700, background: "#f0ebff",
              color: "var(--primary)", borderRadius: 999, padding: "3px 10px",
              border: "1px solid #ddd4ff"
            }}>{area} {credit}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({ apiResult, selectedTimetable, setSelectedTimetable, setStep, basicInfo = {}, mandatoryGe = {} }) {
  const timetables = apiResult?.timetables ?? [];
  const gap = apiResult?.gap ?? {};
  const tt = timetables[selectedTimetable] ?? timetables[0];

  if (!tt) return <div style={{ padding: 40, textAlign: "center" }}>시간표 데이터가 없습니다.</div>;

  // 비사토·창사글을 시간표 그리드에 표시하기 위해 courses에 추가
  const grade = gradeStrToInt(basicInfo.grade);
  const targetSem = semesterStrToInt(basicInfo.semester?.split(" ")[1] ?? "1학기");
  const mandatoryCourses = [];
  if (grade === 1) {
    const admissionYear = parseInt(basicInfo.studentId?.substring(0, 4)) || 2024;
    const mgeCredit = admissionYear >= 2026 ? 2 : 3;
    const addMge = (info, name) => {
      if (info?.day && info?.startTime && info?.semester === targetSem) {
        const block = startTimeToBlock(info.startTime);
        const blockStr = block === 1 ? "1-3" : block === 2 ? "4-6" : "7-9";
        mandatoryCourses.push({
          course_name: name,
          category: "공통교양",
          credits: mgeCredit,
          schedule: `${info.day}/${blockStr}`,
          campus: "",
          is_retake: false,
        });
      }
    };
    addMge(mandatoryGe.bisato, "비판적사고와토론");
    addMge(mandatoryGe.changsagl, "창조적사고와글쓰기");
    if (targetSem === 1 && mandatoryGe.jinjotamDone === false) {
      mandatoryCourses.push({
        course_name: "전공별진로탐색",
        category: "진로소양",
        credits: 1,
        schedule: "",
        campus: "",
        is_retake: false,
      });
    }
  }
  const allCourses = [...mandatoryCourses, ...(tt.courses ?? [])];

  // 핵심교양 영역 breakdown (기존 이수 현황용)
  const geBreakdown = tt.ge_area_breakdown ?? {};
  const geCurrentItems = Object.entries(geBreakdown)
    .filter(([, v]) => v.기존 > 0)
    .map(([area, v]) => ({ area, credit: v.기존 }));

  // 핵심교양 영역 breakdown (이번 시간표 반영 예상용)
  const geAfterItems = Object.entries(geBreakdown)
    .filter(([, v]) => (v.기존 + v.추가) > 0)
    .map(([area, v]) => ({ area, credit: v.기존 + v.추가 }));

  // 이번 시간표 수강 후 예상 학점 계산
  const extraCredits = (category) =>
    allCourses.filter((c) => c.category === category).reduce((s, c) => s + (c.credits ?? 0), 0);

  const gCom = gap.common_ge ?? { earned: 0, required: 15 };
  const gCore = gap.core_ge ?? { earned: 0, required: 15 };
  const gCareer = gap.career_ge ?? { earned: 0, required: 3 };
  const gMajor = gap.core_major ?? { earned: 0, required: 27 };
  const gAdv = gap.advanced_major ?? { earned: 0, required: 21 };
  const gTotal = gap.total ?? { earned: 0, required: 130 };

  const handleNext = () => {
    const next = (selectedTimetable + 1) % timetables.length;
    setSelectedTimetable(next);
  };

  return (
    <PageShell step={6} title="추천 시간표 상세"
      subtitle="선택하신 추천 시간표의 상세 시간표와 졸업 이수 현황을 확인하세요." centerTitle>
      <div className="two-column detail-layout">
        <section className="card detail-table-card">
          <div className="detail-head">
            <h3>선택 시간표 {selectedTimetable + 1} <span>{tt.label}</span></h3>
            <div className="detail-score">
              <span><Icon type="cap" />총 {tt.total_credits + mandatoryCourses.reduce((s,c) => s + (c.credits ?? 0), 0)}학점</span>
              <span><Icon type="stack" />점수 <strong>{tt.score}</strong></span>
            </div>
          </div>
          <FullSchedule courses={allCourses} />
        </section>
        <aside className="card graduation-card">
          <h3>졸업 이수 현황</h3>
          <GradLine icon="book" label="공통교양" value={`${gCom.earned} / ${gCom.required}`} />
          <GradLine icon="cap" label="핵심교양" value={`${gCore.earned} / ${gCore.required}`} subItems={geCurrentItems} />
          <GradLine icon="clock" label="진로소양" value={`${gCareer.earned} / ${gCareer.required}`} />
          <GradLine icon="star" label="핵심전공" value={`${gMajor.earned} / ${gMajor.required}`} />
          <GradLine icon="stack" label="심화전공" value={`${gAdv.earned} / ${gAdv.required}`} />
          <GradLine icon="clock" label="총 이수" value={`${gTotal.earned} / ${gTotal.required}`} highlight />
          <hr />
          <h4>이 시간표 수강 시 반영 예상</h4>
          <Progress label="공통교양"
            earned={gCom.earned + extraCredits("공통교양")} required={gCom.required} />
          <Progress label="핵심교양"
            earned={gCore.earned + extraCredits("핵심교양")} required={gCore.required} subItems={geAfterItems} />
          <Progress label="진로소양"
            earned={gCareer.earned + extraCredits("진로소양")} required={gCareer.required} />
          <Progress label="핵심전공"
            earned={gMajor.earned + extraCredits("핵심전공")} required={gMajor.required} />
          <Progress label="심화전공"
            earned={gAdv.earned + extraCredits("심화전공")} required={gAdv.required} />
          <Progress label="총 이수"
            earned={gTotal.earned + tt.total_credits} required={gTotal.required} strong />
          <div className="notice"><Icon type="info" />위 진행률은 현재 선택하신 시간표를 기준으로 예상되는 졸업 이수 기준입니다.</div>
        </aside>
      </div>
      <PrimaryButton onClick={handleNext} wide>다음 추천 보기</PrimaryButton>
    </PageShell>
  );
}

// ── 루트 App ───────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(0);

  const [basicInfo, setBasicInfo] = useState({
    name: "", department: "", studentId: "", grade: "1학년",
    semester: "2026년 1학기", majorType: "intensive", subMajorDepartment: "",
  });

  const [courseHistory, setCourseHistory] = useState([
    { year: "2024", semester: "1학기", name: "", retake: "아니오" },
  ]);

  const [mandatoryGe, setMandatoryGe] = useState({
    bisato: { semester: 1, day: "월", startTime: "9:00" },
    changsagl: { semester: 1, day: "월", startTime: "9:00" },
    jinjotamDone: false,
  });

  const [prefs, setPrefs] = useState({
    freeDays: ["금"], campus: "mixed", credits: "18학점",
    timePrefs: [], composition: "balanced", retakePriority: false,
  });

  const [apiResult, setApiResult] = useState(null);
  const [selectedTimetable, setSelectedTimetable] = useState(0);

  const screen = useMemo(() => {
    if (step === 0) return <StartScreen setStep={setStep} />;
    if (step === 1) return <BasicInfo basicInfo={basicInfo} setBasicInfo={setBasicInfo} setStep={setStep} />;
    if (step === 2) return (
      <AcademicHistory courseHistory={courseHistory} setCourseHistory={setCourseHistory}
        mandatoryGe={mandatoryGe} setMandatoryGe={setMandatoryGe}
        basicInfo={basicInfo} setStep={setStep} />
    );
    if (step === 3) return <Preferences prefs={prefs} setPrefs={setPrefs} setStep={setStep} />;
    if (step === 4) return (
      <Analysis basicInfo={basicInfo} courseHistory={courseHistory}
        mandatoryGe={mandatoryGe} prefs={prefs}
        setApiResult={setApiResult} setStep={setStep} />
    );
    if (step === 5) return (
      <Result apiResult={apiResult} setSelectedTimetable={setSelectedTimetable} setStep={setStep}
        basicInfo={basicInfo} mandatoryGe={mandatoryGe} />
    );
    return (
      <Detail apiResult={apiResult} selectedTimetable={selectedTimetable}
        setSelectedTimetable={setSelectedTimetable} setStep={setStep}
        basicInfo={basicInfo} mandatoryGe={mandatoryGe} />
    );
  }, [step, basicInfo, courseHistory, mandatoryGe, prefs, apiResult, selectedTimetable]);

  return (
    <div className="app-root">
      <Header step={step} setStep={setStep} />
      {screen}
      <style>{css}</style>
    </div>
  );
}

const css = `
:root {
  --primary: #592eea;
  --primary-dark: #26046e;
  --primary-soft: #f4efff;
  --primary-soft-2: #ebe3ff;
  --violet: #8849f4;
  --text: #13131a;
  --muted: #6c7280;
  --line: #dfe2e8;
  --line-dark: #c9cbd3;
  --card: #ffffff;
  --success: #58b77d;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--text); background: #fff; }
button, input, select { font: inherit; }
button { cursor: pointer; }
.app-root { min-height: 100vh; background: radial-gradient(circle at 50% 0%, rgba(89,46,234,0.04), transparent 42%), #fff; }
.app-header { height: 84px; display: flex; align-items: center; justify-content: space-between; padding: 0 48px; border-bottom: 1px solid #dadde6; }
.logo-wrap { display: flex; align-items: center; gap: 14px; font-weight: 800; font-size: 23px; }
.logo-mark { width: 30px; height: 30px; position: relative; display: grid; place-items: center; }
.logo-dot { width: 8px; height: 8px; border: 3px solid var(--primary); border-radius: 999px; transform: rotate(-24deg); }
.logo-line { position: absolute; height: 4px; border-radius: 999px; background: var(--primary); left: 2px; }
.logo-line.line-1 { width: 14px; bottom: 11px; transform: rotate(-2deg); }
.logo-line.line-2 { width: 22px; bottom: 5px; }
.logo-line.line-3 { width: 30px; bottom: 0; }
.back-button { border: 1px solid #d2c6ff; color: #29243f; background: white; border-radius: 6px; height: 38px; padding: 0 18px; display: inline-flex; align-items: center; gap: 10px; font-weight: 700; }
.back-button span { color: var(--primary); font-size: 30px; line-height: 0; }
.start-screen { position: relative; height: calc(100vh - 84px); display: grid; place-items: center; overflow: hidden; }
.orbit-main { width: 740px; height: 740px; border: 4px solid var(--primary); border-radius: 50%; position: absolute; top: 48px; }
.start-content { position: relative; text-align: center; margin-top: -40px; }
.start-subtitle { color: var(--primary); font-size: 25px; letter-spacing: 1px; margin: 0 0 28px; }
.start-content h1 { color: var(--primary-dark); font-size: 94px; line-height: 1; margin: 0 0 62px; letter-spacing: -3px; font-weight: 900; }
.start-button { width: 340px; height: 104px; border: 0; border-radius: 12px; background: var(--primary); color: #fff; font-size: 42px; letter-spacing: 3px; font-weight: 800; box-shadow: 0 18px 40px rgba(89,46,234,.22); }
.start-button span { font-size: 28px; margin-left: 12px; }
.page-shell { max-width: 1370px; margin: 0 auto; padding: 34px 28px 42px; }
.page-shell.center { max-width: 1220px; }
.stepper { display: grid; grid-template-columns: repeat(6, auto 1fr); align-items: start; margin: 0 auto 44px; max-width: 1120px; }
.stepper .step-line:last-child { display: none; }
.step-item { width: 112px; text-align: center; }
.step-circle { width: 44px; height: 44px; border: 2px solid #aeb3bd; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 12px; color: #646a73; font-size: 18px; background: #fff; font-weight: 700; }
.step-circle.active, .step-circle.done { background: var(--primary); border-color: var(--primary); color: white; box-shadow: 0 8px 22px rgba(89,46,234,.22); }
.step-label { font-size: 16px; color: #646a73; font-weight: 700; white-space: nowrap; }
.step-label.active { color: var(--primary); }
.step-line { height: 2px; background: #bcc1ca; margin-top: 22px; min-width: 100px; }
.step-line.done { background: var(--primary); }
.page-title { margin-bottom: 22px; }
.page-title.center-title { text-align: center; margin-bottom: 26px; }
.page-title h1 { font-size: 34px; margin: 0 0 8px; letter-spacing: -1.2px; }
.page-title p { margin: 0; color: var(--muted); font-weight: 700; font-size: 16px; }
.two-column { display: grid; grid-template-columns: minmax(0, 2fr) minmax(330px, 1fr); gap: 28px; align-items: stretch; }
.card { background: #fff; border: 1.5px solid #d8d9df; border-radius: 16px; box-shadow: 0 2px 8px rgba(20, 20, 40, 0.02); }
.form-card { padding: 32px 36px 28px; }
.form-grid.two { display: grid; grid-template-columns: 1fr 1.1fr; gap: 28px; }
.field { display: block; margin-bottom: 22px; }
.field-label { display: flex; align-items: center; gap: 10px; font-weight: 800; margin-bottom: 9px; }
.label-hint { margin-left: auto; color: var(--primary); font-size: 13px; font-style: normal; font-weight: 800; background: #f4f0ff; border: 1px solid #dfd6ff; border-radius: 999px; padding: 5px 10px; white-space: nowrap; }
.icon { display: inline-grid; place-items: center; min-width: 19px; height: 19px; color: var(--primary); font-weight: 800; font-size: 18px; }
input, select { width: 100%; height: 44px; border: 1.5px solid #ccd0d8; border-radius: 5px; padding: 0 16px; background: #fff; color: #353741; font-weight: 700; outline: none; }
input::placeholder { color: #c3c5cb; }
.helper-text { display: block; margin-top: 7px; color: #626874; font-weight: 700; font-size: 14px; }
.radio-grid { margin-top: 4px; }
.radio-row { display: block; margin-bottom: 20px; }
.radio-label { font-weight: 800; display: flex; align-items: center; gap: 9px; margin-bottom: 14px; }
.radio-options { display: flex; flex-wrap: wrap; gap: 16px 22px; }
.radio-option { display: inline-flex; align-items: center; gap: 8px; font-weight: 800; white-space: nowrap; cursor: pointer; }
.radio-input { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }
.radio-dot { width: 20px; height: 20px; border: 2px solid #bebfc5; border-radius: 50%; display: inline-block; position: relative; }
.radio-dot.checked { border-color: var(--primary); }
.radio-dot.checked::after { content: ""; width: 10px; height: 10px; border-radius: 50%; background: var(--primary); position: absolute; inset: 3px; }
.notice { min-height: 46px; border-radius: 7px; background: #f4f0ff; display: flex; align-items: center; gap: 10px; color: var(--primary); font-weight: 800; padding: 12px 14px; margin-top: 4px; }
.summary-card { padding: 30px 28px; }
.purple-tint { background: #faf7ff; border-color: #e6dcff; }
.summary-card h3, .guide-card h3, .pref-card h3, .graduation-card h3 { margin: 0 0 26px; color: var(--primary); font-size: 21px; }
.profile-row { display: flex; gap: 18px; align-items: center; margin-bottom: 30px; }
.avatar { width: 92px; height: 92px; border-radius: 50%; background: #eee8ff; position: relative; display: grid; place-items: center; }
.avatar::before { content: ""; width: 26px; height: 26px; border-radius: 50%; background: #6b3be0; position: absolute; top: 25px; }
.avatar span { width: 54px; height: 24px; border-radius: 999px 999px 0 0; background: #6b3be0; margin-top: 42px; }
.profile-row strong { font-size: 18px; }
.profile-row p { margin: 5px 0; color: #6b707c; font-weight: 800; }
.summary-line { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid transparent; margin: 20px 0; gap: 18px; }
.summary-line span { display: flex; align-items: center; gap: 14px; font-weight: 800; }
.summary-line strong { color: #6b707c; font-size: 18px; text-align: right; }
.guide-box { display: flex; align-items: center; gap: 12px; padding: 18px; border: 1.5px solid #dfd6ff; border-radius: 8px; background: #f3efff; color: #6a6f7c; font-weight: 800; line-height: 1.5; margin-top: 28px; }
.guide-box.center { justify-content: center; text-align: center; margin-top: 42px; }
.primary-button { margin: 30px auto 0; height: 74px; border: 0; border-radius: 8px; color: #fff; background: linear-gradient(100deg, var(--primary), #a448ff); display: flex; align-items: center; justify-content: center; gap: 90px; font-size: 26px; font-weight: 800; box-shadow: 0 12px 28px rgba(89,46,234,.2); }
.primary-button.wide { width: min(560px, 100%); }
.primary-button .arrow { font-size: 46px; font-weight: 300; line-height: 1; }
.academic-layout { grid-template-columns: minmax(0, 2.1fr) minmax(340px, .95fr); }
.academic-card { padding: 28px; }
.tab-row { display: grid; grid-template-columns: 230px 1fr; align-items: end; border-bottom: 2px solid #ececf2; margin-bottom: 18px; }
.tab-row button { height: 46px; border: 1.5px solid #dadde5; background: white; border-radius: 6px 6px 0 0; font-weight: 800; color: #636874; }
.tab-row button.active { color: var(--primary); border-color: transparent; border-bottom: 3px solid var(--primary); font-size: 18px; }
.course-table { display: grid; gap: 10px; }
.course-head, .course-row { display: grid; grid-template-columns: 110px 130px 1fr 140px 42px; gap: 18px; align-items: center; }
.course-head { color: #4b515d; font-weight: 800; padding: 0 0 4px; }
.course-row { padding-bottom: 10px; border-bottom: 1px solid #ececf0; }
.course-row select { appearance: auto; }
.trash, .add-button { background: white; border: 0; color: #5d6470; }
.add-button { border: 1.5px solid var(--primary); color: var(--primary); border-radius: 5px; font-weight: 900; height: 42px; padding: 0 22px; margin-top: 8px; }
.accordion-row { margin-top: 12px; min-height: 64px; padding: 0 22px; border: 1.5px solid #e1dcf3; border-radius: 7px; background: #fbf9ff; display: flex; align-items: center; gap: 12px; color: var(--primary); font-weight: 800; }
.accordion-row span { margin-left: auto; }
.guide-card { padding: 36px 28px; }
.guide-item { display: flex; gap: 16px; margin: 0 0 34px; color: #3a3d46; font-weight: 800; line-height: 1.7; }
.guide-item span { width: 11px; height: 11px; border-radius: 50%; background: var(--primary); margin-top: 8px; flex: 0 0 auto; }
.pref-layout { grid-template-columns: minmax(0, 2fr) minmax(340px, 1fr); }
.pref-card { padding: 28px 36px 22px; }
.pref-card h3 { color: #252832; font-size: 18px; margin-bottom: 16px; }
.section-title-with-hint { display: flex; align-items: center; gap: 10px; }
.section-title-with-hint em { color: var(--primary); font-size: 14px; font-style: normal; font-weight: 800; }
.credit-campus-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: end; }
.pref-card hr, .graduation-card hr { border: 0; border-top: 1px solid #e1e3e8; margin: 16px 0; }
.day-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 24px; }
.day-grid button, .segment-row button { height: 60px; background: white; border: 1.5px solid #d8dce4; border-radius: 7px; font-weight: 800; font-size: 17px; position: relative; }
.day-grid button.selected, .segment-row button.selected { background: var(--primary); color: #fff; border-color: var(--primary); box-shadow: 0 12px 24px rgba(89,46,234,.16); }
.check-badge { position: absolute; right: -12px; top: -12px; width: 30px; height: 30px; border-radius: 50%; background: #6b3be0; color: white; display: grid; place-items: center; }
.full-select { height: 48px; }
.check-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.checkbox-label { display: flex; align-items: center; gap: 9px; font-weight: 800; color: #464b56; }
.check-box { width: 24px; height: 24px; border: 2px solid #bfc4cd; border-radius: 4px; display: grid; place-items: center; color: white; }
.check-box.checked { background: var(--primary); border-color: var(--primary); }
.segment-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; }
.segment-row button.selected { background: white; color: var(--primary); border-color: var(--primary); }
.analysis-screen { text-align: center; padding-top: 18px; }
.analysis-screen h2 { font-size: 38px; margin: 0 0 14px; letter-spacing: -1px; }
.analysis-screen p { color: var(--muted); font-size: 18px; font-weight: 800; margin: 0 0 34px; }
.ai-orbit { width: 192px; height: 192px; border: 6px solid transparent; border-right-color: var(--primary); border-radius: 50%; margin: 0 auto 22px; position: relative; display: grid; place-items: center; box-shadow: 0 0 34px rgba(89,46,234,.25); animation: spin 2.8s linear infinite; }
.ai-orbit::before { content: ""; position: absolute; inset: 16px; border-radius: 50%; background: white; }
.ai-inner { position: relative; z-index: 1; width: 70px; height: 54px; border: 3px solid var(--primary); border-radius: 20px; display: grid; place-items: center; color: var(--primary); font-weight: 900; background: white; animation: spinBack 2.8s linear infinite; }
.orbit-dot { width: 16px; height: 16px; background: var(--primary); border-radius: 50%; position: absolute; right: 14px; bottom: 28px; box-shadow: 0 0 18px rgba(89,46,234,.8); }
.analysis-list { width: min(560px, 100%); margin: 0 auto; display: grid; gap: 10px; }
.analysis-item { height: 52px; border: 1.5px solid #d9dce4; border-radius: 7px; display: grid; grid-template-columns: 40px 1fr 40px; align-items: center; padding: 0 20px; color: #5a606c; background: white; }
.analysis-item.loading { border-color: #d8c9ff; background: #fff; color: var(--primary-dark); }
.status { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #b8bdc6; display: grid; place-items: center; }
.status.done { background: var(--primary); border-color: var(--primary); color: white; }
.status.loading { border: 3px dotted var(--primary); animation: spin 1.2s linear infinite; }
.dots { color: #949aa6; letter-spacing: 2px; }
.analysis-button { width: min(640px, 100%); height: 68px; border: 1.5px solid #dcd2ff; border-radius: 6px; background: #fbf9ff; color: #6e7380; margin-top: 54px; font-size: 24px; font-weight: 800; }
.result-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 28px; }
.recommendation-card { padding: 28px; position: relative; min-height: 500px; }
.recommendation-card.best { border: 2px solid var(--primary); box-shadow: 0 12px 35px rgba(89,46,234,.14); }
.best-badge { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); height: 36px; padding: 0 20px; display: flex; align-items: center; border-radius: 7px; background: var(--primary); color: white; font-weight: 900; }
.recommend-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.recommend-head h3 { margin: 0; font-size: 28px; }
.tag, .green-tag { border-radius: 8px; padding: 8px 14px; font-weight: 900; color: var(--primary); background: #f2ecff; border: 1px solid #dfd3ff; }
.green-tag { color: #329562; background: #e8f7ee; border-color: #ccebd8; }
.score-row { display: grid; grid-template-columns: 1.2fr .85fr .85fr; gap: 10px; margin-bottom: 14px; }
.score-row span { height: 44px; border: 1.5px solid #e0e2e9; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 900; color: #5a6070; }
.score-row span:last-child { color: var(--primary); font-size: 21px; }
.mini-table { height: 170px; display: grid; grid-template-columns: 58px repeat(5, 1fr); grid-template-rows: 28px repeat(5, 1fr); border: 1px solid #e3e5eb; border-radius: 7px; overflow: hidden; margin-bottom: 24px; }
.mini-table.faded { opacity: .7; }
.mini-table span, .mini-table strong, .mini-cell { border-right: 1px solid #eef0f4; border-bottom: 1px solid #eef0f4; display: grid; place-items: center; font-size: 12px; color: #4e5561; }
.mini-cell i { width: 66%; height: 60%; border-radius: 2px; background: #c7b3ff; display: block; }
.reason-box { border-top: 2px dotted #d8dbe5; padding-top: 18px; }
.reason-box h4 { margin: 0 0 8px; color: var(--primary); font-size: 18px; }
.reason-box p { margin: 0; color: #424854; font-weight: 700; line-height: 1.6; }
.detail-layout { grid-template-columns: minmax(0, 2fr) minmax(360px, 1fr); }
.detail-table-card { padding: 28px 24px; }
.detail-head { display: flex; justify-content: space-between; align-items: center; margin: 0 0 22px; }
.detail-head h3 { font-size: 28px; margin: 0; }
.detail-head h3 span { font-size: 15px; margin-left: 8px; color: var(--primary); background: #eee7ff; border: 1px solid #ded1ff; padding: 7px 12px; border-radius: 7px; vertical-align: middle; }
.detail-score { display: flex; gap: 18px; }
.detail-score span { height: 44px; border: 1.5px solid #e0e2e9; border-radius: 7px; display: flex; align-items: center; gap: 8px; padding: 0 18px; font-weight: 900; color: #555b67; }
.detail-score strong { color: var(--primary); font-size: 20px; }
.full-schedule { display: grid; grid-template-columns: 70px repeat(5, 1fr); grid-template-rows: 58px repeat(5, 78px); border: 1px solid #e1e4eb; border-radius: 8px; overflow: hidden; }
.corner, .day-title, .time-title, .schedule-cell { border-right: 1px solid #e8eaf0; border-bottom: 1px solid #e8eaf0; display: grid; place-items: center; }
.day-title, .time-title { font-weight: 900; color: #464c57; }
.schedule-cell span { width: 90%; min-height: 50px; border-radius: 6px; display: grid; place-items: center; text-align: center; white-space: pre-line; font-weight: 900; line-height: 1.2; padding: 4px; }
.schedule-cell .strong { background: linear-gradient(180deg, #8b67ef, #6d3fe0); color: white; }
.schedule-cell .light { background: #eee9fb; color: #4c4567; }
.graduation-card { padding: 30px 28px; }
.grad-line { display: flex; justify-content: space-between; align-items: center; padding: 11px 0; border-bottom: 1px solid #e4e6ec; }
.grad-line span { display: flex; align-items: center; gap: 12px; font-weight: 900; color: #4c515c; }
.grad-line strong { font-size: 18px; color: #343946; }
.grad-line.highlight strong { color: var(--primary); font-size: 20px; }
.graduation-card h4 { margin: 18px 0 16px; color: var(--primary); font-size: 18px; }
.progress-row { display: grid; grid-template-columns: 70px 1fr 42px; gap: 14px; align-items: center; margin: 13px 0; font-weight: 800; color: #4e5561; }
.progress-row em { color: #585e68; font-style: normal; text-align: right; }
.progress-row.strong, .progress-row.strong em { color: var(--primary); }
.progress-track { height: 11px; border-radius: 999px; background: #e7e8ed; overflow: hidden; }
.progress-track i { height: 100%; display: block; border-radius: 999px; background: var(--primary); }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes spinBack { to { transform: rotate(-360deg); } }
@media (max-width: 1100px) {
  .app-header { padding: 0 22px; }
  .stepper { overflow-x: auto; padding-bottom: 8px; }
  .two-column, .academic-layout, .pref-layout, .detail-layout, .result-grid { grid-template-columns: 1fr; }
  .form-grid.two, .check-row, .segment-row, .day-grid, .credit-campus-grid { grid-template-columns: 1fr 1fr; }
  .result-grid { max-width: 560px; margin-inline: auto; }
  .orbit-main { width: 560px; height: 560px; }
}
@media (max-width: 640px) {
  .start-content h1 { font-size: 64px; }
  .start-button { width: 260px; height: 78px; font-size: 30px; }
  .page-shell { padding-inline: 16px; }
  .form-grid.two, .check-row, .segment-row, .day-grid, .course-head, .course-row { grid-template-columns: 1fr; }
  .course-head { display: none; }
  .detail-score, .detail-head { flex-direction: column; align-items: flex-start; }
  .full-schedule { overflow-x: auto; min-width: 760px; }
}
`;