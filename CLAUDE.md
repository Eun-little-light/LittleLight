# Little Light — 프로젝트 안내

BooruComfy에서 갈라져 나온 **일반 일러스트(SFW) 생성 도구**입니다. BooruComfy와는 별개 프로젝트로 관리합니다.
사용자에게는 항상 **한국어**로 답합니다.

## 원칙

- 성 관련 태그·기능은 전부 빼고, 감정 표현과 캐릭터의 동작·포즈 태그는 살립니다. 부정 프롬프트에는 항상 `nsfw, nude`가 들어갑니다.
- 화면 표시는 한국어, 실제로 들어가는 프롬프트는 영문 Danbooru 태그입니다.
- 새 태그는 내장 태그 DB(`/api/tags/lookup`)로 있는지 확인하고, 한국어가 없으면 `patch/kodict_ll.js`에 추가합니다.
- 모든 기능은 exe 안에 넣습니다 (HTML 따로 만들지 않음).

## 구조

- 소스 코드가 없는 Go exe(BooruComfy v1.6.1)에 JS 모듈을 끼워 넣는 방식입니다.
  - `patch/base_v1.6.1.exe`: 원본 (건드리지 않음)
  - `patch/build2.ps1`: exe 끝에 새 PE 섹션(.bcui)을 붙여 내장 app.js를 바꿔 끼움
  - `patch/make.ps1 -Ver X.Y.Z`: 버전 표시(version.js) 생성 → 빌드 → 데이터 폴더 이름 `BooruComfy_data`→`LittleLightData` 바이트 교체 → 캐릭터 폴더 연결(정션)
- 모듈 순서는 make.ps1 안의 목록 그대로: version, (charnames_local), charnames, tidy, picker, presetgrid, hat, bust, faceless, queue, fast, charfolder, pastel, artists_pixiv, artists_thumbs, artists, bluenight, embed, comfysetup, taggroups, customtags, characters, series, regen, editor, kodict1~10, kodict_ll, ko, weight, ios, fit
  - `fit.js`: 작은 창 대응 CSS (버튼 글자 세로 꺾임·가로 넘침 방지, 태그 선택기 좁은 창 높이) — ios 테마 뒤 맨 마지막. 화면을 고치면 브라우저 창 760·560·1000x520 폭에서 모든 탭을 확인
  - `picker.js`: 태그 선택기 (장면 1인/2인/5인, 감정, 복장, 조명, 화풍, 이펙트, 배경 등 — 일반 일러스트용 데이터)
  - `series.js`: "연작" 탭 (화풍 칸 #serStyle = STYLE_G 그룹을 썸네일 타일로, 선택은 fxSel에 같이 저장) (테마별 여러 장 자동 생성, 여러 장면 한 번에, 진행도, 이어서 생성)
  - `characters.js`: 마녀 캐릭터·흑발 셔츠 캐릭터·은발 베레모 캐릭터·흰 긴 머리 메이드·흑발 오드아이 메이드·흑발 청안 메이드 — 솔로/솔로 제외/여럿 한 번에 생성용
  - `pastel.js`: 파스텔 홀로그램·Plain 워크플로 자동 등록, 고른 항목에 따라 워크플로 선호(`window.LL_PASTEL.prefer`), 생성 요청 보정 (charfolder보다 뒤에 있어야 원래 워크플로 이름을 봄)
  - `artists.js` + `artists_pixiv.js`(자동 생성, `reference\artists\make_pixiv_data.ps1`): 태그 선택기 '작가 화풍' 그룹 — 픽시브 인기 작가 중 Danbooru 태그가 있는 100명
  - `bluenight.js`: 태그 선택기 '푸른 밤' 그룹 (푸른 단색조·역광·메이드 화풍 태그 묶음, 원작자 미상) — '푸른 밤'으로 시작하는 항목은 pastel.js가 Plain, '참고 그림' 항목은 `Claude_Anime_BlueNight_IPAdapter`(ref_bluenight.png)로 보냄
  - `bust.js`: 가슴 크기 필수 선택 (생성 버튼 위·설정 탭, 프리셋 '@체형'에 저장) — 모든 /api/generate에서 크기 태그를 하나로 맞춤
  - `artists_thumbs.js`: 작가 견본 썸네일 (reference\artists\make_samples.ps1 → make_thumbs.ps1, 100명 채움 · 원본 ComfyUI output\artist_samples)
  - `embed.js`(자동 생성, `patch\make_embed.ps1`) + `comfysetup.js`: 참고 그림·마녀 워크플로를 exe에 넣고, ComfyUI 연결 시 input에 없으면 /comfy/upload/image로 올림 + 앱에 없는 워크플로 등록 (앱 중계는 ComfyUI userdata 쓰기를 405로 막음 — ComfyUI 목록 등록은 불가)
  - `tidy.js`: 프롬프트 자동 정리(중복 제거 · 분류 정렬 · 가중치 과잉 정리) — 다른 생성 보정보다 먼저 불러와 가장 안쪽(마지막)에서 실행. 분류는 BC_TAGS 그룹 제목·KEY·state.defaultCharacters(body/wear)
  - `faceless.js`: 긍정에 faceless male이 있으면 인원 태그 바로 뒤로 옮기고 1.3, 부정 male face 1.3 (모든 /api/generate)
  - `fast.js`: 빠른 모드(기본 켜짐) — 생성 직전 숨김 사본 워크플로 `이름~fast`(FaceDetailer 등 *Detailer* steps ≤12, UltimateSDUpscale steps ≤8, KSampler는 그대로)로 보냄. charfolder보다 먼저 불러와야(안쪽) 캐릭터용 사본(@)의 빠른 사본을 씀. 같은 시드 비교 약 25% 단축
  - `queue.js`: 생성 우선순위 — 대기열 창(맨 앞·맨 뒤·취소·중단)과 '새 생성은 맨 앞으로'. ComfyUI에 순서 변경이 없어 /comfy/queue delete 후 같은 prompt_id로 /comfy/prompt(front) 재등록
  - `patch\shell\`: 전용 창 프로그램(WebView2, C#5, Windows 기본 csc) — AppShell.cs + build_shell.ps1, make.ps1이 엔진 exe를 넣은 `Little Light.exe`를 만들고 폴더의 엔진 exe는 지움. lib\에 WebView2 SDK(NuGet Microsoft.Web.WebView2) 부품. 시험은 `--port 7874`, 기록은 %LOCALAPPDATA%\LittleLight\shell.log
  - `editor.js`: 편집 탭 — 누끼(ComfyUI 기본 LoadBackgroundRemovalModel·RemoveBackground(BiRefNet) → InvertMask → JoinImageWithAlpha), /comfy/prompt로 직접 보냄(기록에 안 남음), 다듬기·배경·다운로드는 브라우저 canvas
  - `regen.js`: 다시 생성 (생성 결과 아래·상세 창 버튼, `window.BC_REGEN`) — 연작 칸의 ↻는 series.js 안 `regenSlot`
  - 화풍 모듈(pastel, artists, artists_pixiv, artists_thumbs, bluenight), regen.js, bust.js, queue.js, editor.js, comfysetup.js, charnames.js, update.ps1, dist.ps1, patch\shell\은 Ghost(옛 BooruComfy, `Desktop\img project\BooruComfy-v1.0.0-win64\patch`)에도 같은 파일이 있음 — 고치면 양쪽에 복사
  - `charnames.js`: 캐릭터 정의(BUILTIN: id·기본 이름·폴더·설명·인식 태그·keep) + 이름 지정 + 내 캐릭터(프리셋 '@캐릭터 이름'·'@내 캐릭터'), 설정 탭과 캐릭터 선택 옆 '✎ 캐릭터' 창. `window.LL_DIST`(make -Dist)면 기본 이름 없음
  - `characters.js`·`charfolder.js`는 charnames를 씀 (Ghost와 같은 파일, `window.LL`로 경로·문구만 다름)
  - 배포: `make.ps1 -Ver X -Dist` → `patch\dist.ps1`가 바탕화면 [LittleLight][배포용.Rev.1]에 최신만 남김 (.vbs 없음). 엔진 exe는 `Little Light.exe` 안에 리소스로 들어가고(`build_shell.ps1 -Engine`) 배포 폴더에서는 지움 → 창 exe가 숨김 `.engine\`에 풀고(stamp=빌드 MVID) `.engine\LittleLightData` → `LittleLightData` 정션. update.txt 둘째 줄 `version=`로 업데이트 비교
  - GitHub: 버전마다 보통 커밋 + 새 릴리스(`*_dist.zip`) — 기록 지우기(force push) 안 함
  - `charfolder.js`: 캐릭터별 폴더 저장 + 캐릭터용 사본 워크플로에서 마녀 화풍 참조(ref_witch)를 마녀 캐릭터·흑발 오드아이 메이드·흑발 청안 메이드(KEEP_REF) 외에는 0.5(OTHER_IPA)로 낮춤 (CHARS 순서 중요: 흑발 오드아이 메이드가 흑발 청안 메이드보다 앞) · (`LittleLightData\images\<이름>` = ComfyUI output\LittleLight\<이름> 로 이어진 정션)
- 실행: `Little Light.exe`(전용 창) 하나 — 내 빌드도 엔진이 그 안에 들어가 `.engine\`에 풀려 **포트 7866**으로 (Ghost(옛 BooruComfy)는 7865). 예전 버전 exe·.vbs 실행기는 `이전 버전\`으로 옮겨 둠. 내 빌드 창 exe는 폴더의 예전 엔진을 지우지 않음(배포용만 `-Clean`)

## 작업할 때

- 사용자가 실행 중인 버전 exe는 덮어쓰지 말고 다음 버전 번호로 새로 빌드합니다.
- 테스트는 다른 포트(예: 7874)에 따로 띄우고, 끌 때는 그 포트를 쓰는 프로세스만 끕니다 (exe 경로로 끄면 사용자 것까지 꺼짐).
- ComfyUI가 다른 작업을 처리 중이면 실제 생성 테스트로 끼어들지 않습니다.
- Ghost(옛 BooruComfy) 쪽(`Desktop\img project\BooruComfy-v1.0.0-win64`)의 같은 이름 모듈을 고쳐도 여기에는 자동으로 반영되지 않습니다. 필요하면 옮겨 오되, 성인용 항목은 빼고 가져옵니다.
