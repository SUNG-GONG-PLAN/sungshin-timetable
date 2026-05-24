// src/api.js
// 백엔드 API 호출 함수 모음

const BASE_URL = "http://127.0.0.1:5000";

/**
 * 시간표 추천 요청
 * @param {object} basicInfo    - BasicInfo 컴포넌트의 basicInfo state
 * @param {array}  history      - AcademicHistory의 수강이력 배열
 * @param {object} mandatoryGe  - 1학년 자동배정 과목 정보
 * @param {object} preferences  - Preferences 컴포넌트의 조건들
 * @returns {Promise<object>}   - { status, gap, timetables }
 */
export async function fetchRecommendation(basicInfo, history, mandatoryGe, preferences) {
  const payload = {
    // ── 기본 정보 (BasicInfo state 그대로) ──────────────────────────
    name:                basicInfo.name,
    department:          basicInfo.department,
    studentId:           basicInfo.studentId,
    grade:               basicInfo.grade,         // "2학년"
    semester:            basicInfo.semester,       // "2026년 1학기"
    majorType:           basicInfo.majorType,      // "minor" | "double" | "intensive"
    subMajorDepartment:  basicInfo.subMajorDepartment || null,

    // ── 수강 이력 ────────────────────────────────────────────────────
    // [{ year, semester, course_name, is_retake }, ...]
    history: history,

    // ── 1학년 자동배정 과목 ──────────────────────────────────────────
    // 2학년 이상은 bisato_day, bisato_block = null
    mandatory_ge: mandatoryGe,

    // ── 희망 조건 (Preferences state) ───────────────────────────────
    freeDays:            preferences.freeDays,     // ["월", "금"]
    campus:              preferences.campus,       // "su" | "un" | "mixed"
    credits:             preferences.credits,      // "18학점"
    time_prefs:          preferences.timePrefs,    // ["오전수업피하기", ...]
    retake_priority:     preferences.retakePriority,
  };

  const response = await fetch(`${BASE_URL}/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "서버 오류");
  }

  return await response.json();
  // 반환값 구조:
  // {
  //   status: "success",
  //   gap: { common_ge, core_ge, career_ge, core_major, advanced_major, total, ... },
  //   timetables: [
  //     { label, total_credits, score, reason_tags, ge_area_breakdown,
  //       courses: [{ course_name, category, credits, schedule, campus, area, is_retake }] },
  //     ...  // 3개
  //   ]
  // }
}

/** 서버 연결 확인용 */
export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.ok;
}