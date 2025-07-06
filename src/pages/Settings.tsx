import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { exportTransactionsToPDF, exportBudgetsToPDF, exportAllUserData, importAllUserData } from '@/utils/exportUtils';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';
import ChangeEmailDialog from '@/components/ChangeEmailDialog';
import AvatarSelectionDialog from '@/components/AvatarSelectionDialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Lock, 
  Palette, 
  DollarSign, 
  Bell,
  Download,
  Save,
  Camera,
  Shield,
  Globe,
  LogOut,
  Edit
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';

const AVATAR_OPTIONS = [
  { id: 'avatar1', url: '/avatars/avatar1.png' },
  { id: 'avatar2', url: '/avatars/avatar2.png' },
  { id: 'avatar3', url: '/avatars/avatar3.png' },
  { id: 'avatar4', url: '/avatars/avatar4.png' },
  { id: 'avatar5', url: '/avatars/avatar5.png' },
  { id: 'avatar6', url: '/avatars/avatar6.png' },
];

const Settings: React.FC = () => {
  const { currentUser, updateUserProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { currency, setCurrency, currencies } = useCurrency();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState({
    displayName: currentUser?.displayName || '',
    email: currentUser?.email || '',
    avatar: currentUser?.photoURL || '/avatar/avatar1.png',
  });
  const [notifications, setNotifications] = useState(true);
  const [recurringReminders, setRecurringReminders] = useState(true);
  const [notifLoading, setNotifLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [importing, setImporting] = useState(false);

  // Fetch notification settings from Firestore on mount
  useEffect(() => {
    const fetchNotificationSettings = async () => {
      if (!currentUser) return;
      setNotifLoading(true);
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setNotifications(data.notifications !== undefined ? data.notifications : true);
          setRecurringReminders(data.recurringReminders !== undefined ? data.recurringReminders : true);
        } else {
          // If user doc doesn't exist, create it with defaults
          await setDoc(userDocRef, { notifications: true, recurringReminders: true }, { merge: true });
          setNotifications(true);
          setRecurringReminders(true);
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Could not load notification settings. Please try again.', variant: 'destructive' });
      } finally {
        setNotifLoading(false);
      }
    };
    fetchNotificationSettings();
  }, [currentUser]);

  const handleNotificationsChange = async (val: boolean) => {
    setNotifications(val);
    if (!currentUser) return;
    setNotifLoading(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, { notifications: val }, { merge: true });
    } catch (error) {
      toast({ title: 'Error', description: 'Could not update notification settings. Please try again.', variant: 'destructive' });
    } finally {
      setNotifLoading(false);
    }
  };

  const handleRecurringRemindersChange = async (val: boolean) => {
    setRecurringReminders(val);
    if (!currentUser) return;
    setNotifLoading(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, { recurringReminders: val }, { merge: true });
    } catch (error) {
      toast({ title: 'Error', description: 'Could not update recurring reminders. Please try again.', variant: 'destructive' });
    } finally {
      setNotifLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await updateUserProfile(profile.displayName, profile.avatar);
      toast({ title: "Success", description: "Settings updated!" });
    } catch (error) {
      toast({ title: "Error", description: "Could not update settings. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = async (avatarUrl: string) => {
    try {
      setLoading(true);
      await updateUserProfile(profile.displayName, avatarUrl);
      setProfile(prev => ({ ...prev, avatar: avatarUrl }));
      setIsAvatarDialogOpen(false);
      toast({ title: "Success", description: "Avatar updated successfully!" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update avatar",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = (currencyValue: string) => {
    const selectedCurrency = currencies.find(c => c.value === currencyValue);
    if (selectedCurrency) {
      setCurrency(selectedCurrency);
      toast({
        title: "Success",
        description: `Currency updated to ${selectedCurrency.label}`
      });
    }
  };

  const handleExportTransactions = async () => {
    if (!currentUser) return;
    
    try {
      setExportLoading(true);
      const transactionsRef = collection(db, 'transactions');
      const q = query(transactionsRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (transactions.length === 0) {
        toast({ title: "No Data", description: "No data found to export." });
        return;
      }

      exportTransactionsToPDF(transactions, currentUser.displayName || 'User');
      toast({ title: "Success", description: "Data exported as PDF!" });
    } catch (error) {
      toast({ title: "Error", description: "Could not export data. Please try again.", variant: "destructive" });
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportBudgets = async () => {
    if (!currentUser) return;
    try {
      setExportLoading(true);
      const budgetsRef = collection(db, 'budgets');
      const q = query(budgetsRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const budgets = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(),
          endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(),
        };
      });
      if (budgets.length === 0) {
        toast({
          title: "No Data",
          description: "No budgets found to export",
          variant: "destructive"
        });
        return;
      }
      exportBudgetsToPDF(budgets, currentUser.displayName || 'User');
      toast({
        title: "Success",
        description: "Budgets exported successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export budgets",
        variant: "destructive"
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportAllData = async () => {
    if (!currentUser) return;
    await exportAllUserData(currentUser.uid);
  };

  const handleImportAllData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importAllUserData(currentUser.uid, file, toast);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="animate-fade-in">
          <Text variant="heading-32">Settings</Text>
          <Text variant="copy-16" color="gray-1000" className="mt-1">
            Manage your account preferences and settings
          </Text>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                <Text variant="heading-20">Profile Information</Text>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="flex items-center space-x-4 mb-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.avatar} alt={profile.displayName} />
                    <AvatarFallback>
                      {profile.displayName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAvatarDialogOpen(true)}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Change Avatar
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={profile.displayName}
                    onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Enter your display name"
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </form>
              {/* Account Security (moved here) */}
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  Account Security
                </h2>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto"
                    onClick={() => setIsEmailDialogOpen(true)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Change Email
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto"
                    onClick={() => setIsPasswordDialogOpen(true)}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="w-5 h-5 mr-2" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="theme-toggle">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes
                  </p>
                </div>
                <Switch
                  id="theme-toggle"
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                />
              </div>
            </CardContent>
          </Card>

          {/* Currency Settings */}
          <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Currency Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select value={currency.value} onValueChange={handleCurrencyChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This will be used for all new transactions. Current: {currency.symbol} {currency.value}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications">Budget Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when approaching budget limits
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={notifications}
                    onCheckedChange={handleNotificationsChange}
                    disabled={notifLoading}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="recurring">Recurring Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Reminders for recurring transactions
                    </p>
                  </div>
                  <Switch
                    id="recurring"
                    checked={recurringReminders}
                    onCheckedChange={handleRecurringRemindersChange}
                    disabled={notifLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Export/Import Card */}
          <Card className="animate-fade-in" style={{ animationDelay: '400ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="w-5 h-5 mr-2" />
                Data Export / Import
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <Button onClick={handleExportAllData} className="w-full sm:w-auto" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export All Data (JSON)
                </Button>
                <label className="w-full sm:w-auto">
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={handleImportAllData}
                    disabled={importing}
                  />
                  <Button asChild className="w-full sm:w-auto ml-0 sm:ml-2" variant="outline" disabled={importing}>
                    <span>
                      <Download className="w-4 h-4 mr-2" />
                      {importing ? 'Importing...' : 'Import All Data (JSON)'}
                    </span>
                  </Button>
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Export or import all your SpendWiseGo data as a single file. Imported data will be added to your account with no overlap.
              </p>
            </CardContent>
          </Card>
        </div>

        <ChangePasswordDialog 
          isOpen={isPasswordDialogOpen} 
          onClose={() => setIsPasswordDialogOpen(false)} 
        />
        
        <ChangeEmailDialog 
          isOpen={isEmailDialogOpen} 
          onClose={() => setIsEmailDialogOpen(false)} 
        />

        <AvatarSelectionDialog
          isOpen={isAvatarDialogOpen}
          onClose={() => setIsAvatarDialogOpen(false)}
          onSelect={handleAvatarSelect}
        />

      </div>
    </Layout>
  );
};

export default Settings;
