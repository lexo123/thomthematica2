# thomthematica2 — Project State

_ბოლო განახლება: Wave 2 (Commit #10, multi-account race-condition fix) დამტკიცების შემდეგ_

## Repo
https://github.com/lexo123/thomthematica2

## პროექტის მოკლე აღწერა
React/TypeScript საგანმანათლებლო მათემატიკის აპლიკაცია ბავშვებისთვის, თავდაპირველად აშენებული ერთი ბავშვისთვის (thomthematica), ახლა გადადის multi-user/Parent→Child მოდელზე Supabase-ის (Auth + Postgres + RLS) გამოყენებით. კოდი იწერება Google AI Studio-ს (Gemini) მიერ vibe-coding მიდგომით; Claude და ChatGPT ცალ-ცალკე აკეთებენ code review-ს ყოველ commit-ზე, სანამ შემდეგი ეტაპი დაიწყება. Lexo — project manager/reviewer, არა კოდის ავტორი.

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
- Google Apps Script public-write endpoint განზრახ რჩება აქტიური — მხოლოდ ცალკე, scope-გარე legacy `thomthematica` (ერთ-ბავშვიანი) აპისთვის; thomthematica2 აღარ არის მასზე დამოკიდებული (source/build/runtime — დამოუკიდებლად ვერიფიცირებული)
- 59/59 ტესტი

### Phase 3 — Commit #1 (Parent Dashboard: Data/Read/Derivation Layer) ✅
- **Core rule**: Dashboard — read-only derived-data layer, ახალი statistics data model/schema არ ემატება
- fetchChildSessionsForAggregate, fetchChildSessionsRecent (bounded `.limit(20)`), deriveDashboardStats (pure, division-by-zero-დაცული)
- **ChatGPT-მ აღმოაჩინა race condition**: stale-response guard მხოლოდ childId-ს ამოწმებდა — ვერ იცავდა A→B→A double-switch-ისგან (ძველი F1-fetch შეეძლო გადაეწერა უფრო ახალი F3-ის სწორი მონაცემი). **Claude-მ დამოუკიდებლად დაადასტურა** — red→green ციკლით. გასწორდა `requestIdRef` generation-counter-ით (`activeChildIdRef`-ის ნაცვლად) — **ეს არის ის pattern, რომელიც მოგვიანებით Wave 2-ში (Commit #10) ხელახლა იქნა გამოყენებული**
- 78/78 ტესტი

### Phase 3 — Commit #2 (Parent Dashboard UI) ✅
- `showDashboard` state ლოკალურად MainMenu.tsx-ში, body-level conditional (არა overlay)
- explicit rendering priority chain (childId===null → loading → error → stats===null → 0-sessions → no-accuracy → populated)
- useChildDashboard(childId) ყოველთვის უპირობოდ გამოძახებული (Rules of Hooks)
- wishes — სრული სია, truncation-ის გარეშე
- `App.tsx` საერთოდ არ შეხებია ამ commit-ში
- 88/88 ტესტი

### Phase 3 — Commit #3 (gameModeLabels.ts Shared Util Refactor) ✅
- `utils/gameModeLabels.ts` — `GAME_MODE_LABELS: Record<GameMode, string>` (მკაცრი ტიპით) + `getGameModeLabel(mode: string)` type-guard-დაფუძნებული lookup
- `types.ts`-ის `GameSession.game_mode: string` ხელუხლებელი დარჩა
- 91/91 ტესტი

### Phase 3 — Commit #4 (Game-mode Breakdown Dashboard-ში) ✅
_[შენიშვნა: ამ commit-ის დეტალური review-prose ვერ აღდგა — ქვემოთ მხოლოდ მიმდინარე კოდიდან პირდაპირ დადასტურებული ფაქტებია, არა თავდაპირველი review-ჩანაწერი.]_
- დადასტურებულია მიმდინარე კოდში: `useChildDashboard.ts` აბრუნებს `gameModeBreakdown: GameModeBreakdown`-ს, `ParentDashboard.tsx`-ში "4. Game Mode Breakdown" სექციად რენდერდება, `getGameModeLabel`-ს იყენებს ლეიბლებისთვის
- Commit #3-ის "Architecture Review-ში" ნახსენები open decision (query-strategy: არსებული query-ის გაფართოება vs ცალკე breakdown-query) გადაწყვეტილია — რომელი მიდგომა შეირჩა, ცალკე დასადასტურებელია საჭიროების შემთხვევაში

### Phase 3 — Commit #5 (Session-close Persistence + Rolling-window Persistence + Kveshmicera Enter-fix) ✅
- Root-cause: `visibilitychange→hidden`-ზე `flushCompletedSession()` ცდომილებით ასრულებდა session-ს, auto-save არ ამოწმებდა ამ flag-ს → session სამუდამოდ `'active'`-ად რჩებოდა
- გადაწყვეტა: ცალკე `persistCurrentSession()` (status: 'active', არ ცვლის isCompletedRef), `flushCompletedSession()` — მხოლოდ genuine completion-ზე
- `services/gameProgressStorage.ts` (localStorage, 48სთ TTL), `{transport: 'keepalive'}`, `RESTORE_PROGRESS` reducer-action
- 125/125 ტესტი

### Phase 3 — Commit #5A (Kveshmicera Wish-block: 40 → 20) ✅
- `utils/wishBlockSize.ts` (`getWishBlockSize(gameMode)`), `CHECK (correct_count IN (19,20,39,40))`
- 141/141 ტესტი

### Phase 3 — Commit #5B (Production DB Migration) ✅
- `ALTER TABLE wishes DROP/ADD CONSTRAINT` — BEGIN/COMMIT-ში, post-migration data-check
- ⚠️ ცნობილი, უვნებელი risk: AI Studio-ს ZIP-ს დროდადრო აქვს `schema.sql`/`metadata.json`-ის სტალ ასლი — production DB-ს არასდროს შეხებია

### Phase 3 — Kveshmicera Corrections #1–#4 (Post-5B ბაგები) ✅
- 4 ურთიერთდაკავშირებული ბაგი: Enter-ზე feedback/სურათი გამოტოვება (`stopPropagation()`), incorrect-flow redesign (pre-Phase-3 legacy bug, git-history-ით დადასტურებული), repeated-submission guard, Enter-ით "შემდეგი"-ღილაკის non-closure
- 150/150 ტესტი (სრული DOM-ინტეგრაციის ტესტებით)

### Phase 3 — Commit #6A (ბავშვის სქესის ველი: schema + registration) ✅
- Migration: `ADD COLUMN (nullable) → backfill by id → verify → SET NOT NULL → CHECK`
- `supabase/schema.sql` (`gender TEXT NOT NULL`), `types.ts`, `hooks/useChildren.ts`, `components/ChildSelector.tsx` (სავალდებულო არჩევანი)
- Production migration — Lexo-ს ხელით, დადასტურებული (`count(*) WHERE gender IS NULL` → 0)
- 155/155 ტესტი

### Phase 3 — Commit #6B (Personalization: {name} + {gender}) ✅
- `utils/personalizeMessage.ts` — ცენტრალიზებული `personalize(phrase, child)`, `.replaceAll()`, null-fallback `'მოთამაშე'`
- `data/rewards.ts` (per-child captions) განზრახ out-of-scope — Wave 3-ისთვის გადადებული
- Production live-ტესტი დადასტურდა
- 160/160 ტესტი

### Wave 2 — Child-Context-ის საძირკვლის გამაგრება (Commit #7–#10) ✅

**Commit #7 (`7f22fdf9dcba569aab27bbdadab461d4fbc3e707`):** Child Selector "first mode" race — selector ავტორიზაციის შემდეგ "დამატება"-ში იჭედებოდა თუნდაც არსებული ბავშვებისთვის (stale-closure race `ChildContext`-ის sync-ეფექტსა და `ChildSelector`-ის mount-time `isAdding`-ს შორის). გასწორდა `hasFetchedOnce` readiness-სიგნალით. 158/158 ტესტი.

**Commit #8 (`d351ca52e6dbaaec03531706d4e00c37cb255379`):** "No-repeat-until-exhausted" pool სისტემა ფრაზებისთვის — ახალი გენერიკული `utils/poolSelector.ts` (`selectFromPool<T>`), იგივე pattern რაც production-ში სურათებს ჰქონდა. `ResultOverlay.tsx`/`data/rewards.ts` განზრახ არ შეხებია. 163/163 ტესტი.

**Commit #9 (`537aa4b68cf4e6178c56e3979a1f04ae02b3dd67`):** `addChild`-ის type-safety — `gender: 'boy'` default მოშორდა, `ChildContextType.addChild`-ის out-of-sync interface (gender-პარამეტრის გარეშე) გასწორდა. 163/163 ტესტი.

**Commit #10 (`ea6d8188622e572c5b021fa7b29231b9dc717663`):** Multi-account login-switch race — ორი დამოუკიდებელი race: (1) `hasFetchedOnce` არასდროს ბრუნდებოდა `false`-ზე user-ვინაობის ცვლილებაზე (SPA logout, page-reload-ის გარეშე); (2) stale in-flight fetch-ს შეეძლო overwrite გაეკეთებინა ახალი user-ის state-ისთვის. გასწორდა `fetchedForUserId` (id-შედარება) + `requestIdRef` (იგივე pattern, რაც Commit #1-ში `useChildDashboard.ts`-ისთვის უკვე დამტკიცდა) — ორივე დაცვა ერთმანეთს არ ცვლის, დამოუკიდებელი race-კლასებია. `fetchChildren`-ის `useCallback`-დამოკიდებულებაც `[user]`-დან `[userId]`-ზე გადავიდა. 168/168 ტესტი.

## საკვანძო არქიტექტურული გადაწყვეტილებები (არ შეიცვალოს განხილვის გარეშე)

- DB schema: ზუსტად 4 table (profiles, children, game_sessions, wishes). answers/progress/statistics/achievements ცხრილები განზრახ არ არსებობს
- useGameSession(gameMode, childId) — mode-აგნოსტიკური
- Guest Mode არ არსებობს (Phase 2.5)
- Google Apps Script public-write endpoint — thomthematica2 აღარ დამოკიდებული, legacy thomthematica-ს (ერთ-ბავშვიანი) კუთვნილება
- 40-question rolling window — ხელუხლებელი მთელი პროცესის განმავლობაში
- Race-condition-ების დაცვის დამტკიცებული idiom: `requestIdRef` generation-counter (არა identity/childId-guard მარტო) — გამოყენებულია ორჯერ დამოუკიდებლად (Commit #1, Commit #10)

## ცნობილი, განზრახ გადადებული საკითხები

- Per-child ინდივიდუალური სურათები (`data/rewards.ts`) — Wave 3-ში დაგეგმილი, `poolSelector.ts`-ის პირდაპირ per-child მონაცემზე მონტაჟით
- `vocativeName` ველი (ბავშვის სახელის წოდებითი ბრუნვა) — განხილულია, დაგეგმვა ჯერ არ დაწყებულა, Wave 3-ისთვის
- კლასის მიხედვით რიცხვითი დიაპაზონი (`grade`) — Wave 4, ყველაზე სენსიტიური (`problemGenerator.ts`-ის ცენტრალურ ლოგიკას ეხება)
- სიტყვიერი ამოცანები — Wave 5, `grade`-ის შემდეგ განზრახ
- ახალი საგნები (ქართული/ინგლისური/გეოგრაფია) + hint/explanation-ფუნქციები — Phase 3-ის მთლიანად დასრულების შემდეგ, მოითხოვს math-answer-checking-ის ცენტრალიზებას `App.tsx`-ში
- `game_sessions`-ის ერთი stuck `'active'`-row — საჭიროებს ხელახალ ტესტირებას
- `metadata.json`/`migrated_prompt_history/` წაშლა — "ბოლოს, ყველაფრის დასრულების შემდეგ"
- Production-readiness: Supabase auto-pause (7 დღე უმოქმედობა), backup-სტრატეგია — ინფორმირებული, არა დაბლოკილი
- კომერციალიზაცია (Georgia-first): Supabase/Netlify Free საკმარისია 10-30+ ბავშვისთვის; საქართველოს PDPL მუხლი 7 შესაბამისობაშია; App Store "Kids Category" + COPPA/GDPR-K საერთაშორისო ეტაპზე; React web app → Capacitor/PWA გადაწყვეტილება ადრე სასურველია

## Workflow (როგორ ვმუშაობთ)

1. AI Studio (Gemini) წერს კოდს პატარა, ინკრემენტულ commit-ებად, ZIP export/import-ით
2. Claude ამოწმებს დამოუკიდებლად, fresh-clone-ით (tsc, vitest, build) — არასდროს ენდობა AI Studio-ს თვითმოხსენებას
3. ChatGPT აკეთებს დამოუკიდებელ cross-review-ს
4. ორივეს შენიშვნები ერთიანდება საბოლოო implementation prompt-ში
5. Lexo იღებს საბოლოო გადაწყვეტილებას; ცვლილებები ლოკალურად ხდება (edit → git add → commit → push ტერმინალით)
6. ყოველი ფაზის/Wave-ის დასრულებისას ეს დოკუმენტი განახლდება

## შემდეგი ნაბიჯი

Wave 2 დასრულებულია. Wave 3 შემდეგია: `vocativeName` ველი (მცირე, დაბალრისკიანი, `gender`-migration-ის pattern-ის გამეორება), შემდეგ per-child ინდივიდუალური სურათები. Wave 4 (grade-based დიაპაზონი) და Wave 5 (სიტყვიერი ამოცანები) — ამის შემდეგ, ცალკე სრული Architecture Review-ციკლით თითოეულისთვის.

[ახალი chat-სესიისთვის: ეს ფაილი აიტვირთოს Claude-ის და ChatGPT-ის Project-ებში. **ნამდვილად** ატვირთეთ ეს ფაილი repo-შიც (`git add PROJECT_STATE.md && git commit && git push`), თორემ იგივე პრობლემა განმეორდება.]
