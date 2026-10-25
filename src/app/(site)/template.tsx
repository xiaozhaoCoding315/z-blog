"use client";

import { motion } from "framer-motion";

/**
 * 路由切换过渡：每次导航内容淡入 + 轻微上移。
 * （App Router 中 template.tsx 在每次路由变化时重新挂载，从而触发动画）
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
