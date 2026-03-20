import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowRight } from 'lucide-react';

const checklistItems = [
  { id: 1, text: 'Connect Amazon account', completed: true },
  { id: 2, text: 'Run River AI audit', completed: true },
  { id: 3, text: 'Review automation plan', completed: false },
  { id: 4, text: 'Approve & build', completed: false },
  { id: 5, text: 'Launch & handoff', completed: false },
];

export default function InteractiveChecklist() {
  const [items, setItems] = useState(checklistItems);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const completed = items.filter(item => item.completed).length;
    setProgress((completed / items.length) * 100);
  }, [items]);

  const toggleItem = (id: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  return (
    <section className="py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-12 bg-jungle/80 backdrop-blur-sm relative overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-neon/10 border border-neon/20 mb-4 sm:mb-6"
          >
            <Sparkles className="w-4 h-4 text-neon" />
            <span className="text-neon text-xs sm:text-sm font-mono">Try It Yourself</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-warm mb-4"
          >
            Your Automation{' '}
            <span className="text-neon">Journey</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-warm-72 text-base sm:text-lg"
          >
            Click to check off your progress
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="bg-warm/5 border border-warm/10 rounded-2xl p-6 sm:p-8"
        >
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-warm-72">Progress</span>
              <span className="text-neon font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="h-3 bg-warm/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-neon to-neon-light rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            {items.map((item, index) => (
              <motion.button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                  item.completed
                    ? 'bg-neon/5 border-neon/20'
                    : 'bg-warm/[0.02] border-warm/10 hover:border-warm/20 hover:bg-warm/[0.04]'
                }`}
              >
                <motion.div
                  animate={{
                    scale: item.completed ? 1 : 0.95,
                    backgroundColor: item.completed ? 'rgba(207, 255, 0, 0.15)' : 'transparent',
                  }}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    item.completed ? 'border-neon' : 'border-warm/20'
                  }`}
                >
                  {item.completed && <Check className="w-4 h-4 text-neon" />}
                </motion.div>
                
                <span className={`flex-1 text-left text-sm sm:text-base transition-all duration-300 ${
                  item.completed ? 'text-warm/50 line-through' : 'text-warm/90'
                }`}>
                  {item.text}
                </span>
                
                {!item.completed && index === items.findIndex(i => !i.completed) && (
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ArrowRight className="w-5 h-5 text-neon" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>

          {progress === 100 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="mt-8 text-center p-6 sm:p-8 bg-neon/10 border border-neon/30 rounded-xl sm:rounded-2xl"
            >
              <Sparkles className="w-10 h-10 text-neon mx-auto mb-3" />
              <p className="text-neon font-display font-bold text-xl mb-2">Ready to automate! 🚀</p>
              <p className="text-warm/70 text-sm sm:text-base">Book your free strategy call to get started</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
