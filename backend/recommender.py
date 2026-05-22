# recommender.py
# 역할: 필터된 과목 후보를 점수화 → 시간 충돌 없는 시간표 3개 생성

import os
import pandas as pd
from dataclasses import dataclass, field

from student import Student
from gap_calculator import GraduationGap
from course_filter import (
    TimeSlot, conflicts_with_any,
    get_mandatory_slots,
    CAMPUS_PREF_ANY, CAMPUS_PREF_SUJUNG, CAMPUS_PREF_UNJUNG
)

# ── 상수: 점수 가중치 (합=100) ─────────────────────────────────────────
W_GAP       = 40   # 졸업 갭 채우는 과목
W_ROADMAP   = 25   # 로드맵 학년 부합도
W_PREREQ    = 20   # 선이수 중요도 반영
W_OFFDAY    = 10   # 공강 희망 미위반
W_CAMPUS    =  5   # 캠퍼스 선호 일치

RETAKE_BONUS = 50  # 재수강 우선 추천 시 보너스 점수

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "..", "데이터")

# ── 결과 자료구조 ─────────────────────────────────────────────────────
@dataclass
class Timetable:
    """시간표 하나"""
    courses: list[dict]          # 각 과목 정보 (DataFrame 행을 dict로)
    total_credits: float         # 총 학점
    score: float                 # 종합 점수
    label: str = ""              # 시간표 구분 레이블 (ex. "균형형", "전공집중형", "공강최적형")
    reason_tags: list[str] = field(default_factory=list)  # 추천 이유 태그


# ── 데이터 로더 ───────────────────────────────────────────────────────
def _load_roadmap(dept: str) -> dict[str, str]:
    """
    로드맵에서 학과 시트 로드
    반환: {과목명(공백제거): 영역번호(int)}  ex) {"자료구조": 2}
    """
    path = os.path.join(DATA_DIR, "roadmap.xlsx")
    try:
        df = pd.read_excel(path, sheet_name=dept)
    except Exception:
        return {}

    result = {}
    for _, row in df.iterrows():
        name = str(row.get("과목", "")).replace(" ", "")
        area = str(row.get("영역", ""))
        try:
            area_num = int(area.replace("영역", "").strip())
        except ValueError:
            continue
        result[name] = area_num
    return result


def _load_prereqs(dept: str) -> dict[str, list[tuple[str, int]]]:
    """
    선이수 데이터 로드
    반환: {후이수과목(공백제거): [(선이수과목(공백제거), 중요도), ...]}
    """
    path = os.path.join(DATA_DIR, "pre_requisite.xlsx")
    try:
        df = pd.read_excel(path, sheet_name=dept)
    except Exception:
        return {}

    # 컬럼명에 줄바꿈 포함 → 정리
    df.columns = [c.split("\n")[0].strip() for c in df.columns]
    # 정리 후 컬럼명: 학과 / 주전공 / 선이수과목 / 후이수과목 / 중요도 / 비고

    result: dict[str, list] = {}
    for _, row in df.iterrows():
        pre  = str(row.get("선이수과목", "")).replace(" ", "")
        post = str(row.get("후이수과목", "")).replace(" ", "")
        try:
            importance = int(row.get("중요도", 1))
        except (ValueError, TypeError):
            importance = 1
        if pre and post:
            result.setdefault(post, []).append((pre, importance))
    return result


# ── 과목별 점수 계산 ──────────────────────────────────────────────────
def _score_course(
    row: pd.Series,
    student: Student,
    gap: GraduationGap,
    roadmap: dict[str, int],
    prereqs: dict[str, list[tuple[str, int]]],
    retake_priority: bool,
) -> float:
    """
    과목 하나의 점수를 0~100 범위로 계산
    소프트 조건(공강/캠퍼스)은 이미 DataFrame 컬럼에 있으므로 여기선 전공/교양/로드맵/선이수만 계산
    """
    score = 0.0
    이수구분 = str(row.get("이수구분", "")).strip()
    name_clean = str(row.get("교과목명", "")).replace(" ", "")

    # ── 졸업 갭 점수 (W_GAP = 40) ─────────────────────────────────
    gap_score = 0.0
    if 이수구분 == "핵심전공" and gap.core_major_gap > 0:
        gap_score = 1.0
    elif 이수구분 == "심화전공" and gap.advanced_major_gap > 0:
        gap_score = 1.0
    elif 이수구분 == "공통교양" and gap.common_ge_gap > 0:
        gap_score = 0.9
    elif 이수구분 == "핵심교양":
        if gap.core_ge_gap > 0:
            gap_score = 0.9
            # 아직 이수 안 한 영역이면 추가 가점
            area = str(row.get("영역", "")).strip()
            if area and area not in gap.core_ge_areas_earned:
                gap_score = 1.0
    elif 이수구분 == "진로소양" and gap.career_ge_gap > 0:
        gap_score = 0.8
    # 미이수 필수교양 가점
    if name_clean in [c.replace(" ", "") for c in gap.missing_mandatory]:
        gap_score = 1.0

    score += gap_score * W_GAP

    # ── 로드맵 학년 부합도 점수 (W_ROADMAP = 25) ───────────────────
    roadmap_area = roadmap.get(name_clean)
    if roadmap_area is not None:
        diff = abs(student.grade - roadmap_area)
        # 학년 일치: 1.0 / 1차이: 0.7 / 2차이: 0.4 / 3차이: 0.1
        roadmap_score = max(0.0, 1.0 - diff * 0.3)
    else:
        roadmap_score = 0.3  # 로드맵에 없는 과목 기본값
    score += roadmap_score * W_ROADMAP

    # ── 선이수 반영 점수 (W_PREREQ = 20) ──────────────────────────
    taken = {c.course_name.replace(" ", "") for c in student.get_effective_history()}
    prereq_list = prereqs.get(name_clean, [])
    prereq_score = 0.0
    if prereq_list:
        total_importance = sum(imp for _, imp in prereq_list)
        satisfied = sum(imp for pre, imp in prereq_list if pre in taken)
        prereq_score = satisfied / total_importance if total_importance > 0 else 0.0
    else:
        prereq_score = 1.0  # 선이수 없는 과목은 감점 없음
    score += prereq_score * W_PREREQ

    # ── 재수강 보너스 ──────────────────────────────────────────────
    if retake_priority and row.get("is_retake_target", False):
        score += RETAKE_BONUS

    return score


def _apply_soft_scores(df: pd.DataFrame) -> pd.DataFrame:
    """
    course_filter가 미리 계산해 둔 soft 점수 컬럼을 종합 점수에 반영
    off_day_penalty: 공강 위반 → 감점
    campus_pref_score: 캠퍼스 선호 → 가점
    """
    df = df.copy()
    # 공강 위반 감점: penalty=1.0이면 W_OFFDAY 만큼 감점
    df["score"] = (
        df["base_score"]
        - df["off_day_penalty"] * W_OFFDAY
        + df["campus_pref_score"] * W_CAMPUS
    )
    return df


# ── 그리디 시간표 생성 ─────────────────────────────────────────────────
def _build_timetable(
    scored_df: pd.DataFrame,
    mandatory_slots: list[TimeSlot],
    desired_credits: float,
    desired_major_credits: float,
    desired_double_credits: float,
    exclude_names: set[str] = None,
) -> list[dict]:
    """
    점수 내림차순으로 과목을 탐욕적으로 선택해 시간표 1개 생성

    Args:
        scored_df           : 점수 계산된 후보 DataFrame (score 컬럼 포함)
        mandatory_slots     : 비사토·창사글 확정 슬롯 (충돌 체크용)
        desired_credits     : 희망 총 학점
        desired_major_credits   : 희망 주전공 학점
        desired_double_credits  : 희망 부/복수전공 학점
        exclude_names       : 이 시간표에서 제외할 과목명 집합 (다양성 확보용)

    Returns:
        선택된 과목 dict 리스트
    """
    if exclude_names is None:
        exclude_names = set()

    # 점수 내림차순 정렬
    candidates = scored_df.sort_values("score", ascending=False).copy()

    selected: list[dict] = []
    selected_slots: list[list[TimeSlot]] = [mandatory_slots]  # 비사토·창사글 먼저 확정
    selected_names: set[str] = set()   # 이미 선택된 과목명 (분반 중복 방지)
    total_credits = 0.0
    major_credits = 0.0
    double_credits = 0.0

    for _, row in candidates.iterrows():
        name = str(row.get("교과목명", ""))
        name_clean = name.replace(" ", "")

        # 제외 목록 or 이미 선택된 과목(다른 분반 포함) → 스킵
        if name_clean in exclude_names:
            continue
        if name_clean in selected_names:   # 분반 중복 제거
            continue

        credit = float(row.get("학점_num", 0))
        if total_credits + credit > desired_credits:
            continue  # 희망 학점 초과 → 건너뜀

        slots: list[TimeSlot] = row.get("parsed_slots", [])
        if not slots:
            continue  # 시간표 없는 과목 제외

        # 시간/캠퍼스 충돌 체크
        if conflicts_with_any(slots, selected_slots):
            continue

        # 전공 학점 한도 체크
        이수구분 = str(row.get("이수구분", ""))
        if 이수구분 in ["핵심전공", "심화전공"]:
            if not row.get("is_retake_target", False):  # 재수강은 예외
                if major_credits + credit > desired_major_credits:
                    continue
        if 이수구분 in ["핵심전공", "심화전공"] and row.get("is_retake_target", False):
            pass  # 재수강은 학점 한도 무시하고 우선 포함

        # 선택 확정
        selected.append(row.to_dict())
        selected_slots.append(slots)
        selected_names.add(name_clean)   # 분반 중복 방지용 이름 등록
        total_credits += credit
        if 이수구분 in ["핵심전공", "심화전공"]:
            major_credits += credit

    return selected


# ── 메인 추천 함수 ────────────────────────────────────────────────────
def recommend(
    student: Student,
    gap: GraduationGap,
    filtered_df: pd.DataFrame,
    target_semester: int,
    desired_credits: float = 18,
    desired_major_credits: float = 9,
    desired_double_credits: float = 0,
    off_days: list[str] = None,
    campus_pref: str = CAMPUS_PREF_ANY,
    retake_priority: bool = True,
) -> list[Timetable]:
    """
    시간표 3개 추천

    Args:
        student               : Student 객체
        gap                   : 졸업 갭 계산 결과
        filtered_df           : course_filter.filter_courses() 결과
        target_semester       : 1 or 2
        desired_credits       : 희망 총 학점 (최대 19)
        desired_major_credits : 희망 주전공 학점
        desired_double_credits: 희망 부/복수전공 학점
        off_days              : 희망 공강 요일 리스트
        campus_pref           : 캠퍼스 선호
        retake_priority       : 재수강 과목 우선 추천 여부

    Returns:
        Timetable 3개 리스트
        [0] 균형형   — 종합 점수 최적
        [1] 전공집중형 — 전공 학점 비율 높게
        [2] 공강최적형 — 공강 조건 최대한 준수
    """
    if off_days is None:
        off_days = []

    # 데이터 로드
    roadmap = _load_roadmap(student.dept)
    prereqs = _load_prereqs(student.dept)
    mandatory_slots = get_mandatory_slots(student, target_semester)

    # ── 과목별 기본 점수 계산 ──────────────────────────────────────
    df = filtered_df.copy()
    df["base_score"] = df.apply(
        lambda row: _score_course(row, student, gap, roadmap, prereqs, retake_priority),
        axis=1
    )

    # ── 소프트 조건 반영 → 최종 점수 ──────────────────────────────
    df = _apply_soft_scores(df)

    # ── 시간표 1: 균형형 (기본 최적) ──────────────────────────────
    courses1 = _build_timetable(
        df, mandatory_slots,
        desired_credits, desired_major_credits, desired_double_credits
    )
    tt1 = _make_timetable(courses1, "균형형", mandatory_slots, gap)

    # ── 시간표 2: 전공집중형 (전공 학점 한도 완화) ──────────────────
    # 전공 점수 가중치 올리고, 교양 점수 낮춰서 다른 구성 유도
    df2 = df.copy()
    df2.loc[df2["이수구분"].isin(["핵심전공", "심화전공"]), "score"] += 15
    df2.loc[df2["이수구분"].isin(["공통교양", "핵심교양", "진로소양"]), "score"] -= 10

    courses2 = _build_timetable(
        df2, mandatory_slots,
        desired_credits,
        min(desired_credits * 0.8, desired_major_credits + 3),  # 전공 한도 살짝 늘림
        desired_double_credits
    )
    tt2 = _make_timetable(courses2, "전공집중형", mandatory_slots, gap)

    # ── 시간표 3: 공강최적형 (off_day_penalty 최소화) ──────────────
    # 공강 위반 과목에 강한 감점을 줘서 공강을 최대한 지키는 구성
    df3 = df.copy()
    df3["score"] = df3["score"] - df3["off_day_penalty"] * 20  # 기존보다 2배 감점

    courses3 = _build_timetable(
        df3, mandatory_slots,
        desired_credits, desired_major_credits, desired_double_credits
    )
    tt3 = _make_timetable(courses3, "공강최적형", mandatory_slots, gap)

    return [tt1, tt2, tt3]


def _make_timetable(
    courses: list[dict],
    label: str,
    mandatory_slots: list[TimeSlot],
    gap: GraduationGap,
) -> Timetable:
    """선택된 과목 리스트로 Timetable 객체 생성 + 추천 이유 태그 생성"""
    total_credits = sum(c.get("학점_num", 0) for c in courses)
    avg_score = sum(c.get("score", 0) for c in courses) / len(courses) if courses else 0

    # 규칙 기반 추천 이유 태그
    tags = _generate_reason_tags(courses, gap, mandatory_slots)

    return Timetable(
        courses=courses,
        total_credits=total_credits,
        score=avg_score,
        label=label,
        reason_tags=tags,
    )


def _generate_reason_tags(
    courses: list[dict],
    gap: GraduationGap,
    mandatory_slots: list[TimeSlot],
) -> list[str]:
    """
    규칙 기반 추천 이유 태그 생성
    LLM 대신 템플릿 방식 사용 (비용·속도 문제)
    """
    tags = []
    이수구분_list = [c.get("이수구분", "") for c in courses]
    major_count = sum(1 for t in 이수구분_list if t in ["핵심전공", "심화전공"])
    ge_count = len(이수구분_list) - major_count
    retake_count = sum(1 for c in courses if c.get("is_retake_target", False))
    off_penalty_count = sum(1 for c in courses if c.get("off_day_penalty", 0) > 0)
    total_credits = sum(c.get("학점_num", 0) for c in courses)

    if gap.core_major_gap > 0 and major_count > 0:
        tags.append(f"핵심전공 {major_count}과목 포함 — 졸업 필수 학점 충족에 도움")
    if gap.missing_mandatory:
        missing_included = [
            c.get("교과목명") for c in courses
            if c.get("교과목명", "").replace(" ", "") in
            [m.replace(" ", "") for m in gap.missing_mandatory]
        ]
        if missing_included:
            tags.append(f"미이수 필수교양 포함: {', '.join(missing_included)}")
    if retake_count > 0:
        tags.append(f"재수강 과목 {retake_count}개 포함")
    if off_penalty_count == 0:
        tags.append("희망 공강 요일 100% 준수")
    elif off_penalty_count <= 1:
        tags.append(f"희망 공강 요일 거의 준수 (위반 {off_penalty_count}과목)")
    else:
        tags.append(f"공강 요일 위반 {off_penalty_count}과목 — 졸업 필수 과목 우선 반영")
    if mandatory_slots:
        tags.append(f"비사토·창사글 시간({mandatory_slots[0].day}요일) 충돌 없이 구성")
    tags.append(f"총 {total_credits:.0f}학점")

    return tags


# ── 동작 테스트 ───────────────────────────────────────────────────────
if __name__ == "__main__":
    from student import Student, MandatoryGE, CourseHistory
    from gap_calculator import calculate_gap
    from course_filter import filter_courses

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
            CourseHistory(2023, 2, "이산수학"),
        ],
        mandatory_ge=MandatoryGE(
            bisato_semester=1, bisato_day="월", bisato_block=1,
            changsagl_semester=2, changsagl_day="수", changsagl_block=2,
        ),
    )

    gap = calculate_gap(student)
    filtered = filter_courses(
        student, 2026, 1,
        off_days=["금"],
        campus_pref="수캠위주",
    )

    timetables = recommend(
        student=student,
        gap=gap,
        filtered_df=filtered,
        target_semester=1,
        desired_credits=18,
        desired_major_credits=9,
        off_days=["금"],
        campus_pref="수캠위주",
        retake_priority=False,
    )

    for i, tt in enumerate(timetables):
        print(f"\n{'='*50}")
        print(f"[시간표 {i+1}] {tt.label}  |  총 {tt.total_credits:.0f}학점  |  점수 {tt.score:.1f}")
        print(f"추천 이유: {' / '.join(tt.reason_tags)}")
        print("-" * 50)
        for c in tt.courses:
            print(f"  {c.get('교과목명',''):<20} {c.get('이수구분',''):<8} "
                  f"{c.get('학점_num',0):.0f}학점  {c.get('시간표','')}")