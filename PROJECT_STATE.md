# thomthematica2 — Project State

_ბოლო განახლება: Wave 3, Part 2 (Architecture Review დასრულებული, per-child reward images) დამტკიცების შემდეგ_

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

### Wave 3 — Part 1: vocativeName + Phrase Personalization (Commit #11–#16) ✅

**მიდგომა:** თავდაპირველი გეგმა (`children.vocative_name` DB column, `gender`-migration-ის pattern) Architecture Review-ის დროს გადაისინჯა — წოდებითი ბრუნვა სახელის გრამატიკული თვისებაა, არა კონკრეტული ბავშვის, ამიტომ static client-side lookup (`utils/vocativeNames.ts`, იგივე idiom რაც `gameModeLabels.ts`-ს აქვს) architecturალურად უფრო სუფთაა. DB migration, schema-ცვლილება, registration-ველი — არცერთი არ დასჭირდა. Claude-მ და ChatGPT-მ ცალ-ცალკე დაამტკიცეს ეს მიდგომა implementation-მდე.

**Commit #11 (`a5cfaa3` — "fix vocative names"):**
- `utils/vocativeNames.ts` (`VOCATIVE_NAMES: Record<string,string>`, `getVocativeName()`, fallback = plain name, არავითარი auto-derivation)
- `utils/childNameValidator.ts` — child-name registration validation: Georgian Mkhedruli ასოები (U+10D0–U+10FF) + space/hyphen (compound names დაშვებული, მაგ. "ანა-მარი"), პირველი/ბოლო სიმბოლო სავალდებულოდ ასო, consecutive separators აკრძალული. ვალიდაცია ეხება მხოლოდ ახალ რეგისტრაციებს — DB constraint არ დამატებულა, არსებული ბავშვები უცვლელი
- `personalizeMessage.ts` — ახალი `{vocative}` placeholder, ცენტრალიზებული (იგივე pattern რაც `{name}`/`{gender}`-ს აქვს)
- 202/202 ტესტი

**Commit #12 (`ed5ac23` — "fix reward phrases"):** Lexo-ს დაკვირვებით აღმოჩენილი ბაგი — "no-repeat-until-exhausted" phrase-pool (Commit #8) ტექნიკურად სწორად მუშაობდა, მაგრამ `App.tsx`-ის `processAnswerResult` ბლოკის დამასრულებელ (მე-3) კითხვაზეც ხატავდა `correctPhrasePool`-იდან, თუმცა `ResultOverlay.tsx` ამ ტექსტს ყოველთვის image-caption-ით ანაცვლებდა — ანუ ბავშვისთვის უხილავი draw იყო, რაც pool-ის 1/3-ს უსაფუძვლოდ ხარჯავდა და ხილულ გამეორებებს იწვევდა. გასწორდა: `selectFromPool` მხოლოდ მაშინ იძახება, როცა ტექსტი რეალურად გამოჩნდება. Claude-ის fresh-clone ვერიფიკაციამ (instrumented ტესტი, 18 თანმიმდევრული სწორი პასუხი) დაადასტურა 0 ნაადრევი გამეორება. 203/203 ტესტი

**Commit #13–#16 (`5142f12`, `eae5f09`, `e4a176b`, `e7af03b`):** Lexo-მ თავად დაწერა `VOCATIVE_NAMES`-ის სრული სია და გააფართოვა/გადაწერა `CORRECT_PHRASES` (9 ფრაზა) და `INCORRECT_PHRASES` (7 ფრაზა) `services/problemGenerator.ts`-ში, შემდეგ ჩართო `{vocative}` ყველგან, სადაც პირდაპირი მიმართვა გრამატიკულად შესაბამისია. Claude-ის fresh-clone ვერიფიკაციამ თითოეულ commit-ზე დაიჭირა ორი რეგრესია, ორივე გასწორდა: (1) უნებლიე `{gender}`→`{vocative}` ჩანაცვლება ერთ `INCORRECT_PHRASES`-ის ხაზში, რომელმაც gender-პერსონალიზაცია დაკარგა (`e7af03b`-ში `{gender}` დაბრუნდა); (2) `vocativeNames.ts`-იდან წაშლილი identity-mapping ჩანაწერები (`'თომა':'თომა'`) დადასტურდა, როგორც უწყინარი cleanup, არა რეგრესია. **საბოლოო მდგომარეობა: 25/25 test file, 203/203 ტესტი, 0 TS შეცდომა, სუფთა build.**

### Wave 3 — Part 2: Per-Child Reward Images — Architecture Approved 🔵

**სტატუსი:** Architecture Review დასრულებულია (Claude + ChatGPT სრული sign-off), Implementation Prompt ჯერ არ დაწერილა.

**კონტექსტი:** ამჟამინდელი გლობალური `WINNER_IMAGES`/`LOSER_IMAGES`/`SUPER_WINNER_GIFS` (`data/rewards.ts`) სინამდვილეში ერთი კონკრეტული ბავშვის (თომას) პირადი ფოტოებია, დარჩენილი one-child-app-ის ეპოქიდან. Lexo ამ სურათებს კოდიდან სრულად ამოიღებს, შეცვლის ახალი, ნამდვილად ზოგადი სურათებით (fallback tier-ისთვის), და თითოეულ დარეგისტრირებულ ბავშვს პირადად შექმნის საკუთარ, მხოლოდ მისთვის ხილულ სურათებს.

**საკვანძო architecture გადაწყვეტილებები:**
- **Association key: `child.id`, არა სახელი** — ორ სხვადასხვა ერთნაირსახელოვან ბავშვს დამოუკიდებელი სურათების ნაკრები ექნება (განსხვავებით `vocativeName`-ისგან, სადაც key სახელია)
- **ახალი DB table** (არა static repo-ფაილი, განსხვავებით `vocativeNames.ts`-ისგან) — განზრახული გადახვევა წინა precedent-იდან, რადგან ეს ნამდვილი per-child (არა per-name) მონაცემია, და DB Lexo-ს Supabase dashboard-იდან პირდაპირ დამატების საშუალებას აძლევს, code-commit/deploy-ის გარეშე
- **Confidentiality (ახალი, მკაცრი მოთხოვნა):** ბავშვის სურათი ხელმისაწვდომი უნდა იყოს მხოლოდ მშობლისთვის, ბავშვისთვის და Lexo-სთვის — public Google Drive ბმულები (ამჟამინდელი მექანიზმი) ამ მოთხოვნას არ აკმაყოფილებს. გადაწყვეტა: **private Supabase Storage bucket** + signed URLs
- **All-or-nothing პერსონალიზაცია** — ბავშვი ან სამივე კატეგორიით (winner/loser/super_winner) არის პერსონალიზებული, ან საერთოდ არა; per-category არევა დაუშვებელია

**დამტკიცებული schema:**
```sql
CREATE TABLE child_reward_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('winner', 'loser', 'super_winner')),
  storage_path text NOT NULL,
  caption text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX child_reward_images_child_category_idx ON child_reward_images (child_id, category);
ALTER TABLE child_reward_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parents_select_own_child_images"
  ON child_reward_images FOR SELECT
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));
```
(client-ს მხოლოდ SELECT აქვს — INSERT/UPDATE/DELETE Lexo-ს service-role-ით, dashboard-იდან)

**Storage:** `child-reward-images` bucket, `public: false`, path convention `{child_id}/{category}/{filename}`. Storage RLS-ში path-ის child_id-სეგმენტი **text-ად შედარებული** (არა `::uuid` cast) — დადასტურებულია PostgreSQL-ის საკუთარი დოკუმენტაციით/bug-tracker-ით, რომ AND/OR short-circuit evaluation გარანტირებული არ არის, ანუ `::uuid` cast თეორიულად query-ს ჩაშლის რისკის ქვეშ აყენებს malformed path-ის შემთხვევაში.

**Signed URLs:** `createSignedUrl()` prefetch-ილია ერთხელ, session-ის დასაწყისში (`activeChildId`-ის დაყენებისას), არა block-completion-ის მომენტში — რომ ჯილდოს ჩვენებაზე დაყოვნება არ გაჩნდეს. Expiry საკმარისად გრძელი უნდა იყოს session-ის სავარაუდო ხანგრძლივობისთვის.

**Cleanup ამავე commit-ში:** `ResultOverlay.tsx`-ის დუბლირებული `selectImageFromPool` ლოგიკა ჩანაცვლდება არსებული `utils/poolSelector.ts`-ით (Commit #8-დან) — semantics უცვლელი რჩება, მხოლოდ duplication მოიხსნება.

**შემდეგი ნაბიჯი:** AI Studio-სთვის implementation prompt.

## საკვანძო არქიტექტურული გადაწყვეტილებები (არ შეიცვალოს განხილვის გარეშე)

- DB schema: Wave 3 Part 2-მდე ზუსტად 4 table (profiles, children, game_sessions, wishes) იყო; Part 2-ით 5-მდე იზრდება (`child_reward_images`) — ეს განზრახული, სრულად განხილული გადახვევაა "ზუსტად 4 table" წესიდან, per-child (არა per-name) მონაცემის ბუნების გამო. answers/progress/statistics/achievements ცხრილები კვლავ განზრახ არ არსებობს
- useGameSession(gameMode, childId) — mode-აგნოსტიკური
- Guest Mode არ არსებობს (Phase 2.5)
- Google Apps Script public-write endpoint — thomthematica2 აღარ დამოკიდებული, legacy thomthematica-ს (ერთ-ბავშვიანი) კუთვნილება
- 40-question rolling window — ხელუხლებელი მთელი პროცესის განმავლობაში
- Race-condition-ების დაცვის დამტკიცებული idiom: `requestIdRef` generation-counter (არა identity/childId-guard მარტო) — გამოყენებულია ორჯერ დამოუკიდებლად (Commit #1, Commit #10)
- Per-name static content (Record<string,string>) vs. per-child DB storage — გადაწყვეტილების კრიტერიუმი: თუ მონაცემი სახელის/ცნების თვისებაა (გრამატიკა, ლეიბლები) → static repo-ფაილი (`vocativeNames.ts`, `gameModeLabels.ts`); თუ კონკრეტული ბავშვის ინდივიდუალური მონაცემია → DB table (`child_reward_images`)

## ცნობილი, განზრახ გადადებული საკითხები

- `SUPER_WINNER_GIFS`-ში (`data/rewards.ts`) 6 ჩანაწერს ერთი და იგივე caption აქვს ("ბრავისიმოოო!!!") — content-only fix, low priority, ჯერ არ არის გადაწყვეტილი უნიკალურ caption-ებზე გადავიდეს თუ ერთიანი brand-ფრაზა დარჩეს ვარიაციით
- კლასის მიხედვით რიცხვითი დიაპაზონი (`grade`) — Wave 4, ყველაზე სენსიტიური (`problemGenerator.ts`-ის ცენტრალურ ლოგიკას ეხება)
- სიტყვიერი ამოცანები — Wave 5, `grade`-ის შემდეგ განზრახ
- ახალი საგნები (ქართული/ინგლისური/გეოგრაფია) + hint/explanation-ფუნქციები — Phase 3-ის მთლიანად დასრულების შემდეგ, მოითხოვს math-answer-checking-ის ცენტრალიზებას `App.tsx`-ში
- `game_sessions`-ის ერთი stuck `'active'`-row — საჭიროებს ხელახალ ტესტირებას
- `metadata.json`/`migrated_prompt_history/` წაშლა — "ბოლოს, ყველაფრის დასრულების შემდეგ"
- Production-readiness: Supabase auto-pause (7 დღე უმოქმედობა), backup-სტრატეგია — ინფორმირებული, არა დაბლოკილი
- კომერციალიზაცია (Georgia-first): Supabase/Netlify Free საკმარისია 10-30+ ბავშვისთვის (per-child reward-images-ის storage-გათვლაც ამას ადასტურებს); საქართველოს PDPL მუხლი 7 შესაბამისობაშია; App Store "Kids Category" + COPPA/GDPR-K საერთაშორისო ეტაპზე; React web app → Capacitor/PWA გადაწყვეტილება ადრე სასურველია

## Workflow (როგორ ვმუშაობთ)

1. AI Studio (Gemini) წერს კოდს პატარა, ინკრემენტულ commit-ებად, ZIP export/import-ით
2. Claude ამოწმებს დამოუკიდებლად, fresh-clone-ით (tsc, vitest, build) — არასდროს ენდობა AI Studio-ს თვითმოხსენებას
3. ChatGPT აკეთებს დამოუკიდებელ cross-review-ს
4. ორივეს შენიშვნები ერთიანდება საბოლოო implementation prompt-ში
5. Lexo იღებს საბოლოო გადაწყვეტილებას; ცვლილებები ლოკალურად ხდება (edit → git add → commit → push ტერმინალით)
6. ყოველი ფაზის/Wave-ის დასრულებისას ეს დოკუმენტი განახლდება

## შემდეგი ნაბიჯი

Wave 3 Part 1 (vocativeName + phrase personalization) დასრულებულია. Wave 3 Part 2 (per-child reward images) — architecture დამტკიცებულია Claude-ისა და ChatGPT-ის მიერ, შემდეგი ნაბიჯი AI Studio-სთვის implementation prompt-ის დაწერაა. ამის შემდეგ Wave 4 (grade-based დიაპაზონი) და Wave 5 (სიტყვიერი ამოცანები) — ცალკე სრული Architecture Review-ციკლით თითოეულისთვის.

[ახალი chat-სესიისთვის: ეს ფაილი აიტვირთოს Claude-ის და ChatGPT-ის Project-ებში. **ნამდვილად** ატვირთეთ ეს ფაილი repo-შიც (`git add PROJECT_STATE.md && git commit && git push`), თორემ იგივე პრობლემა განმეორდება.]
