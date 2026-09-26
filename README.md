# 🎓 Smart Student Focus & Study Dashboard

A minimalist, high-performance web-based productivity dashboard designed for students. Built following **Apple Liquid Glass / Glassmorphism Design Standards**, this dashboard combines a Pomodoro focus timer with dynamic physics animations and a task management system.

---

## ✨ Features

### ⏱️ Liquid Focus Timer
* **3 Focus Modes**: Focus (25m), Short Break (5m), and Long Break (15m).
* **Dual-Interaction Segmented Control**:
  * **Tap/Click**: Smooth CSS spring sliding animation to the selected mode.
  * **Drag/Slide**: Real-time fluid gesture tracking with boundary clamping (no overflowing) and spring snapping.
* **Visual Progress Ring**: Dynamic SVG circle with theme-responsive color transitions.
* **Audio & Visual Feedback**: Web Audio API chime sound effect and celebratory confetti animation upon completion.

### 📋 Assignment & Task Manager
* **Task Creation**: Track assignments by title, subject tag (`Math`, `Programming`, `English`, `Science`, `General`), and deadline.
* **Smart Deadline Badges**: Automatically categorizes tasks into `Overdue`, `Due < 24h`, `Due < 3 Days`, or `Upcoming`.
* **Local Persistence**: Saves all tasks seamlessly in browser `localStorage`.
* **Interactive Physics**: Custom micro-animations on task completion and deletion.

### 🎨 Apple Liquid Glass UI & Personalization
* **Glassmorphism**: Multi-layered backdrop blurs, ambient gradients, and specular highlights.
* **Custom Liquid Physics Engine**: Custom touch/pointer physics engine giving elements weight, squash-and-stretch elasticity, and inertia on press or drag.
* **Dark / Light Theme**: Dynamic theme switcher saved to `localStorage`.
* **Personalized Greeting**: Editable student name and real-time clock.

---

## 🚀 Tech Stack

* **HTML5** — Semantic structure.
* **CSS3** — Custom properties (CSS variables), CSS Grid, Flexbox, and complex spring animations (`cubic-bezier`).
* **JavaScript (Vanilla ES6+)** — Single-file architecture using an IIFE module pattern, Web Pointer Events API, and Web Audio API.
* **External CDN Resources**:
  * [Font Awesome 6.4.0](https://fontawesome.com/) — UI Icons.
  * [Canvas Confetti](https://github.com/catdad/canvas-confetti) — Task completion confetti effect.
  * [Inter / SF Pro Fonts](https://fonts.google.com/specimen/Inter) — Typography.

---

## 🛠️ Getting Started

### Prerequisites
No node packages, build steps, or local servers are required. The application runs natively in any modern browser.

### Installation
1. Clone or download the repository:
   ```bash
   git clone https://github.com/your-username/student-focus-dashboard.git
   ```
2. Open `index.html` (or your renamed file like `dashboard.html`) directly in any Web Browser (Chrome, Safari, Edge, Firefox).

---

## 📂 File Structure

```text
├── index.html            # Main entry point (All-in-one HTML, CSS, and JS)
└── README.md             # Project documentation
```

---

## 📖 Usage Guide

1. **Set Name**: Click on the underlined **"Student"** text in the header to set your name.
2. **Focus Session**: 
   * Click or drag the mode selector (`Focus`, `Short Break`, `Long Break`).
   * Hit **Start** to initiate the timer.
3. **Add Tasks**:
   * Fill out the assignment form on the right panel and click **Add**.
   * Check off tasks upon completion to trigger the confetti animation.

---

## 📄 License

Distributed under the MIT License. Feel free to modify and adapt for personal or educational use.