# Little Light

Danbooru 태그 기반 **일반 일러스트** 생성 도구 (BooruComfy에서 갈라져 나온 버전, ComfyUI 연동, Windows 단일 실행 파일).
성인용 태그·기능은 모두 빼고, 장면·동작·감정·연출 위주로 구성했습니다. 화면은 한국어로 보이고 실제 프롬프트는 영문 Danbooru 태그로 들어갑니다.

## 실행

- `Little Light.exe`를 더블클릭 → ComfyUI(Comfy Desktop)가 꺼져 있으면 먼저 켜고, 전용 창으로 엽니다. 프로그램 본체는 이 exe 안에 들어 있어 숨김 폴더 `.engine`에 풀어 씁니다(빌드: `make.ps1`이 엔진 exe를 창 exe에 넣고 폴더의 엔진 exe는 지움).
- 주소: `http://127.0.0.1:7866` (BooruComfy는 7865라서 둘을 동시에 켜도 됩니다)
- exe를 직접 실행하면 BooruComfy와 같은 7865 포트를 쓰려고 하니, 동시에 쓸 때는 실행기를 쓰세요.

## 데이터

exe 옆 `LittleLightData` 폴더 (BooruComfy_data와 완전히 따로 — 프리셋·기록·내 태그가 섞이지 않음)

| 위치 | 내용 |
|---|---|
| LittleLightData\images\Character1 · Character2 · Character3 | 캐릭터별 생성 이미지 (ComfyUI output\LittleLight\캐릭터 폴더로 이어진 연결) |
| LittleLightData\workflows | ComfyUI 연동 워크플로 (BooruComfy에서 복사) |
| LittleLightData\presets.json · history.json · settings.json | 프리셋 · 기록 · 설정 |

## 기능

- **태그 선택기 (생성 탭)**: 1인 일상 포즈 · 1인 활동·액션 · 2인(여자 둘 / 남녀) · 5인 단체 장면, 동작·움직임, 감정,
  복장(캐주얼·포멀·판타지·전통·직업·계절), 머리 장식, 구도·카메라, 조명, 화풍·분위기, 이펙트, 계절·날씨, 소품, 배경.
  모든 태그는 내장 Danbooru 태그 DB로 확인한 것만 사용.
- **연작 탭**: 장면 + 연작 테마(하루 일과 8 · 사계절 4 · 시간대 6 · 날씨 6 · 감정 모음 10 · 카메라 앵글 8 · 액션 8)를 고르면
  테마의 장면마다 한 장씩 자동 생성.
  - 여러 장면 한 번에: "인원"에 보이는 장면 전부를 1인 → 2인 (→ 5인 포함 시) 순서로, 장면(워크플로)이 바뀔 땐 앞 장면이 다 끝난 뒤 전환
  - 복장·배경·부위별 복장·연출 효과는 사각 타일 다중 선택, 복장을 고르면 캐릭터의 원래 옷 대신 들어감 (머리·눈은 유지)
  - 핵심 태그 / 복장 / 부위별 가중치 조절, 진행도 1/200 표시, 중단하거나 앱을 껐다 켜도 "이어서 생성"
- **파스텔 홀로그램 화풍** (v1.0.1): 흰·연회색 배경, 파스텔 + 무지갯빛(유리·프리즘 굴절), 아주 길게 흩날리는 그라데이션 머리, 반투명 날개, 비눗방울.
  기존 화풍(마녀 그림 IP-Adapter + 채도 낮춤)은 그대로이고, 이 화풍을 고를 때만 전용 워크플로로 바뀝니다.
  - 태그 선택기 '화풍·분위기'(연작에서는 연출·효과의 '화풍·분위기')에서 고름
    - `파스텔 홀로그램`: 색감·배경만 → `Claude_Anime_PastelHolo` (화풍 태그 + 파스텔 LoRA 0.6)
    - `파스텔 홀로그램 풀세트`: 위 + 긴 그라데이션 머리·반투명 날개·비눗방울·프릴·전신
    - `파스텔 홀로그램 · 참고 그림 화풍`: 풀세트 + `Claude_Anime_PastelHolo_IPAdapter` (참고 그림을 IP-Adapter 0.6으로 화풍 참조 — 참고 이미지와 가장 비슷)
    - 2인·5인 장면이면 `..._PastelHolo_Duo_2people` / `_Party_5people`로 자동 선택
  - 낱개 항목: 동작 '아주 길게 흩날리는 머리', 이펙트 '반투명 날개' · '무지갯빛 굴절'
  - 파스텔 워크플로로 생성할 때는 부정 프롬프트에 `dark, greyscale, muted colors…`가 자동으로 붙고, 기본 프롬프트의 `muted colors, desaturated, grey palette`는 빠집니다.
    '아주 길게 흩날리는 머리'를 넣으면 캐릭터의 `medium hair`·`short hair`도 빠집니다.
  - 워크플로 4개는 앱이 켜질 때 없으면 자동 등록됩니다. 참고 그림 `reference\ref_pastel_holo.png`(작가 서명 부분은 잘라 냄)는
    실행기가 ComfyUI `input` 폴더에 없을 때 복사합니다. 원본은 `reference\style_ref_pastel_holo.png`, 비교 이미지는 `reference\compare\`.
- **작가 화풍** (v1.0.4): 태그 선택기 맨 아래 '작가 화풍' 그룹 100명 (연작에서는 연출·효과의 '작가 화풍') — 버튼: 픽시브 이름 · Danbooru 태그
  - 목록: 픽시브 월간 일러스트 랭킹 최근 3개월에서 일반 작품이 60% 이상인 작가를 모으고, 픽시브 계정 ID·트위터 아이디로 Danbooru 작가 태그를 찾아
    태그가 있는(그림 30장 이상) 작가만 랭킹 등장 횟수·최고 순위 순으로 100명 — 픽시브 링크는 `reference\artists\links.md`
    (모델은 Danbooru 태그로 화풍을 알기 때문에 태그가 없는 작가는 넣어도 효과가 없음)
  - 작가를 고르면 화풍 참조·화풍 LoRA가 없는 `Claude_Anime_Plain`(2인 `_Plain_Duo_2people`, 5인 `_Plain_Party_5people`)이 자동으로 골라짐
    (기존 워크플로는 마녀 그림 IP-Adapter가 화풍을 덮어써서 작가 태그가 거의 안 먹음). 파스텔 홀로그램을 함께 고르면 파스텔 워크플로가 우선.
  - 견본 썸네일 (v1.0.9): 버튼마다 같은 프롬프트·시드 31415로 만든 견본 그림이 있고, 가운데 휠로 클릭하면 원본 크기로 열립니다. 원본은 ComfyUI `output\artist_samples`에 있습니다.
    다시 만들기: `reference\artists\make_samples.ps1`(ComfyUI에 100장 생성) → `make_thumbs.ps1`(`patch\artists_thumbs.js`) → 빌드. 전체 모음은 `reference\artists\견본_100명.jpg`입니다.
  - 목록 다시 만들기: 랭킹 수집 결과 `pixiv_popular_raw.tsv` → `match_pixiv.ps1`(태그 연결) → `pixiv_top100.tsv` → `make_pixiv_data.ps1` → 빌드
  - 작가 이름으로 화풍을 흉내 낸 결과물은 개인적으로 쓰고, 공개할 때는 작가 이름을 붙이지 않는 것을 권합니다.
- **푸른 밤** (v1.0.5): 푸른 단색조 · 강한 역광 · 흩날리는 흰 긴 머리 · 클래식 메이드복 · 눈 내린 밤 정원 느낌.
  참고 그림 `reference\style_ref_bluenight.webp`의 원작자는 역검색(SauceNAO·Google 렌즈)으로 찾지 못해서, 작가 태그 대신 화풍 태그 묶음 + 참고 그림으로 구성했습니다.
  - 태그 선택기 '푸른 밤' 그룹 (연작에서는 연출·효과의 '푸른 밤'): `푸른 밤 화풍`(색감·빛만) · `푸른 밤 풀세트` · `푸른 밤 · 참고 그림 화풍` + 머리 · 메이드복 · 포즈 · 배경 낱개
  - 항목을 고르면 `Claude_Anime_Plain`(2인·5인은 `_Plain_Duo_2people` / `_Plain_Party_5people`)으로, `푸른 밤 · 참고 그림 화풍`이면 1인 `Claude_Anime_BlueNight_IPAdapter`
    (참고 그림 `ref_bluenight.png`를 IP-Adapter 0.6 화풍 참조, 색온도 슬라이더 +0.3)로 자동 전환
  - `ref_bluenight.png`는 실행기가 ComfyUI `input` 폴더에 없을 때 복사합니다.
- **가슴 크기 필수 선택** (v1.0.8): 생성 탭과 연작의 생성 버튼 위, 설정 탭에 `가슴 크기 [필수]`가 있습니다. 작게 / 보통(기본) / 크게 / 아주 크게 중에서 고릅니다.
  모든 생성에 적용되고, 프롬프트에 있던 다른 가슴 크기 태그는 고른 크기 하나로 바뀝니다. 남자만 나오는 프롬프트는 건드리지 않습니다.
- **푸른 밤 옷 무광** (v1.0.8): `shiny clothes`를 뺐습니다. 푸른 밤으로 생성할 때는 광택 태그(shiny clothes, latex, satin…)가 부정 프롬프트에 자동으로 들어갑니다.
- **다시 생성** (v1.0.6): 그림이 잘못 나왔을 때 같은 프롬프트·워크플로·설정에 새 시드로 다시 만듭니다.
  - 생성 탭 결과 아래와 그림 상세 창(갤러리 포함)에 버튼이 있습니다.
    - `↻ 다시 생성`
    - `↻ 다시 생성 + 이 그림 기록 삭제`: 로컬 사본은 지우고, ComfyUI 출력 폴더의 원본은 남깁니다.
  - 연작 결과 칸은 완료되거나 오류가 난 칸 제목 옆에 `↻`가 있습니다. 누르면 그 장만 같은 칸 자리에 다시 생성됩니다.
- **예상 완료 시간** (v1.0.25) (`queue.js`): 생성 버튼 위 대기열 줄에 '약 N분 뒤 모두 완료 (시각)', 대기열 창에 작업마다 한 장 시간과 완료 시각. 작업마다 실제로 들어간 설정(인원 · KSampler/얼굴 보정/업스케일 steps · IPAdapter)으로 계산해서 빠른 모드 작업(⚡)은 짧게 잡힘. 이 PC에서 끝난 생성 시간(ComfyUI 기록)을 같은 설정끼리 배워 점점 정확해짐(처음엔 RTX 3080 측정값).
- **빠른 모드** (v1.0.24) (`fast.js`, 기본 켜짐 · 설정 탭과 생성 버튼 위 대기열 줄에서 끄고 켜기): 그림체·구도를 정하는 기본 생성(KSampler)은 그대로 두고, 얼굴 보정(FaceDetailer) steps를 최대 12로(원래 20), 업스케일(UltimateSDUpscale) steps를 최대 8로(원래 16) 줄인 숨김 사본 워크플로(`이름~fast`)로 생성. RTX 3080 같은 시드 비교에서 1인 약 58초 → 43초, 2인 약 66초 → 49초(약 25% 단축), 그림은 거의 같음(얼굴 표정이 살짝 다를 수 있음). charfolder보다 안쪽이라 캐릭터용 사본의 빠른 사본을 씀.
- **내 빌드도 창 exe 하나로** (v1.0.24): `make.ps1`이 내 빌드도 엔진을 창 exe 안에 넣고 폴더의 엔진 exe는 지움. 예전 버전 exe·.vbs 실행기는 `이전 버전\`으로 옮겨 둠(창 exe는 배포용(`-Clean`)일 때만 폴더의 예전 엔진을 지움).
- **작은 창 대응** (v1.0.23) (`fit.js`, 맨 마지막 모듈): 창을 줄였을 때 버튼 글자가 한 글자씩 세로로 꺾이거나 화면 밖으로 넘치던 문제 정리 — 버튼·선택칸은 줄바꿈 없이 버튼 줄째 다음 줄로, 긴 설명 체크 항목은 안에서 줄바꿈, 갤러리 도구 줄 줄바꿈, 좁은 창(820px 이하)에서 태그 선택기 오른쪽 칸 높이 제한(태그 목록이 눌리지 않게), 편집 탭 빈 목록 문구.
- **창 exe 하나로** (v1.0.23) (배포용): 배포 폴더에는 `Little Light.exe`만 — 엔진 exe가 그 안에 들어 있어(`build_shell.ps1 -Engine`) 처음 켤 때 숨김 폴더 `.engine`에 풀고(빌드 번호 stamp로 바뀐 엔진만 다시 풀기), `.engine\<데이터 폴더>`를 이 폴더의 데이터 폴더로 잇는 정션을 만들어 데이터는 지금처럼 이 폴더에 쌓임. 업데이트 비교는 `update.txt`의 `version=` 줄. v1.0.20~v1.0.22(Rev.1 첫 판)는 예전 업데이트 스크립트라 자동 업데이트가 안 되니 zip을 한 번 직접 덮어써야 함.
- **프롬프트 자동 정리** (v1.0.22) (`tidy.js`, 설정 탭에서 끄고 켜기): 모든 생성 직전에 ① 중복·포함 태그 제거(sweat + heavy sweat → heavy sweat 등) ② 정렬 — 인원 → 작가 화풍 → 핵심 체위 → 캐릭터 외모 → 그 밖의 동작 → 복장 → 표정 → 배경 → 연출 → 품질 ③ 가중치가 붙은 태그가 8개를 넘으면 핵심(인원·작가·핵심 체위·외모) 외에는 1.0으로. SDXL은 앞쪽 태그를 더 강하게 반영해서, 뒤로 밀려 안 먹던 캐릭터 외모·핵심 체위가 잘 나옴. BREAK로 인물을 나눈 프롬프트는 순서를 유지하고 중복만 제거.
- **남자 얼굴 숨기기 보강** (v1.0.21) (`faceless.js`): '남자 얼굴 숨기기'가 켜져 있으면 `faceless male`을 긍정 맨 끝(100번째 이후, 거의 효과 없음) 대신 인원 태그(1boy 등) 바로 뒤에 가중치 1.3으로, 부정 `male face`·`detailed male face`도 1.3으로. 태그 선택기·시퀀스·다시 생성 등 모든 생성에 적용.
- **전용 창 프로그램** (v1.0.20) (`Little Light.exe` / `Ghost.exe`, `patch\shell\`): 브라우저 없이 WebView2 창으로 실행. 켜면 업데이트 확인 → ComfyUI 실행 → 앱 서버를 창 없이(`-port N -no-browser`) 켜고 전용 창에 표시, 창을 닫으면 서버도 끔. 창 크기·위치 기억, 새 창 링크는 기본 브라우저로. WebView2 부품은 exe 안에 들어 있음(`build_shell.ps1`, Windows 기본 csc로 빌드). 기록: `%LOCALAPPDATA%\<이름>\shell.log`. 시험용 `--port N`.
- **생성 우선순위** (`queue.js`): 생성 버튼 위 대기열 줄과 대기열 창 — 작업마다 맨 앞으로 · 맨 뒤로 · 취소 · 중단, '새 생성은 맨 앞으로'. 같은 작업 번호로 다시 넣는 방식이라 앱의 진행·결과 연결이 이어짐. 누끼는 항상 맨 앞.
- **누끼 보강**: 권장 값 안내(가장자리 정리 0~10 · 부드럽게 1px, 잔티가 남으면 15~25), 결과가 통째로 비면 한 번 자동 재시도.
- **배포 폴더**: 바탕화면 `[이름][배포용.Rev.1]` — 실행기(.vbs) 대신 전용 창 exe.
- **편집 탭 (누끼)** (v1.0.19): 그림을 고르고(파일 열기 · 끌어다 놓기 · 최근 생성 그림 · 그림 상세 창의 '✂ 누끼 따기') '배경 제거'를 누르면, ComfyUI 기본 배경 제거 노드(BiRefNet)로 투명 배경 PNG를 만듭니다. 가장자리 정리 · 부드럽게 · 여백 자르기 · 배경색(투명/흰색/검정/색)을 고른 뒤 PNG로 다운로드합니다. 결과는 ComfyUI `output\…edit\`에도 저장되고, 생성 기록에는 남지 않습니다.
  - 필요: [birefnet.safetensors](https://huggingface.co/Comfy-Org/BiRefNet/blob/main/background_removal/birefnet.safetensors)(약 444MB) → ComfyUI `models\background_removal\` (최신 ComfyUI 기본 노드, 커스텀 노드 필요 없음)
- **자동 업데이트** (v1.0.17, 배포용): 실행기를 켤 때 GitHub 최신 릴리스를 확인해 새 버전이면 물어보고 바꿔서 실행합니다(`patch\update.ps1`, 배포 폴더의 `update.txt`에 저장소 이름). 앱 화면에도 새 버전 안내가 뜨고(`updater.js`), 설정 탭 '업데이트 확인' 버튼이 있습니다. 데이터는 그대로 둡니다.
- **모델 파일 이름 자동 맞춤** (v1.0.16): 워크플로가 찾는 모델이 없으면 Civitai 원래 파일 이름이나 확장자만 다른 같은 이름(`4x-AnimeSharp.pth`)으로 맞춥니다.
- **캐릭터 이름 · 내 캐릭터** (v1.0.15): '기본 캐릭터 ▾'와 연작/시퀀스 캐릭터 선택 옆의 `✎ 캐릭터` 버튼을 누르거나 설정 탭에서 바꿉니다.
  - 캐릭터 이름: 기본 캐릭터마다 이름을 정하면 목록과 캐릭터별 저장 폴더에 그 이름이 쓰입니다. 배포용 빌드는 기본 이름이 없습니다.
  - 내 캐릭터: 이름, 설명, 외모 태그(항상 유지), 의상 태그(연작/시퀀스에서 복장을 고르면 교체), 인식 태그, 마녀 화풍 유지 여부를 넣어 추가·수정·삭제합니다. 기본 캐릭터처럼 솔로 / 솔로 제외 / 여럿 한 번에 세 가지로 나옵니다.
  - 성인 캐릭터만 됩니다. `adult, mature female`을 자동으로 붙이고, 어린 캐릭터를 뜻하는 태그는 거부합니다.
  - 저장 위치: 프리셋 '@캐릭터 이름'·'@내 캐릭터' (`charnames.js`)
  - 배포용 빌드: `make.ps1 -Ver X -Dist` → 바탕화면 `[이름][배포용]` 폴더에 최신 exe만 남기고 실행기·참고 그림·워크플로·README까지 최신으로 (`patch\dist.ps1`)
- **ComfyUI 자동 설정** (v1.0.13): 앱 화면을 열면 ComfyUI에 연결되는 순간 한 번 실행합니다. 워크플로는 원래 exe가 갖고 있다가 생성할 때 ComfyUI API로 통째로 보내므로, ComfyUI 화면의 목록에 없어도 됩니다.
  - exe에 든 참고 그림(`ref_pastel_holo.png`, `ref_bluenight.png`)이 ComfyUI `input`에 없으면 올립니다. ComfyUI 설치 위치와 상관없이 동작합니다.
  - exe에 든 워크플로(마녀 화풍 5개 + 코드로 만드는 파스텔·Plain·푸른 밤 8개) 중 앱에 없는 것을 등록합니다.
  - 그래서 exe 파일 하나만 있어도 동작합니다. 내장 데이터는 `patch\make_embed.ps1` → `patch\embed.js`(Little Light에서 만들어 Ghost에 복사)로 만듭니다.
- **캐릭터**: 마녀 캐릭터 · 흑발 셔츠 캐릭터 · 은발 베레모 캐릭터 · 흰 긴 머리 메이드 (화풍은 '푸른 밤' 그룹에서 함께 고름) · 흑발 오드아이 메이드 · 흑발 청안 메이드 — v1.0.12
  - 기본 워크플로(마녀 그림 화풍 참조 0.9)에서 마녀 캐릭터·흑발 오드아이 메이드·흑발 청안 메이드가 아닌 캐릭터는 참조를 0.5로 낮춥니다. 그래서 머리·옷 색이 마녀 캐릭터처럼 흑발·검은 옷으로 바뀌지 않습니다(캐릭터별 폴더 저장이 켜져 있을 때).
- **연작 '화풍' 칸** (v1.0.12): '4. 연출·효과' 앞에 화풍 칸이 따로 있습니다. 화풍·분위기, 작가 화풍(견본 썸네일 100명), 푸른 밤을 그림 타일로 고르고, 가운데 휠로 클릭하면 견본이 크게 열립니다. — 솔로 / 솔로 제외 / 여럿 한 번에 생성용
- **캐릭터별 폴더 저장**: 프롬프트의 머리·눈 태그로 캐릭터를 알아보고 캐릭터 폴더에 저장 (설정 탭에서 켜고 끔)
- **내 태그**: 직접 만든 태그 그룹(효과·연출 / 복장 / 배경)을 태그 선택기와 연작에 추가
- 부정 프롬프트에는 항상 `nsfw, nude`가 들어갑니다.

## 저장소로 받았을 때 필요한 것

이 저장소에는 소스(`patch\*.js`·빌드 스크립트), 워크플로, 참고 그림만 들어 있습니다. 실행 파일과 개인 데이터는 들어 있지 않습니다.

- **빌드:** 원본 BooruComfy v1.6.1 exe를 `patch\base_v1.6.1.exe`로 넣고 `& .\patch\make.ps1 -Ver X.Y.Z`를 실행하면 `LittleLight_vX.Y.Z.exe`가 만들어집니다.
- **워크플로:** `workflows\*.json`을 `LittleLightData\workflows\`에 복사합니다. 이 데이터 폴더는 exe를 한 번 실행하면 exe 옆에 생깁니다.
  - 파스텔 홀로그램·Plain·푸른 밤 워크플로는 앱이 켜질 때 없으면 자동으로 등록됩니다.
- **참고 그림:** `reference\ref_pastel_holo.png`·`ref_bluenight.png`는 실행기가 ComfyUI `input` 폴더에 없을 때 복사합니다.
  - 마녀 화풍 그림 `ref_witch.png`는 들어 있지 않습니다. 이 그림을 쓰는 워크플로(`RefStyle_IPAdapter`, `Duo_2people`, `Party_5people`, `WhiteUniform_*`)를 쓰려면 원하는 화풍 그림을 같은 이름으로 ComfyUI `input`에 넣으세요.
- **ComfyUI 커스텀 노드** (ComfyUI Manager로 설치하거나 `ComfyUI\custom_nodes`에 받기)
  - [ComfyUI_IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus) — IPAdapterAdvanced, IPAdapterModelLoader
  - [ComfyUI-Impact-Pack](https://github.com/ltdrdata/ComfyUI-Impact-Pack) — FaceDetailer
  - [ComfyUI-Impact-Subpack](https://github.com/ltdrdata/ComfyUI-Impact-Subpack) — UltralyticsDetectorProvider
  - [ComfyUI_UltimateSDUpscale](https://github.com/ssitu/ComfyUI_UltimateSDUpscale) — UltimateSDUpscale
- **모델 파일** (ComfyUI `models` 폴더 아래, 파일 이름을 아래와 똑같이)

  | 넣을 폴더 | 워크플로가 찾는 이름 | 받는 곳 (원래 파일 이름 그대로 넣어도 됨) |
  |---|---|---|
  | `checkpoints` | `waiIllustriousSDXL_v170.safetensors` | [WAI-illustrious-SDXL (Civitai)](https://civitai.com/models/827184) — v17.0 (`WAI-Nsfw-Illustrious-17`) |
  | `loras` | `il_saturation_slider.safetensors` · `il_color_temp_slider_d1.safetensors` | [IL Slider \| Tweaker (Civitai)](https://civitai.com/models/1093089) — saturation (`il_saturation_slider_d1`) · color_temp (`il_color_temp_slider_d1`) 판 |
  | `loras` | `Apocryphal-Pastel-IL_V18.safetensors` | [Apocryphal - Pastel Style (Civitai)](https://civitai.com/models/546281) — IL \| V1.8 판 (`HerrscherAGGA2025_Apocryphal-ULTMT-IL_V2`) |
  | `loras` | `smooth-lighting-enhancer-noobai-illustrious.safetensors` | [Smooth Lighting Enhancer (Civitai)](https://civitai.com/models/1204179) (`SLE_v2` 또는 `Smooth_Lighting_Enhancer`) |
  | `ipadapter` | `noobIPAMARK1_mark1.safetensors` | [NOOB-IPA-MARK1 (Civitai)](https://civitai.com/models/1000401) (`NOOB-IPA-MARK1`) · [Hugging Face 사본](https://huggingface.co/subby2006/noob-ipa) |
  | `clip_vision` | `CLIP-ViT-bigG-14-laion2B-39B-b160k.safetensors` | [h94/IP-Adapter — sdxl_models/image_encoder/model.safetensors](https://huggingface.co/h94/IP-Adapter/blob/main/sdxl_models/image_encoder/model.safetensors) → **받은 뒤 왼쪽 이름으로 바꾸기** |
  | `upscale_models` | `4x-AnimeSharp.safetensors` | [Kim2091/AnimeSharp (Hugging Face)](https://huggingface.co/Kim2091/AnimeSharp) · [OpenModelDB](https://openmodeldb.info/models/4x-AnimeSharp) (`4x-AnimeSharp.pth`) |
  | `background_removal` | `birefnet.safetensors` | [Comfy-Org/BiRefNet (Hugging Face)](https://huggingface.co/Comfy-Org/BiRefNet/blob/main/background_removal/birefnet.safetensors) — 편집 탭 누끼용 (선택) |
  | `ultralytics\bbox` | `anime_face_detect_v1.4_s.pt` | [deepghs/anime_face_detection — face_detect_v1.4_s/model.pt](https://huggingface.co/deepghs/anime_face_detection/blob/main/face_detect_v1.4_s/model.pt) → **받은 뒤 왼쪽 이름으로 바꾸기** |

  - **이름 자동 맞춤:** 앱 화면을 열면 ComfyUI에 있는 모델 목록을 보고, 워크플로가 찾는 파일이 없으면 괄호 안의 원래 파일 이름이나 확장자만 다른 같은 이름(`4x-AnimeSharp.pth` 등)으로 워크플로를 고칩니다. 그래서 Civitai·AnimeSharp 파일은 받은 이름 그대로 넣어도 됩니다.
  - CLIP Vision(`model.safetensors`)과 얼굴 검출(`model.pt`)은 이름이 너무 흔해서 자동으로 맞추지 않습니다. 왼쪽 이름으로 바꿔 넣으세요.- **태그 데이터:** a1111-sd-webui-tagcomplete(MIT) — `TAGDATA_LICENSE.txt`
## 빌드 (개발용)

```
& .\patch\make.ps1 -Ver 1.0.23
```
`patch\base_v1.6.1.exe`(BooruComfy 원본)에 `patch\*.js` 모듈을 넣고, 데이터 폴더 이름을 LittleLightData로 바꿔 `LittleLight_v1.0.7.exe`를 만듭니다.
화풍 모듈(`pastel.js`·`artists.js`·`artists_pixiv.js`·`bluenight.js`)과 `regen.js`는 Ghost(옛 BooruComfy)와 같은 파일입니다. 한쪽을 고치면 다른 쪽에도 복사하세요.

## 라이선스

- 내장 태그 데이터: a1111-sd-webui-tagcomplete (MIT) — `TAGDATA_LICENSE.txt`

## 만든 사람

Eun_ — 이 프로젝트는 Anthropic의 Claude(Claude Code)의 도움을 받아 만들었습니다.

## 알려 둘 점

개인이 만들어 쓰는 프로그램이라 **오류가 있을 수 있습니다.** 쓰다가 문제가 생기면 [Issues](https://github.com/Eun-little-light/LittleLight/issues)에 알려 주세요. 생성한 그림과 데이터는 따로 백업해 두는 것을 권합니다.

