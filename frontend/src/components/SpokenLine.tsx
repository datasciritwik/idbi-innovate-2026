import { motion, AnimatePresence } from 'motion/react';

interface SpokenLineProps {
  vittaText: string;
  userQuery?: string;
}

export default function SpokenLine({ vittaText, userQuery }: SpokenLineProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 w-full select-none min-h-[110px] my-2">
      {/* User Query Flash Area */}
      <div className="h-6 mb-1 overflow-hidden flex items-center justify-center">
        <AnimatePresence mode="wait">
          {userQuery && (
            <motion.div
              key={userQuery}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.4, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="font-body text-xs font-medium tracking-wide text-paper-dim italic"
            >
              “{userQuery}”
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Vitta Spoken Line */}
      <div className="relative w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={vittaText}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.95, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="font-display-serif italic font-light text-[17px] text-paper leading-relaxed tracking-wide"
          >
            {vittaText}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
