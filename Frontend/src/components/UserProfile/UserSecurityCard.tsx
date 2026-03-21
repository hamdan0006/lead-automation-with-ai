import { useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import useAuthStore from "../../stores/useAuthStore";
import toast from "react-hot-toast";

export default function UserSecurityCard() {
    const { isOpen: isPasswordOpen, openModal: openPasswordModal, closeModal: closePasswordModal } = useModal();
    const { isOpen: isDeleteOpen, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();

    const [isLoading, setIsLoading] = useState(false);

    // Password state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Delete state
    const [deleteStep, setDeleteStep] = useState<"confirm" | "password">("confirm");
    const [deletePassword, setDeletePassword] = useState("");
    const { setUser } = useAuthStore();

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters long');
            return;
        }

        setIsLoading(true);

        const promise = (async () => {
            const token = localStorage.getItem('accessToken');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://192.168.1.56:3000';
            const response = await fetch(`${apiUrl}/api/users/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to change password');
            }
            return data;
        })();

        toast.promise(promise, {
            loading: 'Updating password...',
            success: () => {
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                });
                closePasswordModal();
                return 'Password changed successfully';
            },
            error: (err) => err.message || 'Failed to change password',
        });

        try {
            await promise;
        } catch (error) {
            // Error handled by toast
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccountFinal = async () => {
        if (!deletePassword) {
            toast.error("Password is required");
            return;
        }

        setIsLoading(true);

        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://192.168.1.56:3000';

            const response = await fetch(`${apiUrl}/api/users/account`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ password: deletePassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.message || "Failed to delete account");
                setIsLoading(false);
                return;
            }

            toast.success("Account deleted successfully");
            localStorage.removeItem("accessToken");
            setUser(null);
            window.location.href = "/login";

        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <>
            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                            Security Settings
                        </h4>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                            <div>
                                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                                    Password
                                </p>
                                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                    ****************
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={openPasswordModal}
                            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
                        >
                            Change Password
                        </button>
                        <button
                            onClick={() => { setDeleteStep("confirm"); openDeleteModal(); }}
                            className="flex w-full items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 shadow-theme-xs hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-500 lg:inline-flex lg:w-auto"
                        >
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>

            {/* Password Modal */}
            <Modal isOpen={isPasswordOpen} onClose={closePasswordModal} className="max-w-[700px] m-4">
                <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                            Change Password
                        </h4>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                            Update your password to keep your account secure.
                        </p>
                    </div>
                    <form onSubmit={handlePasswordChange} className="flex flex-col">
                        <div className="custom-scrollbar overflow-y-auto px-2 pb-3">
                            <div className="grid grid-cols-1 gap-x-6 gap-y-5">
                                <div>
                                    <Label>Current Password</Label>
                                    <Input
                                        type="password"
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>New Password</Label>
                                    <Input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Confirm Password</Label>
                                    <Input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                            <Button size="sm" variant="outline" onClick={closePasswordModal} type="button">
                                Cancel
                            </Button>
                            <Button size="sm" type="submit" disabled={isLoading}>
                                {isLoading ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Delete Account Modal */}
            <Modal isOpen={isDeleteOpen} onClose={closeDeleteModal} className="max-w-[500px] m-4">
                <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8">
                    {deleteStep === "confirm" && (
                        <>
                            <h4 className="mb-2 text-xl font-semibold text-red-600 dark:text-red-500">Delete Account</h4>
                            <p className="mb-6 text-gray-600 dark:text-gray-400">
                                Are you sure you want to delete your account? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={closeDeleteModal}>Cancel</Button>
                                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setDeleteStep("password")}>Yes, Continue</Button>
                            </div>
                        </>
                    )}

                    {deleteStep === "password" && (
                        <>
                            <h4 className="mb-2 text-xl font-semibold text-red-600 dark:text-red-500">Confirm Deletion</h4>
                            <p className="mb-4 text-gray-600 dark:text-gray-400">
                                Please enter your password to confirm.
                            </p>
                            <div className="mb-6">
                                <Label>Password</Label>
                                <Input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={closeDeleteModal}>Cancel</Button>
                                <Button
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={handleDeleteAccountFinal}
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Deleting..." : "Delete Permanently"}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </>
    );
}
