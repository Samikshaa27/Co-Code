import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { getMonacoLang } from '../../constants/languages';
import { useStore } from '../../store/useStore';
import { MonacoBinding } from 'y-monaco';

export function CollabEditor({ 
  ydoc, sendCursorChange, onCodeChange, sendCodeChange,
  debugIssues = []
}) {
  const { language, code, cursors, sessionId, activeFileId, files, setCursorPosition, editorOptions } = useStore();
  const [editor, setEditor] = useState(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const modelsRef = useRef({}); // { fileId: monacoModel }
  // Use ref to track if code was updated via prop (remote) or typing
  const isApplyingRemoteRef = useRef(false);

  useEffect(() => {
    if (editor && code !== editor.getValue()) {
      isApplyingRemoteRef.current = true;
      // The Editor component will update from value={code}
      // Since it's a microtask, we clear the flag after it has processed
      const timeout = setTimeout(() => {
        isApplyingRemoteRef.current = false;
      }, 50); 
      return () => clearTimeout(timeout);
    }
  }, [code, editor]);
  const cursorDecorationsRef = useRef([]);
  const bindingRef = useRef(null);

  // ── Yjs Monaco Binding (Requirement 1 & 3) ──────────────────
  useEffect(() => {
    if (!editor || !monacoRef.current || !activeFileId || !ydoc) return;

    // Cleanup previous binding
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    const type = ydoc.getText(activeFileId);
    
    // Create new binding
    bindingRef.current = new MonacoBinding(
      type,
      editor.getModel(),
      new Set([editor]),
      null // We handle awareness manually or can add it here later
    );

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [activeFileId, editor, ydoc]);

  // ── Model Management ──────────────────
  useEffect(() => {
    if (!editor || !monacoRef.current || !activeFileId) return;

    const file = files.find(f => f.id === activeFileId);
    if (!file) return;

    if (!modelsRef.current[activeFileId]) {
      const lang = getMonacoLang(file.language);
      modelsRef.current[activeFileId] = monacoRef.current.editor.createModel(file.content, lang);
    }

    const model = modelsRef.current[activeFileId];
    if (editor.getModel() !== model) {
      editor.setModel(model);
    }
  }, [activeFileId, editor, files]);

  // ── Editor Options ──────────────────
  useEffect(() => {
    if (!editor) return;
    editor.updateOptions({
      fontSize: editorOptions.fontSize,
      tabSize: editorOptions.tabSize,
      wordWrap: editorOptions.wordWrap
    });
  }, [editor, editorOptions]);

  // ── Remote Cursor Rendering ────────────────
  useEffect(() => {
    if (!editor || !monacoRef.current) return;

    const newDecorations = [];
    Object.entries(cursors).forEach(([connId, data]) => {
      // Don't show our own cursor twice
      if (data.sessionId === sessionId) return;

      const { position, selection, displayName, color } = data;
      if (!position) return;

      // 1. Caret & Label
      newDecorations.push({
        range: new monacoRef.current.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        options: {
          className: `remote-cursor-caret-${connId}`,
          beforeContentClassName: `remote-cursor-label-${connId}`,
          stickiness: monacoRef.current.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage: { value: displayName }
        }
      });

      // 2. Selection range highlight
      if (selection && (selection.startLineNumber !== selection.endLineNumber || selection.startColumn !== selection.endColumn)) {
        newDecorations.push({
          range: new monacoRef.current.Range(
            selection.startLineNumber, selection.startColumn,
            selection.endLineNumber, selection.endColumn
          ),
          options: {
            className: `remote-selection-${connId}`,
            stickiness: monacoRef.current.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        });
      }

      // Inject dynamic CSS for this user's color if it doesn't exist
      const styleId = `cursor-style-${connId}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .remote-cursor-caret-${connId} {
            border-left: 2px solid ${color};
            z-index: 10;
          }
          .remote-cursor-label-${connId}::before {
            content: "${displayName}";
            position: absolute;
            top: -16px;
            left: -2px;
            padding: 1px 4px;
            background: ${color};
            color: white;
            font-size: 10px;
            font-weight: 700;
            white-space: nowrap;
            border-radius: 2px 2px 2px 0;
            pointer-events: none;
            z-index: 20;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          .remote-selection-${connId} {
            background-color: ${color}33 !important; /* 20% opacity */
          }
        `;
        document.head.appendChild(style);
      }
    });

    cursorDecorationsRef.current = editor.deltaDecorations(
      cursorDecorationsRef.current,
      newDecorations
    );

    // Cleanup style tags for users who left
    const currentConnIds = new Set(Object.keys(cursors));
    const allStyles = document.querySelectorAll('style[id^="cursor-style-"]');
    allStyles.forEach(style => {
      const connId = style.id.replace('cursor-style-', '');
      if (!currentConnIds.has(connId)) {
        style.remove();
      }
    });

    return () => {
       // Optional: Full cleanup of ALL cursor decorations on unmount
    };
  }, [cursors, editor, sessionId]);

  const handleEditorMount = (editorInstance, monacoInstance) => {
    setEditor(editorInstance);
    editorRef.current = editorInstance;
    monacoRef.current = monacoInstance;

    monacoInstance.editor.defineTheme('collab-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: { 'editor.background': '#111111' }
    });
    monacoInstance.editor.setTheme('collab-dark');

    // Requirement 12: Cursor position status bar
    editorInstance.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        ln: e.position.lineNumber,
        col: e.position.column
      });
      
      const selection = editorInstance.getSelection();
      sendCursorChange?.({
        position: { lineNumber: e.position.lineNumber, column: e.position.column },
        selection: {
          startLineNumber: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLineNumber: selection.endLineNumber,
          endColumn: selection.endColumn
        }
      });
    });
    
    editorInstance.onDidChangeCursorSelection((e) => {
      const position = editorInstance.getPosition();
      sendCursorChange?.({
        position: { lineNumber: position.lineNumber, column: position.column },
        selection: {
          startLineNumber: e.selection.startLineNumber,
          startColumn: e.selection.startColumn,
          endLineNumber: e.selection.endLineNumber,
          endColumn: e.selection.endColumn
        }
      });
    });
  };

  return (
    <div className="editor-wrapper" style={{ height: '100%', width: '100%' }}>
      <Editor
        height="100%"
        value={code} // Sync with store
        language={getMonacoLang(language)}
        theme="collab-dark"
        options={{
          fontSize: editorOptions.fontSize,
          fontFamily: "'JetBrains Mono', monospace",
          automaticLayout: true,
          minimap: { enabled: false },
          scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
          fixedOverflowWidgets: true,
          wordWrap: editorOptions.wordWrap,
          tabSize: editorOptions.tabSize
        }}
        onMount={handleEditorMount}
        onChange={(value) => {
          if (!isApplyingRemoteRef.current) {
            onCodeChange?.(value);
          }
        }}
      />
    </div>
  );
}
