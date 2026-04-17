"use client";

import * as React from "react";

type GroupBannerBackgroundProps = {
    bannerUrl: string | null;
    colorHex: string | null;
};

export function GroupBannerBackground({ bannerUrl, colorHex }: GroupBannerBackgroundProps) {
    if (bannerUrl) {
        return (
            <>
                <div
                    className="pointer-events-none absolute inset-0 z-0"
                    style={{
                        backgroundImage: `url(${bannerUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat"
                    }}
                />
                <div className="pointer-events-none absolute inset-0 z-0 bg-black/10" />
            </>
        );
    }

    const accentColor = typeof colorHex === "string" && colorHex.trim() ? colorHex.trim() : "#F97316";

    return (
        <>
            <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{ background: "#FCFAF7" }}
            />
            <div
                className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[220px] opacity-[0.06]"
                style={{
                    background: `radial-gradient(circle at 50% 0%, ${accentColor}22 0%, ${accentColor}10 24%, transparent 68%)`
                }}
            />
            <div
                className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[180px] opacity-[0.32]"
                style={{
                    background:
                        "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.16) 48%, rgba(255,255,255,0) 100%)"
                }}
            />
            <div
                className="pointer-events-none absolute inset-0 z-0 opacity-[0.06]"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                    backgroundSize: "36px 36px"
                }}
            />
        </>
    );
}
