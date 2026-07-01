import { useState } from 'react';
import { motion } from 'motion/react';
import Avatar from './components/Avatar';
import PortfolioSnapshot from './components/PortfolioSnapshot';
import SpokenLine from './components/SpokenLine';
import QuickActions from './components/QuickActions';
import InputBar from './components/InputBar';

export default function App() {
  // Toggle device mockup modes
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'tablet'>('mobile');

  // Wren's active spoken response line
  const [wrenText, setWrenText] = useState(
    "Hello. I've completed a refresh of your transactions. Your portfolio is holding steady, and I'm ready whenever you want to model a decision."
  );
  
  // User's voice/query flash text
  const [userQuery, setUserQuery] = useState<string>('');
  
  // Concierge processing states
  const [statusText, setStatusText] = useState("Here whenever you need me");
  const [isProcessing, setIsProcessing] = useState(false);

  const triggerResponse = (actionId: string, customText?: string) => {
    if (isProcessing) return;

    let queryText = "";
    let nextResponseText = "";
    let pendingStatus = "Analyzing...";

    if (actionId === 'raise') {
      queryText = "Got a raise 🎉";
      pendingStatus = "Analyzing salary adjustments...";
      nextResponseText = "Incredible news! A salary bump is the perfect time to accelerate your wealth. If we redirect 50% of your net increase to your Emerging Opportunities SIP, we can hit your house down-payment goal 7 months early. Shall we set that up?";
    } else if (actionId === 'medical') {
      queryText = "Unexpected medical expense";
      pendingStatus = "Reviewing liquidity options...";
      nextResponseText = "I'm sorry to hear that. Let's make room. Your Liquid Fund holds ₹1.25L, which is fully accessible in 24 hours without penalty. I recommend pulling from there first to avoid disrupting your equity compounding.";
    } else if (actionId === 'afford') {
      queryText = "Can I afford this?";
      pendingStatus = "Running afford scenarios...";
      nextResponseText = "Tell me the amount or what you're planning. I'll compare it against your cashflow projection and emergency reserves to see how it fits.";
    } else if (actionId === 'custom' && customText) {
      queryText = customText;
      pendingStatus = "Processing request...";
      nextResponseText = "I am currently running in offline mockup mode, but once we connect the personalization engine, I will analyze your UPI data and transactions to answer this directly.";
    }

    if (!queryText) return;

    // Phase 1: Flash User Query immediately and start orb thinking
    setUserQuery(queryText);
    setIsProcessing(true);
    setStatusText(pendingStatus);

    // Phase 2: After 1.5 seconds, fade user query and swap Wren's spoken line
    setTimeout(() => {
      setUserQuery('');
      setWrenText(nextResponseText);
      setIsProcessing(false);
      setStatusText("Here whenever you need me");
    }, 1500);
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
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1] as const
      }
    }
  };

  return (
    <div className="radial-mesh min-h-screen w-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Noise texture overlay */}
      <div className="noise-overlay absolute inset-0 z-0" />

      {/* Device Switcher Control Bar - Moved to Top-Right */}
      <div className="absolute top-6 right-6 z-30 flex items-center bg-ink-raised/65 border border-ink-border px-1.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md">
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
            deviceMode === 'mobile'
              ? 'flex-col pt-4 justify-between gap-3'
              : 'flex-row items-center justify-between gap-6'
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
                <PortfolioSnapshot defaultExpanded={false} />
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
                  <PortfolioSnapshot defaultExpanded={true} />
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
