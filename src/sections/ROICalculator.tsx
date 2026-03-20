import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, DollarSign, Clock, ArrowRight, RefreshCcw } from 'lucide-react';

export default function ROICalculator() {
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [hourlyRate, setHourlyRate] = useState(50);
  const [showResults, setShowResults] = useState(false);

  const weeklySavings = hoursPerWeek * hourlyRate;
  const monthlySavings = weeklySavings * 4;
  const yearlySavings = weeklySavings * 52;
  const roi = ((yearlySavings - 12000) / 12000) * 100; // Assuming $12k automation cost

  return (
    <section className="py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-12 bg-jungle relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-neon/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-10 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-neon/10 border border-neon/20 mb-4 sm:mb-6"
          >
            <Calculator className="w-4 h-4 text-neon" />
            <span className="text-neon text-xs sm:text-sm font-mono">Interactive Calculator</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-[clamp(2rem,4vw,3rem)] font-bold text-warm leading-[1.1] mb-4"
          >
            Calculate Your{' '}
            <span className="text-neon">Time Savings</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-warm-72 text-base sm:text-lg max-w-2xl mx-auto px-4 sm:px-0"
          >
            See how much time and money you'll save by automating your Amazon business
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="bg-warm/5 border border-warm/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm mx-4 sm:mx-0"
        >
          {/* Input Section */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <label className="block text-warm mb-3 font-medium">
                Hours spent on Amazon tasks per week
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={hoursPerWeek}
                  onChange={(e) => {
                    setHoursPerWeek(Number(e.target.value));
                    setShowResults(false);
                  }}
                  className="flex-1 h-2 bg-warm/20 rounded-lg appearance-none cursor-pointer accent-neon"
                />
                <span className="text-neon font-mono text-xl min-w-[60px]">
                  {hoursPerWeek}h
                </span>
              </div>
              <p className="text-warm/60 text-sm mt-2">
                Typical sellers spend 10-20 hours/week on repetitive tasks
              </p>
            </div>

            <div>
              <label className="block text-warm mb-3 font-medium">
                Your hourly rate (or value of your time)
              </label>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-warm/60" />
                  <input
                    type="number"
                    min="20"
                    max="500"
                    value={hourlyRate}
                    onChange={(e) => {
                      setHourlyRate(Number(e.target.value));
                      setShowResults(false);
                    }}
                    className="w-full bg-jungle border border-warm/20 rounded-lg px-12 py-3 text-warm focus:border-neon focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <p className="text-warm/60 text-sm mt-2">
                Consider what you could earn focusing on growth instead
              </p>
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={() => setShowResults(true)}
            className="w-full btn-primary py-4 text-lg font-semibold flex items-center justify-center gap-2 group"
          >
            Calculate My Savings
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>

          {/* Results */}
          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-8 pt-8 border-t border-warm/10"
              >
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <ResultCard
                    icon={Clock}
                    label="Weekly Time Saved"
                    value={`${hoursPerWeek} hours`}
                    delay={0}
                  />
                  <ResultCard
                    icon={DollarSign}
                    label="Monthly Value"
                    value={`$${monthlySavings.toLocaleString()}`}
                    delay={0.1}
                    highlight
                  />
                  <ResultCard
                    icon={DollarSign}
                    label="Yearly Value"
                    value={`$${yearlySavings.toLocaleString()}`}
                    delay={0.2}
                    highlight
                  />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-neon/10 border border-neon/30 rounded-xl p-6 text-center"
                >
                  <p className="text-warm text-lg mb-2">
                    Return on Investment
                  </p>
                  <p className="text-neon font-display text-5xl font-bold">
                    {roi > 0 ? '+' : ''}{roi.toFixed(0)}%
                  </p>
                  <p className="text-warm-72 text-sm mt-2">
                    First-year ROI based on typical automation investment
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 text-center"
                >
                  <button
                    onClick={() => setShowResults(false)}
                    className="text-warm/60 hover:text-warm flex items-center gap-2 mx-auto transition-colors"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Recalculate
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

function ResultCard({ icon: Icon, label, value, delay, highlight = false }: {
  icon: React.ElementType;
  label: string;
  value: string;
  delay: number;
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`p-6 rounded-xl text-center ${
        highlight 
          ? 'bg-neon/10 border border-neon/30' 
          : 'bg-warm/5 border border-warm/10'
      }`}
    >
      <Icon className={`w-6 h-6 mx-auto mb-2 ${highlight ? 'text-neon' : 'text-warm-72'}`} />
      <p className="text-warm-72 text-sm mb-1">{label}</p>
      <p className={`font-display text-2xl font-bold ${highlight ? 'text-neon' : 'text-warm'}`}>
        {value}
      </p>
    </motion.div>
  );
}
