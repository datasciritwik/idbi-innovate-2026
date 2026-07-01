import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import Avatar from './components/Avatar';
import PortfolioSnapshot from './components/PortfolioSnapshot';
import SpokenLine from './components/SpokenLine';
import QuickActions from './components/QuickActions';
import InputBar from './components/InputBar';
import QuotaBadge from './components/QuotaBadge';
import TabBar from './components/TabBar';
import AccountsTab from './components/AccountsTab';
import InvestTab from './components/InvestTab';
import GoalsTab from './components/GoalsTab';

export type TabId = 'home' | 'accounts' | 'invest' | 'goals';
type ConnectionStatus = 'idle' | 'connecting' | 'ready' | 'error';
import { api, ApiError } from './lib/api';
import type { LanguageInfo, PortfolioSnapshot as PortfolioSnapshotData, UserSummary, VoiceGender, Transaction, Recommendation, UserProfile } from './lib/api';
import { enqueueAudioChunk, resetAudioQueue } from './lib/audio';
import { startVoiceSession, stopVoiceSession } from './lib/voice';
import { ensureQuotaKnown, subscribeToQuota } from './lib/session';
import type { QuotaInfo } from './lib/session';

const emptyPortfolio: PortfolioSnapshotData = {
  user_id: '',
  total_value: 0,
  change_amount: 0,
  change_pct: 0,
  allocation: [],
  holdings: [],
};

export default function App() {
  // Toggle device mockup modes
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'tablet'>('mobile');

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabId>('home');

  // Cache/lazy loading states for tabs
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);

  // Demo user roster + current selection
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [portfolio, setPortfolio] = useState<PortfolioSnapshotData>(emptyPortfolio);
  const [portfolioLoading, setPortfolioLoading] = useState(true);

  // Vitta's active spoken response line
  const [wrenText, setWrenText] = useState('Connecting to your account...');

  // User's voice/query flash text
  const [userQuery, setUserQuery] = useState<string>('');

  // Concierge processing states
  const [statusText, setStatusText] = useState('Waking up...');
  const [isProcessing, setIsProcessing] = useState(false);

  // Voice settings: reply language + TTS voice gender
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [language, setLanguage] = useState('en');
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('female');

  // Self-hosted LLM/TTS containers cold-start on first use (can take a
  // couple of minutes) — this lets the user eat that latency up front via
  // an explicit button instead of it landing on their first chat message.
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [connectionDetail, setConnectionDetail] = useState<string | undefined>(undefined);

  // Per-IP free-tier quota (see backend/app/security/quota.py) — surfaced so
  // users aren't surprised when the concierge suddenly stops responding.
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  useEffect(() => subscribeToQuota(setQuota), []);
  useEffect(() => {
    ensureQuotaKnown();
  }, []);

  const handleConnect = async () => {
    setConnectionStatus('connecting');
    setConnectionDetail(undefined);
    try {
      const { llm_ready, tts_ready } = await api.warmup();
      if (llm_ready && tts_ready) {
        setConnectionStatus('ready');
      } else {
        setConnectionStatus('error');
        const missing = [!llm_ready && 'reply model', !tts_ready && 'voice model'].filter(Boolean).join(' and ');
        setConnectionDetail(`Couldn't reach the ${missing} — try again.`);
      }
    } catch (err) {
      setConnectionStatus('error');
      setConnectionDetail(err instanceof ApiError ? err.message : 'Connection attempt failed.');
    }
  };

  // Real-time voice mode: continuous mic listening with voice-activity
  // detection (VAD) for auto-endpointing, plus "barge-in" — speaking while
  // Vitta is still replying immediately cancels her in-flight reply/audio.
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  // VAD callbacks are registered once (mic session starts once) but need the
  // latest state/handlers each turn — routed through refs updated every
  // render instead of restarting the (slow, permission-gated) mic session.
  const bargeInRef = useRef<() => void>(() => {});
  const runVoiceTurnRef = useRef<(wavBase64: string) => void>(() => {});

  const bargeIn = () => {
    abortControllerRef.current?.abort();
    resetAudioQueue();
    setUserQuery('');
    setWrenText('');
    setIsProcessing(false);
    setStatusText('Listening...');
  };
  bargeInRef.current = bargeIn;

  const runVoiceTurn = async (wavBase64: string) => {
    if (!selectedUserId) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsProcessing(true);
    setUserQuery('🎤 Listening...');
    setStatusText('Transcribing...');
    resetAudioQueue();
    setWrenText('');
    try {
      await api.streamVoiceChat(
        selectedUserId,
        wavBase64,
        { language, voiceGender },
        {
          onTranscript: (text) => {
            setUserQuery(text || '(didn\'t catch that)');
            setStatusText('Thinking...');
          },
          onTextDelta: (text) => setWrenText((prev) => prev + text),
          onAudioChunk: enqueueAudioChunk,
        },
        (attempt, wait) => setStatusText(`All concierge lines are busy — retrying in ${wait}s (attempt ${attempt})...`),
        controller.signal,
      );
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setWrenText(err instanceof ApiError ? err.message : 'Something went wrong reaching Vitta.');
      }
    } finally {
      setIsProcessing(false);
      setStatusText(voiceModeActive ? 'Listening for you...' : 'Here whenever you need me');
    }
  };
  runVoiceTurnRef.current = runVoiceTurn;

  const handleToggleVoiceMode = async () => {
    if (voiceModeActive) {
      await stopVoiceSession();
      setVoiceModeActive(false);
      setStatusText('Here whenever you need me');
      return;
    }
    try {
      await startVoiceSession({
        onSpeechStart: () => bargeInRef.current(),
        onSpeechEnd: (wavBase64) => runVoiceTurnRef.current(wavBase64),
      });
      setVoiceModeActive(true);
      setStatusText('Listening for you...');
    } catch {
      setStatusText("Couldn't access the microphone — check browser permissions.");
    }
  };

  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
  }, []);

  useEffect(() => {
    api.listLanguages().then(setLanguages).catch(() => setLanguages([]));
  }, []);

  // Fetch a user's portfolio and, optionally, greet them with it.
  const loadUser = async (userId: string, { greet = true }: { greet?: boolean } = {}) => {
    setPortfolioLoading(true);
    setTransactions(null);
    setRecommendation(null);
    try {
      const [profile, snapshot] = await Promise.all([api.getUser(userId), api.getPortfolio(userId)]);
      setUserProfile(profile);
      setPortfolio(snapshot);
      if (greet) {
        const direction = snapshot.change_amount >= 0 ? 'up' : 'down';
        setWrenText(
          `Hello, ${profile.name.split(' ')[0]}. Your portfolio is at ₹${snapshot.total_value.toLocaleString(
            'en-IN',
          )}, ${direction} ${Math.abs(snapshot.change_pct).toFixed(2)}% today. I'm ready whenever you want to model a decision.`,
        );
      }
    } catch (err) {
      setWrenText(err instanceof ApiError ? err.message : 'Could not load this account.');
    } finally {
      setPortfolioLoading(false);
      setStatusText('Here whenever you need me');
    }
  };

  useEffect(() => {
    if (activeTab === 'accounts' && !transactions && selectedUserId && !transactionsLoading) {
      setTransactionsLoading(true);
      api.getTransactions(selectedUserId, 10)
        .then(setTransactions)
        .catch(() => setTransactions([]))
        .finally(() => setTransactionsLoading(false));
    }
  }, [activeTab, transactions, selectedUserId, transactionsLoading]);

  useEffect(() => {
    if (activeTab === 'goals' && !recommendation && selectedUserId && !recommendationLoading) {
      setRecommendationLoading(true);
      api.getRecommendation(selectedUserId)
        .then(setRecommendation)
        .catch(() => setRecommendation(null))
        .finally(() => setRecommendationLoading(false));
    }
  }, [activeTab, recommendation, selectedUserId, recommendationLoading]);

  // Load the demo roster once, then greet the first user
  useEffect(() => {
    api
      .listUsers()
      .then(async (list) => {
        setUsers(list);
        if (list.length > 0) {
          setSelectedUserId(list[0].user_id);
          await loadUser(list[0].user_id);
        }
      })
      .catch((err) => {
        setWrenText(err instanceof ApiError ? err.message : 'Something went wrong loading demo users.');
        setStatusText('Offline');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setWrenText('Switching accounts...');
    loadUser(userId);
  };

  const triggerResponse = async (actionId: string, customText?: string) => {
    if (isProcessing || !selectedUserId) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Life-event triggers always play out on their scripted demo user in the
    // backend data — jump the whole widget over so the numbers on screen
    // match the story Vitta is telling.
    if (actionId === 'raise' || actionId === 'medical') {
      setUserQuery(actionId === 'raise' ? 'Got a raise 🎉' : 'Unexpected medical expense');
      setIsProcessing(true);
      setStatusText(actionId === 'raise' ? 'Analyzing salary adjustments...' : 'Reviewing liquidity options...');
      resetAudioQueue();
      setWrenText('');
      try {
        await api.streamTrigger(
          actionId,
          { language, voiceGender },
          {
            onMeta: (meta) => {
              setSelectedUserId(meta.user_id);
              loadUser(meta.user_id, { greet: false });
            },
            onTextDelta: (text) => setWrenText((prev) => prev + text),
            onAudioChunk: enqueueAudioChunk,
          },
          (attempt, wait) => setStatusText(`All concierge lines are busy — retrying in ${wait}s (attempt ${attempt})...`),
          controller.signal,
        );
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setWrenText(err instanceof ApiError ? err.message : 'Something went wrong running that scenario.');
        }
      } finally {
        setUserQuery('');
        setIsProcessing(false);
        setStatusText(voiceModeActive ? 'Listening for you...' : 'Here whenever you need me');
      }
      return;
    }

    const message = actionId === 'afford' ? 'Can I afford this?' : customText;
    if (!message) return;

    setUserQuery(message);
    setIsProcessing(true);
    setStatusText('Processing request...');
    resetAudioQueue();
    setWrenText('');
    try {
      await api.streamChat(
        selectedUserId,
        message,
        { language, voiceGender },
        {
          onTextDelta: (text) => setWrenText((prev) => prev + text),
          onAudioChunk: enqueueAudioChunk,
        },
        (attempt, wait) => setStatusText(`All concierge lines are busy — retrying in ${wait}s (attempt ${attempt})...`),
        controller.signal,
      );
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setWrenText(err instanceof ApiError ? err.message : 'Something went wrong reaching Vitta.');
      }
    } finally {
      setUserQuery('');
      setIsProcessing(false);
      setStatusText(voiceModeActive ? 'Listening for you...' : 'Here whenever you need me');
    }
  };

  const handleSend = (text: string) => {
    triggerResponse('custom', text);
  };

  const handleAction = (actionId: string) => {
    triggerResponse(actionId);
  };

  // Staggered Entrance Animations for sections
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const selectedUser = users.find((u) => u.user_id === selectedUserId);

  return (
    <div className="radial-mesh min-h-screen w-screen flex flex-col lg:flex-row relative overflow-hidden bg-ink select-none">
      {/* Noise texture overlay */}
      <div className="noise-overlay absolute inset-0 z-0" />

      {/* LEFT PANEL: Control Center (30% area) */}
      <div className="w-full lg:w-[30%] xl:w-[28%] max-w-[420px] min-w-[340px] flex flex-col border-b lg:border-b-0 lg:border-r border-ink-border/40 bg-ink-raised/15 backdrop-blur-xl relative z-10 overflow-y-auto custom-scrollbar p-6 gap-6 flex-none">
        
        {/* Branding & Status Header */}
        <div className="flex items-center justify-between pb-4 border-b border-ink-border/30">
          <div>
            <h1 className="font-display-serif text-3xl font-extrabold tracking-widest text-gold bg-gradient-to-r from-gold via-amber-200 to-yellow-100 bg-clip-text text-transparent">VITTA</h1>
            <p className="text-[9px] uppercase tracking-[0.2em] text-paper-dim/80 font-mono mt-0.5">Concierge Control Center</p>
          </div>
          
          <div className="flex items-center gap-2 bg-ink-raised/60 border border-ink-border/40 px-3 py-1 rounded-full">
            <span className={`w-2 h-2 rounded-full ${
              connectionStatus === 'ready' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' :
              connectionStatus === 'connecting' ? 'bg-gold animate-pulse' :
              connectionStatus === 'error' ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]' :
              'bg-paper-dim/30'
            }`} />
            <span className="text-[10px] font-mono font-medium text-paper-dim capitalize">{connectionStatus === 'ready' ? 'Online' : connectionStatus}</span>
          </div>
        </div>

        {/* Preview Device Mode */}
        <div className="bg-ink-raised/40 border border-ink-border/60 p-4 rounded-2xl backdrop-blur-md flex flex-col gap-3">
          <span className="text-[10px] font-mono tracking-widest text-paper-dim/60 uppercase font-semibold">Workspace Display</span>
          <div className="grid grid-cols-2 gap-1 bg-ink/70 border border-ink-border p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setDeviceMode('mobile')}
              className={`flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg transition-all duration-300 font-semibold cursor-pointer ${
                deviceMode === 'mobile'
                  ? 'bg-gold text-ink font-semibold shadow-md'
                  : 'text-paper-dim hover:text-paper'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18.75h12" />
              </svg>
              Mobile View
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('tablet')}
              className={`flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg transition-all duration-300 font-semibold cursor-pointer ${
                deviceMode === 'tablet'
                  ? 'bg-gold text-ink font-semibold shadow-md'
                  : 'text-paper-dim hover:text-paper'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25h6m3 2.25H6a2.25 2.25 0 0 1-2.25-2.25V5.25A2.25 2.25 0 0 1 6 3h12a2.25 2.25 0 0 1 2.25 2.25v12a2.25 2.25 0 0 1-2.25 2.25Z" />
              </svg>
              Tablet View
            </button>
          </div>
        </div>

        {/* Card 1: Active Account Selection */}
        <div className="bg-ink-raised/40 border border-ink-border/60 p-4 rounded-2xl backdrop-blur-md flex flex-col gap-3.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono tracking-widest text-paper-dim/60 uppercase font-semibold">Active Profile</span>
            {selectedUser?.risk_bucket && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                selectedUser.risk_bucket === 'Aggressive' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' :
                selectedUser.risk_bucket === 'Conservative' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
                'bg-gold/10 text-gold border border-gold/20'
              }`}>
                {selectedUser.risk_bucket} Risk
              </span>
            )}
          </div>
          
          <div className="relative">
            <select
              value={selectedUserId}
              disabled={isProcessing || users.length === 0}
              onChange={(e) => handleUserSelect(e.target.value)}
              className="w-full bg-ink/75 border border-ink-border px-3.5 py-2.5 rounded-xl text-xs text-paper focus:text-gold focus:border-gold/50 focus:outline-none cursor-pointer disabled:opacity-40 transition-all duration-300"
            >
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id} className="bg-ink-raised text-paper">
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {selectedUser && (
            <div className="text-xs text-paper-dim/80 space-y-1.5 pt-2 border-t border-ink-border/30">
              <div className="flex justify-between">
                <span>Roster Name:</span>
                <span className="text-paper font-semibold">{selectedUser.name}</span>
              </div>
              {selectedUser.life_event_trigger && (
                <div className="flex flex-col gap-1 mt-1 bg-gold-soft border border-gold/15 px-3 py-2 rounded-xl text-[11px] text-gold">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-gold/60">Active Scenario Trigger:</span>
                  <span className="font-semibold">{selectedUser.life_event_trigger}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card 2: Voice & Language Configuration */}
        <div className="bg-ink-raised/40 border border-ink-border/60 p-4 rounded-2xl backdrop-blur-md flex flex-col gap-4">
          <span className="text-[10px] font-mono tracking-widest text-paper-dim/60 uppercase font-semibold">Voice & Language Settings</span>
          
          <div className="grid grid-cols-1 gap-3.5">
            <div>
              <label className="text-[10px] font-mono text-paper-dim/50 block mb-1">Synthesis Language</label>
              <select
                value={language}
                disabled={isProcessing || languages.length === 0}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-ink/75 border border-ink-border px-3.5 py-2.5 rounded-xl text-xs text-paper focus:text-gold focus:border-gold/50 focus:outline-none cursor-pointer disabled:opacity-40 transition-all duration-300"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code} className="bg-ink-raised text-paper">
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-paper-dim/50 block mb-1.5">Model Voice Profile</label>
              <div className="grid grid-cols-2 gap-1 bg-ink/70 border border-ink-border p-1 rounded-xl">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setVoiceGender('female')}
                  className={`text-xs py-2 rounded-lg transition-all duration-300 font-semibold cursor-pointer ${
                    voiceGender === 'female'
                      ? 'bg-gold text-ink font-semibold shadow-md'
                      : 'text-paper-dim hover:text-paper'
                  }`}
                >
                  Female Voice
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setVoiceGender('male')}
                  className={`text-xs py-2 rounded-lg transition-all duration-300 font-semibold cursor-pointer ${
                    voiceGender === 'male'
                      ? 'bg-gold text-ink font-semibold shadow-md'
                      : 'text-paper-dim hover:text-paper'
                  }`}
                >
                  Male Voice
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Real-time Voice Session */}
        <div className="bg-ink-raised/40 border border-ink-border/60 p-4 rounded-2xl backdrop-blur-md flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono tracking-widest text-paper-dim/60 uppercase font-semibold">Hands-Free Voice Mode</span>
            <div className={`w-2 h-2 rounded-full ${voiceModeActive ? 'bg-gold animate-ping' : 'bg-paper-dim/30'}`} />
          </div>

          <button
            type="button"
            onClick={handleToggleVoiceMode}
            className={`w-full py-3 px-4 rounded-xl font-body font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer border ${
              voiceModeActive
                ? 'bg-gold/15 border-gold text-gold shadow-[0_0_20px_rgba(212,175,106,0.12)] hover:bg-gold/20'
                : 'bg-ink/75 border-ink-border text-paper-dim hover:text-gold hover:border-gold/30'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
            {voiceModeActive ? 'Disable Real-time Voice' : 'Activate Voice Mode'}
          </button>

          {/* VAD active soundwave and log state */}
          <div className="bg-ink/50 border border-ink-border/40 p-3.5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-paper-dim/50 uppercase font-semibold">Engine Status</span>
              <span className="text-[11px] font-semibold text-gold font-body">{statusText}</span>
            </div>
            
            {voiceModeActive && (
              <div className="flex items-end justify-center gap-1.5 py-4 border-y border-ink-border/30 h-16">
                <span className="w-1 bg-gold rounded-full origin-bottom animate-soundwave h-3" style={{ animationDelay: '0.1s' }} />
                <span className="w-1 bg-gold rounded-full origin-bottom animate-soundwave h-6" style={{ animationDelay: '0.3s' }} />
                <span className="w-1 bg-gold rounded-full origin-bottom animate-soundwave h-8" style={{ animationDelay: '0.5s' }} />
                <span className="w-1 bg-gold rounded-full origin-bottom animate-soundwave h-5" style={{ animationDelay: '0.2s' }} />
                <span className="w-1 bg-gold rounded-full origin-bottom animate-soundwave h-7" style={{ animationDelay: '0.4s' }} />
                <span className="w-1 bg-gold rounded-full origin-bottom animate-soundwave h-2" style={{ animationDelay: '0.6s' }} />
              </div>
            )}

            {userQuery && (
              <div className="text-[11px] font-body text-paper-dim italic border-t border-ink-border/10 pt-2 text-center leading-relaxed">
                "{userQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Cold Start Warmup controls */}
        <div className="bg-ink-raised/40 border border-ink-border/60 p-4 rounded-2xl backdrop-blur-md flex flex-col gap-3 mt-auto">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono tracking-widest text-paper-dim/60 uppercase font-semibold">Models warmup</span>
            <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'ready' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </div>

          {(connectionStatus === 'idle' || connectionStatus === 'error') && (
            <button
              type="button"
              onClick={handleConnect}
              className="w-full py-2.5 px-3 bg-ink/75 border border-ink-border hover:border-gold/30 hover:text-gold text-paper rounded-xl text-xs font-semibold font-body cursor-pointer transition-all duration-300"
            >
              {connectionStatus === 'error' ? 'Retry Warmup Session' : 'Warm Up AI Containers'}
            </button>
          )}

          {connectionDetail && (
            <div className="text-[10px] text-rose-300 font-mono leading-relaxed bg-rose-500/5 p-2 rounded-xl border border-rose-500/10">
              {connectionDetail}
            </div>
          )}

          {connectionStatus === 'ready' && (
            <div className="text-[10px] text-emerald-300 font-mono bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/10 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400 flex-shrink-0">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              AI models are awake and responsive.
            </div>
          )}
        </div>

      </div>

      {/* RIGHT PANEL: Main View Workspace (70% area) */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-8 relative min-h-0 z-10 overflow-y-auto custom-scrollbar">

        {/* Centered Device Container */}
        <div className="flex-1 w-full flex items-center justify-center min-h-0">
          <motion.div
            layout
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] as const }}
            className={`bg-ink/95 border border-ink-border relative shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col pt-6 px-6 pb-0 overflow-hidden transition-all duration-500 ${
              deviceMode === 'mobile'
                ? 'w-[395px] h-[844px] rounded-[32px] justify-between'
                : 'w-full max-w-[1080px] h-[720px] rounded-[28px] justify-between'
            }`}
          >
            {/* Notch header for mobile phone format */}
            {deviceMode === 'mobile' && (
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4 rounded-full bg-ink-raised border border-ink-border/30 flex items-center justify-center z-20">
                <div className="w-10 h-1 rounded-full bg-ink-border/60" />
              </div>
            )}

            {/* Free-tier quota badge — visible to the end user, not just us */}
            {quota && (
              <div className={`absolute top-3 right-3 z-20 ${deviceMode === 'mobile' ? 'top-8' : ''}`}>
                <QuotaBadge remainingSeconds={quota.remainingSeconds} totalSeconds={quota.totalSeconds} />
              </div>
            )}

            {/* Tab content display area */}
            <div className="flex-1 min-h-0 w-full flex flex-col overflow-y-auto custom-scrollbar mt-4 mb-1">
              {activeTab === 'home' ? (
                <motion.div
                  layout
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className={`flex h-full z-10 ${
                    deviceMode === 'mobile' ? 'flex-col pt-4 justify-between gap-3' : 'flex-row items-center justify-between gap-6'
                  }`}
                >
                  {deviceMode === 'mobile' ? (
                    <>
                      {/* Mobile Layout: Stacked concierge sections */}
                      <motion.div layout variants={itemVariants} className="flex flex-col items-center justify-center flex-1 min-h-0">
                        <Avatar statusText={statusText} isProcessing={isProcessing} />
                        <SpokenLine wrenText={wrenText} userQuery={userQuery} />
                      </motion.div>

                      <motion.div layout variants={itemVariants} className="flex-none">
                        <PortfolioSnapshot
                          defaultExpanded={false}
                          totalValue={portfolio.total_value}
                          changeAmount={portfolio.change_amount}
                          changePct={portfolio.change_pct}
                          allocation={portfolio.allocation}
                          loading={portfolioLoading}
                        />
                      </motion.div>

                      <div className="flex flex-col gap-3 flex-none">
                        <motion.div layout variants={itemVariants} className="overflow-visible">
                          <QuickActions onActionClick={handleAction} disabled={isProcessing} />
                        </motion.div>

                        <motion.div layout variants={itemVariants} className="mb-1">
                          <InputBar onSend={handleSend} disabled={isProcessing} />
                        </motion.div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Tablet Layout: Split Pane Dashboard */}
                      {/* Left Column: Avatar & Spoken Response zone */}
                      <motion.div layout variants={itemVariants} className="flex-1 h-full flex flex-col items-center justify-center border-r border-ink-border/30 pr-8">
                        <Avatar statusText={statusText} isProcessing={isProcessing} />
                        <SpokenLine wrenText={wrenText} userQuery={userQuery} />
                      </motion.div>

                      {/* Right Column: Expanded Portfolio Snapshot, Actions, Input */}
                      <motion.div layout variants={itemVariants} className="w-[380px] flex-none h-full flex flex-col justify-center gap-5 pl-8">
                        <div className="w-full">
                          <PortfolioSnapshot
                            defaultExpanded={true}
                            totalValue={portfolio.total_value}
                            changeAmount={portfolio.change_amount}
                            changePct={portfolio.change_pct}
                            allocation={portfolio.allocation}
                            loading={portfolioLoading}
                          />
                        </div>

                        <div className="overflow-visible w-full">
                          <QuickActions onActionClick={handleAction} disabled={isProcessing} />
                        </div>

                        <div className="mb-1 w-full">
                          <InputBar onSend={handleSend} disabled={isProcessing} />
                        </div>
                      </motion.div>
                    </>
                  )}
                </motion.div>
              ) : activeTab === 'accounts' ? (
                <AccountsTab
                  currentSavings={userProfile?.current_savings ?? 0}
                  transactions={transactions}
                  loading={transactionsLoading}
                />
              ) : activeTab === 'invest' ? (
                <InvestTab
                  portfolio={portfolio}
                  loading={portfolioLoading}
                />
              ) : (
                <GoalsTab
                  userProfile={userProfile}
                  recommendation={recommendation}
                  loading={recommendationLoading}
                />
              )}
            </div>

            {/* Bottom Tab Navigation Bar */}
            <TabBar active={activeTab} onChange={setActiveTab} deviceMode={deviceMode} />
          </motion.div>
        </div>

      </div>
    </div>
  );
}
