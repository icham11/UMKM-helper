# Cuanify

**Bikin bisnis makin cuan.**

Cuanify adalah platform **AI-powered POS (Point of Sale)** dan **inventory dinamis** untuk UMKM/MSME—berperan sebagai *virtual business consultant* yang membantu bisnis lebih rapi, cepat ambil keputusan, dan menjaga margin keuntungan. Dari pencatatan transaksi sampai insight harian berbasis AI, semuanya dibuat **simpel, sat-set, dan enak dipakai**.

---

## Who It’s For
Cuanify dirancang untuk:
- Pemilik UMKM (F&B, retail, usaha rumahan) yang butuh POS + inventori rapi tanpa ribet
- Tim operasional/kasir yang butuh flow transaksi cepat dengan stok otomatis
- Owner yang ingin analitik & rekomendasi berbasis data untuk meningkatkan profit

---

## Problem We Solve
Banyak UMKM mengalami:
- Pencatatan penjualan dan stok yang manual → rawan bocor & tidak akurat  
- Sulit menghitung **HPP/COGS** real-time → margin tidak terkontrol  
- Overstock/stockout karena forecasting lemah  
- Insight bisnis tidak actionable (data ada, tapi tidak “ngasih arah”)  
- SOP/dokumen bisnis tidak terpakai karena sulit dicari & dipahami cepat  

Cuanify menyatukan **POS + FIFO inventory + COGS real-time + AI insights + RAG assistant** agar owner bisa **mengurangi kebocoran**, **mengoptimalkan stok**, dan **naik level** secara berkelanjutan.

---

## Core Features
- **AI Product & Recipe Management**
  - Buat produk dari nama atau foto (AI)
  - Auto-generate resep, bahan baku, dan rekomendasi harga jual
  - CRUD produk, kategori, bahan baku
  - Pelacakan inventaris batch **FIFO**
- **Smart POS + Dynamic Inventory**
  - POS terintegrasi: transaksi cepat, status **Pre-Order (PO)** & **Ready Stock**
  - **COGS/HPP real-time** berdasarkan resep ingredients
  - Otomatis mengurangi stok bahan baku saat pembayaran
- **AI Business Analytics Dashboard**
  - Skor kesehatan bisnis harian
  - Tren penjualan, performa produk, alert inventaris
  - Optimasi biaya resep dan insight berbasis AI (Groq)
- **RAG-based AI Assistant (Business Docs + Internal Data)**
  - Chatbot konsultan bisnis dengan pencarian semantik (vector database)
  - Bisa jawab pertanyaan dari data internal (transaksi, produk) + dokumen PDF (SOP, dll)
- **Authentication & Business Onboarding**
  - Google OAuth + Email/Password (JWT)
  - Buat profil bisnis, sesi multi-auth

---

## MVP Scope
### In Scope (MVP)
1. **AI Product & Recipe Management + FIFO inventory batches**
2. **Smart POS** dengan pengurangan stok otomatis + **COGS/HPP real-time**
3. **AI Analytics Dashboard** (health score, insight tren, alert inventori)
4. **RAG AI Assistant** (query data transaksi/produk + PDF upload)
5. **Auth & onboarding bisnis** (Google OAuth + Email/Password, JWT)

### Out of Scope (Post-MVP)
- Multi-outlet advanced (role/permission kompleks lintas outlet)
- Integrasi pajak/efaktur & akuntansi penuh
- Offline-first POS sync
- Integrasi payment gateway/EDC (bila belum tersedia)
- Omnichannel (marketplace sync) dan loyalty program penuh

---

## System Architecture (High-Level)
```text
+-------------------+               +---------------------------+
|   Web App (UI)    |  HTTPS/API     |   App Server (API Layer) |
|  TypeScript/CSS   +--------------->|  Auth, POS, Inventory,   |
|  (Frontend)       |               |  Analytics, RAG Orchestr. |
+---------+---------+               +------------+--------------+
          |                                      |
          |                                      | read/write
          |                                      v
          |                           +--------------------------+
          |                           |   Relational Database    |
          |                           | (Products, Recipes,      |
          |                           |  Transactions, FIFO Batches|
          |                           +--------------------------+
          |
          |  embeddings + semantic search
          v
+---------------------------+         +--------------------------+
| Vector DB (Embeddings)    |<------->| Document Processor       |
| (RAG Index for PDFs &     |         | (PDF upload -> chunk ->  |
| internal knowledge)       |         | embed -> store)          |
+---------------------------+         +--------------------------+
                 |
                 | prompts + context
                 v
       +----------------------+
       | LLM Provider (Groq)  |
       | Insights + Chatbot   |
       +----------------------+
```

---

## Tech Stack
> Repo ini mayoritas **TypeScript**, dengan sedikit **JavaScript** dan **CSS**.

- **Frontend:** TypeScript (Next.js + Tailwind CSS)
- **Backend:** TypeScript (Next.js API routes)
- **Database:** PostgreSQL (relational utama), pgvector (vector DB untuk RAG)
- **LLM Provider:** Groq (untuk insights & assistant)
- **Deployment Platform:** Vercel
- **Additional Tools:** Prisma (ORM), JWT (auth), Google OAuth, PDF parsing library, etc.

---

## Environment Variables
> Jika kamu belum punya `.env.example`, pakai tabel ini sebagai baseline dan sesuaikan nama variabelnya dengan implementasi.

| Variable | Required | Description | Example |
|---|---:|---|---|
| `NODE_ENV` | No | Environment mode | `development` |
| `APP_URL` | Yes | Base URL aplikasi (untuk callback/auth) | `http://localhost:3000` |
| `DATABASE_URL` | Yes | Connection string DB utama | `postgresql://user:pass@localhost:5432/cuanify` |
| `JWT_SECRET` | Yes | Secret untuk signing JWT | `change-me` |
| `GOOGLE_CLIENT_ID` | No* | OAuth Google Client ID | `...` |
| `GOOGLE_CLIENT_SECRET` | No* | OAuth Google Client Secret | `...` |
| `GROQ_API_KEY` | Yes | API key Groq untuk LLM/insight | `gsk_...` |
| `VECTOR_DB_URL` | No* | Endpoint vector database | `http://localhost:6333` |
| `VECTOR_DB_API_KEY` | No* | API key vector database (jika managed) | `...` |
| `STORAGE_BUCKET` | No* | Bucket untuk file/PDF upload | `cuanify-docs` |
| `STORAGE_ACCESS_KEY` | No* | Credentials storage | `...` |
| `STORAGE_SECRET_KEY` | No* | Credentials storage | `...` |

\* Tergantung fitur yang kamu aktifkan (OAuth, RAG docs, storage).

---

## Project Structure (Example)
> Berikut contoh struktur yang umum untuk TypeScript SaaS. Akan saya sesuaikan persis dengan repo jika kamu share tree/paths.

```text
UMKM-helper/
├─ src/
│  ├─ app/                 # UI routes/pages (if Next.js) / app modules
│  ├─ modules/
│  │  ├─ auth/
│  │  ├─ pos/
│  │  ├─ inventory/
│  │  ├─ analytics/
│  │  └─ rag/
│  ├─ lib/
│  │  ├─ db/
│  │  ├─ ai/
│  │  └─ utils/
│  └─ types/
├─ public/
├─ docs/
├─ prisma/                 # schema + migrations (if Prisma)
├─ .env.example
├─ package.json
└─ README.md
```

---

## Roadmap
- Multi-outlet + role-based access control yang lebih granular
- Integrasi pembayaran (QRIS/payment gateway) & rekonsiliasi
- Forecasting produksi yang lebih presisi (seasonality + events)
- Advanced alerting (margin drop, shrinkage detection, anomaly sales)
- Omnichannel inventory sync (marketplace/online orders)

---

## Contributors
- **Dimas Budi Nugraha**
- **Halim Ornest Asriandy Putra** 
- **Wahid Nurhisyam**

---

## License
**TBD** (mis. MIT / Apache-2.0 / Proprietary)

---

## Contact / Ownership
**TBD** (mis. email, LinkedIn, dsb)
