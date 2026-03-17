"use client";

import { useCallback, useState } from "react";
import {
    getMRR,
    getRevenueByPeriod,
    getRevenueByPlan,
    getRevenueTransactions,
    getRevenueTrends,
    getTopPlans,
    type MRRData,
    type RevenueByPeriod,
    type RevenueByPlan,
    type RevenueOverview,
    type RevenueTransaction,
    type RevenueTrendsData,
    type TopPlan
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
    initialOverview?: RevenueOverview | null;
    initialByPeriod?: RevenueByPeriod[] | null;
    initialByPlan?: RevenueByPlan[] | null;
    initialTrends?: RevenueTrendsData | null;
    initialTopPlans?: TopPlan[] | null;
    initialTransactions?: { transactions: RevenueTransaction[]; total: number } | null;
    initialMRR?: MRRData | null;
}

export interface UseRevenueDataReturn {
    // Data
    overview: RevenueOverview | null;
    byPeriod: RevenueByPeriod[] | null;
    byPlan: RevenueByPlan[] | null;
    trends: RevenueTrendsData | null;
    topPlans: TopPlan[] | null;
    transactions: { transactions: RevenueTransaction[]; total: number } | null;
    mrr: MRRData | null;

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
    fetchTransactions: (params?: { pageNumber?: number; pageSize?: number }) => Promise<void>;
    fetchTrends: () => Promise<void>;
    fetchTopPlans: (params?: { limit?: number }) => Promise<void>;
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
    const [overview, _setOverview] = useState<RevenueOverview | null>(options.initialOverview ?? null);
    const [byPeriod, setByPeriod] = useState<RevenueByPeriod[] | null>(options.initialByPeriod ?? null);
    const [byPlan, setByPlan] = useState<RevenueByPlan[] | null>(options.initialByPlan ?? null);
    const [trends, setTrends] = useState<RevenueTrendsData | null>(options.initialTrends ?? null);
    const [topPlans, setTopPlans] = useState<TopPlan[] | null>(options.initialTopPlans ?? null);
    const [transactions, setTransactions] = useState<{ transactions: RevenueTransaction[]; total: number } | null>(
        options.initialTransactions ?? null
    );
    const [mrr, setMrr] = useState<MRRData | null>(options.initialMRR ?? null);

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
            const response = await getRevenueByPeriod(
                filters.period as "day" | "week" | "month" | "year",
                filters.startDate,
                filters.endDate
            );
            if (response.data) {
                setByPeriod(response.data);
            }
        } catch (error) {
            console.error("Error fetching revenue by period:", error);
        } finally {
            setLoading((prev) => ({ ...prev, byPeriod: false }));
        }
    }, [filters.startDate, filters.endDate, filters.period]);

    const fetchByPlan = useCallback(async () => {
        setLoading((prev) => ({ ...prev, byPlan: true }));
        try {
            const response = await getRevenueByPlan(filters.startDate, filters.endDate);
            if (response.data) {
                setByPlan(response.data);
            }
        } catch (error) {
            console.error("Error fetching revenue by plan:", error);
        } finally {
            setLoading((prev) => ({ ...prev, byPlan: false }));
        }
    }, [filters.startDate, filters.endDate]);

    const fetchTransactions = useCallback(async (params: { pageNumber?: number; pageSize?: number } = {}) => {
        setLoading((prev) => ({ ...prev, transactions: true }));
        try {
            const response = await getRevenueTransactions(params.pageNumber || 1, params.pageSize || 10);
            if (response.data) {
                setTransactions(response.data);
            }
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading((prev) => ({ ...prev, transactions: false }));
        }
    }, []);

    const fetchTrends = useCallback(async () => {
        setLoading((prev) => ({ ...prev, trends: true }));
        try {
            const response = await getRevenueTrends("month");
            if (response.data) {
                setTrends(response.data);
            }
        } catch (error) {
            console.error("Error fetching trends:", error);
        } finally {
            setLoading((prev) => ({ ...prev, trends: false }));
        }
    }, []);

    const fetchTopPlans = useCallback(
        async (params: { limit?: number } = {}) => {
            setLoading((prev) => ({ ...prev, topPlans: true }));
            try {
                const response = await getTopPlans(params.limit || 5, filters.startDate, filters.endDate);
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

    const fetchMRR = useCallback(async (_year?: number) => {
        setLoading((prev) => ({ ...prev, mrr: true }));
        try {
            const response = await getMRR();
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
                    getRevenueByPeriod(
                        updatedFilters.period as "day" | "week" | "month" | "year",
                        updatedFilters.startDate,
                        updatedFilters.endDate
                    ),
                    getRevenueByPlan(updatedFilters.startDate, updatedFilters.endDate),
                    getRevenueTransactions(1, 10),
                    getRevenueTrends("month"),
                    getTopPlans(5, updatedFilters.startDate, updatedFilters.endDate),
                    getMRR()
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
