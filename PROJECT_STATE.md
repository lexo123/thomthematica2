# thomthematica2 — Project State

_ბოლო განახლება: Pre-Launch Bug-Fix Wave დასრულებული და ცოცხლად დადასტურებული (commits c8b6802, 111a659, 9f68acd, b28cb05): ბლოკის UI-state-ის თამაშებს/ბავშვებს შორის გადმოდინება, ორმაგი "completed" flush-ით duration=0, მენიუში გასვლისას rolling window-ს წაშლა, და Dashboard-ში გაჭედილი "active" სესიების უჩინარობა — ოთხივე გასწორებული. წინა: რეგისტრაციის PIN-ის ჩუმი დაკარგვა (ecd892a), Wave Y (3d92e11-მდე), Service Worker cross-origin cache leak (1f3e969)_

## Repo
https://github.com/lexo123/thomthematica2

## პროექტის მოკლე აღწერა
React/TypeScript საგანმანათლებლო მათემატიკის აპლიკაცია ბავშვებისთვის, თავდაპირველად აშენებული ერთი ბავშვისთვის (thomthematica), ახლა გადადის multi-user/Parent→Child მოდელზე Supabase-ის (Auth + Postgres + RLS) გამოყენებით. კოდი იწერება Google AI Studio-ს (Gemini) მიერ vibe-coding მიდგომით; Claude და ChatGPT ცალ-ცალკე აკეთებენ code review-ს ყოველ commit-ზე, სანამ შემდეგი ეტაპი დაიწყება. Lexo — project manager/reviewer, არა კოდის ავტორი. **პროექტი ახლოვდება production launch-ს — თავდაპირველად ~10 ახლობელი ბავშვისთვის.**

## დასრულებული ფაზები

### Phase 1: Authentication ✅
- Supabase Auth (email/password), AuthContext.tsx, AuthModal.tsx
- Password recovery flow (PASSWORD_RECOVERY event handling, UpdatePasswordModal.tsx)
- supabase/schema.sql — 5 table: profiles, children, game_sessions, wishes, child_reward_images
- RLS policies ყველა ცხრილზე, WITH CHECK კლაუზებით (არა მხოლოდ USING)
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
ვინაიდან "ბავშვი" და "მშობელი" ერთი ოჯახის ფარგლებში იზიარებენ ერთსა და იმავე `auth.uid()`-ს (იხ. Wave X-ის სექცია ზემოთ), **Storage/DB RLS ვერასდროს ვერ დაიცავს "ბავშვმა არ უნდა ნახოს X" წესს** — ეს შესაძლებელია მხოლოდ client-code-ის დონეზე (query projection). ეს აღმოჩენა პირდაპირ გავლენას მოახდინა Stage 3a-ს დიზაინზე (`fetchChildSafeWishes`-ის ცხადი column-selection) და ზოგადი წესია ნებისმიერი მომავალი child-visible/parent-only მონაცემისთვის: **`select('*')` არასდროს გამოიყენო query-ში, რომლის შედეგიც child-mode-ის React state-ში შეიძლება მოხვდეს.**

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

## საკვანძო არქიტექტურული გადაწყვეტილებები (არ შეიცვალოს განხილვის გარეშე)

- DB schema: 5 table (`profiles`, `children`, `game_sessions`, `wishes`, `child_reward_images`) + `pin_hash` column ორივე `profiles`/`children`-ზე (განზრახ nullable) + `wishes.status`/`wish_parent_note`/`image_parent_note`/`proposed_image_path` (Wave Y)
- useGameSession(gameMode, childId) — mode-აგნოსტიკური
- Guest Mode არ არსებობს
- 40-question rolling window — ხელუხლებელი
- Race-condition-ების დამტკიცებული idiom: `requestIdRef` generation-counter — Commit #1, Commit #10, Wave 3 Part 2, Wave Y-ის ორივე ახალი hook
- Stale-closure-ის დამტკიცებული idiom: `useRef` + `useEffect` sync callback-ისთვის, რომელიც `setInterval`/`setTimeout`-ში რეგისტრირდება და ცვლად state-ზეა დამოკიდებული (Wave X Post-fix, `useTimer.ts`)
- Per-name static content (Record<string,string>) vs. per-child DB storage — კრიტერიუმი: სახელის/ცნების თვისება → static repo-ფაილი; კონკრეტული ბავშვის ინდივიდუალური მონაცემი → DB table
- Schema-migration-ის დამტკიცებული pattern: `ADD COLUMN (nullable) → backfill → verify count=0 → SET NOT NULL → CHECK` — Commit #6A-ში დამტკიცებული; Wave X-ში (pin_hash) და Wave Y-ში (wishes.status — ძველი production მონაცემის კოლაფსი ახალ ტერმინალურ მნიშვნელობაში) ორივეგან **განზრახ, საკუთარი მიზეზით, არ გამოყენებულა ზუსტად ეს pattern** — თითოეული გადაწყვეტილების მიზეზი საკუთარ სექციაშია
- Production migration (DB/Storage/RLS SQL) — ყოველთვის Lexo-ს ხელით, Supabase Dashboard/SQL editor-იდან; AI Studio-ს არასდროს გადაეცემა ეს პასუხისმგებლობა
- **PIN gate — client-side UI identity-gate, არა DB-level access-control.** RLS ოჯახის მასშტაბით ღიაა. Parent და child mode ერთსა და იმავე `auth.uid()`-ს იზიარებენ — **ამიტომ ნებისმიერი "მხოლოდ მშობლისთვის"/"მხოლოდ ბავშვისთვის" მონაცემი მხოლოდ query-level column-selection-ით/UI-ით არის დაცვადი, არასდროს RLS/Storage-policy-ით** (Wave Y Storage Discovery)
- **PIN-ის გარეშე identity-switch აკრძალულია architecture-ის დონეზე**
- **Wave Y-ის wishes-workflow**: 7-state machine (`wish_pending/wish_approved/wish_rejected/image_pending/image_approved/image_rejected/published`), **ერთი ბავშვის მრავალი ერთდროული wish განზრახ დაშვებულია** (არა DB-constraint), **rejected wish resubmit-ავს იმავე row-ს** (არა ახალი row+FK), **`image_approved→published` მუდმივად Lexo-ს ხელით ოპერაციაა**
- **`select('*')` აკრძალულია ნებისმიერ query-ზე, რომლის შედეგი child-mode-ის (ან ზოგადად ნაკლებად-პრივილეგირებული mode-ის) React state-ში შეიძლება მოხვდეს** — ცხადი column-ების ჩამონათვალი ყოველთვის სავალდებულოა
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

## დაგეგმილი მომდევნო Wave-ები (პრიორიტეტის მიხედვით)

### Wave "grade-range" (კლასის მიხედვით რიცხვითი დიაპაზონი) — შემდეგი პრიორიტეტი, ყველაზე სენსიტიური (problemGenerator.ts-ის ცენტრალურ ლოგიკას ეხება)

### Wave "word problems" — grade-range-ის შემდეგ

### ახალი საგნები + hint/explanation-ფუნქციები — Phase 3-ის მთლიანად დასრულების შემდეგ

## ცნობილი, განზრახ გადადებული საკითხები

- `SUPER_WINNER_GIFS`-ის დუბლირებული caption — გადაწყვეტილი, აღარ აქტუალური
- ~~`game_sessions`-ის stuck `'active'`-row~~ ✅ გამოკვლეულია: მიზეზი — beforeunload-ის არასაიმედოობა; გადაწყვეტა — Dashboard ითვლის ყველა row-ს (b28cb05)
- `package-lock.json` სინქრონში არ არის `package.json`-თან (`npm ci` ვარდება; CI იყენებს `npm install`-ს და ამიტომ deploy არ ზიანდება) — დაბალი პრიორიტეტი
- Vercel/APK (webintoapp) გადაწყვეტილება — ჯერ არ მიღებულა; ამჟამად ყველა GitHub Pages ლინკს იყენებს. იხ. localStorage-per-origin წესი ზემოთ
- `metadata.json`-ის description-ის განახლება (თომას სახელი) — ჯერ არ გასწორებულა
- Backup-სტრატეგია — ინფორმირებული, კონკრეტული გეგმა ჯერ არ არის; launch-მდე რეკომენდებული
- კომერციალიზაცია (Georgia-first) — მომავალი ეტაპი, ჯერ არ აქტუალური 10-ბავშვიანი launch-ისთვის
- **PROJECT_STATE.md-ის AI Studio sync** — ყოველი Wave X/Y-შემდგომი commit-ის შემდეგ საჭიროა ხელით შემოწმება, ხომ არ დაბრუნდა ძველ ვერსიაზე
- **`image_approved → published`-ის manual ოპერაცია** (Wave Y) — ყოველი დამტკიცებული სურათისთვის Lexo-მ თავად უნდა შეამოწმოს Supabase Table Editor/SQL Editor, push notification არ არსებობს. Saved query/view `wish_approved`/`image_rejected`/`image_approved` status-ებისთვის რეკომენდებულია, ჯერ არ შექმნილა

## Production Launch-ის მდგომარეობა (~10 ახლობელი ბავშვი)

**რეალურად ბლოკავს:** არაფერი ცნობილი.

**launch-მდე ერთჯერადი მოქმედებები:**
- სატესტო ანგარიშების წაშლა (Supabase Dashboard → Authentication → Users). წაშლის შემდეგ შეამოწმე, რომ მათი `children`, `game_sessions`, `wishes` ჩანაწერებიც წაიშალა და `child-reward-images` bucket-ში (მათ შორის `pending`-ქვესაქაღალდეებში) სატესტო სურათები არ დარჩა
- სრული ნამდვილი ნაკადის ერთხელ გავლა ახალი ანგარიშით: რეგისტრაცია PIN-ით → ბავშვის დამატება PIN-ით → ბავშვის PIN-ით შესვლა და თამაში → wish-ის დაწერა → მშობლის PIN-ით შესვლა, Inbox, დადასტურება/უარყოფა → სურათის ატვირთვა/დადასტურება → `published`-ის ხელით დასმა
- **ყველა ტესტ-browser-ში service worker-ის hard-refresh/unregister** (security fix-ის commit-ის შემდეგ) — ძველი, დაზიანებული cache-ლოგიკის მქონე service worker-ები ხელით უნდა ჩანაცვლდეს
- - sw.js-ის CACHE_NAME ახლა v7 და ახალი deploy-ის შემდეგ stale-while-revalidate ძველ bundle-ს ერთხელ კიდევ აჩვენებს. ყოველი კრიტიკული deploy-ის შემდეგ ტესტი ინკოგნიტოში ან Unregister + Clear site data-ის შემდეგ.

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

**Webintoapp.com (native app wrapper) გამოყენების გეგმა:** ჯერ არ გაკეთებულა. ტექნიკურად პასიური ცვლილება (APK უბრალოდ ფანჯარაა მითითებულ URL-ზე და ავტომატურად იღებს ახალ deploy-ს), მაგრამ Android WebView-ში beforeunload/visibilitychange ნაკლებად საიმედოა → მეტი "active" row (Dashboard ახლა მათაც ითვლის).  ღირს ხელით ტესტირება ერთი ბავშვით სრულ flow-ზე (PIN gate-ისა და Wave Y-ის wish-ციკლის ჩათვლით), სანამ ყველას დაურიგდება.

## Workflow (როგორ ვმუშაობთ)

1. AI Studio (Gemini) წერს კოდს პატარა, ინკრემენტულ commit-ებად, ZIP export/import-ით
2. Claude ამოწმებს დამოუკიდებლად, fresh-clone-ით (hash, `git diff --stat` scope-შემოწმება, tsc, vitest, build) — **არასდროს** ენდობა AI Studio-ს თვითმოხსენებას, თუნდაც report დეტალური/დარწმუნებული ჩანდეს
3. ChatGPT აკეთებს დამოუკიდებელ cross-review-ს არქიტექტურული გადაწყვეტილებების დონეზე (არა ყოველი მექანიკური/text-only commit-ისთვის)
4. ორივეს შენიშვნები ერთიანდება საბოლოო implementation prompt-ში
5. Lexo იღებს საბოლოო გადაწყვეტილებას; DB/Storage/RLS migrations — ყოველთვის ხელით, SQL editor-იდან; client-კოდის ცვლილებები — AI Studio-დან, ლოკალურად
6. ყოველი Wave-ის/მნიშვნელოვანი commit-ის დასრულებისას ეს დოკუმენტი განახლდება
7. ამ ფაილის ყოველი ხელით/git-ით განახლების შემდეგ, განახლებული ვერსია ხელით აიტვირთება AI Studio-ს project-შიც

**Lexo-ს სამუშაო კონტექსტი:** არ იცნობს SQL-ს ან Supabase-ის dashboard-ს — ყოველი ტექნიკური ნაბიჯი დეტალურად, ეტაპ-ეტაპად აღსაწერია.

## შემდეგი ნაბიჯი

Pre-Launch Bug-Fix Wave (4 commit: c8b6802, 111a659, 9f68acd, b28cb05) სრულად დასრულებულია: ოთხივე ბაგი ცოცხლად დადასტურებული, თითოეული commit fresh-clone-ით დამოუკიდებლად ვერიფიცირებული (321/321 ტესტი, 41 ფაილი, tsc 0 შეცდომა, build სუფთა).

რეკომენდებული თანმიმდევრობა: (1) Vercel/APK გადაწყვეტილება (ერთი canonical URL, Supabase Auth Site URL, Vercel-ზე env vars `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`); (2) ბოლო launch-მდე გაწმენდა: ამ ბაგების ტესტებისას შექმნილი სატესტო ანგარიშების წაშლა + სრული ნამდვილი ნაკადის ერთხელ გავლა ახალი ანგარიშით; (3) Backup-სტრატეგია; (4) Wave "grade-range" architecture review.

[ახალი chat-სესიისთვის: ეს ფაილი აიტვირთოს Claude-ის და ChatGPT-ის Project-ებში, **და** AI Studio-ს project-ში. ნამდვილად ატვირთეთ ეს ფაილი repo-შიც (`git add PROJECT_STATE.md && git commit && git push`).]
