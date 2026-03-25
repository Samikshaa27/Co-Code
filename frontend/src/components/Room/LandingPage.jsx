import React, { useEffect, useState } from 'react';
import './LandingPage.css';

const CODE_COLUMNS = [
  [
    'function CoCode() {',
    '  return (',
    '    <Editor />',
    '  );',
    '}',
    'const sync = (doc, update) => {',
    '  Y.applyUpdate(doc, update);',
    '  broadcast(update);',
    '};',
    'async function* fetchLines(url) {',
    '  const response = await fetch(url);',
    '  for await (const chunk of response.body) {',
    '    yield split(chunk);',
    '  }',
    '}'
  ],
  [
    'export const useCollaboration = (id) => {',
    '  const [status, setStatus] = useState("init");',
    '  useEffect(() => {',
    '    const socket = new WebSocket(id);',
    '    socket.onopen = () => setStatus("ready");',
    '    return () => socket.close();',
    '  }, [id]);',
    '  return { status };',
    '};'
  ],
  [
    'class RoomProvider extends Component {',
    '  render() {',
    '    return (',
    '      <Context.Provider value={this.state}>',
    '        {this.props.children}',
    '      </Context.Provider>',
    '    );',
    '  }',
    '}'
  ],
  [
    'docker-compose up --build -d',
    'npm install @monaco-editor/react',
    'git commit -m "feat: real-time sync"',
    'pytest tests/test_core.py',
    'cargo build --release',
    'terraform apply -auto-approve',
    'kubectl get pods --all-namespaces'
  ],
  [
    'const stream = (doc, update) => {',
    '  Y.applyUpdate(doc, update);',
    '  const state = Y.encodeStateAsUpdate(doc);',
    '  broadcast(state);',
    '};',
    'doc.on("update", (update) => {',
    '  queue.push(update);',
    '});'
  ],
  [
    'import { createStore } from "zustand";',
    'export const useStore = createStore((set) => ({',
    '  code: "",',
    '  setCode: (code) => set({ code }),',
    '  cursors: {},',
    '  setCursors: (c) => set({ cursors: c }),',
    '}));'
  ]
];

export function LandingPage({ onGetStarted }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  return (
    <div className={`landing-page ${isReady ? 'animate-ready' : ''}`}>
      {/* Navbar */}
      <nav className="fixed-navbar">
        <div className="nav-container">
          <div className="nav-left">
            <h1 className="logo">
              <span className="logo-co">Co</span>
              <span className="logo-code">Code</span>
            </h1>
          </div>
          <div className="nav-center">
            <code>// code.compile.together</code>
          </div>
          <div className="nav-right">
            <div className="nav-links">
              <a href="#start" className="nav-link" onClick={(e) => { e.preventDefault(); onGetStarted(); }}>Start</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        {/* Background Layer: White full-coverage div with 6-column grid */}
        <div className="background-div">
          <div className="stream-grid">
            {CODE_COLUMNS.map((col, i) => (
              <div key={i} className="stream-column">
                <div className="scroll-track">
                  {[...col, ...col, ...col, ...col].map((line, j) => (
                    <div key={j} className="code-line">{line}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Content */}
        <div className="hero-content-center">
          <div className="horizontal-rule top"></div>
          
          <h2 className="brand-title">
            <span className="italic-co">Co</span>
            <span className="bold-code">Code</span>
          </h2>

          <div className="icons-row">
            {/* Outline icon: head, body, laptop, text, bottom bar all stroke black, fill none */}
            <svg className="dev-icon outline" width="72" height="80" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="24" r="16" stroke="black" strokeWidth="2.5" />
              <path d="M20 74C20 54 30 46 50 46C70 46 80 54 80 74" stroke="black" strokeWidth="2.5" />
              <rect x="25" y="60" width="50" height="32" rx="4" stroke="black" strokeWidth="2.5" />
              <text x="50" y="77" fill="black" fontSize="14" fontFamily="DM Mono" fontWeight="700" textAnchor="middle" dominantBaseline="middle">&lt;/&gt;</text>
              <path d="M10 96H90" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
            </svg>

            {/* Solid icon: head and body filled solid black, laptop screen overlay filled dark #0a0a0a, white text, dark bottom bar */}
            <svg className="dev-icon solid" width="72" height="80" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="24" r="16" fill="black" />
              <path d="M20 74C20 54 30 46 50 46C70 46 80 54 80 74" fill="black" />
              <rect x="25" y="60" width="50" height="32" rx="4" fill="black" />
              <rect x="29" y="64" width="42" height="24" rx="2" fill="#0a0a0a" />
              <text x="50" y="77" fill="white" fontSize="14" fontFamily="DM Mono" fontWeight="700" textAnchor="middle" dominantBaseline="middle">&lt;/&gt;</text>
              <rect x="10" y="94" width="80" height="4" rx="2" fill="black" />
            </svg>
          </div>

          <div className="subtitle-text">
            Code · Compile · Together
          </div>

          <div className="horizontal-rule bottom"></div>

          <button className="cta-button-parallelogram" onClick={onGetStarted}>
            Get Started <span className="arrow">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
