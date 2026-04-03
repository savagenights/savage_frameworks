# 🦁 Savage Frameworks

> **A lightweight, open-source HTML, CSS, and JavaScript framework for building reactive websites.**

[![Version](https://img.shields.io/badge/version-0.1.0--alpha-blue.svg)](./package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Standard](https://img.shields.io/badge/standards-WHATWG%20%7C%20W3C%20%7C%20ECMA-orange.svg)](./technology_living_standards.md)

---

## 🚀 Philosophy

Savage Frameworks brings the power of reactive programming to vanilla web technologies. No build steps required, no heavy dependencies—just pure, standards-compliant HTML, CSS, and JavaScript that works everywhere.

- **🪶 Lightweight** - Minimal footprint, maximum performance
- **🧩 Modular** - Use only what you need
- **⚡ Reactive** - Automatic UI updates when data changes
- **📱 Progressive** - Works with or without JavaScript enabled
- **🎯 Standards-First** - Built on living web standards

---

## 📦 Installation

### Option 1: CDN (Quickest Start)

```html
<!-- Development build with warnings -->
<script src="https://cdn.jsdelivr.net/gh/savagenights/savage_frameworks@main/dist/savage.dev.js"></script>

<!-- Production build (minified) -->
<script src="https://cdn.jsdelivr.net/gh/savagenights/savage_frameworks@main/dist/savage.min.js"></script>
```

### Option 2: NPM (Recommended for Projects)

```bash
npm install savage-frameworks
```

```javascript
import { SavageApp, Component } from 'savage-frameworks';
```

### Option 3: Direct Download

Download the latest release from [GitHub Releases](https://github.com/savagenights/savage_frameworks/releases)

---

## 🎯 Quick Start

### HTML-First Approach

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Savage App</title>
    <link rel="stylesheet" href="savage.css">
</head>
<body>
    <!-- Declarative reactive component -->
    <div data-savage="counter">
        <p>Count: <span data-bind="count">0</span></p>
        <button data-action="increment">+</button>
        <button data-action="decrement">-</button>
    </div>

    <script src="savage.js"></script>
    <script>
        SavageApp.create('counter', {
            state: { count: 0 },
            actions: {
                increment: (state) => ({ count: state.count + 1 }),
                decrement: (state) => ({ count: state.count - 1 })
            }
        });
    </script>
</body>
</html>
```

### JavaScript-First Approach

```javascript
import { SavageApp, Component } from 'savage-frameworks';

const app = new SavageApp();

app.component('todo-list', {
    template: `
        <div class="todo-list">
            <input data-model="newTodo" placeholder="Add todo...">
            <button data-action="add">Add</button>
            <ul data-for="todo in todos">
                <li data-class="{ done: todo.done }" data-on="click: toggle">
                    {{ todo.text }}
                </li>
            </ul>
        </div>
    `,
    state: {
        todos: [],
        newTodo: ''
    },
    actions: {
        add(state) {
            if (!state.newTodo.trim()) return;
            return {
                todos: [...state.todos, { text: state.newTodo, done: false }],
                newTodo: ''
            };
        },
        toggle(state, todo) {
            return {
                todos: state.todos.map(t => 
                    t === todo ? { ...t, done: !t.done } : t
                )
            };
        }
    }
});

app.mount('#app');
```

---

## 📚 Documentation

- [Getting Started](./docs/getting-started.md)
- [API Reference](./docs/api-reference.md)
- [Component Guide](./docs/components.md)
- [Styling with Savage CSS](./docs/styling.md)
- [Examples](./examples/)
- [Development Progress](./DEVELOPMENT.md)

---

## 🛠️ Standards Compliance

Savage Frameworks is built on living web standards:

| Standard | Compliance |
|----------|------------|
| HTML Living Standard | ✅ Full compliance |
| CSS Snapshot 2023 | ✅ Full compliance |
| ECMAScript 2025 | ✅ Baseline support |
| DOM Living Standard | ✅ Full compliance |

See [Technology Living Standards](./technology_living_standards.md) for full reference.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

[MIT License](./LICENSE) © Savage Nights Collective

---

## 🔗 Links

- **Repository:** https://github.com/savagenights/savage_frameworks.git
- **Issues:** https://github.com/savagenights/savage_frameworks/issues
- **Discussions:** https://github.com/savagenights/savage_frameworks/discussions

---

> **Version:** 0.1.0-alpha | **Built with 💪 and web standards**
