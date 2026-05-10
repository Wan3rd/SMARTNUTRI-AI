import React from 'react';
import { Card, CardContent } from './common/Card';
import { cn } from '../lib/utils';

const SkeletonItem = ({ className }) => (
    <div className={cn("skeleton bg-[var(--color-divider)] opacity-20", className)} />
);

export const DashboardSkeleton = () => (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
        <header className="px-2 space-y-2">
            <SkeletonItem className="h-10 w-64 rounded-xl" />
            <SkeletonItem className="h-4 w-48 rounded-lg" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
                <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] h-64 overflow-hidden">
                    <CardContent className="p-8 space-y-4">
                        <SkeletonItem className="h-6 w-32" />
                        <SkeletonItem className="h-32 w-full rounded-2xl" />
                    </CardContent>
                </Card>
                <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] h-48 overflow-hidden">
                    <CardContent className="p-8 space-y-4">
                        <SkeletonItem className="h-6 w-48" />
                        <div className="space-y-3">
                            <SkeletonItem className="h-4 w-full" />
                            <SkeletonItem className="h-4 w-5/6" />
                            <SkeletonItem className="h-4 w-4/6" />
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-5 space-y-6">
                <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] h-40 overflow-hidden">
                    <CardContent className="p-6 flex items-center gap-4">
                        <SkeletonItem className="h-16 w-16 rounded-2xl" />
                        <div className="flex-1 space-y-2">
                            <SkeletonItem className="h-4 w-24" />
                            <SkeletonItem className="h-6 w-32" />
                        </div>
                    </CardContent>
                </Card>
                <div className="h-16 w-full bg-[var(--color-divider)] opacity-10 rounded-[22px]" />
                <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] h-64" />
            </div>
        </div>
    </div>
);

export const ProfileSkeleton = () => (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
        <div className="relative h-48 sm:h-64 rounded-[2.5rem] bg-[var(--color-divider)] opacity-10 overflow-hidden">
             <div className="absolute bottom-8 left-8 flex items-center gap-6">
                <SkeletonItem className="h-24 w-24 rounded-3xl" />
                <div className="space-y-2">
                    <SkeletonItem className="h-8 w-48" />
                    <SkeletonItem className="h-4 w-32" />
                </div>
             </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] h-96" />
            <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] h-96" />
        </div>
    </div>
);

export const HistorySkeleton = () => (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
            <div className="space-y-2 w-full sm:w-auto">
                <SkeletonItem className="h-10 w-64" />
                <SkeletonItem className="h-4 w-48" />
            </div>
            <SkeletonItem className="h-12 w-full sm:w-48 rounded-2xl" />
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <Card key={i} className="border-2 border-[var(--color-divider)] rounded-[2rem] h-64 overflow-hidden">
                    <SkeletonItem className="h-32 w-full" />
                    <CardContent className="p-4 space-y-2">
                        <SkeletonItem className="h-4 w-24" />
                        <SkeletonItem className="h-6 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
);

export const ClientDetailsSkeleton = () => (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 px-2">
            <div className="flex items-center gap-6">
                <SkeletonItem className="h-20 w-20 rounded-3xl" />
                <div className="space-y-2">
                    <SkeletonItem className="h-10 w-64" />
                    <div className="flex gap-2">
                        <SkeletonItem className="h-4 w-24" />
                        <SkeletonItem className="h-4 w-24" />
                    </div>
                </div>
            </div>
            <div className="flex gap-3">
                <SkeletonItem className="h-12 w-32 rounded-2xl" />
                <SkeletonItem className="h-12 w-32 rounded-2xl" />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar Skeleton */}
            <div className="lg:col-span-3 space-y-6">
                <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] h-[600px]" />
            </div>
            {/* Main Content Skeleton */}
            <div className="lg:col-span-9 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-2 border-[var(--color-divider)] rounded-[2rem] h-32" />
                    <Card className="border-2 border-[var(--color-divider)] rounded-[2rem] h-32" />
                    <Card className="border-2 border-[var(--color-divider)] rounded-[2rem] h-32" />
                </div>
                <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] h-[500px]" />
            </div>
        </div>
    </div>
);
