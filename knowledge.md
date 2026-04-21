Membangun replika ClickUp adalah proyek yang sangat menantang dan kompleks karena skalabilitas dan kedalaman fiturnya. Namun, untuk versi MVP (Minimum Viable Product), kita bisa merangkum fitur-fitur intinya dan menyusun arsitektur menggunakan *stack* yang Anda minta.

Berikut adalah rincian fitur utama ClickUp dan dokumen teknis untuk membangun replikanya.

---

### **Bagian 1: Fitur-Fitur Utama ClickUp (Target MVP)**

ClickUp dikenal sebagai "The Everything App for Work". Untuk membuat replikanya, Anda perlu mengimplementasikan fitur-fitur fundamental berikut:

1.  **Hierarki Data yang Dalam (Hierarchy):**
    * *Workspace* > *Space* > *Folder* > *List* > *Task* > *Subtask*.
2.  **Manajemen Tugas (Task Management):**
    * Pembuatan tugas dengan deskripsi, *assignee* (penugasan pengguna), *due date* (tenggat waktu), dan prioritas.
    * *Custom Statuses* (To Do, In Progress, Review, Done).
3.  **Multiple Views:**
    * *List View:* Menampilkan tugas dalam format baris.
    * *Board View (Kanban):* *Drag-and-drop* kartu tugas berdasarkan status.
4.  **Kolaborasi & Komunikasi:**
    * Komentar pada level tugas (dengan *mentions*).
5.  **Time Tracking & Estimates:**
    * Estimasi waktu pengerjaan dan pelacakan waktu aktual.

---

### **Bagian 2: Dokumen Teknis Replika ClickUp**

**Tech Stack:**
* **Backend:** Express.js (Node.js)
* **Frontend (Templating):** Pug (Server-Side Rendering)
* **Database:** Turso DB (libSQL / SQLite untuk *edge*)
* **Styling:** Tailwind CSS (disarankan untuk diintegrasikan dengan Pug agar *styling UI* lebih cepat)
* **Database Driver/ORM:** `@libsql/client` (Bisa dipadukan dengan Drizzle ORM atau query manual).

#### **1. Arsitektur Sistem**
Karena menggunakan Pug, aplikasi akan berpusat pada pola **MVC (Model-View-Controller)** dengan pendekatan **Server-Side Rendering (SSR)**.
*Catatan Penting:* Untuk fitur interaktif seperti *drag-and-drop* Kanban board, Anda tetap memerlukan Vanilla JavaScript (atau Alpine.js) di sisi klien yang berkomunikasi dengan REST API Express untuk memperbarui status tanpa memuat ulang halaman (*reload*).

#### **2. Struktur Direktori (Folder Structure)**
```text
clickup-replica/
├── public/              # Aset statis (CSS hasil kompilasi Tailwind, Client-side JS, Images)
├── src/
│   ├── config/          # Konfigurasi koneksi Turso DB
│   ├── controllers/     # Logika bisnis (TaskController, AuthController)
│   ├── middlewares/     # Autentikasi dan validasi (e.g., checkAuth)
│   ├── models/          # Struktur query database / ORM schemas
│   ├── routes/          # Definisi endpoint (API dan UI render)
│   ├── views/           # File template Pug
│   │   ├── layouts/     # Base layout (sidebar, navbar)
│   │   ├── mixins/      # Komponen re-usable (task card, button)
│   │   └── pages/       # Halaman utama (board.pug, list.pug)
│   └── app.js           # Entry point Express
├── .env                 # Kredensial Turso (TURSO_URL, TURSO_AUTH_TOKEN)
└── package.json
```

#### **3. Skema Database (Turso / SQLite Dialect)**
Turso menggunakan SQLite, yang sangat cocok untuk relasi hierarki ini jika diindeks dengan benar.

* **`users`**
    * `id` (TEXT/UUID, PK)
    * `name` (TEXT)
    * `email` (TEXT, UNIQUE)
    * `password_hash` (TEXT)
* **`workspaces`**
    * `id` (TEXT/UUID, PK)
    * `name` (TEXT)
    * `owner_id` (FK -> users.id)
* **`lists`** (Penyederhanaan: melewatkan Space/Folder untuk MVP)
    * `id` (TEXT/UUID, PK)
    * `name` (TEXT)
    * `workspace_id` (FK -> workspaces.id)
* **`tasks`**
    * `id` (TEXT/UUID, PK)
    * `title` (TEXT)
    * `description` (TEXT)
    * `status` (TEXT) - e.g., 'TODO', 'IN_PROGRESS', 'DONE'
    * `list_id` (FK -> lists.id)
    * `assignee_id` (FK -> users.id, Nullable)
    * `created_at` (DATETIME)

#### **4. Implementasi Teknis Dasar**

**A. Konfigurasi Koneksi Turso (`src/config/db.js`)**
```javascript
const { createClient } = require("@libsql/client");
require("dotenv").config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

module.exports = db;
```

**B. Controller untuk Mengambil Tugas (`src/controllers/taskController.js`)**
```javascript
const db = require('../config/db');

exports.getBoardView = async (req, res) => {
  try {
    const listId = req.params.listId;
    
    // Ambil data task dari Turso
    const result = await db.execute({
      sql: "SELECT * FROM tasks WHERE list_id = ?",
      args: [listId]
    });
    
    const tasks = result.rows;

    // Kelompokkan task berdasarkan status untuk Kanban Board
    const boardData = {
      TODO: tasks.filter(t => t.status === 'TODO'),
      IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
      DONE: tasks.filter(t => t.status === 'DONE'),
    };

    // Render file Pug dengan data
    res.render('pages/board', { 
      title: 'Board View - Replica', 
      boardData 
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Database error");
  }
};
```

**C. Template Pug untuk Kanban Board (`src/views/pages/board.pug`)**
```pug
extends ../layouts/main.pug

block content
  .flex.h-screen.bg-gray-100
    //- Sidebar asumsikan ada di layout utama
    
    .flex-1.p-6.overflow-x-auto
      h1.text-2xl.font-bold.mb-6 Board View
      
      .flex.space-x-6
        //- Looping Kolom Status
        each val, status in boardData
          .w-80.bg-gray-200.rounded-lg.p-4.flex-shrink-0
            h2.font-semibold.text-gray-700.mb-4= status.replace('_', ' ')
            
            //- Looping Tugas di dalam Kolom
            .flex.flex-col.space-y-3.task-container(data-status=status)
              each task in val
                .bg-white.p-4.rounded.shadow.cursor-pointer.hover_shadow-md.transition
                  h3.font-medium.text-gray-800= task.title
                  if task.assignee_id
                    .mt-3.flex.items-center
                      .w-6.h-6.bg-blue-500.rounded-full.text-white.text-xs.flex.items-center.justify-center
                        | #{task.assignee_id.charAt(0)}
```

#### **5. Strategi Sinkronisasi Real-Time (Krusial untuk UX ala ClickUp)**
Karena Pug merender HTML statis dari server, pengalaman interaktif akan terasa kaku jika *user* harus *refresh* halaman setiap memindahkan kartu Kanban.
* **Solusi:** Buat endpoint API terpisah di Express (misal: `PUT /api/tasks/:id/status`). Gunakan fitur Drag and Drop API bawaan HTML5 di sisi klien (`public/js/board.js`), tangkap *event drop*, pindahkan elemen DOM secara visual, lalu lakukan *fetch* secara asinkron ke endpoint API tersebut untuk mengupdate database Turso di latar belakang.

Berikut adalah daftar fitur komprehensif dari ClickUp yang dibagi berdasarkan fungsinya:

1. Hierarki & Struktur Data (Core Architecture)
ClickUp memiliki struktur data yang paling dalam dibandingkan kompetitornya untuk memisahkan level akses dan organisasi.

Workspace: Level tertinggi (biasanya mewakili seluruh perusahaan).

Space: Departemen atau divisi (misal: Engineering, Marketing).

Folder: Pengelompokan proyek atau sprint di dalam Space.

List: Daftar tugas spesifik di dalam Folder atau Space.

Task & Subtask: Unit kerja terkecil.

Nested Subtasks: Sub-tugas di dalam sub-tugas (hingga 7 level kedalaman).

Checklists: Daftar periksa sederhana di dalam sebuah tugas yang bisa di-assign.

2. Manajemen Tugas (Task Management)
Custom Statuses: Status yang bisa disesuaikan per Space atau Folder (bukan sekadar To-Do dan Done).

Custom Fields: Penambahan tipe data khusus pada tugas (Teks, Angka, Dropdown, Formula, Uang, Label, dll).

Assignees & Multiple Assignees: Menugaskan tugas ke satu atau beberapa orang.

Watchers: Pengguna yang tidak mengerjakan tugas tetapi menerima notifikasi perkembangannya.

Priorities: Flag prioritas (Urgent, High, Normal, Low).

Tags: Label warna-warni untuk kategorisasi lintas folder.

Task Dependencies: Relasi antar tugas (Blocking, Waiting on, Linked).

Recurring Tasks: Tugas yang otomatis terbuat/diulang berdasarkan jadwal tertentu.

3. Tampilan Visual (Multiple Views)
Ini adalah salah satu nilai jual utama ClickUp, memungkinkan data yang sama dilihat dari berbagai sudut pandang.

List View: Tampilan baris standar yang padat informasi.

Board View (Kanban): Papan drag-and-drop berdasarkan status atau kategori lain.

Calendar View: Tampilan kalender untuk melihat due date dan jadwal.

Gantt Chart View: Tampilan timeline klasik untuk melihat dependensi dan durasi proyek.

Timeline View: Mirip Gantt tetapi lebih linier untuk perencanaan kapasitas.

Table View: Tampilan mirip spreadsheet/Excel untuk mengelola Custom Fields secara massal.

Box View: Tampilan tingkat tinggi untuk melihat beban kerja setiap anggota tim.

Mind Map View: Pemetaan visual untuk brainstorming yang bisa langsung diubah menjadi tugas.

Workload View: Tampilan khusus untuk manajemen kapasitas dan mencegah burnout karyawan.

Whiteboard: Kanvas digital kolaboratif (mirip Miro/FigJam) yang terintegrasi langsung dengan tugas.

4. Dokumen & Wiki (Docs)
ClickUp Docs: Editor dokumen rich-text internal yang bisa di-nesting (halaman di dalam halaman).

Real-time Collaboration: Mengedit dokumen bersamaan secara live.

Docs to Tasks: Mengubah teks di dalam dokumen menjadi tugas dengan satu klik.

Embeds: Menyematkan YouTube, Figma, Google Drive, atau URL lain ke dalam dokumen.

5. Pelacakan Waktu & Manajemen Kapasitas (Time Tracking)
Native Time Tracker: Stopwatch bawaan di dalam setiap tugas.

Time Estimates: Estimasi waktu pengerjaan vs waktu aktual.

Timesheets: Laporan mingguan/bulanan dari waktu yang dilacak oleh seluruh tim.

Billable Time: Menandai waktu yang dilacak sebagai billable untuk keperluan invoice klien.

6. Komunikasi & Kolaborasi
Chat View: Ruang obrolan internal (mirip Slack) yang menempel pada List atau Folder.

Task Comments: Komentar threaded di dalam tugas.

Assigned Comments: Mengubah komentar menjadi action item yang harus diselesaikan agar komentar bisa di-resolve.

Proofing: Kemampuan untuk memberikan komentar atau anotasi langsung di atas file gambar/PDF yang diunggah.

Email in ClickUp: Mengirim dan menerima email langsung dari dalam antarmuka tugas.

7. Otomatisasi & Integrasi (Automations & Integrations)
Native Automations: Trigger dan Action (Misal: "Jika status berubah ke 'Review', assign ke 'Manager'").

Webhooks: Mengirim payload data ke sistem eksternal jika terjadi perubahan.

Integrasi Native: Terhubung langsung dengan GitHub, GitLab, Slack, Google Drive, Zoom, Figma, dll.

Public API: REST API yang sangat lengkap untuk manipulasi data via script eksternal.

8. Pelaporan & Dashboard (Dashboards)
Custom Widgets: Membuat dashboard dari puluhan widget (Pie chart, Bar chart, Calculation, Portfolio, dll).

Sprint Widgets: Burndown charts, Burnup charts, dan Velocity charts khusus untuk metodologi Agile/Scrum.

Time Reporting: Visualisasi kemana waktu tim dihabiskan.