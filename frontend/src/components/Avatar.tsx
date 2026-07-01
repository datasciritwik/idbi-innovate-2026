import { motion } from 'motion/react';

interface AvatarProps {
  statusText?: string;
  isProcessing?: boolean;
}

export default function Avatar({ statusText = "Active now", isProcessing = false }: AvatarProps) {
  return (
    <div className="flex flex-col items-center justify-center py-4 text-center select-none">
      {/* Orb Stage */}
      <div className="relative flex items-center justify-center w-52 h-52 mb-1">
        {/* Glow Ring 1 (Background ambient pulse) */}
        <motion.div
          className="absolute rounded-full w-48 h-48 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(212, 175, 106, 0.22) 0%, transparent 70%)'
          }}
          animate={{
            scale: isProcessing ? [1, 1.12, 1] : [1, 1.04, 1],
            opacity: isProcessing ? [0.6, 0.9, 0.6] : [0.4, 0.55, 0.4],
          }}
          transition={{
            duration: isProcessing ? 2 : 4.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Glow Ring 2 (Core glowing orb) */}
        <motion.div
          className="relative rounded-full w-36 h-36 shadow-[0_0_35px_rgba(212,175,106,0.25)]"
          style={{
            background: 'radial-gradient(circle, #f4efe6 0%, #d4af6a 35%, rgba(212, 175, 106, 0.15) 75%, transparent 100%)'
          }}
          animate={{
            scale: isProcessing ? [1, 1.04, 1] : [1, 1.02, 1],
            filter: isProcessing 
              ? ["drop-shadow(0 0 15px rgba(212,175,106,0.45))", "drop-shadow(0 0 25px rgba(212,175,106,0.65))", "drop-shadow(0 0 15px rgba(212,175,106,0.45))"] 
              : ["drop-shadow(0 0 8px rgba(212,175,106,0.2))", "drop-shadow(0 0 15px rgba(212,175,106,0.35))", "drop-shadow(0 0 8px rgba(212,175,106,0.2))"],
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
            className="absolute rounded-full w-44 h-44 border border-gold/25 border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
      </div>

      {/* Identity */}
      <h1 className="font-display-serif text-3xl font-light tracking-wide text-paper mb-0.5">
        Wren
      </h1>
      
      {/* Status */}
      <p className="font-body text-[9px] font-medium tracking-widest text-paper-dim uppercase transition-all duration-300">
        {statusText}
      </p>
    </div>
  );
}
