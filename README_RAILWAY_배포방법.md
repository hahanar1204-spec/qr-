# 포레스쿨 무역창고 QR 재고관리 - Railway 클라우드 배포 방법

이 버전은 QR을 어디서 찍어도 자재 조회 화면이 열리도록 만든 클라우드 준비 버전입니다.

## 핵심 구조

- `/scan/QR코드` : 외부 공개 조회 화면입니다. 해당 자재 1개만 보입니다.
- `/` : 관리자 재고판입니다. 관리자 PIN 로그인이 필요합니다.
- `/labels` : QR 라벨 출력 화면입니다. 관리자 PIN 로그인이 필요합니다.
- 데이터 저장: 기본은 SQLite입니다. Railway에서는 Volume을 붙이고 `DATA_DIR=/data`로 설정하는 것을 추천합니다.

## 1. GitHub에 올리기

1. GitHub에서 새 저장소를 만듭니다.
2. 이 폴더 안의 파일들을 저장소에 업로드합니다.
3. 반드시 포함되어야 하는 파일:
   - `app.py`
   - `requirements.txt`
   - `static/index.html`
   - `static/app.css`
   - `static/app.js`
   - `Procfile`
   - `railway.json`

## 2. Railway 프로젝트 만들기

1. Railway에 로그인합니다.
2. `New Project`를 누릅니다.
3. `Deploy from GitHub repo`를 선택합니다.
4. 방금 올린 GitHub 저장소를 선택합니다.
5. 배포가 시작됩니다.

## 3. Variables 설정

Railway 프로젝트의 서비스 화면에서 `Variables`에 아래 값을 추가하세요.

```text
ADMIN_PIN=원하는관리자번호
DATA_DIR=/data
AUTO_OPEN_BROWSER=0
```

배포 후 Railway 주소가 생기면 아래 값도 추가하세요.

```text
PUBLIC_BASE_URL=https://본인주소.up.railway.app
```

예시:

```text
PUBLIC_BASE_URL=https://foreschool-inventory-production.up.railway.app
```

중요: 기본 관리자 PIN은 `1204`입니다. 실제 사용 전 `ADMIN_PIN`을 꼭 바꾸세요.

## 4. Volume 추가

SQLite DB를 유지하려면 Railway Volume이 필요합니다.

1. Railway 프로젝트에서 현재 웹 서비스 선택
2. Volume 추가
3. Mount Path를 `/data`로 설정
4. Variables에 `DATA_DIR=/data`가 들어가 있는지 확인

Volume을 붙이지 않으면 재배포/재시작 때 DB 파일이 사라질 수 있습니다.

## 5. 공개 주소 만들기

1. 서비스의 `Settings`로 이동합니다.
2. `Networking` 메뉴로 갑니다.
3. `Public Networking`에서 도메인을 생성합니다.
4. 생성된 주소를 `PUBLIC_BASE_URL`에 넣습니다.
5. 다시 배포합니다.

## 6. 사용 흐름

1. Railway 주소 접속
2. 관리자 PIN 입력
3. 자재 등록
4. QR 라벨 출력
5. 라벨을 창고 선반/박스/자재칸에 부착
6. 휴대폰 카메라로 QR 스캔
7. 해당 자재의 현재수량, 위치, 규격 확인

## 7. 보안 구조

- QR 조회 화면: 해당 자재 1개만 공개
- 전체 재고판: 관리자 PIN 필요
- 수량 수정: 관리자 PIN 필요
- QR 라벨 출력: 관리자 PIN 필요
- CSV/DB 백업: 관리자 PIN 필요

## 8. 로컬 테스트

윈도우에서는 `START_HERE.cmd`를 실행하면 됩니다.

로컬에서는 브라우저 주소가 보통 아래처럼 열립니다.

```text
http://localhost:8723
```

관리자 PIN 기본값은 `1204`입니다.
