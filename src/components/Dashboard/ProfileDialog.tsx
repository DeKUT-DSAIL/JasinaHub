import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Check, X } from "lucide-react";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileDialog = ({ open, onOpenChange }: ProfileDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [updatingPhone, setUpdatingPhone] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    phoneNumberUpdated: false,
  });
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadProfile();
      setIsEditingPhone(false);
    }
  }, [open]);

  const loadProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone_number, phone_number_updated')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile({
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          phoneNumber: data.phone_number,
          phoneNumberUpdated: data.phone_number_updated ?? false,
        });
        setNewPhoneNumber(data.phone_number);
      }
    }
    setLoading(false);
  };

  const handleUpdatePhoneNumber = async () => {
    if (!newPhoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Phone number cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (newPhoneNumber === profile.phoneNumber) {
      setIsEditingPhone(false);
      return;
    }

    setUpdatingPhone(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          phone_number: newPhoneNumber.trim(),
          phone_number_updated: true 
        })
        .eq('id', user.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Phone number updated successfully",
        });
        setProfile(prev => ({
          ...prev,
          phoneNumber: newPhoneNumber.trim(),
          phoneNumberUpdated: true,
        }));
        setIsEditingPhone(false);
      }
    }
    setUpdatingPhone(false);
  };

  const handleCancelEditPhone = () => {
    setNewPhoneNumber(profile.phoneNumber);
    setIsEditingPhone(false);
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      setNewPassword("");
      setConfirmPassword("");
    }
    setUpdatingPassword(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Profile Details</DialogTitle>
          <DialogDescription>
            View your account information and update your settings
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">First Name</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{profile.firstName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Name</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{profile.lastName}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Email Address</Label>
                <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Phone Number</Label>
                  {!profile.phoneNumberUpdated && !isEditingPhone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingPhone(true)}
                      className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </Button>
                  )}
                  {profile.phoneNumberUpdated && (
                    <span className="text-xs text-muted-foreground italic">
                      (Cannot be changed)
                    </span>
                  )}
                </div>
                
                {isEditingPhone ? (
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      placeholder="Enter phone number"
                      className="flex-1"
                      disabled={updatingPhone}
                    />
                    <Button
                      size="sm"
                      onClick={handleUpdatePhoneNumber}
                      disabled={updatingPhone}
                      className="h-9 px-3"
                    >
                      {updatingPhone ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEditPhone}
                      disabled={updatingPhone}
                      className="h-9 px-3"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{profile.phoneNumber}</p>
                )}
              </div>
            </div>

            {/* Password Change Section */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-sm font-semibold">Change Password</h3>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <Button
                onClick={handleUpdatePassword}
                disabled={!newPassword || !confirmPassword || updatingPassword}
                className="w-full"
              >
                {updatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};