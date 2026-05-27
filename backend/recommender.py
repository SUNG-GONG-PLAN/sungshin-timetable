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
# 수업시간 선호 상수
TIME_PREF_NO_MORNING  = "오전수업피하기"   # 1블럭(1-3교시) 과목 감점
TIME_PREF_NO_FULLDAY  = "풀강피하기"       # 하루 3블럭 연속 감점
TIME_PREF_COMPACT     = "몰아듣기선호"     # 같은 날 과목 몰리면 가점
TIME_PREF_GAP         = "수업사이공백확보"  # 블럭 사이 공백 있으면 가점

@dataclass
class Timetable:
    """시간표 하나"""
    courses: list[dict]                    # 각 과목 정보 (DataFrame 행을 dict로)
    total_credits: float                   # 총 학점
    score: float                           # 종합 점수
    label: str = ""                        # 시간표 구분 레이블
    reason_tags: list[str] = field(default_factory=list)   # 추천 이유 태그
    ge_area_breakdown: dict = field(default_factory=dict)  # 핵심교양 영역별 학점
    # ex) {"인식과가치": {"기존": 3, "추가": 3}, "공학과기술": {"기존": 0, "추가": 3}}


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
        # 로드맵에 없는 과목: 전공이면 0.5로 올려서 교양에 밀리지 않도록
        roadmap_score = 0.5 if 이수구분 in ["핵심전공", "심화전공"] else 0.3
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

    # ── 학년 부적합 심화전공 강력 감점 ────────────────────────────
    # 1~2학년에게 심화전공은 사실상 추천 불가
    # 로드맵 영역과 학년 차이가 2 이상이면 강한 페널티
    if 이수구분 == "심화전공":
        if student.grade <= 2:
            score -= 40  # 1~2학년에겐 사실상 추천 안 되도록
        elif roadmap_area is not None and (roadmap_area - student.grade) >= 2:
            score -= 20  # 학년보다 2단계 이상 앞선 심화전공도 감점

    # ── 재수강 보너스 ──────────────────────────────────────────────
    if retake_priority and row.get("is_retake_target", False):
        score += RETAKE_BONUS

    return score


def _get_time_pref_score(slots: list[TimeSlot], time_prefs: list[str]) -> float:
    """
    수업시간 선호 점수 (과목 단위 계산 가능한 것만 여기서 처리)
    오전수업피하기: 1블럭 과목이면 감점 -8
    나머지(풀강피하기/몰아듣기/공백확보)는 조합 단위라서 _score_timetable_time_pref()에서 처리
    """
    score = 0.0
    if TIME_PREF_NO_MORNING in time_prefs:
        if any(s.block == 1 for s in slots):
            score -= 8.0
    return score


def _score_timetable_time_pref(
    selected: list[dict],
    time_prefs: list[str],
) -> float:
    """
    시간표 전체 조합 단위 수업시간 선호 점수
    풀강피하기 / 몰아듣기선호 / 수업사이공백확보
    """
    if not time_prefs or not selected:
        return 0.0

    # 요일별 블럭 집합 구성
    day_blocks: dict[str, set] = {}
    for course in selected:
        for slot in course.get("parsed_slots", []):
            day_blocks.setdefault(slot.day, set()).add(slot.block)

    score = 0.0
    for day, blocks in day_blocks.items():
        n = len(blocks)
        sorted_blocks = sorted(blocks)

        # 풀강 피하기: 하루에 3블럭 모두 차면 감점
        if TIME_PREF_NO_FULLDAY in time_prefs:
            if blocks == {1, 2, 3}:
                score -= 15.0

        # 몰아듣기 선호: 연속 블럭이면 가점
        if TIME_PREF_COMPACT in time_prefs:
            consecutive = sum(
                1 for i in range(len(sorted_blocks) - 1)
                if sorted_blocks[i+1] - sorted_blocks[i] == 1
            )
            score += consecutive * 5.0

        # 수업 사이 공백 확보: 연속하지 않는 블럭이 있으면 가점
        if TIME_PREF_GAP in time_prefs:
            gaps = sum(
                1 for i in range(len(sorted_blocks) - 1)
                if sorted_blocks[i+1] - sorted_blocks[i] > 1
            )
            score += gaps * 5.0

    return score


def _apply_soft_scores(df: pd.DataFrame) -> pd.DataFrame:
    """
    course_filter가 미리 계산해 둔 soft 점수 컬럼을 종합 점수에 반영
    off_day_penalty : 공강 위반 → 감점
    campus_pref_score: 캠퍼스 선호 → 가점
    time_pref_score : 수업시간 선호 → 가/감점
    """
    df = df.copy()
    df["score"] = (
        df["base_score"]
        - df["off_day_penalty"] * W_OFFDAY
        + df["campus_pref_score"] * W_CAMPUS
        + df.get("time_pref_score", 0)
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
    student_grade: int = 4,
) -> list[dict]:
    if exclude_names is None:
        exclude_names = set()

    candidates = scored_df.sort_values("score", ascending=False).copy()

    selected: list[dict] = []
    selected_slots: list[list[TimeSlot]] = [mandatory_slots]
    selected_names: set[str] = set()
    total_credits = 0.0
    major_credits = 0.0

    def try_add(row):
        nonlocal total_credits, major_credits
        name = str(row.get("교과목명", ""))
        name_clean = name.replace(" ", "")
        if name_clean in exclude_names or name_clean in selected_names:
            return False
        credit = float(row.get("학점_num", 0))
        if total_credits + credit > desired_credits:
            return False
        slots: list[TimeSlot] = row.get("parsed_slots", [])
        if not slots:
            return False
        if conflicts_with_any(slots, selected_slots):
            return False
        이수구분 = str(row.get("이수구분", ""))
        if 이수구분 in ["핵심전공", "심화전공"]:
            if not row.get("is_retake_target", False):
                if major_credits + credit > desired_major_credits:
                    return False
        selected.append(row.to_dict())
        selected_slots.append(slots)
        selected_names.add(name_clean)
        total_credits += credit
        if 이수구분 in ["핵심전공", "심화전공"]:
            major_credits += credit
        return True

    # ── 1패스: 전공 먼저 채우기 (desired_major_credits 목표) ──────
    for _, row in candidates.iterrows():
        if major_credits >= desired_major_credits:
            break
        이수구분 = str(row.get("이수구분", ""))
        if 이수구분 not in ["핵심전공", "심화전공"]:
            continue
        # 1~2학년엔 심화전공 1패스에서 완전 제외
        if 이수구분 == "심화전공" and student_grade <= 2:
            continue
        try_add(row)
    # ── 2패스: 나머지 학점 교양으로 채우기 ────────────────────────
    for _, row in candidates.iterrows():
        if total_credits >= desired_credits:
            break
        if str(row.get("이수구분", "")) not in ["핵심전공", "심화전공"]:
            try_add(row)

    # ── 3패스: 학점이 남으면 전공 추가 ───────────────────────────
    for _, row in candidates.iterrows():
        if total_credits >= desired_credits:
            break
        if str(row.get("이수구분", "")) in ["핵심전공", "심화전공"]:
            try_add(row)

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
    time_prefs: list[str] = None,
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
        time_prefs            : 수업시간 선호 리스트
                                ex) ["오전수업피하기", "수업사이공백확보"]

    Returns:
        Timetable 3개 리스트
        [0] 균형형   — 종합 점수 최적
        [1] 전공집중형 — 전공 학점 비율 높게
        [2] 공강최적형 — 공강 조건 최대한 준수
    """
    if off_days is None:
        off_days = []
    if time_prefs is None:
        time_prefs = []

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

    # ── 수업시간 선호 점수 컬럼 추가 ──────────────────────────────
    df["time_pref_score"] = df["parsed_slots"].apply(
        lambda slots: _get_time_pref_score(slots, time_prefs)
    )

    # ── 소프트 조건 반영 → 최종 점수 ──────────────────────────────
    df = _apply_soft_scores(df)

    # ── 시간표 1: 균형형 (기본 최적) ──────────────────────────────
    courses1 = _build_timetable(
        df, mandatory_slots,
        desired_credits, desired_major_credits, desired_double_credits,
        student_grade=student.grade,
    )
    tt1 = _make_timetable(courses1, "균형형", mandatory_slots, gap, time_prefs)
    # tt1 과목 중 교양 최하위 2개 추출 → tt2에서 제외해 다른 구성 유도
    ge_in_tt1 = sorted(
        [c for c in courses1 if c.get("이수구분") not in ["핵심전공", "심화전공"]],
        key=lambda c: c.get("score", 0)
    )
    exclude2 = {c.get("교과목명", "").replace(" ", "") for c in ge_in_tt1[:2]}

    # tt1 과목 중 전공 최하위 1개 추출 → tt3에서 제외해 다른 구성 유도
    major_in_tt1 = sorted(
        [c for c in courses1 if c.get("이수구분") in ["핵심전공", "심화전공"]],
        key=lambda c: c.get("score", 0)
    )
    exclude3 = {c.get("교과목명", "").replace(" ", "") for c in major_in_tt1[:1]}

    # ── 시간표 2: 전공집중형 (전공 학점 한도 완화) ──────────────────
    # 전공 점수 가중치 올리고, 교양 점수 낮춰서 다른 구성 유도
    df2 = df.copy()
    df2.loc[df2["이수구분"].isin(["핵심전공", "심화전공"]), "score"] += 15
    df2.loc[df2["이수구분"].isin(["공통교양", "핵심교양", "진로소양"]), "score"] -= 10

    courses2 = _build_timetable(
        df2, mandatory_slots,
        desired_credits,
        min(desired_credits * 0.8, desired_major_credits + 3),  # 전공 한도 살짝 늘림
        desired_double_credits,
        exclude_names=exclude2,
        student_grade=student.grade,
    )
    tt2 = _make_timetable(courses2, "전공집중형", mandatory_slots, gap, time_prefs)

    # ── 시간표 3: 공강최적형 (off_day_penalty 최소화) ──────────────
    # 공강 위반 과목에 강한 감점을 줘서 공강을 최대한 지키는 구성
    df3 = df.copy()
    df3["score"] = df3["score"] - df3["off_day_penalty"] * 20  # 기존보다 2배 감점

    courses3 = _build_timetable(
        df3, mandatory_slots,
        desired_credits, desired_major_credits, desired_double_credits,
        exclude_names=exclude3,
        student_grade=student.grade,
    )
    tt3 = _make_timetable(courses3, "공강최적형", mandatory_slots, gap, time_prefs)

    return [tt1, tt2, tt3]


def _make_timetable(
    courses: list[dict],
    label: str,
    mandatory_slots: list[TimeSlot],
    gap: GraduationGap,
    time_prefs: list[str] = None,
) -> Timetable:
    """선택된 과목 리스트로 Timetable 객체 생성 + 추천 이유 태그 생성"""
    if time_prefs is None:
        time_prefs = []

    total_credits = sum(c.get("학점_num", 0) for c in courses)
    # 조합 단위 time_pref 점수 반영
    timetable_time_bonus = _score_timetable_time_pref(courses, time_prefs)
    avg_score = (
        sum(c.get("score", 0) for c in courses) / len(courses) + timetable_time_bonus
        if courses else 0
    )

    # 규칙 기반 추천 이유 태그
    tags = _generate_reason_tags(courses, gap, mandatory_slots, time_prefs)

    # 핵심교양 영역 breakdown 계산
    ge_breakdown = _calc_ge_area_breakdown(courses, gap)

    return Timetable(
        courses=courses,
        total_credits=total_credits,
        score=round(avg_score, 1),
        label=label,
        reason_tags=tags,
        ge_area_breakdown=ge_breakdown,
    )


def _calc_ge_area_breakdown(
    courses: list[dict],
    gap: GraduationGap,
) -> dict:
    """
    핵심교양 영역별 학점 breakdown 계산
    반환: {"인식과가치": {"기존": 3, "추가": 3}, ...}
    프론트에서 핵심교양 클릭 시 영역별 상세 표시에 사용
    """
    CORE_GE_AREAS = ["인식과가치", "문학과예술", "역사의해석", "사회의이해", "자연의설명", "공학과기술"]
    result = {}

    # 기존 이수 영역 (gap에 저장된 정보)
    for area in CORE_GE_AREAS:
        result[area] = {"기존": 3 if area in gap.core_ge_areas_earned else 0, "추가": 0}

    # 이번 시간표에서 추가되는 영역
    for course in courses:
        if str(course.get("이수구분", "")) == "핵심교양":
            area = str(course.get("영역", "")).strip()
            if area in result:
                result[area]["추가"] += int(course.get("학점_num", 0))

    # 값이 0/0인 영역은 제외 (프론트 표시 간결하게)
    return {k: v for k, v in result.items() if v["기존"] > 0 or v["추가"] > 0}


def _generate_reason_tags(
    courses: list[dict],
    gap: GraduationGap,
    mandatory_slots: list[TimeSlot],
    time_prefs: list[str] = None,
) -> list[str]:
    """
    규칙 기반 추천 이유 태그 생성
    LLM 대신 템플릿 방식 사용 (비용·속도 문제)
    """
    tags = []
    이수구분_list = [c.get("이수구분", "") for c in courses]
    core_count     = sum(1 for t in 이수구분_list if t == "핵심전공")
    advanced_count = sum(1 for t in 이수구분_list if t == "심화전공")
    major_count    = core_count + advanced_count
    ge_count = len(이수구분_list) - major_count
    retake_count = sum(1 for c in courses if c.get("is_retake_target", False))
    off_penalty_count = sum(1 for c in courses if c.get("off_day_penalty", 0) > 0)
    total_credits = sum(c.get("학점_num", 0) for c in courses)

    if major_count > 0:
        parts = []
        if core_count > 0:
            parts.append(f"핵심전공 {core_count}과목")
        if advanced_count > 0:
            parts.append(f"심화전공 {advanced_count}과목")
        suffix = " — 졸업 필수 학점 충족에 도움" if gap.core_major_gap > 0 or gap.advanced_major_gap > 0 else ""
        tags.append(f"{' / '.join(parts)} 포함{suffix}")
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

    # 수업시간 선호 반영 태그
    if time_prefs:
        day_blocks: dict[str, list] = {}
        for course in courses:
            for slot in course.get("parsed_slots", []):
                day_blocks.setdefault(slot.day, []).append(slot.block)
         # 비사토·창사글 필수배정 슬롯도 포함
        for slot in mandatory_slots:
            day_blocks.setdefault(slot.day, []).append(slot.block)

        if TIME_PREF_NO_MORNING in time_prefs:
            morning_count = sum(1 for c in courses if any(s.block == 1 for s in c.get("parsed_slots", [])))
            if morning_count == 0:
                tags.append("오전(1-3교시) 수업 없음")
            else:
                tags.append(f"오전 수업 {morning_count}과목 포함 (필수 과목)")
        if TIME_PREF_NO_FULLDAY in time_prefs:
            fullday = [d for d, bl in day_blocks.items() if set(bl) == {1,2,3}]
            if not fullday:
                tags.append("풀강 없음")
            else:
                tags.append(f"풀강 {len(fullday)}일 포함 (필수 과목)")
        if TIME_PREF_COMPACT in time_prefs:
            tags.append("수업 몰아듣기 반영")
        if TIME_PREF_GAP in time_prefs:
            tags.append("수업 사이 여유 시간 확보")

    # 선이수 이수 기반 추천 이유
    taken_names = {c.get("교과목명", "").replace(" ", "") for c in courses}
    # recommender에서 prereqs 접근 불가하므로 courses의 점수로 간접 판단
    prereq_msgs = []
    for c in courses:
        name = c.get("교과목명", "")
        # score에서 prereq 기여분이 높으면 선이수 충족 과목
        if c.get("score", 0) > 60 and str(c.get("이수구분", "")) in ["핵심전공", "심화전공"]:
            prereq_msgs.append(name)
    if prereq_msgs:
        tags.append(f"선이수 조건 충족 전공: {', '.join(prereq_msgs[:2])}")
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
        student_id="20240001",
        grade=3,
        current_semester=1,
        track="전공심화",
        history=[
             CourseHistory(2024, 1, "파이썬프로그래밍"),
            CourseHistory(2024,1,"사회공헌활동의이해와전망"),
            CourseHistory(2024,1,"소프트웨어융합기술개론"),
            CourseHistory(2024,1,"비판적사고와토론"),
            CourseHistory(2024,1,"AI와 서비스디자인"),
            CourseHistory(2024,1,"디지털컨텐츠"),
            CourseHistory(2024,2,"인공지능수학"),
            CourseHistory(2024,2,"C++프로그래밍"),
            CourseHistory(2024,2,"미적분과벡터해석기초"),
            CourseHistory(2024,2,"창조적사고와글쓰기"),
            CourseHistory(2024,2,"디지털금융의이해"),
            CourseHistory(2025,1, "자료구조"),
            CourseHistory(2025,1, "운영체제"),
            CourseHistory(2025,1, "유전자과학과미래"),
            CourseHistory(2025,1 , "기초 통계학"),
            CourseHistory(2025, 1, "AI서비스설계"),
            CourseHistory(2025, 1, "고급파이썬 프로그래밍"),
            CourseHistory(2025,2 , "자연어처리"),
            CourseHistory(2025,2 , "컴퓨터비전"),
            CourseHistory(2025, 2, "IT개론"),
            CourseHistory(2025, 2, "기호논리학개론"),
            CourseHistory(2025,2 , "사회적이슈의 찬반논쟁"),
            CourseHistory(2025,2 , "모바일 프로그래밍")
            
        ],
        mandatory_ge=MandatoryGE(
            bisato_semester=1, bisato_day=None, bisato_block=None,
            changsagl_semester=2, changsagl_day=None, changsagl_block=None,
        ),
    )

     # ── 사용자 희망 조건 ──────────────────────────────────────────────
    TARGET_YEAR       = 2026
    TARGET_SEMESTER   = 1
    OFF_DAYS          = ["금"]                  # 희망 공강 요일
    CAMPUS_PREF       = "수캠위주"               # 수캠위주 / 운캠위주 / 혼재가능
    DESIRED_CREDITS   = 18                      # 희망 총 학점
    DESIRED_MAJOR     = 15                       # 희망 주전공 학점
    RETAKE_PRIORITY   = False                   # 재수강 우선 추천 여부
    TIME_PREFS        = [                       # 수업시간 선호 (복수 선택 가능)
        TIME_PREF_NO_MORNING,   # 오전 수업 피하기
        # TIME_PREF_NO_FULLDAY, # 풀강 피하기
        # TIME_PREF_COMPACT,    # 몰아듣기 선호
        TIME_PREF_GAP,          # 수업 사이 공백 확보
    ]
 
    gap = calculate_gap(student)
    filtered = filter_courses(
        student,
        target_year=TARGET_YEAR,
        target_semester=TARGET_SEMESTER,
        off_days=OFF_DAYS,
        campus_pref=CAMPUS_PREF,
    )
 
    timetables = recommend(
        student=student,
        gap=gap,
        filtered_df=filtered,
        target_semester=TARGET_SEMESTER,
        desired_credits=DESIRED_CREDITS,
        desired_major_credits=DESIRED_MAJOR,
        off_days=OFF_DAYS,
        campus_pref=CAMPUS_PREF,
        retake_priority=RETAKE_PRIORITY,
        time_prefs=TIME_PREFS,
    )
 
    for i, tt in enumerate(timetables):
        print(f"\n{'='*50}")
        print(f"[시간표 {i+1}] {tt.label}  |  총 {tt.total_credits:.0f}학점  |  점수 {tt.score}")
        print(f"추천 이유: {' / '.join(tt.reason_tags)}")
        if tt.ge_area_breakdown:
            print(f"핵심교양 영역: ", end="")
            for area, v in tt.ge_area_breakdown.items():
                print(f"{area}(기존{v['기존']}+추가{v['추가']})", end="  ")
            print()
        print("-" * 50)
        for c in tt.courses:
            print(f"  {c.get('교과목명',''):<20} {c.get('이수구분',''):<8} "
                  f"{c.get('학점_num',0):.0f}학점  {c.get('시간표','')}")