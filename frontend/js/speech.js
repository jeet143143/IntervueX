/**
 * Speech Module — Text-to-Speech + Speech-to-Text
 * Uses Web Speech API for both TTS (interviewer speaks) and STT (candidate answers)
 */
const Speech = (() => {
  let recognition = null;
  let synthesis = window.speechSynthesis;
  let isListening = false;
  let isSpeaking = false;
  let currentUtterance = null;
  let transcriptCallback = null;
  let finalTranscript = '';
  let interimTranscript = '';
  let onSpeakStartCb = null;
  let onSpeakEndCb = null;
  let onListenStartCb = null;
  let onListenEndCb = null;
  let selectedVoice = null;

  /**
   * Initialize speech services
   */
  function init() {
    // Initialize Speech Recognition (STT)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        if (transcriptCallback) {
          transcriptCallback(finalTranscript, interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // These are normal, ignore
          return;
        }
        if (event.error === 'not-allowed') {
          Animations.showToast('Microphone access denied. Please allow mic access.', 'error');
        }
      };

      recognition.onend = () => {
        // Auto-restart if still supposed to be listening
        if (isListening) {
          try {
            recognition.start();
          } catch (e) {
            // Already running, ignore
          }
        } else {
          if (onListenEndCb) onListenEndCb();
        }
      };

      recognition.onstart = () => {
        if (onListenStartCb) onListenStartCb();
      };
    }

    // Pre-select a good voice for TTS
    loadVoices();
    if (synthesis) {
      synthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Load and select the best available voice
   */
  function loadVoices() {
    if (!synthesis) return;
    const voices = synthesis.getVoices();

    // Prefer a natural-sounding English male voice
    const preferred = [
      'Google UK English Male',
      'Google US English',
      'Daniel',
      'Alex',
      'Microsoft David',
      'Microsoft Mark',
      'English United Kingdom',
      'en-GB',
      'en-US'
    ];

    for (const pref of preferred) {
      const match = voices.find(v => 
        v.name.includes(pref) || v.lang.includes(pref)
      );
      if (match) {
        selectedVoice = match;
        break;
      }
    }

    // Fallback to any english voice
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    }
  }

  /**
   * Speak text aloud (AI interviewer)
   * @returns {Promise} Resolves when speech finishes
   */
  function speak(text) {
    return new Promise((resolve) => {
      if (!synthesis) {
        resolve();
        return;
      }

      // Cancel any ongoing speech
      synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = selectedVoice;
      utterance.rate = 0.95;
      utterance.pitch = 0.95;
      utterance.volume = 1;

      currentUtterance = utterance;
      isSpeaking = true;

      utterance.onstart = () => {
        isSpeaking = true;
        if (onSpeakStartCb) onSpeakStartCb();
      };

      utterance.onend = () => {
        isSpeaking = false;
        currentUtterance = null;
        if (onSpeakEndCb) onSpeakEndCb();
        resolve();
      };

      utterance.onerror = (event) => {
        console.warn('Speech synthesis error:', event.error);
        isSpeaking = false;
        currentUtterance = null;
        if (onSpeakEndCb) onSpeakEndCb();
        resolve();
      };

      // Chrome bug workaround: needs a small delay
      setTimeout(() => {
        synthesis.speak(utterance);
      }, 100);
    });
  }

  /**
   * Stop speaking
   */
  function stopSpeaking() {
    if (synthesis) {
      synthesis.cancel();
    }
    isSpeaking = false;
    if (onSpeakEndCb) onSpeakEndCb();
  }

  /**
   * Start listening (candidate's microphone)
   */
  function startListening(callback) {
    if (!recognition) {
      Animations.showToast('Speech recognition not supported in this browser', 'error');
      return false;
    }

    finalTranscript = '';
    interimTranscript = '';
    transcriptCallback = callback;
    isListening = true;

    try {
      recognition.start();
      return true;
    } catch (e) {
      console.warn('Recognition already running:', e);
      return true;
    }
  }

  /**
   * Stop listening
   * @returns {string} The final transcript
   */
  function stopListening() {
    isListening = false;
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) { /* ignore */ }
    }
    const result = finalTranscript.trim();
    finalTranscript = '';
    interimTranscript = '';
    return result;
  }

  /**
   * Set callbacks
   */
  function onSpeakStart(cb) { onSpeakStartCb = cb; }
  function onSpeakEnd(cb) { onSpeakEndCb = cb; }
  function onListenStart(cb) { onListenStartCb = cb; }
  function onListenEnd(cb) { onListenEndCb = cb; }

  /**
   * Get current state
   */
  function getIsSpeaking() { return isSpeaking; }
  function getIsListening() { return isListening; }
  function isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  return {
    init,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    onSpeakStart,
    onSpeakEnd,
    onListenStart,
    onListenEnd,
    getIsSpeaking,
    getIsListening,
    isSupported
  };
})();
