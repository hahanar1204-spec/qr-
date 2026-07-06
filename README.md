# 포레스쿨 무역창고 QR 재고관리 v1.3 Cloud Ready

이 프로그램은 스마트스토어/쿠팡 재고가 아니라, 창고에 남아있는 부자재·포장재·무역 자재를 QR로 조회하고 관리하기 위한 프로그램입니다.

## 이번 v1.3의 핵심 변경점

- Railway 클라우드 배포 대응
- `PORT` 환경변수 자동 인식
- `PUBLIC_BASE_URL` 기준 QR 발급
- QR을 어디서든 찍으면 해당 자재 1개 조회 가능
- 전체 재고판은 관리자 PIN 로그인 필요
- 수량 수정, 자재 등록, QR 라벨 출력, 백업은 관리자만 가능
- Railway Volume용 `DATA_DIR=/data` 대응
- `Procfile`, `railway.json`, `.env.example` 포함

## 화면 구조

- `/` : 관리자 재고판
- `/scan/FSW-XXXXXX` : QR 공개 조회 화면
- `/labels` : QR 라벨 출력

## 관리자 PIN

기본 PIN은 `1204`입니다.
실제 클라우드 사용 전 Railway Variables에서 아래처럼 바꾸세요.

```text
ADMIN_PIN=원하는번호
```

## Railway 배포

자세한 방법은 `README_RAILWAY_배포방법.md` 파일을 보세요.

필수 Railway Variables 추천값:

```text
ADMIN_PIN=원하는관리자번호
DATA_DIR=/data
AUTO_OPEN_BROWSER=0
PUBLIC_BASE_URL=https://본인주소.up.railway.app
```

## 로컬 실행

윈도우에서 테스트할 때는 압축을 풀고 `START_HERE.cmd`를 실행하세요.

처음 실행할 때 필요한 패키지를 자동 설치합니다.

## QR 사용 방식

관리자 화면에서 자재를 등록하면 QR 코드가 자동 발급됩니다.
`QR 라벨 출력`에서 라벨을 인쇄한 뒤, 선반·박스·자재칸에 붙이면 됩니다.

휴대폰 카메라로 QR을 찍으면 `/scan/QR코드` 화면이 열리고, 해당 자재의 현재수량과 위치가 보입니다.

## 백업

관리자 화면에서 `CSV 백업 다운로드`를 누르면 자재목록 CSV, 입출고기록 CSV, SQLite DB가 ZIP으로 저장됩니다.
