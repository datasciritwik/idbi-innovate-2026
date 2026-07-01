import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import Avatar from './components/Avatar';
import PortfolioSnapshot from './components/PortfolioSnapshot';
import SpokenLine from './components/SpokenLine';
import QuickActions from './components/QuickActions';
import InputBar from './components/InputBar';
import UserSwitcher from './components/UserSwitcher';
import VoiceSettings from './components/VoiceSettings';
import ConnectButton from './components/ConnectButton';
import type { ConnectionStatus } from './components/ConnectButton';
import VoiceModeToggle from './components/VoiceModeToggle';
import { api, ApiError } from './lib/api';
import type { LanguageInfo, PortfolioSnapshot as PortfolioSnapshotData, UserSummary, VoiceGender } from './lib/api';
import { enqueueAudioChunk, resetAudioQueue } from './lib/audio';
import { startVoiceSession, stopVoiceSession } from './lib/voice';

const emptyPortfolio: PortfolioSnapshotData = {
  user_id: '',
  total_value: 0,
  change_amount: 0,
  change_pct: 0,
  allocation: [],
};

export default function App() {
  // Toggle device mockup modes
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'tablet'>('mobile');

  // Demo user roster + current selection
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [portfolio, setPortfolio] = useState<PortfolioSnapshotData>(emptyPortfolio);
  const [portfolioLoading, setPortfolioLoading] = useState(true);

  // Wren's active spoken response line
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
  // Wren is still replying immediately cancels her in-flight reply/audio.
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
        setWrenText(err instanceof ApiError ? err.message : 'Something went wrong reaching Wren.');
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
    try {
      const [userProfile, snapshot] = await Promise.all([api.getUser(userId), api.getPortfolio(userId)]);
      setPortfolio(snapshot);
      if (greet) {
        const direction = snapshot.change_amount >= 0 ? 'up' : 'down';
        setWrenText(
          `Hello, ${userProfile.name.split(' ')[0]}. Your portfolio is at ₹${snapshot.total_value.toLocaleString(
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
    // match the story Wren is telling.
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
        setWrenText(err instanceof ApiError ? err.message : 'Something went wrong reaching Wren.');
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

  return (
    <div className="radial-mesh min-h-screen w-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Noise texture overlay */}
      <div className="noise-overlay absolute inset-0 z-0" />

      {/* Top-right control bar: user switcher + device mode */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
        <ConnectButton status={connectionStatus} detail={connectionDetail} onConnect={handleConnect} />

        <VoiceModeToggle active={voiceModeActive} onToggle={handleToggleVoiceMode} />

        <UserSwitcher
          users={users}
          selectedUserId={selectedUserId}
          onSelect={handleUserSelect}
          disabled={isProcessing}
        />

        <VoiceSettings
          languages={languages}
          language={language}
          onLanguageChange={setLanguage}
          voiceGender={voiceGender}
          onVoiceGenderChange={setVoiceGender}
          disabled={isProcessing}
        />

        <div className="flex items-center bg-ink-raised/65 border border-ink-border px-1.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => setDeviceMode('mobile')}
            className={`flex items-center gap-1.5 text-xs font-body font-medium px-4 py-2 rounded-full transition-all duration-300 cursor-pointer focus:outline-none ${
              deviceMode === 'mobile'
                ? 'bg-gold text-ink font-semibold shadow-[0_4px_12px_rgba(212,175,106,0.35)]'
                : 'text-paper-dim hover:text-paper'
            }`}
          >
            {/* Phone Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18.75h12" />
            </svg>
            Mobile
          </button>
          <button
            type="button"
            onClick={() => setDeviceMode('tablet')}
            className={`flex items-center gap-1.5 text-xs font-body font-medium px-4 py-2 rounded-full transition-all duration-300 cursor-pointer focus:outline-none ${
              deviceMode === 'tablet'
                ? 'bg-gold text-ink font-semibold shadow-[0_4px_12px_rgba(212,175,106,0.35)]'
                : 'text-paper-dim hover:text-paper'
            }`}
          >
            {/* Tablet Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25h6m3 2.25H6a2.25 2.25 0 0 1-2.25-2.25V5.25A2.25 2.25 0 0 1 6 3h12a2.25 2.25 0 0 1 2.25 2.25v12a2.25 2.25 0 0 1-2.25 2.25Z" />
            </svg>
            Tablet
          </button>
        </div>
      </div>

      {/* Widget Container - Phone or Tablet Mockup Frame */}
      <motion.div
        layout
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] as const }}
        className={`bg-ink/95 border border-ink-border relative z-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col p-6 overflow-hidden transition-all duration-500 ${
          deviceMode === 'mobile'
            ? 'w-[395px] h-[844px] rounded-[32px] justify-between'
            : 'w-[90%] max-w-[1100px] h-[750px] max-h-[80vh] rounded-[28px] justify-center'
        }`}
      >
        {/* Sleek top phone notch speaker bar (Only visible in mobile mode) */}
        {deviceMode === 'mobile' && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4 rounded-full bg-ink-raised border border-ink-border/30 flex items-center justify-center z-20">
            <div className="w-10 h-1 rounded-full bg-ink-border/60" />
          </div>
        )}

        {/* Inner layout container with adaptive flex directions */}
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
              {/* Mobile Layout: Stacked view */}
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
              {/* Left Column: Avatar Zone & Spoken Line */}
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
      </motion.div>
    </div>
  );
}
