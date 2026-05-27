# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your pro
# 🎓 성공표 — 성신여대 공대 맞춤형 시간표 추천 서비스

> 성신여대 공과대학 8개 학과 학생들을 위한 AI 기반 시간표 추천 서비스

---

## 📌 프로젝트 소개

매 학기 졸업요건을 직접 엑셀로 정리하고, 로드맵·선이수 정보를 시간표에 반영하는 번거로움을 해소하기 위해 만든 서비스입니다.

학번과 수강이력을 입력하면 졸업요건을 자동 분석하고, 희망 공강·캠퍼스·학점 조건을 반영한 맞춤형 시간표 3개를 추천해드립니다.

---

## 🏫 지원 학과

| 캠퍼스 | 학과 |
|--------|------|
| 수정캠 | AI융합학부, 융합보안공학과, 컴퓨터공학과, 서비스디자인공학과 |
| 운정캠 | 청정신소재공학과, 바이오식품공학과, 바이오생명공학과, 바이오신약의과학부 |

---

## ✨ 주요 기능

- 학번 기반 입학연도별 졸업요건 자동 분석
- 학교 공식 로드맵 기반 학년 적합 과목 추천
- 선이수 권장 과목 반영 점수화
- 희망 공강·캠퍼스·학점 조건 반영
- 균형형 / 전공집중형 / 공강최적형 시간표 3가지 제공
- 졸업 이수 현황 및 이번 학기 수강 후 예상 진행률 시각화
- 부전공 / 복수전공 별도 이수 현황 표시

---

## 🛠 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React (JSX), Vite |
| Backend | Python, Flask, pandas |
| Data | xlsx (졸업요건, 개설강좌, 로드맵, 선이수) |
| 연결 | REST API (POST /recommend) |

---

## 🚀 실행 방법

### 1. 코드 받기
```bash
git clone https://github.com/SUNG-GONG-PLAN/sungshin-timetable.git
cd sungshin-timetable
```

### 2. Python 가상환경 설정
```bash
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

pip install flask flask-cors pandas openpyxl
```

### 3. 백엔드 실행 (터미널 1)
```bash
python backend/main.py
```

### 4. 프론트엔드 실행 (터미널 2)
```bash
cd frontend
npm install
npm run dev
```

### 5. 브라우저 접속
```
http://localhost:5173
```

---

## 📁 프로젝트 구조

```
sungshin-timetable/
├── backend/
│   ├── main.py            # Flask API 서버
│   ├── gap_calculator.py  # 졸업요건 계산
│   ├── course_filter.py   # 개설강좌 필터링
│   ├── recommender.py     # 시간표 추천 알고리즘
│   ├── data_loader.py     # 데이터 로딩
│   └── student.py         # 학생 데이터 모델
├── frontend/
│   └── src/
│       ├── App.jsx        # 메인 UI
│       └── api.js         # API 통신
└── 데이터/
    ├── graduation_requirements_20XX.xlsx  # 연도별 졸업요건
    ├── opened_course20XX_X.xlsx           # 연도별 개설강좌
    ├── roadmap.xlsx                       # 학과별 로드맵
    └── pre_requisite.xlsx                 # 선이수 권장 데이터
```

---

## 👥 팀원

성신여대 AI융합개론 팀 프로젝트
AI융합학부 이세윤, 박채은
지리학과 전윤빈빈