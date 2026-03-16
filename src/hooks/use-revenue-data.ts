"use client";

import { useState, useCallback } from "react";
import {
    getRevenueByPeriod,
    getRevenueByPlan,
    getRevenueTransactions,
    getRevenueTrends,
    getTopPlans,
    getMRRBreakdown,
    type RevenueByPeriodData,
    type RevenueByPlanData,
    type RevenueTransactionsData,
    type RevenueTrendsData,
    type TopPlansData,
    type MRRBreakdownData,
    type RevenueOverviewData
} from "@/api/admin-revenue";

export interface RevenueFilters {
    startDate: string;
    endDate: string;
    period: "daily" | "weekly" | "monthly" | "yearly";
    planId?: string;
    paymentStatus?: "PENDING" | "SUCCESS" | "CANCELLED" | "FAILED";
    searchTerm?: string;
}

export interface UseRevenueDataOptions {
    initialOverview?: RevenueOverviewData | null;
    initialByPeriod?: RevenueByPeriodData | null;
    initialByPlan?: RevenueByPlanData | null;
    initialTrends?: RevenueTrendsData | null;
    initialTopPlans?: TopPlansData | null;
    initialTransactions?: RevenueTransactionsData | null;
    initialMRR?: MRRBreakdownData | null;
}

export interface UseRevenueDataReturn {
    // Data
    overview: RevenueOverviewData | null;
    byPeriod: RevenueByPeriodData | null;
    byPlan: RevenueByPlanData | null;
    trends: RevenueTrendsData | null;
    topPlans: TopPlansData | null;
    transactions: RevenueTransactionsData | null;
    mrr: MRRBreakdownData | null;

    // Filter state
    filters: RevenueFilters;

    // Loading state
    loading: {
        byPeriod: boolean;
        byPlan: boolean;
        transactions: boolean;
        trends: boolean;
        topPlans: boolean;
        mrr: boolean;
    };

    // Actions
    setFilters: React.Dispatch<React.SetStateAction<RevenueFilters>>;
    applyFilters: (newFilters: Partial<RevenueFilters>) => Promise<void>;
    fetchByPeriod: () => Promise<void>;
    fetchByPlan: () => Promise<void>;
    fetchTransactions: (pageNumber?: number) => Promise<void>;
    fetchTrends: () => Promise<void>;
    fetchTopPlans: () => Promise<void>;
    fetchMRR: (year?: number) => Promise<void>;
}

export function useRevenueData(options: UseRevenueDataOptions = {}): UseRevenueDataReturn {
    // Initial filters - default to last 30 days
    const getDefaultFilters = (): RevenueFilters => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        return {
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            period: "daily"
        };
    };

    const [filters, setFilters] = useState<RevenueFilters>(getDefaultFilters);

    // Data state
    const [overview, setOverview] = useState<RevenueOverviewData | null>(options.initialOverview ?? null);
    const [byPeriod, setByPeriod] = useState<RevenueByPeriodData | null>(options.initialByPeriod ?? null);
    const [byPlan, setByPlan] = useState<RevenueByPlanData | null>(options.initialByPlan ?? null);
    const [trends, setTrends] = useState<RevenueTrendsData | null>(options.initialTrends ?? null);
    const [topPlans, setTopPlans] = useState<TopPlansData | null>(options.initialTopPlans ?? null);
    const [transactions, setTransactions] = useState<RevenueTransactionsData | null>(
        options.initialTransactions ?? null
    );
    const [mrr, setMrr] = useState<MRRBreakdownData | null>(options.initialMRR ?? null);

    // Loading state
    const [loading, setLoading] = useState({
        byPeriod: false,
        byPlan: false,
        transactions: false,
        trends: false,
        topPlans: false,
        mrr: false
    });

    // Fetch functions
    const fetchByPeriod = useCallback(async () => {
        setLoading((prev) => ({ ...prev, byPeriod: true }));
        try {
            const response = await getRevenueByPeriod({
                startDate: filters.startDate,
                endDate: filters.endDate,
                period: filters.period,
                planId: filters.planId
            });
            if (response.data) {
                setByPeriod(response.data);
            }
        } catch (error) {
            console.error("Error fetching revenue by period:", error);
        } finally {
            setLoading((prev) => ({ ...prev, byPeriod: false }));
        }
    }, [filters.startDate, filters.endDate, filters.period, filters.planId]);

    const fetchByPlan = useCallback(async () => {
        setLoading((prev) => ({ ...prev, byPlan: true }));
        try {
            const response = await getRevenueByPlan({
                startDate: filters.startDate,
                endDate: filters.endDate
            });
            if (response.data) {
                setByPlan(response.data);
            }
        } catch (error) {
            console.error("Error fetching revenue by plan:", error);
        } finally {
            setLoading((prev) => ({ ...prev, byPlan: false }));
        }
    }, [filters.startDate, filters.endDate]);

    const fetchTransactions = useCallback(
        async (pageNumber: number = 1) => {
            setLoading((prev) => ({ ...prev, transactions: true }));
            try {
                const response = await getRevenueTransactions({
                    pageNumber,
                    pageSize: 10,
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    planId: filters.planId,
                    paymentStatus: filters.paymentStatus,
                    searchTerm: filters.searchTerm
                });
                if (response.data) {
                    setTransactions(response.data);
                }
            } catch (error) {
                console.error("Error fetching transactions:", error);
            } finally {
                setLoading((prev) => ({ ...prev, transactions: false }));
            }
        },
        [filters.startDate, filters.endDate, filters.planId, filters.paymentStatus, filters.searchTerm]
    );

    const fetchTrends = useCallback(async () => {
        setLoading((prev) => ({ ...prev, trends: true }));
        try {
            const response = await getRevenueTrends({
                period: "last30days",
                startDate: filters.startDate,
                endDate: filters.endDate,
                comparison: true
            });
            if (response.data) {
                setTrends(response.data);
            }
        } catch (error) {
            console.error("Error fetching trends:", error);
        } finally {
            setLoading((prev) => ({ ...prev, trends: false }));
        }
    }, [filters.startDate, filters.endDate]);

    const fetchTopPlans = useCallback(
        async (limit: number = 5) => {
            setLoading((prev) => ({ ...prev, topPlans: true }));
            try {
                const response = await getTopPlans({
                    limit,
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    sortBy: "revenue"
                });
                if (response.data) {
                    setTopPlans(response.data);
                }
            } catch (error) {
                console.error("Error fetching top plans:", error);
            } finally {
                setLoading((prev) => ({ ...prev, topPlans: false }));
            }
        },
        [filters.startDate, filters.endDate]
    );

    const fetchMRR = useCallback(async (year?: number) => {
        setLoading((prev) => ({ ...prev, mrr: true }));
        try {
            const response = await getMRRBreakdown(year);
            if (response.data) {
                setMrr(response.data);
            }
        } catch (error) {
            console.error("Error fetching MRR:", error);
        } finally {
            setLoading((prev) => ({ ...prev, mrr: false }));
        }
    }, []);

    // Apply filters - updates filters and fetches all data
    const applyFilters = useCallback(
        async (newFilters: Partial<RevenueFilters>) => {
            const updatedFilters = { ...filters, ...newFilters };
            setFilters(updatedFilters);

            // Fetch all data in parallel
            setLoading({
                byPeriod: true,
                byPlan: true,
                transactions: true,
                trends: true,
                topPlans: true,
                mrr: true
            });

            try {
                const [periodRes, planRes, txnRes, trendsRes, topPlansRes, mrrRes] = await Promise.all([
                    getRevenueByPeriod({
                        startDate: updatedFilters.startDate,
                        endDate: updatedFilters.endDate,
                        period: updatedFilters.period,
                        planId: updatedFilters.planId
                    }),
                    getRevenueByPlan({
                        startDate: updatedFilters.startDate,
                        endDate: updatedFilters.endDate
                    }),
                    getRevenueTransactions({
                        pageNumber: 1,
                        pageSize: 10,
                        startDate: updatedFilters.startDate,
                        endDate: updatedFilters.endDate,
                        planId: updatedFilters.planId,
                        paymentStatus: updatedFilters.paymentStatus
                    }),
                    getRevenueTrends({
                        period: "last30days",
                        startDate: updatedFilters.startDate,
                        endDate: updatedFilters.endDate,
                        comparison: true
                    }),
                    getTopPlans({
                        limit: 5,
                        startDate: updatedFilters.startDate,
                        endDate: updatedFilters.endDate,
                        sortBy: "revenue"
                    }),
                    getMRRBreakdown()
                ]);

                if (periodRes.data) setByPeriod(periodRes.data);
                if (planRes.data) setByPlan(planRes.data);
                if (txnRes.data) setTransactions(txnRes.data);
                if (trendsRes.data) setTrends(trendsRes.data);
                if (topPlansRes.data) setTopPlans(topPlansRes.data);
                if (mrrRes.data) setMrr(mrrRes.data);
            } catch (error) {
                console.error("Error applying filters:", error);
            } finally {
                setLoading({
                    byPeriod: false,
                    byPlan: false,
                    transactions: false,
                    trends: false,
                    topPlans: false,
                    mrr: false
                });
            }
        },
        [filters]
    );

    return {
        overview,
        byPeriod,
        byPlan,
        trends,
        topPlans,
        transactions,
        mrr,
        filters,
        loading,
        setFilters,
        applyFilters,
        fetchByPeriod,
        fetchByPlan,
        fetchTransactions,
        fetchTrends,
        fetchTopPlans,
        fetchMRR
    };
}
