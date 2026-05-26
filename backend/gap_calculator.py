#졸업요건 계산 알고리즘
from dataclasses import dataclass, field
from data_loader import load_graduation_requirements, load_opened_courses
from student import Student, MandatoryGE, CourseHistory
from student import get_dept_aliases


MANDATORY_GE_COURSES = {
    "IT계열": ["파이썬프로그래밍", "기초통계학", "미적분과벡터해석기초"],
    "실험계열": {
        "청정신소재공학과": ["일반화학Ⅰ", "일반화학Ⅱ", "일반물리학Ⅰ"],
        "바이오식품공학과": ["미적분과벡터해석기초", "일반화학Ⅰ", "일반생물학Ⅰ"],
        "바이오생명공학과": ["일반화학Ⅰ", "일반생물학Ⅰ", "일반생물학Ⅱ"],
        "바이오신약의과학부": ["일반화학Ⅰ", "일반생물학Ⅰ", "일반생물학Ⅱ"],
    }
}

IT_DEPTS = {"AI융합학부", "융합보안공학과", "컴퓨터공학과", "서비스디자인공학과"}
CORE_GE_AREAS = ["인식과가치", "문학과예술", "역사의해석", "사회의이해", "자연의설명", "공학과기술"]
COLLEGE_KEYWORDS = ["지식서비스공과대학", "공과대학"]

@dataclass
class GraduationGap:
    """졸업 갭 계산 결과"""
    # 교양
    common_ge_required: float = 0
    common_ge_earned: float = 0
    core_ge_required: float = 0
    core_ge_earned: float = 0
    core_ge_areas_required: int = 0
    core_ge_areas_earned: set = field(default_factory=set)
    career_ge_required: float = 0
    career_ge_earned: float = 0

    # 주전공
    core_major_required: float = 0
    core_major_earned: float = 0
    advanced_major_required: float = 0
    advanced_major_earned: float = 0

    # 자유선택 (전공심화 / 부전공 / 복수전공 중 택일)
    track: str = "전공심화"
    free_track_required: float = 0
    free_track_earned: float = 0

    # 복수전공은 핵심/심화 구분 있음
    double_major_core_required: float = 0
    double_major_core_earned: float = 0
    double_major_advanced_required: float = 0
    double_major_advanced_earned: float = 0

    # 총계
    total_required: float = 130
    total_earned: float = 0

    # 미이수 필수교양
    missing_mandatory: list = field(default_factory=list)

    @property
    def common_ge_gap(self): return max(0, self.common_ge_required - self.common_ge_earned)
    @property
    def core_ge_gap(self): return max(0, self.core_ge_required - self.core_ge_earned)
    @property
    def core_ge_areas_gap(self): return max(0, self.core_ge_areas_required - len(self.core_ge_areas_earned))
    @property
    def career_ge_gap(self): return max(0, self.career_ge_required - self.career_ge_earned)
    @property
    def core_major_gap(self): return max(0, self.core_major_required - self.core_major_earned)
    @property
    def advanced_major_gap(self): return max(0, self.advanced_major_required - self.advanced_major_earned)
    @property
    def free_track_gap(self): return max(0, self.free_track_required - self.free_track_earned)
    @property
    def total_gap(self): return max(0, self.total_required - self.total_earned)


def get_course_info(course_name, year, semester, student_dept):
    """opened_course에서 과목 정보 조회"""
    sheets = load_opened_courses(year, semester)
    dept_aliases = get_dept_aliases(student_dept, student_dept)

    for sheet_name, df in sheets.items():
        if df is None or df.empty:
            continue
        df.columns = df.columns.str.strip()
        if "교과목명" not in df.columns:
            continue
        matched = df[df["교과목명"].str.replace(" ", "", regex=False) == course_name.replace(" ", "")]
        if matched.empty:
            continue
        if "개설학과전공" not in df.columns:
            row = matched.iloc[0]
        else:
            개설학과_clean = matched["개설학과전공"].str.replace(" ", "", regex=False)
            dept_matched = matched[개설학과_clean.apply(
                lambda x: any(alias.replace(" ", "") in x or x in alias.replace(" ", "")
                              for alias in dept_aliases)
            )]
            row = dept_matched.iloc[0] if not dept_matched.empty else matched.iloc[0]
        return {
            "이수구분": str(row.get("이수구분", "")).strip(),
            "영역": str(row.get("영역", "")).strip(),
            "학점": row.get("학점", 0),
            "개설학과": str(row.get("개설학과전공", "")).replace(" ", "")
        }
    return None

def add_major_credit(gap, 이수구분, credit, track, is_double_major_course):
    """전공 학점을 올바른 곳에 배분하는 함수"""
    if 이수구분 == "핵심전공":
        if is_double_major_course and gap.core_major_earned >= gap.core_major_required:
            gap.free_track_earned += credit
            if track == "복수전공":
                gap.double_major_core_earned += credit
        else:
            gap.core_major_earned += credit

    elif 이수구분 == "심화전공":
        if is_double_major_course and gap.advanced_major_earned >= gap.advanced_major_required:
            gap.free_track_earned += credit
            if track == "복수전공":
                gap.double_major_advanced_earned += credit
        else:
            gap.advanced_major_earned += credit


def calculate_gap(student: Student) -> GraduationGap:
    year = student.admission_year
    req_df = load_graduation_requirements(year)

    dept_req = req_df[req_df["학과"] == student.dept]
    if dept_req.empty:
        raise ValueError(f"졸업요건에서 학과를 찾을 수 없음: {student.dept}")
    req = dept_req.iloc[0]

    # 트랙별 학점 설정
    track = student.track
    if track == "전공심화":
        core_major_req = req["핵심 전공"] + req["전공심화_핵심"]
        advanced_major_req = req["심화 전공"] + req["전공심화_심화"]
        free_required = 0
        double_core_req = double_adv_req = 0
    elif track == "부전공":
        core_major_req = req["핵심 전공"]
        advanced_major_req = req["심화 전공"]
        free_required = req["부전공"]
        double_core_req = double_adv_req = 0
    elif track == "복수전공":
        core_major_req = req["핵심 전공"]
        advanced_major_req = req["심화 전공"]
        free_required = req["복수전공_계"]
        double_core_req = req["복수전공_핵심"]
        double_adv_req = req["복수전공_심화"]
    else:
        core_major_req = req["핵심 전공"]
        advanced_major_req = req["심화 전공"]
        free_required = double_core_req = double_adv_req = 0

    gap = GraduationGap(
        common_ge_required=req["공통교양"],
        core_ge_required=req["핵심교양"],
        core_ge_areas_required=int(req["핵심교양영역수"]),
        career_ge_required=req["진로소양"],
        core_major_required=core_major_req,
        advanced_major_required=advanced_major_req,
        track=track,
        free_track_required=free_required,
        double_major_core_required=double_core_req,
        double_major_advanced_required=double_adv_req,
        total_required=req["총졸업학점"],
    )

    # ── 필수교양 자동배정 처리 ──────────────────────────────────────
    # 핵심: 현재 학기(current_semester) 이하인 것만 이미 이수한 것으로 계산
    mandatory_ge = student.mandatory_ge
    bisato_credit    = 2 if year >= 2026 else 3
    changsagl_credit = 2 if year >= 2026 else 3

    if (mandatory_ge.bisato_semester is not None
            and mandatory_ge.bisato_semester <= student.current_semester):
        gap.common_ge_earned += bisato_credit
        gap.total_earned += bisato_credit

    if (mandatory_ge.changsagl_semester is not None
            and mandatory_ge.changsagl_semester <= student.current_semester):
        gap.common_ge_earned += changsagl_credit
        gap.total_earned += changsagl_credit

    if mandatory_ge.jinjotam_done:
        gap.career_ge_earned += 1
        gap.total_earned += 1

    # ── 수강이력 처리 ──────────────────────────────────────────────
    effective_history = student.get_effective_history()

    for course in effective_history:
        info = get_course_info(course.course_name, course.year, course.semester, student.dept)
        if info is None:
            continue
        try:
            credit = float(str(info["학점"]).split("/")[0])
        except:
            continue

        이수구분 = info["이수구분"]
        area = info["영역"]
        개설학과 = info["개설학과"]
        student_dept = student.dept.replace(" ", "")
        double_dept = student.double_major_dept.replace(" ", "") if student.double_major_dept else ""

        gap.total_earned += credit

        # ── 교양 처리 ──────────────────────────────
        if 이수구분 == "공통교양":
            gap.common_ge_earned += credit

        elif 이수구분 == "핵심교양":
            gap.core_ge_earned += credit
            if area in CORE_GE_AREAS:
                gap.core_ge_areas_earned.add(area)

        elif 이수구분 == "진로소양":
            gap.career_ge_earned += credit

        # ── 전공 처리 ──────────────────────────────
        elif 이수구분 in ["핵심전공", "심화전공"]:
            is_college_wide = any(kw in 개설학과 for kw in COLLEGE_KEYWORDS)

            from student import get_dept_aliases
            my_aliases = get_dept_aliases(student_dept)
            is_my_dept = any(
                alias.replace(" ", "") in 개설학과 or 개설학과 in alias.replace(" ", "")
                for alias in my_aliases
            )

            is_double_dept = double_dept and double_dept in 개설학과

            if is_my_dept or is_college_wide:
                add_major_credit(gap, 이수구분, credit, track,
                                 is_double_major_course=(track in ["부전공", "복수전공"]))

            elif is_double_dept:
                gap.free_track_earned += credit
                if track == "복수전공":
                    if 이수구분 == "핵심전공":
                        gap.double_major_core_earned += credit
                    elif 이수구분 == "심화전공":
                        gap.double_major_advanced_earned += credit

    # ── 미이수 필수교양 체크 ────────────────────────────────────────
    taken_courses = [c.course_name.replace(" ", "") for c in effective_history]
    if mandatory_ge.bisato_semester is not None:
        taken_courses.append("비판적사고와토론")
    if mandatory_ge.changsagl_semester is not None:
        taken_courses.append("창조적사고와글쓰기")

    if student.dept in IT_DEPTS:
        required = MANDATORY_GE_COURSES["IT계열"]
    else:
        required = MANDATORY_GE_COURSES["실험계열"].get(student.dept, [])

    for course in required:
        if course.replace(" ", "") not in taken_courses:
            gap.missing_mandatory.append(course)

    return gap