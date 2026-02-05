import { headers } from "next/headers";
import HomePage from "@/components/features/home/Home";
import type { HomeData } from "@/components/features/home/types";

const fallbackHomeData: HomeData = {
  userInitials: "JD",
  statusChips: [
    { label: "To Do", count: 3 },
    { label: "In Progress", count: 2 },
    { label: "Done", count: 2 }
  ],
  boardSections: [
    {
      title: "SWR - Software Requirement",
      columns: [
        {
          name: "To Do",
          count: 3,
          tasks: [
            {
              title: "Review Use Case Diagram",
              priority: "medium",
              stats: { comments: 2, attachments: 1, date: "05-02" }
            },
            {
              title: "Performance Testing",
              priority: "high",
              stats: { comments: 1, attachments: 0, date: "05-02" }
            },
            {
              title: "Security Review",
              priority: "urgent",
              stats: { comments: 4, attachments: 2, date: "05-02" }
            }
          ]
        },
        {
          name: "In Progress",
          count: 1,
          tasks: [
            {
              title: "API Documentation",
              priority: "medium",
              stats: { comments: 3, attachments: 0, date: "05-02" }
            }
          ]
        },
        {
          name: "Review",
          count: 0,
          tasks: []
        },
        {
          name: "Done",
          count: 1,
          tasks: [
            {
              title: "Project Setup",
              priority: "low",
              stats: { comments: 0, attachments: 1, date: "05-02" }
            }
          ]
        }
      ]
    },
    {
      title: "SWT - Software Testing",
      columns: [
        {
          name: "Backlog",
          count: 1,
          tasks: [
            {
              title: "Test Plan Documentation",
              priority: "high",
              stats: { comments: 1, attachments: 1, date: "05-02" }
            }
          ]
        },
        {
          name: "In Progress",
          count: 1,
          tasks: [
            {
              title: "Viết Test Cases cho Login",
              priority: "medium",
              stats: { comments: 2, attachments: 0, date: "05-02" }
            }
          ]
        },
        {
          name: "Testing",
          count: 1,
          tasks: [
            {
              title: "Viết SRS Document",
              priority: "high",
              stats: { comments: 1, attachments: 0, date: "05-02" }
            }
          ]
        },
        {
          name: "Done",
          count: 0,
          tasks: []
        }
      ]
    }
  ]
};

async function getHomeData(): Promise<HomeData> {
  try {
    const requestHeaders = headers();
    const host = requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

    if (!host) {
      return fallbackHomeData;
    }

    const response = await fetch(`${protocol}://${host}/api/home`, { cache: "no-store" });
    if (response.ok) {
      return (await response.json()) as HomeData;
    }
  } catch {
    return fallbackHomeData;
  }

  return fallbackHomeData;
}

export default async function Home() {
  const data = await getHomeData();

  return <HomePage data={data} />;
}
