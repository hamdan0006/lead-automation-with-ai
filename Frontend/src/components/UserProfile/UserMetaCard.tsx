import { useState, useEffect } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Badge from "../ui/badge/Badge";
import useAuthStore from "../../stores/useAuthStore";
import toast from "react-hot-toast";

export default function UserMetaCard() {
  const { isOpen, closeModal } = useModal();
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // We are focusing on personal info update here as per api
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '', // Read only
    phone: '', // Not in API
    bio: '',   // Not in API
  });

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: '',
        bio: ''
      });
    }
  }, [isOpen, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          // We can also send username if we added it to this form, but MetaCard form has different fields in template
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.data.user);
        toast.success('Profile updated successfully');
        closeModal();
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email || resendCooldown > 0) return;

    setIsResending(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://192.168.1.56:3000';
      const response = await fetch(`${apiUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });

      if (response.ok) {
        setResendCooldown(30);
        toast.success("Verification email resent!");
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to resend email");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const getInitials = () => {
    const first = user?.firstName?.[0] || user?.username?.[0] || 'U';
    return first.toUpperCase();
  };

  const getFullName = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    return user?.username || 'User';
  };

  const getPlanColor = (plan?: string) => {
    const p = plan?.toLowerCase() || '';
    if (p.includes('trial')) return 'warning';
    if (p.includes('pro')) return 'success';
    if (p.includes('plus')) return 'info';
    return 'light';
  };

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300 text-2xl font-bold">
              {/* Use Initials if no image is available. In a real app we might check for user.avatarUrl */}
              {getInitials()}
            </div>
            <div className="order-3 xl:order-2">
              <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                {getFullName()}
              </h4>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  @{user?.username || 'user'}
                </p>
                <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                <div className="flex items-center gap-2">
                  <Badge variant="light" color={user?.emailVerified ? "success" : "warning"} size="sm">
                    {user?.emailVerified ? "Verified" : "Unverified"}
                  </Badge>
                  {!user?.emailVerified && (
                    <button
                      onClick={handleResendVerification}
                      disabled={isResending || resendCooldown > 0}
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors cursor-pointer`}
                    >
                      {isResending ? "Sending..." : resendCooldown > 0 ? `Wait ${resendCooldown}s` : "Verify Now"}
                    </button>
                  )}
                  <Badge variant="light" color={getPlanColor(user?.plan)} size="sm">
                    {user?.plan || "Free"} Plan
                  </Badge>
                </div>
              </div>
            </div>


          </div>

        </div>
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Personal Information
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update your details to keep your profile up-to-date.
            </p>
          </div>
          <form onSubmit={handleSave} className="flex flex-col">
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">

              <div className="mt-7">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Personal Information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label>First Name</Label>
                    <Input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Last Name</Label>
                    <Input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Email Address</Label>
                    <Input
                      type="text"
                      value={formData.email}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal} type="button">
                Close
              </Button>
              <Button size="sm" type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
