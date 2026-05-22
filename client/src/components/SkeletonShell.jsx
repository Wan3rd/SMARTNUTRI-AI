import React from 'react';
import { Card, CardContent } from './common/Card';
import { cn } from '../lib/utils';

export const SkeletonLoader = ({ className }) => (
    <div className={cn("skeleton bg-[var(--color-divider)] opacity-20", className)} />
);

export const DashboardSkeleton = () => (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
        <header className="px-2 space-y-2">
            <SkeletonLoader className="h-10 w-64 rounded-xl" />
            <SkeletonLoader className="h-4 w-48 rounded-lg" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
                <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] h-64 overflow-hidden">
                    <CardContent className="p-8 space-y-4">
                        <SkeletonLoader className="h-6 w-32" />
                        <SkeletonLoader className="h-32 w-full rounded-2xl" />
                    </CardContent>
                </Card>
                <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] h-48 overflow-hidden">
                    <CardContent className="p-8 space-y-4">
                        <SkeletonLoader className="h-6 w-48" />
                        <div className="space-y-3">
                            <SkeletonLoader className="h-4 w-full" />
                            <SkeletonLoader className="h-4 w-5/6" />
                            <SkeletonLoader className="h-4 w-4/6" />
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-5 space-y-6">
                <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] h-40 overflow-hidden">
                    <CardContent className="p-6 flex items-center gap-4">
                        <SkeletonLoader className="h-16 w-16 rounded-2xl" />
                        <div className="flex-1 space-y-2">
                            <SkeletonLoader className="h-4 w-24" />
                            <SkeletonLoader className="h-6 w-32" />
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
                <SkeletonLoader className="h-24 w-24 rounded-3xl" />
                <div className="space-y-2">
                    <SkeletonLoader className="h-8 w-48" />
                    <SkeletonLoader className="h-4 w-32" />
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
                <SkeletonLoader className="h-10 w-64" />
                <SkeletonLoader className="h-4 w-48" />
            </div>
            <SkeletonLoader className="h-12 w-full sm:w-48 rounded-2xl" />
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <Card key={i} className="border-2 border-[var(--color-divider)] rounded-[2rem] h-64 overflow-hidden">
                    <SkeletonLoader className="h-32 w-full" />
                    <CardContent className="p-4 space-y-2">
                        <SkeletonLoader className="h-4 w-24" />
                        <SkeletonLoader className="h-6 w-full" />
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
                <SkeletonLoader className="h-20 w-20 rounded-3xl" />
                <div className="space-y-2">
                    <SkeletonLoader className="h-10 w-64" />
                    <div className="flex gap-2">
                        <SkeletonLoader className="h-4 w-24" />
                        <SkeletonLoader className="h-4 w-24" />
                    </div>
                </div>
            </div>
            <div className="flex gap-3">
                <SkeletonLoader className="h-12 w-32 rounded-2xl" />
                <SkeletonLoader className="h-12 w-32 rounded-2xl" />
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

export const DailyPlanSkeleton = () => (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
        {/* Header */}
        <div className="mb-8 space-y-3">
            <SkeletonLoader className="h-9 w-56 rounded-2xl" />
            <SkeletonLoader className="h-4 w-80 rounded-xl" />
        </div>

        {/* Progress Ring Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl p-3 flex flex-col items-center gap-2">
                    <SkeletonLoader className="h-8 w-8 rounded-full" />
                    <SkeletonLoader className="w-full h-1.5 rounded-full" />
                    <SkeletonLoader className="h-2.5 w-12 rounded-lg" />
                </div>
            ))}
        </div>

        {/* Meal Card Skeletons */}
        <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
                <Card key={i} className="border-2 border-[var(--color-divider)] rounded-[2rem] overflow-hidden">
                    <CardContent className="p-4 sm:p-6 flex items-center gap-4">
                        <SkeletonLoader className="h-12 w-12 rounded-2xl shrink-0" />
                        <div className="flex-1 space-y-2">
                            <SkeletonLoader className="h-5 w-32 rounded-xl" />
                            <SkeletonLoader className="h-3 w-20 rounded-lg" />
                        </div>
                        <SkeletonLoader className="h-5 w-5 rounded-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
);

export const CalendarSkeleton = () => (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="space-y-2">
            <SkeletonLoader className="h-9 w-48 rounded-2xl" />
            <SkeletonLoader className="h-4 w-72 rounded-xl" />
        </div>

        {/* Calendar Navigation Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-white/5 p-4 rounded-3xl border-2 border-[var(--color-divider)] shadow-sm">
            <div className="space-y-2">
                <SkeletonLoader className="h-6 w-32 rounded-lg" />
                <SkeletonLoader className="h-3.5 w-20 rounded-md" />
            </div>
            <div className="flex items-center gap-3">
                <SkeletonLoader className="h-8 w-16 rounded-xl" />
                <SkeletonLoader className="h-10 w-24 rounded-xl" />
            </div>
        </div>

        {/* Calendar Grid Skeletons */}
        <div className="space-y-2">
            {/* Days row */}
            <div className="grid grid-cols-7 gap-2 sm:gap-4 px-2 mb-2">
                {[...Array(7)].map((_, i) => (
                    <SkeletonLoader key={i} className="h-4 w-full rounded-md" />
                ))}
            </div>
            {/* 5 rows of cells */}
            <div className="space-y-2 sm:space-y-4">
                {[...Array(5)].map((_, r) => (
                    <div key={r} className="grid grid-cols-7 gap-2 sm:gap-4">
                        {[...Array(7)].map((_, c) => (
                            <div key={c} className="min-h-[60px] sm:min-h-[120px] border-2 border-[var(--color-divider)] p-3 rounded-2xl relative bg-white dark:bg-white/5 flex flex-col justify-between">
                                <SkeletonLoader className="h-4 w-6 rounded-md" />
                                <div className="space-y-1.5 mt-4 hidden sm:block">
                                    <SkeletonLoader className="h-3 w-full rounded-md" />
                                    <SkeletonLoader className="h-3 w-3/4 rounded-md" />
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>

        {/* Selected Day Card Skeleton */}
        <Card className="border-2 border-[var(--color-divider)] rounded-[2rem] overflow-hidden shadow-lg">
            <div className="p-6 sm:p-8 border-b-2 border-[var(--color-divider)] bg-gray-50/50 dark:bg-black/20 flex flex-row items-center justify-between">
                <div className="space-y-2">
                    <SkeletonLoader className="h-6 w-40 rounded-xl" />
                    <SkeletonLoader className="h-3.5 w-24 rounded-md" />
                </div>
                <SkeletonLoader className="h-7 w-20 rounded-full" />
            </div>
            <CardContent className="p-6 sm:p-8 space-y-4">
                <SkeletonLoader className="h-24 w-full rounded-2xl" />
            </CardContent>
        </Card>
    </div>
);

export const RecipeDetailSkeleton = () => (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <SkeletonLoader className="h-10 w-32 rounded-xl" />

        <div className="relative h-64 md:h-80 w-full rounded-3xl overflow-hidden bg-[var(--color-divider)] opacity-10">
            <div className="absolute bottom-6 left-6 md:left-10 space-y-3">
                <SkeletonLoader className="h-8 w-64 rounded-lg" />
                <div className="flex gap-4">
                    <SkeletonLoader className="h-4 w-20 rounded" />
                    <SkeletonLoader className="h-4 w-20 rounded" />
                    <SkeletonLoader className="h-4 w-20 rounded" />
                </div>
            </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-6">
                <Card className="border border-[var(--color-divider)] rounded-[2rem]">
                    <CardContent className="p-6 space-y-4">
                        <SkeletonLoader className="h-6 w-36 rounded-lg" />
                        <div className="grid grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl space-y-2 flex flex-col items-center">
                                    <SkeletonLoader className="h-3 w-10 rounded" />
                                    <SkeletonLoader className="h-4 w-12 rounded" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-[var(--color-divider)] rounded-[2rem]">
                    <CardContent className="p-6 space-y-4">
                        <SkeletonLoader className="h-6 w-36 rounded-lg" />
                        <div className="space-y-3">
                            {[...Array(6)].map((_, i) => (
                                <SkeletonLoader key={i} className="h-4 w-full rounded" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-2">
                <Card className="border border-[var(--color-divider)] rounded-[2rem]">
                    <CardContent className="p-6 space-y-6">
                        <SkeletonLoader className="h-6 w-48 rounded-lg" />
                        <div className="space-y-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex gap-4">
                                    <SkeletonLoader className="h-8 w-8 rounded-full shrink-0" />
                                    <div className="space-y-2 flex-1">
                                        <SkeletonLoader className="h-4 w-full rounded" />
                                        <SkeletonLoader className="h-4 w-5/6 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
);

export const AdminDashboardSkeleton = () => (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
        <div className="relative overflow-hidden rounded-[2.5rem] border-2 border-[var(--color-divider)] bg-[var(--color-bg-card)]">
            <div className="p-6 md:p-10 flex flex-col xl:flex-row items-center justify-between gap-8">
                <div className="text-center xl:text-left space-y-4 flex-1">
                    <div className="flex items-center justify-center xl:justify-start gap-3">
                        <SkeletonLoader className="h-10 w-10 rounded-xl" />
                        <SkeletonLoader className="h-4 w-48 rounded" />
                    </div>
                    <SkeletonLoader className="h-12 w-64 rounded-xl" />
                    <SkeletonLoader className="h-4 w-80 rounded" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-3 md:gap-4 w-full xl:w-auto">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="p-3 md:p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] min-w-[120px] space-y-3">
                            <div className="flex items-center justify-between">
                                <SkeletonLoader className="h-4 w-4 rounded-full" />
                                <SkeletonLoader className="h-3 w-12 rounded" />
                            </div>
                            <SkeletonLoader className="h-6 w-16 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <Card className="border border-[var(--color-divider)] rounded-[2rem]">
            <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <SkeletonLoader className="h-6 w-48 rounded" />
                    <SkeletonLoader className="h-4 w-24 rounded" />
                </div>
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-4 border border-[var(--color-divider)] rounded-xl flex items-center justify-between">
                            <div className="space-y-2">
                                <SkeletonLoader className="h-4 w-32 rounded" />
                                <SkeletonLoader className="h-3 w-48 rounded" />
                            </div>
                            <SkeletonLoader className="h-8 w-24 rounded-lg" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    </div>
);

export const MealsGridSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
        {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden border border-[var(--color-divider)] rounded-[2rem] bg-white dark:bg-white/5 shadow-sm">
                <div className="h-48 relative bg-gray-100 dark:bg-zinc-800">
                    <SkeletonLoader className="w-full h-full" />
                    <SkeletonLoader className="absolute top-2 right-2 h-6 w-16 rounded-full" />
                </div>
                <CardContent className="p-4 space-y-3">
                    <SkeletonLoader className="h-5 w-3/4 rounded-lg" />
                    <div className="flex items-center gap-4">
                        <SkeletonLoader className="h-4 w-12 rounded" />
                        <SkeletonLoader className="h-4 w-16 rounded" />
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
);
