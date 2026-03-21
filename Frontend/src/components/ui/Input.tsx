import React, { FC, ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import Label from "../form/Label";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: ReactNode;
    helpText?: string;
    error?: boolean;
    success?: boolean;
}

const Input: FC<InputProps> = ({ label, icon, helpText, className, id, error, success, ...props }) => {
    let baseClasses = "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30";

    if (icon) {
        baseClasses += " pl-10";
    }

    let stateClasses = "";
    if (props.disabled) {
        stateClasses = "text-gray-500 border-gray-300 opacity-40 bg-gray-100 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
    } else if (error) {
        stateClasses = "border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:text-error-400 dark:border-error-500 dark:focus:border-error-800";
    } else if (success) {
        stateClasses = "border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:text-success-400 dark:border-success-500 dark:focus:border-success-800";
    } else {
        stateClasses = "bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800";
    }

    return (
        <div className="w-full">
            {label && <Label htmlFor={id} className="mb-1.5">{label}</Label>}
            <div className="relative">
                {icon && (
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                        {icon}
                    </div>
                )}
                <input
                    id={id}
                    className={twMerge(clsx(baseClasses, stateClasses, className))}
                    {...props}
                />
            </div>
            {helpText && <p className="mt-1.5 text-xs text-gray-500">{helpText}</p>}
        </div>
    );
};

export default Input;
