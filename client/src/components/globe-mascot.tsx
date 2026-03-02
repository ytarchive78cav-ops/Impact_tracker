import { motion } from "framer-motion";

interface GlobeMascotProps {
  mood?: "happy" | "excited" | "sleeping" | "neutral";
  className?: string;
  size?: number;
}

export function GlobeMascot({ mood = "neutral", className = "", size = 120 }: GlobeMascotProps) {
  const isBouncing = mood === "excited";

  const bounceVariants = {
    excited: {
      y: [0, -15, 0],
      transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
    },
    neutral: {
      y: [0, -5, 0],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
    }
  };

  const Eye = ({ x, sleeping }: { x: number; sleeping?: boolean }) => {
    if (sleeping) {
      return (
        <path
          d={`M ${x-6} 0 Q ${x} 6 ${x+6} 0`}
          stroke="#1C1917"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      );
    }
    if (mood === "happy" || mood === "excited") {
      return (
        <path
          d={`M ${x-5} 2 Q ${x} -6 ${x+5} 2`}
          stroke="#1C1917"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      );
    }
    return <circle cx={x} cy="0" r="4.5" fill="#1C1917" />;
  };

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <motion.div
        variants={bounceVariants}
        animate={isBouncing ? "excited" : "neutral"}
        className="w-full h-full"
      >
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
          {/* Globe Base */}
          <circle cx="50" cy="50" r="45" fill="#BAE6FD" />
          
          {/* Continents (Simplified for cuteness) */}
          <path d="M 20 40 Q 30 20 50 30 Q 60 40 40 60 Q 20 70 20 40" fill="#86EFAC" />
          <path d="M 60 20 Q 80 15 85 35 Q 90 50 70 50 Q 55 45 60 20" fill="#86EFAC" />
          <path d="M 50 70 Q 70 60 80 80 Q 70 95 50 90 Q 35 80 50 70" fill="#86EFAC" />

          {/* Face Group */}
          <g transform="translate(50, 50)">
            {/* Eyes */}
            <Eye x={-15} sleeping={mood === "sleeping"} />
            <Eye x={15} sleeping={mood === "sleeping"} />
            
            {/* Cheeks */}
            {mood !== "sleeping" && (
              <>
                <circle cx="-22" cy="8" r="4" fill="#FDA4AF" opacity="0.6" />
                <circle cx="22" cy="8" r="4" fill="#FDA4AF" opacity="0.6" />
              </>
            )}

            {/* Mouth */}
            {mood === "sleeping" ? (
              <circle cx="0" cy="8" r="2" fill="#1C1917" />
            ) : mood === "excited" ? (
              <path d="M -6 6 Q 0 16 6 6 Z" fill="#1C1917" />
            ) : (
              <path d="M -5 6 Q 0 12 5 6" stroke="#1C1917" strokeWidth="3" strokeLinecap="round" fill="none" />
            )}
          </g>
          
          {/* Shine effect for 3D look */}
          <path d="M 15 30 A 35 35 0 0 1 45 10" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.4" fill="none" />
        </svg>
      </motion.div>
      
      {/* Floating Sparkles when excited */}
      {mood === "excited" && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], y: -20 }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          className="absolute -top-4 -right-4 text-2xl"
        >
          ✨
        </motion.div>
      )}
    </div>
  );
}
