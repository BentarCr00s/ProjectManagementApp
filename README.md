<div align="center">
  <br />
  <h1>🚀 TaskSync</h1>
  <p><strong>A blazing fast, MVP-focused project management application.</strong></p>
  <p>Built with Express.js, Pug, Tailwind CSS, and Turso DB.</p>
</div>

---

## 📖 Overview

TaskSync is a modern, lightweight project management tool designed to keep your teams organized without the bloat. It features a robust hierarchy (Workspaces → Lists → Tasks) and seamlessly blends **Server-Side Rendering (SSR)** for fast initial loads with an **Async REST API** for real-time interactions like drag-and-drop Kanban boards.

## ✨ Features

- **🏢 Workspace Management:** Create isolated workspaces for different teams or projects.
- **📋 Lists & Kanban Boards:** View tasks as simple lists or manage them visually via drag-and-drop Kanban boards.
- **✅ Task Tracking:** Create tasks, assign priorities (Urgent, High, Normal, Low), and update statuses in real-time.
- **💬 Comments & Collaboration:** Drop comments on tasks to keep context where the work happens.
- **⏱️ Time Tracking:** Simple built-in timers to track how long tasks take.
- **🔒 Secure Authentication:** Session-based authentication using SQLite storage.

## 🛠️ Technology Stack

- **Backend:** Node.js, Express.js
- **Database:** libSQL / [Turso](https://turso.tech/) (SQLite compatible)
- **Templating:** Pug (Server-Side Rendering)
- **Styling:** Tailwind CSS (configured with `_` variant separators for Pug compatibility)
- **Interactivity:** Vanilla JS + Alpine.js
- **Testing:** Jest (Unit) & Playwright (E2E)

## 🚀 Quick Start

Ensure you have **Node.js 18+** installed.

```bash
# 1. Clone the repository and install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env

# 3. Initialize the database and build Tailwind CSS
npm run setup

# 4. Start the development server (Terminal 1)
npm run dev

# 5. Start the CSS watcher (Terminal 2)
npm run watch:css
```

Your app will be running at `http://localhost:3000`.

> **Note:** For more detailed setup options, including how to connect to a live Turso Cloud database, check out our full [Setup Guide](./docs/SETUP.md).

## 🧪 Testing

We take reliability seriously. TaskSync includes both Unit tests and End-to-End browser tests.

```bash
# Run unit & integration tests
npm test

# Run Playwright E2E browser tests
# (Make sure the dev server is running first!)
npm run test:e2e
```

## 🏗️ Architecture

TaskSync strictly follows the MVC pattern. It uses an *Insert-Then-Select* database pattern with raw parameterized SQL queries, eliminating ORM overhead while retaining full type safety and query performance. 

For an in-depth dive into our request lifecycle, database layer, and CSS design decisions, please read the [Architecture Overview](./docs/ARCHITECTURE.md).

## 📝 License

This project is built for educational and MVP purposes. Feel free to fork and modify!
