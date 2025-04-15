
import { describe, test, expect } from '@jest/globals';
import { extractCourseInfo } from "../course-utils";

describe("Eventor Integration Tests", () => {
  // This test will be skipped by default since it performs an actual network request
  // Run with --testNamePattern="^Eventor Integration" to execute this test specifically
  test.skip("fetches and extracts course data from real Eventor URL", async () => {
    // If running in a Node.js environment, we need to use fetch
    const eventorUrl = "https://eventor.orientering.se/Events/ResultList?eventId=44635&groupBy=EventClass";
    let html: string;
    
    try {
      // Use a CORS proxy for browser environments
      const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(eventorUrl)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      html = await response.text();
    } catch (error) {
      console.error("Failed to fetch Eventor data:", error);
      throw error;
    }

    const courseInfo = extractCourseInfo(html, "Medelsvår 4 Dam");
    
    expect(courseInfo.length).toBe(4160);
    expect(courseInfo.participants).toBe(24);
  });
});
