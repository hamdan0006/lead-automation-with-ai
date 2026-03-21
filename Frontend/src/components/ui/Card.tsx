import React from 'react';
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return (
        <div className={cn("rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]", className)}>
            {children}
        </div>
    );
};

const Header = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("px-6 py-5 border-b border-gray-100 dark:border-gray-800", className)}>
        {children}
    </div>
);

const Title = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={cn("text-base font-medium text-gray-800 dark:text-white/90", className)}>
        {children}
    </h3>
);

const Description = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={cn("mt-1 text-sm text-gray-500 dark:text-gray-400", className)}>
        {children}
    </p>
);

const Content = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("p-6", className)}>
        {children}
    </div>
);

const Footer = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("px-6 py-4 bg-gray-50 border-t border-gray-100 dark:border-gray-800 rounded-b-2xl dark:bg-transparent", className)}>
        <div className="flex items-center">
            {children}
        </div>
    </div>
);

// Assign sub-components
const CardComponent = Object.assign(Card, {
    Header,
    Title,
    Description,
    Content,
    Footer
});

export default CardComponent;
