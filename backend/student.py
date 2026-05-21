from dataclasses import dataclass, field
from typing import Optional

# AI융합학부 명칭 정규화
AI_DEPT_ALIASES = {"AI융합학부", "AI", "지능형시스템","ioT","IoT"}
# 학과명 변경 이력 정규화 (구 이름 → 현재 이름)
DEPT_NAME_CHANGES = {
    "청정융합에너지공학과": "청정신소재공학과"
}

# 캠퍼스 분류
SUJUNG_DEPTS = {"AI융합학부", "융합보안공학과", "컴퓨터공학과", "서비스디자인공학과"}
UNJUNG_DEPTS = {"청정신소재공학과", "바이오식품공학과", "바이오생명공학과", "바이오신약의과학부"}

def normalize_dept(dept: str) -> str:
    """학과명 정규화 (AI융합학부 계열 통일)"""
    if dept in AI_DEPT_ALIASES:
        return "AI융합학부"
    if dept in DEPT_NAME_CHANGES:
        return DEPT_NAME_CHANGES[dept]
    return dept
def get_dept_aliases(dept: str) -> set:
    """학과의 데이터상 표기 목록 반환"""
    aliases = {
        "AI융합학부": {"AI융합학부", "AI", "지능형시스템", "IoT", "ioT"},
        "청정신소재공학과": {"청정신소재공학과", "청정융합에너지공학과"},
    }
    return aliases.get(dept, {dept})

def get_campus(dept: str) -> str:
    """학과 기준 캠퍼스 반환"""
    dept = normalize_dept(dept)
    if dept in SUJUNG_DEPTS:
        return "수정"
    return "운정"

def get_admission_year(student_id: str) -> int:
    """학번 앞 4자리로 입학연도 추출 (ex. 20231234 → 2023)"""
    return int(student_id[:4])

@dataclass
class CourseHistory:
    """수강이력 항목 하나"""
    year: int          # 수강연도
    semester: int      # 학기 (1 or 2)
    course_name: str   # 과목명
    is_retake: bool = False  # 재수강 여부

@dataclass
class MandatoryGE:
    """필수교양 자동배정 과목 정보"""
    # 비판적 사고와 토론
    bisato_semester: Optional[int] = None   # 수강 학기 (1 or 2), None이면 미수강
    bisato_day: Optional[str] = None        # 요일 (ex. "월")
    bisato_block: Optional[int] = None      # 교시 블럭 (1=1-3교시, 2=4-6교시, 3=7-9교시)

    # 창조적 사고와 글쓰기
    changsagl_semester: Optional[int] = None
    changsagl_day: Optional[str] = None
    changsagl_block: Optional[int] = None

    # 전공별 진로탐색 (온라인 — 시간표 계산 제외, 이수 여부만)
    jinjotam_done: bool = False

@dataclass
class Student:
    """학생 전체 정보"""
    name: str
    dept: str                          # 학과 (정규화 전 원본)
    student_id: str                    # 학번 8자리
    grade: int                         # 현재 학년
    current_semester: int              # 현재 학기 (1 or 2)
    track: str                         # 전공심화 / 부전공 / 복수전공
    double_major_dept: Optional[str] = None   # 부/복수전공 학과
    history: list[CourseHistory] = field(default_factory=list)
    mandatory_ge: MandatoryGE = field(default_factory=MandatoryGE)
    retake_courses: list[str] = field(default_factory=list)  # 이번 학기 재수강 과목명

    def __post_init__(self):
        self.dept = normalize_dept(self.dept)

    @property
    def admission_year(self) -> int:
        return get_admission_year(self.student_id)

    @property
    def campus(self) -> str:
        return get_campus(self.dept)

    def get_effective_history(self) -> list[CourseHistory]:
        """재수강 처리된 실질 수강이력 반환
        재수강 과목은 이전 수강이력에서 제거됨
        """
        effective = []
        for course in self.history:
            if course.course_name in self.retake_courses and not course.is_retake:
                continue  # 재수강 대상 과목의 이전 이력 제거
            effective.append(course)
        return effective


# 테스트
if __name__ == "__main__":
    student = Student(
        name="홍길동",
        dept="AI융합학부",
        student_id="20230001",
        grade=2,
        current_semester=1,
        track="전공심화",
        history=[
            CourseHistory(2023, 1, "파이썬프로그래밍"),
            CourseHistory(2023, 2, "자료구조"),
            CourseHistory(2023, 2, "기초통계학"),  # 재수강 예정
        ],
        mandatory_ge=MandatoryGE(
            bisato_semester=1,
            bisato_day="월", bisato_block=1,
            changsagl_semester=2,
            changsagl_day="수", changsagl_block=2,
            jinjotam_done=True
        ),
        retake_courses=["기초통계학"]
    )

    print(f"학과: {student.dept}")
    print(f"캠퍼스: {student.campus}")
    print(f"입학연도: {student.admission_year}")
    print(f"\n전체 수강이력: {[c.course_name for c in student.history]}")
    print(f"재수강 처리 후: {[c.course_name for c in student.get_effective_history()]}")