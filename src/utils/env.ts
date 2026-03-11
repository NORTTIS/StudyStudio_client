/**
 * Environment variables utility
 * Ensures proper loading of environment variables
 */

export function getApiBaseUrl(): string {
    // Try multiple ways to get the base URL
    const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    const fallbackUrl = "http://localhost:8080/api";
    
    console.log("Environment check:", {
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
        NODE_ENV: process.env.NODE_ENV,
        allEnvVars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'))
    });
    
    const baseUrl = envUrl || fallbackUrl;
    console.log("Using API base URL:", baseUrl);
    
    return baseUrl;
}

export function getGoogleClientId(): string {
    return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
}