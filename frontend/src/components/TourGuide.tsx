import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';

export interface TourStep {
  targetId: string;
  title: string;
  description: string;
  position: 'right' | 'left' | 'top' | 'bottom' | 'center';
}

const steps: TourStep[] = [
  {
    targetId: 'tour-connect',
    title: '1. Assistant Connection',
    description: 'Click Connect to wake up the Vitta AI session. The connection indicator will pulse gold while connecting and turn green when online.',
    position: 'right',
  },
  {
    targetId: 'tour-workspace',
    title: '2. Workspace Display Toggle',
    description: 'Change the viewport layout between Mobile Mockup and Tablet Mockup modes to test responsiveness.',
    position: 'right',
  },
  {
    targetId: 'tour-profile',
    title: '3. Active Profile & Scenarios',
    description: 'Select simulated customer roster profiles to inspect custom asset sheets. Click active scenario buttons (like got a raise) to run dynamic back-end updates.',
    position: 'right',
  },
  {
    targetId: 'tour-voice',
    title: '4. Voice & Language Synthesis',
    description: 'Configure your preferred audio language and select either a female or male voice profile for the synthesis voice output.',
    position: 'right',
  },
  {
    targetId: 'tour-handsfree',
    title: '5. Hands-Free Voice Sessions',
    description: 'Activate continuous hands-free listening with automated voice-activity detection (VAD), live transcripts, and micro-soundwave animations.',
    position: 'right',
  },
  {
    targetId: 'tour-mockup',
    title: '6. Simulated Device Terminal',
    description: 'This is the main interactive interface for Vitta. The device mockup automatically scales and centers to fit your viewport height.',
    position: 'left',
  },
  {
    targetId: 'tour-tabs',
    title: '7. Sub-Screen Navigation',
    description: 'Use the floating capsule bottom dock inside the card to toggle between Home (Chat), Accounts (Balance & Ledger), Invest (Holdings), and Goals (Advisory suggestions) screens.',
    position: 'top',
  },
];

interface TourGuideProps {
  onClose: () => void;
}

export default function TourGuide({ onClose }: TourGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const activeStep = steps[currentStep];

  useEffect(() => {
    const target = document.getElementById(activeStep.targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStep, activeStep.targetId]);

  useEffect(() => {
    const calculatePositions = () => {
      const target = document.getElementById(activeStep.targetId);
      if (!target) {
        setCoords(null);
        setTooltipPos({
          top: window.innerHeight / 2 - 100,
          left: window.innerWidth / 2 - 160,
        });
        return;
      }

      const rect = target.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });

      const gap = 16;
      let tTop = rect.top;
      let tLeft = rect.left;

      const tooltipWidth = 320; // w-80
      // Dynamically measure actual tooltip height from the DOM ref, falling back to 220
      const tooltipHeight = tooltipRef.current ? tooltipRef.current.offsetHeight : 220;

      if (activeStep.position === 'right') {
        tLeft = rect.right + gap;
        tTop = rect.top + rect.height / 2 - tooltipHeight / 2;
        if (tLeft + tooltipWidth > window.innerWidth) {
          tLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
          tTop = rect.bottom + gap;
        }
      } else if (activeStep.position === 'left') {
        tLeft = rect.left - tooltipWidth - gap;
        tTop = rect.top + rect.height / 2 - tooltipHeight / 2;
        if (tLeft < 0) {
          tLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
          tTop = rect.bottom + gap;
        }
      } else if (activeStep.position === 'top') {
        tLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
        tTop = rect.top - tooltipHeight - gap;
        if (tTop < 0) {
          tTop = rect.bottom + gap;
        }
      } else if (activeStep.position === 'bottom') {
        tLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
        tTop = rect.bottom + gap;
      }

      // Constrain inside viewport margins with dynamic height
      tLeft = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, tLeft));
      tTop = Math.max(16, Math.min(window.innerHeight - tooltipHeight - 16, tTop));

      setTooltipPos({ top: tTop, left: tLeft });
    };

    calculatePositions();

    window.addEventListener('resize', calculatePositions);
    window.addEventListener('scroll', calculatePositions, true);
    const interval = setInterval(calculatePositions, 250);

    return () => {
      window.removeEventListener('resize', calculatePositions);
      window.removeEventListener('scroll', calculatePositions, true);
      clearInterval(interval);
    };
  }, [currentStep, activeStep.targetId, activeStep.position]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('vitta.tourCompleted', 'true');
    onClose();
  };

  return (
    <>
      {/* Dim backdrop with focus cutout shadow */}
      {coords && (
        <motion.div
          layout
          initial={false}
          animate={{
            top: coords.top - 8,
            left: coords.left - 8,
            width: coords.width + 16,
            height: coords.height + 16,
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="fixed rounded-2xl border-2 border-gold shadow-[0_0_0_9999px_rgba(11,15,26,0.85),0_0_20px_rgba(212,175,106,0.35)] z-[95] pointer-events-none"
        />
      )}

      {/* Backdrop blocker to intercept interactions during tour */}
      <div className="fixed inset-0 bg-transparent z-[91] pointer-events-auto cursor-default" />

      {/* Onboarding Tooltip Card */}
      {tooltipPos && (
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: 1,
            scale: 1,
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 220 }}
          className="fixed z-[101] w-80 p-5 bg-ink-raised border border-ink-border rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-4 pointer-events-auto select-none"
        >
          {/* Header */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono tracking-widest text-gold uppercase font-bold">
              Interactive Tour
            </span>
            <span className="text-[10px] font-mono text-paper-dim/60 font-semibold">
              {currentStep + 1} of {steps.length}
            </span>
          </div>

          {/* Text Content */}
          <div className="space-y-1">
            <h3 className="font-display-serif text-base font-semibold text-paper leading-tight">
              {activeStep.title}
            </h3>
            <p className="font-body text-xs text-paper-dim leading-relaxed">
              {activeStep.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-ink-border/30 mt-1">
            <button
              type="button"
              onClick={handleFinish}
              className="text-[10px] font-mono uppercase text-paper-dim/50 hover:text-danger font-semibold cursor-pointer transition-colors duration-300 focus:outline-none"
            >
              Skip
            </button>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-3 py-1.5 rounded-lg border border-ink-border text-[10px] font-mono uppercase font-bold text-paper-dim hover:text-paper hover:bg-ink-border/30 cursor-pointer transition-all duration-300 focus:outline-none"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="px-3.5 py-1.5 rounded-lg bg-gold text-ink text-[10px] font-mono uppercase font-bold shadow-md hover:shadow-lg hover:bg-yellow-400 cursor-pointer transition-all duration-300 focus:outline-none"
              >
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
