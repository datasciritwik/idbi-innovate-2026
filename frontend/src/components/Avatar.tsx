import { motion } from 'motion/react';

interface AvatarProps {
  statusText?: string;
  isProcessing?: boolean;
}

export default function Avatar({ statusText = "Active now", isProcessing = false }: AvatarProps) {
  return (
    <div className="flex flex-col items-center justify-center py-4 text-center select-none">
      {/* Orb Stage */}
      <div className="relative flex items-center justify-center w-52 h-52 mb-2">
        {/* Hologram Stage Platform Glow */}
        <div className="absolute bottom-6 w-32 h-[3px] bg-gradient-to-r from-transparent via-gold/45 to-transparent blur-[1.5px] opacity-70 animate-pulse" />
        <div className="absolute bottom-6 w-16 h-[1.5px] bg-gradient-to-r from-transparent via-paper/40 to-transparent blur-[0.5px]" />

        {/* Slow Rotating Dashed Outer Ring (Gyroscopic Orbit) */}
        <motion.div
          className="absolute rounded-full w-48 h-48 border border-dashed border-gold/15"
          animate={{ rotate: 360 }}
          transition={{
            duration: 35,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Counter-Rotating Dotted Inner Ring */}
        <motion.div
          className="absolute rounded-full w-40 h-40 border border-dotted border-gold/15"
          animate={{ rotate: -360 }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Glow Ring 1 (Background ambient pulse) */}
        <motion.div
          className="absolute rounded-full w-48 h-48 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(212, 175, 106, 0.25) 0%, transparent 70%)'
          }}
          animate={{
            scale: isProcessing ? [1, 1.12, 1] : [1, 1.04, 1],
            opacity: isProcessing ? [0.7, 0.95, 0.7] : [0.45, 0.6, 0.45],
          }}
          transition={{
            duration: isProcessing ? 2 : 4.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Glow Ring 2 (Core glowing orb) */}
        <motion.div
          className="relative rounded-full w-36 h-36 shadow-[0_0_35px_rgba(212,175,106,0.3)]"
          style={{
            background: 'radial-gradient(circle, #f4efe6 0%, #d4af6a 35%, rgba(212, 175, 106, 0.2) 75%, transparent 100%)'
          }}
          animate={{
            scale: isProcessing ? [1, 1.04, 1] : [1, 1.02, 1],
            filter: isProcessing 
              ? ["drop-shadow(0 0 18px rgba(212,175,106,0.55))", "drop-shadow(0 0 28px rgba(212,175,106,0.75))", "drop-shadow(0 0 18px rgba(212,175,106,0.55))"] 
              : ["drop-shadow(0 0 8px rgba(212,175,106,0.25))", "drop-shadow(0 0 18px rgba(212,175,106,0.45))", "drop-shadow(0 0 8px rgba(212,175,106,0.25))"],
          }}
          transition={{
            duration: isProcessing ? 1.5 : 4.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Subtle inner core shimmer */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-gold-soft to-paper/10 blur-[0.8px]" />
        </motion.div>

        {/* Spinning indicator ring when thinking */}
        {isProcessing && (
          <motion.div
            className="absolute rounded-full w-44 h-44 border border-gold/35 border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
      </div>

      {/* Identity */}
      <h1 className="font-display-serif text-3xl font-light tracking-wide text-paper mb-0.5">
        Vitta
      </h1>
      
      {/* Status */}
      <p className="font-body text-[9px] font-medium tracking-widest text-paper-dim uppercase transition-all duration-300">
        {statusText}
      </p>
    </div>
  );
}
