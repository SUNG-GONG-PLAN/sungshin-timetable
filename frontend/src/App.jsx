import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchRecommendation } from "./api";

const steps = [
  "기본 정보 입력",
  "학업 이력 입력",
  "희망 조건 입력",
  "AI 분석 중",
  "추천 결과",
  "시간표 상세",
];

const courses = [
  { year: "", semester: "", name: "", retake: "" },
];

const days = ["월", "화", "수", "목", "금"];
const times = ["1교시", "2교시", "3교시", "4교시", "5교시"];

const scheduleBlocks = [
  { day: 2, time: 0, title: "이산수학", strong: true },
  { day: 4, time: 0, title: "파이썬프로그래밍", strong: true },
  { day: 1, time: 1, title: "파이썬프로그래밍", strong: true },
  { day: 3, time: 1, title: "자료구조", strong: true },
  { day: 0, time: 2, title: "디지털\n신호처리", strong: false },
  { day: 2, time: 2, title: "자료구조", strong: true },
  { day: 3, time: 2, title: "알고리즘", strong: true },
  { day: 4, time: 2, title: "클라우드컴퓨팅AI", strong: false },
  { day: 3, time: 3, title: "클라우드컴퓨팅AI", strong: false },
  { day: 1, time: 4, title: "알고리즘", strong: true },
];

const recommendationCards = [
  {
    id: 1,
    title: "시간표 1",
    tag: "균형형",
    credit: "총 18학점",
    score: "84.2",
    reason: "핵심전공과 심화전공을 균형 있게 포함해 졸업 필수 학점 충족에 도움이 됩니다.",
  },
  {
    id: 2,
    title: "시간표 2",
    tag: "전공집중형",
    credit: "총 17학점",
    score: "85.7",
    reason: "전공 과목 비중을 높여 학업 집중도를 높인 시간표입니다.",
    best: true,
  },
  {
    id: 3,
    title: "시간표 3",
    tag: "공강최적형",
    credit: "총 18학점",
    score: "84.4",
    reason: "희망 공강 요일을 반영하면서 필수 전공 과목을 포함했습니다.",
  },
];

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
    user: "♙",
    major: "◇",
    id: "▣",
    grade: "▯",
    term: "□",
    double: "♧",
    book: "▤",
    calendar: "▣",
    clock: "◷",
    balance: "⚖",
    info: "i",
    trash: "⌫",
    star: "☆",
    stack: "▱",
    cap: "▱",
  };
  return <span className={`icon icon-${type}`}>{iconMap[type] ?? "•"}</span>;
}

function Header({ step, setStep }) {
  return (
    <header className="app-header">
      <Logo />
      {step > 0 && (
        <button className="back-button" onClick={() => setStep(Math.max(0, step - 1))}>
          <span>‹</span>
          이전 단계로
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
        <Icon type={icon} />
        {label}
        {labelHint && <em className="label-hint">{labelHint}</em>}
      </span>
      <input placeholder={placeholder} {...inputProps} />
      {helper && <span className="helper-text">{helper}</span>}
    </label>
  );
}

function RadioRow({ label, selected, options, onChange }) {
  const radioOptions = options ?? [
    { value: "yes", label: "예" },
    { value: "no", label: "아니오" },
  ];

  return (
    <div className="radio-row">
      <span className="radio-label">{label}</span>
      <div className="radio-options">
        {radioOptions.map((option) => (
          <label className="radio-option" key={option.value}>
            <input
              className="radio-input"
              type="radio"
              name={label}
              value={option.value}
              checked={selected === option.value}
              onChange={() => onChange?.(option.value)}
            />
            <span className={`radio-dot ${selected === option.value ? "checked" : ""}`} />
            {option.label}
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

function StartScreen({ setStep }) {
  return (
    <main className="start-screen">
      <div className="orbit orbit-main" />
      <div className="start-content">
        <p className="start-subtitle">성신여대 공대생의 시간표</p>
        <h1>성공표</h1>
        <button className="start-button" onClick={() => setStep(1)}>
          Start <span>▶</span>
        </button>
      </div>
    </main>
  );
}

function BasicInfo({ setStep, basicInfo, setBasicInfo }) {
  const updateBasicInfo = (key, value) => {
    setBasicInfo((prev) => ({ ...prev, [key]: value }));
  };

  const majorTypeLabel = {
    minor: "부전공",
    double: "복수전공",
    intensive: "전공심화",
  }[basicInfo.majorType];

  return (
    <PageShell step={1} title="기본 정보를 입력해주세요" subtitle="정확한 추천을 위해 기본 정보를 입력해주세요.">
      <div className="two-column">
        <section className="card form-card">
          <div className="form-grid two">
            <InputBox
              label="이름"
              icon="user"
              value={basicInfo.name}
              placeholder="예) 김수정"
              onChange={(value) => updateBasicInfo("name", value)}
            />
            <InputBox
              label="학과 (직접 입력)"
              icon="major"
              value={basicInfo.department}
              placeholder="예) AI융합학부_AI전공"
              onChange={(value) => updateBasicInfo("department", value)}
            />
          </div>

          <InputBox
            label="학번"
            icon="id"
            value={basicInfo.studentId}
            placeholder="예) 20261234"
            helper="학번 8자리를 정확히 입력해주세요. (공백 없이 입력)"
            onChange={(value) => updateBasicInfo("studentId", value)}
          />

          <div className="form-grid two">
            <InputBox
              label="현재 학년"
              icon="grade"
              value={basicInfo.grade}
              placeholder="예) 2학년"
              onChange={(value) => updateBasicInfo("grade", value)}
            />
            <InputBox
              label="현재 학기"
              icon="term"
              value={basicInfo.semester}
              placeholder="예) 2026년 1학기"
              labelHint="해당 학기의 시간표를 추천해드립니다"
              onChange={(value) => updateBasicInfo("semester", value)}
            />
          </div>

          <div className="form-grid two radio-grid">
            <RadioRow
              label="부/복수전공 선택"
              selected={basicInfo.majorType}
              onChange={(value) => updateBasicInfo("majorType", value)}
              options={[
                { value: "minor", label: "부전공" },
                { value: "double", label: "복수전공" },
                { value: "intensive", label: "전공심화" },
              ]}
            />

            <InputBox
              label="부/복수전공 학과 입력"
              icon="major"
              value={basicInfo.subMajorDepartment}
              placeholder="예) 데이터사이언스학과"
              onChange={(value) => updateBasicInfo("subMajorDepartment", value)}
            />
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

function SummaryLine({ icon, label, value }) {
  return (
    <div className="summary-line">
      <span><Icon type={icon} />{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AcademicHistory({ setStep, history, setHistory, mandatoryGe, setMandatoryGe }) {
  const [activeTab, setActiveTab] = useState("firstYear");

  return (
    <PageShell step={2} title="학업 이력을 입력해주세요" subtitle="학년에 따라 필요한 입력 화면만 보이도록 설계했습니다.">
      <div className="two-column academic-layout">
        <section className="card academic-card">
          <div className="tab-row">
            <button
              type="button"
              className={activeTab === "firstYear" ? "active" : ""}
              onClick={() => setActiveTab("firstYear")}
            >
              1학년 자동배정 과목
            </button>
            <button
              type="button"
              className={activeTab === "history" ? "active" : ""}
              onClick={() => setActiveTab("history")}
            >
              기존 수강 이력
            </button>
          </div>

          {activeTab === "firstYear" ? (
            <FirstYearRequiredCourses mandatoryGe={mandatoryGe} setMandatoryGe={setMandatoryGe} />
          ) : (
            <CourseHistoryTable history={history} setHistory={setHistory} />
          )}
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

function FirstYearRequiredCourses({ mandatoryGe, setMandatoryGe }) {
  const requiredCourses = [
    { key: "bisato", title: "비판적 사고와 토론" },
    { key: "creative_writing", title: "창조적 사고와 쓰기" },
    { key: "career_exploration", title: "전공별 진로탐색" },
  ];

  const updateMandatoryCourse = (key, field, value) => {
    setMandatoryGe((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  return (
    <div className="first-year-panel">
      <div className="first-year-title-row">
        <p>1학년 필수 과목의 시간을 입력해주세요. 입력한 내용은 시간표 미리보기에 반영됩니다.</p>
      </div>

      <div className="required-course-list">
        {requiredCourses.map((course) => (
          <RequiredCourseCard
            key={course.key}
            title={course.title}
            value={mandatoryGe[course.key]}
            onChange={(field, value) => updateMandatoryCourse(course.key, field, value)}
          />
        ))}
      </div>
    </div>
  );
}

function RequiredCourseCard({ title, value, onChange }) {
  return (
    <article className="required-course-card">
      <h3><span>+</span>{title}</h3>
      <div className="required-course-grid">
        <label>
          <em>학기</em>
          <select value={value.semester} onChange={(e) => onChange("semester", e.target.value)}>
            <option value="">선택</option>
            <option>1학기</option>
            <option>2학기</option>
          </select>
        </label>
        <label>
          <em>요일</em>
          <select value={value.day} onChange={(e) => onChange("day", e.target.value)}>
            <option value="">선택</option>
            <option>월</option>
            <option>화</option>
            <option>수</option>
            <option>목</option>
            <option>금</option>
          </select>
        </label>
        <label>
          <em>시작 시간</em>
          <select value={value.start_time} onChange={(e) => onChange("start_time", e.target.value)}>
            <option>9:00</option>
            <option>10:00</option>
            <option>11:00</option>
            <option>12:00</option>
            <option>13:00</option>
            <option>14:00</option>
            <option>15:00</option>
            <option>16:00</option>
          </select>
        </label>
        <label>
          <em>종료 시간</em>
          <select value={value.end_time} onChange={(e) => onChange("end_time", e.target.value)}>
            <option>10:00</option>
            <option>11:00</option>
            <option>12:00</option>
            <option>13:00</option>
            <option>14:00</option>
            <option>15:00</option>
            <option>16:00</option>
            <option>17:00</option>
          </select>
        </label>
      </div>
    </article>
  );
}

function CourseHistoryTable({ history, setHistory }) {
  const semesterOptions = ["1학기", "2학기", "여름학기", "겨울학기"];
  const retakeOptions = ["아니오", "예"];

  const updateCourse = (index, key, value) => {
    setHistory((prev) =>
      prev.map((course, courseIndex) =>
        courseIndex === index ? { ...course, [key]: value } : course
      )
    );
  };

  const addCourse = () => {
    setHistory((prev) => [
      ...prev,
      { year: "", semester: "", name: "", retake: "" },
    ]);
  };

  const deleteCourse = (index) => {
    setHistory((prev) => prev.filter((_, courseIndex) => courseIndex !== index));
  };

  return (
    <>
      <div className="course-table">
        <div className="course-head">
          <span>수강연도</span>
          <span>학기</span>
          <span>과목명</span>
          <span>재수강 여부</span>
          <span />
        </div>

        {history.map((course, index) => (
          <div className="course-row" key={`course-${index}`}>
            <input
              value={course.year}
              placeholder="예) 2025"
              onChange={(e) => updateCourse(index, "year", e.target.value)}
            />

            <select
              value={course.semester}
              onChange={(e) => updateCourse(index, "semester", e.target.value)}
            >
              <option value="">학기 선택</option>
              {semesterOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <input
              value={course.name}
              placeholder="과목명 입력"
              onChange={(e) => updateCourse(index, "name", e.target.value)}
            />

            <select
              value={course.retake}
              onChange={(e) => updateCourse(index, "retake", e.target.value)}
            >
              <option value="">재수강 여부 선택</option>
              {retakeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <button className="trash" type="button" onClick={() => deleteCourse(index)}>
              <Icon type="trash" />
            </button>
          </div>
        ))}
      </div>

      <button className="add-button" type="button" onClick={addCourse}>+ 과목 추가</button>

      <div className="accordion-row">
        <Icon type="book" />
        1학년 자동배정 과목: 비판적 사고와 토론 / 창조적 사고와 글쓰기 / 전공별 진로탐색 (요일·교시 입력)
        <span>⌄</span>
      </div>
    </>
  );
}

function GuideItem({ children }) {
  return <p className="guide-item"><span />{children}</p>;
}

function Preferences({ setStep, preferences, setPreferences, onRecommend, loading, errorMessage }) {
  const updatePreferences = (key, value) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFreeDay = (day) => {
    setPreferences((prev) => ({
      ...prev,
      freeDays: prev.freeDays.includes(day)
        ? prev.freeDays.filter((item) => item !== day)
        : [...prev.freeDays, day],
    }));
  };

  const campusLabel = {
    su: "수캠 위주",
    un: "운캠 위주",
    mixed: "혼재 가능",
  }[preferences.campus];

  const compositionOptions = [
    { value: "major", label: "전공 위주" },
    { value: "general", label: "교양 위주" },
    { value: "balanced", label: "균형형" },
  ];

  const compositionLabel = compositionOptions.find((option) => option.value === preferences.composition)?.label ?? "균형형";

  return (
    <PageShell step={3} title="원하는 시간표 조건을 선택해주세요" subtitle="선택한 조건을 바탕으로 맞춤형 시간표를 추천합니다.">
      <div className="two-column pref-layout">
        <section className="card pref-card">
          <h3 className="section-title-with-hint">
            희망 공강 요일
            <em>(중복선택 가능)</em>
          </h3>
          <div className="day-grid">
            {days.map((day) => {
              const selected = preferences.freeDays.includes(day);
              return (
                <button
                  type="button"
                  key={day}
                  className={selected ? "selected" : ""}
                  onClick={() => toggleFreeDay(day)}
                >
                  {day}{selected && <span className="check-badge">✓</span>}
                </button>
              );
            })}
          </div>
          <hr />

          <div className="credit-campus-grid">
            <div>
              <h3>희망 학점</h3>
              <select className="full-select" value={preferences.credits} onChange={(e) => updatePreferences("credits", e.target.value)}>
                <option>15학점</option>
                <option>16학점</option>
                <option>17학점</option>
                <option>18학점</option>
                <option>19학점</option>
              </select>
            </div>
            <div>
              <h3>희망 캠퍼스</h3>
              <select className="full-select" value={preferences.campus} onChange={(e) => updatePreferences("campus", e.target.value)}>
                <option value="su">수캠 위주</option>
                <option value="un">운캠 위주</option>
                <option value="mixed">혼재 가능</option>
              </select>
            </div>
          </div>

          <hr />
          <h3>수업 시간 선호</h3>
          <div className="check-row">
            <CheckBox checked={preferences.timePrefs.includes("오전수업피하기")} label="오전 수업 피하기" onChange={() => toggleTimePref("오전수업피하기", setPreferences)} />
            <CheckBox checked={preferences.timePrefs.includes("풀강피하기")} label="풀강 피하기" onChange={() => toggleTimePref("풀강피하기", setPreferences)} />
            <CheckBox checked={preferences.timePrefs.includes("몰아듣기선호")} label="몰아듣기 선호" onChange={() => toggleTimePref("몰아듣기선호", setPreferences)} />
            <CheckBox checked={preferences.timePrefs.includes("수업사이공강확보")} label="수업 사이 공강 확보" onChange={() => toggleTimePref("수업사이공강확보", setPreferences)} />
          </div>
          <hr />
          <h3>수업 구성 선호</h3>
          <div className="segment-row">
            {compositionOptions.map((option) => {
              const selected = preferences.composition === option.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  className={selected ? "selected" : ""}
                  onClick={() => updatePreferences("composition", option.value)}
                >
                  {option.label}{selected && <span className="check-badge">✓</span>}
                </button>
              );
            })}
          </div>
          <div className="notice"><Icon type="info" />선택한 조건은 추천 시간표 생성에 반영됩니다.</div>
          {errorMessage && <div className="error-box"><Icon type="info" />{errorMessage}</div>}
        </section>
        <aside className="card summary-card purple-tint">
          <h3>선택 조건 요약</h3>
          <SummaryLine icon="calendar" label="희망 공강" value={preferences.freeDays.length > 0 ? `${preferences.freeDays.join(", ")}요일` : "선택 안 함"} />
          <SummaryLine icon="major" label="희망 학점" value={preferences.credits} />
          <SummaryLine icon="calendar" label="희망 캠퍼스" value={campusLabel} />
          <SummaryLine icon="clock" label="시간 선호" value={preferences.timePrefs.length > 0 ? preferences.timePrefs.join(", ") : "선택 안 함"} />
          <SummaryLine icon="balance" label="구성 선호" value={compositionLabel} />
          <div className="guide-box"><Icon type="info" />선택한 조건은 이후 AI 분석 단계에서 시간표 추천 우선순위에 반영됩니다.</div>
        </aside>
      </div>
      <PrimaryButton onClick={onRecommend} wide>{loading ? "추천 생성 중..." : "AI 시간표 생성하기"}</PrimaryButton>
    </PageShell>
  );
}

function toggleTimePref(value, setPreferences) {
  setPreferences((prev) => ({
    ...prev,
    timePrefs: prev.timePrefs.includes(value)
      ? prev.timePrefs.filter((item) => item !== value)
      : [...prev.timePrefs, value],
  }));
}

function CheckBox({ checked, label, onChange }) {
  return (
    <label className="checkbox-label">
      <input className="checkbox-input" type="checkbox" checked={checked} onChange={onChange} />
      <span className={`check-box ${checked ? "checked" : ""}`}>{checked ? "✓" : ""}</span>
      {label}
    </label>
  );
}

function Analysis({ loading, apiLogs }) {
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
          <AnalysisItem done text="학업 이력 분석 중" />
          <AnalysisItem done text="졸업 요건 확인 중" />
          <AnalysisItem loading text="백엔드 추천 요청 중" />
          <AnalysisItem text="추천 결과 정리 중" />
        </div>
        <button className="analysis-button" type="button" disabled>{loading ? "분석 중..." : "요청 처리 중..."}</button>

        <div className="api-log-panel">
          <h3>API 요청 로그</h3>
          {apiLogs.length === 0 ? (
            <p>아직 기록된 요청 로그가 없습니다.</p>
          ) : (
            apiLogs.map((log, index) => (
              <pre key={`${log.time}-${index}`}>[{log.time}] {log.message}</pre>
            ))
          )}
        </div>
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

function MiniTable({ faded = false }) {
  const miniBlocks = [
    { day: 2, time: 0 }, { day: 1, time: 1 }, { day: 3, time: 1 },
    { day: 0, time: 2 }, { day: 2, time: 2 }, { day: 4, time: 2 },
    { day: 3, time: 3 }, { day: 1, time: 4 }, { day: 4, time: 4 },
  ];
  return (
    <div className={`mini-table ${faded ? "faded" : ""}`}>
      <div />
      {days.map((day) => <span key={day}>{day}</span>)}
      {times.map((time, r) => (
        <React.Fragment key={time}>
          <strong>{time}</strong>
          {days.map((_, c) => {
            const has = miniBlocks.some((b) => b.day === c && b.time === r);
            return <div className="mini-cell" key={`${r}-${c}`}>{has && <i />}</div>;
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

function Result({ setStep, recommendationResult, setSelectedTimetableIndex }) {
  const hasBackendResult = recommendationResult?.timetables?.length > 0;

  const cards = hasBackendResult
    ? recommendationResult.timetables.map((table, index) => ({
        id: index + 1,
        title: table.label || `시간표 ${index + 1}`,
        tag: table.reason_tags?.[0] || "추천형",
        credit: `총 ${table.total_credits ?? "-"}학점`,
        score: table.score ?? "-",
        reason: table.reason_tags?.join(", ") || "백엔드 추천 결과를 바탕으로 생성된 시간표입니다.",
        courses: table.courses ?? [],
        best: index === 0,
        backendIndex: index,
      }))
    : recommendationCards.map((card, index) => ({ ...card, courses: [], backendIndex: index }));

  return (
    <PageShell step={5} title="추천 시간표가 생성되었어요" subtitle="입력한 정보와 희망 조건을 바탕으로 추천된 시간표입니다." centerTitle>
      {!hasBackendResult && (
        <div className="error-box result-warning"><Icon type="info" />백엔드 추천 결과가 없어 임시 화면 데이터를 표시하고 있습니다.</div>
      )}
      <div className="result-grid">
        {cards.map((card) => (
          <article className={`card recommendation-card ${card.best ? "best" : ""}`} key={card.id}>
            {card.best && <div className="best-badge">추천 시간표</div>}
            <div className="recommend-head">
              <h3>{card.title}</h3>
              <span className={card.tag === "공강최적형" ? "green-tag" : "tag"}>{card.tag}</span>
            </div>
            <div className="score-row">
              <span><Icon type="cap" />{card.credit}</span>
              <span><Icon type="stack" />점수</span>
              <span><Icon type="star" />{card.score}</span>
            </div>
            {hasBackendResult ? <CoursePreviewList courses={card.courses} /> : <MiniTable faded={!card.best} />}
            <div className="reason-box">
              <h4>추천 이유</h4>
              <p>{card.reason}</p>
            </div>
            <button
              className="detail-open-button"
              type="button"
              onClick={() => {
                setSelectedTimetableIndex(card.backendIndex);
                setStep(6);
              }}
            >
              자세히 보기
            </button>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function CoursePreviewList({ courses }) {
  const visibleCourses = courses.slice(0, 5);

  if (!courses.length) {
    return <div className="course-preview empty">표시할 추천 과목이 없습니다.</div>;
  }

  return (
    <div className="course-preview">
      {visibleCourses.map((course, index) => (
        <div className="course-preview-row" key={`${course.course_name}-${index}`}>
          <strong>{course.course_name}</strong>
          <span>{course.credits ?? "-"}학점</span>
        </div>
      ))}
      {courses.length > visibleCourses.length && (
        <p>외 {courses.length - visibleCourses.length}개 과목</p>
      )}
    </div>
  );
}

function Detail({ setStep, recommendationResult, selectedTimetableIndex }) {
  const selectedTable = recommendationResult?.timetables?.[selectedTimetableIndex];
  const gap = recommendationResult?.gap;

  if (!selectedTable) {
    return (
      <PageShell step={6} title="추천 시간표 상세" subtitle="선택하신 추천 시간표의 상세 시간표를 확인하세요." centerTitle>
        <div className="error-box result-warning"><Icon type="info" />선택된 백엔드 추천 시간표가 없어 임시 상세 화면을 표시합니다.</div>
        <div className="two-column detail-layout">
          <section className="card detail-table-card">
            <div className="detail-head">
              <h3>선택 시간표 2 <span>전공집중형</span></h3>
              <div className="detail-score">
                <span><Icon type="cap" />총 17학점</span>
                <span><Icon type="stack" />점수 <strong>85.7</strong></span>
              </div>
            </div>
            <FullSchedule />
          </section>
          <GraduationSummary gap={gap} />
        </div>
        <PrimaryButton onClick={() => setStep(5)} wide>추천 목록으로 돌아가기</PrimaryButton>
      </PageShell>
    );
  }

  return (
    <PageShell step={6} title="추천 시간표 상세" subtitle="백엔드에서 받아온 추천 시간표 상세 정보입니다." centerTitle>
      <div className="two-column detail-layout">
        <section className="card detail-table-card">
          <div className="detail-head">
            <h3>{selectedTable.label || `시간표 ${selectedTimetableIndex + 1}`} <span>{selectedTable.reason_tags?.[0] || "추천형"}</span></h3>
            <div className="detail-score">
              <span><Icon type="cap" />총 {selectedTable.total_credits ?? "-"}학점</span>
              <span><Icon type="stack" />점수 <strong>{selectedTable.score ?? "-"}</strong></span>
            </div>
          </div>
          <BackendCourseTable courses={selectedTable.courses ?? []} />
        </section>
        <GraduationSummary gap={gap} />
      </div>
      <PrimaryButton onClick={() => setStep(5)} wide>추천 목록으로 돌아가기</PrimaryButton>
    </PageShell>
  );
}

function BackendCourseTable({ courses }) {
  if (!courses.length) {
    return <div className="backend-empty">백엔드에서 받은 과목 목록이 없습니다.</div>;
  }

  return (
    <div className="backend-course-table">
      <div className="backend-course-head">
        <span>과목명</span>
        <span>구분</span>
        <span>학점</span>
        <span>시간</span>
        <span>캠퍼스</span>
        <span>영역</span>
      </div>
      {courses.map((course, index) => (
        <div className="backend-course-row" key={`${course.course_name}-${index}`}>
          <strong>{course.course_name}</strong>
          <span>{course.category ?? "-"}</span>
          <span>{course.credits ?? "-"}</span>
          <span>{formatSchedule(course.schedule)}</span>
          <span>{course.campus ?? "-"}</span>
          <span>{course.area ?? "-"}{course.is_retake ? " · 재수강" : ""}</span>
        </div>
      ))}
    </div>
  );
}

function GraduationSummary({ gap }) {
  return (
    <aside className="card graduation-card">
      <h3>졸업 이수 현황</h3>
      <GradLine icon="book" label="공통교양" value={formatGapValue(gap?.common_ge)} />
      <GradLine icon="cap" label="핵심교양" value={formatGapValue(gap?.core_ge)} />
      <GradLine icon="star" label="진로소양" value={formatGapValue(gap?.career_ge)} />
      <GradLine icon="stack" label="핵심전공" value={formatGapValue(gap?.core_major)} />
      <GradLine icon="stack" label="심화전공" value={formatGapValue(gap?.advanced_major)} />
      <GradLine icon="clock" label="총 이수" value={formatGapValue(gap?.total)} highlight />
      <div className="notice"><Icon type="info" />위 값은 백엔드에서 반환한 gap 정보를 기준으로 표시됩니다.</div>
    </aside>
  );
}

function formatGapValue(value) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "object") {
    const current = value.current ?? value.done ?? value.completed ?? value.taken;
    const required = value.required ?? value.total ?? value.need;
    if (current !== undefined && required !== undefined) return `${current} / ${required}`;
    return JSON.stringify(value);
  }
  return String(value);
}

function formatSchedule(schedule) {
  if (!schedule) return "-";
  if (typeof schedule === "string") return schedule;
  if (Array.isArray(schedule)) {
    return schedule.map(formatSchedule).join(" / ");
  }
  if (typeof schedule === "object") {
    const day = schedule.day ?? "";
    const start = schedule.start_time ?? schedule.start ?? "";
    const end = schedule.end_time ?? schedule.end ?? "";
    const block = schedule.block ?? schedule.time_block ?? "";
    return [day, block || [start, end].filter(Boolean).join("-" )].filter(Boolean).join(" ") || JSON.stringify(schedule);
  }
  return String(schedule);
}

function FullSchedule() {
  return (
    <div className="full-schedule">
      <div className="corner" />
      {days.map((day) => <div className="day-title" key={day}>{day}</div>)}
      {times.map((time, r) => (
        <React.Fragment key={time}>
          <div className="time-title">{time}</div>
          {days.map((_, c) => {
            const block = scheduleBlocks.find((item) => item.day === c && item.time === r);
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

function GradLine({ icon, label, value, highlight }) {
  return (
    <div className={`grad-line ${highlight ? "highlight" : ""}`}>
      <span><Icon type={icon} />{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Progress({ label, value, strong }) {
  return (
    <div className={`progress-row ${strong ? "strong" : ""}`}>
      <span>{label}</span>
      <div className="progress-track"><i style={{ width: `${value}%` }} /></div>
      <em>{value}%</em>
    </div>
  );
}

function PageShell({ step, title, subtitle, children, center, centerTitle }) {
  return (
    <main className={`page-shell ${center ? "center" : ""}`}>
      <Stepper current={step} />
      {title && <div className={`page-title ${centerTitle ? "center-title" : ""}`}><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>}
      {children}
    </main>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [recommendationResult, setRecommendationResult] = useState(null);
  const [selectedTimetableIndex, setSelectedTimetableIndex] = useState(0);
  const [apiLogs, setApiLogs] = useState([]);
  const requestStartedRef = useRef(false);

  const [basicInfo, setBasicInfo] = useState({
    name: "",
    department: "",
    studentId: "",
    grade: "",
    semester: "",
    majorType: "minor",
    subMajorDepartment: "",
  });

  const [history, setHistory] = useState(courses);

  const [mandatoryGe, setMandatoryGe] = useState({
    bisato: { course_name: "비판적 사고와 토론", semester: "", day: "", start_time: "9:00", end_time: "11:00" },
    creative_writing: { course_name: "창조적 사고와 쓰기", semester: "", day: "", start_time: "9:00", end_time: "11:00" },
    career_exploration: { course_name: "전공별 진로탐색", semester: "", day: "", start_time: "9:00", end_time: "11:00" },
  });

  const [preferences, setPreferences] = useState({
    freeDays: ["금"],
    campus: "mixed",
    credits: "18학점",
    timePrefs: ["오전수업피하기", "수업사이공강확보"],
    retakePriority: true,
    composition: "balanced",
  });

  const normalizedHistory = history
    .filter((course) => course.year || course.semester || course.name || course.retake)
    .map((course) => ({
      year: course.year,
      semester: course.semester,
      course_name: course.name,
      is_retake: course.retake === "예",
    }));

  const appendApiLog = (message, data) => {
    const time = new Date().toLocaleTimeString();
    const safeData = data === undefined ? "" : ` ${JSON.stringify(data, null, 2)}`;
    console.log(`[recommend] ${message}`, data ?? "");
    setApiLogs((prev) => [...prev.slice(-5), { time, message: `${message}${safeData}` }]);
  };

  const handleRecommend = () => {
    requestStartedRef.current = false;
    setErrorMessage("");
    setRecommendationResult(null);
    setSelectedTimetableIndex(0);
    setApiLogs([]);
    appendApiLog("AI 분석 화면으로 이동. step=4에서 백엔드 요청을 시작합니다.");
    setStep(4);
  };

  useEffect(() => {
    if (step !== 4 || requestStartedRef.current) return;

    requestStartedRef.current = true;

    const requestRecommendation = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const requestPayloadForLog = {
          basicInfo,
          history: normalizedHistory,
          mandatoryGe,
          preferences,
        };

        appendApiLog("POST /recommend request", requestPayloadForLog);

        const result = await fetchRecommendation(
          basicInfo,
          normalizedHistory,
          mandatoryGe,
          preferences
        );

        appendApiLog("POST /recommend response", result);
        setRecommendationResult(result);
        setStep(5);
      } catch (error) {
        appendApiLog("POST /recommend failed", { message: error.message });
        console.error("[recommend] POST /recommend failed", error);
        setErrorMessage(error.message || "추천 요청 중 오류가 발생했습니다.");
        setStep(3);
      } finally {
        setLoading(false);
      }
    };

    requestRecommendation();
  }, [step, basicInfo, normalizedHistory, mandatoryGe, preferences]);

  const screen = useMemo(() => {
    if (step === 0) return <StartScreen setStep={setStep} />;
    if (step === 1) return <BasicInfo setStep={setStep} basicInfo={basicInfo} setBasicInfo={setBasicInfo} />;
    if (step === 2) return <AcademicHistory setStep={setStep} history={history} setHistory={setHistory} mandatoryGe={mandatoryGe} setMandatoryGe={setMandatoryGe} />;
    if (step === 3) return <Preferences setStep={setStep} preferences={preferences} setPreferences={setPreferences} onRecommend={handleRecommend} loading={loading} errorMessage={errorMessage} />;
    if (step === 4) return <Analysis loading={loading} apiLogs={apiLogs} />;
    if (step === 5) return <Result setStep={setStep} recommendationResult={recommendationResult} setSelectedTimetableIndex={setSelectedTimetableIndex} />;
    return <Detail setStep={setStep} recommendationResult={recommendationResult} selectedTimetableIndex={selectedTimetableIndex} />;
  }, [step, basicInfo, history, mandatoryGe, preferences, loading, errorMessage, recommendationResult, selectedTimetableIndex, apiLogs]);

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
.error-box { min-height: 46px; border-radius: 7px; background: #fff4f4; display: flex; align-items: center; gap: 10px; color: #d33838; font-weight: 800; padding: 12px 14px; margin-top: 14px; border: 1px solid #ffd3d3; }
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
.tab-row { display: grid; grid-template-columns: 230px 1fr; align-items: end; border-bottom: 2px solid #ececf2; margin-bottom: 22px; }
.tab-row button { height: 46px; border: 1.5px solid #dadde5; background: white; border-radius: 6px 6px 0 0; font-weight: 800; color: #636874; }
.tab-row button.active { color: var(--primary); border-color: transparent; border-bottom: 3px solid var(--primary); font-size: 18px; }
.first-year-panel { padding: 2px 0 0; }
.first-year-title-row { margin-bottom: 18px; }
.first-year-title-row h2 { display: inline-block; margin: 0 0 8px; padding: 6px 16px; border-radius: 8px; background: #f4efff; color: var(--primary); font-size: 26px; letter-spacing: -1px; }
.first-year-title-row p { margin: 0; color: #626874; font-size: 15px; font-weight: 800; }
.required-course-list { display: grid; gap: 16px; }
.required-course-card { background: #fff; border: 1.5px solid #e1dcf3; border-radius: 12px; padding: 20px 22px 24px; color: var(--text); box-shadow: 0 8px 20px rgba(89, 46, 234, 0.04); }
.required-course-card h3 { margin: 0 0 20px; display: flex; align-items: center; gap: 10px; font-size: 20px; color: #252832; }
.required-course-card h3 span { width: 30px; height: 30px; border-radius: 50%; background: var(--primary); color: #fff; display: grid; place-items: center; font-size: 26px; line-height: 1; box-shadow: 0 8px 18px rgba(89,46,234,.16); }
.required-course-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; }
.required-course-grid label { display: grid; gap: 9px; }
.required-course-grid em { color: #6c7280; font-style: normal; font-size: 13px; font-weight: 800; }
.required-course-grid select { height: 42px; border-color: #ccd0d8; background: #fff; color: #353741; border-radius: 5px; font-weight: 700; }
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
.day-grid button, .segment-row button { height: 60px; background: white; color: #252832; border: 1.5px solid #d8dce4; border-radius: 7px; font-weight: 800; font-size: 17px; position: relative; }
.day-grid button.selected, .segment-row button.selected { background: var(--primary); color: #fff; border-color: var(--primary); box-shadow: 0 12px 24px rgba(89,46,234,.16); }
.check-badge { position: absolute; right: -12px; top: -12px; width: 30px; height: 30px; border-radius: 50%; background: #6b3be0; color: white; display: grid; place-items: center; }
.full-select { height: 48px; }
.check-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.checkbox-label { display: flex; align-items: center; gap: 9px; font-weight: 800; color: #464b56; cursor: pointer; }
.checkbox-input { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }
.check-box { width: 24px; height: 24px; border: 2px solid #bfc4cd; border-radius: 4px; display: grid; place-items: center; color: white; }
.check-box.checked { background: var(--primary); border-color: var(--primary); }
.segment-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; }
.segment-row button.selected { background: #fff; color: var(--primary); border-color: var(--primary); box-shadow: 0 12px 24px rgba(89,46,234,.10); }
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
.api-log-panel { width: min(760px, 100%); margin: 24px auto 0; padding: 16px; border: 1.5px solid #ded6ff; border-radius: 10px; background: #fbf9ff; text-align: left; }
.api-log-panel h3 { margin: 0 0 10px; color: var(--primary); font-size: 16px; }
.api-log-panel p { margin: 0; color: #6c7280; font-size: 14px; }
.api-log-panel pre { max-height: 120px; overflow: auto; margin: 8px 0 0; padding: 10px; border-radius: 7px; background: #fff; color: #252832; border: 1px solid #ece8ff; font-size: 12px; white-space: pre-wrap; }
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
.course-preview { min-height: 170px; border: 1px solid #e3e5eb; border-radius: 7px; overflow: hidden; margin-bottom: 24px; background: #fbfaff; }
.course-preview.empty { display: grid; place-items: center; color: #777d88; font-weight: 800; }
.course-preview-row { min-height: 34px; display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; padding: 8px 12px; border-bottom: 1px solid #ececf4; }
.course-preview-row strong { color: #252832; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.course-preview-row span { color: var(--primary); font-weight: 900; font-size: 13px; }
.course-preview p { margin: 8px 12px; color: #6c7280; font-weight: 800; font-size: 13px; }
.detail-open-button { width: 100%; height: 46px; border: 0; border-radius: 7px; background: var(--primary); color: white; font-weight: 900; margin-top: 18px; }
.result-warning { width: min(720px, 100%); margin: 0 auto 24px; }
.backend-course-table { border: 1px solid #e1e4eb; border-radius: 8px; overflow: hidden; }
.backend-course-head, .backend-course-row { display: grid; grid-template-columns: minmax(170px, 1.4fr) minmax(90px, .8fr) 70px minmax(150px, 1.1fr) minmax(80px, .75fr) minmax(100px, .9fr); align-items: center; }
.backend-course-head { min-height: 48px; background: #f7f4ff; color: var(--primary); font-weight: 900; }
.backend-course-head span, .backend-course-row span, .backend-course-row strong { padding: 12px 14px; border-right: 1px solid #e8eaf0; }
.backend-course-row { min-height: 54px; border-top: 1px solid #e8eaf0; }
.backend-course-row strong { color: #252832; }
.backend-course-row span { color: #4e5561; font-weight: 700; }
.backend-empty { min-height: 180px; display: grid; place-items: center; border: 1px solid #e1e4eb; border-radius: 8px; color: #777d88; font-weight: 800; }
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
  .form-grid.two, .check-row, .segment-row, .day-grid, .credit-campus-grid, .required-course-grid { grid-template-columns: 1fr 1fr; }
  .result-grid { max-width: 560px; margin-inline: auto; }
  .orbit-main { width: 560px; height: 560px; }
}
@media (max-width: 640px) {
  .start-content h1 { font-size: 64px; }
  .start-button { width: 260px; height: 78px; font-size: 30px; }
  .page-shell { padding-inline: 16px; }
  .form-grid.two, .check-row, .segment-row, .day-grid, .course-head, .course-row, .credit-campus-grid, .required-course-grid { grid-template-columns: 1fr; }
  .course-head { display: none; }
  .detail-score, .detail-head { flex-direction: column; align-items: flex-start; }
  .full-schedule { overflow-x: auto; min-width: 760px; }
}

/* ===== 화면 깨짐 방지용 레이아웃 보정 ===== */
html, body, #root { width: 100%; min-width: 0; overflow-x: hidden; }
.app-root { width: 100%; overflow-x: hidden; }
.app-header { height: clamp(64px, 8vw, 84px); padding-inline: clamp(18px, 4vw, 48px); }
.page-shell { width: min(100%, 1240px); max-width: none; padding: clamp(22px, 3vw, 34px) clamp(18px, 3vw, 32px) 42px; }
.page-shell.center { width: min(100%, 1120px); max-width: none; }
.stepper { display: flex; align-items: flex-start; justify-content: center; gap: 0; width: 100%; max-width: 1040px; margin-bottom: clamp(28px, 4vw, 44px); overflow: visible; }
.step-item { width: clamp(82px, 9vw, 112px); flex: 0 0 auto; }
.step-label { font-size: clamp(12px, 1.2vw, 16px); white-space: normal; line-height: 1.25; word-break: keep-all; }
.step-line { min-width: 0; flex: 1 1 48px; max-width: 96px; }
.page-title h1 { font-size: clamp(26px, 3vw, 34px); }
.two-column, .academic-layout, .pref-layout, .detail-layout { grid-template-columns: minmax(0, 1.65fr) minmax(300px, .95fr); gap: clamp(18px, 2.3vw, 28px); }
.card { min-width: 0; }
.form-card, .academic-card, .pref-card, .summary-card, .guide-card, .graduation-card, .detail-table-card { padding: clamp(22px, 2.5vw, 32px); }
.result-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(18px, 2.3vw, 32px); }
.recommendation-card { min-width: 0; padding: clamp(22px, 2.3vw, 28px); }
.recommend-head h3 { font-size: clamp(22px, 2vw, 28px); }
.score-row { grid-template-columns: 1fr; }
.mini-table { grid-template-columns: 48px repeat(5, minmax(0, 1fr)); }
.full-schedule { width: 100%; min-width: 0; grid-template-columns: 62px repeat(5, minmax(0, 1fr)); }
.schedule-cell span { font-size: clamp(11px, 1vw, 14px); }
.course-head, .course-row { grid-template-columns: minmax(86px, .8fr) minmax(100px, .8fr) minmax(160px, 1.5fr) minmax(110px, .9fr) 42px; gap: clamp(10px, 1.4vw, 18px); }
.required-course-grid, .credit-campus-grid { gap: clamp(16px, 2vw, 34px); }
.day-grid, .segment-row, .check-row { gap: clamp(12px, 2vw, 26px); }
.day-grid button, .segment-row button { min-width: 0; }
.start-screen { min-height: calc(100dvh - clamp(64px, 8vw, 84px)); height: auto; }
.orbit-main { width: min(58vw, 640px); height: min(58vw, 640px); top: clamp(32px, 5vw, 48px); }
.start-content h1 { font-size: clamp(64px, 8vw, 94px); }
.start-subtitle { font-size: clamp(18px, 2.4vw, 25px); }
.start-button { width: min(340px, 70vw); height: clamp(76px, 9vw, 104px); font-size: clamp(30px, 4vw, 42px); }
@media (max-width: 1180px) {
  .stepper { justify-content: flex-start; overflow-x: auto; padding-bottom: 10px; }
  .step-line { flex-basis: 36px; }
  .two-column, .academic-layout, .pref-layout, .detail-layout { grid-template-columns: 1fr; }
  .summary-card, .guide-card, .graduation-card { max-width: none; }
  .result-grid { grid-template-columns: 1fr; max-width: 560px; margin-inline: auto; }
  .score-row { grid-template-columns: 1.2fr .85fr .85fr; }
}
@media (max-width: 760px) {
  .app-header { padding-inline: 16px; }
  .back-button { height: 34px; padding-inline: 12px; font-size: 13px; }
  .form-grid.two, .radio-grid, .required-course-grid, .credit-campus-grid, .check-row, .segment-row, .day-grid { grid-template-columns: 1fr; }
  .course-head { display: none; }
  .course-row { grid-template-columns: 1fr; padding: 14px; border: 1px solid #ececf0; border-radius: 8px; }
  .score-row { grid-template-columns: 1fr; }
  .detail-head, .detail-score { align-items: stretch; flex-direction: column; }
  .full-schedule-wrap { overflow-x: auto; }
  .full-schedule { min-width: 680px; }
  .backend-course-table { overflow-x: auto; }
  .backend-course-head, .backend-course-row { min-width: 760px; }
  .label-hint { margin-left: 0; display: inline-block; white-space: normal; }
}
`;
