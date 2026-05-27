'''
import pandas as pd
sheets = pd.read_excel('데이터/opened_course2025_2.xlsx', sheet_name=None)
for name, df in sheets.items():
    df.columns = df.columns.str.strip()
    if '개설학과전공' in df.columns and '이수구분' in df.columns:
        major = df[df['이수구분'].isin(['핵심전공','심화전공'])]
        cs = major[major['개설학과전공'].str.contains('컴퓨터', na=False)]
        print(f'[{name}] 컴퓨터공학과 전공: {len(cs)}개')
        print(cs[['교과목명','이수구분','개설학과전공']].head(5).to_string())
'''
from gap_calculator import calculate_gap
from student import Student, MandatoryGE

s = Student(
    name='테스트', dept='서비스디자인공학과', student_id='20241234',
    grade=2, current_semester=1, track='복수전공',
    double_major_dept='컴퓨터공학과',
    history=[], mandatory_ge=MandatoryGE()
)
gap = calculate_gap(s)
print('복수전공 핵심 required:', gap.double_major_core_required)
print('복수전공 심화 required:', gap.double_major_advanced_required)
print('free_track required:', gap.free_track_required)