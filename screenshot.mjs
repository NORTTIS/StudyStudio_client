import "dotenv/config";
import * as fs from "node:fs";
import puppeteer from "puppeteer";

// -----------------------------
// Resolve path argument
// -----------------------------
let pathArg = process.argv[2] || "/";

// Fix Windows/Git Bash path issues
if (
    pathArg.includes("/master/") ||
    pathArg.includes("/group/") ||
    pathArg.includes("/vi/") ||
    pathArg.includes("/en/")
) {
    const match = pathArg.match(/\/(vi|en)\/(master|group)\/.+/);
    if (match) {
        pathArg = match[0];
    }
}

// Ensure leading slash
if (!pathArg.startsWith("/")) {
    pathArg = "/" + pathArg;
}

const baseUrl = "http://localhost:3000";
const url = `${baseUrl}${pathArg}`;

console.log("Attempting to navigate to:", url);

// Screenshot folder
const dir = "temporary_screenshots";

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

const safePath =
    pathArg === "/"
        ? "home"
        : pathArg
              .replace(/^\/+/, "")
              .replace(/[/?#]/g, "-")
              .replace(/[^a-zA-Z0-9-_]/g, "-");

// find next screenshot index
const files = fs.readdirSync(dir);

const numbers = files
    .map((f) => {
        const match = f.match(/^screenshot_(\d+)/);
        return match ? Number(match[1]) : 0;
    })
    .filter(Boolean);

const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;

const file = `${dir}/screenshot_${nextNumber}_${safePath}.png`;

// -----------------------------
// Launch browser
// -----------------------------
const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

const page = await browser.newPage();

await page.setViewport({
    width: 1440,
    height: 900
});

await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36");

// -----------------------------
// Load auth from ENV
// -----------------------------
const accessToken = process.env.ACCESS_TOKEN;
const refreshToken = process.env.REFRESH_TOKEN;

console.log("ACCESS_TOKEN loaded:", !!accessToken);
console.log("REFRESH_TOKEN loaded:", !!refreshToken);

if (!(accessToken && refreshToken)) {
    console.error("Missing ACCESS_TOKEN or REFRESH_TOKEN env variables");
    process.exit(1);
}

// Inject localStorage BEFORE page scripts run
const locale = pathArg.split("/")[1] || "vi";
await page.evaluateOnNewDocument(
    ({ accessToken, refreshToken, locale }) => {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("preferredLocale", locale);
        localStorage.setItem("tokenExpiry", Date.now() + 1000 * 60 * 60 * 24);
    },
    { accessToken, refreshToken }
);

// -----------------------------
// Navigate
// -----------------------------
try {
    await browser.setCookie(
        {
            name: "accessToken",
            value: accessToken,
            domain: "localhost",
            path: "/"
        },
        {
            name: "refreshToken",
            value: refreshToken,
            domain: "localhost",
            path: "/"
        }
    );

    await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000
    });

    console.log("Page loaded successfully");

    // Wait spinner disappear if exists
    try {
        await page.waitForSelector(".animate-spin", {
            hidden: true,
            timeout: 5000
        });
    } catch {
        // fallback delay if spinner not present
        await page.waitForTimeout(1000);
    }
} catch (error) {
    console.error("Navigation error:", error.message);
    await browser.close();
    process.exit(1);
}

// -----------------------------
// Screenshot
// -----------------------------
await page.screenshot({
    path: file,
    fullPage: true
});

console.log("Screenshot saved:", file);

await browser.close();
