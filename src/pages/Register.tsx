import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Lock, Eye, EyeClosed, ArrowRight, CreditCard, User, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { cn } from "@/lib/utils";
import { Text } from '@/components/ui/text';
import AvatarSelectionDialog from '@/components/AvatarSelectionDialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword' | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [avatar, setAvatar] = useState('/avatar/avatar1.png');
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);

  // Load form data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('registerForm');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.formData) {
          // Load all form data except passwords
          setFormData(prev => ({
            ...prev,
            firstName: parsed.formData.firstName || '',
            lastName: parsed.formData.lastName || '',
            email: parsed.formData.email || '',
            password: '', // Always reset password
            confirmPassword: '' // Always reset confirm password
          }));
        }
        if (typeof parsed.agreedToTerms === 'boolean') setAgreedToTerms(parsed.agreedToTerms);
        if (parsed.avatar) setAvatar(parsed.avatar);
      } catch {}
    }
  }, []);

  // Save form data to localStorage on change (including password for verification resend)
  useEffect(() => {
    const formDataToSave = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password, // Save password temporarily for verification resend
      confirmPassword: formData.confirmPassword
    };
    localStorage.setItem('registerForm', JSON.stringify({ 
      formData: formDataToSave, 
      agreedToTerms, 
      avatar 
    }));
  }, [formData.firstName, formData.lastName, formData.email, formData.password, formData.confirmPassword, agreedToTerms, avatar]);

  // For 3D card effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-200, 200], [10, -10]);
  const rotateY = useTransform(mouseX, [-200, 200], [-10, 10]);

  const { register, loginWithGoogle } = useAuth();
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
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      toast({ title: 'Error', description: 'First name is required.', variant: 'destructive' });
      return false;
    }
    if (!formData.lastName.trim()) {
      toast({ title: 'Error', description: 'Last name is required.', variant: 'destructive' });
      return false;
    }
    if (!formData.email.trim()) {
      toast({ title: 'Error', description: 'Email is required.', variant: 'destructive' });
      return false;
    }
    if (!formData.password) {
      toast({ title: 'Error', description: 'Password is required.', variant: 'destructive' });
      return false;
    }
    if (formData.password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return false;
    }
    if (!agreedToTerms) {
      toast({ title: 'Error', description: 'Please agree to the terms and conditions.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await register(formData.email, formData.password, `${formData.firstName} ${formData.lastName}`, avatar);
      toast({ 
        title: 'Account Created Successfully!', 
        description: 'Please check your email to verify your account before logging in.', 
        variant: 'default' 
      });
      sessionStorage.setItem('justRegistered', 'true');
      sessionStorage.setItem('registerEmail', formData.email);
      // Keep the form data in localStorage for verification resend, but clear password after a delay
      setTimeout(() => {
        const saved = localStorage.getItem('registerForm');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            // Remove password from saved data for security
            delete parsed.formData.password;
            delete parsed.formData.confirmPassword;
            localStorage.setItem('registerForm', JSON.stringify(parsed));
          } catch {}
        }
      }, 300000); // Clear password after 5 minutes for security
      navigate('/verify-email');
    } catch (error: any) {
      let friendlyMessage = error.message || 'Failed to create account.';
      if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = 'An account with this email already exists. Please log in or use a different email.';
      }
      toast({ title: 'Registration Failed', description: friendlyMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: 'Sign Up Failed', description: error.message || 'Google signup failed.', variant: 'destructive' });
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
          className="w-full max-w-lg relative z-10 px-4 sm:px-4"
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
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 py-8 sm:p-8 sm:py-12 min-h-[520px] sm:min-h-[580px] border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
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
                      Create Account
                    </Text>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Text variant="copy-13" color="gray-1000">
                      Join SpendWiseGo to start managing your finances
                    </Text>
                  </motion.div>
                </div>

                {/* Registration form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Avatar selection */}
                  <div className="flex flex-col items-center mb-4">
                    <Avatar className="h-16 w-16 mb-2 border-2 border-primary">
                      <AvatarImage src={avatar} alt="Selected avatar" />
                      <AvatarFallback>?</AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      className="text-xs text-primary underline hover:text-primary/80 focus:outline-none"
                      onClick={() => setIsAvatarDialogOpen(true)}
                    >
                      Choose Avatar
                    </button>
                  </div>
                  <AvatarSelectionDialog
                    isOpen={isAvatarDialogOpen}
                    onClose={() => setIsAvatarDialogOpen(false)}
                    onSelect={(url) => {
                      setAvatar(url);
                      setIsAvatarDialogOpen(false);
                    }}
                  />

                  <motion.div className="space-y-3">
                    {/* Name inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <motion.div 
                        className={`relative ${focusedInput === "firstName" ? 'z-10' : ''}`}
                        whileFocus={{ scale: 1.02 }}
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <div className="relative flex items-center overflow-hidden rounded-lg">
                          <User className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === "firstName" ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`} />
                          <Input
                            type="text"
                            placeholder="First name"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            onFocus={() => setFocusedInput("firstName")}
                            onBlur={() => setFocusedInput(null)}
                            className="w-full bg-white dark:bg-gray-800 border-transparent focus:border-primary/20 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 h-10 transition-all duration-300 pl-10 pr-3 focus:bg-primary/5 dark:focus:bg-primary/10"
                          />
                          {focusedInput === "firstName" && (
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

                      <motion.div 
                        className={`relative ${focusedInput === "lastName" ? 'z-10' : ''}`}
                        whileFocus={{ scale: 1.02 }}
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <div className="relative flex items-center overflow-hidden rounded-lg">
                          <User className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === "lastName" ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`} />
                          <Input
                            type="text"
                            placeholder="Last name"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            onFocus={() => setFocusedInput("lastName")}
                            onBlur={() => setFocusedInput(null)}
                            className="w-full bg-white dark:bg-gray-800 border-transparent focus:border-primary/20 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 h-10 transition-all duration-300 pl-10 pr-3 focus:bg-primary/5 dark:focus:bg-primary/10"
                          />
                          {focusedInput === "lastName" && (
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
                    </div>

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
                          placeholder="Email address"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
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

                    {/* Password inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <motion.div 
                        className={`relative ${focusedInput === "password" ? 'z-10' : ''}`}
                        whileFocus={{ scale: 1.02 }}
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <div className="relative flex items-center overflow-hidden rounded-lg">
                          <Lock className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === "password" ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`} />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={formData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            onFocus={() => setFocusedInput("password")}
                            onBlur={() => setFocusedInput(null)}
                            className="w-full bg-white dark:bg-gray-800 border-transparent focus:border-primary/20 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 h-10 transition-all duration-300 pl-10 pr-10 focus:bg-primary/5 dark:focus:bg-primary/10"
                          />
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

                      <motion.div 
                        className={`relative ${focusedInput === "confirmPassword" ? 'z-10' : ''}`}
                        whileFocus={{ scale: 1.02 }}
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <div className="relative flex items-center overflow-hidden rounded-lg">
                          <Lock className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === "confirmPassword" ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`} />
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm password"
                            value={formData.confirmPassword}
                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                            onFocus={() => setFocusedInput("confirmPassword")}
                            onBlur={() => setFocusedInput(null)}
                            className="w-full bg-white dark:bg-gray-800 border-transparent focus:border-primary/20 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 h-10 transition-all duration-300 pl-10 pr-10 focus:bg-primary/5 dark:focus:bg-primary/10"
                          />
                          <div 
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                            className="absolute right-3 cursor-pointer"
                          >
                            {showConfirmPassword ? (
                              <Eye className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors duration-300" />
                            ) : (
                              <EyeClosed className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors duration-300" />
                            )}
                          </div>
                          {focusedInput === "confirmPassword" && (
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
                    </div>
                  </motion.div>

                  {/* Terms and conditions */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex items-center">
                      <input
                        id="terms"
                        name="terms"
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={() => setAgreedToTerms(!agreedToTerms)}
                        className="peer appearance-none h-5 w-5 rounded-md border border-primary/30 bg-white dark:bg-gray-900 checked:bg-primary checked:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all duration-200 flex items-center justify-center"
                      />
                      {/* Custom checkmark */}
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        {agreedToTerms && (
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        )}
                      </span>
                    </div>
                    <label htmlFor="terms" className="text-xs text-gray-500 dark:text-gray-400 select-none leading-tight cursor-pointer">
                      I agree to the{' '}
                      <Link to="/terms" className="text-primary hover:text-primary/70 transition-colors duration-200">
                        Terms of Service
                      </Link>
                      {' '}and{' '}
                      <Link to="/privacy" className="text-primary hover:text-primary/70 transition-colors duration-200">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>

                  {/* Sign up button */}
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
                          Create Account
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

                  {/* Google Sign Up */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    className="w-full relative group/google"
                    onClick={handleGoogleSignUp}
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
                        Sign up with Google
                      </span>
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0"
                        initial={{ x: '-100%' }}
                        whileHover={{ x: '100%' }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                      />
                    </div>
                  </motion.button>

                  {/* Sign in link */}
                  <motion.div 
                    className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Text variant="copy-13" color="gray-1000">
                      Already have an account?{' '}
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
                </form>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Register;
