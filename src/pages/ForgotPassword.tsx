import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, ArrowRight, CreditCard, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { cn } from "@/lib/utils";
import { Text } from '@/components/ui/text';

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  );
}

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'email' | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // For 3D card effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [15, -15]);
  const rotateY = useTransform(mouseX, [-300, 300], [-15, 15]);

  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseXFromCenter = e.clientX - centerX;
    const mouseYFromCenter = e.clientY - centerY;
    
    mouseX.set(mouseXFromCenter);
    mouseY.set(mouseYFromCenter);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: 'Error', description: 'Please enter your email address.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email);
      setIsSubmitted(true);
      toast({ title: 'Success', description: 'Password reset email sent!', variant: 'default' });
    } catch (error: any) {
      // Firebase error codes for user-not-found and user-not-verified
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || (error.message && error.message.toLowerCase().includes('verify'))) {
        toast({ title: 'Error', description: 'Please register and verify your email first.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message || 'Failed to send reset email.', variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex w-full min-h-screen justify-center items-center bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 -mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md relative z-10 px-4 sm:px-4"
          style={{ perspective: 1500 }}
        >
          <motion.div
            className="relative"
            style={{ rotateX, rotateY }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ z: 10 }}
          >
            <div className="relative group">
              {/* Card glow effect */}
              <motion.div 
                className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-700"
                animate={{
                  boxShadow: [
                    "0 0 10px 2px rgba(255,255,255,0.03)",
                    "0 0 15px 5px rgba(255,255,255,0.05)",
                    "0 0 10px 2px rgba(255,255,255,0.03)"
                  ],
                  opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity, 
                  ease: "easeInOut", 
                  repeatType: "mirror" 
                }}
              />

              {/* Glass card background */}
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 py-8 sm:p-8 sm:py-12 min-h-[420px] sm:min-h-[480px] border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
                {/* Logo and header */}
                <div className="text-center space-y-1 mb-5">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", duration: 0.8 }}
                    className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4 mt-[-16px]"
                  >
                    <CreditCard className="w-6 h-6 text-primary-foreground" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Text variant="heading-20" className="text-primary">
                      Forgot Password?
                    </Text>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Text variant="copy-13" color="gray-1000">
                      Enter your email to receive reset instructions
                    </Text>
                  </motion.div>
                </div>

                <AnimatePresence mode="wait">
                  {!isSubmitted ? (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={handleSubmit}
                      className="space-y-4"
                    >
                      {/* Email input */}
                      <motion.div 
                        className={`relative ${focusedInput === "email" ? 'z-10' : ''}`}
                        whileFocus={{ scale: 1.02 }}
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <div className="relative flex items-center overflow-hidden rounded-lg">
                          <Mail className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === "email" ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`} />
                          <Input
                            type="email"
                            placeholder="Enter your email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onFocus={() => setFocusedInput("email")}
                            onBlur={() => setFocusedInput(null)}
                            className="w-full bg-white dark:bg-gray-800 border-transparent focus:border-primary/20 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 h-10 transition-all duration-300 pl-10 pr-3 focus:bg-primary/5 dark:focus:bg-primary/10"
                          />
                          {focusedInput === "email" && (
                            <motion.div 
                              layoutId="input-highlight"
                              className="absolute inset-0 bg-primary/5 -z-10"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            />
                          )}
                        </div>
                      </motion.div>

                      {/* Submit button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isLoading}
                        className="w-full relative group/button mt-5 focus:outline-none bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-lg font-medium flex items-center justify-center transition-colors disabled:bg-primary/40 disabled:text-primary-foreground/60"
                      >
                        <AnimatePresence mode="wait">
                          {isLoading ? (
                            <motion.div
                              key="loading"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center justify-center"
                            >
                              <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                            </motion.div>
                          ) : (
                            <motion.span
                              key="button-text"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center justify-center gap-1 text-sm font-medium"
                            >
                              Send Reset Link
                              <ArrowRight className="w-3 h-3 group-hover/button:translate-x-1 transition-transform duration-300" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-center space-y-4"
                    >
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center"
                      >
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                      </motion.div>

                      <div className="space-y-2">
                        <Text variant="heading-16" className="text-green-600 dark:text-green-400">
                          Check Your Email
                        </Text>
                        <Text variant="copy-13" color="gray-1000">
                          We've sent password reset instructions to{' '}
                          <span className="font-medium text-gray-900 dark:text-gray-100">{email}</span>
                        </Text>
                      </div>

                      {/* Back to login button (moved here, styled as primary) */}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-2 flex justify-center"
                      >
                        <Link 
                          to="/login" 
                          className="inline-flex items-center justify-center text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200 rounded-lg h-10 px-6 shadow"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back to login
                        </Link>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="pt-4"
                      >
                        <Text variant="copy-13" color="gray-1000">
                          Didn't receive the email?{' '}
                          <button
                            onClick={() => setIsSubmitted(false)}
                            className="text-primary hover:text-primary/70 transition-colors duration-200 font-medium"
                          >
                            Try again
                          </button>
                        </Text>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Additional help */}
                <motion.div 
                  className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Text variant="copy-13" color="gray-1000">
                    Remember your password?{' '}
                    <Link 
                      to="/login" 
                      className="relative inline-block group/signin"
                    >
                      <span className="relative z-10 text-primary group-hover/signin:text-primary/70 transition-colors duration-300 font-medium">
                        Sign in
                      </span>
                      <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-primary group-hover/signin:w-full transition-all duration-300" />
                    </Link>
                  </Text>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default ForgotPassword; 