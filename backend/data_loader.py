import pandas as pd
from pathlib import Path

# 데이터 폴더 경로 설정
DATA_DIR = Path(__file__).parent.parent / "데이터"

def load_graduation_requirements(year: int) -> pd.DataFrame:
    """학번 연도별 졸업요건 로드"""
    file = DATA_DIR / f"graduation_requirements_{year}.xlsx"
    return pd.read_excel(file)

def load_opened_courses(year: int, semester: int) -> pd.DataFrame:
    """개설강좌 로드 (year=연도, semester=1 or 2)"""
    # 2026년 2학기는 2025년 2학기로 대체
    if year == 2026 and semester == 2:
        year = 2025
    file = DATA_DIR / f"opened_course{year}_{semester}.xlsx"
    return pd.read_excel(file, sheet_name=None)  # 시트 전체 로드

def load_roadmap() -> pd.DataFrame:
    """로드맵 로드"""
    file = DATA_DIR / "roadmap.xlsx"
    return pd.read_excel(file, sheet_name=None)

def load_prerequisite() -> pd.DataFrame:
    """선이수 데이터 로드"""
    file = DATA_DIR / "pre_requisite.xlsx"
    return pd.read_excel(file, sheet_name=None)

# 테스트 실행
if __name__ == "__main__":
    print("=== 졸업요건 2026 ===")
    df = load_graduation_requirements(2026)
    print(df)

    print("\n=== 2026년 1학기 개설강좌 시트 목록 ===")
    sheets = load_opened_courses(2026, 1)
    print(list(sheets.keys()))