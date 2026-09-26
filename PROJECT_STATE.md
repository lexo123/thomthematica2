# thomthematica2 — Project State

_ბოლო განახლება: Wave 3 (Part 1 + Part 2) სრულად დასრულებული და დადასტურებული; PIN-based Parent/Child Identity Gate — architecture დამტკიცებულია Claude-ისა და ChatGPT-ის მიერ, ჯერ არ დაწყებულა implementation_

## Repo
https://github.com/lexo123/thomthematica2

## პროექტის მოკლე აღწერა
React/TypeScript საგანმანათლებლო მათემატიკის აპლიკაცია ბავშვებისთვის, თავდაპირველად აშენებული ერთი ბავშვისთვის (thomthematica), ახლა გადადის multi-user/Parent→Child მოდელზე Supabase-ის (Auth + Postgres + RLS) გამოყენებით. კოდი იწერება Google AI Studio-ს (Gemini) მიერ vibe-coding მიდგომით; Claude და ChatGPT ცალ-ცალკე აკეთებენ code review-ს ყოველ commit-ზე, სანამ შემდეგი ეტაპი დაიწყება. Lexo — project manager/reviewer, არა კოდის ავტორი. **პროექტი ახლოვდება production launch-ს — თავდაპირველად ~10 ახლობელი ბავშვისთვის.**

## დასრულებული ფაზები

### Phase 1: Authentication ✅
- Supabase Auth (email/password), AuthContext.tsx, AuthModal.tsx
- Password recovery flow (PASSWORD_RECOVERY event handling, UpdatePasswordModal.tsx)
- supabase/schema.sql — 4 table: profiles, children, game_sessions, wishes
- RLS policies ყველა ცხრილზე, WITH CHECK კლაუზებით (არა მხოლოდ USING)
- updated_at auto-update trigger (BEFORE UPDATE) — საჭირო abandoned-session დეტექციისთვის
- handle_new_user() trigger — ავტომატური profiles row auth.users insert-ზე
- lib/ensureProfile.ts — client-side self-healing fallback (ON CONFLICT DO NOTHING, legacy ანგარიშებისთვის)
- profiles-ს არ აქვს client-side DELETE policy (განზრახ — account deletion მხოლოდ Edge Function-ით)

### Phase 2.1: Child Profiles & Selector ✅
- ChildContext.tsx — activeChildId-ის ერთადერთი წყარო, localStorage persistence
- Self-healing validation — თუ activeChildId აღარ არსებობს childrenList-ში, სუფთავდება
- ChildSelector.tsx — "ვინ თამაშობს?" UI, Guest Mode-ისთვის არ ჩნდება

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
- 59/59 ტესტი

### Phase 3 — Commit #1 (Parent Dashboard: Data/Read/Derivation Layer) ✅
- **Core rule**: Dashboard — read-only derived-data layer, ახალი statistics data model/schema არ ემატება
- fetchChildSessionsForAggregate, fetchChildSessionsRecent (bounded `.limit(20)`), deriveDashboardStats (pure, division-by-zero-დაცული)
- **ChatGPT-მ აღმოაჩინა race condition**: stale-response guard მხოლოდ childId-ს ამოწმებდა — ვერ იცავდა A→B→A double-switch-ისგან. **Claude-მ დამოუკიდებლად დაადასტურა** — red→green ციკლით. გასწორდა `requestIdRef` generation-counter-ით — **ეს არის ის pattern, რომელიც მოგვიანებით Wave 2-ში (Commit #10) და Wave 3 Part 2-ში (reward-images fetcher) ხელახლა იქნა გამოყენებული**
- 78/78 ტესტი

### Phase 3 — Commit #2 (Parent Dashboard UI) ✅
- `showDashboard` state ლოკალურად MainMenu.tsx-ში, body-level conditional (არა overlay)
- explicit rendering priority chain, useChildDashboard(childId) ყოველთვის უპირობოდ გამოძახებული (Rules of Hooks)
- 88/88 ტესტი

### Phase 3 — Commit #3 (gameModeLabels.ts Shared Util Refactor) ✅
- `utils/gameModeLabels.ts` — `GAME_MODE_LABELS` + `getGameModeLabel()`
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
- 150/150 ტესტი

### Phase 3 — Commit #6A (ბავშვის სქესის ველი: schema + registration) ✅
- Migration pattern: `ADD COLUMN (nullable) → backfill by id → verify → SET NOT NULL → CHECK` — **ეს pattern ხელახლა გამოყენებული იქნება PIN-Wave-ისთვის**
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
- **Storage:** private `child-reward-images` bucket, `{child_id}/{category}/{filename}` კონვენცია, storage RLS policy path-ის child_id-სეგმენტს **text-ად** ადარებს (არა `::uuid` cast — PostgreSQL AND/OR short-circuit evaluation გარანტირებული არ არის)
- **Signed URLs:** `createSignedUrls()` batch call, 2 საათის (7200წმ) expiry, `Map<storage_path, signedUrl>`-ით დაკავშირებული (არა პოზიციური ინდექსი)
- **All-or-nothing personalization:** სამივე კატეგორია (winner/loser/super_winner) ≥1 row, თორემ სრულად fallback — ორჯერ შემოწმებული (DB row-ების დონეზე + signed-URL-fetch-ის შემდეგ)
- **Prefetch lifecycle:** `hooks/useChildRewardImagesFetcher.ts` (requestIdRef guard) გამოძახებულია `ChildProvider`-ის კომპონენტის სხეულშივე, `childRewardImages` ემატება `ChildContextType`-ს
- **ResultOverlay.tsx:** დუბლირებული pool-ლოგიკა ჩანაცვლდა `utils/poolSelector.ts`-ით, pool-key `${activeChildId ?? 'global'}:${category}:${sourceType}` (sourceType='personalized'|'fallback' — აუცილებელია, თორემ fallback→personalized გადასვლისას pool-ის ძველი ინდექსები არასწორ, ახალ მასივზე გამოიყენება)
- **ვერიფიკაცია:** fresh clone, tsc 0 შეცდომა, vitest 28/28 file, 217/217 ტესტი, production build სუფთა
- **ორი უწყინარი, დაფიქსირებული deviation:** (1) AI Studio-მ STOP condition დაარღვია უწყინრად — Context hook-ს `useChild` ერქვა (არა `useChildContext`, როგორც prompt ვარაუდობდა), გაჩერების მაგივრად `useChildContext` alias დაამატა; (2) commit-ის თვითაღწერაში "218/218" წერია, რეალურად 217/217-ია (cosmetic)

### Post-Wave-3 Fixes ✅
- **Incorrect-phrase personalization ბაგი (commit ca9d72d):** `App.tsx`-ის incorrect-answer branch-ში `personalize()` არასდროს იძახებოდა (მხოლოდ correct-branch-ში იყო) — `{vocative}`/`{gender}` ლიტერალურად რჩებოდა ტექსტში ვერ-გამოცნობაზე. Fix: `personalize(template, activeChild).replace("[]", actualUserAnswer)`. დადასტურებული fresh-clone-ით.
- **`data/rewards.ts`-ის ჩანაცვლება (commit 80fb0bc):** ძველი, თომას პირადი ფოტო/გიფ-ლინკები (global fallback tier-ისთვის) სრულად ჩანაცვლდა ზოგადი სურათებით, ზოგადი caption-ებით ("ყოჩაღ, სწორია" / "ვერ გამოიცანი" / "ბრავისიმოოო!!!"). ეს კრიტიკული იყო Wave 3 Part 2-ის all-or-nothing წესის გამო — ნებისმიერი ბავშვი არასრული პერსონალიზაციით ხედავდა ამ fallback-ს.
- **`migrated_prompt_history/` წაშლა — გადაწყვეტილია, შესასრულებელი:** repo public-ია; ეს directory შეიცავს პირვანდელი ერთ-ბავშვიანი dev-პერიოდის სრულ AI Studio chat-ისტორიას (თომას სახელი ათეულობით ჯერ, ძველი Drive-ლინკები პირადი ფოტოებისკენ, პირადი/საოჯახო რეფერენსები). აპის მუშაობას არ ეხმაურება (მხოლოდ dev-history, AI Studio-ს ცალკე cloud-history-ისგან დამოუკიდებელი) — უსაფრთხოდ, ტერმინალით წასაშლელი (`git rm -r migrated_prompt_history/`). ასევე `metadata.json`-ის description ჯერ კვლავ ახსენებს თომას სახელს.

## საკვანძო არქიტექტურული გადაწყვეტილებები (არ შეიცვალოს განხილვის გარეშე)

- DB schema: 4 table იყო Wave 3 Part 2-მდე; Part 2-ით 5-მდე გაიზარდა (`child_reward_images`) — განზრახული, სრულად განხილული გადახვევა
- useGameSession(gameMode, childId) — mode-აგნოსტიკური
- Guest Mode არ არსებობს
- 40-question rolling window — ხელუხლებელი
- Race-condition-ების დამტკიცებული idiom: `requestIdRef` generation-counter — გამოყენებულია სამჯერ დამოუკიდებლად (Commit #1, Commit #10, Wave 3 Part 2 reward-images fetcher)
- Per-name static content (Record<string,string>) vs. per-child DB storage — კრიტერიუმი: სახელის/ცნების თვისება (გრამატიკა, ლეიბლები) → static repo-ფაილი; კონკრეტული ბავშვის ინდივიდუალური მონაცემი → DB table
- Schema-migration-ის დამტკიცებული pattern: `ADD COLUMN (nullable) → backfill → verify count=0 → SET NOT NULL → CHECK` (Commit #6A-ში დამტკიცებული, ხელახლა გამოსაყენებელია PIN-Wave-ისთვის)
- Production migration (DB/Storage/RLS SQL) — ყოველთვის Lexo-ს ხელით, Supabase Dashboard/SQL editor-იდან; AI Studio-ს არასდროს გადაეცემა ეს პასუხისმგებლობა — მხოლოდ client-კოდი
- Auto-pause mitigation: GitHub Actions scheduled workflow (`.github/workflows/keep-supabase-alive.yml`, ყოველ 3 დღეში) Supabase REST endpoint-ზე ping-ისთვის — გადაწყვეტილია, ჯერ არ დანერგილი

## დაგეგმილი მომდევნო Wave-ები (პრიორიტეტის მიხედვით)

### Wave X — PIN-based Parent/Child Identity Gate 🔵 (Architecture დამტკიცებული Claude + ChatGPT-ის მიერ, Implementation ჯერ არ დაწყებულა)

**მიზანი:** ბავშვმა ვერ შეძლოს Parent Dashboard-ში შესვლა იმავე authenticated (email/password) session-ში.

**შეგნებულად მიღებული შეზღუდვა:** ეს არის **client-side UI identity-gate, არა DB-level access-control**. RLS მთელ ოჯახზე (`parent_id = auth.uid()`) კვლავ ღიაა — PIN მხოლოდ განსაზღვრავს რა რენდერდება. ტექნიკურად ცნობიერი ბავშვი (DevTools) შემოვლადია — ეს გაცნობიერებული, მისაღები trade-off ოჯახური/ახლობელი-context-ისთვის (10 ბავშვი). რეალური მეორე auth-ფაქტორი (Edge Function-ზე დაფუძნებული) განზრახ არ არჩეულა — სირთულე/სარგებელი არაპროპორციულია ამ threat model-ისთვის.

**Flow:**
```
email/password (უცვლელი)
   ↓
PinGate (ახალი კომპონენტი)
   ├── parent PIN → sessionMode='parent' → ChildSelector + Dashboard ხელმისაწვდომია
   └── child PIN  → sessionMode='child', activeChildId ავტომატურად ("ატომურად",
                     არა შუალედური null-state) → პირდაპირ თამაში,
                     Dashboard-ის ღილაკი საერთოდ არ რენდერდება
"🔒 შეცვლა" ღილაკი → sessionMode=null, activeChildId=null → PinGate
Logout → sessionMode + activeChildId სრული reset (Parent A→B login-switch-ზეც)
```

**Schema (Commit #6A-ს pattern):**
```sql
ALTER TABLE profiles ADD COLUMN pin_hash text;  -- ჯერ nullable
ALTER TABLE children ADD COLUMN pin_hash text;  -- ჯერ nullable
-- Backfill: არსებულმა მშობელმა/ბავშვებმა ერთჯერადად დააყენონ PIN
-- Verify: count(*) WHERE pin_hash IS NULL → 0
-- SET NOT NULL orივე table-ზე
```

**საკვანძო დაფიქსირებული გადაწყვეტილებები:**
- PIN **სავალდებულოა** — არასდროს null/optional post-hoc; გამორიცხავს "PIN-ის გარეშე child-mode"-ის edge case-ს მთლიანად
- `pin_hash`, არა plaintext — თუმცა plain SHA-256(PIN) სუსტია 4-ციფრიან სივრცეზე (10,000 კომბინაცია, ტრივიალური brute-force) — მიზანი არის accidental/plaintext exposure-ის თავიდან აცილება, არა ძლიერი კრიპტოგრაფიული დაცვა (client-side validation-ის low-threat-model-ის გათვალისწინებით)
- `sessionMode` ცალკე Context-ში (**არა** ChildContext-ში ჩაშენებული) — ChildContext რჩება "რომელ ბავშვთან ვმუშაობთ", SessionModeContext — "ვინ არის შესული"
- PIN uniqueness ოჯახის (parent + ყველა შვილის) მასშტაბით — **application-level validation**, registration-ზეც და PIN-change-ზეც ორივეზე (DB UNIQUE constraint ორ table-ს შორის პირდაპირ ვერ აგვარებს)
- Dashboard-Parent PIN-ის წინააღმდეგობა გადაწყვეტილია ცალკე, ვიწრო-scope `PinManagementScreen`-ით (email/password-ით accessible, PIN-ის გარეშე) — **მხოლოდ** PIN-ის ნახვა/შეცვლა, **არავითარი** stats/wishes/Dashboard-კონტენტი — ეს არ არღვევს "ბავშვს Dashboard არ უნდა ჰქონდეს წვდომა" პრინციპს
- Logout ყოველთვის sessionMode-ს null-ზე აბრუნებს (Commit #10-ის login-switch-race-ის იგივე class-ის თავიდან ასაცილებლად)

**შემდეგი ნაბიჯი:** Implementation prompt ჯერ არ დაწერილა — architecture საბოლოოდ დაფიქსირებულია, მზადაა დეტალური spec-ისთვის.

### Wave Y — Wish Approval Workflow 🔵 (მონახაზი დახატული, Architecture Review არ დაწყებულა)

**მიზანი:** 20/40-კითხვიან block-ის ბოლოს ბავშვის მიერ ჩაწერილი სურვილი (wish) ჯერ მშობელს მიუვიდეს დასადასტურებლად, არა პირდაპირ.

**Schema-მონახაზი:**
```sql
ALTER TABLE wishes ADD COLUMN status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected'));
```

**Workflow-მონახაზი:** ბავშვის submission → `status='pending'` → Parent Dashboard-ში ახალი სექცია (pending wishes + approve/reject) → status-ცვლილება. **დადასტურება მხოლოდ status-ს ცვლის** — რეალური სურათის დამატება (`child_reward_images`) კვლავ ხელით რჩება Lexo-ს მხრიდან (Wave 3 Part 2-ის დაცული boundary უცვლელია, client-ს INSERT არ აქვს reward-images table-ზე).

**სტატუსი:** ჯერ Architecture Review არ დაწყებულა — PIN-Wave-ის შემდეგ დაგეგმილი.

## ცნობილი, განზრახ გადადებული საკითხები

- `SUPER_WINNER_GIFS`-ის დუბლირებული caption — **გადაწყვეტილი, აღარ აქტუალური**: სურათები ინდივიდუალურია თითო ბავშვისთვის, caption-დუბლირება აღარ არის პრობლემა
- კლასის მიხედვით რიცხვითი დიაპაზონი (Wave 4, ყოფილი "Wave 4") — **PIN-Wave-ისა და Wish-Approval-ის შემდეგ**, ყველაზე სენსიტიური (problemGenerator.ts-ის ცენტრალურ ლოგიკას ეხება)
- სიტყვიერი ამოცანები (Wave 5) — grade-range-ის შემდეგ განზრახ
- ახალი საგნები + hint/explanation-ფუნქციები — Phase 3-ის მთლიანად დასრულების შემდეგ
- `game_sessions`-ის ერთი stuck `'active'`-row — საჭიროებს ხელახალ ტესტირებას production launch-მდე
- `metadata.json`-ის description-ის განახლება (თომას სახელი) — `migrated_prompt_history/`-ის წაშლასთან ერთად
- Backup-სტრატეგია — ინფორმირებული, კონკრეტული გეგმა ჯერ არ არის; launch-მდე რეკომენდებული
- კომერციალიზაცია (Georgia-first) — მომავალი ეტაპი, ჯერ არ აქტუალური 10-ბავშვიანი launch-ისთვის

## Production Launch-ის მდგომარეობა (~10 ახლობელი ბავშვი)

**რეალურად ბლოკავს:**
1. Wave X (PIN gate) — child-ს Dashboard-წვდომის თავიდან ასაცილებლად
2. `migrated_prompt_history/` წაშლა — public repo-ზე თომას პირადი მონაცემების ექსპოზიცია
3. Auto-pause mitigation — GH Actions workflow-ის რეალურად დანერგვა (გადაწყვეტილება არსებობს, კოდი ჯერ არა)

**არ ბლოკავს, მაგრამ რეკომენდებულია launch-მდე ან პარალელურად:**
- Backup-სტრატეგია
- `game_sessions` stuck-row-ის ხელახალი ტესტირება

**Webintoapp.com (native app wrapper) გამოყენების გეგმა:** ტექნიკურად პასიური ცვლილება (localStorage/Page Visibility API-ის ქცევა ღირს ხელით ტესტირება ერთი ბავშვით სრულ flow-ზე, სანამ ყველას დაურიგდება) — Supabase auto-pause-ს არ ეხმიანება განსხვავებულად.

## Workflow (როგორ ვმუშაობთ)

1. AI Studio (Gemini) წერს კოდს პატარა, ინკრემენტულ commit-ებად, ZIP export/import-ით
2. Claude ამოწმებს დამოუკიდებლად, fresh-clone-ით (tsc, vitest, build) — არასდროს ენდობა AI Studio-ს თვითმოხსენებას
3. ChatGPT აკეთებს დამოუკიდებელ cross-review-ს
4. ორივეს შენიშვნები ერთიანდება საბოლოო implementation prompt-ში
5. Lexo იღებს საბოლოო გადაწყვეტილებას; DB/Storage/RLS migrations — ყოველთვის ხელით, SQL editor-იდან; client-კოდის ცვლილებები — AI Studio-დან, ლოკალურად (edit → git add → commit → push)
6. ყოველი Wave-ის/მნიშვნელოვანი commit-ის დასრულებისას ეს დოკუმენტი განახლდება

**Lexo-ს სამუშაო კონტექსტი:** არ იცნობს SQL-ს ან Supabase-ის dashboard-ს — ყოველი ტექნიკური ნაბიჯი დეტალურად, ეტაპ-ეტაპად აღსაწერია.

## შემდეგი ნაბიჯი

Wave 3 (Part 1 + Part 2) სრულად დასრულებული და დამოუკიდებლად დადასტურებულია. Production launch-ისთვის (~10 ბავშვი) რეალურად ბლოკავს სამი რამ: **Wave X (PIN gate)**, **`migrated_prompt_history/` წაშლა**, და **auto-pause GH Actions workflow**. რეკომენდებული თანმიმდევრობა: (1) `migrated_prompt_history/` წაშლა — უმარტივესი, დამოუკიდებელი; (2) GH Actions ping-workflow; (3) Wave X-ის დეტალური implementation prompt. ამის შემდეგ — Wave Y (wish approval), მერე Wave "grade-range", მერე "word problems".

[ახალი chat-სესიისთვის: ეს ფაილი აიტვირთოს Claude-ის და ChatGPT-ის Project-ებში. **ნამდვილად** ატვირთეთ ეს ფაილი repo-შიც (`git add PROJECT_STATE.md && git commit && git push`), თორემ იგივე პრობლემა განმეორდება.]