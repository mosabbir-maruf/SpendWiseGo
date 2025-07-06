import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Lock, Eye, EyeClosed, ArrowRight, CreditCard, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { cn } from "@/lib/utils";
import { Text } from '@/components/ui/text';
import { sendEmailVerification, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

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

// Helper to map Firebase Auth error codes to user-friendly messages
function getFriendlyAuthErrorMessage(error: any) {
  if (!error || !error.code) return 'Something went wrong. Please check your details and try again. If the problem persists, contact support.';
  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later or reset your password.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    default:
      return 'Something went wrong. Please check your details and try again. If the problem persists, contact support.';
  }
}

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // For 3D card effect - increased rotation range for more pronounced 3D effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [15, -15]);
  const rotateY = useTransform(mouseX, [-300, 300], [-15, 15]);

  const { login, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseXFromCenter = e.clientX - centerX;
    const mouseYFromCenter = e.clientY - centerY;
    
    mouseX.set(mouseXFromCenter);
    mouseY.set(mouseYFromCenter);
    setMousePosition({ x: mouseXFromCenter, y: mouseYFromCenter });
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setMousePosition({ x: 0, y: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error: any) {
      if (error.message && error.message.includes('verify your email address')) {
        setShowResend(true);
        toast({
          title: 'Email Not Verified',
          description: 'Your email is not verified. Please check your inbox or resend the verification email.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Login Failed', description: getFriendlyAuthErrorMessage(error), variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: 'Login Failed', description: error.message || 'Google login failed.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      // Log the user in (even if unverified)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      toast({
        title: 'Verification Email Sent',
        description: 'A new verification email has been sent. Please check your inbox.',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend verification email.',
        variant: 'destructive',
      });
    } finally {
      setResendLoading(false);
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
              {/* Card glow effect - reduced intensity */}
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
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 py-16 sm:p-8 sm:py-12 min-h-[420px] sm:min-h-[480px] border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
                {/* Logo and header */}
                <div className="text-center space-y-1 mb-5">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", duration: 0.8 }}
                    className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-1"
                  >
                    <CreditCard className="w-6 h-6 text-primary-foreground" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Text variant="heading-20" className="text-primary">
                      Welcome Back
                    </Text>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Text variant="copy-13" color="gray-1000">
                      Sign in to continue to SpendWiseGo
                    </Text>
                  </motion.div>
                </div>

                {/* Login form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <motion.div className="space-y-3">
                    {/* Email input */}
                    <motion.div 
                      className={`relative ${focusedInput === "email" ? 'z-10' : ''}`}
                      whileFocus={{ scale: 1.02 }}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <div className="absolute -inset-[0.5px] bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
                      <div className="relative flex items-center overflow-hidden rounded-lg">
                        <Mail className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === "email" ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`} />
                        <Input
                          type="email"
                          placeholder="Email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setFocusedInput("email")}
                          onBlur={() => setFocusedInput(null)}
                          className="w-full bg-white dark:bg-gray-800 border-transparent focus:border-primary/20 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 h-10 transition-all duration-300 pl-10 pr-3 focus:bg-primary/5 dark:focus:bg-primary/10"
                        />
                        {/* Input highlight effect */}
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

                    {/* Password input */}
                    <motion.div 
                      className={`relative ${focusedInput === "password" ? 'z-10' : ''}`}
                      whileFocus={{ scale: 1.02 }}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <div className="absolute -inset-[0.5px] bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
                      <div className="relative flex items-center overflow-hidden rounded-lg">
                        <Lock className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === "password" ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`} />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setFocusedInput("password")}
                          onBlur={() => setFocusedInput(null)}
                          className="w-full bg-white dark:bg-gray-800 border-transparent focus:border-primary/20 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 h-10 transition-all duration-300 pl-10 pr-10 focus:bg-primary/5 dark:focus:bg-primary/10"
                        />
                        {/* Toggle password visibility */}
                        <div 
                          onClick={() => setShowPassword(!showPassword)} 
                          className="absolute right-3 cursor-pointer"
                        >
                          {showPassword ? (
                            <Eye className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors duration-300" />
                          ) : (
                            <EyeClosed className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors duration-300" />
                          )}
                        </div>
                        {/* Input highlight effect */}
                        {focusedInput === "password" && (
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
                  </motion.div>

                  {/* Remember me & Forgot password */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center">
                        <input
                          id="remember-me"
                          name="remember-me"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={() => setRememberMe(!rememberMe)}
                          className="peer appearance-none h-5 w-5 rounded-md border border-primary/30 bg-white dark:bg-gray-900 checked:bg-primary checked:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all duration-200 flex items-center justify-center"
                        />
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          {rememberMe && (
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                          )}
                        </span>
                      </div>
                      <label htmlFor="remember-me" className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary transition-colors duration-200 select-none leading-tight cursor-pointer">
                        Remember me
                      </label>
                    </div>
                    <div className="text-xs relative group/link">
                      <Link to="/forgot-password" className="text-gray-500 dark:text-gray-400 hover:text-primary transition-colors duration-200">
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  {/* Sign in button */}
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
                          Sign In
                          <ArrowRight className="w-3 h-3 group-hover/button:translate-x-1 transition-transform duration-300" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  {/* Minimal Divider */}
                  <div className="relative mt-2 mb-5 flex items-center">
                    <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                    <motion.span 
                      className="mx-3 text-xs text-gray-400 dark:text-gray-500"
                      initial={{ opacity: 0.7 }}
                      animate={{ opacity: [0.7, 0.9, 0.7] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    >
                      or
                    </motion.span>
                    <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                  </div>

                  {/* Google Sign In */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    className="w-full relative group/google"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    <div className="absolute inset-0 bg-primary/5 rounded-lg blur opacity-0 group-hover/google:opacity-70 transition-opacity duration-300" />
                    <div className="relative overflow-hidden bg-primary/5 text-primary font-medium h-10 rounded-lg border border-primary/10 hover:border-primary/20 transition-all duration-300 flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clipPath="url(#clip0_17_40)">
                          <path d="M47.5 24.5C47.5 22.6 47.3 20.8 46.9 19H24V29.1H37.4C36.7 32.2 34.7 34.7 31.8 36.3V42.1H39.3C43.7 38.1 47.5 31.9 47.5 24.5Z" fill="#4285F4"/>
                          <path d="M24 48C30.6 48 36.1 45.9 39.3 42.1L31.8 36.3C30.1 37.4 27.9 38.1 24 38.1C17.7 38.1 12.2 34.1 10.3 28.7H2.5V34.7C5.7 41.1 14.1 48 24 48Z" fill="#34A853"/>
                          <path d="M10.3 28.7C9.8 27.6 9.5 26.4 9.5 25.1C9.5 23.8 9.8 22.6 10.3 21.5V15.5H2.5C0.8 18.6 0 21.7 0 25.1C0 28.5 0.8 31.6 2.5 34.7L10.3 28.7Z" fill="#FBBC05"/>
                          <path d="M24 9.9C27.7 9.9 30.3 11.5 31.7 12.8L39.4 5.1C36.1 2.1 30.6 0 24 0C14.1 0 5.7 6.9 2.5 15.5L10.3 21.5C12.2 16.1 17.7 9.9 24 9.9Z" fill="#EA4335"/>
                        </g>
                        <defs>
                          <clipPath id="clip0_17_40">
                            <rect width="48" height="48" fill="white"/>
                          </clipPath>
                        </defs>
                      </svg>
                      <span className="text-primary/80 dark:text-primary/60 group-hover/google:text-primary transition-colors text-xs">
                        Sign in with Google
                      </span>
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0"
                        initial={{ x: '-100%' }}
                        whileHover={{ x: '100%' }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                      />
                    </div>
                  </motion.button>

                  {/* Sign up link */}
                  <motion.div 
                    className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Text variant="copy-13" color="gray-1000">
                      Don't have an account?{' '}
                      <Link 
                        to="/register" 
                        className="relative inline-block group/signup"
                      >
                        <span className="relative z-10 text-primary group-hover/signup:text-primary/70 transition-colors duration-300 font-medium">
                          Sign up
                        </span>
                        <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-primary group-hover/signup:w-full transition-all duration-300" />
                      </Link>
                    </Text>
                  </motion.div>

                  {showResend && (
                    <div className="flex flex-col items-center gap-2 mt-2">
                      <button
                        type="button"
                        className="w-full bg-primary text-primary-foreground rounded-lg h-10 flex items-center justify-center font-medium disabled:bg-primary/40 disabled:text-primary-foreground/60"
                        onClick={handleResendVerification}
                        disabled={resendLoading}
                      >
                        {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Login;
