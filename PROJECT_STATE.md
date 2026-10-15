# thomthematica2 — Project State

_ბოლო განახლება: 2026-10-15. Kveshmicera-ს შეცდომის ბანერში წინა კითხვის შექების გამოჩენის ბაგი გასწორებულია (`096fb463`, 2026-10-15): 49 ფაილი / 411 ტესტი, typecheck და build წარმატებული, GitHub Pages deploy დასრულებული. წინამორბედი ეტაპი: მეხუთე თამაში "ქვეშმიწერით გაყოფა" (`Kveshdivision`) დასრულდა და `main`-ში გაერთიანდა (`549f654`, 2026-10-10). ძველი ფაზების ისტორიული შედეგები უცვლელია; ახალი კოდის checkpoint და ღია რისკები ქვემოთ ცალკეა მითითებული._

## Current Checkpoint (განახლებულია 2026-10-15; დამოუკიდებელი GitHub review + Claude fresh clone)

| პუნქტი | მდგომარეობა |
|---|---|
| Repo | https://github.com/lexo123/thomthematica2 |
| `main`-ის კოდის checkpoint (ამ დოკუმენტის docs commit-მდე) | `096fb463c6a9e48250199589a31946927f1f1519` — Kveshmicera Banner Regression Fix, parent `6e9e691ac9c29aa0aa5d34043544e5e3615e6e22` (2026-10-15) ✅ VERIFIED |
| `feature/long-division` | HEAD `09aaa9f`, მთლიანად `main`-შია გაერთიანებული (`git merge-base --is-ancestor` დადასტურდა). ბრანჩი GitHub-ზე ჯერ არ წაშლილა |
| tsc `--noEmit` | 0 შეცდომა ✅ VERIFIED — ChatGPT: GitHub Actions run `38727161113`-ის job logs; Claude: დამოუკიდებელი fresh clone (Claude-ს Actions API-ზე 403 ჰქონდა) |
| vitest | **49 ფაილი / 411 ტესტი**, ყველა გადის ✅ VERIFIED — ChatGPT: GitHub Actions job logs; Claude: დამოუკიდებელი fresh clone (Claude-ს Actions API-ზე 403 ჰქონდა) |
| `vite build` | წარმატებით სრულდება ✅ VERIFIED — ChatGPT: GitHub Actions job logs; Claude: დამოუკიდებელი fresh clone (Claude-ს Actions API-ზე 403 ჰქონდა) |
| გაყოფის ორაკული | `utils/columnDivision.oracle.test.ts`, SHA-256 `ecf26a7aa60beb7ae49d7c9ec68a7df6ffb20d5c1e5ea92f9738a5e153bcdd08` ✅ VERIFIED; Git blob SHA `abc6d4cc2bfd092d5e8803db9659273aafabb488` ერთნაირია `6e9e691`-სა და `096fb463`-ზე |
| დაცული ფაილები ამ merge-ში | `supabase/schema.sql`, `public/sw.js`, `hooks/useGameSession.ts`, `services/supabaseSyncService.ts` — `6af22e6`-დან `549f654`-მდე ხელუხლებელი ✅ VERIFIED |
| `public/sw.js` | `CACHE_NAME = 'thomthematica-v7'` ✅ VERIFIED (გაყოფის ცვლილებას არ შეხებია) |
| GameMode enum | 5 მნიშვნელობა: `thomthematica`, `thomravlebis_tabula`, `gethometria`, `kveshmicera`, `kveshdivision` ✅ VERIFIED |
| **Development status** | **Kveshdivision + Kveshmicera banner fix დასრულებულია და code review-ით დამტკიცებულია**; 411/411 ტესტი, tsc და build ✅ VERIFIED. ახალი Wave ჯერ არ არის დამტკიცებული |
| **Release verification** | ✅ **VERIFIED** (Lexo-ს ხელით შემოწმება, 2026-10-12) — სამივე პუნქტი (Pages deploy, 360×740, რეალური ტელეფონი/APK + Dashboard ლეიბლი) Lexo-მ შეამოწმა და შედეგი კარგია. კონკრეტული რიცხვები/ეკრანები ამ სესიაში არ მოუწოდებია; Claude-ს დამოუკიდებლად არ გადაუმოწმებია |
| Deploy მექანიზმი (`.github/workflows/deploy.yml`) | `push` `main`-ზე (და `workflow_dispatch`) → `npm install` → `npm run typecheck` → `npm test` → `npm run build` (Supabase env: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` secrets/vars-იდან) → GitHub Pages. ანუ deploy ტესტებზეა დამოკიდებული; ჩავარდნილი typecheck/test deploy-ს აჩერებს ✅ VERIFIED (workflow ფაილი წაკითხულია) |
| GitHub Pages deploy `096fb463`-ისთვის | ✅ VERIFIED **ChatGPT-ის მიერ** — GitHub Actions [run `38727161113`](https://github.com/lexo123/thomthematica2/actions/runs/38727161113): `Typecheck & Test`, `Build`, `Deploy to GitHub Pages` ყველა `success` (2026-10-15). **Claude-ს Actions API-ზე 403 ჰქონდა და run უშუალოდ არ უნახავს**; მან ტესტები/typecheck/build დამოუკიდებლად fresh clone-ში დაადასტურა. **ახალი fix-ის ცალკე მობილური/UI smoke test არ არის დადასტურებული** |
| APK (webintoapp.com wrapper) | APK გაკეთებულია და GitHub Pages URL-ს ეხსნება. ტექნიკურად wrapper პასიურია: ახალ deploy-ს ავტომატურად იღებს, ცალკე rebuild არ სჭირდება. ✅ VERIFIED — Lexo-ს განცხადებით 2026-10-12: გაყოფის რეჟიმი რეალურ ტელეფონზე/APK-ში შემოწმებულია, ყველაფერი რიგზეა (Claude-ს დამოუკიდებლად არ გადაუმოწმებია). Android WebView-ში `beforeunload`/`visibilitychange` ნაკლებად საიმედოა (იხ. Pre-Launch ბაგი 3) |
| ხელით შემოწმება 360×740-ზე (გაყოფა) | ✅ VERIFIED — Lexo-ს განცხადებით 2026-10-12: 360×740-ზე ყველაფერი რიგზეა (ზუსტი `scrollWidth`/`clientWidth` არ მოუწოდებია). ჩემი Chromium-ის გაზომვა: 360–767px → 294/294, ≥768px → 530/530; Lexo-ს დესკტოპზე: 530/530 (viewport 1299) |
| გაყოფა რეალურ ტელეფონზე / APK-ში; Dashboard-ის ლეიბლი ცოცხლად | ✅ VERIFIED — Lexo-ს განცხადებით 2026-10-12 (Dashboard-ის ლეიბლი ასევე ტესტით დაფარულია: `deriveGameModeBreakdown`) |
| უშუალოდ შემდეგი ნაბიჯი | (1) Lexo ადასტურებს `096fb463` code checkpoint-ს; (2) ChatGPT-ის ამ `PROJECT_STATE.md`-ს Claude დამოუკიდებლად ამოწმებს, Lexo ამტკიცებს და ცალკე docs commit-ით push-ავს; (3) **AI Studio-ს სამუშაო ასლი სინქრონიზდება GitHub-ის ახალ `main`-თან და მოწმდება**; (4) Pre-Launch ერთჯერადი შემოწმებები/backup; შემდეგ `grade-range` მხოლოდ planning/review |

---

## როლები და სამუშაო პროცესი (2026-10-12-დან)

ეს ცვლის ქვემოთ, "Workflow" სექციაში აღწერილ ძველ განაწილებას (იქ Claude წერდა prompt-ებს). გაყოფის Commit 1–3d ძველი განაწილებით შესრულდა.

| როლი | პასუხისმგებლობა |
|---|---|
| **ChatGPT — Lead Architect** | არქიტექტურული გეგმა, ტექნიკური ალტერნატივების შეფასება, scope-ის განსაზღვრა, დაცული ინვარიანტების შენარჩუნება, Claude-ის შენიშვნების განხილვა, **ერთი საბოლოო implementation prompt AI Studio-სთვის**, განხორციელებული commit-ის არქიტექტურული შეფასება; **`PROJECT_STATE.md`-ის განახლების მუდმივი ავტორი, თუ Lexo სხვა წესს არ დაადგენს** |
| **Claude — Independent Architecture & Code Reviewer** | ChatGPT-ის გეგმების კრიტიკული შეფასება, გამორჩენილი სცენარები, უსაფრთხოებისა/მონაცემთა მთლიანობის/regression-რისკები, **რეალური Git commit/diff-ის დამოუკიდებელი შემოწმება** (fresh clone), ტესტებისა და mutation checks-ის ადეკვატურობა; **ChatGPT-ის მიერ მომზადებული `PROJECT_STATE.md`-ის დამოუკიდებელი review**. ChatGPT-ს ავტომატურად არ ეთანხმება; ძირითადი implementation prompt-ის ან დოკუმენტის ავტორი არ არის, თუ Lexo კონკრეტულად არ შეცვლის როლებს |
| **Google AI Studio (Gemini) — Implementer** | მხოლოდ დამტკიცებული scope-ის განხორციელება, კოდი და ტესტები, tsc/test suite/build, ფაილებისა და შედეგების რეპორტი, STOP-პირობების დაცვა. თავად არ წყვეტს შემდეგ ფაზაზე გადასვლას, არქიტექტურის შეცვლას ან დამატებით ფუნქციას |
| **Lexo — Project Owner / Final Decision Maker** | პროდუქტის მიზნები და პრიორიტეტები, არქიტექტურული ცვლილებების დამტკიცება/შეჩერება, საბოლოო გადაწყვეტილება უთანხმოებისას (APPROVED / CHANGES REQUESTED / STOP), Git workflow, production ცვლილებები, merge; `PROJECT_STATE.md`-ის საბოლოო დამტკიცება და ცალკე documentation commit |

**ChatGPT-ის რეკომენდაცია არ აუქმებს Lexo-ს საბოლოო გადაწყვეტილების უფლებას. თუ ChatGPT-სა და Claude-ს დასკვნა განსხვავდება, უთანხმოება კოდის წერამდე უნდა გადაწყდეს.**

**პროცესი:** (1) Lexo სვამს მოთხოვნას → (2) ChatGPT ამზადებს არქიტექტურულ გეგმას → (3) Claude დამოუკიდებლად ამოწმებს → (4) უთანხმოებები განიხილება კოდამდე → (5) ChatGPT ამზადებს ერთ საბოლოო prompt-ს → (6) Lexo ამტკიცებს AI Studio-ში გაგზავნას → (7) AI Studio ახორციელებს მხოლოდ შეთანხმებულ scope-ს → (8) tests, typecheck, build, საჭიროებისას mutation checks → (9) Claude ამოწმებს რეალურ diff-სა და კოდს → (10) ChatGPT აფასებს განხორციელებას → (11) Lexo წყვეტს → (12) ახალი ფაზა მხოლოდ დასრულებული checkpoint-ის შემდეგ. მცირე ცვლილებებისთვის პროცესი Lexo-ს თანხმობით შეიძლება გამარტივდეს, მაგრამ **რეალური diff-ის შემოწმება და დაცული ლოგიკის შენარჩუნება სავალდებულოა**.

**AI Studio-ს რეპორტი არასდროს ითვლება დამოუკიდებელ მტკიცებულებად. Git repository და კონკრეტული commit არის source of truth.** (გაყოფის სამუშაოზე ეს წესი კიდევ ოთხჯერ გამართლდა; Kveshmicera banner fix-ის დროსაც რიცხვები და hash არ ემთხვეოდა — იხ. ქვემოთ.) **დოკუმენტაციის workflow:** ChatGPT წერს `PROJECT_STATE.md` → Claude ამოწმებს → Lexo ამტკიცებს → GitHub-ში შედის ცალკე docs commit. თავად ChatGPT-ის/Claude-ის review არ ნიშნავს Lexo-ს საბოლოო გადაწყვეტილებას.

---

## Kveshmicera Banner Regression Fix ✅ — Commit `096fb463` (2026-10-15)

**პრობლემა (დახურული):** `App.tsx` სწორი პასუხისას `currentMessage`-ში ინახავდა შექებას; `handleNext` მას არ ასუფთავებდა; Kveshmicera-ს მეორე კითხვის არასწორ პასუხზე ადრეული `return`-ის გამო ძველი შექება რჩებოდა და `ColumnMultiplication.tsx`-ის შეცდომის ბანერში ჩანდა. გაყოფას (`Kveshdivision`) მსგავსი შეცდომა მანამდე `currentMessage=""`-ით ჰქონდა გასწორებული.

**დამტკიცებული fix:** `App.tsx`-ში მხოლოდ `ColumnMultiplication`-ის prop `currentMessage={currentMessage}` → `currentMessage=""`. `ResultOverlay` და შექების რეალური არჩევის ლოგიკა უცვლელია. `tests/KveshmiceraRetryFlow.test.tsx`-ში დაემატა ტესტი **J**, რომელიც Q1: `24 × 12 = 288` სწორ პასუხს/შექებას, შემდეგ Q2: `31 × 14 = 434` არასწორ პასუხს და შეცდომის ბანერის ზუსტ ტექსტს ამოწმებს. იგივე ლოკატორებია, რაც გაყოფის Test S-ში; გამოიყენება არსებული `fillKveshDigits` helper.

**დადასტურებული commit/diff:** [`096fb463c6a9e48250199589a31946927f1f1519`](https://github.com/lexo123/thomthematica2/commit/096fb463c6a9e48250199589a31946927f1f1519), parent `6e9e691`; **ზუსტად 2 ფაილი** (`App.tsx`: 1 ხაზის ჩანაცვლება; `tests/KveshmiceraRetryFlow.test.tsx`: +53 ხაზი, 1 ტესტი). `PROJECT_STATE.md`, `package-lock.json`, ორაკული და ყველა სხვა ფაილი commit-ში ხელუხლებელია. დამატებითი schema, auth, sync, rolling-window ან Service Worker ცვლილება არ ყოფილა.

**Red/Green/Mutation:** Claude-მა fresh clone-ში independent red phase შეამოწმა (parent-ის `App.tsx` + ახალი Test J → ჩავარდა, ბანერმა ძველი შექება აჩვენა); fix-ის აღდგენით Test J გავიდა, Kveshmicera-ის ტესტები **9/9**. AI Studio-მაც red/green/mutation report წარმოადგინა, მაგრამ ის **არ არის** დამოუკიდებელი მტკიცებულება. GitHub Actions [run `38727161113`](https://github.com/lexo123/thomthematica2/actions/runs/38727161113)-ის job logs **ChatGPT-მა უშუალოდ წაიკითხა GitHub connector-ით**: **49 ფაილი / 411 ტესტი**, `tsc --noEmit`, `vite build` და Pages deploy წარმატებულია. **Claude-ს GitHub Actions API-ზე 403 ჰქონდა**, ამიტომ run-ის სტატუსი/ლოგები უშუალოდ ვერ გადაამოწმა; მან fresh clone-ში დამოუკიდებლად დაადასტურა იგივე ტესტების რაოდენობა, tsc და build. ChatGPT და Claude code review: **APPROVED**. **Lexo-ს საბოლოო checkpoint-დამტკიცება ცალკე გადაწყვეტილებაა.**

### AI Studio-ს ანგარიშის შეუსაბამობები — მომდევნო implementation-მდე შესამოწმებელი

- AI Studio-მ დაწერა ორაკულის SHA-256 `906d1de5f8e9fbca1871c14840efe16b138a75169475aeffc78c6b0ce161d3f5`, რეალურ GitHub commit-ში კი უცვლელია დამტკიცებული `ecf26a7aa60beb7ae49d7c9ec68a7df6ffb20d5c1e5ea92f9738a5e153bcdd08` (Git blob იგივეა parent-შიც). **ორაკულის მიგრაცია/ცვლილება არ არის ნებადართული.**
- AI Studio-მ მიუთითა **48 ფაილი / 401 ტესტი**, მაშინ როდესაც GitHub Actions-მა და Claude-ის fresh clone-მა დაადასტურა **49 ფაილი / 411 ტესტი**.
- AI Studio-ს რეპორტში `package-lock.json`-ზე ცალკე ანგარიში არ იყო, მაგრამ Git diff-ში ფაილი არ შეცვლილა. მისი არსებული lockfile-sync პრობლემა კვლავ გადადებულია.
- **ზუსტი მიზეზი ჯერ დაუდგენელია:** შესაძლოა AI Studio-ს სამუშაო ასლი განსხვავდებოდეს რეპოზიტორიისგან, ან ანგარიში იყოს არაზუსტი. მარტო ეს რიცხვები არ ამტკიცებს კონკრეტული ფაილის დაზიანებას. მიუხედავად ამისა, **ახალი implementation prompt არ გაიგზავნოს, სანამ სამუშაო ასლი GitHub-ის დამტკიცებულ `main`-თან არ გადაიმოწმება** (მათ შორის მიმდინარე `PROJECT_STATE.md`, test-file inventory და დაცული ორაკულის checksum). ZIP overwrite-ის შემდეგ Git diff/status, `sha256sum` და სრული suite დამოუკიდებლად შემოწმდეს. ორაკულის შიგთავსი არ მიეცეს AI Studio-ს შესაცვლელად და არ დაბრუნდეს ძველი ასლით.

---

## Repo
https://github.com/lexo123/thomthematica2

## პროექტის მოკლე აღწერა
React/TypeScript საგანმანათლებლო მათემატიკის აპლიკაცია ბავშვებისთვის, თავდაპირველად აშენებული ერთი ბავშვისთვის (thomthematica), ახლა გადადის multi-user/Parent→Child მოდელზე Supabase-ის (Auth + Postgres + RLS) გამოყენებით. კოდი იწერება Google AI Studio-ს (Gemini) მიერ vibe-coding მიდგომით; არქიტექტურას გეგმავს ChatGPT (Lead Architect), Claude დამოუკიდებლად ამოწმებს გეგმებსა და რეალურ commit-ებს (იხ. "როლები და სამუშაო პროცესი" ზემოთ). Lexo — Project Owner/საბოლოო გადაწყვეტილების მიმღები, არა კოდის ავტორი. **მისი გარემო: Ubuntu (Linux); ინსტრუქციები მხოლოდ Ubuntu ტერმინალისთვის (იხ. `AGENTS.md`).** **პროექტი ახლოვდება production launch-ს — თავდაპირველად ~10 ახლობელი ბავშვისთვის.**

## დასრულებული ფაზები

### Phase 1: Authentication ✅
- Supabase Auth (email/password), AuthContext.tsx, AuthModal.tsx
- Password recovery flow (PASSWORD_RECOVERY event handling, UpdatePasswordModal.tsx)
- supabase/schema.sql — Phase 1-ის საწყისი სქემა შეიცავდა 4 application table-ს (`profiles`, `children`, `game_sessions`, `wishes`). მეხუთე, `child_reward_images`, დაემატა Wave 3 Part 2-ში. Production-ში ამჟამად 5 application table-ია, ხოლო რეპოზიტორიის `schema.sql` ნაწილობრივ მოძველებულია (გადამოწმებულია `main` `549f654`-ზე; იხ. "Schema drift" Known issues-ში)
- RLS მოქმედებს application table-ებზე; client-side INSERT/UPDATE პოლიტიკებში გამოიყენება შესაბამისი ownership `WITH CHECK` (არა მხოლოდ `USING`), ხოლო `child_reward_images`-ის client წვდომა SELECT-only-ა (განზრახ; INSERT/UPDATE/DELETE მხოლოდ Lexo-ს service-role-ით, იხ. Wave 3 Part 2)
- updated_at auto-update trigger (BEFORE UPDATE) — საჭირო abandoned-session დეტექციისთვის
- handle_new_user() trigger — ავტომატური profiles row auth.users insert-ზე
- lib/ensureProfile.ts — client-side self-healing fallback (ON CONFLICT DO NOTHING, legacy ანგარიშებისთვის)
- profiles-ს არ აქვს client-side DELETE policy (განზრახ — account deletion მხოლოდ Edge Function-ით)

### Phase 2.1: Child Profiles & Selector ✅ (Wave X-ით შეცვლილი)
- ChildContext.tsx — activeChildId-ის ერთადერთი წყარო, localStorage persistence
- Self-healing validation — თუ activeChildId აღარ არსებობს childrenList-ში, სუფთავდება
- ChildSelector.tsx-ის "ვინ თამაშობს?" სია Wave X-ში მთლიანად მოშლილია

### Phase 2.2: Sync Service ✅
- services/supabaseSyncService.ts — schema-ს ველების ზუსტი მთხვევა
- .upsert() idempotent, id-ზე დაფუძნებული

### Phase 2.3: Session Lifecycle ✅
hooks/useGameSession.ts-ში:
- sessionId lifecycle: იქმნება ერთხელ, თანმიმდევრულად გადაეცემა auto-save-სა და completion sync-ს
- Sequential FIFO sync queue (enqueueSync) — race condition-ის გამორიცხვა
- Page Visibility API-ზე დაფუძნებული active play duration
- Guest ↔ Authenticated გარდამავალი მდგომარეობების წესები
- ნაპოვნი და გასწორებული ბაგი: ცალკეული [gameMode] და [childId] ეფექტები აორმაგებდნენ flush-ს → გაერთიანდა ერთ ატომურ [gameMode, childId] ეფექტში

### Phase 2.4a/2.4b: activeChildId → ყველა Game Mode ✅
- sessionChildId = user ? activeChildId : null
- ოთხივე რეჟიმი (Thomthematica, ThomravlebisTabula, Gethometria, Kveshmicera) დაკავშირებულია
- 63/63 ტესტი, 0 TypeScript შეცდომა

### Phase 2.5: Migration Gate Closure — Guest Mode-ის სრული მოცილება (Variant A) ✅
- Guest Mode მთლიანად გაუქმებულია — ყველა მომხმარებელი authenticated flow-ით
- services/statsService.ts (Google Apps Script sync) ფიზიკურად წაშლილია thomthematica2-დან
- Google Apps Script public-write endpoint განზრახ რჩება აქტიური — მხოლოდ ცალკე, scope-გარე legacy `thomthematica` (ერთ-ბავშვიანი) აპისთვის; thomthematica2 აღარ არის მასზე დამოკიდებული
- App.tsx-ის "Phase 2.5" isGameScreenBlocked/isChildSelectionRequired chain Wave X-ის შემდეგ პრაქტიკულად dead code გახდა parent-mode-ისთვის — კოდი განზრახ არ წაშლილა, დამცავი fallback-ის სახით რჩება
- 59/59 ტესტი

### Phase 3 — Commit #1 (Parent Dashboard: Data/Read/Derivation Layer) ✅
- **Core rule**: Dashboard — read-only derived-data layer, ახალი statistics data model/schema არ ემატება
- fetchChildSessionsForAggregate, fetchChildSessionsRecent (bounded `.limit(20)`), deriveDashboardStats (pure, division-by-zero-დაცული)
- ChatGPT-მ აღმოაჩინა race condition, Claude-მ დამოუკიდებლად დაადასტურა — გასწორდა `requestIdRef` generation-counter-ით — **ეს pattern მოგვიანებით Wave 2 (Commit #10), Wave 3 Part 2 (reward-images fetcher), Wave X (ChildContext-ის fetch guard-ები), და Wave Y-ის ოთხივე ახალ hook-ში (useFamilyPendingWishes, useChildOwnWishes) ხელახლა იქნა გამოყენებული**
- 78/78 ტესტი

### Phase 3 — Commit #2 (Parent Dashboard UI) ✅
- `showDashboard` state ლოკალურად MainMenu.tsx-ში, body-level conditional (არა overlay)
- explicit rendering priority chain, useChildDashboard(childId) ყოველთვის უპირობოდ გამოძახებული (Rules of Hooks)
- 88/88 ტესტი

### Phase 3 — Commit #3 (gameModeLabels.ts Shared Util Refactor) ✅
- `utils/gameModeLabels.ts` — `GAME_MODE_LABELS` + `getGameModeLabel()`
- **შენიშვნა (Wave Y-ის შემდეგ ცნობილი):** MainMenu.tsx და Header.tsx ამ ცენტრალიზებულ ფაილს არ იყენებენ — თამაშების სახელები სამივე ადგილას ცალ-ცალკე, დუბლირებულად წერია. UI-ტექსტის გადარქმევისას (იხ. ქვემოთ) ეს სამივე ცალ-ცალკე განახლდა
- 91/91 ტესტი

### Phase 3 — Commit #4 (Game-mode Breakdown Dashboard-ში) ✅
- `useChildDashboard.ts` აბრუნებს `gameModeBreakdown`, `ParentDashboard.tsx`-ში რენდერდება

### Phase 3 — Commit #5 (Session-close Persistence + Rolling-window Persistence + Kveshmicera Enter-fix) ✅
- `persistCurrentSession()` vs `flushCompletedSession()` გამიჯვნა
- `services/gameProgressStorage.ts` (localStorage, 48სთ TTL), `{transport: 'keepalive'}`
- 125/125 ტესტი

### Phase 3 — Commit #5A (Kveshmicera Wish-block: 40 → 20) ✅
- `utils/wishBlockSize.ts`, `CHECK (correct_count IN (19,20,39,40))`
- 141/141 ტესტი

### Phase 3 — Commit #5B (Production DB Migration) ✅
- `ALTER TABLE wishes DROP/ADD CONSTRAINT` — BEGIN/COMMIT-ში

### Phase 3 — Kveshmicera Corrections #1–#4 (Post-5B ბაგები) ✅
- Correction #3-ში დაინერგა "Repeated Submission Guard" (`hasKveshFailedThisQuestion`) — მხოლოდ Kveshmicera-სთვის. ეს scope-ის შეზღუდვა მოგვიანებით (Post-Wave-X) აღმოჩნდა ხარვეზად დანარჩენი სამი თამაშისთვის — იხ. "Post-Wave-X Fix" სექცია
- 150/150 ტესტი

### Phase 3 — Commit #6A (ბავშვის სქესის ველი: schema + registration) ✅
- Migration pattern: `ADD COLUMN (nullable) → backfill by id → verify → SET NOT NULL → CHECK` — ეს pattern Wave X-ში pin_hash-ისთვის სრულად არ გამოყენებულა (განზრახ) და Wave Y-ში wishes.status-ისთვისაც განსხვავებული, ამ ცხრილის საკუთარი ისტორიით ნაკარნახევი მიდგომა დაგვჭირდა — იხ. შესაბამისი სექციები
- 155/155 ტესტი

### Phase 3 — Commit #6B (Personalization: {name} + {gender}) ✅
- `utils/personalizeMessage.ts` — ცენტრალიზებული `personalize(phrase, child)`
- 160/160 ტესტი

### Wave 2 — Child-Context-ის საძირკვლის გამაგრება (Commit #7–#10) ✅
- Commit #7: Child Selector "first mode" race — `hasFetchedOnce`-ით გასწორდა
- Commit #8: "No-repeat-until-exhausted" pool სისტემა — `utils/poolSelector.ts` (`selectFromPool<T>`)
- Commit #9: `addChild`-ის type-safety
- Commit #10: Multi-account login-switch race — `fetchedForUserId` + `requestIdRef`
- 168/168 ტესტი

### Wave 3 — Part 1: vocativeName + Phrase Personalization (Commit #11–#16) ✅
- `utils/vocativeNames.ts`, `utils/childNameValidator.ts`, `personalizeMessage.ts`-ში `{vocative}`
- **საბოლოო მდგომარეობა: 25/25 test file, 203/203 ტესტი, 0 TS შეცდომა**

### Wave 3 — Part 2: Per-Child Reward Images ✅ (დასრულებული, დადასტურებული commit bbb26ab)
- **Schema:** `child_reward_images` table (`child_id`, `category` CHECK IN winner/loser/super_winner, `storage_path`, `caption`, `sort_order`) — SELECT-only RLS client-ისთვის, INSERT/UPDATE/DELETE მხოლოდ Lexo-ს service-role-ით dashboard-იდან
- **Storage:** private `child-reward-images` bucket, `{child_id}/{category}/{filename}` კონვენცია, storage RLS policy path-ის child_id-სეგმენტს **text-ად** ადარებს (არა `::uuid` cast) — **Wave Y-ში (Storage discovery, იხ. ქვემოთ) დადასტურდა, რომ policy კატეგორიის სახელს საერთოდ არ ამოწმებს, მხოლოდ პირველ სეგმენტს — ამიტომ ახალი `pending` ქვე-საქაღალდე ამ policy-ს ავტომატურად ემორჩილა**
- **Signed URLs:** `createSignedUrls()` batch call, 2 საათის (7200წმ) expiry, `Map<storage_path, signedUrl>`-ით დაკავშირებული — იგივე პატერნი Wave Y-ში `ParentWishInbox.tsx`-მაც გამოიყენა
- **All-or-nothing personalization:** სამივე კატეგორია (winner/loser/super_winner) ≥1 row, თორემ სრულად fallback
- **Prefetch lifecycle:** `hooks/useChildRewardImagesFetcher.ts` (requestIdRef guard), `childRewardImages` ემატება `ChildContextType`-ს
- **ResultOverlay.tsx:** `utils/poolSelector.ts`-ით, pool-key `${activeChildId ?? 'global'}:${category}:${sourceType}`
- **ვერიფიკაცია:** fresh clone, tsc 0 შეცდომა, vitest 28/28 file, 217/217 ტესტი, production build სუფთა

### Post-Wave-3 Fixes ✅
- **Incorrect-phrase personalization ბაგი (commit ca9d72d):** `App.tsx`-ის incorrect-answer branch-ში `personalize()` არასდროს იძახებოდა — Fix: `personalize(template, activeChild).replace("[]", actualUserAnswer)`
- **`data/rewards.ts`-ის ჩანაცვლება (commit 80fb0bc):** ძველი, პირადი ფოტო/გიფ-ლინკები ჩანაცვლდა ზოგადი სურათებით/caption-ებით
- **`migrated_prompt_history/` წაშლილია (commit 41a4d8d)** — ✅ დასრულებულია
- **`metadata.json`-ის description ჯერ კვლავ ახსენებს თომას სახელს** ("სახალისო მათემატიკური თამაში თომასთვის") — ეს ჯერ არ გასწორებულა, დარჩენილი, დაბალპრიორიტეტული item. **Wave Y-ის UI-გადარქმევისას ეს ცალსახად, განზრახ ხელუხლებელი დარჩა** — ეს აპლიკაციის სახელს ეხება, არა თამაშის ღილაკს

---

### Wave X — PIN-based Parent/Child Identity Gate ✅ (სრულად დასრულებული და დამოუკიდებლად დადასტურებული)

**მიზანი:** ბავშვმა ვერ შეძლოს Parent Dashboard-ში შესვლა იმავე authenticated (email/password) session-ში, და ორ ან მეტ ბავშვს შორის ვერცერთმა ვერ შეძლოს ერთმანეთის ნაცვლად შესვლა.

**შეგნებულად მიღებული შეზღუდვა (უცვლელი, თავდაპირველი architecture-იდან):** ეს არის **client-side UI identity-gate, არა DB-level access-control**. RLS მთელ ოჯახზე (`parent_id = auth.uid()`) კვლავ ღიაა. ტექნიკურად ცნობიერი ბავშვი (DevTools) შემოვლადია — შეგნებული, მისაღები trade-off ოჯახური/ახლობელი-context-ისთვის (~10 ბავშვი).

**Wave Y-ში ეს ერთხელ კიდევ დადასტურდა კრიტიკულად:** child-mode-ზე გადასვლა (`setSessionMode('child')`) სუფთა React local state-ია, არავითარი Supabase auth call. ანუ "ბავშვი" და "მშობელი" ერთსა და იმავე ოჯახში **ზუსტად იგივე `auth.uid()`-ია**. ეს განსაზღვრავს, რომ ნებისმიერი ახალი, "მხოლოდ მშობლისთვის" ან "მხოლოდ ბავშვისთვის" მონაცემი **ვერასდროს** დაცული იქნება Storage/DB RLS-ით ამ ორ mode-ს შორის — მხოლოდ query-level column selection-ით (`select('*')`-ის გამორიცხვით) და UI-ით. იხ. Wave Y-ის "Storage/Data-boundary Discovery" ქვემოთ.

#### საბოლოო, დანერგილი Flow
```
email/password login
   ↓
PinGate — Stage 1: "ვინ შედის?" (Identity List)
   ↓ (item-ზე დაჭერა)
PinGate — Stage 2: PIN Entry (scoped ერთ კონკრეტულ identity-ზე)
   ├── Parent match → sessionMode='parent'
   └── Child match  → activeChildId + sessionMode='child' ატომურად
   "← უკან" → Stage 1-ზე დაბრუნება
   ↓
sessionMode === 'parent': MainMenu-ში მხოლოდ "📊 სტატისტიკა" + "📬 სურვილები" + "➕ ბავშვის დამატება"
sessionMode === 'child': პირდაპირ თამაშის მენიუ
"🔒 მომხმარებლის შეცვლა" (ორივე mode-ში ხილული) → PinGate Stage 1-ზე
```

PIN-ის გარეშე identity-switch საერთოდ აღარ არსებობს.

#### pin_hash-ის schema-სტატუსი (დახურული)
`pin_hash` ორივე table-ზე (`profiles`, `children`) განზრახ რჩება nullable. `SET NOT NULL`/structured backfill აღარ იგეგმება — ყველა არსებული ანგარიში სატესტოა, launch-მდე წაიშლება; `handle_new_user()` trigger PIN-ის გარეშე ქმნის profiles row-ს; PIN gate ისედაც client-side UI gate-ია.

#### დიზაინის ევოლუცია (ისტორიული ჩანაწერი)
1. პირველადი, დამტკიცებული architecture ("ბრმა" PIN) → Commit #17 v1-ში 6 პრობლემა აღმოჩენილი (addChild-ს PIN არ ჰქონდა, signup-ის error არ მოწმდებოდა, pin_hash `select('*')`-ით ჟონავდა, ძველი child-switch ღილაკი repurposed იყო, fail-open fallback, PIN hash დუბლირებულად `user_metadata`-ში)
2. FIX 1-6 (commit 9aa1ab1) — ყველა გასწორდა
3. რეალურ გამოყენებაში Lexo-მ აღმოაჩინა, რომ "ბრმა PIN + child-switch button" პრაქტიკულად ტოვებდა bypass-ს
4. სრული refactor (commit 7d06e73) — საბოლოო, identity-first ორსტადიანი flow, ტერმინოლოგია "შვილი"→"ბავშვი"

#### ⚠️ ცნობილი, განმეორებადი პროცესის ხარვეზი — PROJECT_STATE.md sync
Commit-ებმა 7d06e73-მ და f45434f-მ ორივემ ჩუმად overwrite გაუკეთეს ამ ფაილს ძველი ვერსიით AI Studio-ს ZIP export-ის გამო ("ZIP revert risk", schema.sql-საც ადრე შეემთხვა). **ეს ფაილი (ეს ვერსია) ხელით უნდა აიტვირთოს AI Studio-ს project-შიც ყოველი განახლების შემდეგ.**

---

### Post-Wave-X Fix — განმეორებითი არასწორი პასუხის Double-Counting ბაგი ✅ (commit f45434f)

**პრობლემა:** განმეორებითი (retry) არასწორი პასუხი ყოველ ცდაზე ცალკე incorrect-ად ითვლებოდა — Kveshmicera-ს გარდა (`hasKveshFailedThisQuestion` guard, Correction #3-დან), რომელიც არასდროს გავრცელებულა დანარჩენ სამ თამაშზე.

**Fix:** მოდელ-აგნოსტიკური `hasFailedCurrentQuestion` (App.tsx) + stale-closure fix `hooks/useTimer.ts`-ში (`onTimeOutRef`, `useRef`+`useEffect` sync pattern — **ეს Wave Y-ს პირდაპირ არ შეხებია, მაგრამ იგივე "callback + setInterval/setTimeout + changing state" კლასის watch-out-ია, რაც მომავალშიც გასათვალისწინებელია**).

**Verification:** fresh clone, tsc 0 შეცდომა, vitest 35/35 file, 255/255 ტესტი, production build სუფთა.

---

## Wave Y — Wish Approval Workflow ✅ (სრულად დასრულებული და დამოუკიდებლად დადასტურებული)

**მიზანი:** ბავშვის დაწერილი "wish" (რა სურათი უნდა, რომ Lexo-მ მომავალში გაუკეთოს) ჯერ მშობელს მიუვიდეს ტექსტობრივად დასადასტურებლად, მერე — Lexo-ს მიერ გაკეთებული სურათიც ცალკე მშობელს დაუდასტურდეს, სანამ ბავშვის საბოლოო ჯილდოების სისტემაში (`child_reward_images`) აღმოჩნდება. Wish **არ არის** ჯილდო — ის მოთხოვნაა კონკრეტულ სურათზე; მშობელი არაფერს ასრულებს, მხოლოდ ამტკიცებს.

### პროდუქტის გადაწყვეტილებები (Architecture Review-დან)
- **ორსაფეხურიანი მშობლის დასტური**: ჯერ ტექსტი (wish), მერე ცალკე — Lexo-ს მიერ გაკეთებული სურათი. ორივე დამოუკიდებელი approve/reject წერტილია
- **Reject-ზე კომენტარი**: ორივე ეტაპზე არასავალდებულო, თავისუფალი ტექსტი (არა დაფიქსირებული მიზეზების სია) — `wish_parent_note` ბავშვს მისდის, `image_parent_note` Lexo-ს
- **მრავალი ერთდროული wish დაშვებულია** — თუ ბავშვმა ერთ სესიაში რამდენჯერმე დახურა 20/40 streak, სანამ ვინმემ განიხილა, მას იმდენი wish ეკუთვნის. **DB-level "ერთი აქტიური wish" შეზღუდვა განზრახ არ არსებობს** (Architecture Review-ის დროს ეს ჯერ შემოთავაზებული, მერე უარყოფილი იყო — Lexo-ს პროდუქტის გადაწყვეტილებით)
- **Rejected wish-ის resubmit — იმავე row-ზე**, არა ახალი row + `replaces_wish_id` ტიპის ცალკე ტრეკინგი: `wish_text`+`status` (უკან `wish_pending`-ზე)+`wish_parent_note=null` ერთ `UPDATE`-ში. ეს გამარტივება (`replaces_wish_id`-ის მოცილება) Architecture Review-ის დროს, ChatGPT-ის თანხმობით, პირდაპირ დაფიქსირდა
- **ბავშვისთვის ხილული — მხოლოდ ორი რამ**: (ა) `wish_rejected` row-ებზე — ბარათი (ორიგინალი ტექსტი, მშობლის კომენტარი თუ არის, resubmit-ველი); (ბ) ერთი პასიური counter "N სურვილი მშობელთან გაიგზავნა" ყველა დანარჩენ non-terminal სტატუსზე (`wish_pending`, `wish_approved`, `image_pending`, `image_approved`, `image_rejected`). `published` ბავშვისთვის სრულად უხილავია. **wish_approved, image_pending, image_approved, image_rejected, proposed_image_path, image_parent_note ბავშვისთვის არასდროს ინდივიდუალურად ჩანს**
- **`image_approved → published` — მუდმივად Lexo-ს ხელით ოპერაცია**, Supabase Dashboard-იდან (status + `child_reward_images`-ში ატვირთვა). არასდროს გახდება client-ფუნქცია, admin UI ან SECURITY DEFINER RPC — ~10 ბავშვისთვის ავტომატიზაცია ზედმეტი სირთულეა

### Schema
`wishes` ცხრილს **უკვე ჰქონდა** გამოყენებული `status`/`fulfilled_at` (Phase 1-დან, `'pending'`/`'fulfilled'`, `ParentDashboard.tsx`-ში წაკითხვადი ბეჯი) — ეს PROJECT_STATE.md-ში აქამდე დეტალურად აღწერილი არ იყო. Migration-მა ეს კოლაფსა ახალ, ტერმინალურ `'published'`-ში:

```sql
ALTER TABLE wishes DROP CONSTRAINT IF EXISTS check_wish_status;
UPDATE wishes SET status = 'published' WHERE status IN ('pending', 'fulfilled');
ALTER TABLE wishes
  ADD COLUMN wish_parent_note text,
  ADD COLUMN image_parent_note text,
  ADD COLUMN proposed_image_path text;
ALTER TABLE wishes ALTER COLUMN status SET DEFAULT 'wish_pending';
ALTER TABLE wishes ADD CONSTRAINT wishes_status_check
  CHECK (status IN ('wish_pending','wish_approved','wish_rejected','image_pending','image_approved','image_rejected','published'));
```

`fulfilled_at` დარჩა უცვლელად, ისტორიული კვალის სახით — ახალი კოდი მას აღარ წერს.

### State machine (7 მდგომარეობა)
```
wish_pending  (მშობლის რიგი) → wish_approved (Lexo) / wish_rejected (ბავშვი, resubmit იმავე row-ზე)
wish_approved → Lexo ტვირთავს სურათს pending path-ზე → image_pending
image_pending (მშობლის რიგი) → image_approved (Lexo) / image_rejected (Lexo, ახალი სურათი → image_pending)
image_approved → Lexo ხელით child_reward_images-ში → published
```

### Commit-ების თანმიმდევრობა (ყველა fresh-clone-ით, Claude-ის მიერ, დამოუკიდებლად ვერიფიცირებული)
- **Stage 1** (a59c021) — production hotfix: `syncWishToSupabase`-ის ჰარდქოდილი `status: 'pending'` → `'wish_pending'`, ტიპების გაფართოება, `fulfilled_at`-ის ძველი `=== 'fulfilled'` შედარებები → `=== 'published'` (Variant A — ბეჯის ლოგიკა ფუნქციურად აღდგენილი, არა დამალული type-cast-ით)
- **Stage 2** — Storage RLS ვერიფიკაცია **კოდის ცვლილების გარეშე დაიხურა**: `pg_policies`-ის პირდაპირი წაკითხვით დადასტურდა, რომ `parents_select_own_child_storage_objects` policy მხოლოდ path-ის პირველ სეგმენტს (`child_id`) ამოწმებს, კატეგორიის სახელს საერთოდ არ ეხება — ახალი `{child_id}/pending/...` კონვენცია ავტომატურად ექცევა უკვე production-ში მომუშავე policy-ს ქვეშ
- **Stage 3a** (872acb0) — services-ფენა: `childResubmitWish`, `parentApproveWish/RejectWish`, `parentApproveImage/RejectImage` (ყველა `.eq('status', expectedStatus)` guard-ით), `fetchChildSafeWishes` (ცხადი, შეზღუდული column-ები — `proposed_image_path`/`image_parent_note` სტრუქტურულად გამორიცხული query-დანვე), `updateWishStatus` წაშლილი
- **Stage 3b** (339a978) — მშობლის Inbox UI: `useFamilyPendingWishes` hook, `ParentWishInbox.tsx`, `MainMenu.tsx`-ში badge+ერთიანი hook-instance (refetch props-ით გადაცემული, არა ცალკე გამოძახებული)
- **Stage 3c** (e9d6efd) — ბავშვის მხარე: `useChildOwnWishes`, `ChildWishStatusPanel.tsx`, `MainMenu.tsx`-ის child-mode ბლოკში ჩართვა. ტესტებში დამატებულია მკაცრი `FORBIDDEN_UI_LITERALS` assertion (status-სტრინგები/`proposed_image_path`/`image_parent_note` არასდროს ჩანს rendered UI ტექსტში)

### Storage/Data-boundary Discovery (Wave Y-ის ყველაზე მნიშვნელოვანი არქიტექტურული დასკვნა)
ვინაიდან "ბავშვი" და "მშობელი" ერთი ოჯახის ფარგლებში იზიარებენ ერთსა და იმავე `auth.uid()`-ს (იხ. Wave X-ის სექცია ზემოთ), **Storage/DB RLS ვერასდროს ვერ დაიცავს "ბავშვმა არ უნდა ნახოს X" წესს** — ეს შესაძლებელია მხოლოდ client-code-ის დონეზე (query projection), ანუ შემთხვევითი გამჟღავნებისგან დაცვის ზომაა და არა server-side authorization (DevTools-ით ოჯახის მონაცემი ტექნიკურად წაკითხვადია). ეს აღმოჩენა პირდაპირ გავლენას მოახდინა Stage 3a-ს დიზაინზე (`fetchChildSafeWishes`-ის ცხადი column-selection) და ზოგადი წესია ნებისმიერი მომავალი child-visible/parent-only მონაცემისთვის: **`select('*')` არასდროს გამოიყენო query-ში, რომლის შედეგიც child-mode-ის React state-ში შეიძლება მოხვდეს.**

### 🔴 Production Security Incident — Service Worker Cross-Origin Cache Leak ✅ გასწორებული (commit 1f3e969)

Wave Y-ის ტესტირებისას Lexo-მ თავად აღმოაჩინა: (ა) ერთსა და იმავე browser-ში ორი სხვადასხვა მშობლის ანგარიშით ტესტისას, მეორე ანგარიშმა პირველის ოჯახის wishes ნახა Inbox-ში; (ბ) approve/reject-ის შემდეგ ეკრანი ხანდახან საერთოდ არ/ძალიან ნელა განახლდებოდა.

**Root cause:** `public/sw.js`-ის fetch-listener "stale-while-revalidate" სტრატეგიას იყენებდა **ყველა** GET request-ზე, `req.url.startsWith('http')`-ის გარდა არანაირი origin-შემოწმების გარეშე — ანუ Supabase-ისკენ მიმართული request-ებიც URL-ის მიხედვით (არა auth-ის მიხედვით) ქეშირდებოდა. ვინაიდან `fetchFamilyPendingWishes()`-ს ყოველთვის იდენტური URL აქვს ნებისმიერი მომხმარებლისთვის, service worker-ი ერთი მომხმარებლის დაქეშილ პასუხს აბრუნებდა მეორესთვის, Supabase-სთან საერთოდ დაკავშირების გარეშე — **cross-tenant data leak browser cache-ის დონეზე**, RLS-ის მთლიანად გვერდის ავლით (RLS ამ request-ში საერთოდ არ მონაწილეობდა).

**მასშტაბი:** ეხებოდა ნებისმიერ Supabase GET-ს მთელ აპში (wishes, childrenList, reward images, dashboard stats) — არა მხოლოდ Wave Y-ის ახალ ფუნქციებს. Wave Y-მდე არ შემჩნეულა, რადგან არცერთი წინა feature არ საჭიროებდა "იგივე query, ხშირად, ყოველთვის ახალი მონაცემით" პატერნს.

**Fix:** `public/sw.js`-ში cross-origin request-ები (`!req.url.startsWith(self.location.origin)`) მთლიანად გამოირიცხა cache-ლოგიკიდან — `return` ადრეულად, network-ს პირდაპირ მიდის. `CACHE_NAME` აწეული (`v6`→`v7`), რომ `activate`-ის არსებულმა cleanup-ლოგიკამ ავტომატურად წაშალოს ნებისმიერი უკვე დაქეშილი, potentially-stale/leaked Supabase-პასუხი.

**⚠️ ზოგადი წესი მომავლისთვის (დაემატა "საკვანძო გადაწყვეტილებები"-ს):** Service worker-ის cache-ლოგიკა არასდროს არ უნდა გავრცელდეს cross-origin (Supabase და ნებისმიერი სხვა backend) request-ებზე — მხოლოდ საკუთარი origin-ის static assets (JS/CSS/images/navigate).

### UI-ტექსტის გადარქმევა ✅ (commit 3d92e11)
წმინდა display-ტექსტის ცვლილება, database-ზე გავლენის გარეშე (GameMode enum-ის ინგლისური მნიშვნელობები — `'thomthematica'`, `'thomravlebis_tabula'`, `'gethometria'`, `'kveshmicera'` — უცვლელი, DB-ში ინახება ესენი, არა ქართული label-ები):
- "თომთემატიკა" (თამაშის ღილაკი) → "მაგალითები" (აპლიკაციის სახელი "თომთემატიკა" — `metadata.json`/`manifest.json`/`index.html` — განზრახ უცვლელი)
- "თომრავლების ტაბულა" → "გამრავლების ტაბულა"
- "გეთომეტრია" → "გეომეტრია"
- "🔒 გასვლა identity-დან" → "🔒 მომხმარებლის შეცვლა"
- "📊 დაშბორდი" → "📊 სტატისტიკა" (MainMenu-ს ღილაკი და ParentDashboard-ის საკუთარი heading, ორივე)

**შენიშვნა:** ეს სტრიქონები დუბლირებული იყო 3 ადგილას (`utils/gameModeLabels.ts`, `MainMenu.tsx`, `Header.tsx` — ერთმანეთისგან დამოუკიდებლად), პლუს 7 ტესტ-ფაილი — ყველა განახლდა ერთ commit-ში.

### Verification (ყველა ეტაპი, fresh clone, Claude-ის მიერ დამოუკიდებლად)
თითოეულ commit-ზე: hash-შედარება, parent-commit-თან `git diff --stat`-ით scope-ის წინასწარი დადასტურება (ახალი/მოულოდნელი ფაილი ხელუხლებელი UI-სთვის), `tsc --noEmit` 0 შეცდომა, სრული `vitest run`, `npm run build`. **Stage 1-ზე და UI-rename-ზე AI Studio-ს საბოლოო report-ში აღმოჩნდა უზუსტობა/overclaim** (Stage 1: scope-გადაჭარბება `fulfilled_at`-ის TS2367-ის გამო, საბოლოოდ დამტკიცებულ Variant A-ზე გადავიდა; UI-rename: report-ში ნახსენები იყო არარსებული ცვლილება "🎮 სტუმარი→🔒 ავტორიზაცია", რომელიც რეალურ diff-ში არ აღმოჩნდა) — **ორივე შემთხვევაში რეალური commit სუფთა იყო, მაგრამ ეს არის მუდმივი, დამოუკიდებელი დადასტურების საჭიროების დამატებითი დასტური.**

---

## Post-Wave-Y Fix — რეგისტრაციისას pin_hash-ის ჩუმი დაკარგვა ✅ (commit ecd892a)

**სიმპტომი (რეალური ტესტირებიდან):** ახალი მშობლის რეგისტრაციის შემდეგ profiles.pin_hash NULL რჩებოდა, UI კი "წარმატებულს" აჩვენებდა. PinGate-ში NULL hash "არასწორი PIN"-ად ჩანდა და ასეთი მშობელი ვერასდროს შედიოდა.

**დადასტურებული code-level მიზეზი:** AuthContext.signUp ამოწმებდა მხოლოდ error-ს profiles.update-ის შემდეგ. Supabase update, რომელიც 0 row-ს ცვლის, error-ს არ აბრუნებს.

**ზუსტი root cause ვერ დადგინდა:** შესაძლო მიზეზები — ძველი build ბრაუზერის service worker-ის ქეშიდან, ან session/JWT race. გამორიცხულია: RLS (pg_policies ემთხვევა schema.sql-ს), email confirmation (გამორთულია), failed deploy (Actions მწვანე). ამიტომ fix ფარავს ორივე შესაძლო მიზეზს.

**Fix (3 ნაწილი, ერთ commit-ში):**
- signUp: update + .select('id'), pinSaved === true მხოლოდ error === null და ზუსტად 1 row-ზე. 0 row/error → { error: null, pinSaved: false } (ანგარიში უკვე შექმნილია), AuthModal აჩვენებს "PIN-ს პირველ შესვლაზე დააყენებთ".
- PinGate: მშობლის identity-ზე დაჭერისას ერთხელ იკითხება profiles.pin_hash (3-მდგომარეობიანი ლოკალური status: has_pin/no_pin/error; hash state-ში არ ინახება). Fail-closed: query error ან row-ს არარსებობა = 'error', არასდროს 'no_pin'. 'no_pin' = row არსებობს და pin_hash null/ცარიელია. 'no_pin'-ზე გამოჩნდება PIN-ის დაყენების ეკრანი.
- უსაფრთხოება: setup-მდე ანგარიშის პაროლის გადამოწმება დროებითი, ცალკე Supabase client-ით (persistSession/autoRefreshToken/detectSessionInUrl გამორთული), რათა მთავარ client-ზე SIGNED_IN არ აღიძვრას. ეს ბავშვს უშლის ხელს ცარიელი მშობლის PIN-ის დაკავებაში. setup-ის შემდეგ მშობელი ისევ ჩვეულებრივ PIN-entry-ზე ბრუნდება და parent mode ავტომატურად არ იხსნება.
- ბავშვის NULL PIN: setup არ არსებობს, ცალკე შეტყობინება ("ამ ბავშვს PIN არ აქვს დაყენებული. გთხოვეთ მშობელს."), query error ცალკე შემთხვევაა.

**Verification:** fresh clone, parent be6e0e3, 5 ფაილი (AuthContext, AuthModal, PinGate + ტესტები), tsc 0 შეცდომა, vitest 39/39 ფაილი, 306/306 ტესტი, build სუფთა. ცოცხალი ტესტი: ახალი რეგისტრაცია, pin_hash ხელით NULL-ზე დაყენება, setup-ეკრანი, პაროლის დაბლოკვა, ახალი PIN-ით შესვლა — ყველა გავიდა.

**პროცესის შენიშვნა:** prompt სამ commit-ს ითხოვდა, AI Studio-მ ერთი გამოაგზავნა. შემდეგ prompt-ებში commit-ების რაოდენობა მკაფიოდ გაიწეროს.

---

## Pre-Launch Bug-Fix Wave (Post-Wave-Y) ✅ (სრულად დასრულებული და დამოუკიდებლად დადასტურებული)

**წყარო:** Lexo-ს ცოცხალი ტესტირება ტელეფონზე და კომპიუტერზე (GitHub Pages ლინკით). Grade-range Wave-ზე გადასვლამდე ოთხი ბაგი დაიხურა.

### ბაგი 1 — ბლოკის UI-state-ის გადმოდინება (commit c8b6802 + 111a659)
- **სიმპტომი:** გამრავლების ტაბულაში ერთი შეცდომა → მენიუ → "მაგალითები" → 3 სწორი პასუხი → loser სურათი.
- **Root cause (App.tsx):** `questionsInBlock`, `isPerfectBlock`, `consecutivePerfectBlocks`, `showRewardImage` და მასთან დაკავშირებული UI state არ ნულდებოდა არც 🏠-ზე, არც თამაშის შეცვლაზე, არც ბავშვის შეცვლაზე. rolling window (localStorage) ამას არ ეხებოდა — მისი გასაღები `gameProgress:${childId}:${gameMode}` mode-ით გამიჯნულია.
- **Fix (c8b6802):** `resetBlockUIState` (`isPerfectBlock` → `true`!) გამოძახებული handleHomeClick-ში, mode-ის არჩევისას და `[activeChildId, gameMode]` ეფექტში.
- **გაკვეთილი (111a659):** c8b6802-ის თავდაპირველი 2 ტესტი **ძველ კოდზეც გადიოდა** (ამოწმებდა ტექსტს, რომელსაც ResultOverlay caption-ით ფარავს) — უსარგებლო იყო. გადაიწერა ResultOverlay-ის mock-ით, props-ების უშუალო შემოწმებით; 5 ტესტი, **parent-ზე ვარდება, ახალზე გადის** (დამოუკიდებლად დადასტურებული).

### ბაგი 2 — ორმაგი "completed" flush და duration = 0 (commit 9f68acd)
- **სიმპტომი (Supabase-ში ცოცხლად):** `duration_seconds` უმრავლეს row-ზე 0.
- **Root cause (useGameSession.ts):** `handleHomeClick → resetSession()` აგზავნის სწორ "completed"-ს; შემდეგ `resetActiveTimer()` ანულებს startedAt/duration-ს და `isCompletedRef=false`-ზე ბრუნდება; შემდეგ `setGameMode(null)`-ის effect-cleanup იგივე `sessionId`-ით მეორედ აგზავნის "completed"-ს (`latestRef` ჯერ ძველია) — ≈0 duration-ით. `.upsert` id-ზე row-ს მთლიანად ანაცვლებს, FIFO queue არასწორ მეორე payload-ს უცვლელად ატარებს.
- **Fix:** `flushedSessionIdRef` — ინვარიანტი: **ერთი sessionId-ისთვის "completed" flush მაქსიმუმ ერთხელ**. `isCompletedRef`-ის სემანტიკა, `latestRef`, `resetActiveTimer`, queue — უცვლელი.
- **ასევე:** `resetSession()`-იდან ამოღებულია `clearGameProgress` (🏠 ღილაკი rolling window-ს შლიდა — პროდუქტის მოთხოვნას ეწინააღმდეგებოდა). rolling window ახლა იშლება **მხოლოდ** wish-ის კვალიფიკაციისას.
- **Step 0** (ტესტი, რომელიც კოდის შეცვლამდე ვარდება) მიღებული პროცედურაა; 3/5 ახალი ტესტი parent-ზე ვარდება, დანარჩენი 2 (mode-switch, beforeunload) არსებულ გზებს იცავს.
- ძველი ნულოვანი-duration row-ების აღდგენა შეუძლებელია (startedAt-იც გადაწერილი იყო) — სატესტო მონაცემია.

### ბაგი 3 — გაჭედილი "active" სესიები და Dashboard (commit b28cb05)
- **ცოცხალი გაზომვა (ტელეფონი):** 🏠 → completed+duration ✅; ეკრანის ჩაქრობა → active, გაგრძელებისას მერე completed ✅; ტაბის დახურვა ჩვეულებრივ ფანჯარაში → completed ✅; ინკოგნიტოში ტაბის დახურვა და ბრაუზერის სრული დახურვა → row რჩება "active" (beforeunload/keepalive best-effort-ია, ბრაუზერის kill-ზე ივენთი საერთოდ არ ირთვება).
- **დაკარგვა:** Dashboard-ის ყველა aggregate query ფილტრავდა `status='completed'`-ზე, ამიტომ გაჭედილი row-ის მონაცემი (ბოლო checkpoint-ის კითხვები) მშობელს არ ჩანდა.
- **უარყოფილი ვარიანტები (ChatGPT-ის და Claude-ის cross-review-ით):** (ა) "active → completed" ავტომატური გადაყვანა ბავშვის არჩევისას 30-წუთიანი heuristic-ით — ორი მოწყობილობის კონფლიქტი, pause/resume, "მიტოვებული ≠ დასრულებული" სემანტიკა; (ბ) ახალი "abandoned" status და schema ცვლილება; (გ) ChatGPT-ის ალტერნატივა — completed-only aggregate + ცალკე "დაუმთავრებელი თამაშების" UI-სექცია — უარყოფილია როგორც ზედმეტად დიდი scope ~10 ბავშვისთვის.
- **მიღებული გადაწყვეტილება (Lexo, "ვარიანტი 2"):** ბაზაში არაფერი იწერება/იცვლება; Dashboard ითვლის **ყველა row-ს** (active და completed ერთნაირად). `completedSessionCount` → `sessionCount`; ცარიელი მდგომარეობის ტექსტი "ჯერ არცერთი სესია არ არის". გაჭედილ row-ზე ბოლო 1–9 კითხვა შეიძლება აკლდეს (active იწერება ყოველ მე-10 კითხვაზე და ეკრანის ჩაქრობისას) — რიცხვები ქვედა ზღვარია და არა დამახინჯება; სიზუსტის პროცენტი პრაქტიკულად უცვლელია. ეს ცნობილი, მიღებული trade-off-ია.
- **შენიშვნა:** Dashboard-ში საშუალო duration მეტრიკა **არ არსებობს**. თუ მომავალში დაემატება, ის უნდა იყოს მკაფიოდ `completed`-only (active row-ის duration checkpoint-ია და არა საბოლოო).
- **ცოცხალი დადასტურება:** Dashboard-ის "სესიები/კითხვები/სწორი" ჯამი ემთხვევა Supabase SQL-ით გამოთვლილ active+completed ჯამს.

### Rolling window-ს ცოცხალი დადასტურება
კომპიუტერზე (ჩვეულებრივ ბრაუზერში): 27 სწორი პასუხი → ტაბის დახურვა → ხელახლა გახსნა → გაგრძელება → პასუხები შეგროვდა და სურვილის ფანჯარა გამოჩნდა. (ადრე 40+ კითხვაზე სურვილი არ გამოჩნდა — ახსნა: ინკოგნიტოს localStorage იშლება, ძველი build-ში 🏠 ფანჯარას შლიდა, ან ბოლო 40-ში >1 შეცდომა: წესი = ბოლო 40-დან მინიმუმ 39 სწორი, Kveshmicera-ზე 20-დან 19.)

---

## ქვეშმიწერით გაყოფა — მეხუთე თამაში `Kveshdivision` ✅ (`main`-შია, `549f654`)

**რას აკეთებს:** ბავშვი ავსებს ქვეშმიწერით გაყოფის (სვეტად გაყოფა) ცხრილს უჯრა-უჯრა, როგორც Kveshmicera-ში. გასაყოფი 3–4 ციფრიანია (100–9999), გამყოფი 2–9, გაყოფა ყოველთვის უნაშთოა (5-ნიშნა გასაყოფი, ნაშთიანი გაყოფა — **PLANNED, ჯერ არ დაწყებულა**). ეს ცალკე, მეხუთე `GameMode`-ია (ვარიანტი A), არა Kveshmicera-ს ქვე-რეჟიმი.

### პროდუქტის გადაწყვეტილებები (Lexo, stated)
- ერთი ამოცანა = ერთი კითხვა; სურვილი 20-დან 19 სწორზე (`wishBlockSize(Kveshdivision) = 20`, წესი Kveshmicera-ს იდენტურია)
- ერთი ამოცანა ითვლება მაქსიმუმ ერთ არასწორ პასუხად, რამდენჯერაც არ უნდა შეცდეს (`hasFailedThisDivision`)
- არასწორი პასუხისას ცხრილი რჩება ეკრანზე: სწორი უჯრები მწვანდება, არასწორი წითლდება, ფერები live-ად იცვლება, არაფერი იბლოკება და არ იწმინდება; ბანერი "ზოგიერთი ციფრი არასწორია! შეასწორე წითელი უჯრები."; Incorrect-overlay არ ჩნდება
- ნულოვანი განაყოფის ციფრიც იგივე უჯრების სტილით ივსება (რიგი არ გამოტოვდება)
- ბოლო `0` (ბოლო ნაშთი) და მის ზემოთ ბოლო ნამრავლი — **optional**: ცარიელი დატოვება შეცდომა არ არის, არასწორი ციფრი კი შეცდომაა
- ნაშთის უჯრა: **ყოველ ხაზზე წინასწარ გამოყოფილი შესავსები ადგილი** (რომ ბავშვმა წინასწარ არ იცოდეს, სად რჩება ნაშთი); ნაშთის ადგილას `0` optional
- განაყოფის რიგში ყოველთვის იმდენი უჯრაა, რამდენი ციფრიც აქვს გასაყოფს; განაყოფი მარცხნიდან მარჯვნივ იწერება, ზედმეტი უჯრები ბოლოშია (`spare`), წინ `0` არ დაიშვება; ყველა ნამრავლის რიგში ყოველთვის ორ-ორი უჯრაა; პირველ რიგში მარცხნივ გადმოსული უჯრა არ არსებობს

### განხორციელება (ფაილები)
- `utils/columnDivision.ts` — წმინდა ლოგიკა: `buildDivisionLayout(dividend, divisor)`, `validateDivisionAnswers(layout, answers)`, `DivisionCell {id, kind, step, row, col, expected, rule: 'required'|'optional'|'blank'}`
- `utils/divisionProblemGenerator.ts` — `generateDivisionProblem(rng)`: 3/4 ციფრი 50/50, გამყოფი 2–9, `num1`=გასაყოფი, `num2`=გამყოფი, `answer`=განაყოფი
- `utils/divisionProblemLayout.ts` — `getDivisionLayoutForProblem(problem)`: უსაფრთხო wrapper, რომელიც `null`-ს აბრუნებს (და არასდროს ისვრის) თუ ამოცანა გაყოფის არ არის (მაგ. რეჟიმის გადართვისას ერთი რენდერით "ძველი" `problem`-ი)
- `hooks/useColumnDivision.ts` — state, ფოკუსი `solvingSequence`-ის მიხედვით (განაყოფის ციფრი → ნამრავლი → სამუშაო რიცხვი), Space/Enter/ისრები, ცარიელი უჯრიდან წინსვლა, ბოლო უჯრაზე Enter → submit
- `components/ColumnDivision.tsx` — grid UI; `type="tel" inputMode="numeric" maxLength=1`, სისტემური კლავიატურა; ერთი და იგივე className ყველა უჯრაზე (`w-7 h-9 text-xl md:w-12 md:h-14 md:text-3xl ...`)
- `App.tsx` — ინტეგრაცია (`isDivisionMode`, `divisionLayout` `useMemo`-ში, `useColumnDivision(divisionLayout)` უპირობოდ, ცალკე ფოკუსის ტოტი cleanup-ით, `shouldRecord` გაყოფისთვის, `resetDivisionState` `resetBlockUIState`/`handleNext`-ში, generic რიცხვითი ფორმა გაყოფაზე არ რენდერდება)
- `types.ts` (`Kveshdivision = 'kveshdivision'`), `services/problemGenerator.ts` (გაყოფის ტოტი პირველია), `utils/gameModeLabels.ts` ("ქვეშმიწერით გაყოფა"), `utils/wishBlockSize.ts`, `components/MainMenu.tsx` (მეხუთე ღილაკი), `components/Header.tsx` (ცხადი ტოტი გაყოფისთვის)
- DB: `game_sessions.game_mode`-ს CHECK constraint არ აქვს (production-ში SQL-ით დადასტურებულია) → `'kveshdivision'` იწერება ცვლილების გარეშე; migration არ ყოფილა და არ იყო საჭირო

### ორაკული (დამოუკიდებელი ვერიფიკაცია)
`utils/columnDivision.oracle.test.ts` — **არა ალგორითმის ასლი**, არამედ არითმეტიკული ინვარიანტებით დაწერილი ტესტი: ამოწმებს ყველა 18,106 უნაშთო წყვილს (3–4 ციფრი × გამყოფი 2–9). ფაილი **არასდროს უნდა მიეცეს AI Studio-ს და არასდროს უნდა შეიცვალოს ტესტის გასავლელად**; SHA-256 ზემოთ Current Checkpoint-შია. თუ ტესტი ჩავარდება, კოდს ვასწორებთ და არა ორაკულს. (Commit 3-ის ლოკალური გადაწერისას `git status`-მა ორაკული შეცვლილად აჩვენა. მიზეზი **დადგენილი არ არის**: შეცვლის diff Lexo-მ არ მოგვაწოდა. `git restore`-ით დაბრუნდა, ჰეში გადამოწმდა, ტესტები გავიდა. ეს ორაკულის დაცვის სარგებლობის მაგალითია.)

### Commit-ების ისტორია (`feature/long-division` → `main`, PR #1)
| Commit | შინაარსი |
|---|---|
| `fa4b648` | Commit 1 — წმინდა ლოგიკა და ტესტები (4 ახალი ფაილი); vitest 43 ფაილი / 338 ტესტი |
| `08acc1e` | Commit 2 — `useColumnDivision` hook, `ColumnDivision` კომპონენტი, ორაკული; 46 ფაილი / 365 ტესტი |
| `833b819` | Commit 2b — ერთგვაროვანი რიგები, optional უჯრები, `spare` უჯრა განაყოფის რიგში (პროდუქტის გადაწყვეტილებების შესაბამისად); 46 / 375 |
| `8a1d394` | Commit 3 — აპში ჩართვა (`App.tsx`, მენიუ, ლეიბლი, wish block, Header, მობილური ზომები, `tests/KveshdivisionFlow.test.tsx`, ტესტები B–R); 49 / 408 |
| `093b9e1` | Commit 3b — `currentMessage=""` გაყოფის ბანერზე (ძველი შექება ჩანდა შეცდომის ბანერში); ტესტში `any`-ების მოცილება; სტაბილური `focusFirstCell` mock |
| `9bf8922` | Commit 3c — regression ტესტი S (Q1 სწორი → Q2 არასწორი: ბანერში ძველი შექება არ ჩანს); ჩაიჭრება მუტაციაზე `currentMessage={currentMessage}`; 49 / 409 |
| `09aaa9f` | Commit 3d (commit message: "fixing sizes") — `md:max-w-2xl` გაყოფის რეჟიმის `main`-ზე + ტესტი T; 49 / 410 |
| `549f654` | Merge PR #1 → `main` |

### გაზომილი განლაგება (Chromium, რეალური კომპონენტი + `App.tsx`-ის რეალური კლასები)
4-ნიშნა გასაყოფზე (ყველაზე ფართო შემთხვევა), `scrollWidth/clientWidth` ბარათის შიგნით: **360–767px → 294/294** (უჯრა 28px, `main p-3`); **768–1920px → 530/530** (`md:max-w-2xl`; `md:max-w-2xl`-ის გარეშე იყო 472/414 და ბოლო განაყოფის უჯრა იჭრებოდა). 320px-იან ძალიან პატარა ეკრანზე 28px-იანი უჯრები სქროლს იძლევა (`overflow-x-auto` ბოლო დაცვაა). **გაკვეთილი:** პირველ გაზომვაში მხოლოდ ტელეფონის სიგანეები შემოწმდა; ≥768px (`md:`-ის ზღვარი) გამორჩა და Lexo-მ დესკტოპზე ნახა.

### ტესტირების სტრატეგია
- `tests/KveshdivisionFlow.test.tsx` (19 ტესტი, B–T): B–I — Kveshmicera-ს retry-flow-ს სარკე; J–K ოფციონალური/spare უჯრების წესები; L ცარიელი Enter არ ითვლება; M state-ის გადმოდინება 🏠-ის შემდეგ; N "ძველი" ამოცანა რეჟიმის გადართვისას (console.error/warn არ გამოძახებულა); O რეჟიმებს შორის გადართვა; P generic რიცხვითი ფორმა გაყოფაზე არ არსებობს; Q ფოკუსი პირველ უჯრაზე; R ფოკუსის ტაიმერის `clearTimeout`; S ძველი შექება ბანერში არ ჩანს; T `md:max-w-2xl` მხოლოდ გაყოფაზეა
- დამოუკიდებლად გაშვებული მუტაციები (Claude, fresh clone, `8a1d394`): `resetDivisionState` ამოღება, `isDivisionFilled` შემოწმებების ამოღება (ორივე ადგილას ერთად — ტესტი L ჩაიჭრა; ერთ-ერთის ცალკე ამოღება არ ჩაიჭრება, რადგან შემოწმება ორ ადგილას დუბლირებულია, ეს არ არის ტესტის ხვრელი), `getDivisionLayoutForProblem`-ის try/catch, Header-ის ტოტი, `wishBlockSize`, `!isDivisionMode` generic ფორმაზე, `clearTimeout`, ფოკუსის ტოტი — ყველა ჩაიჭრა; `shouldRecord` swap (`hasFailedThisDivision` ↔ `hasFailedCurrentQuestion`) ეკვივალენტური მუტაციაა (ორივე flag ერთნაირად იწერება), არა ხვრელი

### გაკვეთილები გაყოფის Wave-იდან
1. **AI Studio-ს რეპორტი ისევ არაზუსტი იყო:** 3b/3c-ში ზოგი რიცხვი და ფაილის ცვლილება რეალურ commit-ს არ ემთხვეოდა (3c: "App.tsx შეიცვალა და ცარიელი სტრიქონი წაშალაო", რეალურად `App.tsx` commit-ში არ მოხვდა; 3c/3d: "4 ტესტი ჩავარდა ორაკულზეო", ჩვენთან 410/410 გადიოდა). Commit 3b-ში აღწერილი ტესტი S საერთოდ არ დამატებულა (ChatGPT-მ დაიჭირა) და ცალკე Commit 3c-ში დაემატა.
2. **ტესტი S-ის მსგავსი რეგრესიული ტესტი უნდა ვარდებოდეს შესაბამის მუტაციაზე** — მუდმივი წესი (111a659-ის გაკვეთილის გაგრძელება).
3. **ზომების გაზომვა ყველა breakpoint-ზე, არა მხოლოდ მიზნობრივზე** (იხ. ზემოთ).
4. **ZIP-ის ჩანაცვლებისას ორაკული შეიძლება შეიცვალოს/დაბრუნდეს ძველზე:** ყოველი ჩანაცვლების შემდეგ `sha256sum utils/columnDivision.oracle.test.ts` და `git status`; commit-ში ფაილები სახელებით ემატება, `git add -A`-ის გარეშე (`oracle-change.diff`/`test-out.txt` მსგავსი დროებითი ფაილების გამო). `npm install` ცვლის `package-lock.json`-ს — commit-მდე `git restore package-lock.json`.

---

## საკვანძო არქიტექტურული გადაწყვეტილებები (არ შეიცვალოს განხილვის გარეშე)

- DB schema (production-ის ფაქტობრივი მდგომარეობა, Supabase-ში): 5 table (`profiles`, `children`, `game_sessions`, `wishes`, `child_reward_images`) + `pin_hash` column ორივე `profiles`/`children`-ზე (განზრახ nullable) + `wishes.status`/`wish_parent_note`/`image_parent_note`/`proposed_image_path` (Wave Y). **Source of truth DB-ის სტრუქტურისთვის არის production Supabase, არა `supabase/schema.sql`** (იხ. Schema drift)
- useGameSession(gameMode, childId) — mode-აგნოსტიკური
- Guest Mode არ არსებობს
- 40-question rolling window — ხელუხლებელი
- Race-condition-ების დამტკიცებული idiom: `requestIdRef` generation-counter — Commit #1, Commit #10, Wave 3 Part 2, Wave Y-ის ორივე ახალი hook
- Stale-closure-ის დამტკიცებული idiom: `useRef` + `useEffect` sync callback-ისთვის, რომელიც `setInterval`/`setTimeout`-ში რეგისტრირდება და ცვლად state-ზეა დამოკიდებული (Wave X Post-fix, `useTimer.ts`)
- Per-name static content (Record<string,string>) vs. per-child DB storage — კრიტერიუმი: სახელის/ცნების თვისება → static repo-ფაილი; კონკრეტული ბავშვის ინდივიდუალური მონაცემი → DB table
- Schema-migration-ის დამტკიცებული pattern: `ADD COLUMN (nullable) → backfill → verify count=0 → SET NOT NULL → CHECK` — Commit #6A-ში დამტკიცებული; Wave X-ში (pin_hash) და Wave Y-ში (wishes.status — ძველი production მონაცემის კოლაფსი ახალ ტერმინალურ მნიშვნელობაში) ორივეგან **განზრახ, საკუთარი მიზეზით, არ გამოყენებულა ზუსტად ეს pattern** — თითოეული გადაწყვეტილების მიზეზი საკუთარ სექციაშია
- Production migration (DB/Storage/RLS SQL) — ყოველთვის Lexo-ს ხელით, Supabase Dashboard/SQL editor-იდან; AI Studio-ს არასდროს გადაეცემა ეს პასუხისმგებლობა
- **PIN gate — client-side UI identity-gate, არა DB-level access-control.** RLS ოჯახის მასშტაბით ღიაა. Parent და child mode ერთსა და იმავე `auth.uid()`-ს იზიარებენ — **ამიტომ ნებისმიერი "მხოლოდ მშობლისთვის"/"მხოლოდ ბავშვისთვის" მონაცემი მხოლოდ query-level column-selection-ით/UI-ით არის დაცვადი, არასდროს RLS/Storage-policy-ით** (Wave Y Storage Discovery) **დაზუსტება: query projection (ცხადი column-ების არჩევა) და UI-ფილტრი არის შემთხვევითი გამჟღავნებისგან დაცვის ზომები (ბავშვმა ჩვეულებრივი გამოყენებისას არ ნახოს მშობლის/Lexo-ს მონაცემი), და არა server-side authorization.** ტექნიკურად ცნობიერ ბავშვს (DevTools, პირდაპირი Supabase request იმავე სესიით) შეუძლია ოჯახის ნებისმიერი მონაცემის წაკითხვა. Parent და Child ერთი auth identity-ით მუშაობის ეს შეგნებული შეზღუდვა უცვლელია; მისი მოხსნა (ცალკე auth identity ბავშვისთვის ან server-side წესები) ცალკე არქიტექტურული გადაწყვეტილებაა და ახლა არ იგეგმება
- **PIN-ის გარეშე identity-switch აკრძალულია architecture-ის დონეზე**
- **Wave Y-ის wishes-workflow**: 7-state machine (`wish_pending/wish_approved/wish_rejected/image_pending/image_approved/image_rejected/published`), **ერთი ბავშვის მრავალი ერთდროული wish განზრახ დაშვებულია** (არა DB-constraint), **rejected wish resubmit-ავს იმავე row-ს** (არა ახალი row+FK), **`image_approved→published` მუდმივად Lexo-ს ხელით ოპერაციაა**
- **`select('*')` აკრძალულია ნებისმიერ query-ზე, რომლის შედეგი child-mode-ის (ან ზოგადად ნაკლებად-პრივილეგირებული mode-ის) React state-ში შეიძლება მოხვდეს** — ცხადი column-ების ჩამონათვალი ყოველთვის სავალდებულოა (ეს query-level დაცვა ხელს უშლის მხოლოდ შემთხვევით გამჟღავნებას/ჩვეულებრივ UI-ში გამოჩენას; server-side authorization არ არის — იხ. PIN gate-ის დაზუსტება ზემოთ)
- **🔴 Service worker (`public/sw.js`) არასდროს არ უნდა cache-ავდეს cross-origin (Supabase) request-ს** — მხოლოდ საკუთარი origin-ის static assets/navigate. ეს production security incident-იდან (Wave Y) ნასწავლი, mandatory წესია ნებისმიერი მომავალი `sw.js`-ის ცვლილებისთვის
- **AI Studio ZIP revert risk** — ვრცელდება ნებისმიერ ფაილზე, რომელიც git-ში/GitHub-ზე იცვლება AI Studio-ს ZIP workflow-ის გარეთ. ყოველი ასეთი ცვლილების შემდეგ, განახლებული ფაილი ხელით უნდა აიტვირთოს AI Studio-ს project-შიც
- **AI Studio-ს საბოლოო report-ს არასდროს ვენდობით ბრმად** — ყოველი commit fresh-clone-ით, დამოუკიდებლად მოწმდება (hash, scope/diff, tsc, vitest, build). Wave Y-ში ორჯერ დადასტურდა, რომ ეს წესი რეალურ ღირებულებას იძლევა (Stage 1-ის scope-განხილვა, UI-rename-ის report-ში არარსებული ცვლილების ხსენება)
- Auto-pause mitigation: GitHub Actions scheduled workflow (`.github/workflows/keep-supabase-alive.yml`) — ✅ დანერგილია, push-ილია, manual test-run წარმატებული
- **Supabase update/delete-ის წარმატება არასდროს მოწმდება მხოლოდ error-ით.** ყოველთვის .select('id') + row count (0 row error-ს არ აბრუნებს, RLS-ით გაფილტრული ან არარსებული row ჩუმად ჩავარდება).
- **NULL pin_hash ≠ "PIN არ არის საჭირო".** NULL ნიშნავს "არ არის კონფიგურირებული" და წვდომას არასდროს იძლევა (fail-closed). query error არასდროს იგივდება NULL-თან.
- **ანგარიშის პაროლის ხელახალი გადამოწმება PinGate-ში** ხდება დროებითი, ცალკე client-ით და არა მთავარით, რათა არსებული auth lifecycle (onAuthStateChange, ensureProfileExists, ChildContext) არ შეიცვალოს.
- **Table Editor-ში profiles-დან row-ის წაშლა auth.users-ს არ შლის.** ანგარიშის წასაშლელად: Authentication → Users → Delete user (cascade: profiles → children). Storage ფაილები (child-reward-images) cascade-ით არ იშლება.

- **Regression ტესტი ბაგს უნდა აფიქსირებდეს: სავალდებულოა დამოუკიდებლად დადასტურდეს, რომ ახალი ტესტი parent commit-ის წარმოების კოდზე ვარდება** (111a659-ის გაკვეთილი — პირველი ტესტები ძველ კოდზეც გადიოდა). AI Studio-ს prompt-ში "Step 0": ტესტი ჯერ კოდის შეცვლამდე ჩავარდეს და ჩავარდნის ტექსტი report-ში ჩაიწეროს.
- **Session flush ინვარიანტი:** ერთი `sessionId`-ისთვის "completed" flush მაქსიმუმ ერთხელ (`flushedSessionIdRef`). `isCompletedRef`-ის სემანტიკა (ახალი სესიისთვის `false`-ზე დაბრუნება) არ იცვლება.
- **`resetSession()` არ ეხება rolling window-ს** (localStorage). `gameProgress:${childId}:${gameMode}` იშლება მხოლოდ wish-ის კვალიფიკაციისას.
- **ბლოკის UI-state ნულდება** 🏠-ზე, თამაშის შეცვლაზე და ბავშვის შეცვლაზე (`resetBlockUIState`); `isPerfectBlock` ახალ ბლოკზე `true`-ა.
- **Dashboard ითვლის ყველა `game_sessions` row-ს სტატუსის მიუხედავად.** `active` row ავტომატურად არასდროს გადადის `completed`-ში (არც heuristic-ით, არც ახალი status-ით). ნებისმიერი მომავალი "completed-only" მეტრიკა (მაგ. საშუალო duration) მკაფიოდ უნდა ფილტრავდეს.
- **`beforeunload`/keepalive best-effort-ია** (განსაკუთრებით მობილურზე, WebView-ში, ინკოგნიტოში). ტერმინალური "completed" მხოლოდ საიმედო გზებით (🏠, mode-ის შეცვლა) არის გარანტირებული.
- **localStorage თითო origin-ზეა:** შესვლის სესია, არჩეული ბავშვი და rolling window არ გადადის GitHub Pages ↔ Vercel ↔ APK-ს შორის (სერვერზე შენახული სესიები/სურვილები საერთოა). ერთი ბავშვი ერთ URL-ზე უნდა თამაშობდეს; ერთი "canonical" URL, Supabase Auth Site URL-ში იგივე.
- **AI Studio ვერ ხედავს GitHub-ის commit-ებს** (ის თავისი ასლით მუშაობს). prompt-ებში საბაზო მდგომარეობა მოწმდება **შიგთავსით** ("App.tsx შეიცავს resetBlockUIState-ს"), არა commit hash-ით. AI Studio-ს report-ის diff-stat რიცხვები არაერთხელ არ ემთხვეოდა რეალურს — ვენდობით მხოლოდ დამოუკიდებელ `git diff`-ს.

- **ქვეშმიწერით გაყოფა (`Kveshdivision`) — დაცული ინვარიანტები:** (ა) გაყოფის ლოგიკა (`utils/columnDivision.ts`) იცვლება მხოლოდ სპეციფიკაციის შეცვლით და ორაკულის (`columnDivision.oracle.test.ts`, SHA-256 Current Checkpoint-შია) გავლით; ორაკული არასდროს ეძლევა AI Studio-ს და არასდროს იცვლება ტესტის გასავლელად; (ბ) `getDivisionLayoutForProblem` არასდროს ისვრის — რეჟიმის გადართვისას ერთი რენდერით "ძველი" `problem` დასაშვებია და უნდა ჩანდეს როგორც `იტვირთება...`, არა crash; (გ) `Header.tsx`-ში ყოველ `GameMode`-ს ცხადი ტოტი აქვს (ხუთივე რეჟიმი; ჯაჭვის default ახლა `''`-ია, `main`-ზე გადამოწმებულია). Commit 3-მდე default იყო "ქვეშმიწერით გამრავლება ✍️", რის გამოც ახალი რეჟიმი ჩუმად არასწორ ტექსტს აჩვენებდა; ახალი `GameMode`-ის დამატებისას ცხადი ტოტი და მისი ტესტი (`components/Header.test.tsx`) აუცილებლად დაემატოს; (დ) გაყოფაზე ერთი ამოცანა ერთხელ იწერება `recordAnswer`-ით (`hasFailedThisDivision`); (ე) გაყოფის ბანერს App-იდან `currentMessage` არ გადაეცემა (`currentMessage=""`), რომ წინა ამოცანის შექება არ გამოჩნდეს; (ვ) გაყოფის ბარათი `md:`-ზე `md:max-w-2xl`-ია და უჯრები ერთი და იგივე className-ით ყველა უჯრაზე (4-ნიშნა ცხრილი 360px-ზე 294px, ≥768px-ზე 530px; ტესტი T იცავს `md:max-w-2xl`-ს)
- **ახალი `GameMode`-ის დამატების ჩეკლისტი** (გაყოფის გამოცდილებიდან): `types.ts`, `services/problemGenerator.ts`, `utils/gameModeLabels.ts`, `utils/wishBlockSize.ts`, `MainMenu.tsx`, `Header.tsx` (ცალკე ტოტი!), `App.tsx`-ის ყველა `GameMode.Kveshmicera` ადგილი (7 ადგილი: state-reset, ფოკუსი, `shouldRecord`, არასწორი პასუხის early-return, submit, render, generic ფორმა), Dashboard-ის breakdown ლეიბლი; DB-ს `game_mode` CHECK constraint არ აქვს და migration საჭირო არ არის

## დაგეგმილი მომდევნო Wave-ები (პრიორიტეტის მიხედვით)

### Wave "grade-range" (კლასის მიხედვით რიცხვითი დიაპაზონი) — შემდეგი პრიორიტეტი, ყველაზე სენსიტიური (problemGenerator.ts-ის ცენტრალურ ლოგიკას ეხება)

### PLANNED (არ დაწყებულა) — გაყოფასთან და Kveshmicera-სთან დაკავშირებული
- Kveshmicera-ს ფიქსირებული 3 რიგი × 4 უჯრა განზოგადება, როცა 3-ნიშნა გამრავლება დაემატება (Lexo-ს გადაწყვეტილება: ახლა არ ვეხებით)
- გაყოფა: 5-ნიშნა გასაყოფი; ნაშთიანი გაყოფა — ორივე გადადებულია
- გაყოფა და Wave "grade-range": გაყოფას საკუთარი გენერატორი აქვს (`divisionProblemGenerator.ts`, ფიქსირებული დიაპაზონი); grade-range Wave-მა უნდა გადაწყვიტოს, ჩაერთვება თუ არა

### Wave "word problems" — grade-range-ის შემდეგ

### ახალი საგნები + hint/explanation-ფუნქციები — Phase 3-ის მთლიანად დასრულების შემდეგ

## ცნობილი, განზრახ გადადებული საკითხები

- `SUPER_WINNER_GIFS`-ის დუბლირებული caption — გადაწყვეტილი, აღარ აქტუალური
- ~~`game_sessions`-ის stuck `'active'`-row~~ ✅ გამოკვლეულია: მიზეზი — beforeunload-ის არასაიმედოობა; გადაწყვეტა — Dashboard ითვლის ყველა row-ს (b28cb05)
- Vercel/APK (webintoapp) გადაწყვეტილება — ჯერ არ მიღებულა; ამჟამად ყველა GitHub Pages ლინკს იყენებს. იხ. localStorage-per-origin წესი ზემოთ
- ~~**Kveshmicera-ს ძველი შექება შეცდომის ბანერში**~~ ✅ **დახურული** — fix `096fb463`, regression Test J red/green/mutation დადასტურებულია (იხ. სექცია "Kveshmicera Banner Regression Fix"). ეს აღარ არის ღია პრობლემა
- **Schema drift: `supabase/schema.sql` ≠ production (გადამოწმებულია `549f654`-ზე).** repo-ს ფაილი მხოლოდ 4 `CREATE TABLE`-ს შეიცავს (`profiles`, `children`, `game_sessions`, `wishes`); `child_reward_images` ცხრილი და Storage bucket/policies ფაილში არ არის. `wishes`-ის განსაზღვრებაში ჯერ კიდევ ძველი `status DEFAULT 'pending'` და `CHECK (status IN ('pending','fulfilled'))` წერია და არ არის `wish_parent_note`, `image_parent_note`, `proposed_image_path`; production-ში ეს Wave Y-ის ხელით გაშვებული migration-ებით უკვე შეცვლილია (7-state `wishes_status_check`, ახალი სვეტები, `child_reward_images`, storage policies). `children` და `profiles` ფაილში `pin_hash`/`gender`-ს შეიცავს; `game_sessions.game_mode`-ს CHECK არც ფაილში და არც production-ში არ აქვს (production-ში SQL-ით დადასტურებულია). **შედეგი:** ახალი გარემოს `schema.sql`-ით აწყობა არასწორ/არასრულ DB-ს მოგვცემს. **წესი:** DB-ის ფაქტობრივი სტრუქტურისთვის source of truth არის production Supabase (`pg_policies`, `information_schema`); `schema.sql`-ის სინქრონიზაცია ცალკე, ხელით დამტკიცებულ ამოცანად დგას (production migration-ების წესის მიხედვით), ამ დოკუმენტის განახლებისას კოდი/schema არ შეცვლილა
- **`package-lock.json` სინქრონში არ არის `package.json`-თან** (დაბალი პრიორიტეტი): `npm ci --dry-run` ვარდება (გადამოწმებულია `549f654`-ზე); CI (`deploy.yml`) იყენებს `npm install`-ს, ამიტომ deploy არ ზიანდება; `npm install` ფაილს ცვლის, ამიტომ commit-მდე `git restore package-lock.json`. რეპოში `bun.lock`-იც არსებობს — მისი დანიშნულება დოკუმენტში არ დადასტურებულა
- `metadata.json`-ის description ისევ "...თომასთვის"-ს ახსენებს (გადამოწმებულია `549f654`-ზე) — დაბალი პრიორიტეტი
- გაყოფა: 320px-იან ძალიან პატარა ეკრანზე 4-ნიშნა ცხრილი შიდა ჰორიზონტალურ სქროლს იძლევა (28px უჯრებზე ზღვარი 360px-ზე 26px-ია, 320px-ზე არ ჯდება) — მისაღებად ითვლება
- გაყოფა: Dashboard-ში ლეიბლის ცოცხალი შემოწმება და ტელეფონზე/APK-ში გამოცდა — ✅ VERIFIED (Lexo-ს განცხადებით 2026-10-12)
- Backup-სტრატეგია — ინფორმირებული, კონკრეტული გეგმა ჯერ არ არის; launch-მდე რეკომენდებული
- კომერციალიზაცია (Georgia-first) — მომავალი ეტაპი, ჯერ არ აქტუალური 10-ბავშვიანი launch-ისთვის
- **AI Studio-ს სამუშაო ასლის / `PROJECT_STATE.md`-ის სინქრონიზაცია** — **მომდევნო implementation-მდე აუცილებელი preflight**: GitHub `main`-ის მიმდინარე approved snapshot, ახალი docs commit, ტესტების რაოდენობა და ორაკულის ჰეში შეადარე სამუშაო/ZIP ასლს; წინა fix-ის რეპორტში 48/401 და არასწორი hash გამოვლინდა (ზუსტი მიზეზი დაუდგენელია). ყოველი docs commit-ის შემდეგ ახალი `PROJECT_STATE.md` ხელით განახლდეს AI Studio-ს project-შიც; stale ZIP-ით GitHub-ის ახალი ფაილები არ გადაიწეროს
- **`image_approved → published`-ის manual ოპერაცია** (Wave Y) — ყოველი დამტკიცებული სურათისთვის Lexo-მ თავად უნდა შეამოწმოს Supabase Table Editor/SQL Editor, push notification არ არსებობს. Saved query/view `wish_approved`/`image_rejected`/`image_approved` status-ებისთვის რეკომენდებულია, ჯერ არ შექმნილა

## Production Launch-ის მდგომარეობა (~10 ახლობელი ბავშვი)

**რეალურად ბლოკავს:** არაფერი ცნობილი. **Release verification ✅ VERIFIED** (Lexo-ს განცხადებით 2026-10-12): გაყოფა `main`-შია, deploy, 360px და ტელეფონი/APK Lexo-მ შეამოწმა — იხ. Current Checkpoint.

**launch-მდე ერთჯერადი მოქმედებები:**
- სატესტო ანგარიშების წაშლა (Supabase Dashboard → Authentication → Users). წაშლის შემდეგ შეამოწმე, რომ მათი `children`, `game_sessions`, `wishes` ჩანაწერებიც წაიშალა და `child-reward-images` bucket-ში (მათ შორის `pending`-ქვესაქაღალდეებში) სატესტო სურათები არ დარჩა
- სრული ნამდვილი ნაკადის ერთხელ გავლა ახალი ანგარიშით: რეგისტრაცია PIN-ით → ბავშვის დამატება PIN-ით → ბავშვის PIN-ით შესვლა და თამაში → wish-ის დაწერა → მშობლის PIN-ით შესვლა, Inbox, დადასტურება/უარყოფა → სურათის ატვირთვა/დადასტურება → `published`-ის ხელით დასმა
- **ყველა ტესტ-browser-ში service worker-ის hard-refresh/unregister** (security fix-ის commit-ის შემდეგ) — ძველი, დაზიანებული cache-ლოგიკის მქონე service worker-ები ხელით უნდა ჩანაცვლდეს
- sw.js-ის CACHE_NAME ახლა v7 და ახალი deploy-ის შემდეგ stale-while-revalidate ძველ bundle-ს ერთხელ კიდევ აჩვენებს. ყოველი კრიტიკული deploy-ის შემდეგ ტესტი ინკოგნიტოში ან Unregister + Clear site data-ის შემდეგ.

**აღარ ბლოკავს (ამ conversation-ის ფარგლებში დასრულებული):**
- ~~Wave X (PIN gate)~~ ✅ დასრულებულია
- ~~`migrated_prompt_history/` წაშლა~~ ✅ დასრულებულია
- ~~Auto-pause mitigation~~ ✅ დანერგილია და დადასტურებულია
- ~~pin_hash backfill/NOT NULL-CHECK~~ ✅ აღარ არის საჭირო
- ~~Wave Y (Wish Approval Workflow)~~ ✅ დასრულებულია, Stage 1-3c
- ~~Service Worker cross-origin cache leak~~ ✅ გასწორებულია (commit 1f3e969)
- ~~UI-ტექსტის გადარქმევა~~ ✅ დასრულებულია

**არ ბლოკავს, მაგრამ რეკომენდებულია launch-მდე ან პარალელურად:**
- Backup-სტრატეგია
- `metadata.json`-ის description-ის განახლება
- Saved query/view Lexo-ს image-approval სამუშაო რიგისთვის (Wave Y manual ნაბიჯების გასამარტივებლად)

**Webintoapp.com (native app wrapper):** APK შექმნილია და GitHub Pages URL-ს იყენებს. გაყოფის რეჟიმი APK-ში/ტელეფონზე შემოწმებულია — ✅ VERIFIED (Lexo-ს განცხადებით 2026-10-12, Claude-ს დამოუკიდებლად არ გადაუმოწმებია). ტექნიკურად wrapper პასიურია (APK უბრალოდ ფანჯარაა მითითებულ URL-ზე და ავტომატურად იღებს ახალ deploy-ს), მაგრამ Android WebView-ში beforeunload/visibilitychange ნაკლებად საიმედოა → მეტი "active" row (Dashboard ახლა მათაც ითვლის). სრული flow-ის (PIN gate-ისა და Wave Y-ის wish-ციკლის ჩათვლით) ტესტი ერთი ბავშვით დისტრიბუციამდე კვლავ გონივრულია.

## Workflow (როგორ ვმუშაობთ)

> **განახლება 2026-10-12:** როლების მიმდინარე განაწილება და 12-ნაბიჯიანი პროცესი — დოკუმენტის დასაწყისში ("როლები და სამუშაო პროცესი"). ქვემოთ ჩამოთვლილი ძველი სია ისტორიულია იმ ნაწილში, სადაც Claude წერდა prompt-ებს; დანარჩენი წესები (fresh-clone ვერიფიკაცია, AI Studio-ს რეპორტის უნდობლობა, ხელით migration-ები) ძალაშია.

1. AI Studio (Gemini) წერს კოდს პატარა, ინკრემენტულ commit-ებად, ZIP export/import-ით
2. Claude ამოწმებს დამოუკიდებლად (ახალ როლში — ChatGPT-ის გეგმასა და რეალურ commit-ს), fresh-clone-ით (hash, `git diff --stat` scope-შემოწმება, tsc, vitest, build) — **არასდროს** ენდობა AI Studio-ს თვითმოხსენებას, თუნდაც report დეტალური/დარწმუნებული ჩანდეს
3. ChatGPT აკეთებს დამოუკიდებელ cross-review-ს არქიტექტურული გადაწყვეტილებების დონეზე (არა ყოველი მექანიკური/text-only commit-ისთვის)
4. ორივეს შენიშვნები ერთიანდება საბოლოო implementation prompt-ში
5. Lexo იღებს საბოლოო გადაწყვეტილებას; DB/Storage/RLS migrations — ყოველთვის ხელით, SQL editor-იდან; client-კოდის ცვლილებები — AI Studio-დან, ლოკალურად
6. ყოველი Wave-ის/მნიშვნელოვანი commit-ის დასრულებისას **ChatGPT ამზადებს ამ დოკუმენტის განახლებას**, Claude დამოუკიდებლად ამოწმებს, Lexo ამტკიცებს და ცალკე docs commit-ით push-ავს
7. ამ ფაილის ყოველი ხელით/git-ით განახლების შემდეგ, განახლებული ვერსია ხელით აიტვირთება AI Studio-ს project-შიც; სანამ შემდეგი prompt გაიგზავნება, სამუშაო ასლის შესაბამისობა ახალ `main`-თან მოწმდება

**Lexo-ს სამუშაო კონტექსტი:** არ იცნობს SQL-ს ან Supabase-ის dashboard-ს — ყოველი ტექნიკური ნაბიჯი დეტალურად, ეტაპ-ეტაპად აღსაწერია.

## შემდეგი ნაბიჯი

**კოდის ბოლო დამტკიცებული review checkpoint:** `096fb463` (Kveshmicera Banner Regression Fix), 49 ფაილი / **411/411 ტესტი**, tsc 0, build წარმატებული, GitHub Pages deploy წარმატებული. ChatGPT და Claude: APPROVED. შემდეგი ნაბიჯები ამ დოკუმენტის მომზადების მომენტისთვის:

1. **Lexo — საბოლოო checkpoint-ის დადასტურება:** code review მიღებულია; თუ Lexo ეთანხმება, `096fb463` გახდება ოფიციალური პროექტის checkpoint. ახალი gameplay feature არ არის დაწყებული.
2. **`PROJECT_STATE.md` — ცალკე docs commit:** ChatGPT-ის ეს განახლება Claude-მა დამოუკიდებლად უნდა გადაამოწმოს; Lexo ამტკიცებს, repo-ს `PROJECT_STATE.md`-ს ანაცვლებს და commit/push-ს აკეთებს **მხოლოდ ამ ფაილზე**. შემდეგ შეამოწმოს GitHub-ზე, რომ historical sections არ დაკარგულა.
3. **AI Studio-ს გარემოს სინქრონიზაცია — gate:** GitHub-ის **docs commit-ის შემდეგ** არსებული `main` ავიღოთ canonical source-ად. AI Studio-ს workspace/export შევადაროთ შესაბამის ფაილებსა და ტესტების რაოდენობას; დადასტურებულ ორაკულს SHA-256 უნდა ჰქონდეს `ecf26a7aa60beb7ae49d7c9ec68a7df6ffb20d5c1e5ea92f9738a5e153bcdd08`. AI Studio-ში ხელით აიტვირთოს ახალი `PROJECT_STATE.md` და საჭირო ახალი ფაილები. **დაცული ორაკული AI Studio-ს შესაცვლელად არ მიეცეს.** თუ ხარვეზი აღმოჩნდება, ახალი implementation STOP მის მოგვარებამდე.
4. **Pre-Launch ერთჯერადი შემოწმებები:** წინა release verification (`549f654`) ჩატარებულია Lexo-ს მიერ; ამ ახალ `096fb463` fix-ზე სურვილისამებრ ხელით გავიაროთ Q1 სწორი → Q2 არასწორი მობილურზე. ძირითადი გახსნილი checklist: backup/restore-გეგმა, სატესტო ანგარიშების უსაფრთხო წაშლა, ახალი ანგარიშით სრული PIN → gameplay → wish → parent approval → publish flow, service-worker/cache cross-account smoke test, canonical URL (GitHub Pages vs Vercel) გადაწყვეტილება. GitHub Pages-ის დატოვება მიმდინარე მცირე pilot-ისთვის მისაღები ვარიანტია; ჰოსტინგის ცვლილება ჯერ არ არის დამტკიცებული.
5. **`feature/long-division` ბრანჩის წაშლა** სურვილისამებრ (უკვე merge-ებულია `549f654`-ში).
6. **Wave `grade-range` — მხოლოდ planning/architecture review**, AI Studio-ში implementation prompt არ გაიგზავნოს ამ checkpoint-ის, docs commit-ის და workspace-sync-ის დასრულებამდე; შემდეგ განისაზღვროს, შეეხება თუ არა ცალკე `divisionProblemGenerator.ts`-საც. `word problems` უფრო გვიან.

[ახალი chat-სესიისთვის: ეს ფაილი აიტვირთოს ChatGPT-ისა და Claude-ის Project-ებში, **და** AI Studio-ს project-ში. GitHub-ის ახალი docs commit და AI Studio workspace ცალ-ცალკე უნდა გადაიმოწმოს (ZIP revert risk). ამ დოკუმენტს მუდმივად **ChatGPT ამზადებს, Claude ამოწმებს, Lexo ამტკიცებს**, თუ Lexo როლებს არ შეცვლის. Repo-ში განახლება მხოლოდ Lexo-ს დამტკიცების შემდეგ: `git add PROJECT_STATE.md && git commit -m "docs: update project state after Kveshmicera banner fix" && git push`.]
