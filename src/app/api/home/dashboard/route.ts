/**
 * Mock API endpoint for home dashboard data
 * GET /api/home/dashboard
 */

import { NextResponse } from "next/server";
import { mockHomeData } from "@/mocks/home-data";

export async function GET() {
    // Simulate API delay (optional, remove if not needed)
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Return mock data in API response format
    return NextResponse.json({
        status: "success",
        code: "HOME_DATA_SUCCESS",
        message: "Home dashboard data retrieved successfully",
        data: mockHomeData
    });
}
