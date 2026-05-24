# main.py
from flask import Flask, request, jsonify
from flask_cors import CORS

from student import Student, MandatoryGE, CourseHistory
from gap_calculator import calculate_gap, GraduationGap
from course_filter import filter_courses
from recommender import recommend, Timetable

app = Flask(__name__)
CORS(app)

# ── 프론트 변수명 → 백엔드 변수명 변환 ───────────────────────────────
MAJOR_TYPE_MAP = {
    "minor": "부전공",
    "double": "복수전공",
    "intensive": "전공심화",
}
CAMPUS_MAP = {
    "su": "수캠위주",
    "un": "운캠위주",
    "mixed": "혼재가능",
}

def _parse_grade(grade_str: str) -> int:
    """"2학년" → 2"""
    try:
        return int(str(grade_str).replace("학년", "").strip())
    except:
        return 1

def _parse_semester(semester_str: str) -> tuple[int, int]:
    """"2026년 1학기" → (2026, 1)"""
    try:
        parts = str(semester_str).replace("년", "").replace("학기", "").split()
        return int(parts[0]), int(parts[1])
    except:
        return 2026, 1

def _parse_student(data: dict) -> Student:
    grade = _parse_grade(data.get("grade", "1학년"))
    target_year, current_semester = _parse_semester(data.get("semester", "2026년 1학기"))
    track = MAJOR_TYPE_MAP.get(data.get("majorType", "intensive"), "전공심화")

    history = [
        CourseHistory(
            year=int(h["year"]),
            semester=int(h["semester"]),
            course_name=str(h["course_name"]),
            is_retake=bool(h.get("is_retake", False)),
        )
        for h in data.get("history", [])
    ]
    retake_courses = [h["course_name"] for h in data.get("history", []) if h.get("is_retake", False)]

    mge_data = data.get("mandatory_ge", {})
    mandatory_ge = MandatoryGE(
        bisato_semester=mge_data.get("bisato_semester"),
        bisato_day=mge_data.get("bisato_day"),
        bisato_block=mge_data.get("bisato_block"),
        changsagl_semester=mge_data.get("changsagl_semester"),
        changsagl_day=mge_data.get("changsagl_day"),
        changsagl_block=mge_data.get("changsagl_block"),
        jinjotam_done=bool(mge_data.get("jinjotam_done", False)),
    )

    return Student(
        name=str(data.get("name", "")),
        dept=str(data.get("department", "")),      # 프론트: department
        student_id=str(data.get("studentId", "")), # 프론트: studentId
        grade=grade,
        current_semester=current_semester,
        track=track,
        double_major_dept=data.get("subMajorDepartment") or None,  # 프론트: subMajorDepartment
        history=history,
        mandatory_ge=mandatory_ge,
        retake_courses=retake_courses,
    ), target_year, current_semester


def _gap_to_dict(gap: GraduationGap) -> dict:
    return {
        "common_ge":      {"earned": gap.common_ge_earned,      "required": gap.common_ge_required},
        "core_ge":        {"earned": gap.core_ge_earned,        "required": gap.core_ge_required,
                           "areas_earned": list(gap.core_ge_areas_earned),
                           "areas_required": gap.core_ge_areas_required},
        "career_ge":      {"earned": gap.career_ge_earned,      "required": gap.career_ge_required},
        "core_major":     {"earned": gap.core_major_earned,     "required": gap.core_major_required},
        "advanced_major": {"earned": gap.advanced_major_earned, "required": gap.advanced_major_required},
        "total":          {"earned": gap.total_earned,          "required": gap.total_required},
        "missing_mandatory": gap.missing_mandatory,
        "track": gap.track,
        "free_track": {"earned": gap.free_track_earned, "required": gap.free_track_required},
    }


def _timetable_to_dict(tt: Timetable) -> dict:
    return {
        "label":             tt.label,
        "total_credits":     tt.total_credits,
        "score":             tt.score,
        "reason_tags":       tt.reason_tags,
        "ge_area_breakdown": tt.ge_area_breakdown,
        "courses": [
            {
                "course_name": c.get("교과목명", ""),
                "category":    c.get("이수구분", ""),
                "credits":     c.get("학점_num", 0),
                "schedule":    c.get("시간표", ""),
                "campus":      c.get("캠퍼스", ""),
                "area":        c.get("영역", ""),
                "is_retake":   bool(c.get("is_retake_target", False)),
            }
            for c in tt.courses
        ],
    }


@app.route("/recommend", methods=["POST"])
def recommend_endpoint():
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON 데이터가 없습니다"}), 400

    try:
        student, target_year, target_semester = _parse_student(data)
        gap = calculate_gap(student)

        campus_pref     = CAMPUS_MAP.get(data.get("campus", "mixed"), "혼재가능")
        off_days        = data.get("freeDays", [])          # 프론트: freeDays
        desired_credits = int(str(data.get("credits", "18학점")).replace("학점", ""))
        desired_major   = int(data.get("desired_major_credits", 9))
        desired_double  = int(data.get("desired_double_credits", 0))
        retake_priority = bool(data.get("retake_priority", False))
        time_prefs      = data.get("time_prefs", [])

        filtered = filter_courses(
            student,
            target_year=target_year,
            target_semester=target_semester,
            off_days=off_days,
            campus_pref=campus_pref,
        )

        timetables = recommend(
            student=student,
            gap=gap,
            filtered_df=filtered,
            target_semester=target_semester,
            desired_credits=desired_credits,
            desired_major_credits=desired_major,
            desired_double_credits=desired_double,
            off_days=off_days,
            campus_pref=campus_pref,
            retake_priority=retake_priority,
            time_prefs=time_prefs,
        )

        return jsonify({
            "status": "success",
            "gap": _gap_to_dict(gap),
            "timetables": [_timetable_to_dict(tt) for tt in timetables],
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"서버 오류: {str(e)}"}), 500


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)