import { serverFetchApi } from "@/api/server-client";
import { RevenueDashboardPage } from "@/components/features/admin/monitoring/RevenueDashboardPage";

export const dynamic = "force-dynamic";

interface RevenuePageProps {
    params: Promise<{
        locale: string;
    }>;
}

export default async function AdminRevenuePage({ params: _params }: RevenuePageProps) {
    const { locale } = await _params;

    // Get current date for default range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Format dates for API (ISO 8601)
    const formatDate = (date: Date) => date.toISOString();
    const buildUrl = (endpoint: string, params?: Record<string, string | number | boolean | undefined>) => {
        if (!params) {
            return endpoint;
        }

        const queryParams = new URLSearchParams();

        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined) {
                queryParams.append(key, String(value));
            }
        }

        const queryString = queryParams.toString();
        return queryString ? `${endpoint}?${queryString}` : endpoint;
    };

    // Fetch all revenue data in parallel
    const [overviewResult, byPeriodResult, byPlanResult, trendsResult, topPlansResult, transactionsResult, mrrResult] =
        await Promise.all([
            // Overview - no params needed
            serverFetchApi.GET("/admin/revenue/overview"),
            // By period - last 9 months
            serverFetchApi.GET(
                buildUrl("/admin/revenue/by-period", {
                    StartDate: formatDate(new Date(now.getFullYear(), now.getMonth() - 8, 1)),
                    EndDate: formatDate(now),
                    Period: "monthly"
                })
            ),
            // By plan - current month
            serverFetchApi.GET(
                buildUrl("/admin/revenue/by-plan", {
                    StartDate: formatDate(startOfMonth),
                    EndDate: formatDate(now)
                })
            ),
            // Trends - last 30 days with comparison
            serverFetchApi.GET(
                buildUrl("/admin/revenue/trends", {
                    Period: "last30days",
                    Comparison: true
                })
            ),
            // Top plans - top 5 by revenue
            serverFetchApi.GET(
                buildUrl("/admin/revenue/top-plans", {
                    Limit: 5,
                    SortBy: "revenue"
                })
            ),
            // Transactions - first page
            serverFetchApi.GET(
                buildUrl("/admin/revenue/transactions", {
                    PageNumber: 1,
                    PageSize: 20
                })
            ),
            // MRR - current year
            serverFetchApi.GET(buildUrl("/admin/revenue/mrr", { Year: now.getFullYear() }))
        ]);

    // Transform data for client component
    const revenueData = {
        overview: overviewResult.data || null,
        byPeriod: byPeriodResult.data || null,
        byPlan: byPlanResult.data || null,
        trends: trendsResult.data || null,
        topPlans: (topPlansResult.data as any)?.topPlans || topPlansResult.data || null,
        transactions: transactionsResult.data || null,
        mrr: mrrResult.data || null
    };

    return <RevenueDashboardPage data={revenueData as any} />;
}
