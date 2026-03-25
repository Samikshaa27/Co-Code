import { useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';

const SUGGESTION_DEBOUNCE = 1500;
const DEBUG_DEBOUNCE = 2000;

export function useAI() {
  const {
    token, roomId, language,
    setAiSuggestion, setAiSuggestionLoading,
    setAiExplanation, setAiExplanationLoading,
    setDebugIssues, setDebugLoading,
    setDeepDebug, setDeepDebugLoading,
    addToast,
  } = useStore();

  const suggestionTimer = useRef(null);
  const debugTimer = useRef(null);
  
  // AbortControllers to cancel old requests
  const controllers = useRef({
    suggest: null,
    explain: null,
    debug: null,
    deepdebug: null
  });

  const getController = (type) => {
    if (controllers.current[type]) {
      controllers.current[type].abort();
    }
    const controller = new AbortController();
    controllers.current[type] = controller;
    return controller;
  };

  // ── Auto suggestion (1500ms debounce) ─────────────────
  const triggerSuggestion = useCallback((code) => {
    if (!code?.trim() || !roomId) return;
    clearTimeout(suggestionTimer.current);
    suggestionTimer.current = setTimeout(async () => {
      const controller = getController('suggest');
      try {
        setAiSuggestionLoading(true);
        const data = await api.getSuggestion(roomId, code, language, token, controller.signal);
        setAiSuggestion(data.suggestion);
      } catch (e) {
        if (e.name === 'AbortError') return;
        console.error(`[AI] Suggest Error:`, e);
        setAiSuggestion(`Error: ${e.message}`);
        addToast({ type: 'error', message: `AI Suggestion Failed: ${e.message}` });
      } finally {
        if (!controller.signal.aborted) setAiSuggestionLoading(false);
      }
    }, SUGGESTION_DEBOUNCE);
  }, [roomId, language, token]);

  // ── On-demand explanation (Immediate, Streaming) ───────
  const getExplanation = useCallback(async (code, selectedCode) => {
    if (!code?.trim() || !roomId) return;
    const controller = getController('explain');
    
    try {
      setAiExplanationLoading(true);
      setAiExplanation(''); // Clear previous
      
      const res = await api.getExplanation(roomId, code, language, selectedCode, token, controller.signal);
      
      // Handle Streaming
      if (res instanceof Response && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          
          // OpenAI streaming chunks usually look like: data: {"choices":...}
          // But our backend might just stream raw text for simplicity
          fullText += chunk;
          setAiExplanation(fullText);
        }
      } else {
        // Fallback for non-streaming JSON
        setAiExplanation(res.explanation);
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error(`[AI] Explain Error:`, e);
      setAiExplanation(`### AI Error\n\n${e.message}`);
      addToast({ type: 'error', message: e.message || 'Explanation failed' });
    } finally {
      if (!controller.signal.aborted) setAiExplanationLoading(false);
    }
  }, [roomId, language, token]);

  // ── Auto debug (2000ms debounce) ──────────────────────
  const triggerDebug = useCallback((code) => {
    if (!code?.trim() || !roomId) return;
    clearTimeout(debugTimer.current);
    debugTimer.current = setTimeout(async () => {
      const controller = getController('debug');
      try {
        setDebugLoading(true);
        const data = await api.getDebugFlags(roomId, code, language, token, controller.signal);
        setDebugIssues(data.issues || []);
      } catch (e) {
        if (e.name === 'AbortError') return;
        console.error(`[AI] Debug Error:`, e);
        setDebugIssues([]);
      } finally {
        if (!controller.signal.aborted) setDebugLoading(false);
      }
    }, DEBUG_DEBOUNCE);
  }, [roomId, language, token]);

  // ── Deep debug (on-demand, Immediate) ──────────────────
  const getDeepDebug = useCallback(async (code) => {
    if (!code?.trim() || !roomId) return;
    const controller = getController('deepdebug');
    try {
      setDeepDebugLoading(true);
      const data = await api.getDeepDebug(roomId, code, language, token, controller.signal);
      setDeepDebug(data);
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error(`[AI] DeepDebug Error:`, e);
      setDeepDebug({ rootCause: 'Deep debug failed', analysis: e.message, fixes: [], success: false });
      addToast({ type: 'error', message: e.message || 'Deep debug failed' });
    } finally {
      if (!controller.signal.aborted) setDeepDebugLoading(false);
    }
  }, [roomId, language, token]);

  return { triggerSuggestion, getExplanation, triggerDebug, getDeepDebug };
}
