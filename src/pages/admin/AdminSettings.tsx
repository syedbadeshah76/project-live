import { useState } from "react";
import { motion } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Globe,
  Bell,
  Shield,
  Palette,
  Mail,
  CreditCard,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    siteName: "Edvanz",
    siteDescription: "Master the skills that matter in today's digital world",
    contactEmail: "support@Edvanz.com",
    currency: "USD",
    language: "en",
    timezone: "UTC",
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    maintenanceMode: false,
    registrationEnabled: true,
    requireEmailVerification: true,
    twoFactorAuth: false,
  });

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your settings have been updated successfully.",
    });
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
              Platform Settings
            </h1>
            <p className="text-muted-foreground">
              Configure your platform preferences and options.
            </p>
          </div>
          <Button className="gap-2" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-card p-1 shadow-card">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <div className="grid gap-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Site Information</CardTitle>
                  <CardDescription>
                    Basic information about your platform.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={settings.siteName}
                      onChange={(e) =>
                        setSettings({ ...settings, siteName: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="siteDescription">Site Description</Label>
                    <Textarea
                      id="siteDescription"
                      value={settings.siteDescription}
                      onChange={(e) =>
                        setSettings({ ...settings, siteDescription: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={settings.contactEmail}
                      onChange={(e) =>
                        setSettings({ ...settings, contactEmail: e.target.value })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Localization</CardTitle>
                  <CardDescription>
                    Regional settings for your platform.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Currency</Label>
                      <Select
                        value={settings.currency}
                        onValueChange={(value) =>
                          setSettings({ ...settings, currency: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Language</Label>
                      <Select
                        value={settings.language}
                        onValueChange={(value) =>
                          setSettings({ ...settings, language: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Timezone</Label>
                      <Select
                        value={settings.timezone}
                        onValueChange={(value) =>
                          setSettings({ ...settings, timezone: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="EST">Eastern Time</SelectItem>
                          <SelectItem value="PST">Pacific Time</SelectItem>
                          <SelectItem value="IST">India Standard Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Maintenance</CardTitle>
                  <CardDescription>
                    Control platform availability.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Maintenance Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Temporarily disable the platform for maintenance.
                      </p>
                    </div>
                    <Switch
                      checked={settings.maintenanceMode}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, maintenanceMode: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Manage how you receive notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email.
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, emailNotifications: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications in browser.
                    </p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, pushNotifications: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Marketing Emails</p>
                    <p className="text-sm text-muted-foreground">
                      Receive promotional emails and updates.
                    </p>
                  </div>
                  <Switch
                    checked={settings.marketingEmails}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, marketingEmails: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <div className="grid gap-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Authentication</CardTitle>
                  <CardDescription>
                    Configure user authentication settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">User Registration</p>
                      <p className="text-sm text-muted-foreground">
                        Allow new users to register on the platform.
                      </p>
                    </div>
                    <Switch
                      checked={settings.registrationEnabled}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, registrationEnabled: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Verification</p>
                      <p className="text-sm text-muted-foreground">
                        Require email verification for new accounts.
                      </p>
                    </div>
                    <Switch
                      checked={settings.requireEmailVerification}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, requireEmailVerification: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        Require 2FA for admin accounts.
                      </p>
                    </div>
                    <Switch
                      checked={settings.twoFactorAuth}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, twoFactorAuth: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Session Management</CardTitle>
                  <CardDescription>
                    Configure user session settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Session Timeout (minutes)</Label>
                    <Input type="number" defaultValue="60" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Max Login Attempts</Label>
                    <Input type="number" defaultValue="5" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Theme Settings</CardTitle>
                <CardDescription>
                  Customize the look and feel of your platform.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-3">
                    {["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"].map(
                      (color) => (
                        <button
                          key={color}
                          className="w-10 h-10 rounded-full border-2 border-transparent hover:border-foreground transition-colors"
                          style={{ backgroundColor: color }}
                        />
                      )
                    )}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                      <Globe className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <Button variant="outline">Upload Logo</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>
                  Configure email server settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>SMTP Host</Label>
                    <Input placeholder="smtp.example.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label>SMTP Port</Label>
                    <Input placeholder="587" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>SMTP Username</Label>
                    <Input placeholder="username" />
                  </div>
                  <div className="grid gap-2">
                    <Label>SMTP Password</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>From Email</Label>
                  <Input placeholder="noreply@Edvanz.com" />
                </div>
                <Button variant="outline">Test Email Configuration</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Settings */}
          <TabsContent value="payments">
            <div className="grid gap-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Payment Gateway</CardTitle>
                  <CardDescription>
                    Configure your payment processing settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Payment Provider</Label>
                    <Select defaultValue="stripe">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="razorpay">Razorpay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>API Key</Label>
                    <Input type="password" placeholder="sk_live_••••••••" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Webhook Secret</Label>
                    <Input type="password" placeholder="whsec_••••••••" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Tax Settings</CardTitle>
                  <CardDescription>
                    Configure tax calculation settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Tax Calculation</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically calculate taxes on purchases.
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="grid gap-2">
                    <Label>Default Tax Rate (%)</Label>
                    <Input type="number" placeholder="0" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </AdminLayout>
  );
};

export default AdminSettings;
