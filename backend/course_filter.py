# 역할: 개설강좌 로드 → 하드 필터링 → recommender.py에 넘길 DataFrame 반환
#       + 시간/캠퍼스 충돌 감지 유틸 함수 제공
#
# [소프트/하드 필터 구분 원칙]
# 하드(여기서 제거): 이미 수강, 학과 무관 전공
# 소프트(점수로만): 공강 희망 요일, 캠퍼스 선호
#   → 공강이나 캠퍼스 때문에 주전공 이수 필수 과목을 제거하면 안 됨

from dataclasses import dataclass
import pandas as pd
from student import Student, get_dept_aliases
from data_loader import load_opened_courses

# ── 상수 ─────────────────────────────────────────────────────────────
COLLEGE_KEYWORDS    = ["지식서비스공과대학", "공과대학"]
BLOCK_MAP           = {"1-3": 1, "4-6": 2, "7-9": 3}

CAMPUS_PREF_SUJUNG  = "수캠위주"
CAMPUS_PREF_UNJUNG  = "운캠위주"
CAMPUS_PREF_ANY     = "혼재가능"


# ── 자료구조 ──────────────────────────────────────────────────────────
@dataclass
class TimeSlot:
    """단일 수업 슬롯 (요일 + 블럭 + 캠퍼스)"""
    day: str     # 월 / 화 / 수 / 목 / 금
    block: int   # 1(1-3교시) / 2(4-6교시) / 3(7-9교시)
    campus: str  # 수정 / 운정


# ── 파싱 유틸 ─────────────────────────────────────────────────────────
def parse_timeslots(시간표: str, campus: str) -> list[TimeSlot]:
    """
    "월/1-3"        → [TimeSlot("월", 1, campus)]
    "수/1-3,금/1-3" → [TimeSlot("수",1,...), TimeSlot("금",1,...)]
    빈값/이상값      → []
    """
    if not isinstance(시간표, str) or not 시간표.strip():
        return []
    slots = []
    for part in 시간표.split(","):
        part = part.strip()
        if "/" not in part:
            continue
        day, block_str = part.split("/", 1)
        block_num = BLOCK_MAP.get(block_str.strip())
        if block_num is None:
            continue
        slots.append(TimeSlot(day=day.strip(), block=block_num, campus=campus))
    return slots


# ── 충돌 감지 유틸 (recommender.py에서도 import해서 사용) ──────────────
def has_time_conflict(slots_a: list[TimeSlot], slots_b: list[TimeSlot]) -> bool:
    """같은 요일 + 같은 블럭이면 시간 충돌"""
    for a in slots_a:
        for b in slots_b:
            if a.day == b.day and a.block == b.block:
                return True
    return False


def has_campus_conflict(slots_a: list[TimeSlot], slots_b: list[TimeSlot]) -> bool:
    """
    연달아 붙은 블럭(차이 1)에서 캠퍼스가 다르면 충돌
    블럭 차이 2 이상(사이 공백)은 허용
    비사토/창사글 슬롯도 여기에 포함시켜서 체크해야 함
    """
    for a in slots_a:
        for b in slots_b:
            if a.day == b.day and abs(a.block - b.block) == 1:
                if a.campus != b.campus:
                    return True
    return False


def conflicts_with_any(
    candidate_slots: list[TimeSlot],
    fixed_slots_list: list[list[TimeSlot]]
) -> bool:
    """
    candidate 과목이 이미 확정된 과목들 중 하나라도 충돌하면 True
    recommender.py 조합 생성 시 사용
    """
    for fixed in fixed_slots_list:
        if has_time_conflict(candidate_slots, fixed):
            return True
        if has_campus_conflict(candidate_slots, fixed):
            return True
    return False


# ── 소프트 조건 점수 (recommender.py 점수화에 사용) ───────────────────
def get_off_day_penalty(slots: list[TimeSlot], off_days: list[str]) -> float:
    """
    공강 희망 요일에 수업이 있으면 페널티 반환
    - 희망 공강 요일 수업 없음 → 0.0 (감점 없음)
    - 희망 공강 요일 수업 있음 → 1.0 (감점용 — recommender에서 가중치 곱해서 사용)

    [소프트인 이유]
    공강 요일에 중요도 5 선이수 과목 또는 졸업필수 과목이 열릴 수 있음.
    이 경우 공강보다 수업 이수가 우선이므로 제거 대신 감점으로 처리.
    """
    off_set = set(off_days)
    return 1.0 if any(s.day in off_set for s in slots) else 0.0


def get_campus_pref_score(slots: list[TimeSlot], campus_pref: str) -> float:
    """
    캠퍼스 선호 점수 반환
    선호 캠퍼스 과목 → 1.0 / 비선호 → 0.0 / 혼재가능 → 모두 1.0

    [소프트인 이유]
    주전공 과목 캠퍼스는 학과가 결정. 사용자가 선호와 달라도 제거하면 안 됨.
    """
    if not slots:
        return 0.0
    if campus_pref == CAMPUS_PREF_ANY:
        return 1.0
    preferred = "수정" if campus_pref == CAMPUS_PREF_SUJUNG else "운정"
    return 1.0 if any(s.campus == preferred for s in slots) else 0.0


# ── 학과 관련성 판별 (내부용) ──────────────────────────────────────────
def _is_relevant_course(row: pd.Series, student: Student) -> bool:
    """
    교양류 → 항상 포함
    전공류 → 내 학과 / 공과대학 통합 / 부복수전공 학과 개설만 포함
    """
    이수구분 = str(row.get("이수구분", "")).strip()
    개설학과 = str(row.get("개설학과전공", "")).replace(" ", "")

    if 이수구분 in ["공통교양", "핵심교양", "진로소양"]:
        return True

    if 이수구분 in ["핵심전공", "심화전공"]:
        if any(kw.replace(" ", "") in 개설학과 for kw in COLLEGE_KEYWORDS):
            return True
        my_aliases = get_dept_aliases(student.dept)
        if any(
            alias.replace(" ", "") in 개설학과 or 개설학과 in alias.replace(" ", "")
            for alias in my_aliases
        ):
            return True
        if student.double_major_dept:
            double_aliases = get_dept_aliases(student.double_major_dept)
            if any(
                alias.replace(" ", "") in 개설학과 or 개설학과 in alias.replace(" ", "")
                for alias in double_aliases
            ):
                return True
        return False

    return False


# ── 메인 필터 함수 ────────────────────────────────────────────────────
def filter_courses(
    student: Student,
    target_year: int,
    target_semester: int,
    off_days: list[str] = None,
    campus_pref: str = CAMPUS_PREF_ANY,
) -> pd.DataFrame:
    """
    개설강좌 로드 → 하드 필터 → 소프트 점수 컬럼 추가 → DataFrame 반환

    Args:
        student         : Student 객체
        target_year     : 2026
        target_semester : 1 or 2
        off_days        : 희망 공강 요일 리스트. 예) ["월", "금"]
                          소프트 — 제거 안 하고 off_day_penalty 컬럼으로만 반영
        campus_pref     : "수캠위주" / "운캠위주" / "혼재가능"
                          소프트 — 제거 안 하고 campus_pref_score 컬럼으로만 반영

    Returns:
        필터링된 DataFrame. 추가 컬럼:
            parsed_slots      : list[TimeSlot]  충돌 감지용
            학점_num           : float           학점 합산용
            off_day_penalty   : float           공강 위반 여부 (0.0/1.0)
            campus_pref_score : float           캠퍼스 선호 일치 여부 (0.0/1.0)
    """
    if off_days is None:
        off_days = []

    # ① 전체 시트 로드 & 합치기
    sheets = load_opened_courses(target_year, target_semester)
    dfs = []
    for _, df in sheets.items():
        if df is None or df.empty:
            continue
        df = df.copy()
        df.columns = df.columns.str.strip()
        if "교과목명" not in df.columns:
            continue
        dfs.append(df)

    if not dfs:
        print("[경고] 개설강좌 데이터가 없습니다.")
        return pd.DataFrame()

    all_courses = pd.concat(dfs, ignore_index=True)

    # ② 이미 수강한 과목 제거 (하드)
    #    재수강 예정 과목은 get_effective_history()에서 이미 이전 이력이 제거됨
    #    → taken에 포함되지 않으므로 후보에 그대로 남음 (별도 처리 불필요)
    taken = {c.course_name.replace(" ", "") for c in student.get_effective_history()}
    all_courses = all_courses[
        ~all_courses["교과목명"].str.replace(" ", "", regex=False).isin(taken)
    ].copy()

    # 재수강 대상 과목 마킹 (recommender에서 "재수강 우선 추천" 옵션 시 점수 부스트에 사용)
    retake_set = {name.replace(" ", "") for name in (student.retake_courses or [])}
    all_courses["is_retake_target"] = all_courses["교과목명"].str.replace(
        " ", "", regex=False
    ).isin(retake_set)

    # ③ 학과 무관 전공 과목 제거 (하드)
    all_courses = all_courses[
        all_courses.apply(lambda row: _is_relevant_course(row, student), axis=1)
    ].copy()

    # ④ 시간표 파싱
    all_courses["parsed_slots"] = all_courses.apply(
        lambda row: parse_timeslots(
            str(row.get("시간표", "")),
            str(row.get("캠퍼스", ""))
        ),
        axis=1
    )

    # ⑤ 학점 숫자형 컬럼
    all_courses["학점_num"] = all_courses["학점"].apply(
        lambda x: float(str(x).split("/")[0]) if pd.notna(x) else 0.0
    )

    # ⑥ 소프트 조건 점수 컬럼 추가 (과목 제거 없음)
    all_courses["off_day_penalty"] = all_courses["parsed_slots"].apply(
        lambda slots: get_off_day_penalty(slots, off_days)
    )
    all_courses["campus_pref_score"] = all_courses["parsed_slots"].apply(
        lambda slots: get_campus_pref_score(slots, campus_pref)
    )

    return all_courses.reset_index(drop=True)


# ── 1학년 필수배정 슬롯 추출 ──────────────────────────────────────────
def get_mandatory_slots(student: Student,target_semester: int) -> list[TimeSlot]:
    """
    비사토·창사글 TimeSlot 반환 → recommender가 '확정된 자리'로 충돌 체크에 사용
    캠퍼스는 student.campus (주전공 학과 캠퍼스) 자동 적용
    전공별 진로탐색은 온라인이므로 슬롯 없음
    """
    slots = []
    campus = student.campus
    mge = student.mandatory_ge

    if (mge.bisato_semester == target_semester
            and mge.bisato_day and mge.bisato_block is not None):
        slots.append(TimeSlot(day=mge.bisato_day, block=mge.bisato_block, campus=campus))
 
    if (mge.changsagl_semester == target_semester
            and mge.changsagl_day and mge.changsagl_block is not None):
        slots.append(TimeSlot(day=mge.changsagl_day, block=mge.changsagl_block, campus=campus))

    return slots


# ── 동작 테스트 ───────────────────────────────────────────────────────
if __name__ == "__main__":
    from student import Student, MandatoryGE, CourseHistory
S
    student = Student(
        name="홍길동",
        dept="AI융합학부",
        student_id="20230001",
        grade=2,
        current_semester=1,
        track="전공심화",
        history=[
            CourseHistory(2023, 1, "파이썬프로그래밍"),
            CourseHistory(2023, 1, "자료구조"),
        ],
        mandatory_ge=MandatoryGE(
            bisato_semester=1, bisato_day="월", bisato_block=1,
            changsagl_semester=2, changsagl_day="수", changsagl_block=2,
        ),
    )

    filtered = filter_courses(
        student=student,
        target_year=2026,
        target_semester=1,
        off_days=["금"],
        campus_pref=CAMPUS_PREF_SUJUNG,
    )

    print(f"전체 후보 과목 수: {len(filtered)}")

    # 금요일 과목이 제거되지 않고 penalty로 표시되는지 확인
    friday = filtered[filtered["시간표"].str.contains("금", na=False)]
    print(f"\n금요일 과목 (제거 안 됨, penalty=1.0): {len(friday)}개")
    print(friday[["교과목명", "시간표", "off_day_penalty", "campus_pref_score"]].head(5).to_string())

    print("\n[필수배정 슬롯]")
    for s in get_mandatory_slots(student):
        print(f"  {s.day}요일 {s.block}블럭 ({s.campus}캠)")

    # 충돌 감지 함수 테스트
    slotA = [TimeSlot("월", 1, "수정")]
    slotB = [TimeSlot("월", 2, "운정")]  # 연달아 다른 캠퍼스 → 충돌
    slotC = [TimeSlot("월", 3, "운정")]  # 한 블럭 건너 → 허용
    print(f"\n캠퍼스 충돌 테스트 (월1수정 vs 월2운정): {has_campus_conflict(slotA, slotB)}")
    print(f"캠퍼스 충돌 테스트 (월1수정 vs 월3운정): {has_campus_conflict(slotA, slotC)}")