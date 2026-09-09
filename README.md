# Thomthematica (თომთემატიკა) 🧮

**Thomthematica** არის ინტერაქტიული, საგანმანათლებლო მათემატიკური აპლიკაცია დაწყებითი და საბაზო საფეხურის მოსწავლეებისთვის. აპლიკაცია ეხმარება ბავშვებს მათემატიკური და გეომეტრიული უნარების განვითარებაში მხიარული თამაშისა და ჯილდოების სისტემის მეშვეობით.

---

## 🌟 ძირითადი ფუნქციები (Features)

- ➕ **თომთემატიკა (არითმეტიკა):** მიმატება, გამოკლება, გამრავლება, გაყოფა და განტოლებები.
- ✖️ **თომრავლების ტაბულა:** გამრავლების ტაბულის სავარჯიშოები დროის ლიმიტით (10 წამი თითო კითხვაზე).
- 📐 **გეთომეტრია:** გეომეტრიული ფიგურების (კვადრატი, მართკუთხედი, სამკუთხედი, მრავალკუთხედები) პერიმეტრის, ფართობის, გვერდებისა და კუთხეების დათვლა.
- 📝 **ქვეშმიწერით გამრავლება:** 2-ნიშნა რიცხვების ეტაპობრივი, ინტერაქტიული გამრავლება ქვეშმიწერის წესების დაცვით.
- 🏆 **ჯილდოები და მოტივაცია:** ყოველ 3 სწორ პასუხზე მოსწავლე იღებს მხიარულ ტიტულებსა და სურათებს. 40 კითხვის წარმატებით ამოხსნისას ეხსნება სურვილის ჩასაწერი ფანჯარა.
- 👨‍👩‍👧 **Multi-user Parent → Child მოდელი:** მშობელი register/login-ს Supabase Auth-ით, ამატებს ერთ ან რამდენიმე ბავშვს, თითოეულს აქვს დამოუკიდებელი, RLS-ით იზოლირებული პროგრესი.
- 📊 **მშობლის დაშბორდი:** აგრეგატული სტატისტიკა, ბოლო სესიები, თამაშის რეჟიმების მიხედვით დაშლილი (breakdown) სტატისტიკა, დაკმაყოფილებული/მოლოდინში სურვილები.

---

## 🛠️ ტექნოლოგიური სტეკი (Tech Stack)

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Testing:** Vitest
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security)
- **Deployment:** GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`)

---

## 🏗️ არქიტექტურა (Architecture)

```
├── components/          # UI კომპონენტები (AuthModal, ChildSelector, MainMenu, MathQuiz, GeometryQuiz,
│                         # ColumnMultiplication, ParentDashboard, WishModal, UpdatePasswordModal, etc.)
├── contexts/            # React Contexts (AuthContext — Supabase Auth session; ChildContext — active child)
├── hooks/                # Custom React Hooks (useChildDashboard, useChildren, useGameSession, useTimer, ...)
├── data/                # სტატიკური მონაცემები (rewards)
├── services/             # სერვისები (problemGenerator, supabaseSyncService, deriveDashboardStats,
│                         # deriveGameModeBreakdown)
├── utils/                # მათემატიკური გამოთვლები და დამხმარე ფუნქციები (mathUtils, columnMultiplication,
│                         # gameModeLabels)
├── supabase/schema.sql   # DB schema + RLS policies (Parent→Child მოდელისთვის)
├── types.ts              # TypeScript ტიპები და ინტერფეისები
├── App.tsx                # აპლიკაციის ძირითადი ორკესტრაცია
└── index.tsx              # საწყისი წერტილი ErrorBoundary-ით
```

---

## 🚀 ინსტალაცია და გაშვება (Setup & Installation)

### 1. Supabase პროექტის მომზადება

- შექმენით პროექტი [supabase.com](https://supabase.com)-ზე.
- გაუშვით `supabase/schema.sql` პროექტის SQL Editor-ში — შექმნის ცხრილებს (`profiles`, `children`, `game_sessions`, `wishes`) და მათ RLS policy-ებს.
- Supabase Dashboard-ში ჩაიწერეთ `Project URL` და `anon public` key.

### 2. Environment ცვლადები

შექმენით `.env.local` ფაილი repo-ს root-ში (იხ. `.env.example`):

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. ინსტალაცია და გაშვება

```bash
# რეპოზიტორიის კლონირება
git clone https://github.com/lexo123/thomthematica2.git
cd thomthematica2

# დამოკიდებულებების დაინსტალირება
npm install

# დეველოპმენტ სერვერის გაშვება
npm run dev
```

### 4. Production Deployment (GitHub Pages)

`main`-ზე push ავტომატურად უშვებს `.github/workflows/deploy.yml`-ს (typecheck → test → build → GitHub Pages). საჭიროა repo-ს **Settings → Secrets and variables → Actions**-ში დამატებული:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 🧪 ტესტირება და შემოწმება (Testing & Checks)

```bash
# Typecheck (TypeScript შემოწმება)
npm run typecheck

# Unit ტესტების გაშვება Vitest-ით
npm run test

# Production Build აწყობა
npm run build
```

---

## 📜 ლიცენზია

პროექტი შექმნილია სასწავლო და საგანმანათლებლო მიზნებისთვის.